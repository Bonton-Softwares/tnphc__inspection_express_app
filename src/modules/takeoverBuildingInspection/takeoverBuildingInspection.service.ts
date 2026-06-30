import { logAudit } from "../../auditLogService";
import prisma from "../../shared/prisma";

export const createTakeoverBuildingInspectionDB = async (
  data: any,
  userId?: string,
  roleId?: string,
  ipAddress?: string
) => {
  const existing = await prisma.takeoverBuildingInspection.findFirst({
    where: {
      projectId: data.projectId,
      blockId:   data.blockId ?? null,
      floorId:   data.floorId ?? null,
      roomNo:    data.roomNo  ?? null,
      isActive:  true
    },
    orderBy: { createdAt: "desc" }
  });

  const sections = [
    "structure", "painting", "tilingFlooring", "falseCeiling",
    "plumbingSystem", "electricalSystem", "doorsWindows", "lifts",
    "fireFightingSystem", "terraceInspection"
  ];

  if (existing) {
    const oldValue = { ...existing };
    const mergedData: any = { updatedById: data.createdById ?? null };

    for (const section of sections) {
      if (data[section] !== undefined) {
        const existingSection =
          (existing as any)[section] && typeof (existing as any)[section] === "object"
            ? (existing as any)[section]
            : {};
        mergedData[section] = { ...existingSection, ...data[section] };
      }
    }

    const updated = await prisma.takeoverBuildingInspection.update({
      where: { id: existing.id },
      data: mergedData
    });

    await logAudit({
      tableName: "TakeoverBuildingInspection",
      recordId: existing.id,
      action: "UPDATE",
      oldValue,
      newValue: updated,
      userId, roleId, ipAddress
    });

    return { buildingInspectionId: existing.id, isExisting: true };
  }

  const created = await prisma.takeoverBuildingInspection.create({ data });

  await logAudit({
    tableName: "TakeoverBuildingInspection",
    recordId: created.id,
    action: "CREATE",
    oldValue: null,
    newValue: created,
    userId, roleId, ipAddress
  });

  return { buildingInspectionId: created.id, isExisting: false };
};

export const getTakeoverBuildingInspectionSetupService = async (projectId: string) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { blocks: { include: { floors: { orderBy: { floorNumber: "asc" } } } } }
  });

  if (!project) throw new Error("Project not found");

  const structureType: "FRAMED" | "LOAD_BEARING" = project.hasSuperStructure
    ? "FRAMED"
    : "LOAD_BEARING";

  const blocks =
    structureType === "FRAMED"
      ? project.blocks.map((b) => ({
          id: b.id,
          name: b.blockName,
          totalFloors: b.totalFloors,
          floors: b.floors.map((f) => ({ id: f.id, name: f.floorName, floorNumber: f.floorNumber }))
        }))
      : [];

  const existingInspections = await prisma.takeoverBuildingInspection.findMany({
    where: { projectId, isActive: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, projectId: true, blockId: true, floorId: true, roomNo: true, createdAt: true, updatedAt: true }
  });

  return {
    project: { id: project.id, name: project.projectName, hasSuperStructure: project.hasSuperStructure, structureType },
    structureType,
    blocks,
    existingInspections: existingInspections.map((i) => ({
      buildingInspectionId: i.id,
      blockId: i.blockId ?? null,
      floorId: i.floorId ?? null,
      roomNo: i.roomNo ?? null
    }))
  };
};

export const getAllTakeoverBuildingInspectionDB = (projectId: string) => {
  return prisma.takeoverBuildingInspection.findMany({
    where: { projectId, isActive: true },
    orderBy: { createdAt: "desc" }
  });
};

export const getTakeoverBuildingInspectionByIdDB = (id: string) => {
  return prisma.takeoverBuildingInspection.findUnique({ where: { id } });
};

export const updateTakeoverBuildingInspectionDB = async (
  id: string,
  data: any,
  userId?: string,      // ← add
  roleId?: string,      // ← add
  ipAddress?: string    // ← add
) => {
  const existing = await prisma.takeoverBuildingInspection.findUnique({ where: { id } });
  if (!existing) throw new Error("Takeover building inspection record not found");

  const oldValue = { ...existing };

  const updated = await prisma.takeoverBuildingInspection.update({
    where: { id },
    data
  });

  await logAudit({
    tableName: "TakeoverBuildingInspection",
    recordId: id,
    action: "UPDATE",
    oldValue,
    newValue: updated,
    userId,
    roleId,
    ipAddress
  });

  return updated;
};

export const deleteTakeoverBuildingInspectionDB = async (
  id: string,
  userId?: string,      // ← add
  roleId?: string,      // ← add
  ipAddress?: string    // ← add
) => {
  const existing = await prisma.takeoverBuildingInspection.findUnique({ where: { id } });
  if (!existing) throw new Error("Takeover building inspection record not found");

  const deleted = await prisma.takeoverBuildingInspection.update({
    where: { id },
    data: { isActive: false }
  });

  await logAudit({
    tableName: "TakeoverBuildingInspection",
    recordId: id,
    action: "DELETE",
    oldValue: existing,
    newValue: deleted,
    userId,
    roleId,
    ipAddress
  });

  return deleted;
};

// Returns only the LATEST submission for a given project
export const getTakeoverBuildingInspectionByProjectIdDB = async (
  projectId: string
) => {
  const record = await prisma.takeoverBuildingInspection.findFirst({
    where: { projectId, isActive: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      projectId: true,
      createdAt: true,
      updatedAt: true,
      createdById: true,
      updatedById: true,

      // STRUCTURE
      structure: true,

      // PAINTING
      painting: true,

      // TILING & FLOORING
      tilingFlooring: true,

      // FALSE CEILING
      falseCeiling: true,

      // PLUMBING SYSTEM
      plumbingSystem: true,

      // ELECTRICAL SYSTEM
      electricalSystem: true,

      // DOORS & WINDOWS
      doorsWindows: true,

      // LIFTS
      lifts: true,

      // FIRE FIGHTING SYSTEM
      fireFightingSystem: true,

      // TERRACE INSPECTION
      terraceInspection: true
    }
  });

  return record ? [record] : [];
};