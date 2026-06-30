import prisma from "../../shared/prisma";
import { pageConfig } from "../../utils/query.helper";

const ALL_STAGES = [
  { key: "Land Site Inspection",     label: "Land Site Inspection"     },
  { key: "Pre-Construction",         label: "Pre-Construction"         },
  { key: "Foundation Stage",         label: "Foundation Stage"         },
  { key: "Plinth Stage",             label: "Plinth Stage"             },
  { key: "Superstructure Stage",     label: "Superstructure Stage"     },
  { key: "Non Superstructure Stage", label: "Non Superstructure Stage" },
  { key: "Interiors",                label: "Interiors"                },
  { key: "Exteriors",                label: "Exteriors"                },
  { key: "Development Work",         label: "Development Work"         },
  { key: "Take Over",                label: "Take Over"                },
] as const;

type StageKey = (typeof ALL_STAGES)[number]["key"];

// inspection_module.name values — adjust if yours differ
const FRAMED_MODULE       = "FRAMED_STRUCTURE";
const LOAD_BEARING_MODULE = "LOAD_BEARING_STRUCTURE";
const INTERIOR_MODULE     = "INTERIOR";
const EXTERIOR_MODULE     = "EXTERIOR";

function normalizeKey(raw: string): StageKey | null {
  const cleaned = raw
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();

  const found = ALL_STAGES.find(
    (s: { key: string; label: string }) => s.key.toLowerCase() === cleaned
  );
  return found ? found.key : null;
}

function resolveStageStatus(
  key: StageKey,
  project: any,
  superStructureProgress: any[],
  interiorsProgress: any[],
  exteriorsProgress: any[],
  developmentWorkRecords: any[],
  takeoverDevelopmentWorkRecords: any[]
): { started: boolean; completed: boolean } {
  switch (key) {
    case "Land Site Inspection":
      return {
        started:   project.landSiteInspection.length > 0,
        completed: project.landSiteInspection.length > 0,
      };
    case "Pre-Construction":
      return {
        started:   project.preConstructionInspections.length > 0,
        completed: project.preConstructionInspections.length > 0,
      };
    case "Foundation Stage":
      return {
        started:
          project.foundationProgresses.length > 0 ||
          project.foundationQualityChecks.length > 0,
        completed: project.foundationQualityChecks.length > 0,
      };
    case "Plinth Stage":
      return {
        started:   project.plinthStages.length > 0,
        completed: project.plinthStages.length > 0,
      };
    case "Superstructure Stage":
      return {
        started:   superStructureProgress.length > 0,
        completed:
          superStructureProgress.length > 0 &&
          superStructureProgress.every((p: any) => p.status === "COMPLETED"),
      };
    case "Non Superstructure Stage":
      return {
        started:   superStructureProgress.length > 0,
        completed:
          superStructureProgress.length > 0 &&
          superStructureProgress.every((p: any) => p.status === "COMPLETED"),
      };
    case "Interiors":
      return {
        started:   interiorsProgress.length > 0,
        completed:
          interiorsProgress.length > 0 &&
          interiorsProgress.every((p: any) => p.status === "COMPLETED"),
      };
    case "Exteriors":
      return {
        started:   exteriorsProgress.length > 0,
        completed:
          exteriorsProgress.length > 0 &&
          exteriorsProgress.every((p: any) => p.status === "COMPLETED"),
      };
    case "Development Work":
      return {
        started:   developmentWorkRecords.length > 0,
        completed: developmentWorkRecords.length > 0,
      };
    case "Take Over":
      return {
        started:
          project.TakeoverBuildingInsepction.length > 0 ||
          takeoverDevelopmentWorkRecords.length > 0,
        completed:
          project.TakeoverBuildingInsepction.length > 0 &&
          takeoverDevelopmentWorkRecords.length > 0,
      };
    default:
      return { started: false, completed: false };
  }
}

// ─────────────────────────────────────────────
// blockField removed — progress rows now carry real blockId/floorId FKs
// instead of a blockName/block string, so we match by id.
// ─────────────────────────────────────────────
function buildBlockSummary(blocks: any[], progressList: any[]) {
  return blocks.map((block: any) => {
    const blockProgress = progressList.filter((p: any) => p.blockId === block.id);

    const totalFloors     = block.totalFloors ?? 0;
    const completedFloors = blockProgress.filter(
      (p: any) => p.status === "COMPLETED"
    ).length;
    const startedFloors   = blockProgress.length;

    const floorMap: Record<string, any[]> = {};
    for (const p of blockProgress) {
      const floorKey = p.floor?.floorName ?? "General";
      if (!floorMap[floorKey]) floorMap[floorKey] = [];
      floorMap[floorKey].push(p);
    }

    const floorDetails = Object.entries(floorMap).map(([floorName, entries]) => ({
      floorName,
      status: entries.every((e: any) => e.status === "COMPLETED")
        ? "COMPLETED"
        : entries.length > 0
        ? "IN_PROGRESS"
        : "NOT_STARTED",
      entries,
    }));

    return {
      blockName:      block.blockName,
      totalFloors,
      floors:         block.floors ?? [],
      completedFloors,
      startedFloors,
      status:
        completedFloors === totalFloors && totalFloors > 0 ? "COMPLETED"
        : startedFloors > 0                               ? "IN_PROGRESS"
        : "NOT_STARTED",
      floorDetails,
    };
  });
}

function resolveStageDetail(
  key: StageKey,
  project: any,
  superStructureBlocks: any[],
  interiorBlocks: any[],
  exteriorBlocks: any[],
  totalSuperFloors: number,
  completedSuperFloors: number,
  superStructureProgress: any[],
  interiorsProgress: any[],
  exteriorsProgress: any[],
  developmentWorkRecords: any[],
  takeoverDevelopmentWorkRecords: any[]
): Record<string, any> {
  switch (key) {

    case "Land Site Inspection":
      return {
        recordCount: project.landSiteInspection.length,
        records:     project.landSiteInspection,
      };

    case "Pre-Construction":
      return {
        recordCount: project.preConstructionInspections.length,
        records:     project.preConstructionInspections,
      };

    case "Foundation Stage":
      return {
        progressCount:     project.foundationProgresses.length,
        qualityCheckCount: project.foundationQualityChecks.length,
        progresses:        project.foundationProgresses,
        qualityChecks:     project.foundationQualityChecks,
      };

    case "Plinth Stage":
      return {
        recordCount: project.plinthStages.length,
        records:     project.plinthStages,
      };

    case "Superstructure Stage":
      return {
        hasSuperStructure: true,
        totalBlocks:       project.blocks.length,
        totalFloors:       totalSuperFloors,
        completedFloors:   completedSuperFloors,
        qualityChecked:
          superStructureProgress.length > 0 &&
          superStructureProgress.every((p: any) => p.status === "COMPLETED"),
        blocks:            superStructureBlocks,
        qualityRecord:     null, // no separate quality-check model in current schema
      };

    case "Non Superstructure Stage":
      return {
        hasSuperStructure: false,
        qualityChecked:
          superStructureProgress.length > 0 &&
          superStructureProgress.every((p: any) => p.status === "COMPLETED"),
        progressCount:     superStructureProgress.length,
        blocks:            superStructureBlocks,
        qualityRecord:     null,
      };

    case "Interiors":
      return {
        totalBlocks:    project.blocks.length,
        qualityChecked:
          interiorsProgress.length > 0 &&
          interiorsProgress.every((p: any) => p.status === "COMPLETED"),
        blocks:         interiorBlocks,
        qualityRecord:  null,
      };

    case "Exteriors":
      return {
        totalBlocks:    project.blocks.length,
        qualityChecked:
          exteriorsProgress.length > 0 &&
          exteriorsProgress.every((p: any) => p.status === "COMPLETED"),
        blocks:         exteriorBlocks,
        qualityRecord:  null,
      };

    case "Development Work":
      return {
        recordCount: developmentWorkRecords.length,
        records:     developmentWorkRecords,
      };

    case "Take Over":
      return {
        buildingInspectionCount: project.TakeoverBuildingInsepction.length,
        developmentWorkCount:    takeoverDevelopmentWorkRecords.length,
        buildingInspections:     project.TakeoverBuildingInsepction,
        developmentWorks:        takeoverDevelopmentWorkRecords,
      };

    default:
      return {};
  }
}

function buildAccessInfo(project: any) {
  const mappings: any[]     = project.projectAccessMappings ?? [];
  const districtMappings    = mappings.filter((m: any) => m.districtId);
  const specialUnitMappings = mappings.filter((m: any) => m.specialUnitId);

  let districtAccess:    any = null;
  let specialUnitAccess: any = null;

  if (
    project.jurisdictionType === "DISTRICT" ||
    project.jurisdictionType === "CITY"
  ) {
    districtAccess = {
      accessType: project.accessType,
      districts:  districtMappings.map((m: any) => ({
        districtId:   m.districtId,
        districtName: m.district?.name ?? null,
        districtType: m.district?.type ?? null,
      })),
    };
  }

  if (project.jurisdictionType === "SPECIAL_UNIT") {
    const first = specialUnitMappings[0];
    specialUnitAccess = first
      ? { specialUnitId: first.specialUnitId, specialUnitName: first.specialUnit?.name ?? null }
      : null;
  }

  return { districtAccess, specialUnitAccess };
}

// ─────────────────────────────────────────────
// MAIN SERVICE
// ─────────────────────────────────────────────
export const getAdminDashboardReportService = async ({
  pageNumber,
  pageSize,
  search,
}: {
  pageNumber?: string;
  pageSize?: string;
  search?: string;
}) => {
  const { skip, take, pageNumber: currentPage, pageSize: limit } =
    pageConfig({ pageNumber, pageSize });

  const whereClause: any = { isActive: true };
  if (search) {
    whereClause.projectName = { contains: search, mode: "insensitive" };
  }

  // ── Fetch all stages once → build UUID-to-name map ──
  const allStagesFromDB = await prisma.stage.findMany({
    where:  { isActive: true },
    select: { id: true, name: true },
  });

  const stageIdToName = new Map<string, string>(
    allStagesFromDB.map((s: { id: string; name: string }) => [s.id, s.name])
  );

  const [projects, totalRecords] = await Promise.all([
    prisma.project.findMany({
      where: whereClause,
      include: {
        department: true,

        createdByUser: {
          select: {
            id:       true,
            username: true,
            email:    true,
            role:     { select: { name: true } },
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

        // FIX: superStructures -> blocks (project_block) + nested floors (project_floor)
        blocks: {
          include: { floors: { orderBy: { floorNumber: "asc" } } },
        },

        // FIX: SuperStructureProgress / interiorsProgress / exteriorsProgress
        // are now all rows of inspection_progress, split below by module.name
        inspectionProgresses: {
          where:   { isActive: true },
          include: { module: true, stage: true, block: true, floor: true },
        },

        // FIX: superStructureQuality / interiorsQuality / exteriorsQuality
        // no longer exist as separate models — no replacement include for these

        BuildingInspection: {
          where:   { isActive: true },
          include: { developmentWork: true }, // FIX: DevelopmentWork is nested here now
        },
        TakeoverBuildingInsepction: {
          where:   { isActive: true },
          include: { developmentWork: true }, // FIX: TakeoverDevelopmentWork is nested here now
        },

        projectHistories: {
          where:   { isActive: true },
          orderBy: { createdAt: "desc" },
          take:    5,
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),

    prisma.project.count({ where: whereClause }),
  ]);

  // ─────────────────────────────────────────────
  // FORMAT EACH PROJECT
  // ─────────────────────────────────────────────
  const formattedProjects = projects.map((project: any) => {

    // ── Resolve selectedStages UUIDs → canonical stage name keys ──
    const rawStages: string[] = Array.isArray(project.selectedStages)
      ? (project.selectedStages as string[])
      : [];

    const selectedStageKeys: StageKey[] = rawStages
      .map((idOrName: string) => {
        const resolvedName = stageIdToName.get(idOrName) ?? idOrName;
        return normalizeKey(resolvedName);
      })
      .filter((k): k is StageKey => k !== null);

    // FIX: split the unified inspection_progress list by module name
    // (replacement for SuperStructureProgress / interiorsProgress / exteriorsProgress)
    const allProgress: any[] = project.inspectionProgresses ?? [];
    const superStructureProgress = allProgress.filter(
      (p: any) => p.module?.name === FRAMED_MODULE || p.module?.name === LOAD_BEARING_MODULE
    );
    const interiorsProgress = allProgress.filter((p: any) => p.module?.name === INTERIOR_MODULE);
    const exteriorsProgress = allProgress.filter((p: any) => p.module?.name === EXTERIOR_MODULE);

    // FIX: DevelopmentWork / TakeoverDevelopmentWork flattened out of the nested includes
    const developmentWorkRecords = (project.BuildingInspection ?? [])
      .map((b: any) => b.developmentWork)
      .filter((d: any) => !!d);

    const takeoverDevelopmentWorkRecords = (project.TakeoverBuildingInsepction ?? [])
      .map((t: any) => t.developmentWork)
      .filter((d: any) => !!d);

    // ── Block summaries ──
    const superStructureBlocks = buildBlockSummary(project.blocks, superStructureProgress);
    const interiorBlocks       = buildBlockSummary(project.blocks, interiorsProgress);
    const exteriorBlocks       = buildBlockSummary(project.blocks, exteriorsProgress);

    const totalSuperFloors     = superStructureBlocks.reduce((acc: number, b: any) => acc + b.totalFloors, 0);
    const completedSuperFloors = superStructureBlocks.reduce((acc: number, b: any) => acc + b.completedFloors, 0);

    // ── Build stages object ──
    const stages: Record<string, any> = {};

    for (const stageKey of selectedStageKeys) {
      const { started, completed } = resolveStageStatus(
        stageKey, project,
        superStructureProgress, interiorsProgress, exteriorsProgress,
        developmentWorkRecords, takeoverDevelopmentWorkRecords
      );
      const detail = resolveStageDetail(
        stageKey, project,
        superStructureBlocks, interiorBlocks, exteriorBlocks,
        totalSuperFloors, completedSuperFloors,
        superStructureProgress, interiorsProgress, exteriorsProgress,
        developmentWorkRecords, takeoverDevelopmentWorkRecords
      );

      stages[stageKey] = {
        name: stageKey,
        started,
        completed,
        status:
          completed ? "COMPLETED"
          : started ? "IN_PROGRESS"
          : "NOT_STARTED",
        ...detail,
      };
    }

    // ── Stage summary counts ──
    const selectedStageCount  = selectedStageKeys.length;
    const completedStageNames = selectedStageKeys.filter((k: StageKey) => stages[k]?.completed);
    const completedStages     = completedStageNames.length;
    const pendingStages       = selectedStageCount - completedStages;

    // ── Current active stage (deepest started) ──
    const reverseOrder = [...ALL_STAGES].reverse().map(
      (s: { key: string; label: string }) => s.key as StageKey
    );
    let currentStage = "NOT_STARTED";

    for (const key of reverseOrder) {
      if (!selectedStageKeys.includes(key)) continue;
      if (stages[key]?.started) { currentStage = key; break; }
    }

    // ── Overall status ──
    const hasAnyActivity =
      project.landSiteInspection.length > 0         ||
      project.preConstructionInspections.length > 0  ||
      project.foundationProgresses.length > 0        ||
      project.foundationQualityChecks.length > 0     ||
      project.plinthStages.length > 0                ||
      superStructureProgress.length > 0              ||
      interiorsProgress.length > 0                   ||
      exteriorsProgress.length > 0                   ||
      developmentWorkRecords.length > 0              ||
      project.TakeoverBuildingInsepction.length > 0  ||
      takeoverDevelopmentWorkRecords.length > 0;

    const allCompleted = selectedStageCount > 0 && completedStages === selectedStageCount;

    let overallStatus: string = project.status;
    if      (allCompleted)   overallStatus = "CompletedProjects";
    else if (hasAnyActivity) overallStatus = "OngoingProjects";

    const { districtAccess, specialUnitAccess } = buildAccessInfo(project);

    return {
      id:                project.id,
      code:              project.code,
      projectName:       project.projectName,
      buildingType:      project.buildingType,
      location:          project.location ?? null,
      departmentId:      project.departmentId,
      departmentName:    project.department?.name ?? null,
      jurisdictionType:  project.jurisdictionType,
      accessType:        project.accessType ?? null,
      hasSuperStructure: project.hasSuperStructure,
      status:            overallStatus,
      currentStage,

      districtAccess,
      specialUnitAccess,

      selectedStageCount,
      completedStages,
      completedStageNames,
      pendingStages,

      stages,

      // FIX: superStructures -> blocks
      superStructure: project.blocks.map((b: any) => ({
        blockName:   b.blockName,
        totalFloors: b.totalFloors ?? 0,
        floors:      b.floors ?? [],
      })),

      createdBy: project.createdByUser
        ? {
            id:       project.createdByUser.id,
            username: project.createdByUser.username,
            email:    project.createdByUser.email,
            role:     project.createdByUser.role?.name ?? null,
          }
        : null,

      recentHistory: project.projectHistories.map((h: any) => ({
        action:      h.action,
        remarks:     h.remarks,
        changedById: h.changedById,
        changedAt:   h.createdAt,
      })),

      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  });

  // ─────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────
  const summary = {
    totalProjects:     totalRecords,
    completedProjects: formattedProjects.filter((p: any) => p.status === "CompletedProjects").length,
    ongoingProjects:   formattedProjects.filter((p: any) => p.status === "OngoingProjects").length,
    assignedProjects:  formattedProjects.filter((p: any) => p.status === "AssignedProjects").length,
  };

  return {
    summary,
    totalRecords,
    totalPages:  Math.ceil(totalRecords / limit),
    currentPage,
    pageSize:    limit,
    data:        formattedProjects,
  };
};