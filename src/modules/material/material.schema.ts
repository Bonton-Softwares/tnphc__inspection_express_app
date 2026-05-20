import joi from "joi";

export const createMaterialSchema = joi.object({
  name: joi.string().trim().required(),
  types: joi.array().items(joi.string().trim()).optional(),
  grades: joi.array().items(joi.string().trim()).optional(),
});

export const updateMaterialSchema = joi.object({
  name: joi.string().trim().optional(),
  types: joi.array().items(joi.string().trim()).optional(),
  grades: joi.array().items(joi.string().trim()).optional(),
});

export const materialIdSchema = joi.object({
  id: joi.string().uuid().required(),
});

export const listMaterialSchema = joi.object({
  search: joi.string().optional(),
  pageNumber: joi.number().optional(),
  pageSize: joi.number().optional(),
});