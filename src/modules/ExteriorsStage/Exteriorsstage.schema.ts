import Joi from "joi";

const booleanField = Joi.boolean()
  .truthy("true")
  .falsy("false")
  .optional()
  .allow(null);

// ─── PROGRESS ──────────────────────────────────────────────────────
export const createExteriorsProgressSchema = Joi.object({
  projectId:       Joi.string().uuid().required(),
  block:           Joi.string().optional().allow("", null),
  floor:           Joi.string().optional().allow("", null),
  stageOfWork:     Joi.string().optional().allow("", null),
  isCompleted:     Joi.boolean().truthy("true").falsy("false").required(),
  progressRemarks: Joi.string().optional().allow("", null),
  progressPhoto:   Joi.any().optional()
});

export const updateExteriorsProgressSchema = Joi.object({
  projectId:       Joi.string().uuid().optional(),
  block:           Joi.string().optional().allow("", null),
  floor:           Joi.string().optional().allow("", null),
  stageOfWork:     Joi.string().optional().allow("", null),
  isCompleted:     Joi.boolean().truthy("true").falsy("false").optional(),
  progressRemarks: Joi.string().optional().allow("", null),
  progressPhoto:   Joi.any().optional()
});

// ─── QUALITY ───────────────────────────────────────────────────────
export const createExteriorsQualitySchema = Joi.object({
  projectId:       Joi.string().uuid().required(),
  workStartedDate: Joi.date().optional().allow(null),
  isDelayed:       booleanField,
  delayDays:       Joi.number().integer().optional().allow(null),
  delayReason:     Joi.string().optional().allow("", null),
  delayOther:      Joi.string().optional().allow("", null),
  generalRemarks:  Joi.string().optional().allow("", null),

  cementGradeId: Joi.string().optional().allow("", null),
  cementBrandId: Joi.string().optional().allow("", null),
  cementRemarks: Joi.string().optional().allow("", null),
  cementLabTest: Joi.string().optional().allow("", null),
  cementPhoto:   Joi.any().optional(),

  sandType:          Joi.string().valid("RIVER", "M_SAND").optional().allow("", null),
  sandLabTest:       Joi.string().optional().allow("", null),
  sandPhoto:         Joi.any().optional(),
  sandSieveTestDone: booleanField,
  sandSieveLabTest:  Joi.string().optional().allow("", null),
  sandSievePhoto:    Joi.any().optional(),

  aggregateSize:    Joi.number().optional().allow(null),
  aggregateLabTest: Joi.string().optional().allow("", null),
  aggregatePhoto:   Joi.any().optional(),

  waterLabTest: Joi.string().optional().allow("", null),
  waterPhoto:   Joi.any().optional(),

  concreteLabTest:         Joi.string().optional().allow("", null),
  concretePhoto:           Joi.any().optional(),
  concreteQualityTestDone: booleanField,
  concreteQualityLabTest:  Joi.string().optional().allow("", null),
  concreteQualityPhoto:    Joi.any().optional(),

  bricksLabTest:         Joi.string().optional().allow("", null),
  bricksPhoto:           Joi.any().optional(),
  bricksQualityTestDone: booleanField,
  bricksQualityLabTest:  Joi.string().optional().allow("", null),
  bricksQualityPhoto:    Joi.any().optional(),

  plasteringTestDone: booleanField,
  plasteringLabTest:  Joi.string().optional().allow("", null),
  plasteringPhoto:    Joi.any().optional(),
  plasteringRemarks:  Joi.string().optional().allow("", null),

  doorWindowType:    Joi.string().optional().allow("", null),
  upvcBrand:         Joi.string().optional().allow("", null),
  glassBrand:        Joi.string().optional().allow("", null),
  glassThickness:    Joi.string().optional().allow("", null),
  doorWindowRemarks: Joi.string().optional().allow("", null),

  interiorFloorType:   Joi.string().optional().allow("", null),
  interiorTileBrand:   Joi.string().optional().allow("", null),
  interiorTileRemarks: Joi.string().optional().allow("", null),

  roofFloorType:   Joi.string().optional().allow("", null),
  roofTileBrand:   Joi.string().optional().allow("", null),
  roofTileRemarks: Joi.string().optional().allow("", null),

  interiorPaintBrand:      Joi.string().optional().allow("", null),
  interiorPaintingQuality: Joi.string().optional().allow("", null),

  exteriorPaintBrand:      Joi.string().optional().allow("", null),
  exteriorPaintingQuality: Joi.string().optional().allow("", null),

  qualityRemarks: Joi.string().optional().allow("", null)
});

export const updateExteriorsQualitySchema = createExteriorsQualitySchema;

// ─── PARAMS ────────────────────────────────────────────────────────
export const getByProjectSchema = Joi.object({
  projectId: Joi.string().uuid().required()
});

export const deleteSchema = Joi.object({
  id: Joi.string().uuid().required()
});

export const updateProgressParamSchema = Joi.object({
  id: Joi.string().uuid().required()
});

export const updateQualityParamSchema = Joi.object({
  projectId: Joi.string().uuid().required()
});