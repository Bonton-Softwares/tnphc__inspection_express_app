import express from "express";
import { upload } from "../../utils/multer";
import { validateRequest } from "../../middleware/validateRequest";
import {
  createProgressSchema,
  updateProgressSchema,
  saveAnswersSchema,
  getByModuleProjectSchema,
  progressParamSchema,
  deleteProgressParamSchema
} from "./Inspection.schema";
import {
  getInspectionSetupController,
  createProgressController,
  updateProgressController,
  deleteProgressController,
  getProgressDetailController,
  saveAnswersController,
    getProgressDataController
} from "./Inspection.controller";

const router = express.Router();

// Dynamic upload: question answers may include any number of image fields.
// Frontend sends the multer field name matching the question's image key.
const answerUpload = upload.any();

// ─── GET ───────────────────────────────────────────────────────────

// Initial setup: blocks, floors, stages for module, existing progress records.
// :module examples: framed-structure | load-bearing-structure | interior | exterior
router.get(
  "/setup/:module/:projectId",
  validateRequest(getByModuleProjectSchema, "params"),
  getInspectionSetupController
);

// Progress detail: progress record + dynamic questions + saved answers.
// Used after progress creation and for re-opening the form to edit.
router.get(
  "/progress/:progressId",
  validateRequest(progressParamSchema, "params"),
  getProgressDetailController
);

// ─── PROGRESS ──────────────────────────────────────────────────────

// Create progress for a block + floor + room + stage.
// Returns existing progressId if the same combination already exists.
router.post(
  "/progress",
  validateRequest(createProgressSchema, "body"),
  createProgressController
);

router.get(
  "/progress-data/:progressId",
  validateRequest(progressParamSchema, "params"),
  getProgressDataController
);

// Update work-started date, delay details, or general remarks.
router.put(
  "/progress/:progressId",
  validateRequest(progressParamSchema, "params"),
  validateRequest(updateProgressSchema, "body"),
  updateProgressController
);

// Soft delete progress record.
router.delete(
  "/progress/:progressId",
  validateRequest(deleteProgressParamSchema, "params"),
  deleteProgressController
);

// ─── ANSWERS ───────────────────────────────────────────────────────

// Save answers for a progress record.
// Upserts each answer — only updates changed values, inserts new ones.
// For image-type questions, pass the multer field name as the answer value;
// the backend resolves uploaded file URL and stores as JSON in the answer field.
router.post(
  "/progress/:progressId/answers",
  validateRequest(progressParamSchema, "params"),
  answerUpload,
  validateRequest(saveAnswersSchema, "body"),
  saveAnswersController
);

export default router;