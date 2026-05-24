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
  getInteriorsQualityByProjectController,
  deleteInteriorsProgressController
} from "./InteriorsStage.controller";

const router = express.Router();

const qualityUpload = upload.fields([
  { name: "cementPhoto",           maxCount: 3 },
  { name: "sandPhoto",             maxCount: 3 },
  { name: "sandSievePhoto",        maxCount: 3 },
  { name: "aggregatePhoto",        maxCount: 3 },
  { name: "waterPhoto",            maxCount: 3 },
  { name: "concretePhoto",         maxCount: 3 },
  { name: "concreteQualityPhoto",  maxCount: 3 },
  { name: "bricksPhoto",           maxCount: 3 },
  { name: "bricksQualityPhoto",    maxCount: 3 },
  { name: "plasteringPhoto",       maxCount: 3 }
]);

// ─── GET ───────────────────────────────────────────────────────────
router.get(
  "/full/:projectId",
  validateRequest(getByProjectSchema, "params"),
  getInteriorsFullViewController
);

router.get(
  "/progress/:projectId",
  validateRequest(getByProjectSchema, "params"),
  getInteriorsProgressByProjectController
);

router.get(
  "/quality/:projectId",
  validateRequest(getByProjectSchema, "params"),
  getInteriorsQualityByProjectController
);

// ─── PROGRESS ──────────────────────────────────────────────────────
router.post(
  "/progress",
  upload.fields([{ name: "progressPhoto", maxCount: 5 }]),
  validateRequest(createInteriorsProgressSchema, "body"),
  createInteriorsProgressController
);

router.put(
  "/progress/:id",
  upload.fields([{ name: "progressPhoto", maxCount: 5 }]),
  validateRequest(updateProgressParamSchema, "params"),
  validateRequest(updateInteriorsProgressSchema, "body"),
  updateInteriorsProgressController
);

router.delete(
  "/progress/:id",
  validateRequest(deleteSchema, "params"),
  deleteInteriorsProgressController
);

// ─── QUALITY ───────────────────────────────────────────────────────
router.post(
  "/quality",
  qualityUpload,
  validateRequest(createInteriorsQualitySchema, "body"),
  createInteriorsQualityController
);

router.put(
  "/quality/:projectId",
  qualityUpload,
  validateRequest(updateQualityParamSchema, "params"),
  validateRequest(updateInteriorsQualitySchema, "body"),
  updateInteriorsQualityController
);

export default router;