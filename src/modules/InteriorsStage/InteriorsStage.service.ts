import prisma from "../../shared/prisma";
import { logAudit } from "../../auditLogService";

// ─── GET FULL VIEW ─────────────────────────────────────────────────
export const getInteriorsFullViewService = async (
  projectId: string
) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      superStructures:   { where: { isActive: true } }, // ✅ correct relation name
      interiorsProgress: { where: { isActive: true } },
      interiorsQuality:  true
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
      progress:          project.interiorsProgress,
      quality:           project.interiorsQuality ?? null
    };
  }

  const blocks = project.superStructures.map((block) => {
    const progressList = project.interiorsProgress.filter(
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
    quality:           project.interiorsQuality ?? null
  };
};

// ─── UPSERT PROGRESS ───────────────────────────────────────────────
export const upsertInteriorsProgressDB = async (
  data: any,
  meta: { userId?: string; roleId?: string; ip?: string } = {}
) => {
  // Direct update by id (from PUT route)
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
      where: { id: existing.id },
      data:  updateData
    });
  }

  // Upsert by projectId + block + floor + stageOfWork
  const existing = await prisma.interiorsProgress.findFirst({
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
      where: { id: existing.id },
      data
    });
  }

  const created = await prisma.interiorsProgress.create({ data });

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
export const upsertInteriorsQualityDB = async (
  data: any,
  meta: { userId?: string; roleId?: string; ip?: string } = {}
) => {
  const existing = await prisma.interiorsQuality.findFirst({
    where: { projectId: data.projectId, isActive: true }
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
    orderBy: { createdAt: "desc" }
  });

export const getInteriorsQualityByProjectService = async (
  projectId: string
) =>
  prisma.interiorsQuality.findFirst({
    where: { projectId, isActive: true }
  });