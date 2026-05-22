import { Request, Response } from "express";
import {
  createDistrictUsecase,
  getAllDistrictsUsecase,
  getDistrictByIdUsecase,
  updateDistrictUsecase,
  deleteDistrictUsecase,
} from "./district.usecase";

export const createDistrictController = async (req: Request, res: Response) => {
  try {
    const result = await createDistrictUsecase(req.body);
    res.status(201).json({
        success: true,
        "message": "District created successfully",
        data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};


export const getAllDistrictsController = async (
  req: Request,
  res: Response
) => {
  const pageNumber = req.query.pageNumber as string | undefined;
  const pageSize = req.query.pageSize as string | undefined;
  const search = req.query.search as string | undefined;
  const type = req.query.type as string | undefined;
  const isDropdown = req.query.isDropdown === "true";

  const result = await getAllDistrictsUsecase({
    pageNumber,
    pageSize,
    search,
    type,
    isDropdown,
  });

  res.json({
    success: true,
    ...result,
  });
};
export const getDistrictByIdController = async (req: Request, res: Response) => {
        const id = String(req.params.id); // ✅ FIX

  const result = await getDistrictByIdUsecase(id);
  res.json({ success: true, data: result });
};

export const updateDistrictController = async (req: Request, res: Response) => {
            const id = String(req.params.id); // ✅ FIX

  const result = await updateDistrictUsecase(id, req.body);
  res.json({ success: true,
    message: "District Updated successfully",
     data: result });
};

export const deleteDistrictController = async (req: Request, res: Response) => {
        const id = String(req.params.id); // ✅ FIX

  await deleteDistrictUsecase(id);
  res.json({ success: true, message: "District Deleted Successfully" });
};