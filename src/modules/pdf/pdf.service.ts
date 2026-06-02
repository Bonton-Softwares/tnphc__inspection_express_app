// src/modules/pdf/pdf.service.ts
import prisma from "../../shared/prisma";
import { generateAdminDashboardPdf } from "./generators/adminDashboardPdf";
import { generateUserDetailPdf }     from "./generators/userDetailPdf";
import { generateSingleProjectPdf }  from "./generators/singleProjectPdf";

// ─── Prisma include — fixed: no isActive on blocks, no standalone floors ─────
const PROJECT_INCLUDE = {
  department:    true,
  createdByUser: {
    select: {
      id: true, username: true, email: true,
      role: { select: { name: true } },
    },
  },
  projectAccessMappings: {
    where:   { isActive: true },
    include: { district: true, specialUnit: true },
  },

  landSiteInspection:         { where: { isActive: true } },
  preConstructionInspections: { where: { isActive: true } },
  foundationProgresses:       { where: { isActive: true } },
  foundationQualityChecks:    { where: { isActive: true } },
  plinthStages:               { where: { isActive: true } },

  // ✅ project_block has NO isActive field — no where clause here
  blocks: {
    include: { floors: true },
  },

  // ✅ SuperStructureProgress is the actual relation name on project model (capital S)
  SuperStructureProgress: {
    where:   { isActive: true },
    include: {
      quality: true,
      block:   true,
      floor:   true,
    },
  },

  interiorsProgress: {
    where:   { isActive: true },
    include: { quality: true, block: true, floor: true },
  },

  exteriorsProgress: {
    where:   { isActive: true },
    include: { quality: true, block: true, floor: true },
  },

  BuildingInspection:         { where: { isActive: true } },
  DevelopmentWork:            { where: { isActive: true } },
  TakeoverBuildingInsepction: { where: { isActive: true } },
  TakeoverDevelopmentWork:    { where: { isActive: true } },

  projectHistories: {
    where:   { isActive: true },
    orderBy: { createdAt: "desc" as const },
    take:    5,
  },
};

// ─── Stage keys ───────────────────────────────────────────────────────────────
const ALL_STAGES = [
  { key: "Land Site Inspection"     },
  { key: "Pre-Construction"         },
  { key: "Foundation Stage"         },
  { key: "Plinth Stage"             },
  { key: "Superstructure Stage"     },
  { key: "Non Superstructure Stage" },
  { key: "Interiors"                },
  { key: "Exteriors"                },
  { key: "Development Work"         },
  { key: "Take Over"                },
] as const;

type StageKey = (typeof ALL_STAGES)[number]["key"];

function normalizeKey(raw: string): StageKey | null {
  const cleaned = raw.replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ").toLowerCase().trim();
  const found = ALL_STAGES.find((s) => s.key.toLowerCase() === cleaned);
  return found ? found.key : null;
}

// ─── Lookup maps for names (fetched once) ────────────────────────────────────
interface LookupMaps {
  stageIdToName:   Map<string, string>;
  gradeIdToName:   Map<string, string>;
  brandIdToName:   Map<string, string>;
}

async function buildLookupMaps(): Promise<LookupMaps> {
  const [stages, grades, brands] = await Promise.all([
    prisma.stage.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    prisma.grade.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    prisma.brand.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
  ]);

  return {
    stageIdToName: new Map(stages.map((s: any) => [s.id, s.name])),
    gradeIdToName: new Map(grades.map((g: any) => [g.id, g.name])),
    brandIdToName: new Map(brands.map((b: any) => [b.id, b.name])),
  };
}

// ─── Resolve name from id with fallback ──────────────────────────────────────
function resolveName(map: Map<string, string>, id?: string | null): string | null {
  if (!id) return null;
  return map.get(id) ?? id; // fallback to raw id if not found
}

// ─── Replace all *GradeId / *BrandId fields with resolved names ──────────────
function resolveQualityNames(q: any, maps: LookupMaps): any {
  if (!q) return q;
  return {
    ...q,
    cementGrade: resolveName(maps.gradeIdToName, q.cementGradeId),
    cementBrand: resolveName(maps.brandIdToName, q.cementBrandId),
    steelGrade:  resolveName(maps.gradeIdToName, q.steelGradeId),
    steelBrand:  resolveName(maps.brandIdToName, q.steelBrandId),
  };
}

// ─── Stage status ─────────────────────────────────────────────────────────────
function resolveStageStatus(key: StageKey, p: any) {
  switch (key) {
    case "Land Site Inspection":
      return { started: p.landSiteInspection.length > 0,        completed: p.landSiteInspection.length > 0 };
    case "Pre-Construction":
      return { started: p.preConstructionInspections.length > 0, completed: p.preConstructionInspections.length > 0 };
    case "Foundation Stage":
      return {
        started:   p.foundationProgresses.length > 0 || p.foundationQualityChecks.length > 0,
        completed: p.foundationQualityChecks.length > 0,
      };
    case "Plinth Stage":
      return { started: p.plinthStages.length > 0, completed: p.plinthStages.length > 0 };
    case "Superstructure Stage":
    case "Non Superstructure Stage":
      return {
        started:   p.SuperStructureProgress.length > 0,
        completed: p.SuperStructureProgress.some((s: any) => s.quality),
      };
    case "Interiors":
      return { started: p.interiorsProgress.length > 0,  completed: p.interiorsProgress.some((s: any)  => s.quality) };
    case "Exteriors":
      return { started: p.exteriorsProgress.length > 0,  completed: p.exteriorsProgress.some((s: any)  => s.quality) };
    case "Development Work":
      return { started: p.DevelopmentWork.length > 0,    completed: p.DevelopmentWork.length > 0 };
    case "Take Over":
      return {
        started:   p.TakeoverBuildingInsepction.length > 0 || p.TakeoverDevelopmentWork.length > 0,
        completed: p.TakeoverBuildingInsepction.length > 0 && p.TakeoverDevelopmentWork.length > 0,
      };
    default:
      return { started: false, completed: false };
  }
}

// ─── Block summary — per block: progress entries + per-block quality ──────────
function buildBlockSummary(blocks: any[], progressList: any[], maps: LookupMaps) {
  return blocks.map((block: any) => {
    const bp = progressList.filter((p: any) => p.blockId === block.id);
    const totalFloors     = block.totalFloors ?? 0;
    const completedFloors = bp.filter((p: any) => p.status === "COMPLETED").length;
    const startedFloors   = bp.length;

    // Floor-level detail
    const floorMap: Record<string, any[]> = {};
    for (const p of bp) {
      const fk = p.floor?.floorName ?? "General";
      if (!floorMap[fk]) floorMap[fk] = [];
      floorMap[fk].push(p);
    }
    const floorDetails = Object.entries(floorMap).map(([floorName, entries]) => ({
      floorName,
      status: entries.every((e: any) => e.status === "COMPLETED") ? "COMPLETED"
            : entries.length > 0 ? "IN_PROGRESS" : "NOT_STARTED",
      stage:   entries[0]?.stage ?? null,
      remarks: entries[0]?.remarks ?? null,
      photo:   entries[0]?.photo ?? null,
    }));

    // This block's quality record (if any progress entry has quality)
    const withQuality = bp.find((p: any) => p.quality);
    const qualityRecord = withQuality
      ? resolveQualityNames(withQuality.quality, maps)
      : null;

    return {
      blockName: block.blockName,
      totalFloors,
      completedFloors,
      startedFloors,
      floorDetails,
      qualityRecord,   // ← per-block quality
      status: completedFloors === totalFloors && totalFloors > 0 ? "COMPLETED"
            : startedFloors > 0 ? "IN_PROGRESS" : "NOT_STARTED",
    };
  });
}

// ─── Stage detail ─────────────────────────────────────────────────────────────
function resolveStageDetail(key: StageKey, p: any, maps: LookupMaps): Record<string, any> {
  const blocks = p.blocks ?? [];
  const ssp    = p.SuperStructureProgress ?? [];
  const ip     = p.interiorsProgress ?? [];
  const ep     = p.exteriorsProgress ?? [];

  switch (key) {
    case "Land Site Inspection":
      return { records: p.landSiteInspection };

    case "Pre-Construction":
      return { records: p.preConstructionInspections };

    case "Foundation Stage":
      return {
        progresses:    p.foundationProgresses,
        qualityChecks: p.foundationQualityChecks.map((q: any) => resolveQualityNames(q, maps)),
      };

    case "Plinth Stage":
      return { records: p.plinthStages.map((q: any) => resolveQualityNames(q, maps)) };

    case "Superstructure Stage":
    case "Non Superstructure Stage": {
      const blockSummary = buildBlockSummary(blocks, ssp, maps);
      return {
        hasSuperStructure: key === "Superstructure Stage",
        totalBlocks:       blocks.length,
        totalFloors:       blockSummary.reduce((a: number, b: any) => a + b.totalFloors, 0),
        completedFloors:   blockSummary.reduce((a: number, b: any) => a + b.completedFloors, 0),
        qualityChecked:    blockSummary.some((b: any) => b.qualityRecord),
        blocks:            blockSummary, // each block has its own qualityRecord
      };
    }

    case "Interiors": {
      const blockSummary = buildBlockSummary(blocks, ip, maps);
      return {
        totalBlocks:    blocks.length,
        qualityChecked: blockSummary.some((b: any) => b.qualityRecord),
        blocks:         blockSummary,
      };
    }

    case "Exteriors": {
      const blockSummary = buildBlockSummary(blocks, ep, maps);
      return {
        totalBlocks:    blocks.length,
        qualityChecked: blockSummary.some((b: any) => b.qualityRecord),
        blocks:         blockSummary,
      };
    }

    case "Development Work":
      return { records: p.DevelopmentWork };

    case "Take Over":
      return {
        buildingInspections: p.TakeoverBuildingInsepction,
        developmentWorks:    p.TakeoverDevelopmentWork,
      };

    default:
      return {};
  }
}

// ─── Format project ───────────────────────────────────────────────────────────
function formatProject(p: any, maps: LookupMaps) {
  const rawStages: string[] = Array.isArray(p.selectedStages) ? p.selectedStages : [];
  const selectedStageKeys: StageKey[] = rawStages
    .map((idOrName: string) => normalizeKey(maps.stageIdToName.get(idOrName) ?? idOrName))
    .filter((k): k is StageKey => k !== null);

  const stages: Record<string, any> = {};
  for (const key of selectedStageKeys) {
    const { started, completed } = resolveStageStatus(key, p);
    const detail                 = resolveStageDetail(key, p, maps);
    stages[key] = {
      name: key, started, completed,
      status: completed ? "COMPLETED" : started ? "IN_PROGRESS" : "NOT_STARTED",
      ...detail,
    };
  }

  const completedStages     = selectedStageKeys.filter((k) => stages[k]?.completed).length;
  const selectedStageCount  = selectedStageKeys.length;
  const completedStageNames = selectedStageKeys.filter((k) => stages[k]?.completed);

  const reverseOrder = [...ALL_STAGES].reverse().map((s) => s.key);
  let currentStage = "NOT_STARTED";
  for (const key of reverseOrder) {
    if (selectedStageKeys.includes(key) && stages[key]?.started) { currentStage = key; break; }
  }

  return {
    id:                p.id,
    code:              p.code,
    projectName:       p.projectName,
    buildingType:      p.buildingType,
    location:          p.location ?? null,
    departmentId:      p.departmentId,
    departmentName:    p.department?.name ?? null,
    jurisdictionType:  p.jurisdictionType,
    accessType:        p.accessType ?? null,
    hasSuperStructure: p.hasSuperStructure,
    status:            p.status,
    currentStage,
    selectedStageCount,
    completedStages,
    completedStageNames,
    pendingStages:     selectedStageCount - completedStages,
    stages,
    createdBy: p.createdByUser ? {
      id:       p.createdByUser.id,
      username: p.createdByUser.username,
      email:    p.createdByUser.email,
      role:     p.createdByUser.role?.name ?? null,
    } : null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

// ─── PUBLIC SERVICES ──────────────────────────────────────────────────────────

export async function generateAdminPdfService(params: {
  search?:      string;
  districts?:   string[];
  departments?: string[];
  stages?:      string[];
  generatedBy?: string;
  generatedByUserId?: string;
}): Promise<Buffer> {
  const { search, districts, departments, stages, generatedBy, generatedByUserId } = params;

  const where: any = { isActive: true };
  if (search)            where.projectName = { contains: search, mode: "insensitive" };
  if (departments?.length) where.department = { name: { in: departments } };
  if (districts?.length) {
    where.projectAccessMappings = {
      some: { district: { name: { in: districts } }, isActive: true },
    };
  }

  const maps = await buildLookupMaps();

  const rawProjects = await prisma.project.findMany({
    where,
    include:  PROJECT_INCLUDE as any,
    orderBy:  { createdAt: "desc" },
  });

  let formatted = rawProjects.map((p: any) => formatProject(p, maps));

  if (stages?.length) {
    formatted = formatted.filter((p: any) =>
      stages.some((s) => p.stages[s]?.started)
    );
  }

  const summary = {
    totalProjects:     formatted.length,
    completedProjects: formatted.filter((p: any) => p.status === "CompletedProjects").length,
    ongoingProjects:   formatted.filter((p: any) => p.status === "OngoingProjects").length,
    assignedProjects:  formatted.filter((p: any) => p.status === "AssignedProjects").length,
  };

  if (generatedByUserId) {
    await prisma.auditLog.create({
      data: {
        tableName: "admin_pdf_report",
        recordId:  "dashboard",
        action:    "DOWNLOAD",
        newValue:  { filters: { search, districts, departments, stages } } as any,
        userId:    generatedByUserId,
      },
    }).catch(() => {});
  }

  return generateAdminDashboardPdf({ projects: formatted, summary, filters: { districts, departments, stages }, generatedBy });
}

// ─── Single project PDF ───────────────────────────────────────────────────────
export async function generateProjectPdfService(params: {
  projectId: string;
  generatedBy?: string;
  generatedByUserId?: string;
}): Promise<Buffer> {
  const { projectId, generatedBy, generatedByUserId } = params;

  const maps = await buildLookupMaps();

  const raw = await prisma.project.findFirst({
    where:   { id: projectId, isActive: true },
    include: PROJECT_INCLUDE as any,
  });

  if (!raw) throw new Error("Project not found");

  const project = formatProject(raw, maps);

  if (generatedByUserId) {
    await prisma.auditLog.create({
      data: {
        tableName: "project_pdf_report",
        recordId:  projectId,
        action:    "DOWNLOAD",
        newValue:  { projectId } as any,
        userId:    generatedByUserId,
      },
    }).catch(() => {});
  }

  return generateSingleProjectPdf({ project, generatedBy });
}

// ─── User PDF ─────────────────────────────────────────────────────────────────
export async function generateUserPdfService(params: {
  userId: string;
  generatedBy?: string;
  generatedByUserId?: string;
}): Promise<Buffer> {
  const { userId, generatedBy, generatedByUserId } = params;

  const userRecord = await prisma.user.findFirst({
    where:   { id: userId, isActive: true },
    include: {
      role:            true,
      userManagements: {
        where:   { isActive: true },
        include: { department: true },
      },
    },
  });

  if (!userRecord) throw new Error("User not found");

  const maps = await buildLookupMaps();

  const rawProjects = await prisma.project.findMany({
    where:   { createdByUserId: userId, isActive: true },
    include: PROJECT_INCLUDE as any,
    orderBy: { createdAt: "desc" },
  });

  const formatted = rawProjects.map((p: any) => formatProject(p, maps));

  const dept = (userRecord as any).userManagements?.[0]?.department?.name ?? "—";

  const userInfo = {
    id:         userRecord.id,
    username:   userRecord.username,
    email:      userRecord.email ?? "—",
    role:       (userRecord as any).role?.name ?? "—",
    department: dept,
  };

  if (generatedByUserId) {
    await prisma.auditLog.create({
      data: {
        tableName: "user_pdf_report",
        recordId:  userId,
        action:    "DOWNLOAD",
        newValue:  { targetUserId: userId } as any,
        userId:    generatedByUserId,
      },
    }).catch(() => {});
  }

  return generateUserDetailPdf({ user: userInfo, projects: formatted, generatedBy });
}