import Joi from "joi";

// ─────────────────────────────────────────────────────────────
// SHARED SUB-SCHEMAS
// ─────────────────────────────────────────────────────────────

/**
 * One district/city entry inside a "SPECIFIC" access rule.
 */
const districtEntrySchema = Joi.object({
  districtId: Joi.string().uuid().required().messages({
    "any.required": "districtId is required",
  }),
  districtType: Joi.string().valid("DISTRICT", "CITY").required().messages({
    "any.only": "districtType must be DISTRICT or CITY",
    "any.required": "districtType is required",
  }),
});

/**
 * Access rule for a district/city block.
 *
 * accessType = SPECIFIC          → districts[] must have ≥ 1 entry
 * accessType = FULL_JURISDICTION → districts[] not needed
 */
const accessRuleSchema = Joi.object({
  accessType: Joi.string()
    .valid("SPECIFIC", "FULL_JURISDICTION")
    .required()
    .messages({
      "any.only": "accessType must be SPECIFIC or FULL_JURISDICTION",
      "any.required": "accessType is required",
    }),

  districts: Joi.when("accessType", {
    is: "SPECIFIC",
    then: Joi.array()
      .items(districtEntrySchema)
      .min(1)
      .required()
      .messages({
        "array.min": "Select at least one district or city for SPECIFIC access",
        "any.required": "districts are required when accessType is SPECIFIC",
      }),
    otherwise: Joi.array().items(districtEntrySchema).optional(),
  }),
});

/**
 * One block in a super-structure project.
 */
const superStructureBlockSchema = Joi.object({
  blockName: Joi.string().required().messages({
    "any.required": "blockName is required",
  }),
  totalFloors: Joi.number().integer().min(1).required().messages({
    "number.min": "totalFloors must be at least 1",
    "any.required": "totalFloors is required",
  }),
  floors: Joi.array()
    .items(Joi.string().required())
    .min(1)
    .required()
    .messages({
      "array.min": "At least one floor name is required",
      "any.required": "floors are required",
    }),
});

// ─────────────────────────────────────────────────────────────
// CREATE PROJECT
// ─────────────────────────────────────────────────────────────

export const createProjectSchema = Joi.object({
  // ── Step 1: Basic info ──────────────────────────────────────
  projectName: Joi.string().required().messages({
    "any.required": "projectName is required",
  }),

  buildingType: Joi.string()
    .valid("OFFICE", "RESIDENCY", "OTHERS")
    .required()
    .messages({
      "any.only": "buildingType must be OFFICE, RESIDENCY, or OTHERS",
      "any.required": "buildingType is required",
    }),

  location: Joi.string().optional().allow(null, ""),

  // ── NEW: Top-level district/city selected from frontend before department ──
  selectedDistrictId: Joi.string().uuid().optional().allow(null, ""),

  // ── Step 2: Department ──────────────────────────────────────
  departmentId: Joi.string().uuid().required().messages({
    "any.required": "departmentId is required",
  }),

  // ── Step 3: Special Unit (optional) ────────────────────────
  specialUnitId: Joi.string().uuid().optional().allow(null, ""),

  // ── Step 4: District access (only when NO special unit) ─────
  districtAccess: Joi.when("specialUnitId", {
    is: Joi.string().uuid().exist(),
    then: Joi.any().strip(),
    otherwise: accessRuleSchema.required().messages({
      "any.required":
        "districtAccess is required when no specialUnitId is provided",
    }),
  }),

  // ── Step 5: Stages ──────────────────────────────────────────
  stageIds: Joi.array()
    .items(Joi.string().uuid().required())
    .min(1)
    .required()
    .messages({
      "array.min": "At least one stage must be selected",
      "any.required": "stageIds is required",
    }),

  // ── Step 6: Super structure toggle + blocks ─────────────────
  hasSuperStructure: Joi.boolean().required().messages({
    "any.required": "hasSuperStructure is required",
  }),

  // FIX: Schema only validates shape of blocks when provided.
  // Whether blocks are REQUIRED is determined in the service layer:
  //   → blocks required only when BOTH hasSuperStructure=true
  //     AND the "Super Structure" stage is in stageIds.
  //   → hasSuperStructure=true alone (without the stage) → blocks optional.
  superStructure: Joi.array().items(superStructureBlockSchema).optional(),

  // ── Meta ────────────────────────────────────────────────────
  createdById: Joi.string().uuid().required().messages({
    "any.required": "createdById is required (the creating user's ID)",
    "string.guid": "createdById must be a valid UUID",
  }),
});

// ─────────────────────────────────────────────────────────────
// UPDATE PROJECT
// ─────────────────────────────────────────────────────────────

export const updateProjectSchema = Joi.object({
  projectName: Joi.string().optional(),

  buildingType: Joi.string()
    .valid("OFFICE", "RESIDENCY", "OTHERS")
    .optional(),

  location: Joi.string().optional().allow(null, ""),

  // ── NEW: Top-level district/city selected from frontend before department ──
  selectedDistrictId: Joi.string().uuid().optional().allow(null, ""),

  departmentId: Joi.string().uuid().optional(),

  // When updating to a special-unit project: provide specialUnitId only.
  // When updating to a district project: provide districtAccess only (and set specialUnitId to null).
  specialUnitId: Joi.string().uuid().optional().allow(null, ""),

  districtAccess: Joi.when("specialUnitId", {
    is: Joi.string().uuid().exist(),
    then: Joi.any().strip(),
    otherwise: accessRuleSchema.optional(),
  }),

  stageIds: Joi.array().items(Joi.string().uuid().required()).optional(),

  hasSuperStructure: Joi.boolean().optional(),

  // FIX: Schema only validates shape. Service layer enforces conditional requirement.
  superStructure: Joi.array().items(superStructureBlockSchema).optional(),

  status: Joi.string()
    .valid(
      "AssignedProjects",
      "TotalProjects",
      "OngoingProjects",
      "CompletedProjects"
    )
    .optional(),

  updatedById: Joi.string().optional().allow(null, ""),

  /**
   * Mandatory when any department / district / city / special unit /
   * project access mapping is removed.  Optional otherwise.
   *
   * The service layer enforces the conditional-mandatory rule; the schema
   * only validates that when it is present it is a non-empty string.
   */
  changeReason: Joi.string().trim().min(1).optional().allow(null, "").messages({
    "string.min": "changeReason must not be blank when provided",
  }),
});

// ─────────────────────────────────────────────────────────────
// QUERY / PARAMS
// ─────────────────────────────────────────────────────────────

export const getAllProjectsSchema = Joi.object({
  pageNumber: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().trim().optional().allow(""),

  status: Joi.string()
    .valid(
      "AssignedProjects",
      "TotalProjects",
      "OngoingProjects",
      "CompletedProjects"
    )
    .optional(),

  departmentId: Joi.string().uuid().optional(),
  districtId: Joi.string().uuid().optional(),
  specialUnitId: Joi.string().uuid().optional(),
  userId: Joi.string().uuid().optional(),
})
  .nand("departmentId", "specialUnitId");

export const getProjectByIdSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

export const deleteProjectSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

export const updateParamsSchema = Joi.object({
  id: Joi.string().uuid().required(),
});