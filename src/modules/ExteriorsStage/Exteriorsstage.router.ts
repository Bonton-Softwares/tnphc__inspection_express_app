import express from "express";
import { upload } from "../../utils/multer";
import { validateRequest } from "../../middleware/validateRequest";
import {
  createExteriorsProgressSchema,
  updateExteriorsProgressSchema,
  createExteriorsQualitySchema,
  updateExteriorsQualitySchema,
  getByProjectSchema,
  deleteSchema,
  updateProgressParamSchema,
  updateQualityParamSchema
} from "./Exteriorsstage.schema";
import {
  getExteriorsFullViewController,
  createExteriorsProgressController,
  updateExteriorsProgressController,
  createExteriorsQualityController,
  updateExteriorsQualityController,
  getExteriorsProgressByProjectController,
  getExteriorsQualityByProgressController,   // ← renamed (by progressId)
  deleteExteriorsProgressController
} from "./Exteriorsstage.controller";

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

// Full project view: superStructures → progress status + quality per progress
router.get(
  "/full/:projectId",
  validateRequest(getByProjectSchema, "params"),
  getExteriorsFullViewController
);

// All progress records for a project (with quality included)
router.get(
  "/progress/:projectId",
  validateRequest(getByProjectSchema, "params"),
  getExteriorsProgressByProjectController
);

// Quality for a specific progress record (used to pre-fill edit form)
router.get(
  "/quality/:progressId",
  validateRequest(updateQualityParamSchema, "params"),
  getExteriorsQualityByProgressController
);

// ─── PROGRESS ──────────────────────────────────────────────────────

// Create progress (upserts by projectId + block + floor + stageOfWork)
router.post(
  "/progress",
  upload.fields([{ name: "progressPhoto", maxCount: 5 }]),
  validateRequest(createExteriorsProgressSchema, "body"),
  createExteriorsProgressController
);

// Update progress by id
router.put(
  "/progress/:id",
  upload.fields([{ name: "progressPhoto", maxCount: 5 }]),
  validateRequest(updateProgressParamSchema, "params"),
  validateRequest(updateExteriorsProgressSchema, "body"),
  updateExteriorsProgressController
);

// Soft delete progress
router.delete(
  "/progress/:id",
  validateRequest(deleteSchema, "params"),
  deleteExteriorsProgressController
);

// ─── QUALITY ───────────────────────────────────────────────────────
// Both POST and PUT use the same upsert logic (by progressId).
// POST  → first submission (creates quality record)
// PUT   → re-open & edit (updates existing quality record)
// The form should call GET /quality/:progressId first to pre-fill values.

router.post(
  "/quality",
  qualityUpload,
  validateRequest(createExteriorsQualitySchema, "body"),
  createExteriorsQualityController
);

router.put(
  "/quality/:progressId",
  qualityUpload,
  validateRequest(updateQualityParamSchema, "params"),
  validateRequest(updateExteriorsQualitySchema, "body"),
  updateExteriorsQualityController
);

export default router;