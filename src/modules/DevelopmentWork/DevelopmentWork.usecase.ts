import {
  createDevelopmentWorkDB,
  getAllDevelopmentWorkDB,
  getDevelopmentWorkByIdDB,
  getDevelopmentWorkByProjectIdDB,
  updateDevelopmentWorkDB,
  deleteDevelopmentWorkDB
} from "./DevelopmentWork.service";

// ─── helper: coerce "true"/"false" strings → boolean | null ───────────────
const toBool = (val: any): boolean | null => {
  if (val === undefined || val === null) return null;

  // boolean
  if (val === true || val === false) return val;

  // string values
  if (val === "true" || val === "yes" || val === "1") return true;
  if (val === "false" || val === "no" || val === "0") return false;

  return null;
};

// ─── CREATE ───────────────────────────────────────────────────────────────
export const createDevelopmentWorkUsecase = async (
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

  const data = {
    projectId: body.projectId,

    // SUMP & PUMP ROOM
    sumpPump: {
      completionPercentage: body.completionPercentage || null,

      sumpCapacity: toBool(body.sumpCapacity)
        ? {
            value: true,
            remarks: body.sumpCapacityRemarks || null,
            photos: getFiles("sumpCapacityPhotos"),
          }
        : { value: false },

      sumpQuality: toBool(body.sumpQuality)
        ? {
            value: true,
            remarks: body.sumpQualityRemarks || null,
            photos: getFiles("sumpQualityPhotos"),
          }
        : { value: false },

      pumpsAsPerSpec: toBool(body.pumpsAsPerSpec)
        ? {
            value: true,
            remarks: body.pumpsSpecRemarks || null,
            photos: getFiles("pumpsSpecPhotos"),
          }
        : { value: false },

      standbyPumps: toBool(body.standbyPumps)
        ? {
            value: true,
            remarks: body.standbyPumpsRemarks || null,
            photos: getFiles("standbyPumpsPhotos"),
          }
        : { value: false },

      pumpsWorking: toBool(body.pumpsWorking)
        ? {
            value: true,
            remarks: body.pumpsWorkingRemarks || null,
            photos: getFiles("pumpsWorkingPhotos"),
          }
        : { value: false },
    },

    // BOREWELL
    borewell: {
      completionPercentage: body.borewellCompletionPercentage || null,
      depth: body.borewellDepth || null,

      isWorking: toBool(body.borewellWorking)
        ? {
            value: true,
            remarks: body.borewellRemarks || null,
            photos: getFiles("borewellPhotos"),
          }
        : { value: false },

      waterQuality: body.waterQuality || null,
      labReport: getFiles("borewellLabReport"),
    },

    // INSPECTION CHAMBER
    inspectionChamber: {
      completionPercentage: body.inspectionChamberCompletionPercentage || null,

      isProper: toBool(body.inspectionChamberProper)
        ? {
            value: true,
            remarks: body.inspectionChamberRemarks || null,
          }
        : { value: false },
    },

    // STORM WATER DRAINS
    stormWaterDrains: {
      completionPercentage: body.stormWaterCompletionPercentage || null,

      isProper: toBool(body.stormWaterDrainsProper)
        ? {
            value: true,
            remarks: body.stormWaterDrainsRemarks || null,
          }
        : { value: false },
    },

    // SULLAGE DRAIN
    sullageDrain: {
      completionPercentage: body.sullageDrainCompletionPercentage || null,

      isProper: toBool(body.sullageDrainProper)
        ? {
            value: true,
            remarks: body.sullageDrainRemarks || null,
          }
        : { value: false },
    },

    // ROAD
    road: body.roadType
      ? {
          roadType: body.roadType,
          quality: body.roadQuality || null,
          photos: getFiles("roadPhotos"),
        }
      : null,

    // PAVER BLOCKS / PCC OUTDOOR FLOORING
    paverBlock: {
      completionPercentage: body.paverBlockCompletionPercentage || null,

      isProper: toBool(body.paverBlockProper)
        ? {
            value: true,
            remarks: body.paverBlockRemarks || null,
          }
        : { value: false },
    },

    // COMPOUND WALL
    compoundWall: {
      quality: toBool(body.compoundWallQuality)
        ? {
            value: true,
            remarks: body.compoundWallQualityRemarks || null,
            photos: getFiles("compoundWallQualityPhotos"),
          }
        : { value: false },

      expansionJoints: toBool(body.compoundWallExpansionJoints)
        ? {
            value: true,
            remarks: body.compoundWallExpansionRemarks || null,
            photos: getFiles("compoundWallExpansionPhotos"),
          }
        : { value: false },

      airVents: toBool(body.compoundWallAirVents)
        ? {
            value: true,
            remarks: body.compoundWallAirVentsRemarks || null,
            photos: getFiles("compoundWallAirVentsPhotos"),
          }
        : { value: false },
    },

    // RAIN WATER HARVESTING
    rainWaterHarvesting: {
      completionPercentage: body.rainWaterCompletionPercentage || null,
      numberOfPits: body.rainWaterPits || null,

      isProper: toBool(body.rainWaterProper)
        ? {
            value: true,
            remarks: body.rainWaterRemarks || null,
          }
        : { value: false },
    },

    // LANDSCAPING
    landScaping: {
      completionPercentage: body.landScapingCompletionPercentage || null,

      isProper: toBool(body.landScapingProper)
        ? {
            value: true,
            remarks: body.landScapingRemarks || null,
          }
        : { value: false },
    },

    // OTHER DEFECTS
    otherDefects: {
      description: body.otherDefectsDescription || null,
      category: body.otherDefectsCategory || null,
      location: body.otherDefectsLocation || null,
      photos: getFiles("otherDefectsPhotos"),
    },

    // GENERAL REMARKS
    generalRemarks: {
      remarks: body.generalRemarks || null,
    },

    createdById: userId
  };

  return createDevelopmentWorkDB(data);
};

// ─── GET ALL ──────────────────────────────────────────────────────────────
export const getAllDevelopmentWorkUsecase = async (projectId: string) => {
  return getAllDevelopmentWorkDB(projectId);
};

// ─── GET BY ID ────────────────────────────────────────────────────────────
export const getDevelopmentWorkByIdUsecase = async (id: string) => {
  const data = await getDevelopmentWorkByIdDB(id);

  if (!data) {
    throw new Error("Development work record not found");
  }

  return data;
};

// ─── GET BY PROJECT ID ────────────────────────────────────────────────────
export const getDevelopmentWorkByProjectIdUsecase = async (
  projectId: string
) => {
  const data = await getDevelopmentWorkByProjectIdDB(projectId);

  if (!data) {
    throw new Error("Development work record not found");
  }

  return data;
};

// ─── UPDATE ───────────────────────────────────────────────────────────────
export const updateDevelopmentWorkUsecase = async (
  id: string,
  body: any,
  files: any,
  req: any,
  userId?: string
) => {
  const existing = await getDevelopmentWorkByIdDB(id);

  if (!existing) {
    throw new Error("Development work not found");
  }

  const baseUrl = `${req.protocol}://${req.get("host")}`;

  const getFiles = (field: string) =>
    (files?.[field] || []).map((file: any) => ({
      fileName: file.filename,
      url: `${baseUrl}/uploads/${file.filename}`
    }));

  const data: any = {
    updatedById: userId
  };

  // ================= SUMP PUMP =================

  data.sumpPump = {
    ...(existing as any).sumpPump,

    ...(body.completionPercentage !== undefined && {
      completionPercentage: body.completionPercentage
    }),

    ...(body.sumpCapacity !== undefined && {
      sumpCapacity: {
        value: toBool(body.sumpCapacity),
        remarks: body.sumpCapacityRemarks || null,
        photos:
          getFiles("sumpCapacityPhotos").length > 0
            ? getFiles("sumpCapacityPhotos")
            : (existing as any)?.sumpPump?.sumpCapacity?.photos || [],
      },
    }),

    ...(body.sumpQuality !== undefined && {
      sumpQuality: {
        value: toBool(body.sumpQuality),
        remarks: body.sumpQualityRemarks || null,
        photos:
          getFiles("sumpQualityPhotos").length > 0
            ? getFiles("sumpQualityPhotos")
            : (existing as any)?.sumpPump?.sumpQuality?.photos || [],
      },
    }),

    ...(body.pumpsAsPerSpec !== undefined && {
      pumpsAsPerSpec: {
        value: toBool(body.pumpsAsPerSpec),
        remarks: body.pumpsSpecRemarks || null,
        photos:
          getFiles("pumpsSpecPhotos").length > 0
            ? getFiles("pumpsSpecPhotos")
            : (existing as any)?.sumpPump?.pumpsAsPerSpec?.photos || [],
      },
    }),

    ...(body.standbyPumps !== undefined && {
      standbyPumps: {
        value: toBool(body.standbyPumps),
        remarks: body.standbyPumpsRemarks || null,
        photos:
          getFiles("standbyPumpsPhotos").length > 0
            ? getFiles("standbyPumpsPhotos")
            : (existing as any)?.sumpPump?.standbyPumps?.photos || [],
      },
    }),

    ...(body.pumpsWorking !== undefined && {
      pumpsWorking: {
        value: toBool(body.pumpsWorking),
        remarks: body.pumpsWorkingRemarks || null,
        photos:
          getFiles("pumpsWorkingPhotos").length > 0
            ? getFiles("pumpsWorkingPhotos")
            : (existing as any)?.sumpPump?.pumpsWorking?.photos || [],
      },
    }),
  };

  // ================= BOREWELL =================

  data.borewell = {
    ...(existing as any).borewell,

    ...(body.borewellCompletionPercentage !== undefined && {
      completionPercentage: body.borewellCompletionPercentage,
    }),

    ...(body.borewellDepth !== undefined && {
      depth: body.borewellDepth,
    }),

    ...(body.borewellWorking !== undefined && {
      isWorking: {
        value: toBool(body.borewellWorking),
        remarks: body.borewellRemarks || null,
        photos:
          getFiles("borewellPhotos").length > 0
            ? getFiles("borewellPhotos")
            : (existing as any)?.borewell?.isWorking?.photos || [],
      },
    }),

    ...(body.waterQuality !== undefined && {
      waterQuality: body.waterQuality,
    }),

    ...(getFiles("borewellLabReport").length > 0 && {
      labReport: getFiles("borewellLabReport"),
    }),
  };

  // ================= INSPECTION CHAMBER =================

  data.inspectionChamber = {
    ...(existing as any).inspectionChamber,

    ...(body.inspectionChamberCompletionPercentage !== undefined && {
      completionPercentage: body.inspectionChamberCompletionPercentage,
    }),

    ...(body.inspectionChamberProper !== undefined && {
      isProper: {
        value: toBool(body.inspectionChamberProper),
        remarks: body.inspectionChamberRemarks || null,
      },
    }),
  };

  // ================= STORM WATER =================

  data.stormWaterDrains = {
    ...(existing as any).stormWaterDrains,

    ...(body.stormWaterCompletionPercentage !== undefined && {
      completionPercentage: body.stormWaterCompletionPercentage,
    }),

    ...(body.stormWaterDrainsProper !== undefined && {
      isProper: {
        value: toBool(body.stormWaterDrainsProper),
        remarks: body.stormWaterDrainsRemarks || null,
      },
    }),
  };

  // ================= SULLAGE =================

  data.sullageDrain = {
    ...(existing as any).sullageDrain,

    ...(body.sullageDrainCompletionPercentage !== undefined && {
      completionPercentage: body.sullageDrainCompletionPercentage,
    }),

    ...(body.sullageDrainProper !== undefined && {
      isProper: {
        value: toBool(body.sullageDrainProper),
        remarks: body.sullageDrainRemarks || null,
      },
    }),
  };

  // ================= ROAD =================

  data.road = {
    ...(existing as any).road,

    ...(body.roadType !== undefined && {
      roadType: body.roadType,
    }),

    ...(body.roadQuality !== undefined && {
      quality: body.roadQuality,
    }),

    ...(getFiles("roadPhotos").length > 0 && {
      photos: getFiles("roadPhotos"),
    }),
  };

  // ================= PAVER BLOCK =================

  data.paverBlock = {
    ...(existing as any).paverBlock,

    ...(body.paverBlockCompletionPercentage !== undefined && {
      completionPercentage: body.paverBlockCompletionPercentage,
    }),

    ...(body.paverBlockProper !== undefined && {
      isProper: {
        value: toBool(body.paverBlockProper),
        remarks: body.paverBlockRemarks || null,
      },
    }),
  };

  // ================= COMPOUND WALL =================

  data.compoundWall = {
    ...(existing as any).compoundWall,

    ...(body.compoundWallQuality !== undefined && {
      quality: {
        value: toBool(body.compoundWallQuality),
        remarks: body.compoundWallQualityRemarks || null,
        photos:
          getFiles("compoundWallQualityPhotos").length > 0
            ? getFiles("compoundWallQualityPhotos")
            : (existing as any)?.compoundWall?.quality?.photos || [],
      },
    }),

    ...(body.compoundWallExpansionJoints !== undefined && {
      expansionJoints: {
        value: toBool(body.compoundWallExpansionJoints),
        remarks: body.compoundWallExpansionRemarks || null,
        photos:
          getFiles("compoundWallExpansionPhotos").length > 0
            ? getFiles("compoundWallExpansionPhotos")
            : (existing as any)?.compoundWall?.expansionJoints?.photos || [],
      },
    }),

    ...(body.compoundWallAirVents !== undefined && {
      airVents: {
        value: toBool(body.compoundWallAirVents),
        remarks: body.compoundWallAirVentsRemarks || null,
        photos:
          getFiles("compoundWallAirVentsPhotos").length > 0
            ? getFiles("compoundWallAirVentsPhotos")
            : (existing as any)?.compoundWall?.airVents?.photos || [],
      },
    }),
  };

  // ================= RAIN WATER =================

  data.rainWaterHarvesting = {
    ...(existing as any).rainWaterHarvesting,

    ...(body.rainWaterCompletionPercentage !== undefined && {
      completionPercentage: body.rainWaterCompletionPercentage,
    }),

    ...(body.rainWaterPits !== undefined && {
      numberOfPits: body.rainWaterPits,
    }),

    ...(body.rainWaterProper !== undefined && {
      isProper: {
        value: toBool(body.rainWaterProper),
        remarks: body.rainWaterRemarks || null,
      },
    }),
  };

  // ================= LANDSCAPING =================

  data.landScaping = {
    ...(existing as any).landScaping,

    ...(body.landScapingCompletionPercentage !== undefined && {
      completionPercentage: body.landScapingCompletionPercentage,
    }),

    ...(body.landScapingProper !== undefined && {
      isProper: {
        value: toBool(body.landScapingProper),
        remarks: body.landScapingRemarks || null,
      },
    }),
  };

  // ================= OTHER DEFECTS =================

  data.otherDefects = {
    ...(existing as any).otherDefects,

    ...(body.otherDefectsDescription !== undefined && {
      description: body.otherDefectsDescription,
    }),

    ...(body.otherDefectsCategory !== undefined && {
      category: body.otherDefectsCategory,
    }),

    ...(body.otherDefectsLocation !== undefined && {
      location: body.otherDefectsLocation,
    }),

    ...(getFiles("otherDefectsPhotos").length > 0 && {
      photos: getFiles("otherDefectsPhotos"),
    }),
  };

  // ================= GENERAL REMARKS =================

  data.generalRemarks = {
    remarks:
      body.generalRemarks ??
      (existing as any)?.generalRemarks?.remarks ??
      null,
  };

  return updateDevelopmentWorkDB(id, data);
};

// ─── DELETE ───────────────────────────────────────────────────────────────
export const deleteDevelopmentWorkUsecase = async (id: string) => {
  return deleteDevelopmentWorkDB(id);
};