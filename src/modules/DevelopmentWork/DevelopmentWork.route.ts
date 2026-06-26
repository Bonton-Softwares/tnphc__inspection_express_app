import express from "express";
import { upload } from "../../utils/multer";
import { validateRequest } from "../../middleware/validateRequest";
import {
  createDevelopmentWork,
  getDevelopmentWorkByBuildingInspectionId,
  getDevelopmentWorkById,
  updateDevelopmentWork,
  deleteDevelopmentWork
} from "./DevelopmentWork.controller";
import {
  createDevelopmentWorkSchema,
  updateDevelopmentWorkSchema
} from "./DevelopmentWork.schema";

const router = express.Router();

const uploadFields = upload.fields([
  { name: "sumpCapacityPhotos",            maxCount: 5 },
  { name: "sumpQualityPhotos",             maxCount: 5 },
  { name: "pumpsSpecPhotos",               maxCount: 5 },
  { name: "standbyPumpsPhotos",            maxCount: 5 },
  { name: "pumpsWorkingPhotos",            maxCount: 5 },
  { name: "borewellPhotos",                maxCount: 5 },
  { name: "borewellLabReport",             maxCount: 5 },
  { name: "roadPhotos",                    maxCount: 5 },
  { name: "compoundWallQualityPhotos",     maxCount: 5 },
  { name: "compoundWallExpansionPhotos",   maxCount: 5 },
  { name: "compoundWallAirVentsPhotos",    maxCount: 5 },
  { name: "otherDefectsPhotos",            maxCount: 5 }
]);

// ─── CREATE (upsert by buildingInspectionId) ───────────────────────
router.post(
  "/",
  uploadFields,
  validateRequest(createDevelopmentWorkSchema),
  createDevelopmentWork
);

// ─── GET by buildingInspectionId ───────────────────────────────────
router.get(
  "/building-inspection/:buildingInspectionId",
  getDevelopmentWorkByBuildingInspectionId
);

// ─── GET by developmentWorkId ──────────────────────────────────────
router.get("/:id", getDevelopmentWorkById);

// ─── UPDATE ────────────────────────────────────────────────────────
router.put(
  "/:id",
  uploadFields,
  validateRequest(updateDevelopmentWorkSchema),
  updateDevelopmentWork
);

// ─── DELETE ────────────────────────────────────────────────────────
router.delete("/:id", deleteDevelopmentWork);

export default router;