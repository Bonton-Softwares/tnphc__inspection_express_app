import joi from "joi";

export const createGradeSchema = joi.object({
  name: joi.string().trim().required(),

  materialId: joi.string().uuid().required(),

  brandId: joi.string().uuid().required(),

  typeId: joi.string().uuid().optional(),
});

export const updateGradeSchema = joi.object({
  name: joi.string().trim().optional(),

  materialId: joi.string().uuid().optional(),

  brandId: joi.string().uuid().optional(),

  typeId: joi.string().uuid().optional(),
});

export const gradeIdSchema = joi.object({
  id: joi.string().uuid().required(),
});

export const listGradeSchema = joi.object({
  search: joi.string().optional(),

  materialId: joi.string().uuid().optional(),

  brandId: joi.string().uuid().optional(),

  typeId: joi.string().uuid().optional(),

  pageNumber: joi.number().optional(),

  pageSize: joi.number().optional(),
});

// export const gradeIdSchema = joi.object({
//   id: joi.string().uuid().required(),
// });

// export const listGradeSchema = joi.object({
//   search: joi.string().optional(),
//   brandId: joi.string().uuid().optional(),
//   materialId: joi.string().uuid().optional(),
//   pageNumber: joi.number().optional(),
//   pageSize: joi.number().optional(),
// });