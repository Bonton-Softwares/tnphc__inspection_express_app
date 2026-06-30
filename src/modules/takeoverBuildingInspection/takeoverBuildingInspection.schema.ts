import Joi from "joi";

const statusField = Joi.string().valid("yes", "no").optional();

const fireSystemsField = Joi.alternatives()
  .try(
    Joi.array().items(Joi.string().valid("Extinguishers","Hydrants","Sprinklers","Fire Alarm System")),
    Joi.string().valid("Extinguishers","Hydrants","Sprinklers","Fire Alarm System")
  )
  .optional();

export const createTakeoverBuildingInspectionSchema = Joi.object({
  projectId: Joi.string().required(),
  blockId:   Joi.string().uuid().optional().allow(null, ""),  // ← add
  floorId:   Joi.string().uuid().optional().allow(null, ""),  // ← add
  roomNo:    Joi.string().optional().allow(null, ""),  

  // STRUCTURE
  structureStatus:       statusField,
  structureAlignment:    Joi.boolean().truthy("true").falsy("false").optional(),
  structureLocation:     Joi.string().optional().allow(null, ""),
  structureDefectReport: Joi.string().optional().allow(null, ""),
  structureRemarks:      Joi.string().optional().allow(null, ""),

  // PAINTING
  paintingStatus:       statusField,
  paintingIsQualityOk:  Joi.boolean().truthy("true").falsy("false").optional(),
  paintingLocation:     Joi.string().optional().allow(null, ""),
  paintingDefectReport: Joi.string().optional().allow(null, ""),
  paintingRemarks:      Joi.string().optional().allow(null, ""),

  // TILING & FLOORING
  tilingStatus:       statusField,
  tilingIsQualityOk:  Joi.boolean().truthy("true").falsy("false").optional(),
  tilingLocation:     Joi.string().optional().allow(null, ""),
  tilingDefectReport: Joi.string().optional().allow(null, ""),
  tilingRemarks:      Joi.string().optional().allow(null, ""),

  // FALSE CEILING
  falseCeilingStatus:       statusField,
  falseCeilingIsQualityOk:  Joi.boolean().truthy("true").falsy("false").optional(),
  falseCeilingLocation:     Joi.string().optional().allow(null, ""),
  falseCeilingDefectReport: Joi.string().optional().allow(null, ""),
  falseCeilingRemarks:      Joi.string().optional().allow(null, ""),

  // PLUMBING SYSTEM
  plumbingStatus:              statusField,
  plumbingWaterSupply:         Joi.boolean().truthy("true").falsy("false").optional(),
  plumbingWaterSupplyLocation: Joi.string().optional().allow(null, ""),
  plumbingWaterSupplyDefect:   Joi.string().optional().allow(null, ""),
  plumbingLeakage:             Joi.boolean().truthy("true").falsy("false").optional(),
  plumbingLeakageLocation:     Joi.string().optional().allow(null, ""),
  plumbingLeakageDefect:       Joi.string().optional().allow(null, ""),
  plumbingRemarks:             Joi.string().optional().allow(null, ""),

  // ELECTRICAL SYSTEM
  electricalStatus:         statusField,
  electricalSwitchQuality:  Joi.boolean().truthy("true").falsy("false").optional(),
  electricalSwitchRemarks:  Joi.string().optional().allow(null, ""),
  electricalPowerSupply:    Joi.boolean().truthy("true").falsy("false").optional(),
  electricalPowerRemarks:   Joi.string().optional().allow(null, ""),
  electricalVoltage:        Joi.boolean().truthy("true").falsy("false").optional(),
  electricalVoltageRemarks: Joi.string().optional().allow(null, ""),
  electricalEarthingTest:   Joi.boolean().truthy("true").falsy("false").optional(),
  electricalEarthingProper: Joi.string().optional().allow(null, ""),
  electricalELCB:           Joi.string().optional().allow(null, ""),
  electricalRemarks:        Joi.string().optional().allow(null, ""),

  // DOORS & WINDOWS
  dwStatus:           statusField,
  dwQuality:          Joi.boolean().truthy("true").falsy("false").optional(),
  dwQualityRemarks:   Joi.string().optional().allow(null, ""),
  dwOperation:        Joi.boolean().truthy("true").falsy("false").optional(),
  dwOperationRemarks: Joi.string().optional().allow(null, ""),
  dwRemarks:          Joi.string().optional().allow(null, ""),

  // LIFTS
  liftStatus:         statusField,
  liftWorking:        Joi.boolean().truthy("true").falsy("false").optional(),
  liftWorkingRemarks: Joi.string().optional().allow(null, ""),
  liftSafety:         Joi.boolean().truthy("true").falsy("false").optional(),
  liftSafetyRemarks:  Joi.string().optional().allow(null, ""),
  liftRemarks:        Joi.string().optional().allow(null, ""),

  // FIRE FIGHTING SYSTEM
  fireStatus:  statusField,
  fireSystems: fireSystemsField,
  fireRemarks: Joi.string().optional().allow(null, ""),

  // TERRACE INSPECTION
  terraceStatus:           statusField,
  terraceRoofTiles:        Joi.boolean().truthy("true").falsy("false").optional(),
  terraceRoofTilesRemarks: Joi.string().optional().allow(null, ""),
  terraceDrainage:         Joi.boolean().truthy("true").falsy("false").optional(),
  terraceDrainageRemarks:  Joi.string().optional().allow(null, ""),
  terraceLeakageTest:      Joi.boolean().truthy("true").falsy("false").optional(),
  terraceLeakageRemarks:   Joi.string().optional().allow(null, ""),
  terraceTestDate:         Joi.string().isoDate().optional().allow(null, ""),
  terraceConductedBy:      Joi.string().optional().allow(null, ""),
  terraceRemarks:          Joi.string().optional().allow(null, "")
});

export const updateTakeoverBuildingInspectionSchema = Joi.object({
  // STRUCTURE
  structureStatus:       statusField,
  structureAlignment:    Joi.boolean().truthy("true").falsy("false").optional(),
  structureLocation:     Joi.string().optional().allow(null, ""),
  structureDefectReport: Joi.string().optional().allow(null, ""),
  structureRemarks:      Joi.string().optional().allow(null, ""),

  // PAINTING
  paintingStatus:       statusField,
  paintingIsQualityOk:  Joi.boolean().truthy("true").falsy("false").optional(),
  paintingLocation:     Joi.string().optional().allow(null, ""),
  paintingDefectReport: Joi.string().optional().allow(null, ""),
  paintingRemarks:      Joi.string().optional().allow(null, ""),

  // TILING & FLOORING
  tilingStatus:       statusField,
  tilingIsQualityOk:  Joi.boolean().truthy("true").falsy("false").optional(),
  tilingLocation:     Joi.string().optional().allow(null, ""),
  tilingDefectReport: Joi.string().optional().allow(null, ""),
  tilingRemarks:      Joi.string().optional().allow(null, ""),

  // FALSE CEILING
  falseCeilingStatus:       statusField,
  falseCeilingIsQualityOk:  Joi.boolean().truthy("true").falsy("false").optional(),
  falseCeilingLocation:     Joi.string().optional().allow(null, ""),
  falseCeilingDefectReport: Joi.string().optional().allow(null, ""),
  falseCeilingRemarks:      Joi.string().optional().allow(null, ""),

  // PLUMBING SYSTEM
  plumbingStatus:              statusField,
  plumbingWaterSupply:         Joi.boolean().truthy("true").falsy("false").optional(),
  plumbingWaterSupplyLocation: Joi.string().optional().allow(null, ""),
  plumbingWaterSupplyDefect:   Joi.string().optional().allow(null, ""),
  plumbingLeakage:             Joi.boolean().truthy("true").falsy("false").optional(),
  plumbingLeakageLocation:     Joi.string().optional().allow(null, ""),
  plumbingLeakageDefect:       Joi.string().optional().allow(null, ""),
  plumbingRemarks:             Joi.string().optional().allow(null, ""),

  // ELECTRICAL SYSTEM
  electricalStatus:         statusField,
  electricalSwitchQuality:  Joi.boolean().truthy("true").falsy("false").optional(),
  electricalSwitchRemarks:  Joi.string().optional().allow(null, ""),
  electricalPowerSupply:    Joi.boolean().truthy("true").falsy("false").optional(),
  electricalPowerRemarks:   Joi.string().optional().allow(null, ""),
  electricalVoltage:        Joi.boolean().truthy("true").falsy("false").optional(),
  electricalVoltageRemarks: Joi.string().optional().allow(null, ""),
  electricalEarthingTest:   Joi.boolean().truthy("true").falsy("false").optional(),
  electricalEarthingProper: Joi.string().optional().allow(null, ""),
  electricalELCB:           Joi.string().optional().allow(null, ""),
  electricalRemarks:        Joi.string().optional().allow(null, ""),

  // DOORS & WINDOWS
  dwStatus:           statusField,
  dwQuality:          Joi.boolean().truthy("true").falsy("false").optional(),
  dwQualityRemarks:   Joi.string().optional().allow(null, ""),
  dwOperation:        Joi.boolean().truthy("true").falsy("false").optional(),
  dwOperationRemarks: Joi.string().optional().allow(null, ""),
  dwRemarks:          Joi.string().optional().allow(null, ""),

  // LIFTS
  liftStatus:         statusField,
  liftWorking:        Joi.boolean().truthy("true").falsy("false").optional(),
  liftWorkingRemarks: Joi.string().optional().allow(null, ""),
  liftSafety:         Joi.boolean().truthy("true").falsy("false").optional(),
  liftSafetyRemarks:  Joi.string().optional().allow(null, ""),
  liftRemarks:        Joi.string().optional().allow(null, ""),

  // FIRE FIGHTING SYSTEM
  fireStatus:  statusField,
  fireSystems: fireSystemsField,
  fireRemarks: Joi.string().optional().allow(null, ""),

  // TERRACE INSPECTION
  terraceStatus:           statusField,
  terraceRoofTiles:        Joi.boolean().truthy("true").falsy("false").optional(),
  terraceRoofTilesRemarks: Joi.string().optional().allow(null, ""),
  terraceDrainage:         Joi.boolean().truthy("true").falsy("false").optional(),
  terraceDrainageRemarks:  Joi.string().optional().allow(null, ""),
  terraceLeakageTest:      Joi.boolean().truthy("true").falsy("false").optional(),
  terraceLeakageRemarks:   Joi.string().optional().allow(null, ""),
  terraceTestDate:         Joi.string().isoDate().optional().allow(null, ""),
  terraceConductedBy:      Joi.string().optional().allow(null, ""),
  terraceRemarks:          Joi.string().optional().allow(null, "")
});