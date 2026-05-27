import prisma from "../../shared/prisma";
import { logAudit } from "../../auditLogService";

// ─── GET FULL VIEW ─────────────────────────────────────────────────
export const getSuperStructureFullViewService = async (
  projectId: string
) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      superStructures:        { where: { isActive: true } },
      SuperStructureProgress: { where: { isActive: true } },
      superStructureQuality:  { where: { isActive: true } }
    }
  });

  if (!project) throw new Error("Project not found");

  if (!project.hasSuperStructure) {
    return {
      projectId:        project.id,
      projectName:      project.projectName,
      location:         project.location,
      hasSuperStructure: false,
      totalBlocks:      0,
      blocks:           [],
      progress:         project.SuperStructureProgress,
      quality:          project.superStructureQuality ?? null
    };
  }

  const blocks = project.superStructures.map((block) => {
    const progressList = project.SuperStructureProgress.filter(
      (p) => p.blockName === block.blockName
    );

    return {
      blockName:       block.blockName,
      totalFloors:     block.totalFloors,
      floors:          block.floors ?? [],
      completedFloors: progressList.length,
      currentFloor:    progressList.length,
      status:
        progressList.length === 0
          ? "NOT_STARTED"
          : progressList.length === block.totalFloors
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
    quality:           project.superStructureQuality ?? null
  };
};

// ─── UPSERT PROGRESS ───────────────────────────────────────────────
export const upsertProgressDB = async (
  data: any,
  meta: { userId?: string; roleId?: string; ip?: string } = {}
) => {
  // if id is passed directly (from update route), use it
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
      data:  updateData
    });
  }

  // otherwise upsert by projectId + blockName + floorName
  const existing = await prisma.superStructureProgress.findFirst({
    where: {
      projectId: data.projectId,
      blockName: data.blockName ?? null,
      floorName: data.floorName ?? null,
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
      data
    });
  }

  const created = await prisma.superStructureProgress.create({ data });

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

// ─── UPSERT QUALITY ────────────────────────────────────────────────
export const upsertQualityDB = async (
  data: any,
  meta: { userId?: string; roleId?: string; ip?: string } = {}
) => {
  const existing = await prisma.superStructureQuality.findFirst({
    where: { projectId: data.projectId, isActive: true }
  });

  if (existing) {
    await logAudit({
      tableName: "superStructureQuality",
      recordId:  existing.id,
      action:    "UPDATE",
      oldValue:  existing,
      newValue:  data,
      userId:    meta.userId,
      roleId:    meta.roleId,
      ipAddress: meta.ip
    });

    return prisma.superStructureQuality.update({
      where: { id: existing.id },
      data
    });
  }

  const created = await prisma.superStructureQuality.create({ data });

  await logAudit({
    tableName: "superStructureQuality",
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
export const getProgressByProjectService = async (projectId: string) =>
  prisma.superStructureProgress.findMany({
    where:   { projectId, isActive: true },
    orderBy: { createdAt: "desc" }
  });

export const getQualityByProjectService = async (projectId: string) =>
  prisma.superStructureQuality.findFirst({
    where: {
      projectId,
      isActive: true,
    },
  });