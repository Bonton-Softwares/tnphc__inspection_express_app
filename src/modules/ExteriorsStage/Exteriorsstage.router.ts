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
  getExteriorsQualityByProjectController,
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
router.get(
  "/full/:projectId",
  validateRequest(getByProjectSchema, "params"),
  getExteriorsFullViewController
);

router.get(
  "/progress/:projectId",
  validateRequest(getByProjectSchema, "params"),
  getExteriorsProgressByProjectController
);

router.get(
  "/quality/:projectId",
  validateRequest(getByProjectSchema, "params"),
  getExteriorsQualityByProjectController
);

// ─── PROGRESS ──────────────────────────────────────────────────────
router.post(
  "/progress",
  upload.fields([{ name: "progressPhoto", maxCount: 5 }]),
  validateRequest(createExteriorsProgressSchema, "body"),
  createExteriorsProgressController
);

router.put(
  "/progress/:id",
  upload.fields([{ name: "progressPhoto", maxCount: 5 }]),
  validateRequest(updateProgressParamSchema, "params"),
  validateRequest(updateExteriorsProgressSchema, "body"),
  updateExteriorsProgressController
);

router.delete(
  "/progress/:id",
  validateRequest(deleteSchema, "params"),
  deleteExteriorsProgressController
);

// ─── QUALITY ───────────────────────────────────────────────────────
router.post(
  "/quality",
  qualityUpload,
  validateRequest(createExteriorsQualitySchema, "body"),
  createExteriorsQualityController
);

router.put(
  "/quality/:projectId",
  qualityUpload,
  validateRequest(updateQualityParamSchema, "params"),
  validateRequest(updateExteriorsQualitySchema, "body"),
  updateExteriorsQualityController
);

export default router;