import { Request, Response } from "express";
import {
  getInspectionSetupUsecase,
  createProgressUsecase,
  updateProgressUsecase,
  deleteProgressUsecase,
  getProgressDetailUsecase,
  saveAnswersUsecase,
    getProgressDataUsecase
} from "./Inspection.usecase";

const getSingleValue = (val: any): string =>
  Array.isArray(val) ? val[0] : val;

// ─── GET SETUP ─────────────────────────────────────────────────────
// Returns blocks, floors, stages for the selected module, and existing progress.

export const getInspectionSetupController = async (
  req: Request,
  res: Response
) => {
  try {
    const moduleSlug = getSingleValue(req.params.module);
    const projectId  = getSingleValue(req.params.projectId);
    const data = await getInspectionSetupUsecase(moduleSlug, projectId);
    res.status(200).json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ─── CREATE PROGRESS ───────────────────────────────────────────────
// Returns existing progressId if the same combination already exists.

export const createProgressController = async (
  req: Request,
  res: Response
) => {
  try {
    const data = await createProgressUsecase(req.body, req);
    res.status(200).json({ success: true, data });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
};


export const getProgressDataController = async (
  req: Request,
  res: Response
) => {
  try {
    const progressId = getSingleValue(req.params.progressId);

    const data = await getProgressDataUsecase(progressId);

    res.status(200).json({
      success: true,
      data
    });
  } catch (e: any) {
    res.status(400).json({
      success: false,
      message: e.message
    });
  }
};

// ─── UPDATE PROGRESS ───────────────────────────────────────────────

export const updateProgressController = async (
  req: Request,
  res: Response
) => {
  try {
    const progressId = getSingleValue(req.params.progressId);
    const data = await updateProgressUsecase(progressId, req.body, req);
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
    const progressId = getSingleValue(req.params.progressId);
    await deleteProgressUsecase(progressId, req);
    res.status(200).json({ success: true, message: "Deleted successfully" });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ─── GET PROGRESS DETAIL ───────────────────────────────────────────
// Returns progress + dynamically loaded questions + existing answers.
// Used after creating progress and for edit screen.

export const getProgressDetailController = async (
  req: Request,
  res: Response
) => {
  try {
    const progressId = getSingleValue(req.params.progressId);
    const data = await getProgressDetailUsecase(progressId);
    res.status(200).json({ success: true, data });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// ─── SAVE ANSWERS ──────────────────────────────────────────────────
// Upserts each answer individually — never delete-all + re-insert.
// Image-type questions: pass file field name as answer; usecase resolves uploaded URL.

export const saveAnswersController = async (
  req: Request,
  res: Response
) => {
  try {
    const progressId = getSingleValue(req.params.progressId);
    const data = await saveAnswersUsecase(progressId, req.body, req.files, req);
    res.status(200).json({ success: true, data });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
};