import joi from "joi";

export const createDepartmentSchema = joi.object({
    name: joi.string().required(),});

export const updateDepartmentSchema = joi.object({
    name: joi.string().optional(),});

export const getDepartmentByIdSchema = joi.object({
    id: joi.string().required(),});

export const deleteDepartmentSchema = joi.object({
     id: joi.string().required(),});

export const listDepartmentsSchema = joi.object({
    pageNumber: joi.number().integer().min(1).max(100).default(1),
    pageSize: joi.number().integer().min(1).default(10),
    search: joi.string().optional(),
});

export const updateDepartmentParamsSchema = joi.object({
   id: joi.string().required(),
});