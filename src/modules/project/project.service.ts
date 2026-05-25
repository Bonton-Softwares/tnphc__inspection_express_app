import { status } from "@prisma/client";
import { pageConfig } from "../../utils/query.helper";
import prisma from "../../shared/prisma";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type DistrictEntry = {
  districtId: string;
  districtType: "DISTRICT" | "CITY";
};

type AccessRule = {
  accessType: "SPECIFIC" | "FULL_JURISDICTION";
  districts?: DistrictEntry[];
};

type SuperStructureBlock = {
  blockName: string;
  totalFloors: number;
  floors: string[];
};

type CreateProjectInput = {
  projectName: string;
  buildingType: "OFFICE" | "RESIDENCY" | "OTHERS";
  location?: string;
  departmentId: string;
  /**
   * DISTRICT/CITY project  → specialUnitId is absent/null
   *                          districtAccess is REQUIRED
   *                          accessType = SPECIFIC | FULL_JURISDICTION
   *                          jurisdictionType = "DISTRICT"
   *
   * SPECIAL UNIT project   → specialUnitId is a valid UUID
   *                          districtAccess is NOT sent / ignored
   *                          accessType stored as "FULL_JURISDICTION" (no district concept)
   *                          jurisdictionType = "SPECIAL_UNIT"
   *                          All department users see this project; no district filtering.
   */
  specialUnitId?: string;
  districtAccess?: AccessRule;
  stageIds: string[];
  hasSuperStructure: boolean;
  superStructure?: SuperStructureBlock[];
  createdById?: string;
};

type UpdateProjectInput = Partial<Omit<CreateProjectInput, "createdById">> & {
  status?: string;
  updatedById?: string;
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * District/City project access rows.
 * SPECIFIC          → one row per district entry  (districtId set, specialUnitId null)
 * FULL_JURISDICTION → one row with districtId = null, specialUnitId = null
 */
function buildDistrictAccessRows(
  projectId: string,
  rule: AccessRule,
  createdById?: string
) {
  if (rule.accessType === "FULL_JURISDICTION") {
    return [
      {
        projectId,
        districtId: null,
        specialUnitId: null,
        createdById: createdById ?? null,
        isActive: true,
      },
    ];
  }

  // SPECIFIC
  const districts = rule.districts ?? [];
  if (districts.length === 0) {
    throw new Error(
      "At least one district or city is required for SPECIFIC access"
    );
  }
  return districts.map((d) => ({
    projectId,
    districtId: d.districtId,
    specialUnitId: null,
    createdById: createdById ?? null,
    isActive: true,
  }));
}

/**
 * Special-unit project: always one FULL_JURISDICTION row.
 * districtId = null  →  no district filtering; all dept users see the project.
 */
function buildSpecialUnitAccessRow(
  projectId: string,
  specialUnitId: string,
  createdById?: string
) {
  return [
    {
      projectId,
      districtId: null,
      specialUnitId,
      createdById: createdById ?? null,
      isActive: true,
    },
  ];
}

async function validateStages(tx: any, stageIds: string[]): Promise<void> {
  const found = await tx.stage.findMany({
    where: { id: { in: stageIds }, isActive: true },
    select: { id: true },
  });
  if (found.length !== stageIds.length) {
    throw new Error("One or more stageIds are invalid");
  }
}

function validateSuperStructureBlocks(blocks: SuperStructureBlock[]): void {
  for (const b of blocks) {
    if (!Array.isArray(b.floors) || b.floors.length === 0) {
      throw new Error(`Floors are required for block "${b.blockName}"`);
    }
    if (b.totalFloors !== b.floors.length) {
      throw new Error(
        `totalFloors (${b.totalFloors}) does not match floors count (${b.floors.length}) for block "${b.blockName}"`
      );
    }
  }
}

async function validateDistrictIds(tx: any, rule: AccessRule): Promise<void> {
  if (rule.accessType !== "SPECIFIC" || !rule.districts?.length) return;

  const ids = rule.districts.map((d) => d.districtId);
  const found = await tx.masterDistrict.findMany({
    where: { id: { in: ids }, isActive: true },
    select: { id: true },
  });

  if (found.length !== ids.length) {
    const foundIds = new Set(found.map((r: any) => r.id));
    const invalid = ids.filter((id) => !foundIds.has(id));
    throw new Error(`Invalid districtId(s): ${invalid.join(", ")}`);
  }
}

// ─────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────

export const createProjectService = async (data: CreateProjectInput) => {
  return prisma.$transaction(async (tx) => {
    // ── 1. Validate department ────────────────────────────────
    const dept = await tx.department.findUnique({
      where: { id: data.departmentId, isActive: true },
    });
    if (!dept) throw new Error("Invalid departmentId");

    const isSpecialUnit = !!data.specialUnitId;

    // ── 2a. Special unit path ─────────────────────────────────
    if (isSpecialUnit) {
      const unit = await tx.specialUnits.findUnique({
        where: { id: data.specialUnitId!, isActive: true },
      });
      if (!unit) throw new Error("Invalid specialUnitId");
    } else {
      // ── 2b. District/city path ────────────────────────────
      if (!data.districtAccess) {
        throw new Error(
          "districtAccess is required when no specialUnitId is provided"
        );
      }
      await validateDistrictIds(tx, data.districtAccess);
    }

    // ── 3. Validate stages ────────────────────────────────────
    await validateStages(tx, data.stageIds);

    // ── 4. Validate createdById ───────────────────────────────
    if (!data.createdById) {
      throw new Error("createdById (the creating user's ID) is required");
    }
    const creatingUser = await tx.user.findUnique({
      where: { id: data.createdById, isActive: true },
    });
    if (!creatingUser) {
      throw new Error(
        `No active user found for createdById "${data.createdById}"`
      );
    }

    // ── 5. Validate super-structure ───────────────────────────
    if (data.hasSuperStructure) {
      if (!data.superStructure || data.superStructure.length === 0) {
        throw new Error(
          "At least one block is required when hasSuperStructure is true"
        );
      }
      validateSuperStructureBlocks(data.superStructure);
    }

    // ── 6. Create project ─────────────────────────────────────
    //
    // jurisdictionType:
    //   SPECIAL_UNIT → specialUnitId provided
    //   DISTRICT     → district/city access
    //
    // accessType (stored on project):
    //   Special unit  → always FULL_JURISDICTION (no district concept)
    //   District SPECIFIC          → SPECIFIC
    //   District FULL_JURISDICTION → FULL_JURISDICTION
    //
    const project = await tx.project.create({
      data: {
        projectName: data.projectName,
        buildingType: data.buildingType,
        location: data.location ?? null,
        departmentId: data.departmentId,
        jurisdictionType: isSpecialUnit ? "SPECIAL_UNIT" : "DISTRICT",
        accessType: isSpecialUnit
          ? "FULL_JURISDICTION"
          : data.districtAccess!.accessType,
        hasSuperStructure: data.hasSuperStructure,
        selectedStages: data.stageIds,
        status: status.AssignedProjects,
        createdByUserId: data.createdById,
        createdById: data.createdById,
      },
    });

    // ── 7. Insert access mapping rows ─────────────────────────
    const accessRows = isSpecialUnit
      ? buildSpecialUnitAccessRow(project.id, data.specialUnitId!, data.createdById)
      : buildDistrictAccessRows(project.id, data.districtAccess!, data.createdById);

    await tx.project_access_mapping.createMany({ data: accessRows });

    // ── 8. Super-structure blocks ─────────────────────────────
    if (data.hasSuperStructure && data.superStructure?.length) {
      await tx.superStructure.createMany({
        data: data.superStructure.map((b) => ({
          projectId: project.id,
          blockName: b.blockName,
          totalFloors: b.totalFloors,
          floors: b.floors,
          isSuperStructure: true,
          createdById: data.createdById ?? null,
        })),
      });
    }

    return project;
  });
};

// ─────────────────────────────────────────────────────────────
// GET ALL PROJECTS
// ─────────────────────────────────────────────────────────────

export const getAllProjectsService = async (query: {
  pageNumber?: string;
  pageSize?: string;
  search?: string;
  status?: string;
  departmentId?: string;
  districtId?: string;
  specialUnitId?: string;
  userId?: string;
}) => {
  const {
    pageNumber,
    pageSize,
    search,
    status,
    departmentId,
    districtId,
    specialUnitId,
    userId,
  } = query;

  if (departmentId && specialUnitId) {
    throw new Error("Provide either departmentId OR specialUnitId, not both");
  }

  const { skip, take } = pageConfig({ pageNumber, pageSize });

  const where: any = { isActive: true };

  if (search) where.projectName = { contains: search, mode: "insensitive" };
  if (status) where.status = status;
  if (departmentId) where.departmentId = departmentId;
  if (userId) where.createdByUserId = userId;

  if (districtId || specialUnitId) {
    where.projectAccessMappings = {
      some: {
        isActive: true,
        ...(districtId && { districtId }),
        ...(specialUnitId && { specialUnitId }),
      },
    };
  }

  const [data, totalRecords] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        department: true,
        projectAccessMappings: {
          where: { isActive: true },
          include: { district: true, specialUnit: true },
        },
        superStructures: { where: { isActive: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.project.count({ where }),
  ]);

  const formattedData = data.map((p) => {
    const isSpecialUnit = p.jurisdictionType === "SPECIAL_UNIT";
    const specialUnitMapping = p.projectAccessMappings.find((m) => !!m.specialUnitId);
    const districtMappings = p.projectAccessMappings.filter((m) => !m.specialUnitId);

    return {
      id: p.id,
      code: p.code,
      projectName: p.projectName,
      buildingType: p.buildingType,
      location: p.location,
      departmentName: p.department?.name ?? null,
      jurisdictionType: p.jurisdictionType,
      accessType: isSpecialUnit ? null : p.accessType,
      hasSuperStructure: p.hasSuperStructure,
      status: p.status,
      totalBlocks: p.superStructures.length,
      totalFloors: p.superStructures.reduce((sum, b) => sum + (b.totalFloors ?? 0), 0),

      // District/city access — only for DISTRICT projects
      districtAccess: isSpecialUnit
        ? null
        : {
            accessType: p.accessType,
            districts: districtMappings
              .filter((m) => m.districtId)
              .map((m) => ({
                districtId: m.districtId,
                districtName: m.district?.name ?? null,
                districtType: m.district?.type ?? null,
              })),
          },

      // Special unit access — only for SPECIAL_UNIT projects
      specialUnitAccess: isSpecialUnit && specialUnitMapping
        ? {
            specialUnitId: specialUnitMapping.specialUnitId ?? null,
            specialUnitName: specialUnitMapping.specialUnit?.name ?? null,
          }
        : null,

      createdAt: p.createdAt,
    };
  });

  return { totalRecords, data: formattedData };
};

// ─────────────────────────────────────────────────────────────
// GET PROJECT BY ID
// ─────────────────────────────────────────────────────────────

export const getProjectByIdService = async (id: string) => {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      department: true,
      projectAccessMappings: {
        where: { isActive: true },
        include: { district: true, specialUnit: true },
      },
      superStructures: { where: { isActive: true } },
      SuperStructureProgress: { where: { isActive: true } },
      projectHistories: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!project || !project.isActive) throw new Error("Project not found");

  const isSpecialUnit = project.jurisdictionType === "SPECIAL_UNIT";
  const specialUnitMapping = project.projectAccessMappings.find((m) => !!m.specialUnitId);
  const districtMappings = project.projectAccessMappings.filter((m) => !m.specialUnitId);

  return {
    id: project.id,
    code: project.code,
    projectName: project.projectName,
    buildingType: project.buildingType,
    location: project.location,
    jurisdictionType: project.jurisdictionType,
    accessType: isSpecialUnit ? null : project.accessType,
    hasSuperStructure: project.hasSuperStructure,
    selectedStages: project.selectedStages,
    status: project.status,

    department: project.department
      ? { id: project.department.id, name: project.department.name }
      : null,

    // Only for DISTRICT projects — includes accessType (SPECIFIC / FULL_JURISDICTION)
    // and the selected districts (empty array when FULL_JURISDICTION)
    districtAccess: isSpecialUnit
      ? null
      : {
          accessType: project.accessType,
          districts: districtMappings
            .filter((m) => m.districtId)
            .map((m) => ({
              districtId: m.districtId,
              districtName: m.district?.name ?? null,
              districtType: m.district?.type ?? null,
            })),
        },

    // Only for SPECIAL_UNIT projects — no accessType, no districts
    specialUnitAccess: isSpecialUnit && specialUnitMapping
      ? {
          specialUnitId: specialUnitMapping.specialUnitId ?? null,
          specialUnitName: specialUnitMapping.specialUnit?.name ?? null,
        }
      : null,

    blocks: project.superStructures.map((b) => {
      const progress = project.SuperStructureProgress.filter(
        (sp) => sp.blockName === b.blockName
      );
      return {
        blockName: b.blockName,
        totalFloors: b.totalFloors,
        floors: b.floors ?? [],
        completedFloors: progress.filter((sp) => sp.status === "COMPLETED").length,
        floorProgress: progress.map((sp) => ({
          floorName: sp.floorName,
          status: sp.status,
        })),
      };
    }),

    recentHistory: project.projectHistories,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
};

// ─────────────────────────────────────────────────────────────
// UPDATE PROJECT
// ─────────────────────────────────────────────────────────────

export const updateProjectService = async (
  id: string,
  data: UpdateProjectInput
) => {
  return prisma.$transaction(async (tx) => {
    // ── 1. Validate project exists ────────────────────────────
    const existing = await tx.project.findUnique({ where: { id } });
    if (!existing || !existing.isActive) {
      throw new Error(`Project with id "${id}" not found`);
    }

    // ── 2. Validate department ────────────────────────────────
    if (data.departmentId) {
      const dept = await tx.department.findUnique({
        where: { id: data.departmentId, isActive: true },
      });
      if (!dept) throw new Error("Invalid departmentId");
    }

    // Resolve whether the resulting project is special-unit or district.
    // • If specialUnitId is explicitly sent → use it (truthy = special unit, null/empty = district)
    // • If specialUnitId is NOT in the payload → inherit from existing record
    const isSpecialUnit =
      data.specialUnitId !== undefined
        ? !!data.specialUnitId
        : existing.jurisdictionType === "SPECIAL_UNIT";

    // ── 3. Validate special unit ──────────────────────────────
    if (data.specialUnitId) {
      const unit = await tx.specialUnits.findUnique({
        where: { id: data.specialUnitId, isActive: true },
      });
      if (!unit) throw new Error("Invalid specialUnitId");
    }

    // ── 4. Validate district IDs (only for district projects) ─
    if (!isSpecialUnit && data.districtAccess) {
      await validateDistrictIds(tx, data.districtAccess);
    }

    // ── 5. Validate stages ────────────────────────────────────
    if (data.stageIds?.length) {
      await validateStages(tx, data.stageIds);
    }

    // ── 6. Validate super-structure ───────────────────────────
    if (data.hasSuperStructure && data.superStructure?.length) {
      validateSuperStructureBlocks(data.superStructure);
    }

    // ── 7. Build update payload ───────────────────────────────
    const updatePayload: any = {
      updatedById: data.updatedById ?? null,
    };

    if (data.projectName !== undefined) updatePayload.projectName = data.projectName;
    if (data.buildingType !== undefined) updatePayload.buildingType = data.buildingType;
    if (data.location !== undefined) updatePayload.location = data.location;
    if (data.departmentId !== undefined) updatePayload.departmentId = data.departmentId;
    if (data.hasSuperStructure !== undefined) updatePayload.hasSuperStructure = data.hasSuperStructure;
    if (data.stageIds !== undefined) updatePayload.selectedStages = data.stageIds;
    if (data.status !== undefined) updatePayload.status = data.status;

    // Jurisdiction / accessType
    if (data.specialUnitId !== undefined) {
      updatePayload.jurisdictionType = data.specialUnitId ? "SPECIAL_UNIT" : "DISTRICT";
    }

    if (isSpecialUnit) {
      // Special-unit projects always store FULL_JURISDICTION
      updatePayload.accessType = "FULL_JURISDICTION";
    } else if (data.districtAccess?.accessType !== undefined) {
      updatePayload.accessType = data.districtAccess.accessType;
    }

    // ── 8. Update project row ─────────────────────────────────
    await tx.project.update({ where: { id }, data: updatePayload });

    // ── 9. Replace access mappings when jurisdiction changes ──
    const shouldReplaceAccess =
      data.specialUnitId !== undefined || data.districtAccess !== undefined;

    if (shouldReplaceAccess) {
      await tx.project_access_mapping.deleteMany({ where: { projectId: id } });

      let accessRows: any[];

      if (isSpecialUnit && data.specialUnitId) {
        accessRows = buildSpecialUnitAccessRow(id, data.specialUnitId, data.updatedById);
      } else if (!isSpecialUnit) {
        const effectiveDistrictAccess: AccessRule = data.districtAccess ?? {
          accessType: "FULL_JURISDICTION",
        };
        accessRows = buildDistrictAccessRows(id, effectiveDistrictAccess, data.updatedById);
      } else {
        accessRows = [];
      }

      if (accessRows.length > 0) {
        await tx.project_access_mapping.createMany({ data: accessRows });
      }
    }

    // ── 10. Replace super-structures ──────────────────────────
    if (data.superStructure !== undefined) {
      await tx.superStructure.deleteMany({ where: { projectId: id } });

      if (data.hasSuperStructure && data.superStructure.length > 0) {
        await tx.superStructure.createMany({
          data: data.superStructure.map((b) => ({
            projectId: id,
            blockName: b.blockName,
            totalFloors: b.totalFloors,
            floors: b.floors,
            isSuperStructure: true,
            createdById: data.updatedById ?? null,
            updatedById: data.updatedById ?? null,
          })),
        });
      }
    }

    // ── 11. Project history ───────────────────────────────────
    await tx.project_history.create({
      data: {
        projectId: id,
        action: "UPDATE",
        oldValue: existing as any,
        newValue: updatePayload,
        changedById: data.updatedById ?? null,
        createdById: data.updatedById ?? null,
      },
    });

    // ── 12. Return updated project ────────────────────────────
    return await tx.project.findUnique({
      where: { id },
      include: {
        department: true,
        projectAccessMappings: {
          where: { isActive: true },
          include: { district: true, specialUnit: true },
        },
        superStructures: { where: { isActive: true } },
      },
    });
  });
};

// ─────────────────────────────────────────────────────────────
// DELETE (soft)
// ─────────────────────────────────────────────────────────────

export const deleteProjectService = async (id: string) => {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.project.findUnique({ where: { id } });
    if (!existing || !existing.isActive) throw new Error("Project not found");

    await tx.project.update({ where: { id }, data: { isActive: false } });
    await tx.superStructure.updateMany({ where: { projectId: id }, data: { isActive: false } });
    await tx.project_access_mapping.updateMany({ where: { projectId: id }, data: { isActive: false } });

    return { message: "Project deleted successfully" };
  });
};

// ─────────────────────────────────────────────────────────────
// GET PROJECTS BY USER
// ─────────────────────────────────────────────────────────────

export const getProjectsByUserService = async ({
  userId,
  pageNumber,
  pageSize,
  search,
}: {
  userId?: string;
  pageNumber?: string;
  pageSize?: string;
  search?: string;
}) => {
  const {
    skip,
    take,
    pageNumber: currentPage,
    pageSize: limit,
  } = pageConfig({ pageNumber, pageSize });

  const where: any = { isActive: true };
  if (userId) where.createdByUserId = userId;
  if (search) where.projectName = { contains: search, mode: "insensitive" };

  const [projects, totalRecords] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        department: true,
        projectAccessMappings: {
          where: { isActive: true },
          include: { district: true, specialUnit: true },
        },
        superStructures: { where: { isActive: true } },
        landSiteInspection: { where: { isActive: true } },
        preConstructionInspections: { where: { isActive: true } },
        foundationProgresses: { where: { isActive: true } },
        foundationQualityChecks: { where: { isActive: true } },
        plinthStages: { where: { isActive: true } },
        interiorsProgress: { where: { isActive: true } },
        interiorsQuality: true,
        exteriorsProgress: { where: { isActive: true } },
        exteriorsQuality: true,
        BuildingInspection: { where: { isActive: true } },
        DevelopmentWork: { where: { isActive: true } },
        TakeoverBuildingInsepction: { where: { isActive: true } },
        TakeoverDevelopmentWork: { where: { isActive: true } },
        SuperStructureProgress: { where: { isActive: true } },
        superStructureQuality: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.project.count({ where }),
  ]);

  function getCompletedStageNames(p: (typeof projects)[0]): string[] {
    const done: string[] = [];
    if (p.landSiteInspection.length > 0) done.push("Land Site Inspection");
    if (p.preConstructionInspections.length > 0) done.push("Pre Construction");
    if (p.foundationProgresses.length > 0 || p.foundationQualityChecks.length > 0) done.push("Foundation");
    if (p.plinthStages.length > 0) done.push("Plinth");
    if (p.SuperStructureProgress.length > 0 || p.superStructureQuality) done.push("Super Structure");
    if (p.interiorsProgress.length > 0 || p.interiorsQuality) done.push("Interiors");
    if (p.exteriorsProgress.length > 0 || p.exteriorsQuality) done.push("Exteriors");
    if (p.BuildingInspection.length > 0) done.push("Building Inspection");
    if (p.DevelopmentWork.length > 0) done.push("Development Work");
    if (p.TakeoverBuildingInsepction.length > 0) done.push("Takeover Building Inspection");
    if (p.TakeoverDevelopmentWork.length > 0) done.push("Takeover Development Work");
    return done;
  }

  const data = projects.map((p) => {
    const isSpecialUnit = p.jurisdictionType === "SPECIAL_UNIT";
    const specialUnitMapping = p.projectAccessMappings.find((m) => !!m.specialUnitId);
    const districtMappings = p.projectAccessMappings.filter((m) => !m.specialUnitId);

    const selectedStageCount = Array.isArray(p.selectedStages)
      ? (p.selectedStages as string[]).length
      : 0;
    const completedStageNames = getCompletedStageNames(p);
    const completedStages = completedStageNames.length;
    const pendingStages = Math.max(0, selectedStageCount - completedStages);

    let projectStatus = "AssignedProjects";
    if (completedStages > 0 && pendingStages > 0) projectStatus = "OngoingProjects";
    if (completedStages >= selectedStageCount && selectedStageCount > 0) projectStatus = "CompletedProjects";

    return {
      id: p.id,
      code: p.code,
      projectName: p.projectName,
      buildingType: p.buildingType,
      location: p.location,
      departmentName: p.department?.name ?? null,
      jurisdictionType: p.jurisdictionType,
      accessType: isSpecialUnit ? null : p.accessType,
      hasSuperStructure: p.hasSuperStructure,

      districtAccess: isSpecialUnit
        ? null
        : {
            accessType: p.accessType,
            districts: districtMappings
              .filter((m) => m.districtId)
              .map((m) => ({
                districtId: m.districtId,
                districtName: m.district?.name ?? null,
                districtType: m.district?.type ?? null,
              })),
          },

      specialUnitAccess: isSpecialUnit && specialUnitMapping
        ? {
            specialUnitId: specialUnitMapping.specialUnitId ?? null,
            specialUnitName: specialUnitMapping.specialUnit?.name ?? null,
          }
        : null,

      selectedStageCount,
      completedStages,
      completedStageNames,
      pendingStages,

      superStructure: p.superStructures.map((b) => ({
        blockName: b.blockName,
        totalFloors: b.totalFloors,
        floors: b.floors ?? [],
        completedFloors: p.SuperStructureProgress.filter(
          (sp) => sp.blockName === b.blockName && sp.status === "COMPLETED"
        ).length,
      })),

      status: projectStatus,
      createdAt: p.createdAt,
    };
  });

  return {
    totalRecords,
    totalPages: Math.ceil(totalRecords / limit),
    currentPage,
    pageSize: limit,
    data,
  };
};

// ─────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────

export const getProjectDashboardService = async (userId?: string) => {
  const where: any = { isActive: true };
  if (userId) where.createdByUserId = userId;

  const projects = await prisma.project.findMany({
    where,
    include: {
      landSiteInspection: { where: { isActive: true } },
      preConstructionInspections: { where: { isActive: true } },
      foundationProgresses: { where: { isActive: true } },
      foundationQualityChecks: { where: { isActive: true } },
      plinthStages: { where: { isActive: true } },
      interiorsProgress: { where: { isActive: true } },
      interiorsQuality: true,
      exteriorsProgress: { where: { isActive: true } },
      exteriorsQuality: true,
      BuildingInspection: { where: { isActive: true } },
      DevelopmentWork: { where: { isActive: true } },
      TakeoverBuildingInsepction: { where: { isActive: true } },
      TakeoverDevelopmentWork: { where: { isActive: true } },
      SuperStructureProgress: { where: { isActive: true } },
      superStructureQuality: true,
    },
  });

  let assignedProjects = 0;
  let ongoingProjects = 0;
  let completedProjects = 0;
  let totalInspections = 0;
  let completedInspections = 0;
  let pendingInspections = 0;

  for (const p of projects) {
    const selectedStageCount = Array.isArray(p.selectedStages)
      ? (p.selectedStages as string[]).length
      : 0;

    const done: string[] = [];
    if (p.landSiteInspection.length > 0) done.push("Land Site Inspection");
    if (p.preConstructionInspections.length > 0) done.push("Pre Construction");
    if (p.foundationProgresses.length > 0 || p.foundationQualityChecks.length > 0) done.push("Foundation");
    if (p.plinthStages.length > 0) done.push("Plinth");
    if (p.SuperStructureProgress.length > 0 || p.superStructureQuality) done.push("Super Structure");
    if (p.interiorsProgress.length > 0 || p.interiorsQuality) done.push("Interiors");
    if (p.exteriorsProgress.length > 0 || p.exteriorsQuality) done.push("Exteriors");
    if (p.BuildingInspection.length > 0) done.push("Building Inspection");
    if (p.DevelopmentWork.length > 0) done.push("Development Work");
    if (p.TakeoverBuildingInsepction.length > 0) done.push("Takeover Building Inspection");
    if (p.TakeoverDevelopmentWork.length > 0) done.push("Takeover Development Work");

    const doneCount = done.length;
    const pendingCount = Math.max(0, selectedStageCount - doneCount);

    totalInspections += selectedStageCount;
    completedInspections += doneCount;
    pendingInspections += pendingCount;

    if (doneCount === 0) assignedProjects++;
    else if (doneCount > 0 && pendingCount > 0) ongoingProjects++;
    else completedProjects++;
  }

  return {
    totalProjects: projects.length,
    assignedProjects,
    ongoingProjects,
    completedProjects,
    pendingProjects: assignedProjects + ongoingProjects,
    totalInspections,
    completedInspections,
    pendingInspections,
  };
};