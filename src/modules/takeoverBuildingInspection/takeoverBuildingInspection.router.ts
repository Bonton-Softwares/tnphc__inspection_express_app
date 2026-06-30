import express from "express";
import { upload } from "../../utils/multer";
import { validateRequest } from "../../middleware/validateRequest";
import {
  createTakeoverBuildingInspection,
  getAllTakeoverBuildingInspection,
  getTakeoverBuildingInspectionById,
  getTakeoverBuildingInspectionByProjectId,
  updateTakeoverBuildingInspection,
  deleteTakeoverBuildingInspection,
  getTakeoverBuildingInspectionSetup,
  getTakeoverBuildingInspectionByFloor
} from "./takeoverBuildingInspection.controller";
import {
  createTakeoverBuildingInspectionSchema,
  updateTakeoverBuildingInspectionSchema
} from "./takeoverBuildingInspection.schema";

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

  // TERRACE
  { name: "terraceRoofTilesPhoto",       maxCount: 5 },
  { name: "terraceDrainagePhoto",        maxCount: 5 },
  { name: "terraceWaterproofingReport",  maxCount: 5 },
  { name: "terraceLeakagePhoto",         maxCount: 5 },
  { name: "terraceLeakageResultPhoto",   maxCount: 5 }
]);
router.get("/setup/:projectId", getTakeoverBuildingInspectionSetup);

router.post(
  "/",
  uploadFields,
  validateRequest(createTakeoverBuildingInspectionSchema),
  createTakeoverBuildingInspection
);

// renamed from "/:projectId" to avoid clashing with "/:id"
router.get("/project/:projectId", getAllTakeoverBuildingInspection);

router.get(
  "/getTakeoverBuildingInspection/:projectId",
  getTakeoverBuildingInspectionByProjectId
);

router.get("/floor/:floorId", getTakeoverBuildingInspectionByFloor);
// now safely reachable
router.get("/:id", getTakeoverBuildingInspectionById);

router.put(
  "/:id",
  uploadFields,
  validateRequest(updateTakeoverBuildingInspectionSchema),
  updateTakeoverBuildingInspection
);

router.delete("/deleteTakeoverBuildingInspection/:id", deleteTakeoverBuildingInspection);



export default router;