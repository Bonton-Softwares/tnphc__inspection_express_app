import prisma from "../../shared/prisma";
import { logAudit } from "../../auditLogService";


export const getSuperStructureFullViewService = async (
  projectId: string
) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      blocks: {
        where: { /* no isActive filter on block; include all */ },
        include: {
          floors: {
            orderBy: { floorNumber: "asc" }
          }
        }
      },
      SuperStructureProgress: {
        where: { isActive: true },
        include: {
          quality: true
        }
      }
    }
  });

  if (!project) throw new Error("Project not found");

  // ── NON-SUPER-STRUCTURE PROJECT ────────────────────────────────
  if (!project.hasSuperStructure) {
    // Still return progress and quality that may exist at project level
    // (blockId/floorId may be dummy/none for non-super-structure).
    // Expose all progress records and their linked quality for completeness.
    return {
      projectId:         project.id,
      projectName:       project.projectName,
      location:          project.location,
      hasSuperStructure: false,
      totalBlocks:       0,
      blocks:            [],
      progress:          project.SuperStructureProgress.map((p) => ({
        ...p,
        quality: p.quality ?? null
      }))
    };
  }

  // ── SUPER-STRUCTURE PROJECT ────────────────────────────────────
  const blocks = project.blocks.map((block) => {
    const floors = block.floors.map((floor) => {
      // Find progress for this exact block + floor
      const progressRecord = project.SuperStructureProgress.find(
        (p) => p.blockId === block.id && p.floorId === floor.id
      );

      return {
        floorId:    floor.id,
        floorName:  floor.floorName,
        floorNumber: floor.floorNumber,
        status:     progressRecord?.status ?? "NOT_STARTED",
        progressId: progressRecord?.id ?? null,
        stage:      progressRecord?.stage ?? null,
        remarks:    progressRecord?.remarks ?? null,
        photo:      progressRecord?.photo ?? null,
        // Quality is only available after progress is submitted
        quality:    progressRecord?.quality ?? null
      };
    });

    const progressList = project.SuperStructureProgress.filter(
      (p) => p.blockId === block.id
    );

const completedFloors = progressList.filter(
  (p) => p.status === "COMPLETED"
).length;

const inProgressFloors = progressList.filter(
  (p) => p.status === "IN_PROGRESS"
).length;

const blockStatus =
  progressList.length === 0
    ? "NOT_STARTED"
    : completedFloors === block.totalFloors
    ? "COMPLETED"
    : inProgressFloors > 0
    ? "IN_PROGRESS"
    : "NOT_STARTED";

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
// Upsert by (projectId + blockId + floorId) — one record per floor per block.
// If id passed directly (update route), update by id.
export const upsertProgressDB = async (
  data: any,
  meta: { userId?: string; roleId?: string; ip?: string } = {}
) => {
  // ── UPDATE BY ID ─────────────────────────────────────────────
  if (data.id) {
    const existing = await prisma.superStructureProgress.findUnique({
      where: { id: data.id }
    });

    if (!existing) throw new Error("Progress record not found");

    await logAudit({
      tableName: "superStructureProgress",
      recordId:  existing.id,
      action:    "UPDATE",
      oldValue:  existing,
      newValue:  data,
      userId:    meta.userId,
      roleId:    meta.roleId,
      ipAddress: meta.ip
    });

    const { id, ...updateData } = data;
    return prisma.superStructureProgress.update({
      where: { id: existing.id },
      data:  updateData,
      include: { quality: true }
    });
  }

  // ── UPSERT BY projectId + blockId + floorId ──────────────────
  const existing = await prisma.superStructureProgress.findFirst({
    where: {
      projectId: data.projectId,
      blockId:   data.blockId,
      floorId:   data.floorId,
      isActive:  true
    }
  });

  if (existing) {
    await logAudit({
      tableName: "superStructureProgress",
      recordId:  existing.id,
      action:    "UPDATE",
      oldValue:  existing,
      newValue:  data,
      userId:    meta.userId,
      roleId:    meta.roleId,
      ipAddress: meta.ip
    });

    return prisma.superStructureProgress.update({
      where: { id: existing.id },
      data,
      include: { quality: true }
    });
  }

  const created = await prisma.superStructureProgress.create({
    data,
    include: { quality: true }
  });

  await logAudit({
    tableName: "superStructureProgress",
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
export const deleteProgressDB = async (
  id: string,
  meta: { userId?: string; roleId?: string; ip?: string } = {}
) => {
  const existing = await prisma.superStructureProgress.findUnique({
    where: { id }
  });

  if (existing) {
    await logAudit({
      tableName: "superStructureProgress",
      recordId:  id,
      action:    "DELETE",
      oldValue:  existing,
      userId:    meta.userId,
      roleId:    meta.roleId,
      ipAddress: meta.ip
    });
  }

  return prisma.superStructureProgress.update({
    where: { id },
    data:  { isActive: false }
  });
};

export const upsertQualityDB = async (
  data: any,
  meta: { userId?: string; roleId?: string; ip?: string } = {}
) => {
  // Ensure the linked progress exists
  const progress = await prisma.superStructureProgress.findUnique({
    where: { id: data.progressId }
  });

  if (!progress) {
    throw new Error(
      "Progress record not found. Submit progress first before adding quality check."
    );
  }

  const existing = await prisma.superStructureQuality.findUnique({
    where: { progressId: data.progressId }
  });

  // ── UPDATE QUALITY ─────────────────────────────────────
  if (existing) {
    await logAudit({
      tableName: "superStructureQuality",
      recordId: existing.id,
      action: "UPDATE",
      oldValue: existing,
      newValue: data,
      userId: meta.userId,
      roleId: meta.roleId,
      ipAddress: meta.ip
    });

    const updated = await prisma.superStructureQuality.update({
      where: { id: existing.id },
      data
    });

    // Mark progress as completed
    await prisma.superStructureProgress.update({
      where: { id: data.progressId },
      data: {
        status: "COMPLETED"
      }
    });

    return updated;
  }

  // ── CREATE QUALITY ─────────────────────────────────────
  const created = await prisma.superStructureQuality.create({
    data
  });

  // Mark progress as completed
  await prisma.superStructureProgress.update({
    where: { id: data.progressId },
    data: {
      status: "COMPLETED"
    }
  });

  await logAudit({
    tableName: "superStructureQuality",
    recordId: created.id,
    action: "CREATE",
    newValue: data,
    userId: meta.userId,
    roleId: meta.roleId,
    ipAddress: meta.ip
  });

  return created;
};

// ─── GETS ──────────────────────────────────────────────────────────
export const getProgressByProjectService = async (projectId: string) =>
  prisma.superStructureProgress.findMany({
    where:   { projectId, isActive: true },
    include: { quality: true },
    orderBy: { createdAt: "desc" }
  });

export const getQualityByProgressService = async (progressId: string) =>
  prisma.superStructureQuality.findUnique({
    where: { progressId }
  });