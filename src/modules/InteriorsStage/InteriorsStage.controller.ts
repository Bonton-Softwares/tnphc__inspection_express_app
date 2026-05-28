import { Request, Response } from "express";
import {
  getInteriorsFullViewUsecase,
  createInteriorsProgressUsecase,
  updateInteriorsProgressUsecase,
  createInteriorsQualityUsecase,
  updateInteriorsQualityUsecase,
  deleteInteriorsProgressUsecase,
  getInteriorsProgressByProjectUsecase,
  getInteriorsQualityByProgressUsecase
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
// Quality is tied to a specific progress record via progressId in the body.
// If quality already exists for that progressId, it will be updated (upsert).
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
// Same upsert behaviour as create — idempotent by progressId.
// Used when the form is reopened to edit existing quality data.
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

// ─── DELETE PROGRESS ───────────────────────────────────────────────
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

// ─── GET PROGRESS BY PROJECT ───────────────────────────────────────
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

// ─── GET QUALITY BY PROGRESS ────────────────────────────────────────
// Fetch quality for a specific progress record (to pre-fill the form on edit).
export const getInteriorsQualityByProgressController = async (
  req: Request,
  res: Response
) => {
  try {
    const progressId = getSingleValue(req.params.progressId);
    const data = await getInteriorsQualityByProgressUsecase(progressId);
    res.status(200).json({ success: true, data });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
};