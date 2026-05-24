import prisma from "../../shared/prisma";
import { logAudit } from "../../auditLogService";

// ─── GET FULL VIEW ─────────────────────────────────────────────────
export const getExteriorsFullViewService = async (
  projectId: string
) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      superStructures:    { where: { isActive: true } },
      exteriorsProgress:  { where: { isActive: true } },
      exteriorsQuality:   true
    }
  });

  if (!project) throw new Error("Project not found");

  // ✅ No super structure — return stored progress as-is
  if (!project.hasSuperStructure) {
    return {
      projectId:         project.id,
      projectName:       project.projectName,
      location:          project.location,
      hasSuperStructure: false,
      totalBlocks:       0,
      blocks:            [],
      progress:          project.exteriorsProgress,
      quality:           project.exteriorsQuality ?? null
    };
  }

  const blocks = project.superStructures.map((block) => {
    const progressList = project.exteriorsProgress.filter(
      (p) => p.block === block.blockName
    );

    return {
      blockName:       block.blockName,
      totalFloors:     block.totalFloors,
      floors:          block.floors ?? [],
      completedFloors: progressList.filter((p) => p.isCompleted).length,
      currentFloor:    progressList.length,
      status:
        progressList.length === 0
          ? "NOT_STARTED"
          : progressList.filter((p) => p.isCompleted).length === block.totalFloors
          ? "COMPLETED"
          : "IN_PROGRESS",
      isStarted: progressList.length > 0
    };
  });

  return {
    projectId:         project.id,
    projectName:       project.projectName,
    location:          project.location,
    hasSuperStructure: project.hasSuperStructure,
    totalBlocks:       blocks.length,
    blocks,
    quality:           project.exteriorsQuality ?? null
  };
};

// ─── UPSERT PROGRESS ───────────────────────────────────────────────
export const upsertExteriorsProgressDB = async (
  data: any,
  meta: { userId?: string; roleId?: string; ip?: string } = {}
) => {
  // Direct update by id (from PUT route)
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
      where: { id: existing.id },
      data:  updateData
    });
  }

  // Upsert by projectId + block + floor + stageOfWork
  const existing = await prisma.exteriorsProgress.findFirst({
    where: {
      projectId:   data.projectId,
      block:       data.block       ?? null,
      floor:       data.floor       ?? null,
      stageOfWork: data.stageOfWork ?? null,
      isActive:    true
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
      where: { id: existing.id },
      data
    });
  }

  const created = await prisma.exteriorsProgress.create({ data });

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
export const upsertExteriorsQualityDB = async (
  data: any,
  meta: { userId?: string; roleId?: string; ip?: string } = {}
) => {
  const existing = await prisma.exteriorsQuality.findFirst({
    where: { projectId: data.projectId, isActive: true }
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
    orderBy: { createdAt: "desc" }
  });

export const getExteriorsQualityByProjectService = async (
  projectId: string
) =>
  prisma.exteriorsQuality.findFirst({
    where: { projectId, isActive: true }
  });