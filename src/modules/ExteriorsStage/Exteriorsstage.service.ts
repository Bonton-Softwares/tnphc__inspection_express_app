import prisma from "../../shared/prisma";
import { logAudit } from "../../auditLogService";

// ─── GET FULL VIEW ─────────────────────────────────────────────────
// Returns project with blocks → floors → progress per floor + quality per progress.
// Mirrors InteriorsStage exactly — exteriorsProgress uses blockId/floorId/status.
export const getExteriorsFullViewService = async (
  projectId: string
) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      blocks: {
        include: {
          floors: {
            orderBy: { floorNumber: "asc" }
          }
        }
      },
      exteriorsProgress: {
        where:   { isActive: true },
        include: { quality: true }
      }
    }
  });

  if (!project) throw new Error("Project not found");

  // ── NON-SUPER-STRUCTURE PROJECT ────────────────────────────────
  if (!project.hasSuperStructure) {
    return {
      projectId:         project.id,
      projectName:       project.projectName,
      location:          project.location,
      hasSuperStructure: false,
      totalBlocks:       0,
      blocks:            [],
      progress:          project.exteriorsProgress.map((p) => ({
        ...p,
        quality: p.quality ?? null
      }))
    };
  }

  // ── SUPER-STRUCTURE PROJECT ────────────────────────────────────
  const blocks = project.blocks.map((block) => {
    const floors = block.floors.map((floor) => {
      // Find progress for this exact block + floor
      const progressRecord = project.exteriorsProgress.find(
        (p) => p.blockId === block.id && p.floorId === floor.id
      );

      return {
        floorId:      floor.id,
        floorName:    floor.floorName,
        floorNumber:  floor.floorNumber,
        status:       progressRecord?.status    ?? "NOT_STARTED",
        progressId:   progressRecord?.id        ?? null,
        stage:        progressRecord?.stage      ?? null,
        remarks:      progressRecord?.remarks    ?? null,
        progressPhoto: progressRecord?.progressPhoto ?? null,
        // Quality only available after progress is submitted
        quality:      progressRecord?.quality    ?? null
      };
    });

    const progressList = project.exteriorsProgress.filter(
      (p) => p.blockId === block.id
    );

    const completedFloors = progressList.filter(
      (p) => p.status === "COMPLETED"
    ).length;

    const blockStatus =
      progressList.length === 0
        ? "NOT_STARTED"
        : completedFloors === block.totalFloors
        ? "COMPLETED"
        : "IN_PROGRESS";

    return {
      blockId:         block.id,
      blockName:       block.blockName,
      totalFloors:     block.totalFloors,
      completedFloors,
      status:          blockStatus,
      floors
    };
  });

  return {
    projectId:         project.id,
    projectName:       project.projectName,
    location:          project.location,
    hasSuperStructure: project.hasSuperStructure,
    totalBlocks:       blocks.length,
    blocks
  };
};

// ─── UPSERT PROGRESS ───────────────────────────────────────────────
// If id passed (PUT route) → update by id.
// Otherwise upsert by projectId + blockId + floorId (one record per floor per block).
export const upsertExteriorsProgressDB = async (
  data: any,
  meta: { userId?: string; roleId?: string; ip?: string } = {}
) => {
  // ── UPDATE BY ID ─────────────────────────────────────────────
  if (data.id) {
    const existing = await prisma.exteriorsProgress.findUnique({
      where: { id: data.id }
    });

    if (!existing) throw new Error("Progress record not found");

    await logAudit({
      tableName: "exteriorsProgress",
      recordId:  existing.id,
      action:    "UPDATE",
      oldValue:  existing,
      newValue:  data,
      userId:    meta.userId,
      roleId:    meta.roleId,
      ipAddress: meta.ip
    });

    const { id, ...updateData } = data;
    return prisma.exteriorsProgress.update({
      where:   { id: existing.id },
      data:    updateData,
      include: { quality: true }
    });
  }

  // ── UPSERT BY projectId + blockId + floorId ──────────────────
  const existing = await prisma.exteriorsProgress.findFirst({
    where: {
      projectId: data.projectId,
      blockId:   data.blockId,
      floorId:   data.floorId,
      isActive:  true
    }
  });

  if (existing) {
    await logAudit({
      tableName: "exteriorsProgress",
      recordId:  existing.id,
      action:    "UPDATE",
      oldValue:  existing,
      newValue:  data,
      userId:    meta.userId,
      roleId:    meta.roleId,
      ipAddress: meta.ip
    });

    return prisma.exteriorsProgress.update({
      where:   { id: existing.id },
      data,
      include: { quality: true }
    });
  }

  const created = await prisma.exteriorsProgress.create({
    data,
    include: { quality: true }
  });

  await logAudit({
    tableName: "exteriorsProgress",
    recordId:  created.id,
    action:    "CREATE",
    newValue:  data,
    userId:    meta.userId,
    roleId:    meta.roleId,
    ipAddress: meta.ip
  });

  return created;
};

// ─── SOFT DELETE PROGRESS ──────────────────────────────────────────
export const deleteExteriorsProgressDB = async (
  id: string,
  meta: { userId?: string; roleId?: string; ip?: string } = {}
) => {
  const existing = await prisma.exteriorsProgress.findUnique({
    where: { id }
  });

  if (existing) {
    await logAudit({
      tableName: "exteriorsProgress",
      recordId:  id,
      action:    "DELETE",
      oldValue:  existing,
      userId:    meta.userId,
      roleId:    meta.roleId,
      ipAddress: meta.ip
    });
  }

  return prisma.exteriorsProgress.update({
    where: { id },
    data:  { isActive: false }
  });
};

// ─── UPSERT QUALITY ────────────────────────────────────────────────
// Quality is 1-to-1 with progress (via progressId @unique).
// Upsert by progressId. Validates that the linked progress exists first.
export const upsertExteriorsQualityDB = async (
  data: any,
  meta: { userId?: string; roleId?: string; ip?: string } = {}
) => {
  // Ensure the linked progress exists
  const progress = await prisma.exteriorsProgress.findUnique({
    where: { id: data.progressId }
  });

  if (!progress) {
    throw new Error(
      "Progress record not found. Submit progress first before adding quality check."
    );
  }

  const existing = await prisma.exteriorsQuality.findUnique({
    where: { progressId: data.progressId }
  });

  if (existing) {
    await logAudit({
      tableName: "exteriorsQuality",
      recordId:  existing.id,
      action:    "UPDATE",
      oldValue:  existing,
      newValue:  data,
      userId:    meta.userId,
      roleId:    meta.roleId,
      ipAddress: meta.ip
    });

    return prisma.exteriorsQuality.update({
      where: { id: existing.id },
      data
    });
  }

  const created = await prisma.exteriorsQuality.create({ data });

  await logAudit({
    tableName: "exteriorsQuality",
    recordId:  created.id,
    action:    "CREATE",
    newValue:  data,
    userId:    meta.userId,
    roleId:    meta.roleId,
    ipAddress: meta.ip
  });

  return created;
};

// ─── GETS ──────────────────────────────────────────────────────────
export const getExteriorsProgressByProjectService = async (
  projectId: string
) =>
  prisma.exteriorsProgress.findMany({
    where:   { projectId, isActive: true },
    include: { quality: true },
    orderBy: { createdAt: "desc" }
  });

// Fetch quality for a specific progress record (to pre-fill the form on edit)
export const getExteriorsQualityByProgressService = async (
  progressId: string
) =>
  prisma.exteriorsQuality.findUnique({
    where: { progressId }
  });