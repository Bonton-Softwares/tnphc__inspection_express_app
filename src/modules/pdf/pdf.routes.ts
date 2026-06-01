import { Router } from "express";

import {
  downloadAdminPdfController,
  downloadUserPdfController,
  downloadProjectPdfController,
} from "./pdf.controller";

const router = Router();

router.get("/", downloadAdminPdfController);

router.get("/user/:userId", downloadUserPdfController);

router.get("/:projectId", downloadProjectPdfController);

export default router;