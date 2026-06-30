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
  // NEW: top-level district/city selected from frontend before department
  selectedDistrictId?: string;
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
  changeReason?: string;
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

/**
 * Creates project_block + project_floor rows for a project.
 * Called inside a transaction.
 */
async function createBlocksAndFloors(
  tx: any,
  projectId: string,
  blocks: SuperStructureBlock[]
): Promise<void> {
  for (const b of blocks) {
    const block = await tx.project_block.create({
      data: {
        projectId,
        blockName: b.blockName,
        totalFloors: b.totalFloors,
      },
    });

    await tx.project_floor.createMany({
      data: b.floors.map((floorName, index) => ({
        projectId,
        blockId: block.id,
        floorName,
        floorNumber: index + 1,
      })),
    });
  }
}

/**
 * Incrementally upserts blocks and floors for a project during an update.
 *
 * Rules:
 *  - If a block with the same blockName already exists → keep it, only add missing floors.
 *  - If a block does not exist → create it with all its floors.
 *  - Never delete any existing block, floor, progress, or quality record.
 *
 * Called inside a transaction.
 */
async function upsertBlocksAndFloors(
  tx: any,
  projectId: string,
  incomingBlocks: SuperStructureBlock[]
): Promise<void> {
  for (const incomingBlock of incomingBlocks) {
    // ── 1. Look up existing block by name ──────────────────────
    const existingBlock = await tx.project_block.findUnique({
      where: {
        projectId_blockName: {
          projectId,
          blockName: incomingBlock.blockName,
        },
      },
      include: {
        floors: {
          select: { floorName: true, floorNumber: true },
        },
      },
    });

    if (existingBlock) {
      // ── 2a. Block exists: only add floors that are missing ───
      const existingFloorNames = new Set(
        existingBlock.floors.map((f: { floorName: string }) => f.floorName)
      );

      // Determine the next floorNumber for new floors
      const maxExistingFloorNumber = existingBlock.floors.reduce(
        (max: number, f: { floorNumber: number }) =>
          f.floorNumber > max ? f.floorNumber : max,
        0
      );

      const newFloors = incomingBlock.floors
        .filter((floorName) => !existingFloorNames.has(floorName))
        .map((floorName, index) => ({
          projectId,
          blockId: existingBlock.id,
          floorName,
          floorNumber: maxExistingFloorNumber + index + 1,
        }));

      if (newFloors.length > 0) {
        await tx.project_floor.createMany({ data: newFloors });

        // Update totalFloors to reflect the new total
        const updatedTotalFloors =
          existingBlock.floors.length + newFloors.length;
        await tx.project_block.update({
          where: { id: existingBlock.id },
          data: { totalFloors: updatedTotalFloors },
        });
      }
    } else {
      // ── 2b. Block does not exist: create block + all floors ──
      const newBlock = await tx.project_block.create({
        data: {
          projectId,
          blockName: incomingBlock.blockName,
          totalFloors: incomingBlock.totalFloors,
        },
      });

      await tx.project_floor.createMany({
        data: incomingBlock.floors.map((floorName, index) => ({
          projectId,
          blockId: newBlock.id,
          floorName,
          floorNumber: index + 1,
        })),
      });
    }
  }
}

/**
 * Detects whether any access (department / district / city / special unit /
 * project_access_mapping) has been removed compared to the current project state.
 *
 * Returns true when at least one item was removed and remarks are therefore
 * mandatory.
 */
async function detectAccessRemoval(
  tx: any,
  projectId: string,
  data: UpdateProjectInput,
  existing: any
): Promise<boolean> {
  // ── Department changed ────────────────────────────────────
  if (
    data.departmentId !== undefined &&
    data.departmentId !== existing.departmentId
  ) {
    return true;
  }

  // ── Special-unit removed (had one, now being cleared) ─────
  const wasSpecialUnit = existing.jurisdictionType === "SPECIAL_UNIT";
  const specialUnitBeingRemoved =
    data.specialUnitId !== undefined &&
    !data.specialUnitId &&
    wasSpecialUnit;

  if (specialUnitBeingRemoved) return true;

  // ── Special-unit swapped for a different one ──────────────
  if (wasSpecialUnit && data.specialUnitId !== undefined && data.specialUnitId) {
    const existingMapping = await tx.project_access_mapping.findFirst({
      where: { projectId, isActive: true, specialUnitId: { not: null } },
      select: { specialUnitId: true },
    });
    if (
      existingMapping &&
      existingMapping.specialUnitId !== data.specialUnitId
    ) {
      return true;
    }
  }

  // ── District/city access changed ──────────────────────────
  if (!wasSpecialUnit && data.districtAccess !== undefined) {
    const existingMappings: { districtId: string }[] =
      await tx.project_access_mapping.findMany({
        where: { projectId, isActive: true, districtId: { not: null } },
        select: { districtId: true },
      });

    const existingDistrictIds = new Set<string>(
      existingMappings.map((m) => m.districtId)
    );

    // FULL_JURISDICTION replacing SPECIFIC removes all districts
    if (
      existing.accessType === "SPECIFIC" &&
      data.districtAccess.accessType === "FULL_JURISDICTION"
    ) {
      if (existingDistrictIds.size > 0) return true;
    }

    // SPECIFIC replacing SPECIFIC: check for removed entries
    if (data.districtAccess.accessType === "SPECIFIC") {
      const incomingDistrictIds = new Set<string>(
        (data.districtAccess.districts ?? []).map((d) => d.districtId)
      );
      for (const existingId of existingDistrictIds) {
        if (!incomingDistrictIds.has(existingId)) return true;
      }
    }
  }

  return false;
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

    // ── 3. Validate selectedDistrictId (if provided) ──────────
    if (data.selectedDistrictId) {
      const selectedDistrict = await tx.masterDistrict.findUnique({
        where: { id: data.selectedDistrictId, isActive: true },
      });
      if (!selectedDistrict) {
        throw new Error("Invalid selectedDistrictId");
      }
    }

    // ── 4. Validate stages ────────────────────────────────────
    await validateStages(tx, data.stageIds);

    // ── 5. Validate createdById ───────────────────────────────
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

    // ── 6. Super-structure validation ─────────────────────────
    //
    // FIXED LOGIC:
    //   hasSuperStructure=true + "Super Structure" stage selected
    //     → blocks/floors are REQUIRED (must have ≥ 1 block)
    //   hasSuperStructure=true + "Super Structure" stage NOT selected
    //     → blocks/floors are OPTIONAL (allow empty superStructure)
    //   hasSuperStructure=false
    //     → blocks/floors are ignored
    //
    const stageRecords = await tx.stage.findMany({
      where: { id: { in: data.stageIds }, isActive: true },
      select: { id: true, name: true },
    });
    const stageNames = stageRecords.map((s: { name: string }) => s.name);
    const hasSuperStructureStage = stageNames.includes("Super Structure");

    if (data.hasSuperStructure) {
      if (hasSuperStructureStage) {
        // Both true → blocks are mandatory
        if (!data.superStructure || data.superStructure.length === 0) {
          throw new Error(
            "At least one block is required when both hasSuperStructure is true and Super Structure stage is selected"
          );
        }
        validateSuperStructureBlocks(data.superStructure);
      } else {
        // hasSuperStructure=true but stage not selected → blocks optional, validate shape if provided
        if (data.superStructure && data.superStructure.length > 0) {
          validateSuperStructureBlocks(data.superStructure);
        }
      }
    }

    // ── 7. Create project ─────────────────────────────────────
    const project = await tx.project.create({
      data: {
        projectName: data.projectName,
        buildingType: data.buildingType,
        location: data.location ?? null,
        selectedDistrictId: data.selectedDistrictId ?? null,
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

    // ── 8. Insert access mapping rows ─────────────────────────
    const accessRows = isSpecialUnit
      ? buildSpecialUnitAccessRow(project.id, data.specialUnitId!, data.createdById)
      : buildDistrictAccessRows(project.id, data.districtAccess!, data.createdById);

    await tx.project_access_mapping.createMany({ data: accessRows });

    // ── 9. Super-structure blocks & floors (relational tables) ─
    if (
      data.hasSuperStructure &&
      hasSuperStructureStage &&
      data.superStructure?.length
    ) {
      await createBlocksAndFloors(tx, project.id, data.superStructure);
    } else if (
      data.hasSuperStructure &&
      !hasSuperStructureStage &&
      data.superStructure?.length
    ) {
      // Blocks provided even without the stage → still persist them
      await createBlocksAndFloors(tx, project.id, data.superStructure);
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
        selectedDistrict: true,
        projectAccessMappings: {
          where: { isActive: true },
          include: { district: true, specialUnit: true },
        },
        blocks: {
          include: {
            floors: {
              orderBy: { floorNumber: "asc" },
            },
          },
        },
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
      // NEW: selectedDistrict info
      selectedDistrictId: p.selectedDistrictId ?? null,
      selectedDistrictName: (p as any).selectedDistrict?.name ?? null,
      selectedDistrictType: (p as any).selectedDistrict?.type ?? null,
      jurisdictionType: p.jurisdictionType,
      accessType: isSpecialUnit ? null : p.accessType,
      hasSuperStructure: p.hasSuperStructure,
      status: p.status,
      totalBlocks: p.blocks.length,
      totalFloors: p.blocks.reduce((sum, b) => sum + (b.totalFloors ?? 0), 0),

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

      superStructure: p.blocks.map((b) => ({
        blockId: b.id,
        blockName: b.blockName,
        totalFloors: b.totalFloors,
        floors: b.floors.map((f) => ({
          floorId: f.id,
          floorName: f.floorName,
          floorNumber: f.floorNumber,
        })),
      })),

      createdAt: p.createdAt,
    };
  });

  return { totalRecords, data: formattedData };
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

    // ── 3. Validate selectedDistrictId (if provided) ──────────
    if (data.selectedDistrictId) {
      const selectedDistrict = await tx.masterDistrict.findUnique({
        where: { id: data.selectedDistrictId, isActive: true },
      });
      if (!selectedDistrict) {
        throw new Error("Invalid selectedDistrictId");
      }
    }

    // ── 4. Detect access removal and enforce changeReason ─────
    //
    // If any department / district / city / special unit / access mapping
    // is being removed, `changeReason` is mandatory.
    const accessWasRemoved = await detectAccessRemoval(tx, id, data, existing);
    if (accessWasRemoved) {
      if (!data.changeReason || data.changeReason.trim() === "") {
        throw new Error(
          "Reason is required when removing department/district/city/special unit access."
        );
      }
    }

    // Resolve whether the resulting project is special-unit or district.
    const isSpecialUnit =
      data.specialUnitId !== undefined
        ? !!data.specialUnitId
        : existing.jurisdictionType === "SPECIAL_UNIT";

    // ── 5. Validate special unit ──────────────────────────────
    if (data.specialUnitId) {
      const unit = await tx.specialUnits.findUnique({
        where: { id: data.specialUnitId, isActive: true },
      });
      if (!unit) throw new Error("Invalid specialUnitId");
    }

    // ── 6. Validate district IDs (only for district projects) ─
    if (!isSpecialUnit && data.districtAccess) {
      await validateDistrictIds(tx, data.districtAccess);
    }

    // ── 7. Validate stages ────────────────────────────────────
    if (data.stageIds?.length) {
      await validateStages(tx, data.stageIds);
    }

    // ── 8. Merge selectedStages (never remove existing stages) ─
    //
    // The incoming stageIds are merged with the existing selectedStages so
    // that previously completed stage records are never orphaned.
    let mergedStageIds: string[] | undefined;
    if (data.stageIds !== undefined) {
      const existingStageIds: string[] = Array.isArray(existing.selectedStages)
        ? (existing.selectedStages as string[])
        : [];
      // Union: keep all existing, add any new ones
      const merged = [...existingStageIds];
      for (const sid of data.stageIds) {
        if (!merged.includes(sid)) merged.push(sid);
      }
      mergedStageIds = merged;
    }

    // ── 9. Super-structure consistency validation ─────────────
    //
    // FIXED LOGIC:
    //   BOTH hasSuperStructure=true AND "Super Structure" stage selected
    //     → blocks/floors are REQUIRED
    //   hasSuperStructure=true alone (stage not selected)
    //     → blocks/floors are OPTIONAL
    //   hasSuperStructure=false
    //     → blocks/floors not applicable
    //
    const effectiveHasSuperStructure =
      data.hasSuperStructure !== undefined
        ? data.hasSuperStructure
        : existing.hasSuperStructure;

    const effectiveStageIds = mergedStageIds ?? (
      Array.isArray(existing.selectedStages)
        ? (existing.selectedStages as string[])
        : []
    );

    // Fetch the names of all stages in the merged set
    const stageRecords = await tx.stage.findMany({
      where: { id: { in: effectiveStageIds }, isActive: true },
      select: { id: true, name: true },
    });
    const effectiveStageNames = stageRecords.map((s: { name: string }) => s.name);
    const hasSuperStructureStage = effectiveStageNames.includes("Super Structure");

    // Rule: blocks provided but neither condition met
    const incomingHasBlocks =
      data.superStructure !== undefined && data.superStructure.length > 0;
    if (incomingHasBlocks && !effectiveHasSuperStructure) {
      throw new Error(
        "Blocks and floors can be created only when hasSuperStructure is true."
      );
    }

    // Rule: BOTH conditions met → at least one block required
    if (effectiveHasSuperStructure && hasSuperStructureStage) {
      const existingBlockCount = await tx.project_block.count({
        where: { projectId: id },
      });
      const totalBlocksAfterUpdate =
        existingBlockCount + (data.superStructure?.length ?? 0);
      if (totalBlocksAfterUpdate === 0) {
        throw new Error(
          "At least one block is required when both hasSuperStructure is true and Super Structure stage is selected."
        );
      }
    }

    // Validate incoming block/floor structure shape
    if (data.superStructure?.length) {
      validateSuperStructureBlocks(data.superStructure);
    }

    // ── 10. Build update payload ──────────────────────────────
    const updatePayload: any = {
      updatedById: data.updatedById ?? null,
    };

    if (data.projectName !== undefined) updatePayload.projectName = data.projectName;
    if (data.buildingType !== undefined) updatePayload.buildingType = data.buildingType;
    if (data.location !== undefined) updatePayload.location = data.location;
    if (data.departmentId !== undefined) updatePayload.departmentId = data.departmentId;
    if (data.hasSuperStructure !== undefined) updatePayload.hasSuperStructure = data.hasSuperStructure;
    if (data.status !== undefined) updatePayload.status = data.status;
    // NEW: persist selectedDistrictId update
    if (data.selectedDistrictId !== undefined) updatePayload.selectedDistrictId = data.selectedDistrictId ?? null;

    // Always write the merged stage list (never a subset of the original)
    if (mergedStageIds !== undefined) {
      updatePayload.selectedStages = mergedStageIds;
    }

    // Jurisdiction / accessType
    if (data.specialUnitId !== undefined) {
      updatePayload.jurisdictionType = data.specialUnitId ? "SPECIAL_UNIT" : "DISTRICT";
    }

    if (isSpecialUnit) {
      updatePayload.accessType = "FULL_JURISDICTION";
    } else if (data.districtAccess?.accessType !== undefined) {
      updatePayload.accessType = data.districtAccess.accessType;
    }

    // ── 11. Update project row ────────────────────────────────
    await tx.project.update({ where: { id }, data: updatePayload });

    // ── 12. Replace access mappings when jurisdiction changes ──
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

    // ── 13. Incrementally upsert blocks and floors ────────────
    //
    // KEY CHANGE: We no longer delete any existing blocks, floors, progress,
    // or quality records. Instead we only INSERT what is missing.
    //
    //  • Existing block with same blockName → keep it, add missing floors only.
    //  • New block name → create block + all its floors.
    //  • No existing records are touched or deleted.
    if (data.superStructure !== undefined && data.superStructure.length > 0) {
      await upsertBlocksAndFloors(tx, id, data.superStructure);
    }

    // ── 14. Project history ───────────────────────────────────
    await tx.project_history.create({
      data: {
        projectId: id,
        action: "UPDATE",
        oldValue: existing as any,
        newValue: updatePayload,
        remarks: data.changeReason ?? null,
        changedById: data.updatedById ?? null,
        createdById: data.updatedById ?? null,
      },
    });

    // ── 15. Audit log for access removal ─────────────────────
    if (accessWasRemoved) {
      await tx.auditLog.create({
        data: {
          tableName: "projects",
          recordId: id,
          action: "UPDATE",
          oldValue: {
            departmentId: existing.departmentId,
            jurisdictionType: existing.jurisdictionType,
            accessType: existing.accessType,
          },
          newValue: {
            departmentId: updatePayload.departmentId ?? existing.departmentId,
            jurisdictionType: updatePayload.jurisdictionType ?? existing.jurisdictionType,
            accessType: updatePayload.accessType ?? existing.accessType,
          },
          userId: data.updatedById ?? null,
        },
      });
    }

    // ── 16. Return updated project ────────────────────────────
    return await tx.project.findUnique({
      where: { id },
      include: {
        department: true,
        selectedDistrict: true,
        projectAccessMappings: {
          where: { isActive: true },
          include: { district: true, specialUnit: true },
        },
        blocks: {
          include: {
            floors: {
              orderBy: { floorNumber: "asc" },
            },
          },
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
    if (!existing || !existing.isActive) throw new Error("Project not found");

    await tx.project.update({ where: { id }, data: { isActive: false } });
    await tx.project_access_mapping.updateMany({ where: { projectId: id }, data: { isActive: false } });

    return { message: "Project deleted successfully" };
  });
};




// ─────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────

export const getProjectDashboardService = async (userId?: string) => {
  const where: any = { isActive: true };

  if (userId) {
    const userAccess = await prisma.user_management.findMany({
      where: { userId, isActive: true },
    });

    const departmentIds = [
      ...new Set(userAccess.map((u) => u.departmentId)),
    ];

    const districtIds = userAccess
      .filter((u) => u.districtId)
      .map((u) => u.districtId as string);

    const specialUnitIds = userAccess
      .filter((u) => u.specialUnitId)
      .map((u) => u.specialUnitId as string);

    where.departmentId = { in: departmentIds };

    where.projectAccessMappings = {
      some: {
        isActive: true,
        OR: [
          { districtId: { in: districtIds } },
          { specialUnitId: { in: specialUnitIds } },
          { districtId: null, specialUnitId: null },
        ],
      },
    };
  }

  const projects = await prisma.project.findMany({
    where,
    include: {
      landSiteInspection:         { where: { isActive: true } },
      preConstructionInspections: { where: { isActive: true } },
      foundationProgresses:       { where: { isActive: true } },
      foundationQualityChecks:    { where: { isActive: true } },
      plinthStages:               { where: { isActive: true } },
      BuildingInspection: {
        where: { isActive: true },
        include: { developmentWork: true }  // ← nested, no direct project relation
      },
      TakeoverBuildingInsepction: {
  where: { isActive: true },
  include: { developmentWork: true }  // relation field name on TakeoverBuildingInspection model
},
      TakeoverDevelopmentWork:    { where: { isActive: true } },
      inspectionProgresses: {
        where: { isActive: true },
        include: {
          module: true,
          stage: true,
          answers: true,
        },
      },
    },
  }) as any[];

  // Load all inspection modules once
  const inspectionModules = await prisma.inspection_module.findMany();
  const moduleMap = new Map(inspectionModules.map((m) => [m.name.toLowerCase(), m.id]));

  let assignedProjects   = 0;
  let ongoingProjects    = 0;
  let completedProjects  = 0;
  let totalInspections   = 0;
  let completedInspections = 0;
  let pendingInspections = 0;

  for (const p of projects) {
    const selectedStageCount = Array.isArray(p.selectedStages)
      ? (p.selectedStages as string[]).length
      : 0;

    const done: string[] = [];

    if (p.landSiteInspection.length > 0)        done.push("Land Site Inspection");
    if (p.preConstructionInspections.length > 0) done.push("Pre Construction");
    if (p.foundationProgresses.length > 0 || p.foundationQualityChecks.length > 0) done.push("Foundation");
    if (p.plinthStages.length > 0)               done.push("Plinth");

    // ── Inspection-module based stages ────────────────────────
    const moduleNames = [
      "Framed Structure",
      "Load Bearing Structure",
      "Interior",
      "Exterior",
    ];

    for (const moduleName of moduleNames) {
      const moduleId = moduleMap.get(moduleName.toLowerCase());
      if (!moduleId) continue;

      const moduleProgresses = (p.inspectionProgresses as any[]).filter(
        (ip: any) => ip.moduleId === moduleId
      );

      if (
        moduleProgresses.length > 0 &&
        moduleProgresses.every((ip: any) => ip.status === "COMPLETED")
      ) {
        done.push(moduleName);
      }
    }

    if ((p.BuildingInspection as any[]).length > 0) done.push("Building Inspection");

    // ── DevelopmentWork checked via BuildingInspection ────────
    const hasDevelopmentWork = (p.BuildingInspection as any[]).some(
      (bi: any) => bi.developmentWork !== null
    );
    if (hasDevelopmentWork) done.push("Development Work");

    if ((p.TakeoverBuildingInsepction as any[]).length > 0) done.push("Takeover Building Inspection");

const hasTakeoverDevelopmentWork = (p.TakeoverBuildingInsepction as any[]).some(
  (tbi: any) => tbi.developmentWork !== null
);
if (hasTakeoverDevelopmentWork) done.push("Takeover Development Work");
    const doneCount    = done.length;
    const pendingCount = Math.max(0, selectedStageCount - doneCount);

    totalInspections     += selectedStageCount;
    completedInspections += doneCount;
    pendingInspections   += pendingCount;

    if (doneCount === 0)                          assignedProjects++;
    else if (doneCount > 0 && pendingCount > 0)   ongoingProjects++;
    else                                           completedProjects++;
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

// ─────────────────────────────────────────────────────────────
// GET ASSIGNED PROJECTS (by user)
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

  const allStages = await prisma.stage.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });
  const stageMap = new Map(allStages.map((s) => [s.id, s.name]));

  const where: any = { isActive: true };

  if (search) {
    where.projectName = { contains: search, mode: "insensitive" };
  }

  if (userId) {
    const userAccess = await prisma.user_management.findMany({
      where: { userId, isActive: true },
    });

    const departmentIds = [
      ...new Set(userAccess.map((u) => u.departmentId)),
    ];

    const districtIds = userAccess
      .filter((u) => u.districtId)
      .map((u) => u.districtId as string);

    const specialUnitIds = userAccess
      .filter((u) => u.specialUnitId)
      .map((u) => u.specialUnitId as string);

    where.departmentId = { in: departmentIds };

    where.projectAccessMappings = {
      some: {
        isActive: true,
        OR: [
          { districtId: { in: districtIds } },
          { specialUnitId: { in: specialUnitIds } },
          { districtId: null, specialUnitId: null },
        ],
      },
    };
  }

  // Load inspection modules for name → id mapping
  const inspectionModules = await prisma.inspection_module.findMany();
  const moduleMap = new Map(inspectionModules.map((m) => [m.name.toLowerCase(), m.id]));

  const [projects, totalRecords] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        department: true,
        selectedDistrict: true,
        projectAccessMappings: {
          where: { isActive: true },
          include: { district: true, specialUnit: true },
        },
        blocks: {
          include: {
            floors: { orderBy: { floorNumber: "asc" } },
          },
        },
        landSiteInspection:         { where: { isActive: true } },
        preConstructionInspections: { where: { isActive: true } },
        foundationProgresses:       { where: { isActive: true } },
        foundationQualityChecks:    { where: { isActive: true } },
        plinthStages:               { where: { isActive: true } },
        BuildingInspection: {
          where: { isActive: true },
          include: { developmentWork: true }  // ← nested, no direct project relation
        },
        TakeoverBuildingInsepction: { where: { isActive: true } },
        TakeoverDevelopmentWork:    { where: { isActive: true } },
        inspectionProgresses: {
          where: { isActive: true },
          include: { module: true, stage: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }) as Promise<any[]>,
    prisma.project.count({ where }),
  ]);

  function getCompletedStageNames(p: any): string[] {
    const done: string[] = [];

    if (p.landSiteInspection.length > 0)        done.push("Land Site Inspection");
    if (p.preConstructionInspections.length > 0) done.push("Pre Construction");
    if (p.foundationProgresses.length > 0 || p.foundationQualityChecks.length > 0) done.push("Foundation");
    if (p.plinthStages.length > 0)               done.push("Plinth");

    // ── Inspection-module based stages ────────────────────────
    const moduleNames = [
      "Framed Structure",
      "Load Bearing Structure",
      "Interior",
      "Exterior",
    ];

    for (const moduleName of moduleNames) {
      const moduleId = moduleMap.get(moduleName.toLowerCase());
      if (!moduleId) continue;

      const moduleProgresses = (p.inspectionProgresses as any[]).filter(
        (ip: any) => ip.moduleId === moduleId
      );

      if (
        moduleProgresses.length > 0 &&
        moduleProgresses.every((ip: any) => ip.status === "COMPLETED")
      ) {
        done.push(moduleName);
      }
    }

    if ((p.BuildingInspection as any[]).length > 0) done.push("Building Inspection");

    // ── DevelopmentWork checked via BuildingInspection ────────
    const hasDevelopmentWork = (p.BuildingInspection as any[]).some(
      (bi: any) => bi.developmentWork !== null
    );
    if (hasDevelopmentWork) done.push("Development Work");

    if ((p.TakeoverBuildingInsepction as any[]).length > 0) done.push("Takeover Building Inspection");
    if ((p.TakeoverDevelopmentWork    as any[]).length > 0) done.push("Takeover Development Work");

    return done;
  }

  const data = projects.map((p) => {
    const isSpecialUnit = p.jurisdictionType === "SPECIAL_UNIT";

    const specialUnitMapping = p.projectAccessMappings.find(
      (m: any) => !!m.specialUnitId
    );

    const districtMappings = p.projectAccessMappings.filter(
      (m: any) => !m.specialUnitId
    );

    const selectedStageCount = Array.isArray(p.selectedStages)
      ? (p.selectedStages as string[]).length
      : 0;

    const selectedStageNames = Array.isArray(p.selectedStages)
      ? (p.selectedStages as string[])
          .map((id) => stageMap.get(id) ?? null)
          .filter(Boolean) as string[]
      : [];

    const completedStageNames = getCompletedStageNames(p);
    const completedStages = completedStageNames.length;
    const pendingStages = Math.max(0, selectedStageCount - completedStages);

    let projectStatus = "AssignedProjects";
    if (completedStages > 0 && pendingStages > 0) projectStatus = "OngoingProjects";
    if (completedStages >= selectedStageCount && selectedStageCount > 0) projectStatus = "CompletedProjects";

    // Per-module inspection summary for frontend
    const moduleNames = [
      "Framed Structure",
      "Load Bearing Structure",
      "Interior",
      "Exterior",
    ];

    const inspectionSummary = moduleNames.map((moduleName) => {
      const moduleId = moduleMap.get(moduleName.toLowerCase());
      const progresses = moduleId
        ? (p.inspectionProgresses as any[]).filter((ip: any) => ip.moduleId === moduleId)
        : [];

      const total     = progresses.length;
      const completed = progresses.filter((ip: any) => ip.status === "COMPLETED").length;
      const inProgress = progresses.filter((ip: any) => ip.status === "IN_PROGRESS").length;

      return {
        moduleName,
        total,
        completed,
        inProgress,
        notStarted: total - completed - inProgress,
        status:
          total === 0
            ? "NOT_STARTED"
            : completed === total
            ? "COMPLETED"
            : "IN_PROGRESS",
      };
    });

    return {
      id: p.id,
      code: p.code,
      projectName: p.projectName,
      buildingType: p.buildingType,
      location: p.location,
      departmentName: p.department?.name ?? null,
      selectedDistrictId: p.selectedDistrictId ?? null,
      selectedDistrictName: p.selectedDistrict?.name ?? null,
      selectedDistrictType: p.selectedDistrict?.type ?? null,
      jurisdictionType: p.jurisdictionType,
      accessType: isSpecialUnit ? null : p.accessType,
      hasSuperStructure: p.hasSuperStructure,

      districtAccess: isSpecialUnit
        ? null
        : {
            accessType: p.accessType,
            districts: districtMappings
              .filter((m: any) => m.districtId)
              .map((m: any) => ({
                districtId: m.districtId,
                districtName: m.district?.name ?? null,
                districtType: m.district?.type ?? null,
              })),
          },

      specialUnitAccess:
        isSpecialUnit && specialUnitMapping
          ? {
              specialUnitId: specialUnitMapping.specialUnitId ?? null,
              specialUnitName: specialUnitMapping.specialUnit?.name ?? null,
            }
          : null,

      selectedStageCount,
      selectedStageNames,
      completedStages,
      completedStageNames,
      pendingStages,

      blocks: p.blocks.map((b: any) => ({
        blockId: b.id,
        blockName: b.blockName,
        totalFloors: b.totalFloors,
        floors: b.floors.map((f: any) => ({
          floorId: f.id,
          floorName: f.floorName,
          floorNumber: f.floorNumber,
        })),
      })),

      inspectionSummary,

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
// GET PROJECT BY ID
// ─────────────────────────────────────────────────────────────

export const getProjectByIdService = async (id: string) => {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      department: true,
      selectedDistrict: true,
      projectAccessMappings: {
        where: { isActive: true },
        include: { district: true, specialUnit: true },
      },
      blocks: {
        include: {
          floors: { orderBy: { floorNumber: "asc" } },
        },
      },
      inspectionProgresses: {
        where: { isActive: true },
        include: { module: true, stage: true },
      },
      projectHistories: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!project || !project.isActive) throw new Error("Project not found");

  const isSpecialUnit = project.jurisdictionType === "SPECIAL_UNIT";
  const specialUnitMapping = project.projectAccessMappings.find((m) => !!m.specialUnitId);
  const districtMappings = project.projectAccessMappings.filter((m) => !m.specialUnitId);

  // Build per-module inspection summary
  const inspectionModules = await prisma.inspection_module.findMany();
  const moduleNames = [
    "Framed Structure",
    "Load Bearing Structure",
    "Interior",
    "Exterior",
  ];

  const inspectionSummary = moduleNames.map((moduleName) => {
    const moduleId = inspectionModules.find(
      (m) => m.name.toLowerCase() === moduleName.toLowerCase()
    )?.id;

    const progresses = moduleId
      ? (project.inspectionProgresses as any[]).filter((ip) => ip.moduleId === moduleId)
      : [];

    const total = progresses.length;
    const completed = progresses.filter((ip: any) => ip.status === "COMPLETED").length;
    const inProgress = progresses.filter((ip: any) => ip.status === "IN_PROGRESS").length;

    return {
      moduleName,
      total,
      completed,
      inProgress,
      notStarted: total - completed - inProgress,
      status:
        total === 0
          ? "NOT_STARTED"
          : completed === total
          ? "COMPLETED"
          : "IN_PROGRESS",
    };
  });

  return {
    id: project.id,
    code: project.code,
    projectName: project.projectName,
    buildingType: project.buildingType,
    location: project.location,
    selectedDistrictId: project.selectedDistrictId ?? null,
    selectedDistrictName: (project as any).selectedDistrict?.name ?? null,
    selectedDistrictType: (project as any).selectedDistrict?.type ?? null,
    jurisdictionType: project.jurisdictionType,
    accessType: isSpecialUnit ? null : project.accessType,
    hasSuperStructure: project.hasSuperStructure,
    selectedStages: project.selectedStages,
    status: project.status,

    department: project.department
      ? { id: project.department.id, name: project.department.name }
      : null,

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

    specialUnitAccess: isSpecialUnit && specialUnitMapping
      ? {
          specialUnitId: specialUnitMapping.specialUnitId ?? null,
          specialUnitName: specialUnitMapping.specialUnit?.name ?? null,
        }
      : null,

    blocks: project.blocks.map((b) => ({
      blockId: b.id,
      blockName: b.blockName,
      totalFloors: b.totalFloors,
      floors: b.floors.map((f) => ({
        floorId: f.id,
        floorName: f.floorName,
        floorNumber: f.floorNumber,
      })),
    })),

    inspectionSummary,

    recentHistory: project.projectHistories,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
};