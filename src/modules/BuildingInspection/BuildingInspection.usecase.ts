import prisma from "../../shared/prisma";
import {
  createBuildingInspectionDB,
  getAllBuildingInspectionDB,
  getBuildingInspectionByProjectIdDB,
  updateBuildingInspectionDB,
  deleteBuildingInspectionDB,
  getBuildingInspectionSetupService,
  getBuildingInspectionByIdDB,
  getBuildingInspectionByFloorService
} from "./BuildingInspection.service";

// ─── helper: coerce "true"/"false" strings → boolean | null ───────────────
const toBool = (val: any): boolean | null => {
  if (val === undefined || val === null) return null;
  if (val === true  || val === "true")  return true;
  if (val === false || val === "false") return false;
  return null;
};

// ─── CREATE ───────────────────────────────────────────────────────────────
export const createBuildingInspectionUsecase = async (
  body: any,
  files: any,
  req: any,
  userId?: string
) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const roleId = req.user?.roleId;
  const ipAddress = req.ip ?? req.headers["x-forwarded-for"]?.toString();

  const getFiles = (field: string) =>
    (files?.[field] || []).map((file: any) => ({
      fileName: file.filename,
      url: `${baseUrl}/uploads/${file.filename}`
    }));

  const data = {
    projectId: body.projectId,
    blockId:   body.blockId ?? null,   // ← added
  floorId:   body.floorId ?? null,   // ← added
  roomNo:    body.roomNo  ?? null,
    structure: {
      alignment:          toBool(body.structureAlignment),
      alignmentPhoto:     getFiles("structureAlignmentPhoto"),
      location:           body.structureLocation        || null,
      defectReport:       body.structureDefectReport    || null,
      remarks:            body.structureRemarks         || null,
      concreteCubeReport: getFiles("structureConcreteCubeReport"),
      cementReport:       getFiles("structureCementReport"),
      steelReport:        getFiles("structureSteelReport"),
      waterReport:        getFiles("structureWaterReport"),
      sandReport:         getFiles("structureSandReport"),
      aggregateReport:    getFiles("structureAggregateReport"),
      bricksReport:       getFiles("structureBricksReport")
    },
    painting: {
      isQualityOk:  toBool(body.paintingIsQualityOk),
      defectPhoto:  getFiles("paintingDefectPhoto"),
      location:     body.paintingLocation     || null,
      defectReport: body.paintingDefectReport || null,
      remarks:      body.paintingRemarks      || null
    },
    tilingFlooring: {
      isQualityOk:  toBool(body.tilingIsQualityOk),
      defectPhoto:  getFiles("tilingDefectPhoto"),
      location:     body.tilingLocation     || null,
      defectReport: body.tilingDefectReport || null,
      remarks:      body.tilingRemarks      || null
    },
    falseCeiling: {
      isQualityOk:  toBool(body.falseCeilingIsQualityOk),
      defectPhoto:  getFiles("falseCeilingDefectPhoto"),
      location:     body.falseCeilingLocation     || null,
      defectReport: body.falseCeilingDefectReport || null,
      remarks:      body.falseCeilingRemarks      || null
    },
    plumbingSystem: {
      waterSupply: {
        isWorking:    toBool(body.plumbingWaterSupply),
        defectPhoto:  getFiles("plumbingWaterSupplyPhoto"),
        location:     body.plumbingWaterSupplyLocation || null,
        defectReport: body.plumbingWaterSupplyDefect   || null
      },
      leakage: {
        isPresent:    toBool(body.plumbingLeakage),
        defectPhoto:  getFiles("plumbingLeakagePhoto"),
        location:     body.plumbingLeakageLocation || null,
        defectReport: body.plumbingLeakageDefect   || null
      },
      remarks: body.plumbingRemarks || null
    },
    electricalSystem: {
      switchQuality: {
        isOk:        toBool(body.electricalSwitchQuality),
        remarks:     body.electricalSwitchRemarks || null,
        defectPhoto: getFiles("electricalSwitchPhoto")
      },
      powerSupply: {
        isProper:    toBool(body.electricalPowerSupply),
        remarks:     body.electricalPowerRemarks || null,
        defectPhoto: getFiles("electricalPowerPhoto")
      },
      voltageFluctuation: {
        isPresent:   toBool(body.electricalVoltage),
        remarks:     body.electricalVoltageRemarks || null,
        defectPhoto: getFiles("electricalVoltagePhoto")
      },
      earthing: {
        isTestDone:  toBool(body.electricalEarthingTest),
        isProper:    body.electricalEarthingProper || null,
        defectPhoto: getFiles("electricalEarthingPhoto")
      },
      elcb: {
        isWorking:   body.electricalELCB || null,
        defectPhoto: getFiles("electricalELCBPhoto")
      },
      remarks: body.electricalRemarks || null
    },
    doorsWindows: {
      quality: {
        isOk:        toBool(body.dwQuality),
        remarks:     body.dwQualityRemarks || null,
        defectPhoto: getFiles("dwQualityPhoto")
      },
      operation: {
        isProper:    toBool(body.dwOperation),
        remarks:     body.dwOperationRemarks || null,
        defectPhoto: getFiles("dwOperationPhoto")
      },
      remarks: body.dwRemarks || null
    },
   lifts: {
  working: {
    isWorking:   toBool(body.liftWorking),
    remarks:     body.liftWorkingRemarks || null,
    defectPhoto: getFiles("liftWorkingPhoto")
  },
  safety: {
    isWorking:   toBool(body.liftSafety),
    remarks:     body.liftSafetyRemarks || null,
    defectPhoto: getFiles("liftSafetyPhoto")
  },
  certificatePhoto: getFiles("liftCertificatePhoto"), // ← ADD
  remarks: body.liftRemarks || null
},
    fireFightingSystem: {
      // ── multiselect: always store as array ─────────────────
      systems: Array.isArray(body.fireSystems)
        ? body.fireSystems
        : body.fireSystems
        ? [body.fireSystems]
        : [],
      remarks: body.fireRemarks || null
    },
    terraceInspection: {
      roofTiles: {
        isProper:    toBool(body.terraceRoofTiles),
        remarks:     body.terraceRoofTilesRemarks || null,
        defectPhoto: getFiles("terraceRoofTilesPhoto")
      },
      drainage: {
        isProper:    toBool(body.terraceDrainage),
        remarks:     body.terraceDrainageRemarks || null,
        defectPhoto: getFiles("terraceDrainagePhoto")
      },
      waterproofing: {
        labReport: getFiles("terraceWaterproofingReport")
      },
      leakageTest: {
        isDone:       toBool(body.terraceLeakageTest),
        remarks:      body.terraceLeakageRemarks    || null,
        defectPhoto:  getFiles("terraceLeakagePhoto"),
        resultPhoto:  getFiles("terraceLeakageResultPhoto"),
        testDate:     body.terraceTestDate ? new Date(body.terraceTestDate) : null,
        conductedBy:  body.terraceConductedBy || null
      },
      remarks: body.terraceRemarks || null
    },
    createdById: userId
  };

  // ── upsert logic is now inside the DB layer ───────────────
  return createBuildingInspectionDB(data, userId, roleId, ipAddress);
};

export const updateBuildingInspectionUsecase = async (
  id: string,
  body: any,
  files: any,
  req: any,
  userId?: string
) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const roleId = req.user?.roleId;
  const ipAddress = req.ip ?? req.headers["x-forwarded-for"]?.toString();

  const getFiles = (field: string) =>
    (files?.[field] || []).map((file: any) => ({
      fileName: file.filename,
      url: `${baseUrl}/uploads/${file.filename}`
    }));

  const hasAny = (...keys: string[]) => keys.some(k => body[k] !== undefined);
  const hasFiles = (...fields: string[]) =>
    fields.some(f => (files?.[f] || []).length > 0);

  const data: any = { updatedById: userId };

  if (
    hasAny("structureAlignment", "structureLocation", "structureDefectReport", "structureRemarks") ||
    hasFiles("structureAlignmentPhoto", "structureConcreteCubeReport", "structureCementReport",
      "structureSteelReport", "structureWaterReport", "structureSandReport",
      "structureAggregateReport", "structureBricksReport")
  ) {
    data.structure = {
      ...(body.structureAlignment    !== undefined && { alignment:    toBool(body.structureAlignment) }),
      ...(body.structureLocation     !== undefined && { location:     body.structureLocation     || null }),
      ...(body.structureDefectReport !== undefined && { defectReport: body.structureDefectReport || null }),
      ...(body.structureRemarks      !== undefined && { remarks:      body.structureRemarks      || null }),
      ...(hasFiles("structureAlignmentPhoto")     && { alignmentPhoto:     getFiles("structureAlignmentPhoto") }),
      ...(hasFiles("structureConcreteCubeReport") && { concreteCubeReport: getFiles("structureConcreteCubeReport") }),
      ...(hasFiles("structureCementReport")       && { cementReport:       getFiles("structureCementReport") }),
      ...(hasFiles("structureSteelReport")        && { steelReport:        getFiles("structureSteelReport") }),
      ...(hasFiles("structureWaterReport")        && { waterReport:        getFiles("structureWaterReport") }),
      ...(hasFiles("structureSandReport")         && { sandReport:         getFiles("structureSandReport") }),
      ...(hasFiles("structureAggregateReport")    && { aggregateReport:    getFiles("structureAggregateReport") }),
      ...(hasFiles("structureBricksReport")       && { bricksReport:       getFiles("structureBricksReport") })
    };
  }

  if (
    hasAny("paintingIsQualityOk", "paintingLocation", "paintingDefectReport", "paintingRemarks") ||
    hasFiles("paintingDefectPhoto")
  ) {
    data.painting = {
      ...(body.paintingIsQualityOk  !== undefined && { isQualityOk:  toBool(body.paintingIsQualityOk) }),
      ...(body.paintingLocation     !== undefined && { location:     body.paintingLocation     || null }),
      ...(body.paintingDefectReport !== undefined && { defectReport: body.paintingDefectReport || null }),
      ...(body.paintingRemarks      !== undefined && { remarks:      body.paintingRemarks      || null }),
      ...(hasFiles("paintingDefectPhoto")         && { defectPhoto:  getFiles("paintingDefectPhoto") })
    };
  }

  if (
    hasAny("tilingIsQualityOk", "tilingLocation", "tilingDefectReport", "tilingRemarks") ||
    hasFiles("tilingDefectPhoto")
  ) {
    data.tilingFlooring = {
      ...(body.tilingIsQualityOk  !== undefined && { isQualityOk:  toBool(body.tilingIsQualityOk) }),
      ...(body.tilingLocation     !== undefined && { location:     body.tilingLocation     || null }),
      ...(body.tilingDefectReport !== undefined && { defectReport: body.tilingDefectReport || null }),
      ...(body.tilingRemarks      !== undefined && { remarks:      body.tilingRemarks      || null }),
      ...(hasFiles("tilingDefectPhoto")           && { defectPhoto:  getFiles("tilingDefectPhoto") })
    };
  }

  if (
    hasAny("falseCeilingIsQualityOk", "falseCeilingLocation", "falseCeilingDefectReport", "falseCeilingRemarks") ||
    hasFiles("falseCeilingDefectPhoto")
  ) {
    data.falseCeiling = {
      ...(body.falseCeilingIsQualityOk  !== undefined && { isQualityOk:  toBool(body.falseCeilingIsQualityOk) }),
      ...(body.falseCeilingLocation     !== undefined && { location:     body.falseCeilingLocation     || null }),
      ...(body.falseCeilingDefectReport !== undefined && { defectReport: body.falseCeilingDefectReport || null }),
      ...(body.falseCeilingRemarks      !== undefined && { remarks:      body.falseCeilingRemarks      || null }),
      ...(hasFiles("falseCeilingDefectPhoto")           && { defectPhoto:  getFiles("falseCeilingDefectPhoto") })
    };
  }

  if (
    hasAny("plumbingWaterSupply", "plumbingWaterSupplyLocation", "plumbingWaterSupplyDefect",
      "plumbingLeakage", "plumbingLeakageLocation", "plumbingLeakageDefect", "plumbingRemarks") ||
    hasFiles("plumbingWaterSupplyPhoto", "plumbingLeakagePhoto")
  ) {
    data.plumbingSystem = {
      waterSupply: {
        ...(body.plumbingWaterSupply         !== undefined && { isWorking:    toBool(body.plumbingWaterSupply) }),
        ...(body.plumbingWaterSupplyLocation !== undefined && { location:     body.plumbingWaterSupplyLocation || null }),
        ...(body.plumbingWaterSupplyDefect   !== undefined && { defectReport: body.plumbingWaterSupplyDefect   || null }),
        ...(hasFiles("plumbingWaterSupplyPhoto")           && { defectPhoto:  getFiles("plumbingWaterSupplyPhoto") })
      },
      leakage: {
        ...(body.plumbingLeakage         !== undefined && { isPresent:    toBool(body.plumbingLeakage) }),
        ...(body.plumbingLeakageLocation !== undefined && { location:     body.plumbingLeakageLocation || null }),
        ...(body.plumbingLeakageDefect   !== undefined && { defectReport: body.plumbingLeakageDefect   || null }),
        ...(hasFiles("plumbingLeakagePhoto")           && { defectPhoto:  getFiles("plumbingLeakagePhoto") })
      },
      ...(body.plumbingRemarks !== undefined && { remarks: body.plumbingRemarks || null })
    };
  }

  if (
    hasAny("electricalSwitchQuality", "electricalSwitchRemarks", "electricalPowerSupply",
      "electricalPowerRemarks", "electricalVoltage", "electricalVoltageRemarks",
      "electricalEarthingTest", "electricalEarthingProper", "electricalELCB", "electricalRemarks") ||
    hasFiles("electricalSwitchPhoto", "electricalPowerPhoto", "electricalVoltagePhoto",
      "electricalEarthingPhoto", "electricalELCBPhoto")
  ) {
    data.electricalSystem = {
      switchQuality: {
        ...(body.electricalSwitchQuality !== undefined && { isOk:        toBool(body.electricalSwitchQuality) }),
        ...(body.electricalSwitchRemarks !== undefined && { remarks:     body.electricalSwitchRemarks || null }),
        ...(hasFiles("electricalSwitchPhoto")          && { defectPhoto: getFiles("electricalSwitchPhoto") })
      },
      powerSupply: {
        ...(body.electricalPowerSupply  !== undefined && { isProper:    toBool(body.electricalPowerSupply) }),
        ...(body.electricalPowerRemarks !== undefined && { remarks:     body.electricalPowerRemarks || null }),
        ...(hasFiles("electricalPowerPhoto")          && { defectPhoto: getFiles("electricalPowerPhoto") })
      },
      voltageFluctuation: {
        ...(body.electricalVoltage        !== undefined && { isPresent:   toBool(body.electricalVoltage) }),
        ...(body.electricalVoltageRemarks !== undefined && { remarks:     body.electricalVoltageRemarks || null }),
        ...(hasFiles("electricalVoltagePhoto")         && { defectPhoto:  getFiles("electricalVoltagePhoto") })
      },
      earthing: {
        ...(body.electricalEarthingTest   !== undefined && { isTestDone:  toBool(body.electricalEarthingTest) }),
        ...(body.electricalEarthingProper !== undefined && { isProper:    body.electricalEarthingProper || null }),
        ...(hasFiles("electricalEarthingPhoto")        && { defectPhoto:  getFiles("electricalEarthingPhoto") })
      },
      elcb: {
        ...(body.electricalELCB !== undefined && { isWorking:   body.electricalELCB || null }),
        ...(hasFiles("electricalELCBPhoto")  && { defectPhoto: getFiles("electricalELCBPhoto") })
      },
      ...(body.electricalRemarks !== undefined && { remarks: body.electricalRemarks || null })
    };
  }

  if (
    hasAny("dwQuality", "dwQualityRemarks", "dwOperation", "dwOperationRemarks", "dwRemarks") ||
    hasFiles("dwQualityPhoto", "dwOperationPhoto")
  ) {
    data.doorsWindows = {
      quality: {
        ...(body.dwQuality        !== undefined && { isOk:        toBool(body.dwQuality) }),
        ...(body.dwQualityRemarks !== undefined && { remarks:     body.dwQualityRemarks || null }),
        ...(hasFiles("dwQualityPhoto")          && { defectPhoto: getFiles("dwQualityPhoto") })
      },
      operation: {
        ...(body.dwOperation        !== undefined && { isProper:    toBool(body.dwOperation) }),
        ...(body.dwOperationRemarks !== undefined && { remarks:     body.dwOperationRemarks || null }),
        ...(hasFiles("dwOperationPhoto")          && { defectPhoto: getFiles("dwOperationPhoto") })
      },
      ...(body.dwRemarks !== undefined && { remarks: body.dwRemarks || null })
    };
  }

  if (
  hasAny("liftWorking", "liftWorkingRemarks", "liftSafety", "liftSafetyRemarks", "liftRemarks") ||
  hasFiles("liftWorkingPhoto", "liftSafetyPhoto", "liftCertificatePhoto") // ← ADD liftCertificatePhoto
) {
  data.lifts = {
    working: {
      ...(body.liftWorking        !== undefined && { isWorking:   toBool(body.liftWorking) }),
      ...(body.liftWorkingRemarks !== undefined && { remarks:     body.liftWorkingRemarks || null }),
      ...(hasFiles("liftWorkingPhoto")          && { defectPhoto: getFiles("liftWorkingPhoto") })
    },
    safety: {
      ...(body.liftSafety        !== undefined && { isWorking:   toBool(body.liftSafety) }),
      ...(body.liftSafetyRemarks !== undefined && { remarks:     body.liftSafetyRemarks || null }),
      ...(hasFiles("liftSafetyPhoto")          && { defectPhoto: getFiles("liftSafetyPhoto") })
    },
    ...(hasFiles("liftCertificatePhoto") && { certificatePhoto: getFiles("liftCertificatePhoto") }), // ← ADD
    ...(body.liftRemarks !== undefined && { remarks: body.liftRemarks || null })
  };
}

  if (body.fireSystems !== undefined || body.fireRemarks !== undefined) {
    data.fireFightingSystem = {
      // ── multiselect: always store as array ─────────────────
      ...(body.fireSystems !== undefined && {
        systems: Array.isArray(body.fireSystems)
          ? body.fireSystems
          : body.fireSystems
          ? [body.fireSystems]
          : []
      }),
      ...(body.fireRemarks !== undefined && { remarks: body.fireRemarks || null })
    };
  }

  if (
    hasAny("terraceRoofTiles", "terraceRoofTilesRemarks", "terraceDrainage", "terraceDrainageRemarks",
      "terraceLeakageTest", "terraceLeakageRemarks", "terraceTestDate", "terraceConductedBy", "terraceRemarks") ||
    hasFiles("terraceRoofTilesPhoto", "terraceDrainagePhoto", "terraceWaterproofingReport",
      "terraceLeakagePhoto", "terraceLeakageResultPhoto")
  ) {
    data.terraceInspection = {
      roofTiles: {
        ...(body.terraceRoofTiles        !== undefined && { isProper:    toBool(body.terraceRoofTiles) }),
        ...(body.terraceRoofTilesRemarks !== undefined && { remarks:     body.terraceRoofTilesRemarks || null }),
        ...(hasFiles("terraceRoofTilesPhoto")          && { defectPhoto: getFiles("terraceRoofTilesPhoto") })
      },
      drainage: {
        ...(body.terraceDrainage        !== undefined && { isProper:    toBool(body.terraceDrainage) }),
        ...(body.terraceDrainageRemarks !== undefined && { remarks:     body.terraceDrainageRemarks || null }),
        ...(hasFiles("terraceDrainagePhoto")          && { defectPhoto: getFiles("terraceDrainagePhoto") })
      },
      waterproofing: {
        ...(hasFiles("terraceWaterproofingReport") && { labReport: getFiles("terraceWaterproofingReport") })
      },
      leakageTest: {
        ...(body.terraceLeakageTest    !== undefined && { isDone:      toBool(body.terraceLeakageTest) }),
        ...(body.terraceLeakageRemarks !== undefined && { remarks:     body.terraceLeakageRemarks || null }),
        ...(body.terraceTestDate       !== undefined && { testDate:    body.terraceTestDate ? new Date(body.terraceTestDate) : null }),
        ...(body.terraceConductedBy    !== undefined && { conductedBy: body.terraceConductedBy || null }),
        ...(hasFiles("terraceLeakagePhoto")       && { defectPhoto: getFiles("terraceLeakagePhoto") }),
        ...(hasFiles("terraceLeakageResultPhoto") && { resultPhoto: getFiles("terraceLeakageResultPhoto") })
      },
      ...(body.terraceRemarks !== undefined && { remarks: body.terraceRemarks || null })
    };
  }

  return updateBuildingInspectionDB(id, data, userId, roleId, ipAddress);
};

// ─── GET ALL ──────────────────────────────────────────────────────────────
export const getAllBuildingInspectionUsecase = async (projectId: string) => {
  return getAllBuildingInspectionDB(projectId);
};

// ─── GET LATEST BY PROJECT ID ─────────────────────────────────────────────
export const getBuildingInspectionByProjectIdUsecase = async (
  projectId: string
) => {
  const data = await getBuildingInspectionByProjectIdDB(projectId);

  if (!data || data.length === 0) {
    throw new Error("Building inspection record not found");
  }

  return data[0]; // return the single latest record (not an array)
};

// ─── UPDATE ───────────────────────────────────────────────────────────────


// ─── DELETE ───────────────────────────────────────────────────────────────
export const deleteBuildingInspectionUsecase = async (id: string) => {
  return deleteBuildingInspectionDB(id);
};

export const getBuildingInspectionSetupUsecase = async (projectId: string) => {
  return getBuildingInspectionSetupService(projectId);
};


export const getBuildingInspectionByIdUsecase = async (
  buildingInspectionId: string
) => {
  return getBuildingInspectionByIdDB(buildingInspectionId);
};

export const getBuildingInspectionByFloorUsecase = async (
  floorId: string
) => {
  return getBuildingInspectionByFloorService(floorId);
};