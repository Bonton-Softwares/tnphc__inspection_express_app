import express from "express";
import { upload } from "../../utils/multer";
import { validateRequest } from "../../middleware/validateRequest";
import {
  createBuildingInspection,
  getBuildingInspectionSetup,
  getBuildingInspectionById,
  updateBuildingInspection,
  deleteBuildingInspection,
  getBuildingInspectionByFloorController
} from "./BuildingInspection.controller";
import {
  createBuildingInspectionSchema,
  updateBuildingInspectionSchema
} from "./BuildingInspection.schema";

const router = express.Router();

const uploadFields = upload.fields([
  // STRUCTURE
  { name: "structureAlignmentPhoto",     maxCount: 5 },
  { name: "structureConcreteCubeReport", maxCount: 5 },
  { name: "structureCementReport",       maxCount: 5 },
  { name: "structureSteelReport",        maxCount: 5 },
  { name: "structureWaterReport",        maxCount: 5 },
  { name: "structureSandReport",         maxCount: 5 },
  { name: "structureAggregateReport",    maxCount: 5 },
  { name: "structureBricksReport",       maxCount: 5 },

  // PAINTING
  { name: "paintingDefectPhoto",         maxCount: 5 },

  // TILING & FLOORING
  { name: "tilingDefectPhoto",           maxCount: 5 },

  // FALSE CEILING
  { name: "falseCeilingDefectPhoto",     maxCount: 5 },

  // PLUMBING
  { name: "plumbingWaterSupplyPhoto",    maxCount: 5 },
  { name: "plumbingLeakagePhoto",        maxCount: 5 },

  // ELECTRICAL
  { name: "electricalSwitchPhoto",       maxCount: 5 },
  { name: "electricalPowerPhoto",        maxCount: 5 },
  { name: "electricalVoltagePhoto",      maxCount: 5 },
  { name: "electricalEarthingPhoto",     maxCount: 5 },
  { name: "electricalELCBPhoto",         maxCount: 5 },

  // DOORS & WINDOWS
  { name: "dwQualityPhoto",              maxCount: 5 },
  { name: "dwOperationPhoto",            maxCount: 5 },

  // LIFTS
  { name: "liftWorkingPhoto",            maxCount: 5 },
  { name: "liftSafetyPhoto",             maxCount: 5 },
  { name: "liftCertificatePhoto",        maxCount: 5 },  // ← was missing

  // TERRACE
  { name: "terraceRoofTilesPhoto",       maxCount: 5 },
  { name: "terraceDrainagePhoto",        maxCount: 5 },
  { name: "terraceWaterproofingReport",  maxCount: 5 },
  { name: "terraceLeakagePhoto",         maxCount: 5 },
  { name: "terraceLeakageResultPhoto",   maxCount: 5 }
]);

// ── Setup (must be before /:buildingInspectionId) ──────────
router.get("/setup/:projectId", getBuildingInspectionSetup);

// ── Create (upsert — backend decides create or update) ─────
router.post(
  "/",
  uploadFields,
  validateRequest(createBuildingInspectionSchema),
  createBuildingInspection
);

// ── Get by buildingInspectionId ────────────────────────────
router.get("/:buildingInspectionId", getBuildingInspectionById);

router.get(
  "/floor/:floorId",
  getBuildingInspectionByFloorController
);

// ── Update by buildingInspectionId ─────────────────────────
router.put(
  "/:buildingInspectionId",
  uploadFields,
  validateRequest(updateBuildingInspectionSchema),
  updateBuildingInspection
);

// ── Soft delete ────────────────────────────────────────────
router.delete("/:buildingInspectionId", deleteBuildingInspection);

export default router;