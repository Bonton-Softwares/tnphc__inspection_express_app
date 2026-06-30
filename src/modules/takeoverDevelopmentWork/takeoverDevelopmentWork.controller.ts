import { Request, Response } from "express";
import {
  createTakeoverDevelopmentWorkUsecase,
  getTakeoverDevelopmentWorkByBuildingInspectionIdUsecase,
  getTakeoverDevelopmentWorkByIdUsecase,
  updateTakeoverDevelopmentWorkUsecase,
  deleteTakeoverDevelopmentWorkUsecase
} from "./takeoverDevelopmentWork.usecase";

// ─── CREATE (upsert by buildingInspectionId) ───────────────────────
export const createTakeoverDevelopmentWork = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const result = await createTakeoverDevelopmentWorkUsecase(req.body, req.files, req, userId);
    res.status(201).json({ success: true, message: "Created", data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── GET BY BUILDING INSPECTION ID ────────────────────────────────
export const getTakeoverDevelopmentWorkByBuildingInspectionId = async (req: Request, res: Response) => {
  try {
    const buildingInspectionId = req.params.buildingInspectionId as string;
    const result = await getTakeoverDevelopmentWorkByBuildingInspectionIdUsecase(buildingInspectionId);
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(404).json({ success: false, message: err.message });
  }
};

// ─── GET BY ID ────────────────────────────────────────────────────
export const getTakeoverDevelopmentWorkById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const result = await getTakeoverDevelopmentWorkByIdUsecase(id);
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(404).json({ success: false, message: err.message });
  }
};

// ─── UPDATE ───────────────────────────────────────────────────────
export const updateTakeoverDevelopmentWork = async (req: Request, res: Response) => {
  try {
    const id     = req.params.id as string;
    const userId = (req as any).user?.id;
    const result = await updateTakeoverDevelopmentWorkUsecase(id, req.body, req.files, req, userId);
    res.status(200).json({ success: true, message: "Updated", data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── DELETE ───────────────────────────────────────────────────────
export const deleteTakeoverDevelopmentWork = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await deleteTakeoverDevelopmentWorkUsecase(id, req);
    res.status(200).json({ success: true, message: "Deleted" });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};