import prisma from "../../shared/prisma";
import { logAudit } from "../../auditLogService";

// ─── GET FULL VIEW ─────────────────────────────────────────────────
// Returns project with blocks → floors → progress per floor + quality per progress.
// Works for both hasSuperStructure=true and false projects.
export const getInteriorsFullViewService = async (
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
      interiorsProgress: {
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
    return {
      projectId:         project.id,
      projectName:       project.projectName,
      location:          project.location,
      hasSuperStructure: false,
      totalBlocks:       0,
      blocks:            [],
      progress:          project.interiorsProgress.map((p) => ({
        ...p,
        quality: p.quality ?? null
      }))
    };
  }

  // ── SUPER-STRUCTURE PROJECT ────────────────────────────────────
  const blocks = project.blocks.map((block) => {
    const floors = block.floors.map((floor) => {
      // Find progress for this exact block + floor
      const progressRecord = project.interiorsProgress.find(
        (p) => p.blockId === block.id && p.floorId === floor.id
      );

      return {
        floorId:         floor.id,
        floorName:       floor.floorName,
        floorNumber:     floor.floorNumber,
        status:          progressRecord?.status ?? "NOT_STARTED",
        progressId:      progressRecord?.id ?? null,
        stage:           progressRecord?.stage ?? null,
        progressRemarks: progressRecord?.progressRemarks ?? null,
        progressPhoto:   progressRecord?.progressPhoto ?? null,
        // Quality only available after progress is submitted
        quality:         progressRecord?.quality ?? null
      };
    });

    const progressList = project.interiorsProgress.filter(
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
// Upsert by (projectId + blockId + floorId) — one record per floor per block.
// If id passed directly (update route), update by id.
export const upsertInteriorsProgressDB = async (
  data: any,
  meta: { userId?: string; roleId?: string; ip?: string } = {}
) => {
  // ── UPDATE BY ID ─────────────────────────────────────────────
  if (data.id) {
    const existing = await prisma.interiorsProgress.findUnique({
      where: { id: data.id }
    });

    if (!existing) throw new Error("Progress record not found");

    await logAudit({
      tableName: "interiorsProgress",
      recordId:  existing.id,
      action:    "UPDATE",
      oldValue:  existing,
      newValue:  data,
      userId:    meta.userId,
      roleId:    meta.roleId,
      ipAddress: meta.ip
    });

    const { id, ...updateData } = data;
    return prisma.interiorsProgress.update({
      where:   { id: existing.id },
      data:    updateData,
      include: { quality: true }
    });
  }

  // ── UPSERT BY projectId + blockId + floorId ──────────────────
  const existing = await prisma.interiorsProgress.findFirst({
    where: {
      projectId: data.projectId,
      blockId:   data.blockId,
      floorId:   data.floorId,
      isActive:  true
    }
  });

  if (existing) {
    await logAudit({
      tableName: "interiorsProgress",
      recordId:  existing.id,
      action:    "UPDATE",
      oldValue:  existing,
      newValue:  data,
      userId:    meta.userId,
      roleId:    meta.roleId,
      ipAddress: meta.ip
    });

    return prisma.interiorsProgress.update({
      where:   { id: existing.id },
      data,
      include: { quality: true }
    });
  }

  const created = await prisma.interiorsProgress.create({
    data,
    include: { quality: true }
  });

  await logAudit({
    tableName: "interiorsProgress",
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
export const deleteInteriorsProgressDB = async (
  id: string,
  meta: { userId?: string; roleId?: string; ip?: string } = {}
) => {
  const existing = await prisma.interiorsProgress.findUnique({
    where: { id }
  });

  if (existing) {
    await logAudit({
      tableName: "interiorsProgress",
      recordId:  id,
      action:    "DELETE",
      oldValue:  existing,
      userId:    meta.userId,
      roleId:    meta.roleId,
      ipAddress: meta.ip
    });
  }

  return prisma.interiorsProgress.update({
    where: { id },
    data:  { isActive: false }
  });
};

// ─── UPSERT QUALITY ────────────────────────────────────────────────
// Quality is 1-to-1 with progress (via progressId @unique).
// Upsert by progressId. Validates that the linked progress exists first.
export const upsertInteriorsQualityDB = async (
  data: any,
  meta: { userId?: string; roleId?: string; ip?: string } = {}
) => {
  // Ensure the linked progress exists
  const progress = await prisma.interiorsProgress.findUnique({
    where: { id: data.progressId }
  });

  if (!progress) {
    throw new Error(
      "Progress record not found. Submit progress first before adding quality check."
    );
  }

  const existing = await prisma.interiorsQuality.findUnique({
    where: { progressId: data.progressId }
  });

  if (existing) {
    await logAudit({
      tableName: "interiorsQuality",
      recordId:  existing.id,
      action:    "UPDATE",
      oldValue:  existing,
      newValue:  data,
      userId:    meta.userId,
      roleId:    meta.roleId,
      ipAddress: meta.ip
    });

    return prisma.interiorsQuality.update({
      where: { id: existing.id },
      data
    });
  }

  const created = await prisma.interiorsQuality.create({ data });

  await logAudit({
    tableName: "interiorsQuality",
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
export const getInteriorsProgressByProjectService = async (
  projectId: string
) =>
  prisma.interiorsProgress.findMany({
    where:   { projectId, isActive: true },
    include: { quality: true },
    orderBy: { createdAt: "desc" }
  });

export const getInteriorsQualityByProgressService = async (
  progressId: string
) =>
  prisma.interiorsQuality.findUnique({
    where: { progressId }
  });