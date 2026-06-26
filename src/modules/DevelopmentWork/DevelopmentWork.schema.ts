import Joi from "joi";

const boolField = Joi.boolean().truthy("true").falsy("false").optional();
const strField   = Joi.string().optional().allow(null, "");
const numField   = Joi.number().optional().allow(null);

const commonFields = {
  buildingInspectionId: Joi.string().uuid().required(),
  // SUMP & PUMP ROOM
  completionPercentage:  numField,
  sumpCapacity:          boolField,
  sumpCapacityRemarks:   strField,
  sumpQuality:           boolField,
  sumpQualityRemarks:    strField,
  pumpsAsPerSpec:        boolField,
  pumpsSpecRemarks:      strField,
  standbyPumps:          boolField,
  standbyPumpsRemarks:   strField,
  pumpsWorking:          boolField,
  pumpsWorkingRemarks:   strField,

  // BOREWELL
  borewellCompletionPercentage: numField,
  borewellDepth:                numField,
  borewellWorking:              boolField,
  borewellRemarks:              strField,
  waterQuality:                 strField,

  // INSPECTION CHAMBER
  inspectionChamberCompletionPercentage: numField,
  inspectionChamberProper:               boolField,
  inspectionChamberRemarks:              strField,

  // STORM WATER DRAINS
  stormWaterCompletionPercentage: numField,
  stormWaterDrainsProper:         boolField,
  stormWaterDrainsRemarks:        strField,

  // SULLAGE DRAIN
  sullageDrainCompletionPercentage: numField,
  sullageDrainProper:               boolField,
  sullageDrainRemarks:              strField,

  // ROAD
  roadType:    strField,
  roadQuality: strField,

  // PAVER BLOCK
  paverBlockCompletionPercentage: numField,
  paverBlockProper:               boolField,
  paverBlockRemarks:              strField,

  // COMPOUND WALL
  compoundWallQuality:           boolField,
  compoundWallQualityRemarks:    strField,
  compoundWallExpansionJoints:   boolField,
  compoundWallExpansionRemarks:  strField,
  compoundWallAirVents:          boolField,
  compoundWallAirVentsRemarks:   strField,

  // RAIN WATER HARVESTING
  rainWaterCompletionPercentage: numField,
  rainWaterPits:                 numField,
  rainWaterProper:               boolField,
  rainWaterRemarks:              strField,

  // LANDSCAPING
  landScapingCompletionPercentage: numField,
  landScapingProper:               boolField,
  landScapingRemarks:              strField,

  // OTHER DEFECTS
  otherDefectsDescription: strField,
  otherDefectsCategory:    strField,
  otherDefectsLocation:    strField,

  // GENERAL REMARKS
  generalRemarks: strField
};

export const createDevelopmentWorkSchema = Joi.object({
  projectId: Joi.string().required(),
  ...commonFields
});

export const updateDevelopmentWorkSchema = Joi.object({
  ...commonFields
});