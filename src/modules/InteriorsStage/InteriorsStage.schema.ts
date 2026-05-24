import Joi from "joi";

const booleanField = Joi.boolean()
  .truthy("true")
  .falsy("false")
  .optional()
  .allow(null);

// ─── PROGRESS ──────────────────────────────────────────────────────
export const createInteriorsProgressSchema = Joi.object({
  projectId:       Joi.string().uuid().required(),
  block:           Joi.string().optional().allow("", null),
  floor:           Joi.string().optional().allow("", null),
  stageOfWork:     Joi.string().optional().allow("", null),
  isCompleted:     Joi.boolean().truthy("true").falsy("false").required(),
  progressRemarks: Joi.string().optional().allow("", null),
  progressPhoto:   Joi.any().optional()
});

export const updateInteriorsProgressSchema = Joi.object({
  projectId:       Joi.string().uuid().optional(),
  block:           Joi.string().optional().allow("", null),
  floor:           Joi.string().optional().allow("", null),
  stageOfWork:     Joi.string().optional().allow("", null),
  isCompleted:     Joi.boolean().truthy("true").falsy("false").optional(),
  progressRemarks: Joi.string().optional().allow("", null),
  progressPhoto:   Joi.any().optional()
});

// ─── QUALITY ───────────────────────────────────────────────────────
export const createInteriorsQualitySchema = Joi.object({
  projectId:        Joi.string().uuid().required(),
  workStartedDate:  Joi.date().optional().allow(null),
  isDelay:          booleanField,
  delayDays:        Joi.number().integer().optional().allow(null),
  delayReason:      Joi.string().optional().allow("", null),
  delayOtherReason: Joi.string().optional().allow("", null),

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

  doorWoodType:   Joi.string().optional().allow("", null),
  upvcBrand:      Joi.string().optional().allow("", null),
  glassBrand:     Joi.string().optional().allow("", null),
  glassThickness: Joi.string().optional().allow("", null),

  floorType:   Joi.string().optional().allow("", null),
  tileBrand:   Joi.string().optional().allow("", null),
  tileRemarks: Joi.string().optional().allow("", null),

  paintBrand:      Joi.string().optional().allow("", null),
  paintingQuality: Joi.string().optional().allow("", null),

  qualityRemarks: Joi.string().optional().allow("", null)
});

export const updateInteriorsQualitySchema = createInteriorsQualitySchema;

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