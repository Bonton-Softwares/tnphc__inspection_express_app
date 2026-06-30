import express from "express";
import { upload } from "../../utils/multer";
import { validateRequest } from "../../middleware/validateRequest";
import * as ctrl from "./takeoverDevelopmentWork.controller";
import {
  createTakeoverDevelopmentWorkSchema,
  updateTakeoverDevelopmentWorkSchema
} from "./takeoverDevelopmentWork.schema";

const router = express.Router();

const uploadFields = upload.fields([
  { name: "sumpCapacityPhotos", maxCount: 5 },
  { name: "sumpQualityPhotos", maxCount: 5 },
  { name: "pumpsSpecPhotos", maxCount: 5 },
  { name: "standbyPumpsPhotos", maxCount: 5 },
  { name: "pumpsWorkingPhotos", maxCount: 5 },
  { name: "borewellPhotos", maxCount: 5 },
  { name: "borewellLabReport", maxCount: 5 },
  { name: "roadPhotos", maxCount: 5 },
  { name: "compoundWallQualityPhotos", maxCount: 5 },
  { name: "compoundWallExpansionPhotos", maxCount: 5 },
  { name: "compoundWallAirVentsPhotos", maxCount: 5 },
  { name: "otherDefectsPhotos", maxCount: 5 }
]);

// ─── CREATE (upsert by buildingInspectionId) ───────────────────────
router.post(
  "/",
  uploadFields,
  validateRequest(createTakeoverDevelopmentWorkSchema),
  ctrl.createTakeoverDevelopmentWork
);

// ─── GET by buildingInspectionId ───────────────────────────────────
router.get(
  "/getTakeoverDevelopmentWork/:buildingInspectionId",
  ctrl.getTakeoverDevelopmentWorkByBuildingInspectionId
);

// ─── GET by id ──────────────────────────────────────────────────────
router.get("/getTakeoverDevelopmentWorkById/:id", ctrl.getTakeoverDevelopmentWorkById);

// ─── UPDATE ────────────────────────────────────────────────────────
router.put(
  "/:id",
  uploadFields,
  validateRequest(updateTakeoverDevelopmentWorkSchema),
  ctrl.updateTakeoverDevelopmentWork
);

// ─── DELETE ────────────────────────────────────────────────────────
router.delete("/:id", ctrl.deleteTakeoverDevelopmentWork);

export default router;