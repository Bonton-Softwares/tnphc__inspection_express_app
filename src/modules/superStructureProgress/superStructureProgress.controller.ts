import { Request, Response } from "express";
import {
  getSuperStructureFullViewUsecase,
  createProgressUsecase,
  updateProgressUsecase,
  createQualityUsecase,
  updateQualityUsecase,
  deleteProgressUsecase,
  getProgressByProjectUsecase,
  getQualityByProgressUsecase
} from "./superStructureProgress.usecase";

const getSingleValue = (val: any): string =>
  Array.isArray(val) ? val[0] : val;

// ─── GET FULL VIEW ─────────────────────────────────────────────────
export const getSuperStructureFullViewController = async (
  req: Request,
  res: Response
) => {
  try {
    const projectId = getSingleValue(req.params.projectId);
    const data = await getSuperStructureFullViewUsecase(projectId);
    res.status(200).json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ─── CREATE PROGRESS ───────────────────────────────────────────────
export const createProgressController = async (
  req: Request,
  res: Response
) => {
  try {
    const data = await createProgressUsecase(req.body, req.files, req);
    res.status(200).json({ success: true, data });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// ─── UPDATE PROGRESS ───────────────────────────────────────────────
export const updateProgressController = async (
  req: Request,
  res: Response
) => {
  try {
    const id = getSingleValue(req.params.id);
    const data = await updateProgressUsecase(id, req.body, req.files, req);
    res.status(200).json({ success: true, data });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// ─── CREATE QUALITY ────────────────────────────────────────────────
// Quality is tied to a specific progress record via progressId in the body.
// If quality already exists for that progressId, it will be updated (upsert).
export const createQualityController = async (req: Request, res: Response) => {
  try {
    // 👇 Add this temporarily to debug
    console.log("FILES RECEIVED:", JSON.stringify(Object.keys(req.files || {})));
    console.log("FILE COUNT:", Object.values(req.files || {}).flat().length);

    const data = await createQualityUsecase(req.body, req.files, req);
    res.status(200).json({ success: true, data });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// ─── UPDATE QUALITY ────────────────────────────────────────────────
// Same endpoint behaviour as create — upserts by progressId.
// Used when the form is reopened to edit existing quality data.
export const updateQualityController = async (
  req: Request,
  res: Response
) => {
  try {
    const data = await updateQualityUsecase(req.body, req.files, req);
    res.status(200).json({ success: true, data });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// ─── DELETE PROGRESS ───────────────────────────────────────────────
export const deleteProgressController = async (
  req: Request,
  res: Response
) => {
  try {
    const id = getSingleValue(req.params.id);
    await deleteProgressUsecase(id, req);
    res.status(200).json({ success: true, message: "Deleted successfully" });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ─── GET PROGRESS BY PROJECT ───────────────────────────────────────
export const getProgressByProjectController = async (
  req: Request,
  res: Response
) => {
  try {
    const projectId = getSingleValue(req.params.projectId);
    const data = await getProgressByProjectUsecase(projectId);
    res.status(200).json({ success: true, data });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// ─── GET QUALITY BY PROGRESS ────────────────────────────────────────
// Fetch quality for a specific progress record (to pre-fill the form on edit).
export const getQualityByProgressController = async (
  req: Request,
  res: Response
) => {
  try {
    const progressId = getSingleValue(req.params.progressId);
    const data = await getQualityByProgressUsecase(progressId);
    res.status(200).json({ success: true, data });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
};