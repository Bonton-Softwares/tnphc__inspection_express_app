import {
  createTakeoverBuildingInspectionDB,
  getAllTakeoverBuildingInspectionDB,
  getTakeoverBuildingInspectionByIdDB,
  getTakeoverBuildingInspectionByProjectIdDB,
  updateTakeoverBuildingInspectionDB,
  deleteTakeoverBuildingInspectionDB,
  getTakeoverBuildingInspectionSetupService,
  getTakeoverBuildingInspectionByFloorService
} from "./takeoverBuildingInspection.service";

const toBool = (val: any): boolean | null => {
  if (val === undefined || val === null) return null;
  if (val === true  || val === "true")  return true;
  if (val === false || val === "false") return false;
  return null;
};

// ─── CREATE ───────────────────────────────────────────────────────────────
export const createTakeoverBuildingInspectionUsecase = async (
  body: any,
  files: any,
  req: any,
  userId?: string
) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;

  const getFiles = (field: string) =>
    (files?.[field] || []).map((file: any) => ({
      fileName: file.filename,
      url: `${baseUrl}/uploads/${file.filename}`
    }));

  /**
   * STATUS LOGIC:
   * "yes" → include photos + details + remarks
   * "no"  → include only remarks, set photos/details to null
   * other → entire section fields null
   */
  const buildSection = (
    status: string | undefined,
    yesData: object,
    noData: object
  ) => {
    if (status === "yes") return { status: "yes", ...yesData };
    if (status === "no")  return { status: "no",  ...noData };
    return null;
  };

  const data = {
    projectId: body.projectId,
  blockId:   body.blockId ?? null,   // ← add
  floorId:   body.floorId ?? null,   // ← add
  roomNo:    body.roomNo  ?? null,   // ← add
    // ── STRUCTURE ──────────────────────────────────────────────────────────
    structure: buildSection(
      body.structureStatus,
      {
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
      { remarks: body.structureRemarks || null }
    ),

    // ── PAINTING ───────────────────────────────────────────────────────────
    painting: buildSection(
      body.paintingStatus,
      {
        isQualityOk:  toBool(body.paintingIsQualityOk),
        defectPhoto:  getFiles("paintingDefectPhoto"),
        location:     body.paintingLocation     || null,
        defectReport: body.paintingDefectReport || null,
        remarks:      body.paintingRemarks      || null
      },
      { remarks: body.paintingRemarks || null }
    ),

    // ── TILING & FLOORING ──────────────────────────────────────────────────
    tilingFlooring: buildSection(
      body.tilingStatus,
      {
        isQualityOk:  toBool(body.tilingIsQualityOk),
        defectPhoto:  getFiles("tilingDefectPhoto"),
        location:     body.tilingLocation     || null,
        defectReport: body.tilingDefectReport || null,
        remarks:      body.tilingRemarks      || null
      },
      { remarks: body.tilingRemarks || null }
    ),

    // ── FALSE CEILING ──────────────────────────────────────────────────────
    falseCeiling: buildSection(
      body.falseCeilingStatus,
      {
        isQualityOk:  toBool(body.falseCeilingIsQualityOk),
        defectPhoto:  getFiles("falseCeilingDefectPhoto"),
        location:     body.falseCeilingLocation     || null,
        defectReport: body.falseCeilingDefectReport || null,
        remarks:      body.falseCeilingRemarks      || null
      },
      { remarks: body.falseCeilingRemarks || null }
    ),

    // ── PLUMBING SYSTEM ────────────────────────────────────────────────────
    plumbingSystem: buildSection(
      body.plumbingStatus,
      {
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
      { remarks: body.plumbingRemarks || null }
    ),

    // ── ELECTRICAL SYSTEM ──────────────────────────────────────────────────
    electricalSystem: buildSection(
      body.electricalStatus,
      {
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
      { remarks: body.electricalRemarks || null }
    ),

    // ── DOORS & WINDOWS ────────────────────────────────────────────────────
    doorsWindows: buildSection(
      body.dwStatus,
      {
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
      { remarks: body.dwRemarks || null }
    ),

    // ── LIFTS ──────────────────────────────────────────────────────────────
    lifts: buildSection(
      body.liftStatus,
      {
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
        remarks: body.liftRemarks || null
      },
      { remarks: body.liftRemarks || null }
    ),

    // ── FIRE FIGHTING SYSTEM ───────────────────────────────────────────────
    fireFightingSystem: buildSection(
      body.fireStatus,
      {
        systems: Array.isArray(body.fireSystems)
          ? body.fireSystems
          : body.fireSystems ? [body.fireSystems] : [],
        remarks: body.fireRemarks || null
      },
      { remarks: body.fireRemarks || null }
    ),

    // ── TERRACE INSPECTION ─────────────────────────────────────────────────
    terraceInspection: buildSection(
      body.terraceStatus,
      {
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
          isDone:      toBool(body.terraceLeakageTest),
          remarks:     body.terraceLeakageRemarks    || null,
          defectPhoto: getFiles("terraceLeakagePhoto"),
          resultPhoto: getFiles("terraceLeakageResultPhoto"),
          testDate:    body.terraceTestDate ? new Date(body.terraceTestDate) : null,
          conductedBy: body.terraceConductedBy || null
        },
        remarks: body.terraceRemarks || null
      },
      { remarks: body.terraceRemarks || null }
    ),

    createdById: userId
  };
  const roleId = req.user?.roleId;                                              // ← add
const ipAddress = req.ip ?? req.headers["x-forwarded-for"]?.toString();       // ← add

return createTakeoverBuildingInspectionDB(data, userId, roleId, ipAddress);   // ← pass extra args


  return createTakeoverBuildingInspectionDB(data);
};


export const getTakeoverBuildingInspectionSetupUsecase = async (projectId: string) => {
  return getTakeoverBuildingInspectionSetupService(projectId);
};
// ─── GET ALL ──────────────────────────────────────────────────────────────
export const getAllTakeoverBuildingInspectionUsecase = async (projectId: string) => {
  return getAllTakeoverBuildingInspectionDB(projectId);
};

// ─── GET BY ID ────────────────────────────────────────────────────────────
export const getTakeoverBuildingInspectionByIdUsecase = async (id: string) => {
  const data = await getTakeoverBuildingInspectionByIdDB(id);
  if (!data) throw new Error("Takeover building inspection record not found");
  return data;
};

// ─── GET LATEST BY PROJECT ID ─────────────────────────────────────────────
export const getTakeoverBuildingInspectionByProjectIdUsecase = async (
  projectId: string
) => {
  const data = await getTakeoverBuildingInspectionByProjectIdDB(projectId);

  if (!data || data.length === 0) {
    throw new Error("Takeover building inspection record not found");
  }

  return data[0]; // return the single latest record (not an array)
};

// ─── UPDATE ───────────────────────────────────────────────────────────────
export const updateTakeoverBuildingInspectionUsecase = async (
  id: string,
  body: any,
  files: any,
  req: any,
  userId?: string
) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
    const roleId = req.user?.roleId;                                            // ← add
  const ipAddress = req.ip ?? req.headers["x-forwarded-for"]?.toString();

  const getFiles = (field: string) =>
    (files?.[field] || []).map((file: any) => ({
      fileName: file.filename,
      url: `${baseUrl}/uploads/${file.filename}`
    }));

  const hasAny = (...keys: string[]) => keys.some(k => body[k] !== undefined);
  const hasFiles = (...fields: string[]) => fields.some(f => (files?.[f] || []).length > 0);

  const data: any = { updatedById: userId };

  // ── STRUCTURE ─────────────────────────────────────────────────────────────
  if (body.structureStatus !== undefined) {
    if (body.structureStatus === "yes") {
      data.structure = {
        status: "yes",
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
    } else if (body.structureStatus === "no") {
      data.structure = { status: "no", remarks: body.structureRemarks || null };
    } else {
      data.structure = null;
    }
  } else if (
    hasAny("structureAlignment", "structureLocation", "structureDefectReport", "structureRemarks") ||
    hasFiles("structureAlignmentPhoto","structureConcreteCubeReport","structureCementReport",
      "structureSteelReport","structureWaterReport","structureSandReport",
      "structureAggregateReport","structureBricksReport")
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

  // ── PAINTING ──────────────────────────────────────────────────────────────
  if (body.paintingStatus !== undefined) {
    if (body.paintingStatus === "yes") {
      data.painting = {
        status: "yes",
        ...(body.paintingIsQualityOk  !== undefined && { isQualityOk:  toBool(body.paintingIsQualityOk) }),
        ...(body.paintingLocation     !== undefined && { location:     body.paintingLocation     || null }),
        ...(body.paintingDefectReport !== undefined && { defectReport: body.paintingDefectReport || null }),
        ...(body.paintingRemarks      !== undefined && { remarks:      body.paintingRemarks      || null }),
        ...(hasFiles("paintingDefectPhoto")         && { defectPhoto:  getFiles("paintingDefectPhoto") })
      };
    } else if (body.paintingStatus === "no") {
      data.painting = { status: "no", remarks: body.paintingRemarks || null };
    } else {
      data.painting = null;
    }
  } else if (
    hasAny("paintingIsQualityOk","paintingLocation","paintingDefectReport","paintingRemarks") ||
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

  // ── TILING & FLOORING ─────────────────────────────────────────────────────
  if (body.tilingStatus !== undefined) {
    if (body.tilingStatus === "yes") {
      data.tilingFlooring = {
        status: "yes",
        ...(body.tilingIsQualityOk  !== undefined && { isQualityOk:  toBool(body.tilingIsQualityOk) }),
        ...(body.tilingLocation     !== undefined && { location:     body.tilingLocation     || null }),
        ...(body.tilingDefectReport !== undefined && { defectReport: body.tilingDefectReport || null }),
        ...(body.tilingRemarks      !== undefined && { remarks:      body.tilingRemarks      || null }),
        ...(hasFiles("tilingDefectPhoto")           && { defectPhoto:  getFiles("tilingDefectPhoto") })
      };
    } else if (body.tilingStatus === "no") {
      data.tilingFlooring = { status: "no", remarks: body.tilingRemarks || null };
    } else {
      data.tilingFlooring = null;
    }
  } else if (
    hasAny("tilingIsQualityOk","tilingLocation","tilingDefectReport","tilingRemarks") ||
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

  // ── FALSE CEILING ─────────────────────────────────────────────────────────
  if (body.falseCeilingStatus !== undefined) {
    if (body.falseCeilingStatus === "yes") {
      data.falseCeiling = {
        status: "yes",
        ...(body.falseCeilingIsQualityOk  !== undefined && { isQualityOk:  toBool(body.falseCeilingIsQualityOk) }),
        ...(body.falseCeilingLocation     !== undefined && { location:     body.falseCeilingLocation     || null }),
        ...(body.falseCeilingDefectReport !== undefined && { defectReport: body.falseCeilingDefectReport || null }),
        ...(body.falseCeilingRemarks      !== undefined && { remarks:      body.falseCeilingRemarks      || null }),
        ...(hasFiles("falseCeilingDefectPhoto")           && { defectPhoto:  getFiles("falseCeilingDefectPhoto") })
      };
    } else if (body.falseCeilingStatus === "no") {
      data.falseCeiling = { status: "no", remarks: body.falseCeilingRemarks || null };
    } else {
      data.falseCeiling = null;
    }
  } else if (
    hasAny("falseCeilingIsQualityOk","falseCeilingLocation","falseCeilingDefectReport","falseCeilingRemarks") ||
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

  // ── PLUMBING SYSTEM ───────────────────────────────────────────────────────
  if (body.plumbingStatus !== undefined) {
    if (body.plumbingStatus === "yes") {
      data.plumbingSystem = {
        status: "yes",
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
    } else if (body.plumbingStatus === "no") {
      data.plumbingSystem = { status: "no", remarks: body.plumbingRemarks || null };
    } else {
      data.plumbingSystem = null;
    }
  } else if (
    hasAny("plumbingWaterSupply","plumbingWaterSupplyLocation","plumbingWaterSupplyDefect",
      "plumbingLeakage","plumbingLeakageLocation","plumbingLeakageDefect","plumbingRemarks") ||
    hasFiles("plumbingWaterSupplyPhoto","plumbingLeakagePhoto")
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

  // ── ELECTRICAL SYSTEM ─────────────────────────────────────────────────────
  if (body.electricalStatus !== undefined) {
    if (body.electricalStatus === "yes") {
      data.electricalSystem = {
        status: "yes",
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
          ...(body.electricalELCB !== undefined  && { isWorking:   body.electricalELCB || null }),
          ...(hasFiles("electricalELCBPhoto")    && { defectPhoto: getFiles("electricalELCBPhoto") })
        },
        ...(body.electricalRemarks !== undefined && { remarks: body.electricalRemarks || null })
      };
    } else if (body.electricalStatus === "no") {
      data.electricalSystem = { status: "no", remarks: body.electricalRemarks || null };
    } else {
      data.electricalSystem = null;
    }
  } else if (
    hasAny("electricalSwitchQuality","electricalSwitchRemarks","electricalPowerSupply","electricalPowerRemarks",
      "electricalVoltage","electricalVoltageRemarks","electricalEarthingTest","electricalEarthingProper",
      "electricalELCB","electricalRemarks") ||
    hasFiles("electricalSwitchPhoto","electricalPowerPhoto","electricalVoltagePhoto","electricalEarthingPhoto","electricalELCBPhoto")
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
        ...(body.electricalELCB !== undefined  && { isWorking:   body.electricalELCB || null }),
        ...(hasFiles("electricalELCBPhoto")    && { defectPhoto: getFiles("electricalELCBPhoto") })
      },
      ...(body.electricalRemarks !== undefined && { remarks: body.electricalRemarks || null })
    };
  }

  // ── DOORS & WINDOWS ───────────────────────────────────────────────────────
  if (body.dwStatus !== undefined) {
    if (body.dwStatus === "yes") {
      data.doorsWindows = {
        status: "yes",
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
    } else if (body.dwStatus === "no") {
      data.doorsWindows = { status: "no", remarks: body.dwRemarks || null };
    } else {
      data.doorsWindows = null;
    }
  } else if (
    hasAny("dwQuality","dwQualityRemarks","dwOperation","dwOperationRemarks","dwRemarks") ||
    hasFiles("dwQualityPhoto","dwOperationPhoto")
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

  // ── LIFTS ─────────────────────────────────────────────────────────────────
  if (body.liftStatus !== undefined) {
    if (body.liftStatus === "yes") {
      data.lifts = {
        status: "yes",
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
        ...(body.liftRemarks !== undefined && { remarks: body.liftRemarks || null })
      };
    } else if (body.liftStatus === "no") {
      data.lifts = { status: "no", remarks: body.liftRemarks || null };
    } else {
      data.lifts = null;
    }
  } else if (
    hasAny("liftWorking","liftWorkingRemarks","liftSafety","liftSafetyRemarks","liftRemarks") ||
    hasFiles("liftWorkingPhoto","liftSafetyPhoto")
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
      ...(body.liftRemarks !== undefined && { remarks: body.liftRemarks || null })
    };
  }

  // ── FIRE FIGHTING SYSTEM ──────────────────────────────────────────────────
  if (body.fireStatus !== undefined) {
    if (body.fireStatus === "yes") {
      data.fireFightingSystem = {
        status: "yes",
        systems: Array.isArray(body.fireSystems)
          ? body.fireSystems
          : body.fireSystems ? [body.fireSystems] : [],
        ...(body.fireRemarks !== undefined && { remarks: body.fireRemarks || null })
      };
    } else if (body.fireStatus === "no") {
      data.fireFightingSystem = { status: "no", remarks: body.fireRemarks || null };
    } else {
      data.fireFightingSystem = null;
    }
  } else if (body.fireSystems !== undefined || body.fireRemarks !== undefined) {
    data.fireFightingSystem = {
      ...(body.fireSystems !== undefined && {
        systems: Array.isArray(body.fireSystems)
          ? body.fireSystems
          : body.fireSystems ? [body.fireSystems] : []
      }),
      ...(body.fireRemarks !== undefined && { remarks: body.fireRemarks || null })
    };
  }

  // ── TERRACE INSPECTION ────────────────────────────────────────────────────
  if (body.terraceStatus !== undefined) {
    if (body.terraceStatus === "yes") {
      data.terraceInspection = {
        status: "yes",
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
          ...(hasFiles("terraceLeakagePhoto")        && { defectPhoto: getFiles("terraceLeakagePhoto") }),
          ...(hasFiles("terraceLeakageResultPhoto")  && { resultPhoto: getFiles("terraceLeakageResultPhoto") })
        },
        ...(body.terraceRemarks !== undefined && { remarks: body.terraceRemarks || null })
      };
    } else if (body.terraceStatus === "no") {
      data.terraceInspection = { status: "no", remarks: body.terraceRemarks || null };
    } else {
      data.terraceInspection = null;
    }
  } else if (
    hasAny("terraceRoofTiles","terraceRoofTilesRemarks","terraceDrainage","terraceDrainageRemarks",
      "terraceLeakageTest","terraceLeakageRemarks","terraceTestDate","terraceConductedBy","terraceRemarks") ||
    hasFiles("terraceRoofTilesPhoto","terraceDrainagePhoto","terraceWaterproofingReport",
      "terraceLeakagePhoto","terraceLeakageResultPhoto")
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
        ...(hasFiles("terraceLeakagePhoto")        && { defectPhoto: getFiles("terraceLeakagePhoto") }),
        ...(hasFiles("terraceLeakageResultPhoto")  && { resultPhoto: getFiles("terraceLeakageResultPhoto") })
      },
      ...(body.terraceRemarks !== undefined && { remarks: body.terraceRemarks || null })
    };
  }

   return updateTakeoverBuildingInspectionDB(id, data, userId, roleId, ipAddress); 
};

// ─── DELETE ───────────────────────────────────────────────────────────────
export const deleteTakeoverBuildingInspectionUsecase = async (
  id: string,
  req: any,        // ← add
  userId?: string  // ← add
) => {
  const roleId = req.user?.roleId;                                            // ← add
  const ipAddress = req.ip ?? req.headers["x-forwarded-for"]?.toString();     // ← add
  return deleteTakeoverBuildingInspectionDB(id, userId, roleId, ipAddress);   // ← pass audit args
}

export const getTakeoverBuildingInspectionByFloorUsecase = async (
  floorId: string
) => {
  return getTakeoverBuildingInspectionByFloorService(floorId);
};