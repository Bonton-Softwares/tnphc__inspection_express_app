import joi from "joi";

export const createMaterialSchema = joi.object({
  name: joi.string().trim().required(),

  hasType: joi.boolean().required(),

  hasGrade: joi.boolean().required(),

  types: joi.array()
    .items(joi.string().trim())
    .when("hasType", {
      is: true,
      then: joi.array().min(1).required(),
      otherwise: joi.optional(),
    }),

  grades: joi.array()
    .items(joi.string().trim())
    .when("hasGrade", {
      is: true,
      then: joi.array().min(1).required(),
      otherwise: joi.optional(),
    }),
});

export const updateMaterialSchema = joi.object({
  name: joi.string().trim().optional(),

  hasType: joi.boolean().optional(),

  hasGrade: joi.boolean().optional(),

  types: joi.array()
    .items(joi.string().trim())
    .optional(),

  grades: joi.array()
    .items(joi.string().trim())
    .optional(),
});

export const materialIdSchema = joi.object({
  id: joi.string().uuid().required(),
});

export const listMaterialSchema = joi.object({
  search: joi.string().optional(),
  pageNumber: joi.number().optional(),
  pageSize: joi.number().optional(),
});