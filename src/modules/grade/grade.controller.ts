import { Request, Response } from "express";
import * as usecase from "./grade.usecase";

export const createGrade = async (req: Request, res: Response) => {
  try {
    const result = await usecase.createGradeUsecase({
      ...req.body,
      userId: req.user?.id,
    });
    return res.status(201).json({
      success: true,
      message: "Grade created successfully",
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getGradeById = async (req: Request, res: Response) => {
  try {
    const result = await usecase.getGradeByIdUsecase(String(req.params.id));
    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(404).json({ success: false, message: error.message });
  }
};

export const updateGrade = async (req: Request, res: Response) => {
  try {
    const result = await usecase.updateGradeUsecase(String(req.params.id), {
      ...req.body,
      userId: req.user?.id,
    });
    return res.status(200).json({
      success: true,
      message: "Grade updated successfully",
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteGrade = async (req: Request, res: Response) => {
  try {
    await usecase.deleteGradeUsecase(String(req.params.id));
    return res.status(200).json({ success: true, message: "Grade deleted successfully" });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const listGrades = async (req: Request, res: Response) => {
  try {
    const result = await usecase.listGradesUsecase(req.query);
    return res.status(200).json({
      success: true,
      message: "Grades fetched successfully",
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};