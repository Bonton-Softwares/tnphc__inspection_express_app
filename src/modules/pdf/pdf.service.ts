// src/modules/pdf/pdf.service.ts
import prisma from "../../shared/prisma";
import { generateAdminDashboardPdf } from "./generators/adminDashboardPdf";
import { generateUserDetailPdf } from "./generators/userDetailPdf";

// ─── Shared Prisma include ────────────────────────────────────────────────────
// FIX: use `blocks` and `floors` (actual Prisma relation names from your schema)
//      NOT `superStructures` which doesn't exist on the `project` model
const PROJECT_INCLUDE = {
  department: true,

  createdByUser: {
    select: {
      id: true,
      username: true,
      email: true,
      role: {
        select: {
          name: true,
        },
      },
    },
  },

  projectAccessMappings: {
    where: {
      isActive: true,
    },
    include: {
      district: true,
      specialUnit: true,
    },
  },

  landSiteInspection: {
    where: {
      isActive: true,
    },
  },

  preConstructionInspections: {
    where: {
      isActive: true,
    },
  },

  foundationProgresses: {
    where: {
      isActive: true,
    },
  },

  foundationQualityChecks: {
    where: {
      isActive: true,
    },
  },

  plinthStages: {
    where: {
      isActive: true,
    },
  },

  // ✅ FIXED
  blocks: {
    include: {
      floors: true,
    },
  },

  // ✅ FIXED
  floors: true,

  SuperStructureProgress: {
  where: {
    isActive: true,
  },
  include: {
    quality: true,
    block: true,
    floor: true,
  },
},

  interiorsProgress: {
    where: {
      isActive: true,
    },
    include: {
      quality: true,
      block: true,
      floor: true,
    },
  },

  exteriorsProgress: {
    where: {
      isActive: true,
    },
    include: {
      quality: true,
      block: true,
      floor: true,
    },
  },

  BuildingInspection: {
    where: {
      isActive: true,
    },
  },

  DevelopmentWork: {
    where: {
      isActive: true,
    },
  },

  TakeoverBuildingInsepction: {
    where: {
      isActive: true,
    },
  },

  TakeoverDevelopmentWork: {
    where: {
      isActive: true,
    },
  },

  projectHistories: {
    where: {
      isActive: true,
    },
    orderBy: {
      createdAt: "desc" as const,
    },
    take: 5,
  },
};

// ─── Stage resolution (adapted from adminReports.service) ────────────────────
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

function resolveStageStatus(key: StageKey, p: any) {
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
    case "Superstructure Stage":
    case "Non Superstructure Stage":
      return {
        started:   p.SuperStructureProgress.length > 0,
        completed: p.SuperStructureProgress.some((s: any) => s.quality),
      };
    case "Interiors":
      return {
        started:   p.interiorsProgress.length > 0,
        completed: p.interiorsProgress.some((s: any) => s.quality),
      };
    case "Exteriors":
      return {
        started:   p.exteriorsProgress.length > 0,
        completed: p.exteriorsProgress.some((s: any) => s.quality),
      };
    case "Development Work":
      return { started: p.DevelopmentWork.length > 0, completed: p.DevelopmentWork.length > 0 };
    case "Take Over":
      return {
        started:   p.TakeoverBuildingInsepction.length > 0 || p.TakeoverDevelopmentWork.length > 0,
        completed: p.TakeoverBuildingInsepction.length > 0 && p.TakeoverDevelopmentWork.length > 0,
      };
    default:
      return { started: false, completed: false };
  }
}

function buildBlockSummary(blocks: any[], progressList: any[]) {
  return blocks.map((block: any) => {
    const bp = progressList.filter((p: any) => p.blockId === block.id);
    const totalFloors     = block.totalFloors ?? 0;
    const completedFloors = bp.filter((p: any) => p.status === "COMPLETED").length;
    const startedFloors   = bp.length;

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
    }));

    return {
      blockName: block.blockName,
      totalFloors,
      completedFloors,
      startedFloors,
      floorDetails,
      status: completedFloors === totalFloors && totalFloors > 0 ? "COMPLETED"
            : startedFloors > 0 ? "IN_PROGRESS" : "NOT_STARTED",
    };
  });
}

function resolveStageDetail(key: StageKey, p: any): Record<string, any> {
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
        qualityChecks: p.foundationQualityChecks,
      };
    case "Plinth Stage":
      return { records: p.plinthStages };
    case "Superstructure Stage":
    case "Non Superstructure Stage": {
      const blockSummary = buildBlockSummary(blocks, ssp);
      const first = ssp.find((s: any) => s.quality);
      return {
        totalBlocks:     blocks.length,
        totalFloors:     blockSummary.reduce((a: number, b: any) => a + b.totalFloors, 0),
        completedFloors: blockSummary.reduce((a: number, b: any) => a + b.completedFloors, 0),
        qualityChecked:  !!first,
        blocks:          blockSummary,
        qualityRecord:   first?.quality ?? null,
      };
    }
    case "Interiors": {
      const blockSummary = buildBlockSummary(blocks, ip);
      const first = ip.find((s: any) => s.quality);
      return {
        totalBlocks:    blocks.length,
        qualityChecked: !!first,
        blocks:         blockSummary,
        qualityRecord:  first?.quality ?? null,
      };
    }
    case "Exteriors": {
      const blockSummary = buildBlockSummary(blocks, ep);
      const first = ep.find((s: any) => s.quality);
      return {
        totalBlocks:    blocks.length,
        qualityChecked: !!first,
        blocks:         blockSummary,
        qualityRecord:  first?.quality ?? null,
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

// ─── Format a raw Prisma project into the shape generators expect ─────────────
async function formatProject(p: any, stageIdToName: Map<string, string>) {
  const rawStages: string[] = Array.isArray(p.selectedStages) ? p.selectedStages : [];
  const selectedStageKeys: StageKey[] = rawStages
    .map((idOrName: string) => {
      const name = stageIdToName.get(idOrName) ?? idOrName;
      return normalizeKey(name);
    })
    .filter((k): k is StageKey => k !== null);

  const stages: Record<string, any> = {};
  for (const key of selectedStageKeys) {
    const { started, completed } = resolveStageStatus(key, p);
    const detail                 = resolveStageDetail(key, p);
    stages[key] = {
      name: key,
      started, completed,
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

// ─── PUBLIC SERVICE FUNCTIONS ────────────────────────────────────────────────

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
  if (search)       where.projectName = { contains: search, mode: "insensitive" };
  if (departments?.length) where.department = { name: { in: departments } };
  if (districts?.length) {
    where.projectAccessMappings = {
      some: { district: { name: { in: districts } }, isActive: true },
    };
  }

  const allStagesFromDB = await prisma.stage.findMany({
    where: { isActive: true }, select: { id: true, name: true },
  });
  const stageIdToName = new Map(allStagesFromDB.map((s: any) => [s.id, s.name]));

  const rawProjects = await prisma.project.findMany({
    where,
    include:  PROJECT_INCLUDE as any,
    orderBy:  { createdAt: "desc" },
  });

  let formatted = await Promise.all(rawProjects.map((p: any) => formatProject(p, stageIdToName)));

  // Filter by stage if requested
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

  // Audit log
  if (generatedByUserId) {
    await prisma.auditLog.create({
      data: {
        tableName: "admin_pdf_report",
        recordId:  "dashboard",
        action:    "DOWNLOAD",
        newValue:  { filters: { search, districts, departments, stages } } as any,
        userId:    generatedByUserId,
      },
    }).catch(() => {}); // non-blocking
  }

  return generateAdminDashboardPdf({
    projects:    formatted,
    summary,
    filters:     { districts, departments, stages },
    generatedBy,
  });
}

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

  // Projects created by this user
  const allStagesFromDB = await prisma.stage.findMany({
    where: { isActive: true }, select: { id: true, name: true },
  });
  const stageIdToName = new Map(allStagesFromDB.map((s: any) => [s.id, s.name]));

  const rawProjects = await prisma.project.findMany({
    where:   { createdByUserId: userId, isActive: true },
    include: PROJECT_INCLUDE as any,
    orderBy: { createdAt: "desc" },
  });

  const formatted = await Promise.all(rawProjects.map((p: any) => formatProject(p, stageIdToName)));

  const dept = (userRecord as any).userManagements?.[0]?.department?.name ?? "—";

  const userInfo = {
    id:         userRecord.id,
    username:   userRecord.username,
    email:      userRecord.email ?? "—",
    role:       (userRecord as any).role?.name ?? "—",
    department: dept,
  };

  // Audit log
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


export async function generateProjectPdfService(params: {
  projectId: string;
  generatedBy?: string;
  generatedByUserId?: string;
}): Promise<Buffer> {
  const { projectId, generatedBy, generatedByUserId } = params;

  const allStagesFromDB = await prisma.stage.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  const stageIdToName = new Map(
    allStagesFromDB.map((s: any) => [s.id, s.name])
  );

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      isActive: true,
    },
    include: PROJECT_INCLUDE as any,
  });

  if (!project) {
    throw new Error("Project not found");
  }

  const formattedProject = await formatProject(
    project,
    stageIdToName
  );

  if (generatedByUserId) {
    await prisma.auditLog.create({
      data: {
        tableName: "project_pdf_report",
        recordId: projectId,
        action: "DOWNLOAD",
        userId: generatedByUserId,
        newValue: {
          projectId,
        } as any,
      },
    }).catch(() => {});
  }

  return generateUserDetailPdf({
    user: {
      id: "",
      username: "Project Report",
      email: "",
      role: "",
      department: formattedProject.departmentName,
    },
    projects: [formattedProject],
    generatedBy,
  });
}