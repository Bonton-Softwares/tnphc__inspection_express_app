// user.routes.ts
import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  login,
  getDepartments,
  getMasterDistricts,
  getRoles,
  getSpecialUnits,
  logout,          // ← ADD
} from "./user.controller";
import { validateRequest } from "../../middleware";
import { baseAuth } from "../../middleware/auth/baseAuth";
import {
  createUserSchema,
  deleteUserSchema,
  getAllUsersSchema,
  getUserByIdSchema,
  loginUserSchema,
  updateParamsSchema,
  updateUserSchema,
} from "./user.schema";
import prisma from "../../shared/prisma";

const router = Router();

// ── AUTH ──────────────────────────────────────────────────────
router.post("/login", validateRequest(loginUserSchema, "body"), login);
router.post("/logout", baseAuth, logout);

// ── USERS ─────────────────────────────────────────────────────
router.get(
  "/getAllUsers",
  validateRequest(getAllUsersSchema, "query"),
  getAllUsers
);

router.get(
  "/getUserById/:id",
  validateRequest(getUserByIdSchema, "params"),
  getUserById
);

router.post(
  "/createUser",
  validateRequest(createUserSchema, "body"),
  createUser
);

router.put(
  "/updateUser/:id",
  validateRequest(updateParamsSchema, "params"),
  validateRequest(updateUserSchema, "body"),
  updateUser
);

router.patch(
  "/deleteUser/:id",
  validateRequest(deleteUserSchema, "params"),
  deleteUser
);

// ── DROPDOWNS ─────────────────────────────────────────────────
router.get("/dropdowns/roles", getRoles);
router.get("/dropdowns/departments", getDepartments);
router.get("/dropdowns/masterDistricts", getMasterDistricts); // ?type=DISTRICT|CITY
router.get("/dropdowns/specialUnits", getSpecialUnits);




router.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return res.status(200).json({
      success: true,
      status: "UP",
      database: "CONNECTED",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      status: "DOWN",
      database: "DISCONNECTED",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;


