// src/modules/pdf/pdf.service.ts
import prisma from "../../shared/prisma";
import { generateAdminDashboardPdf } from "./generators/adminDashboardPdf";
import { generateUserDetailPdf }     from "./generators/userDetailPdf";
import { generateSingleProjectPdf }  from "./generators/singleProjectPdf";
import { STAGE_LABELS, MODULE_STAGE_MAP, isModuleDrivenStage } from "./configs/stageConfig";

// ─── Prisma include ───────────────────────────────────────────────────────────
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
  blocks: { include: { floors: true } },
  inspectionProgresses: {
    where: { isActive: true },
    include: {
      module:  true,
      stage:   true,
      block:   true,
      floor:   true,
      answers: { include: { question: true, option: true, images: true } },
    },
  },
  BuildingInspection: {
    where:   { isActive: true },
    include: { developmentWork: true, block: true, floor: true },
  },
  TakeoverBuildingInsepction: {
    where:   { isActive: true },
    include: { developmentWork: true, block: true, floor: true },
  },
  projectHistories: {
    where:   { isActive: true },
    orderBy: { createdAt: "desc" as const },
    take:    5,
  },
};

// ─── Stage keys ───────────────────────────────────────────────────────────────
const ALL_STAGES = [
  { key: "Land Site Inspection"   },
  { key: "Pre-Construction"       },
  { key: "Foundation Stage"       },
  { key: "Plinth Stage"           },
  { key: "Framed Structure"       },
  { key: "Load Bearing Structure" },
  { key: "Interiors"              },
  { key: "Exteriors"              },
  { key: "Development Work"       },
  { key: "Take Over"              },
] as const;

type StageKey = (typeof ALL_STAGES)[number]["key"];

const LEGACY_ALIASES: Record<string, StageKey> = {
  "superstructure stage":     "Framed Structure",
  "non superstructure stage": "Load Bearing Structure",
};

function normalizeKey(raw: string): StageKey | null {
  const cleaned = raw.replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ").toLowerCase().trim();
  if (LEGACY_ALIASES[cleaned]) return LEGACY_ALIASES[cleaned];
  const found = ALL_STAGES.find((s) => s.key.toLowerCase() === cleaned);
  return found ? found.key : null;
}

// ─── Lookup maps ──────────────────────────────────────────────────────────────
interface LookupMaps {
  stageIdToName: Map<string, string>;
  gradeIdToName: Map<string, string>;
  brandIdToName: Map<string, string>;
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

function resolveName(map: Map<string, string>, id?: string | null): string | null {
  if (!id) return null;
  return map.get(id) ?? id;
}

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

// ─── Development work helpers ─────────────────────────────────────────────────
function getDevelopmentWorks(p: any): any[] {
  return (p.BuildingInspection ?? [])
    .map((bi: any) => bi.developmentWork)
    .filter((dw: any) => dw != null);
}

function getTakeoverDevelopmentWorks(p: any): any[] {
  return (p.TakeoverBuildingInsepction ?? [])
    .map((bi: any) => bi.developmentWork)
    .filter((dw: any) => dw != null);
}

// ─── Stage status ─────────────────────────────────────────────────────────────
function resolveStageStatus(key: StageKey, p: any) {
  if (isModuleDrivenStage(key)) {
    const moduleName = MODULE_STAGE_MAP[key];
    const records = (p.inspectionProgresses ?? []).filter(
      (r: any) => r.module?.name === moduleName
    );
    return {
      started:   records.length > 0,
      completed: records.length > 0 && records.every((r: any) => r.status === "COMPLETED"),
    };
  }
  switch (key) {
    case "Land Site Inspection":
      return { started: p.landSiteInspection.length > 0, completed: p.landSiteInspection.length > 0 };
    case "Pre-Construction":
      return { started: p.preConstructionInspections.length > 0, completed: p.preConstructionInspections.length > 0 };
    case "Foundation Stage":
      return {
        started:   p.foundationProgresses.length > 0 || p.foundationQualityChecks.length > 0,
        completed: p.foundationQualityChecks.length > 0,
      };
    case "Plinth Stage":
      return { started: p.plinthStages.length > 0, completed: p.plinthStages.length > 0 };
    case "Development Work": {
      const dw = getDevelopmentWorks(p);
      return { started: dw.length > 0, completed: dw.length > 0 };
    }
    case "Take Over": {
      const tdw = getTakeoverDevelopmentWorks(p);
      return {
        started:   p.TakeoverBuildingInsepction.length > 0 || tdw.length > 0,
        completed: p.TakeoverBuildingInsepction.length > 0 && tdw.length > 0,
      };
    }
    default:
      return { started: false, completed: false };
  }
}

// ─── Module-driven stage detail ───────────────────────────────────────────────
function resolveModuleStageDetail(key: StageKey, p: any) {
  const moduleName = MODULE_STAGE_MAP[key];
  const records = (p.inspectionProgresses ?? []).filter(
    (r: any) => r.module?.name === moduleName
  );

  type RoomEntry  = { roomNo: string | null; overallStatus: string; stages: any[] };
  type FloorEntry = { floorName: string; rooms: Map<string, RoomEntry> };
  type BlockEntry = { blockName: string; floors: Map<string, FloorEntry> };

  const blockMap = new Map<string, BlockEntry>();

  for (const r of records) {
    const blockName = r.block?.blockName ?? "General";
    if (!blockMap.has(blockName)) blockMap.set(blockName, { blockName, floors: new Map() });
    const block = blockMap.get(blockName)!;

    const floorName = r.floor?.floorName ?? "General";
    if (!block.floors.has(floorName)) block.floors.set(floorName, { floorName, rooms: new Map() });
    const floor = block.floors.get(floorName)!;

    const roomKey = r.roomNo ?? "__none__";
    if (!floor.rooms.has(roomKey)) floor.rooms.set(roomKey, { roomNo: r.roomNo ?? null, overallStatus: "NOT_STARTED", stages: [] });
    const room = floor.rooms.get(roomKey)!;

    room.stages.push({
      stageName:       r.stage?.name ?? "Stage",
      status:          r.status,
      workStartedDate: r.workStartedDate,
      isDelay:         r.isDelay,
      delayDays:       r.delayDays,
      delayReason:     r.delayReason,
      remarks:         r.remarks,
      progressPhoto:   safeParsePhoto(r.progressPhoto),
      answers: (r.answers ?? []).map((a: any) => ({
        question:  a.question?.question ?? "Answer",
        fieldType: a.question?.fieldType ?? null,
        value:     resolveAnswerValue(a),
      })),
    });
  }

  const blocks = Array.from(blockMap.values()).map((block) => ({
    blockName: block.blockName,
    floors: Array.from(block.floors.values()).map((floor) => ({
      floorName: floor.floorName,
      rooms: Array.from(floor.rooms.values()).map((room) => ({
        roomNo: room.roomNo,
        stages: room.stages,
        overallStatus: room.stages.length === 0
          ? "NOT_STARTED"
          : room.stages.every((s: any) => s.status === "COMPLETED")
          ? "COMPLETED"
          : room.stages.some((s: any) => s.status === "IN_PROGRESS" || s.status === "COMPLETED")
          ? "IN_PROGRESS"
          : "NOT_STARTED",
      })),
    })),
  }));

  return {
    label:            STAGE_LABELS[key] ?? key,
    totalRecords:     records.length,
    completedRecords: records.filter((r: any) => r.status === "COMPLETED").length,
    blocks,
  };
}

function resolveAnswerValue(a: any): any {
  if (a.option?.value) return a.option.value;
  if (typeof a.answer === "string") {
    try {
      const parsed = JSON.parse(a.answer);
      if (Array.isArray(parsed)) return parsed;
      return a.answer;
    } catch { return a.answer; }
  }
  return a.answer ?? null;
}

function safeParsePhoto(photo: any): any {
  if (!photo) return null;
  if (typeof photo !== "string") return photo;
  try { return JSON.parse(photo); } catch { return photo; }
}

// ─── Stage detail ─────────────────────────────────────────────────────────────
function resolveStageDetail(key: StageKey, p: any, maps: LookupMaps): Record<string, any> {
  if (isModuleDrivenStage(key)) return resolveModuleStageDetail(key, p);
  switch (key) {
    case "Land Site Inspection":  return { records: p.landSiteInspection };
    case "Pre-Construction":      return { records: p.preConstructionInspections };
    case "Foundation Stage":
      return {
        progresses:    p.foundationProgresses,
        qualityChecks: p.foundationQualityChecks.map((q: any) => resolveQualityNames(q, maps)),
      };
    case "Plinth Stage":
      return { records: p.plinthStages.map((q: any) => resolveQualityNames(q, maps)) };
    case "Development Work":
      return { records: getDevelopmentWorks(p) };
    case "Take Over":
      return {
        buildingInspections: p.TakeoverBuildingInsepction,
        developmentWorks:    getTakeoverDevelopmentWorks(p),
      };
    default: return {};
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
}): Promise<{ buffer: Buffer }> {
  const { search, districts, departments, stages, generatedBy, generatedByUserId } = params;

  const where: any = { isActive: true };
  if (search)              where.projectName = { contains: search, mode: "insensitive" };
  if (departments?.length) where.department  = { name: { in: departments } };
  if (districts?.length) {
    where.projectAccessMappings = {
      some: { district: { name: { in: districts } }, isActive: true },
    };
  }

  const maps = await buildLookupMaps();
  const rawProjects = await prisma.project.findMany({
    where, include: PROJECT_INCLUDE as any, orderBy: { createdAt: "desc" },
  });

  let formatted = rawProjects.map((p: any) => formatProject(p, maps));
  if (stages?.length) {
    formatted = formatted.filter((p: any) => stages.some((s) => p.stages[s]?.started));
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

  const buffer = await generateAdminDashboardPdf({
    projects: formatted, summary, filters: { districts, departments, stages }, generatedBy,
  });

  return { buffer };
}

// ─── Single project PDF ───────────────────────────────────────────────────────
export async function generateProjectPdfService(params: {
  projectId:    string;
  generatedBy?: string;
  generatedByUserId?: string;
}): Promise<{ buffer: Buffer; projectName: string }> {
  const { projectId, generatedBy, generatedByUserId } = params;

  const maps = await buildLookupMaps();
  const raw  = await prisma.project.findFirst({
    where: { id: projectId, isActive: true }, include: PROJECT_INCLUDE as any,
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

  const buffer = await generateSingleProjectPdf({ project, generatedBy });

  return { buffer, projectName: project.projectName };
}

// ─── User PDF ─────────────────────────────────────────────────────────────────
export async function generateUserPdfService(params: {
  userId:       string;
  generatedBy?: string;
  generatedByUserId?: string;
}): Promise<{ buffer: Buffer; username: string }> {
  const { userId, generatedBy, generatedByUserId } = params;

  const userRecord = await prisma.user.findFirst({
    where:   { id: userId, isActive: true },
    include: {
      role:            true,
      userManagements: { where: { isActive: true }, include: { department: true } },
    },
  });

  if (!userRecord) throw new Error("User not found");

  const maps       = await buildLookupMaps();
  const rawProjects = await prisma.project.findMany({
    where: { createdByUserId: userId, isActive: true },
    include: PROJECT_INCLUDE as any,
    orderBy: { createdAt: "desc" },
  });

  const formatted = rawProjects.map((p: any) => formatProject(p, maps));
  const dept      = (userRecord as any).userManagements?.[0]?.department?.name ?? "—";

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

  const buffer = await generateUserDetailPdf({ user: userInfo, projects: formatted, generatedBy });

  return { buffer, username: userRecord.username };
}