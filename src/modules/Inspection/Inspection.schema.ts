import Joi from "joi";

const booleanField = Joi.boolean()
  .truthy("true")
  .falsy("false")
  .optional()
  .allow(null);

// ─── PROGRESS ──────────────────────────────────────────────────────
export const createProgressSchema = Joi.object({
  projectId:       Joi.string().uuid().required(),
  blockId:         Joi.string().uuid().required(),
  floorId:         Joi.string().uuid().required(),
  roomName: Joi.string().optional().allow(null, ""),
  moduleStageId:   Joi.string().uuid().required(),

  workStartedDate: Joi.date().optional().allow(null),
  isDelay:         booleanField,
  delayDays:       Joi.number().integer().optional().allow(null),
  delayReason:     Joi.string().optional().allow(null, ""),
  delayOtherReason: Joi.string().optional().allow(null, ""),
  generalRemarks:  Joi.string().optional().allow(null, "")
});

export const updateProgressSchema = Joi.object({
  workStartedDate: Joi.date().optional().allow(null),
  isDelay:         booleanField,
  delayDays:       Joi.number().integer().optional().allow(null),
  delayReason:     Joi.string().optional().allow(null, ""),
  delayOtherReason: Joi.string().optional().allow(null, ""),
  generalRemarks:  Joi.string().optional().allow(null, "")
});

// ─── ANSWERS ───────────────────────────────────────────────────────
export const saveAnswersSchema = Joi.object({
  answers: Joi.array()
    .items(
      Joi.object({
        questionId: Joi.string().uuid().required(),
        answer:     Joi.string().required()
      })
    )
    .min(1)
    .required()
});

// ─── PARAMS ────────────────────────────────────────────────────────
export const getByModuleProjectSchema = Joi.object({
  module:    Joi.string().required(),
  projectId: Joi.string().uuid().required()
});


export const floorParamSchema = Joi.object({
  floorId: Joi.string().uuid().required()
});
export const progressParamSchema = Joi.object({
  progressId: Joi.string().uuid().required()
});

export const deleteProgressParamSchema = Joi.object({
  progressId: Joi.string().uuid().required()
});