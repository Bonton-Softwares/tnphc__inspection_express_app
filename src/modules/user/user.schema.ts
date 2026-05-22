// user.schema.ts
import Joi from "joi";

// ── ROLES THAT NEED NO DEPARTMENT/DISTRICT ──────────────────
export const STANDALONE_ROLES = ["admin", "cmd", "fsr"];

// ── DEPARTMENT THAT SUPPORTS SPECIAL UNITS ──────────────────
export const POLICE_DEPT_KEY = "police"; // match by department name (lowercased)

// ─────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// DISTRICT/CITY ASSIGNMENT (used inside managements array)
// ─────────────────────────────────────────────────────────────
const districtAssignmentSchema = Joi.object({
  districtId: Joi.string().required().messages({
    "any.required": "District ID is required",
  }),
  districtType: Joi.string().valid("DISTRICT", "CITY").required().messages({
    "any.only": "districtType must be DISTRICT or CITY",
    "any.required": "districtType is required",
  }),
});

// ─────────────────────────────────────────────────────────────
// DEPARTMENT MANAGEMENT ENTRY
// ─────────────────────────────────────────────────────────────
const managementEntrySchema = Joi.object({
  departmentId: Joi.string().required().messages({
    "any.required": "Department ID is required",
  }),

  // "SPECIFIC" → user picked individual districts/cities
  // "JURISDICTION" → user gets access to ALL districts/cities
  accessType: Joi.string().valid("SPECIFIC", "JURISDICTION").required().messages({
    "any.only": "accessType must be SPECIFIC or JURISDICTION",
    "any.required": "accessType is required",
  }),

  // For SPECIFIC: list of district/city IDs
  // For JURISDICTION: empty array or omit
  districts: Joi.when("accessType", {
    is: "SPECIFIC",
    then: Joi.array()
      .items(districtAssignmentSchema)
      .min(1)
      .required()
      .messages({
        "array.min": "Select at least one district or city",
        "any.required": "districts are required for SPECIFIC access",
      }),
    otherwise: Joi.array().items(districtAssignmentSchema).optional(),
  }),

  // Only for Police department — optional special unit
  specialUnitId: Joi.string().optional().allow(null, ""),

  // Required ONLY when specialUnitId is a non-empty string
  specialUnitAccessType: Joi.when("specialUnitId", {
    is: Joi.string().trim().min(1).exist(),   // true only when present AND non-empty
    then: Joi.string().valid("SPECIFIC", "JURISDICTION").required().messages({
      "any.only": "specialUnitAccessType must be SPECIFIC or JURISDICTION",
      "any.required": "specialUnitAccessType is required when specialUnitId is set",
    }),
    otherwise: Joi.string().valid("SPECIFIC", "JURISDICTION").optional().allow(null, ""),
  }),
});

// ─────────────────────────────────────────────────────────────
// CREATE USER
// ─────────────────────────────────────────────────────────────
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

  // roleName is used server-side to decide if managements are required
  // client must send the role name for validation logic
  roleName: Joi.string().optional().allow(null, ""),

  // Managements are required ONLY for non-standalone roles
  // The service layer enforces this based on the resolved role name
  managements: Joi.array()
    .items(managementEntrySchema)
    .optional()
    .allow(null),

  createdById: Joi.string().optional().allow(null, ""),
});

// ─────────────────────────────────────────────────────────────
// UPDATE USER
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// PARAMS / QUERY
// ─────────────────────────────────────────────────────────────
export const getAllUsersSchema = Joi.object({
  pageNumber: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().optional().allow(""),
  roleId: Joi.string().optional(),
  departmentId: Joi.string().optional(),
  specialUnitId: Joi.string().optional(),
  districtId: Joi.string().optional(),
});

export const getUserByIdSchema = Joi.object({
  id: Joi.string().required(),
});

export const deleteUserSchema = Joi.object({
  id: Joi.string().required(),
});

export const updateParamsSchema = Joi.object({
  id: Joi.string().required(),
});