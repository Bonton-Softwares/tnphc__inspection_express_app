import express from "express";

import {
  downloadSuperStructurePdfController
} from "./pdf.controller";

const router = express.Router();

router.get(
  "/superstructure/:projectId",
  downloadSuperStructurePdfController
);

export default router;