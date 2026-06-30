import { Request, Response } from "express";
import {
  createTakeoverBuildingInspectionUsecase,
  getAllTakeoverBuildingInspectionUsecase,
  getTakeoverBuildingInspectionByIdUsecase,
  getTakeoverBuildingInspectionByProjectIdUsecase,
  updateTakeoverBuildingInspectionUsecase,
  deleteTakeoverBuildingInspectionUsecase,
  getTakeoverBuildingInspectionSetupUsecase,
  getTakeoverBuildingInspectionByFloorUsecase
} from "./takeoverBuildingInspection.usecase";

export const createTakeoverBuildingInspection = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const result = await createTakeoverBuildingInspectionUsecase(req.body, req.files, req, userId);
    res.status(201).json({ success: true, message: "Created", data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const getTakeoverBuildingInspectionSetup = async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId as string;
    const result = await getTakeoverBuildingInspectionSetupUsecase(projectId);
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const getAllTakeoverBuildingInspection = async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId as string;
    const result = await getAllTakeoverBuildingInspectionUsecase(projectId);
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const getTakeoverBuildingInspectionById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const result = await getTakeoverBuildingInspectionByIdUsecase(id);
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(404).json({ success: false, message: err.message });
  }
};

// Returns only the latest submission for a project as a single object
export const getTakeoverBuildingInspectionByProjectId = async (
  req: Request,
  res: Response
) => {
  try {
    const projectId = req.params.projectId as string;
    const result = await getTakeoverBuildingInspectionByProjectIdUsecase(projectId);
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(404).json({ success: false, message: err.message });
  }
};

export const updateTakeoverBuildingInspection = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).user?.id;
    const result = await updateTakeoverBuildingInspectionUsecase(id, req.body, req.files, req, userId);
    res.status(200).json({ success: true, message: "Updated", data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteTakeoverBuildingInspection = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).user?.id;             // ← add
    await deleteTakeoverBuildingInspectionUsecase(id, req, userId); // ← pass req, userId
    res.status(200).json({ success: true, message: "Deleted" });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const getTakeoverBuildingInspectionByFloor = async (req: Request, res: Response) => {
  try {
    const floorId = req.params.floorId as string;
    const result = await getTakeoverBuildingInspectionByFloorUsecase(floorId);
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};