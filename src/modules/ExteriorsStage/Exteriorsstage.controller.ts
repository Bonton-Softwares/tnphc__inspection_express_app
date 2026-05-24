import { Request, Response } from "express";
import {
  getExteriorsFullViewUsecase,
  createExteriorsProgressUsecase,
  updateExteriorsProgressUsecase,
  createExteriorsQualityUsecase,
  updateExteriorsQualityUsecase,
  deleteExteriorsProgressUsecase,
  getExteriorsProgressByProjectUsecase,
  getExteriorsQualityByProjectUsecase
} from "./Exteriorsstage.usecase";

const getSingleValue = (val: any): string =>
  Array.isArray(val) ? val[0] : val;

// ─── GET FULL VIEW ─────────────────────────────────────────────────
export const getExteriorsFullViewController = async (
  req: Request,
  res: Response
) => {
  try {
    const projectId = getSingleValue(req.params.projectId);
    const data = await getExteriorsFullViewUsecase(projectId);
    res.status(200).json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ─── CREATE PROGRESS ───────────────────────────────────────────────
export const createExteriorsProgressController = async (
  req: Request,
  res: Response
) => {
  try {
    const data = await createExteriorsProgressUsecase(
      req.body, req.files, req
    );
    res.status(200).json({ success: true, data });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// ─── UPDATE PROGRESS ───────────────────────────────────────────────
export const updateExteriorsProgressController = async (
  req: Request,
  res: Response
) => {
  try {
    const id = getSingleValue(req.params.id);
    const data = await updateExteriorsProgressUsecase(
      id, req.body, req.files, req
    );
    res.status(200).json({ success: true, data });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// ─── CREATE QUALITY ────────────────────────────────────────────────
export const createExteriorsQualityController = async (
  req: Request,
  res: Response
) => {
  try {
    const data = await createExteriorsQualityUsecase(
      req.body, req.files, req
    );
    res.status(200).json({ success: true, data });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// ─── UPDATE QUALITY ────────────────────────────────────────────────
export const updateExteriorsQualityController = async (
  req: Request,
  res: Response
) => {
  try {
    const data = await updateExteriorsQualityUsecase(
      req.body, req.files, req
    );
    res.status(200).json({ success: true, data });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// ─── DELETE ────────────────────────────────────────────────────────
export const deleteExteriorsProgressController = async (
  req: Request,
  res: Response
) => {
  try {
    const id = getSingleValue(req.params.id);
    await deleteExteriorsProgressUsecase(id, req);
    res.status(200).json({ success: true, message: "Deleted successfully" });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ─── GET PROGRESS ──────────────────────────────────────────────────
export const getExteriorsProgressByProjectController = async (
  req: Request,
  res: Response
) => {
  try {
    const projectId = getSingleValue(req.params.projectId);
    const data = await getExteriorsProgressByProjectUsecase(projectId);
    res.status(200).json({ success: true, data });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// ─── GET QUALITY ───────────────────────────────────────────────────
export const getExteriorsQualityByProjectController = async (
  req: Request,
  res: Response
) => {
  try {
    const projectId = getSingleValue(req.params.projectId);
    const data = await getExteriorsQualityByProjectUsecase(projectId);
    res.status(200).json({ success: true, data });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
};