import Joi from "joi";

const booleanField = Joi.boolean()
  .truthy("true")
  .falsy("false")
  .optional()
  .allow(null);

// ─── PROGRESS ──────────────────────────────────────────────────────
export const createInteriorsProgressSchema = Joi.object({
  projectId:       Joi.string().uuid().required(),
  blockId:         Joi.string().uuid().required(),
  floorId:         Joi.string().uuid().required(),
  stage:           Joi.string().optional().allow("", null),
  progressRemarks: Joi.string().optional().allow("", null),
  progressPhoto:   Joi.any().optional(),
  status:          Joi.string()
                     .valid("NOT_STARTED", "IN_PROGRESS", "COMPLETED")
                     .optional()
});

export const updateInteriorsProgressSchema = Joi.object({
  projectId:       Joi.string().uuid().optional(),
  blockId:         Joi.string().uuid().optional(),
  floorId:         Joi.string().uuid().optional(),
  stage:           Joi.string().optional().allow("", null),
  progressRemarks: Joi.string().optional().allow("", null),
  progressPhoto:   Joi.any().optional(),
  status:          Joi.string()
                     .valid("NOT_STARTED", "IN_PROGRESS", "COMPLETED")
                     .optional()
});

// ─── QUALITY ───────────────────────────────────────────────────────
// Quality is 1-to-1 per progress record via progressId @unique
export const createInteriorsQualitySchema = Joi.object({
  progressId:       Joi.string().uuid().required(),

  workStartedDate:  Joi.date().optional().allow(null),
  isDelay:          booleanField,
  delayDays:        Joi.number().integer().optional().allow(null),
  delayReason:      Joi.string().optional().allow("", null),
  delayOtherReason: Joi.string().optional().allow("", null),

  // CEMENT
  cementGradeId: Joi.string().optional().allow("", null),
  cementBrandId: Joi.string().optional().allow("", null),
  cementRemarks: Joi.string().optional().allow("", null),
  cementLabTest: Joi.string().optional().allow("", null),
  cementPhoto:   Joi.any().optional(),

  // SAND
  sandType:          Joi.string().valid("RIVER", "M_SAND").optional().allow("", null),
  sandLabTest:       Joi.string().optional().allow("", null),
  sandPhoto:         Joi.any().optional(),
  sandSieveTestDone: booleanField,
  sandSieveLabTest:  Joi.string().optional().allow("", null),
  sandSievePhoto:    Joi.any().optional(),

  // AGGREGATE
  aggregateSize:    Joi.number().optional().allow(null),
  aggregateLabTest: Joi.string().optional().allow("", null),
  aggregatePhoto:   Joi.any().optional(),

  // WATER
  waterLabTest: Joi.string().optional().allow("", null),
  waterPhoto:   Joi.any().optional(),

  // CONCRETE
  concreteLabTest:         Joi.string().optional().allow("", null),
  concretePhoto:           Joi.any().optional(),
  concreteQualityTestDone: booleanField,
  concreteQualityLabTest:  Joi.string().optional().allow("", null),
  concreteQualityPhoto:    Joi.any().optional(),

  // BRICKS
  bricksLabTest:         Joi.string().optional().allow("", null),
  bricksPhoto:           Joi.any().optional(),
  bricksQualityTestDone: booleanField,
  bricksQualityLabTest:  Joi.string().optional().allow("", null),
  bricksQualityPhoto:    Joi.any().optional(),

  // PLASTERING
  plasteringTestDone: booleanField,
  plasteringLabTest:  Joi.string().optional().allow("", null),
  plasteringPhoto:    Joi.any().optional(),

  // DOORS & WINDOWS
  doorWoodType:   Joi.string().optional().allow("", null),
  upvcBrand:      Joi.string().optional().allow("", null),
  glassBrand:     Joi.string().optional().allow("", null),
  glassThickness: Joi.string().optional().allow("", null),

  // TILES
  floorType:   Joi.string().optional().allow("", null),
  tileBrand:   Joi.string().optional().allow("", null),
  tileRemarks: Joi.string().optional().allow("", null),

  // PAINTING
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

// Quality param: by progressId (not projectId)
export const updateQualityParamSchema = Joi.object({
  progressId: Joi.string().uuid().required()
});