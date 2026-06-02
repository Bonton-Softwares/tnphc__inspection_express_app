// src/modules/pdf/pdf.routes.ts
import express from "express";
import {
  downloadAdminPdfController,
  downloadProjectPdfController,
  downloadUserPdfController,
} from "./pdf.controller";

const router = express.Router();

/**
 * GET /pdf
 * Admin report — all projects (with optional filters)
 * Query: ?search=&districts=D1,D2&departments=Dept1&stages=Foundation Stage
 */
router.get("/", downloadAdminPdfController);

/**
 * GET /pdf/project/:projectId
 * Single project detailed report — admin downloads one specific project
 */
router.get("/:projectId", downloadProjectPdfController);

/**
 * GET /pdf/user/:userId
 * User-specific report — all projects created by that user
 */
router.get("/user/:userId", downloadUserPdfController);

export default router;
