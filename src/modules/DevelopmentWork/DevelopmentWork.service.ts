import prisma from "../../shared/prisma";
import { logAudit } from "../../auditLogService";

// ─── CREATE OR UPDATE (UPSERT by buildingInspectionId) ────────────
export const createDevelopmentWorkDB = async (
  data: any,
  userId?: string,
  roleId?: string,
  ipAddress?: string
) => {
  // Search by buildingInspectionId
  const existing = await prisma.developmentWork.findFirst({
    where: {
      buildingInspectionId: data.buildingInspectionId,
      isActive: true
    }
  });

  if (existing) {
    const oldValue = { ...existing };

    const sections = [
      "sumpPump", "borewell", "inspectionChamber", "stormWaterDrains",
      "sullageDrain", "road", "paverBlock", "compoundWall",
      "rainWaterHarvesting", "landScaping", "otherDefects", "generalRemarks"
    ];

    const mergedData: any = { updatedById: data.createdById ?? null };

    for (const section of sections) {
      if (data[section] !== undefined) {
        const existingSection =
          (existing as any)[section] &&
          typeof (existing as any)[section] === "object"
            ? (existing as any)[section]
            : {};
        mergedData[section] = { ...existingSection, ...data[section] };
      }
    }

    const updated = await prisma.developmentWork.update({
      where: { id: existing.id },
      data:  mergedData
    });

    await logAudit({
      tableName: "DevelopmentWork",
      recordId:  existing.id,
      action:    "UPDATE",
      oldValue,
      newValue:  updated,
      userId,
      roleId,
      ipAddress
    });

    return { developmentWorkId: existing.id, isExisting: true };
  }

  // ── No record → create fresh ──────────────────────────────
  const created = await prisma.developmentWork.create({ data });

  await logAudit({
    tableName: "DevelopmentWork",
    recordId:  created.id,
    action:    "CREATE",
    oldValue:  null,
    newValue:  created,
    userId,
    roleId,
    ipAddress
  });

  return { developmentWorkId: created.id, isExisting: false };
};

// ─── GET BY BUILDING INSPECTION ID ────────────────────────────────
export const getDevelopmentWorkByBuildingInspectionIdDB = async (
  buildingInspectionId: string
) => {
  const record = await prisma.developmentWork.findFirst({
    where: { buildingInspectionId, isActive: true }
  });

  if (!record) throw new Error("Development work record not found");

  return record;
};

// ─── GET BY ID ────────────────────────────────────────────────────
export const getDevelopmentWorkByIdDB = async (id: string) => {
  return prisma.developmentWork.findFirst({
    where: { id, isActive: true }
  });
};

// ─── UPDATE ───────────────────────────────────────────────────────
export const updateDevelopmentWorkDB = async (
  id: string,
  data: any,
  userId?: string,
  roleId?: string,
  ipAddress?: string
) => {
  const existing = await prisma.developmentWork.findUnique({ where: { id } });

  if (!existing) throw new Error("Development work record not found");

  const oldValue = { ...existing };

  const sections = [
    "sumpPump", "borewell", "inspectionChamber", "stormWaterDrains",
    "sullageDrain", "road", "paverBlock", "compoundWall",
    "rainWaterHarvesting", "landScaping", "otherDefects", "generalRemarks"
  ];

  const mergedData: any = { updatedById: data.updatedById ?? null };

  for (const section of sections) {
    if (data[section] !== undefined) {
      const existingSection =
        (existing as any)[section] &&
        typeof (existing as any)[section] === "object"
          ? (existing as any)[section]
          : {};
      mergedData[section] = { ...existingSection, ...data[section] };
    }
  }

  const updated = await prisma.developmentWork.update({
    where: { id },
    data:  mergedData
  });

  await logAudit({
    tableName: "DevelopmentWork",
    recordId:  id,
    action:    "UPDATE",
    oldValue,
    newValue:  updated,
    userId,
    roleId,
    ipAddress
  });

  return updated;
};

// ─── SOFT DELETE ──────────────────────────────────────────────────
export const deleteDevelopmentWorkDB = async (
  id: string,
  userId?: string,
  roleId?: string,
  ipAddress?: string
) => {
  const existing = await prisma.developmentWork.findUnique({ where: { id } });
  if (!existing) throw new Error("Development work record not found");

  const deleted = await prisma.developmentWork.update({
    where: { id },
    data:  { isActive: false }
  });

  await logAudit({
    tableName: "DevelopmentWork",
    recordId:  id,
    action:    "DELETE",
    oldValue:  existing,
    newValue:  deleted,
    userId,
    roleId,
    ipAddress
  });

  return deleted;
};