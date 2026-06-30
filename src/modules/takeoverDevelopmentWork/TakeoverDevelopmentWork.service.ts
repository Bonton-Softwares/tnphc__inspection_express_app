import prisma from "../../shared/prisma";
import { logAudit } from "../../auditLogService";

const sections = [
  "sumpPump", "borewell", "inspectionChamber", "stormWaterDrains",
  "sullageDrain", "road", "paverBlock", "compoundWall",
  "rainWaterHarvesting", "landScaping", "otherDefects", "generalRemarks"
];

// ─── CREATE OR UPDATE (UPSERT by buildingInspectionId) ────────────
export const createTakeoverDevelopmentWorkDB = async (
  data: any,
  userId?: string,
  roleId?: string,
  ipAddress?: string
) => {
 const existing = await prisma.takeoverDevelopmentWork.findFirst({
  where: {
    takeoverBuildingInspectionId: data.takeoverBuildingInspectionId,
    isActive: true
  }
});

  if (existing) {
    const oldValue = { ...existing };

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

    const updated = await prisma.takeoverDevelopmentWork.update({
      where: { id: existing.id },
      data:  mergedData
    });

    await logAudit({
      tableName: "TakeoverDevelopmentWork",
      recordId:  existing.id,
      action:    "UPDATE",
      oldValue,
      newValue:  updated,
      userId,
      roleId,
      ipAddress
    });

    return { takeoverDevelopmentWorkId: existing.id, isExisting: true };
  }

  const created = await prisma.takeoverDevelopmentWork.create({ data });

  await logAudit({
    tableName: "TakeoverDevelopmentWork",
    recordId:  created.id,
    action:    "CREATE",
    oldValue:  null,
    newValue:  created,
    userId,
    roleId,
    ipAddress
  });

  return { takeoverDevelopmentWorkId: created.id, isExisting: false };
};

// ─── GET BY BUILDING INSPECTION ID ────────────────────────────────
export const getTakeoverDevelopmentWorkByBuildingInspectionIdDB = async (
  takeoverBuildingInspectionId: string
) => {
  return prisma.takeoverDevelopmentWork.findFirst({
    where: {
      takeoverBuildingInspectionId,
      isActive: true
    }
  });
};

// ─── GET BY ID ────────────────────────────────────────────────────
export const getTakeoverDevelopmentWorkByIdDB = async (id: string) => {
  return prisma.takeoverDevelopmentWork.findFirst({
    where: { id, isActive: true }
  });
};

// ─── UPDATE ───────────────────────────────────────────────────────
export const updateTakeoverDevelopmentWorkDB = async (
  id: string,
  data: any,
  userId?: string,
  roleId?: string,
  ipAddress?: string
) => {
  const existing = await prisma.takeoverDevelopmentWork.findUnique({ where: { id } });

  if (!existing) throw new Error("Takeover development work record not found");

  const oldValue = { ...existing };

  const updated = await prisma.takeoverDevelopmentWork.update({
    where: { id },
    data
  });

  await logAudit({
    tableName: "TakeoverDevelopmentWork",
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
export const deleteTakeoverDevelopmentWorkDB = async (
  id: string,
  userId?: string,
  roleId?: string,
  ipAddress?: string
) => {
  const existing = await prisma.takeoverDevelopmentWork.findUnique({ where: { id } });
  if (!existing) throw new Error("Takeover development work record not found");

  const deleted = await prisma.takeoverDevelopmentWork.update({
    where: { id },
    data:  { isActive: false }
  });

  await logAudit({
    tableName: "TakeoverDevelopmentWork",
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