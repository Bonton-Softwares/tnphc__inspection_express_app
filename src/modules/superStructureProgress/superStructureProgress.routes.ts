import express from "express";
import { upload } from "../../utils/multer";
import { validateRequest } from "../../middleware/validateRequest";
import {
  createProgressSchema,
  updateProgressSchema,
  createQualitySchema,
  updateQualitySchema,
  getByProjectSchema,
  deleteSchema,
  updateProgressParamSchema,
  updateQualityParamSchema
} from "./superStructureProgress.schema";
import {
  getSuperStructureFullViewController,
  createProgressController,
  updateProgressController,
  createQualityController,
  updateQualityController,
  getProgressByProjectController,
  getQualityByProgressController,
  deleteProgressController
} from "./superStructureProgress.controller";

const router = express.Router();

const qualityUpload = upload.fields([
  { name: "cementPhoto" },
  { name: "sandPhoto" },
  { name: "sandSievePhoto" },
  { name: "steelPhoto" },
  { name: "aggregatePhoto" },
  { name: "waterPhoto" },
  { name: "concretePhoto" },
  { name: "concreteQualityPhoto" },
  { name: "bricksPhoto" },
  { name: "bricksQualityPhoto" },
  { name: "brickWallAlignmentPhoto" }
]);

// ─── GET ───────────────────────────────────────────────────────────

// Full project view: blocks → floors → progress status + quality per floor
router.get(
  "/full/:projectId",
  validateRequest(getByProjectSchema, "params"),
  getSuperStructureFullViewController
);

// All progress records for a project (with quality included)
router.get(
  "/progress/:projectId",
  validateRequest(getByProjectSchema, "params"),
  getProgressByProjectController
);

// Quality for a specific progress record (used to pre-fill edit form)
router.get(
  "/quality/:progressId",
  validateRequest(updateQualityParamSchema, "params"),
  getQualityByProgressController
);

// ─── PROGRESS ──────────────────────────────────────────────────────

// Create progress for a block+floor (upserts if already exists)
router.post(
  "/progress",
  upload.fields([{ name: "photo" }]),
  validateRequest(createProgressSchema, "body"),
  createProgressController
);

// Update progress by id
router.put(
  "/progress/:id",
  upload.fields([{ name: "photo" }]),
  validateRequest(updateProgressParamSchema, "params"),
  validateRequest(updateProgressSchema, "body"),
  updateProgressController
);

// Soft delete progress
router.delete(
  "/progress/:id",
  validateRequest(deleteSchema, "params"),
  deleteProgressController
);

// ─── QUALITY ───────────────────────────────────────────────────────
// Both POST and PUT use the same upsert logic (by progressId).
// POST  → first submission (creates quality record)
// PUT   → re-open & edit (updates existing quality record)
// The form should call GET /quality/:progressId first to pre-fill values.

router.post(
  "/quality",
  qualityUpload,
  validateRequest(createQualitySchema, "body"),
  createQualityController
);

router.put(
  "/quality/:progressId",
  qualityUpload,
  validateRequest(updateQualityParamSchema, "params"),
  validateRequest(updateQualitySchema, "body"),
  updateQualityController
);

export default router;