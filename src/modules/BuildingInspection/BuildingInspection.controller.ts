import { Request, Response } from "express";
import {
  createBuildingInspectionUsecase,
  getBuildingInspectionByIdUsecase,      // ← added
  updateBuildingInspectionUsecase,
  deleteBuildingInspectionUsecase,
  getBuildingInspectionSetupUsecase
} from "./BuildingInspection.usecase";

export const createBuildingInspection = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const result = await createBuildingInspectionUsecase(
      req.body,
      req.files,
      req,
      userId
    );
    res.status(201).json({ success: true, message: "Created", data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── GET BY BUILDING INSPECTION ID ────────────────────────────────
export const getBuildingInspectionById = async (req: Request, res: Response) => {
  try {
    const buildingInspectionId = req.params.buildingInspectionId as string;
    const result = await getBuildingInspectionByIdUsecase(buildingInspectionId);
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(404).json({ success: false, message: err.message });
  }
};

// ─── UPDATE ───────────────────────────────────────────────────────
export const updateBuildingInspection = async (req: Request, res: Response) => {
  try {
    const id     = req.params.buildingInspectionId as string;
    const userId = (req as any).user?.id;
    const result = await updateBuildingInspectionUsecase(
      id,
      req.body,
      req.files,
      req,
      userId
    );
    res.status(200).json({ success: true, message: "Updated", data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── DELETE ───────────────────────────────────────────────────────
export const deleteBuildingInspection = async (req: Request, res: Response) => {
  try {
    const id = req.params.buildingInspectionId as string;  // ← was req.params.id
    await deleteBuildingInspectionUsecase(id);
    res.status(200).json({ success: true, message: "Deleted" });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── SETUP ────────────────────────────────────────────────────────
export const getBuildingInspectionSetup = async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId as string;
    const result = await getBuildingInspectionSetupUsecase(projectId);
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};