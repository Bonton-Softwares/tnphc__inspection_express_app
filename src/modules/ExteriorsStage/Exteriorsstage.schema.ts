import Joi from "joi";

const booleanField = Joi.boolean()
  .truthy("true")
  .falsy("false")
  .optional()
  .allow(null);

// ─── PROGRESS ──────────────────────────────────────────────────────
export const createExteriorsProgressSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
  blockId:   Joi.string().uuid().required(),
  floorId:   Joi.string().uuid().required(),
  stage:     Joi.string().optional().allow("", null),
  remarks:   Joi.string().optional().allow("", null),
  progressPhoto: Joi.any().optional(),
  status:    Joi.string()
               .valid("NOT_STARTED", "IN_PROGRESS", "COMPLETED")
               .optional()
});

export const updateExteriorsProgressSchema = Joi.object({
  projectId: Joi.string().uuid().optional(),
  blockId:   Joi.string().uuid().optional(),
  floorId:   Joi.string().uuid().optional(),
  stage:     Joi.string().optional().allow("", null),
  remarks:   Joi.string().optional().allow("", null),
  progressPhoto: Joi.any().optional(),
  status:    Joi.string()
               .valid("NOT_STARTED", "IN_PROGRESS", "COMPLETED")
               .optional()
});

// ─── QUALITY ───────────────────────────────────────────────────────
// Quality is 1-to-1 per progress record via progressId @unique
export const createExteriorsQualitySchema = Joi.object({
  progressId:      Joi.string().uuid().required(),

  workStartedDate: Joi.date().optional().allow(null),
  isDelayed:       booleanField,
  delayDays:       Joi.number().integer().optional().allow(null),
  delayReason:     Joi.string().optional().allow("", null),
  delayOther:      Joi.string().optional().allow("", null),
  generalRemarks:  Joi.string().optional().allow("", null),

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
  plasteringRemarks:  Joi.string().optional().allow("", null),

  // DOORS & WINDOWS
  doorWindowType:    Joi.string().optional().allow("", null),
  upvcBrand:         Joi.string().optional().allow("", null),
  glassBrand:        Joi.string().optional().allow("", null),
  glassThickness:    Joi.string().optional().allow("", null),
  doorWindowRemarks: Joi.string().optional().allow("", null),

  // INTERIOR TILES
  interiorFloorType:   Joi.string().optional().allow("", null),
  interiorTileBrand:   Joi.string().optional().allow("", null),
  interiorTileRemarks: Joi.string().optional().allow("", null),

  // ROOF TILES
  roofFloorType:   Joi.string().optional().allow("", null),
  roofTileBrand:   Joi.string().optional().allow("", null),
  roofTileRemarks: Joi.string().optional().allow("", null),

  // INTERIOR PAINTING
  interiorPaintBrand:      Joi.string().optional().allow("", null),
  interiorPaintingQuality: Joi.string().optional().allow("", null),

  // EXTERIOR PAINTING
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

// Quality param: by progressId (not projectId) — mirrors Interiors pattern
export const updateQualityParamSchema = Joi.object({
  progressId: Joi.string().uuid().required()
});