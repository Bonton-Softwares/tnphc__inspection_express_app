import { Request, Response } from "express";
import {
  createProjectUsecase,
  getAllProjectsUsecase,
  getProjectByIdUsecase,
  updateProjectUsecase,
  deleteProjectUsecase,
  getProjectDashboardUsecase,
  getProjectsByUserUsecase,
} from "./project.usecase";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

const ok = (res: Response, data: any, status = 200) =>
  res.status(status).json({ success: true, data });

const fail = (res: Response, error: any, status = 500) =>
  res.status(status).json({
    success: false,
    message: error?.message ?? "An unexpected error occurred",
  });

/** Normalise a query param that might be a string[] to a single string */
const single = (val: any): string | undefined =>
  Array.isArray(val) ? val[0] : val;

// ─────────────────────────────────────────────────────────────
// CREATE PROJECT
// ─────────────────────────────────────────────────────────────

export const createProjectController = async (
  req: Request,
  res: Response
) => {
  try {
    const project = await createProjectUsecase(req.body);
    res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: project,
    });
  } catch (error: any) {
    fail(res, error, 400);
  }
};

// ─────────────────────────────────────────────────────────────
// GET ALL PROJECTS
// ─────────────────────────────────────────────────────────────

export const getAllProjectsController = async (
  req: Request,
  res: Response
) => {
  try {
    const result = await getAllProjectsUsecase({
      pageNumber: req.query.pageNumber as string | undefined,
      pageSize: req.query.pageSize as string | undefined,
      search: req.query.search as string | undefined,
      status: req.query.status as string | undefined,
      departmentId: single(req.query.departmentId),
      districtId: single(req.query.districtId),
      specialUnitId: single(req.query.specialUnitId),
      userId: single(req.query.userId),
    });

    res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    fail(res, error);
  }
};

// ─────────────────────────────────────────────────────────────
// GET PROJECT BY ID
// ─────────────────────────────────────────────────────────────

export const getProjectByIdController = async (
  req: Request,
  res: Response
) => {
  try {
    const project = await getProjectByIdUsecase(String(req.params.id));
    ok(res, project);
  } catch (error: any) {
    fail(res, error, 404);
  }
};

// ─────────────────────────────────────────────────────────────
// UPDATE PROJECT
// ─────────────────────────────────────────────────────────────

export const updateProjectController = async (
  req: Request,
  res: Response
) => {
  try {
    const project = await updateProjectUsecase(
      String(req.params.id),
      req.body
    );
    res.status(200).json({
      success: true,
      message: "Project updated successfully",
      data: project,
    });
  } catch (error: any) {
    fail(res, error, 400);
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE PROJECT (soft)
// ─────────────────────────────────────────────────────────────

export const deleteProjectController = async (
  req: Request,
  res: Response
) => {
  try {
    await deleteProjectUsecase(String(req.params.id));
    res.status(200).json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error: any) {
    fail(res, error, 400);
  }
};

// ─────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────

export const getProjectDashboardController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.params.userId as string | undefined;
    const data = await getProjectDashboardUsecase(userId);
    res.status(200).json({
      success: true,
      message: "Dashboard data fetched successfully",
      data,
    });
  } catch (error: any) {
    fail(res, error);
  }
};

// ─────────────────────────────────────────────────────────────
// GET PROJECTS BY USER
// ─────────────────────────────────────────────────────────────

export const getProjectsByUserController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId =
      typeof req.params.userId === "string"
        ? req.params.userId
        : undefined;

    const result = await getProjectsByUserUsecase({
      userId,
      pageNumber: req.query.pageNumber as string | undefined,
      pageSize: req.query.pageSize as string | undefined,
      search: req.query.search as string | undefined,
    });

    res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    fail(res, error);
  }
};