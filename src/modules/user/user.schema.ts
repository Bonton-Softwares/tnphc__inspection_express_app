import Joi from "joi";

export const STANDALONE_ROLES = ["admin", "cmd", "fsr"];
export const POLICE_DEPT_KEY = "police";

// ─── LOGIN ────────────────────────────────────────────────────
export const loginUserSchema = Joi.object({
  userName: Joi.string().required().messages({
    "string.empty": "Username is required",
    "any.required": "Username is required",
  }),
  password: Joi.string().required().messages({
    "string.empty": "Password is required",
    "any.required": "Password is required",
  }),
});

// ─── DISTRICT ENTRY (inside SPECIFIC access) ─────────────────
const districtAssignmentSchema = Joi.object({
  districtId: Joi.string().required().messages({
    "any.required": "districtId is required",
  }),
  districtType: Joi.string().valid("DISTRICT", "CITY").required().messages({
    "any.only": "districtType must be DISTRICT or CITY",
    "any.required": "districtType is required",
  }),
});

// ─── MANAGEMENT ENTRY ─────────────────────────────────────────
// Rules (mirrors project creation):
//   specialUnitId present  → NO districts, NO accessType, NO districtType needed
//   specialUnitId absent   → accessType required
//                             SPECIFIC        → districts[] min 1
//                             FULL_JURISDICTION → districts not needed
const managementEntrySchema = Joi.object({
  departmentId: Joi.string().required().messages({
    "any.required": "departmentId is required",
  }),

  // Only present when user picks a special unit under this department.
  // When set → accessType / districts are NOT required.
  specialUnitId: Joi.string().optional().allow(null, ""),

  // Required only when specialUnitId is absent/empty
  accessType: Joi.when("specialUnitId", {
    is: Joi.string().trim().min(1).exist(),
    then: Joi.string()
      .valid("SPECIFIC", "FULL_JURISDICTION")
      .optional()
      .allow(null, ""),
    otherwise: Joi.string()
      .valid("SPECIFIC", "FULL_JURISDICTION")
      .required()
      .messages({
        "any.only": "accessType must be SPECIFIC or FULL_JURISDICTION",
        "any.required":
          "accessType is required when no specialUnitId is provided",
      }),
  }),

  // Required only when specialUnitId is absent AND accessType = SPECIFIC
  districts: Joi.when("specialUnitId", {
    is: Joi.string().trim().min(1).exist(),
    // Special unit path → strip districts entirely
    then: Joi.array().items(districtAssignmentSchema).optional(),
    otherwise: Joi.when("accessType", {
      is: "SPECIFIC",
      then: Joi.array()
        .items(districtAssignmentSchema)
        .min(1)
        .required()
        .messages({
          "array.min": "Select at least one district or city for SPECIFIC access",
          "any.required": "districts are required when accessType is SPECIFIC",
        }),
      otherwise: Joi.array().items(districtAssignmentSchema).optional(),
    }),
  }),
});

// ─── CREATE USER ──────────────────────────────────────────────
export const createUserSchema = Joi.object({
  userName: Joi.string().max(15).required().messages({
    "string.empty": "Username is required",
    "string.max": "Username must be at most 15 characters",
    "any.required": "Username is required",
  }),
  email: Joi.string().email().optional().allow(null, "").messages({
    "string.email": "Enter a valid email address",
  }),
  password: Joi.string().min(4).required().messages({
    "string.min": "Password must be at least 4 characters",
    "string.empty": "Password is required",
    "any.required": "Password is required",
  }),
  roleId: Joi.string().required().messages({
    "string.empty": "Role is required",
    "any.required": "Role is required",
  }),
  roleName: Joi.string().optional().allow(null, ""),
  managements: Joi.array().items(managementEntrySchema).optional().allow(null),
  createdById: Joi.string().optional().allow(null, ""),
});

// ─── UPDATE USER ──────────────────────────────────────────────
export const updateUserSchema = Joi.object({
  userName: Joi.string().max(15).optional().messages({
    "string.max": "Username must be at most 15 characters",
  }),
  email: Joi.string().email().optional().messages({
    "string.email": "Enter a valid email address",
  }),
  passwordTemp: Joi.string().min(4).optional().messages({
    "string.min": "Password must be at least 4 characters",
  }),
  roleId: Joi.string().optional(),
  roleName: Joi.string().optional().allow(null, ""),
  managements: Joi.array().items(managementEntrySchema).optional().allow(null),
  updatedById: Joi.string().optional().allow(null, ""),
});

// ─── PARAMS / QUERY ───────────────────────────────────────────
export const getAllUsersSchema = Joi.object({
  pageNumber: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().optional().allow(""),
  roleId: Joi.string().optional(),
  departmentId: Joi.string().optional(),
  specialUnitId: Joi.string().optional(),
  districtId: Joi.string().optional(),
});

export const getUserByIdSchema = Joi.object({ id: Joi.string().required() });
export const deleteUserSchema = Joi.object({ id: Joi.string().required() });
export const updateParamsSchema = Joi.object({ id: Joi.string().required() });