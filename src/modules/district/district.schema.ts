import joi from "joi";

export const createDistrictSchema = joi.object({
  name: joi.string().required(),
  type: joi.string().valid("DISTRICT", "CITY").required(),
});

export const updateDistrictSchema = joi.object({
  name: joi.string().optional(),
  type: joi.string().valid("DISTRICT", "CITY").optional(),
});

export const getAllDistrictsSchema = joi.object({
  pageNumber: joi.number().integer().optional(),
  pageSize: joi.number().integer().optional(),
  search: joi.string().optional(),
  type: joi.string().valid("DISTRICT", "CITY").optional(),
  isDropdown: joi.boolean().optional(),
});

export const getDistrictByIdSchema = joi.object({
  id: joi.string().required(),
});

export const deleteDistrictSchema = joi.object({
  id: joi.string().required(),
});

export const updateDistrictParamsSchema = joi.object({
  id: joi.string().required(),
});