import { Request, Response } from "express";
import * as usecase from "./material.usecase";

export const createMaterial = async (req: Request, res: Response) => {
  try {
    const result = await usecase.createMaterialUsecase({
      ...req.body,
      userId: req.user?.id,
    });
    return res.status(201).json({
      success: true,
      message: "Material created successfully",
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getMaterialById = async (req: Request, res: Response) => {
  try {
    const result = await usecase.getMaterialByIdUsecase(String(req.params.id));
    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(404).json({ success: false, message: error.message });
  }
};

export const updateMaterial = async (req: Request, res: Response) => {
  try {
    const result = await usecase.updateMaterialUsecase(String(req.params.id), {
      ...req.body,
      userId: req.user?.id,
    });
    return res.status(200).json({
      success: true,
      message: "Material updated successfully",
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteMaterial = async (req: Request, res: Response) => {
  try {
    await usecase.deleteMaterialUsecase(String(req.params.id));
    return res.status(200).json({
      success: true,
      message: "Material deleted successfully",
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const listMaterials = async (req: Request, res: Response) => {
  try {
    const result = await usecase.listMaterialsUsecase(req.query);
    return res.status(200).json({
      success: true,
      message: "Materials fetched successfully",
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};