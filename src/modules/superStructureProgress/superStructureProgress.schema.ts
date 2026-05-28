import Joi from "joi";

const booleanField = Joi.boolean()
  .truthy("true")
  .falsy("false")
  .optional()
  .allow(null);

// ─── PROGRESS ──────────────────────────────────────────────────────
export const createProgressSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
  blockId:   Joi.string().uuid().required(),
  floorId:   Joi.string().uuid().required(),
  stage:     Joi.string().optional().allow("", null),
  remarks:   Joi.string().optional().allow("", null),
  status:    Joi.string()
               .valid("NOT_STARTED", "IN_PROGRESS", "COMPLETED")
               .optional()
});

export const updateProgressSchema = Joi.object({
  projectId: Joi.string().uuid().optional(),
  blockId:   Joi.string().uuid().optional(),
  floorId:   Joi.string().uuid().optional(),
  stage:     Joi.string().optional().allow("", null),
  remarks:   Joi.string().optional().allow("", null),
  status:    Joi.string()
               .valid("NOT_STARTED", "IN_PROGRESS", "COMPLETED")
               .optional()
});

// ─── QUALITY ───────────────────────────────────────────────────────
// Quality is per-progress (1-to-1 via progressId)
export const createQualitySchema = Joi.object({
  progressId: Joi.string().uuid().required(),

  workStartedDate:  Joi.date().optional().allow(null),
  isDelay:          booleanField,
  delayDays:        Joi.number().integer().optional().allow(null),
  delayReason:      Joi.string().optional().allow(null, ""),
  delayOtherReason: Joi.string().optional().allow(null, ""),
  generalRemarks:   Joi.string().optional().allow(null, ""),

  // CEMENT
  cementGradeId: Joi.string().optional().allow(null, ""),
  cementBrandId: Joi.string().optional().allow(null, ""),
  cementRemarks: Joi.string().optional().allow(null, ""),
  cementLabTest: Joi.string().optional().allow(null, ""),
  cementPhoto:   Joi.any().optional(),

  // SAND
  sandType:          Joi.string().valid("RIVER", "M_SAND").optional().allow(null, ""),
  sandLabTest:       Joi.string().optional().allow(null, ""),
  sandPhoto:         Joi.any().optional(),
  sandSieveTestDone: booleanField,
  sandSieveLabTest:  Joi.string().optional().allow(null, ""),
  sandSievePhoto:    Joi.any().optional(),

  // STEEL
  steelGradeId: Joi.string().optional().allow(null, ""),
  steelBrandId: Joi.string().optional().allow(null, ""),
  steelLabTest: Joi.string().optional().allow(null, ""),
  steelPhoto:   Joi.any().optional(),

  // AGGREGATE
  aggregateSize:    Joi.number().optional().allow(null),
  aggregateLabTest: Joi.string().optional().allow(null, ""),
  aggregatePhoto:   Joi.any().optional(),

  // WATER
  waterLabTest: Joi.string().optional().allow(null, ""),
  waterPhoto:   Joi.any().optional(),

  // CONCRETE
  concreteLabTest:         Joi.string().optional().allow(null, ""),
  concretePhoto:           Joi.any().optional(),
  concreteQualityTestDone: booleanField,
  concreteQualityLabTest:  Joi.string().optional().allow(null, ""),
  concreteQualityPhoto:    Joi.any().optional(),

  // BRICKS
  bricksLabTest:             Joi.string().optional().allow(null, ""),
  bricksPhoto:               Joi.any().optional(),
  bricksQualityTestDone:     booleanField,
  bricksQualityLabTest:      Joi.string().optional().allow(null, ""),
  bricksQualityPhoto:        Joi.any().optional(),
  brickWallAlignmentDone:    booleanField,
  brickWallAlignmentRemarks: Joi.string().optional().allow(null, ""),
  brickWallAlignmentPhoto:   Joi.any().optional(),

  qualityRemarks: Joi.string().optional().allow(null, "")
});

export const updateQualitySchema = createQualitySchema;

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

// Quality update param: by progressId
export const updateQualityParamSchema = Joi.object({
  progressId: Joi.string().uuid().required()
});