import prisma from "../../shared/prisma";
import { logAudit } from "../../auditLogService";

export const createBuildingInspectionDB = async (
  data: any,
  userId?: string,
  roleId?: string,
  ipAddress?: string
) => {
  // ── Check if a record already exists for this project ──────
  const existing = await prisma.buildingInspection.findFirst({
    where: { projectId: data.projectId, isActive: true },
    orderBy: { createdAt: "desc" }
  });

  if (existing) {
    // ── Already exists → merge & update (same ID) ────────────
    const oldValue = { ...existing };

    const mergedData: any = { updatedById: data.createdById ?? null };

    const sections = [
      "structure", "painting", "tilingFlooring", "falseCeiling",
      "plumbingSystem", "electricalSystem", "doorsWindows", "lifts",
      "fireFightingSystem", "terraceInspection"
    ];

    for (const section of sections) {
      if (data[section] !== undefined) {
        // Deep merge: spread existing JSON + new fields
        const existingSection =
          (existing as any)[section] &&
          typeof (existing as any)[section] === "object"
            ? (existing as any)[section]
            : {};
        mergedData[section] = { ...existingSection, ...data[section] };
      }
    }

    const updated = await prisma.buildingInspection.update({
      where: { id: existing.id },
      data: mergedData
    });

    await logAudit({
      tableName: "BuildingInspection",
      recordId: existing.id,
      action: "UPDATE",
      oldValue,
      newValue: updated,
      userId,
      roleId,
      ipAddress
    });

    return updated;
  }

  // ── No record yet → create fresh ─────────────────────────
  const created = await prisma.buildingInspection.create({ data });

  await logAudit({
    tableName: "BuildingInspection",
    recordId: created.id,
    action: "CREATE",
    oldValue: null,
    newValue: created,
    userId,
    roleId,
    ipAddress
  });

  return created;
};

export const getAllBuildingInspectionDB = (projectId: string) => {
  return prisma.buildingInspection.findMany({
    where: { projectId, isActive: true },
    orderBy: { createdAt: "desc" }
  });
};

export const getBuildingInspectionByProjectIdDB = async (projectId: string) => {
  const record = await prisma.buildingInspection.findFirst({
    where: { projectId, isActive: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      projectId: true,
      createdAt: true,
      updatedAt: true,
      createdById: true,
      updatedById: true,
      structure: true,
      painting: true,
      tilingFlooring: true,
      falseCeiling: true,
      plumbingSystem: true,
      electricalSystem: true,
      doorsWindows: true,
      lifts: true,
      fireFightingSystem: true,
      terraceInspection: true
    }
  });

  return record ? [record] : [];
};

export const updateBuildingInspectionDB = async (
  id: string,
  data: any,
  userId?: string,
  roleId?: string,
  ipAddress?: string
) => {
  // ── Fetch existing record ─────────────────────────────────
  const existing = await prisma.buildingInspection.findUnique({
    where: { id }
  });

  if (!existing) throw new Error("Building inspection record not found");

  const oldValue = { ...existing };

  // ── Deep merge only the sections that are provided ────────
  const mergedData: any = { updatedById: data.updatedById ?? null };

  const sections = [
    "structure", "painting", "tilingFlooring", "falseCeiling",
    "plumbingSystem", "electricalSystem", "doorsWindows", "lifts",
    "fireFightingSystem", "terraceInspection"
  ];

  for (const section of sections) {
    if (data[section] !== undefined) {
      const existingSection =
        (existing as any)[section] &&
        typeof (existing as any)[section] === "object"
          ? (existing as any)[section]
          : {};
      mergedData[section] = { ...existingSection, ...data[section] };
    }
    // if data[section] is undefined → not in request → keep existing as-is (no change)
  }

  const updated = await prisma.buildingInspection.update({
    where: { id },
    data: mergedData
  });

  await logAudit({
    tableName: "BuildingInspection",
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

export const deleteBuildingInspectionDB = async (
  id: string,
  userId?: string,
  roleId?: string,
  ipAddress?: string
) => {
  const existing = await prisma.buildingInspection.findUnique({ where: { id } });
  if (!existing) throw new Error("Building inspection record not found");

  const deleted = await prisma.buildingInspection.update({
    where: { id },
    data: { isActive: false }
  });

  await logAudit({
    tableName: "BuildingInspection",
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