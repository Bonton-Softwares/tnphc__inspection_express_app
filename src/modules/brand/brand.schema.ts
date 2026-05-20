import joi from "joi";

export const createBrandSchema = joi.object({
  materialId: joi.string().uuid().required(),

  brands: joi.array()
    .items(
      joi.object({
        typeId: joi.string().uuid().optional(),

        names: joi.array()
          .items(joi.string().trim().required())
          .min(1)
          .required(),
      })
    )
    .min(1)
    .required(),
});

export const updateBrandSchema = joi.object({
  name: joi.string().trim().optional(),
  materialId: joi.string().uuid().optional(),
});

export const brandIdSchema = joi.object({
  id: joi.string().uuid().required(),
});

export const listBrandSchema = joi.object({
  search: joi.string().optional(),
  materialId: joi.string().uuid().optional(),
  pageNumber: joi.number().optional(),
  pageSize: joi.number().optional(),
});