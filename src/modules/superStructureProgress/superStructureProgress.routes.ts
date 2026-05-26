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
  getQualityByProjectController,
  deleteProgressController,
  downloadSuperStructurePdfController
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
router.get(
  "/full/:projectId",
  validateRequest(getByProjectSchema, "params"),
  getSuperStructureFullViewController
);

router.get(
  "/progress/:projectId",
  validateRequest(getByProjectSchema, "params"),
  getProgressByProjectController
);

router.get(
  "/quality/:projectId",
  validateRequest(getByProjectSchema, "params"),
  getQualityByProjectController
);

// ─── PROGRESS ──────────────────────────────────────────────────────
router.post(
  "/progress",
  upload.fields([{ name: "photo" }]),
  validateRequest(createProgressSchema, "body"),
  createProgressController
);

router.put(
  "/progress/:id",
  upload.fields([{ name: "photo" }]),
  validateRequest(updateProgressParamSchema, "params"),
  validateRequest(updateProgressSchema, "body"),
  updateProgressController
);

router.delete(
  "/progress/:id",
  validateRequest(deleteSchema, "params"),
  deleteProgressController
);

// ─── QUALITY ───────────────────────────────────────────────────────
router.post(
  "/quality",
  qualityUpload,
  validateRequest(createQualitySchema, "body"),
  createQualityController
);

router.put(
  "/quality/:projectId",
  qualityUpload,
  validateRequest(updateQualityParamSchema, "params"),
  validateRequest(updateQualitySchema, "body"),
  updateQualityController
);



router.get(
  "/download-pdf/:projectId",
  downloadSuperStructurePdfController
);

export default router;