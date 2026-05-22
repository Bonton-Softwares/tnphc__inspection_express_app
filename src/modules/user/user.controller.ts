// user.controller.ts
import { Request, Response } from "express";
import {
  getAllUsersUsecase,
  getUserByIdUsecase,
  createUserUsecase,
  updateUserUsecase,
  deleteUserUsecase,
  loginUsecase,
  getDepartmentsUsecase,
  getMasterDistrictsUsecase,
  getRolesUsecase,
  getSpecialUnitsUsecase,
} from "./user.usecase";

// ─── RESPONSE HELPERS ────────────────────────────────────────

const ok = (res: Response, data: any, status = 200) =>
  res.status(status).json({ success: true, data });

const fail = (res: Response, error: any, status = 400) =>
  res.status(status).json({
    success: false,
    message: error?.message ?? "An error occurred",
  });

// ─── USER CRUD ───────────────────────────────────────────────

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    ok(res, await getAllUsersUsecase(req.query));
  } catch (e) {
    fail(res, e);
  }
};

export const getUserById = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    ok(res, await getUserByIdUsecase(req.params.id));
  } catch (e) {
    fail(res, e, 404);
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const user = await createUserUsecase(req.body);
    ok(res, user, 201);
  } catch (e: any) {
    const status =
      e.message?.includes("already") || e.message?.includes("in use")
        ? 409
        : 400;
    fail(res, e, status);
  }
};

export const updateUser = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const user = await updateUserUsecase(req.params.id, req.body);
    ok(res, user);
  } catch (e: any) {
    const status =
      e.message?.includes("already") || e.message?.includes("in use")
        ? 409
        : 400;
    fail(res, e, status);
  }
};

export const deleteUser = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const updatedById = (req as any).user?.id ?? req.body?.updatedById;
    await deleteUserUsecase(req.params.id, updatedById);
    ok(res, { message: "User deleted successfully" });
  } catch (e) {
    fail(res, e);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const result = await loginUsecase(req.body);
    ok(res, result);
  } catch (e: any) {
    // Always return 401 with a generic message for login failures
    // to avoid leaking whether username or password was wrong
    res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
  }
};

// ─── DROPDOWNS ───────────────────────────────────────────────

export const getDepartments = async (_req: Request, res: Response) => {
  try {
    ok(res, await getDepartmentsUsecase());
  } catch (e) {
    fail(res, e);
  }
};

export const getMasterDistricts = async (req: Request, res: Response) => {
  try {
    // ?type=DISTRICT or ?type=CITY or no filter = both
    const type = req.query.type as "DISTRICT" | "CITY" | undefined;
    ok(res, await getMasterDistrictsUsecase(type));
  } catch (e) {
    fail(res, e);
  }
};

export const getRoles = async (_req: Request, res: Response) => {
  try {
    ok(res, await getRolesUsecase());
  } catch (e) {
    fail(res, e);
  }
};

export const getSpecialUnits = async (_req: Request, res: Response) => {
  try {
    ok(res, await getSpecialUnitsUsecase());
  } catch (e) {
    fail(res, e);
  }
};