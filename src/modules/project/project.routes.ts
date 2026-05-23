import express from "express";
import {
  createProjectController,
  getAllProjectsController,
  getProjectByIdController,
  updateProjectController,
  deleteProjectController,
  getProjectDashboardController,
  getProjectsByUserController,
} from "./project.controller";
import { validateRequest } from "../../middleware/validateRequest";
import {
  createProjectSchema,
  updateProjectSchema,
  getProjectByIdSchema,
  deleteProjectSchema,
  getAllProjectsSchema,
  updateParamsSchema,
} from "./project.schema";

const router = express.Router();

// ── CREATE ───────────────────────────────────────────────────
router.post(
  "/createProject",
  validateRequest(createProjectSchema, "body"),
  createProjectController
);

// ── GET ALL ──────────────────────────────────────────────────
router.get(
  "/getProjects",
  validateRequest(getAllProjectsSchema, "query"),
  getAllProjectsController
);

// ── DASHBOARD (no userId) ────────────────────────────────────
router.get(
  "/getProjectDashboard",
  getProjectDashboardController
);

// ── DASHBOARD (with userId) ──────────────────────────────────
router.get(
  "/getProjectDashboard/:userId",
  getProjectDashboardController
);

// ── ASSIGNED PROJECTS (all) ──────────────────────────────────
router.get(
  "/getAssignedProjects",
  getProjectsByUserController
);

// ── ASSIGNED PROJECTS (by userId) ────────────────────────────
router.get(
  "/getAssignedProjects/:userId",
  getProjectsByUserController
);

// ── GET BY ID ────────────────────────────────────────────────
router.get(
  "/getProjectById/:id",
  validateRequest(getProjectByIdSchema, "params"),
  getProjectByIdController
);

// ── UPDATE ───────────────────────────────────────────────────
router.put(
  "/:id",
  validateRequest(updateParamsSchema, "params"),
  validateRequest(updateProjectSchema, "body"),
  updateProjectController
);

// ── DELETE (soft) ────────────────────────────────────────────
router.patch(
  "/:id",
  validateRequest(deleteProjectSchema, "params"),
  deleteProjectController
);

export default router;