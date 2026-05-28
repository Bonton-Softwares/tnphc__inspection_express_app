import express from "express";
import { upload } from "../../utils/multer";
import { validateRequest } from "../../middleware/validateRequest";
import {
  createInteriorsProgressSchema,
  updateInteriorsProgressSchema,
  createInteriorsQualitySchema,
  updateInteriorsQualitySchema,
  getByProjectSchema,
  deleteSchema,
  updateProgressParamSchema,
  updateQualityParamSchema
} from "./InteriorsStage.schema";
import {
  getInteriorsFullViewController,
  createInteriorsProgressController,
  updateInteriorsProgressController,
  createInteriorsQualityController,
  updateInteriorsQualityController,
  getInteriorsProgressByProjectController,
  getInteriorsQualityByProgressController,
  deleteInteriorsProgressController
} from "./InteriorsStage.controller";

const router = express.Router();

const qualityUpload = upload.fields([
  { name: "cementPhoto",          maxCount: 3 },
  { name: "sandPhoto",            maxCount: 3 },
  { name: "sandSievePhoto",       maxCount: 3 },
  { name: "aggregatePhoto",       maxCount: 3 },
  { name: "waterPhoto",           maxCount: 3 },
  { name: "concretePhoto",        maxCount: 3 },
  { name: "concreteQualityPhoto", maxCount: 3 },
  { name: "bricksPhoto",          maxCount: 3 },
  { name: "bricksQualityPhoto",   maxCount: 3 },
  { name: "plasteringPhoto",      maxCount: 3 }
]);

// ─── GET ───────────────────────────────────────────────────────────

// Full project view: blocks → floors → progress status + quality per floor
router.get(
  "/full/:projectId",
  validateRequest(getByProjectSchema, "params"),
  getInteriorsFullViewController
);

// All progress records for a project (with quality included)
router.get(
  "/progress/:projectId",
  validateRequest(getByProjectSchema, "params"),
  getInteriorsProgressByProjectController
);

// Quality for a specific progress record (used to pre-fill edit form)
router.get(
  "/quality/:progressId",
  validateRequest(updateQualityParamSchema, "params"),
  getInteriorsQualityByProgressController
);

// ─── PROGRESS ──────────────────────────────────────────────────────

// Create progress for a block+floor (upserts if already exists)
router.post(
  "/progress",
  upload.fields([{ name: "progressPhoto", maxCount: 5 }]),
  validateRequest(createInteriorsProgressSchema, "body"),
  createInteriorsProgressController
);

// Update progress by id
router.put(
  "/progress/:id",
  upload.fields([{ name: "progressPhoto", maxCount: 5 }]),
  validateRequest(updateProgressParamSchema, "params"),
  validateRequest(updateInteriorsProgressSchema, "body"),
  updateInteriorsProgressController
);

// Soft delete progress
router.delete(
  "/progress/:id",
  validateRequest(deleteSchema, "params"),
  deleteInteriorsProgressController
);

// ─── QUALITY ───────────────────────────────────────────────────────
// Both POST and PUT use the same upsert logic (by progressId).
// POST  → first submission (creates quality record)
// PUT   → re-open & edit (updates existing quality record)
// The form should call GET /quality/:progressId first to pre-fill values.

router.post(
  "/quality",
  qualityUpload,
  validateRequest(createInteriorsQualitySchema, "body"),
  createInteriorsQualityController
);

router.put(
  "/quality/:progressId",
  qualityUpload,
  validateRequest(updateQualityParamSchema, "params"),
  validateRequest(updateInteriorsQualitySchema, "body"),
  updateInteriorsQualityController
);

export default router;