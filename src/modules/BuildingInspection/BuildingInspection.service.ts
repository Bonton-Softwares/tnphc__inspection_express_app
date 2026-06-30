import prisma from "../../shared/prisma";
import { logAudit } from "../../auditLogService";

export const createBuildingInspectionDB = async (
  data: any,
  userId?: string,
  roleId?: string,
  ipAddress?: string
) => {
  // ── Check by projectId + blockId + floorId + roomNo ────────
  const existing = await prisma.buildingInspection.findFirst({
    where: {
      projectId: data.projectId,
      blockId:   data.blockId  ?? null,   // ← added
      floorId:   data.floorId  ?? null,   // ← added
      roomNo:    data.roomNo   ?? null,   // ← added
      isActive:  true
    },
    orderBy: { createdAt: "desc" }
  });

  if (existing) {
    const oldValue = { ...existing };

    const mergedData: any = { updatedById: data.createdById ?? null };

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
    }

    const updated = await prisma.buildingInspection.update({
      where: { id: existing.id },
      data:  mergedData
    });

    await logAudit({
      tableName: "BuildingInspection",
      recordId:  existing.id,
      action:    "UPDATE",
      oldValue,
      newValue:  updated,
      userId,
      roleId,
      ipAddress
    });

    return { buildingInspectionId: existing.id, isExisting: true };  // ← return id + flag
  }

  // ── No record yet → create fresh ──────────────────────────
  const created = await prisma.buildingInspection.create({ data });

  await logAudit({
    tableName: "BuildingInspection",
    recordId:  created.id,
    action:    "CREATE",
    oldValue:  null,
    newValue:  created,
    userId,
    roleId,
    ipAddress
  });

  return { buildingInspectionId: created.id, isExisting: false };  // ← return id + flag
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


export const getBuildingInspectionSetupService = async (projectId: string) => {
  // ── 1. Load project with blocks + floors ────────────────────
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      blocks: {
        include: {
          floors: { orderBy: { floorNumber: "asc" } }
        }
      }
    }
  });

  if (!project) throw new Error("Project not found");

  const structureType: "FRAMED" | "LOAD_BEARING" = project.hasSuperStructure
    ? "FRAMED"
    : "LOAD_BEARING";

  // ── 2. Build blocks/floors payload ──────────────────────────
  const blocks =
    structureType === "FRAMED"
      ? project.blocks.map((b) => ({
          id: b.id,
          name: b.blockName,
          totalFloors: b.totalFloors,
          floors: b.floors.map((f) => ({
            id: f.id,
            name: f.floorName,
            floorNumber: f.floorNumber
          }))
        }))
      : [];

  // ── 3. Existing building inspection records ──────────────────
  const existingInspections = await prisma.buildingInspection.findMany({
    where: { projectId, isActive: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      projectId: true,
      blockId: true,
      floorId: true,
      roomNo: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return {
    project: {
      id: project.id,
      name: project.projectName,
      hasSuperStructure: project.hasSuperStructure,
      structureType
    },
    structureType,
    blocks,
    existingInspections: existingInspections.map((i) => ({
      buildingInspectionId: i.id,
      blockId: i.blockId ?? null,
      floorId: i.floorId ?? null,
      roomNo:  i.roomNo  ?? null
    }))
  };
};

export const getBuildingInspectionByIdDB = async (
  buildingInspectionId: string
) => {
  const record = await prisma.buildingInspection.findFirst({
    where: { id: buildingInspectionId, isActive: true }
  });

  if (!record) throw new Error("Building inspection record not found");

  return record;
};

export const getBuildingInspectionByFloorService = async (
  floorId: string
) => {
  const inspections = await prisma.buildingInspection.findMany({
    where: {
      floorId,
      isActive: true
    },
    include: {
      block: true,
      floor: true,
      developmentWork: true
    },
    orderBy: {
      roomNo: "asc"
    }
  });

  if (!inspections.length) {
    return {
      floor: null,
      rooms: []
    };
  }

  const floor = inspections[0].floor;

  const rooms = inspections.map((i) => ({
    buildingInspectionId: i.id,
    projectId: i.projectId,
    blockId: i.blockId,
    blockName: i.block?.blockName ?? null,
    floorId: i.floorId,
    roomNo: i.roomNo,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,

    buildingInspection: {
      structure: i.structure,
      painting: i.painting,
      tilingFlooring: i.tilingFlooring,
      falseCeiling: i.falseCeiling,
      plumbingSystem: i.plumbingSystem,
      electricalSystem: i.electricalSystem,
      doorsWindows: i.doorsWindows,
      lifts: i.lifts,
      fireFightingSystem: i.fireFightingSystem,
      terraceInspection: i.terraceInspection
    },

    developmentWork: i.developmentWork
      ? {
          developmentWorkId: i.developmentWork.id,
          sumpPump: i.developmentWork.sumpPump,
          borewell: i.developmentWork.borewell,
          inspectionChamber: i.developmentWork.inspectionChamber,
          stormWaterDrains: i.developmentWork.stormWaterDrains,
          sullageDrain: i.developmentWork.sullageDrain,
          road: i.developmentWork.road,
          paverBlock: i.developmentWork.paverBlock,
          compoundWall: i.developmentWork.compoundWall,
          rainWaterHarvesting: i.developmentWork.rainWaterHarvesting,
          landScaping: i.developmentWork.landScaping,
          otherDefects: i.developmentWork.otherDefects,
          generalRemarks: i.developmentWork.generalRemarks,
          createdAt: i.developmentWork.createdAt,
          updatedAt: i.developmentWork.updatedAt
        }
      : null
  }));

  return {
    floor,
    rooms
  };
};