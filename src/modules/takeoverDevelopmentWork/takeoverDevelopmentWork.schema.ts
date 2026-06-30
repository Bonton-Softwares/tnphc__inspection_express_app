import Joi from "joi";

const boolField = Joi.boolean().truthy("true").falsy("false").optional();
const strField = Joi.string().optional().allow(null, "");
const numField = Joi.number().optional().allow(null);

const commonFields = {
  completionPercentage: numField,

  sumpCapacity: boolField,
  sumpCapacityRemarks: strField,
  sumpQuality: boolField,
  sumpQualityRemarks: strField,
  pumpsAsPerSpec: boolField,
  pumpsSpecRemarks: strField,
  standbyPumps: boolField,
  standbyPumpsRemarks: strField,
  pumpsWorking: boolField,
  pumpsWorkingRemarks: strField,

  borewellCompletionPercentage: numField,
  borewellDepth: strField,
  borewellWorking: boolField,
  borewellRemarks: strField,
  waterQuality: strField,

  inspectionChamberCompletionPercentage: numField,
  inspectionChamberProper: boolField,
  inspectionChamberRemarks: strField,

  stormWaterCompletionPercentage: numField,
  stormWaterDrainsProper: boolField,
  stormWaterDrainsRemarks: strField,

  sullageDrainCompletionPercentage: numField,
  sullageDrainProper: boolField,
  sullageDrainRemarks: strField,

  roadType: strField,
  roadQuality: strField,

  paverBlockCompletionPercentage: numField,
  paverBlockProper: boolField,
  paverBlockRemarks: strField,

  compoundWallQuality: boolField,
  compoundWallQualityRemarks: strField,
  compoundWallExpansionJoints: boolField,
  compoundWallExpansionRemarks: strField,
  compoundWallAirVents: boolField,
  compoundWallAirVentsRemarks: strField,

  rainWaterCompletionPercentage: numField,
  rainWaterPits: numField,
  rainWaterProper: boolField,
  rainWaterRemarks: strField,

  landScapingCompletionPercentage: numField,
  landScapingProper: boolField,
  landScapingRemarks: strField,

  otherDefectsDescription: strField,
  otherDefectsCategory: strField,
  otherDefectsLocation: strField,

  generalRemarks: strField
};

export const createTakeoverDevelopmentWorkSchema = Joi.object({
  
  buildingInspectionId: Joi.string().uuid().required(),
  ...commonFields
});

export const updateTakeoverDevelopmentWorkSchema = Joi.object({
  ...commonFields
});