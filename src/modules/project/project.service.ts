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
  floors: string[]; // floor names e.g. ["Ground", "1st", "2nd"]
};

type CreateProjectInput = {
  projectName: string;
  buildingType: "OFFICE" | "RESIDENCY" | "OTHERS";
  location?: string;
  departmentId: string;
  districtAccess: AccessRule;
  specialUnitId?: string;
  specialUnitAccess?: AccessRule;
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
 * Build project_access_mapping rows from an AccessRule.
 *
 * SPECIFIC          → one row per district entry
 * FULL_JURISDICTION → one row with districtId = null (means "all")
 */
function buildAccessMappingRows(
  projectId: string,
  rule: AccessRule,
  specialUnitId: string | null,
  createdById?: string
) {
  const rows: any[] = [];

  if (rule.accessType === "FULL_JURISDICTION") {
    rows.push({
      projectId,
      districtId: null,
      specialUnitId,
      createdById: createdById ?? null,
      isActive: true,
    });
  } else {
    // SPECIFIC — one row per district/city
    const districts = rule.districts ?? [];
    if (districts.length === 0) {
      throw new Error(
        "At least one district or city is required for SPECIFIC access"
      );
    }
    for (const d of districts) {
      rows.push({
        projectId,
        districtId: d.districtId,
        specialUnitId,
        createdById: createdById ?? null,
        isActive: true,
      });
    }
  }

  return rows;
}

/**
 * Validate that all stageIds exist in the DB.
 */
async function validateStages(tx: any, stageIds: string[]): Promise<void> {
  const found = await tx.stage.findMany({
    where: { id: { in: stageIds }, isActive: true },
    select: { id: true },
  });
  if (found.length !== stageIds.length) {
    throw new Error("One or more stageIds are invalid");
  }
}

/**
 * Validate super-structure blocks: totalFloors must match floors.length.
 */
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

// ─────────────────────────────────────────────────────────────
// ✅ NEW: Validate that all districtIds in an AccessRule exist
//         in master_districts before inserting access mappings.
//         Gives a clean 400 error instead of a raw FK violation.
// ─────────────────────────────────────────────────────────────
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

    // ── 2. Validate special unit (if provided) ────────────────
    if (data.specialUnitId) {
      const unit = await tx.specialUnits.findUnique({
        where: { id: data.specialUnitId, isActive: true },
      });
      if (!unit) throw new Error("Invalid specialUnitId");
    }

    // ── 2b. ✅ Validate district IDs exist in master_districts ─
    await validateDistrictIds(tx, data.districtAccess);
    if (data.specialUnitAccess) {
      await validateDistrictIds(tx, data.specialUnitAccess);
    }

    // ── 3. Validate stages ────────────────────────────────────
    await validateStages(tx, data.stageIds);

    // ── 4. Validate createdByUserId (required FK) ─────────────
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

    // ── 5. Validate super-structure blocks ────────────────────
    if (data.hasSuperStructure) {
      if (!data.superStructure || data.superStructure.length === 0) {
        throw new Error(
          "At least one block is required when hasSuperStructure is true"
        );
      }
      validateSuperStructureBlocks(data.superStructure);
    }

    // ── 6. Create project ─────────────────────────────────────
    const project = await tx.project.create({
      data: {
        projectName: data.projectName,
        buildingType: data.buildingType,
        location: data.location ?? null,
        departmentId: data.departmentId,
        jurisdictionType: data.specialUnitId ? "SPECIAL_UNIT" : "DISTRICT",
        accessType:
          data.districtAccess.accessType === "FULL_JURISDICTION"
            ? "FULL_JURISDICTION"
            : "SPECIFIC",
        hasSuperStructure: data.hasSuperStructure,
        selectedStages: data.stageIds,
        status: status.AssignedProjects,
        createdByUserId: data.createdById, // validated above — always a real user
        createdById: data.createdById,
      },
    });

    // ── 7. Build and insert access mapping rows ───────────────
    // 7a. District/city access (for all departments)
    const districtRows = buildAccessMappingRows(
      project.id,
      data.districtAccess,
      null, // no special unit
      data.createdById
    );

    // 7b. Special unit access (police only, if provided)
    const specialUnitRows =
      data.specialUnitId && data.specialUnitAccess
        ? buildAccessMappingRows(
            project.id,
            data.specialUnitAccess,
            data.specialUnitId,
            data.createdById
          )
        : [];

    await tx.project_access_mapping.createMany({
      data: [...districtRows, ...specialUnitRows],
    });

    // ── 8. Create super-structure blocks ──────────────────────
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

  if (search) {
    where.projectName = { contains: search, mode: "insensitive" };
  }
  if (status) where.status = status;
  if (departmentId) where.departmentId = departmentId;
  if (userId) where.createdByUserId = userId;

  // Filter by district or special unit via access mappings
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
          include: {
            district: true,
            specialUnit: true,
          },
        },
        superStructures: {
          where: { isActive: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.project.count({ where }),
  ]);

  const formattedData = data.map((p) => ({
    id: p.id,
    code: p.code,
    projectName: p.projectName,
    buildingType: p.buildingType,
    location: p.location,
    departmentName: p.department?.name ?? null,
    jurisdictionType: p.jurisdictionType,
    accessType: p.accessType,
    hasSuperStructure: p.hasSuperStructure,
    status: p.status,
    totalBlocks: p.superStructures.length,
    totalFloors: p.superStructures.reduce(
      (sum, b) => sum + (b.totalFloors ?? 0),
      0
    ),
    accessMappings: p.projectAccessMappings.map((m) => ({
      districtName: m.district?.name ?? null,
      districtType: m.district?.type ?? null,
      specialUnitName: m.specialUnit?.name ?? null,
    })),
    createdAt: p.createdAt,
  }));

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
        include: {
          district: true,
          specialUnit: true,
        },
      },
      superStructures: {
        where: { isActive: true },
      },
      SuperStructureProgress: {
        where: { isActive: true },
      },
      projectHistories: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!project || !project.isActive) {
    throw new Error("Project not found");
  }

  // Separate district-only rows and special-unit rows
  const districtMappings = project.projectAccessMappings.filter(
    (m) => !m.specialUnitId
  );
  const specialUnitMappings = project.projectAccessMappings.filter(
    (m) => !!m.specialUnitId
  );

  return {
    id: project.id,
    code: project.code,
    projectName: project.projectName,
    buildingType: project.buildingType,
    location: project.location,
    jurisdictionType: project.jurisdictionType,
    accessType: project.accessType,
    hasSuperStructure: project.hasSuperStructure,
    selectedStages: project.selectedStages,
    status: project.status,

    department: project.department
      ? { id: project.department.id, name: project.department.name }
      : null,

    districtAccess: {
      accessType: project.accessType,
      districts: districtMappings
        .filter((m) => m.districtId)
        .map((m) => ({
          districtId: m.districtId,
          districtName: m.district?.name ?? null,
          districtType: m.district?.type ?? null,
        })),
    },

    specialUnitAccess:
      specialUnitMappings.length > 0
        ? {
            specialUnitId: specialUnitMappings[0].specialUnitId ?? null,
            specialUnitName: specialUnitMappings[0].specialUnit?.name ?? null,
            accessType: project.accessType,
            districts: specialUnitMappings
              .filter((m) => m.districtId)
              .map((m) => ({
                districtId: m.districtId,
                districtName: m.district?.name ?? null,
                districtType: m.district?.type ?? null,
              })),
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
        completedFloors: progress.filter((sp) => sp.status === "COMPLETED")
          .length,
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
    // ─────────────────────────────────────────────
    // 1. Validate project
    // ─────────────────────────────────────────────
    const existing = await tx.project.findUnique({
      where: { id },
    });

    if (!existing || !existing.isActive) {
      throw new Error(`Project with id "${id}" not found`);
    }

    // ─────────────────────────────────────────────
    // 2. Validate department
    // ─────────────────────────────────────────────
    if (data.departmentId) {
      const dept = await tx.department.findUnique({
        where: {
          id: data.departmentId,
          isActive: true,
        },
      });

      if (!dept) {
        throw new Error("Invalid departmentId");
      }
    }

    // ─────────────────────────────────────────────
    // 3. Validate special unit
    // ─────────────────────────────────────────────
    if (data.specialUnitId) {
      const unit = await tx.specialUnits.findUnique({
        where: {
          id: data.specialUnitId,
          isActive: true,
        },
      });

      if (!unit) {
        throw new Error("Invalid specialUnitId");
      }
    }

    // ─────────────────────────────────────────────
    // 4. Validate district access
    // ─────────────────────────────────────────────
    if (data.districtAccess) {
      await validateDistrictIds(tx, data.districtAccess);
    }

    if (data.specialUnitAccess) {
      await validateDistrictIds(tx, data.specialUnitAccess);
    }

    // ─────────────────────────────────────────────
    // 5. Validate stages
    // ─────────────────────────────────────────────
    if (data.stageIds?.length) {
      await validateStages(tx, data.stageIds);
    }

    // ─────────────────────────────────────────────
    // 6. Validate super structure
    // ─────────────────────────────────────────────
    if (data.hasSuperStructure && data.superStructure?.length) {
      validateSuperStructureBlocks(data.superStructure);
    }

    // ─────────────────────────────────────────────
    // 7. Build update payload
    // ─────────────────────────────────────────────
    const updatePayload: any = {
      updatedById: data.updatedById ?? null,
    };

    if (data.projectName !== undefined) {
      updatePayload.projectName = data.projectName;
    }

    if (data.buildingType !== undefined) {
      updatePayload.buildingType = data.buildingType;
    }

    if (data.location !== undefined) {
      updatePayload.location = data.location;
    }

    if (data.departmentId !== undefined) {
      updatePayload.departmentId = data.departmentId;
    }

    if (data.hasSuperStructure !== undefined) {
      updatePayload.hasSuperStructure = data.hasSuperStructure;
    }

    if (data.stageIds !== undefined) {
      updatePayload.selectedStages = data.stageIds;
    }

    if (data.status !== undefined) {
      updatePayload.status = data.status;
    }

    // jurisdiction type
    if (data.specialUnitId !== undefined) {
      updatePayload.jurisdictionType = data.specialUnitId
        ? "SPECIAL_UNIT"
        : "DISTRICT";
    }

    // access type
    if (data.districtAccess?.accessType !== undefined) {
      updatePayload.accessType =
        data.districtAccess.accessType === "FULL_JURISDICTION"
          ? "FULL_JURISDICTION"
          : "SPECIFIC";
    }

    // ─────────────────────────────────────────────
    // 8. Update project
    // ─────────────────────────────────────────────
    const project = await tx.project.update({
      where: { id },
      data: updatePayload,
    });

    // ─────────────────────────────────────────────
    // 9. Replace access mappings
    // ─────────────────────────────────────────────
    if (
      data.districtAccess !== undefined ||
      data.specialUnitId !== undefined
    ) {
      // HARD DELETE old mappings
      await tx.project_access_mapping.deleteMany({
        where: {
          projectId: id,
        },
      });

      const effectiveDistrictAccess =
        data.districtAccess ??
        ({
          accessType: "FULL_JURISDICTION",
        } as AccessRule);

      // district rows
      const districtRows = buildAccessMappingRows(
        id,
        effectiveDistrictAccess,
        null,
        data.updatedById
      );

      // special unit rows
      const specialUnitRows =
        data.specialUnitId && data.specialUnitAccess
          ? buildAccessMappingRows(
              id,
              data.specialUnitAccess,
              data.specialUnitId,
              data.updatedById
            )
          : [];

      await tx.project_access_mapping.createMany({
        data: [...districtRows, ...specialUnitRows],
      });
    }

    // ─────────────────────────────────────────────
    // 10. Replace super structures
    // ─────────────────────────────────────────────
    if (data.superStructure !== undefined) {
      // HARD DELETE old blocks
      await tx.superStructure.deleteMany({
        where: {
          projectId: id,
        },
      });

      // recreate
      if (
        data.hasSuperStructure &&
        data.superStructure.length > 0
      ) {
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

    // ─────────────────────────────────────────────
    // 11. Project history
    // ─────────────────────────────────────────────
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

    // ─────────────────────────────────────────────
    // 12. Return updated project
    // ─────────────────────────────────────────────
    return await tx.project.findUnique({
      where: { id },
      include: {
        department: true,
        projectAccessMappings: {
          where: { isActive: true },
          include: {
            district: true,
            specialUnit: true,
          },
        },
        superStructures: {
          where: { isActive: true },
        },
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
    if (!existing || !existing.isActive) {
      throw new Error("Project not found");
    }

    await tx.project.update({
      where: { id },
      data: { isActive: false },
    });

    await tx.superStructure.updateMany({
      where: { projectId: id },
      data: { isActive: false },
    });

    await tx.project_access_mapping.updateMany({
      where: { projectId: id },
      data: { isActive: false },
    });

    return { message: "Project deleted successfully" };
  });
};

// ─────────────────────────────────────────────────────────────
// GET PROJECTS BY USER (with stage completion tracking)
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
  if (search) {
    where.projectName = { contains: search, mode: "insensitive" };
  }

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

  // ── Stage name → DB relation mapping ─────────────────────────
  function getCompletedStageNames(p: (typeof projects)[0]): string[] {
    const done: string[] = [];
    if (p.landSiteInspection.length > 0) done.push("Land Site Inspection");
    if (p.preConstructionInspections.length > 0) done.push("Pre Construction");
    if (
      p.foundationProgresses.length > 0 ||
      p.foundationQualityChecks.length > 0
    )
      done.push("Foundation");
    if (p.plinthStages.length > 0) done.push("Plinth");
    if (p.SuperStructureProgress.length > 0 || p.superStructureQuality)
      done.push("Super Structure");
    if (p.interiorsProgress.length > 0 || p.interiorsQuality)
      done.push("Interiors");
    if (p.exteriorsProgress.length > 0 || p.exteriorsQuality)
      done.push("Exteriors");
    if (p.BuildingInspection.length > 0) done.push("Building Inspection");
    if (p.DevelopmentWork.length > 0) done.push("Development Work");
    if (p.TakeoverBuildingInsepction.length > 0)
      done.push("Takeover Building Inspection");
    if (p.TakeoverDevelopmentWork.length > 0)
      done.push("Takeover Development Work");
    return done;
  }

  const data = projects.map((p) => {
    const selectedStageCount = Array.isArray(p.selectedStages)
      ? (p.selectedStages as string[]).length
      : 0;

    const completedStageNames = getCompletedStageNames(p);
    const completedStages = completedStageNames.length;
    const pendingStages = Math.max(0, selectedStageCount - completedStages);

    let projectStatus = "AssignedProjects";
    if (completedStages > 0 && pendingStages > 0)
      projectStatus = "OngoingProjects";
    if (completedStages >= selectedStageCount && selectedStageCount > 0)
      projectStatus = "CompletedProjects";

    // District / special unit access summary
    const districtMappings = p.projectAccessMappings.filter(
      (m) => !m.specialUnitId
    );
    const specialUnitMappings = p.projectAccessMappings.filter(
      (m) => !!m.specialUnitId
    );

    return {
      id: p.id,
      code: p.code,
      projectName: p.projectName,
      buildingType: p.buildingType,
      location: p.location,
      departmentName: p.department?.name ?? null,
      jurisdictionType: p.jurisdictionType,
      accessType: p.accessType,
      hasSuperStructure: p.hasSuperStructure,

      districtAccess: {
        accessType: p.accessType,
        districts: districtMappings
          .filter((m) => m.districtId)
          .map((m) => ({
            districtId: m.districtId,
            districtName: m.district?.name ?? null,
            districtType: m.district?.type ?? null,
          })),
      },

      specialUnitAccess:
        specialUnitMappings.length > 0
          ? {
              specialUnitId: specialUnitMappings[0].specialUnitId ?? null,
              specialUnitName:
                specialUnitMappings[0].specialUnit?.name ?? null,
              districts: specialUnitMappings
                .filter((m) => m.districtId)
                .map((m) => ({
                  districtId: m.districtId,
                  districtName: m.district?.name ?? null,
                  districtType: m.district?.type ?? null,
                })),
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
    if (
      p.foundationProgresses.length > 0 ||
      p.foundationQualityChecks.length > 0
    )
      done.push("Foundation");
    if (p.plinthStages.length > 0) done.push("Plinth");
    if (p.SuperStructureProgress.length > 0 || p.superStructureQuality)
      done.push("Super Structure");
    if (p.interiorsProgress.length > 0 || p.interiorsQuality)
      done.push("Interiors");
    if (p.exteriorsProgress.length > 0 || p.exteriorsQuality)
      done.push("Exteriors");
    if (p.BuildingInspection.length > 0) done.push("Building Inspection");
    if (p.DevelopmentWork.length > 0) done.push("Development Work");
    if (p.TakeoverBuildingInsepction.length > 0)
      done.push("Takeover Building Inspection");
    if (p.TakeoverDevelopmentWork.length > 0)
      done.push("Takeover Development Work");

    const doneCount = done.length;
    const pendingCount = Math.max(0, selectedStageCount - doneCount);

    totalInspections += selectedStageCount;
    completedInspections += doneCount;
    pendingInspections += pendingCount;

    if (doneCount === 0) {
      assignedProjects++;
    } else if (doneCount > 0 && pendingCount > 0) {
      ongoingProjects++;
    } else {
      completedProjects++;
    }
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