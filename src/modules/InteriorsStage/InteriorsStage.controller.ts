import { Request, Response } from "express";
import {
  getInteriorsFullViewUsecase,
  createInteriorsProgressUsecase,
  updateInteriorsProgressUsecase,
  createInteriorsQualityUsecase,
  updateInteriorsQualityUsecase,
  deleteInteriorsProgressUsecase,
  getInteriorsProgressByProjectUsecase,
  getInteriorsQualityByProjectUsecase
} from "./InteriorsStage.usecase";

const getSingleValue = (val: any): string =>
  Array.isArray(val) ? val[0] : val;

// ─── GET FULL VIEW ─────────────────────────────────────────────────
export const getInteriorsFullViewController = async (
  req: Request,
  res: Response
) => {
  try {
    const projectId = getSingleValue(req.params.projectId);
    const data = await getInteriorsFullViewUsecase(projectId);
    res.status(200).json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ─── CREATE PROGRESS ───────────────────────────────────────────────
export const createInteriorsProgressController = async (
  req: Request,
  res: Response
) => {
  try {
    const data = await createInteriorsProgressUsecase(
      req.body, req.files, req
    );
    res.status(200).json({ success: true, data });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// ─── UPDATE PROGRESS ───────────────────────────────────────────────
export const updateInteriorsProgressController = async (
  req: Request,
  res: Response
) => {
  try {
    const id = getSingleValue(req.params.id);
    const data = await updateInteriorsProgressUsecase(
      id, req.body, req.files, req
    );
    res.status(200).json({ success: true, data });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// ─── CREATE QUALITY ────────────────────────────────────────────────
export const createInteriorsQualityController = async (
  req: Request,
  res: Response
) => {
  try {
    const data = await createInteriorsQualityUsecase(
      req.body, req.files, req
    );
    res.status(200).json({ success: true, data });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// ─── UPDATE QUALITY ────────────────────────────────────────────────
export const updateInteriorsQualityController = async (
  req: Request,
  res: Response
) => {
  try {
    const data = await updateInteriorsQualityUsecase(
      req.body, req.files, req
    );
    res.status(200).json({ success: true, data });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// ─── DELETE ────────────────────────────────────────────────────────
export const deleteInteriorsProgressController = async (
  req: Request,
  res: Response
) => {
  try {
    const id = getSingleValue(req.params.id);
    await deleteInteriorsProgressUsecase(id, req);
    res.status(200).json({ success: true, message: "Deleted successfully" });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ─── GET PROGRESS ──────────────────────────────────────────────────
export const getInteriorsProgressByProjectController = async (
  req: Request,
  res: Response
) => {
  try {
    const projectId = getSingleValue(req.params.projectId);
    const data = await getInteriorsProgressByProjectUsecase(projectId);
    res.status(200).json({ success: true, data });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// ─── GET QUALITY ───────────────────────────────────────────────────
export const getInteriorsQualityByProjectController = async (
  req: Request,
  res: Response
) => {
  try {
    const projectId = getSingleValue(req.params.projectId);
    const data = await getInteriorsQualityByProjectUsecase(projectId);
    res.status(200).json({ success: true, data });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
};