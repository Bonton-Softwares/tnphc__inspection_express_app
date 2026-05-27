import { Request, Response } from "express";

import {
  generateSuperStructurePdfUsecase
} from "./pdf.usecase";

const getSingleValue = (
  val: any
): string =>
  Array.isArray(val)
    ? val[0]
    : val;

export const downloadSuperStructurePdfController =
  async (
    req: Request,
    res: Response
  ) => {

    try {

      const projectId =
        getSingleValue(
          req.params.projectId
        );

      const pdfBuffer =
        await generateSuperStructurePdfUsecase(
          projectId
        );

      res.setHeader(
        "Content-Type",
        "application/pdf"
      );

      res.setHeader(
        "Content-Disposition",
        "attachment; filename=superstructure-report.pdf"
      );

      return res.send(pdfBuffer);

    } catch (e: any) {

      return res.status(500).json({
        success: false,
        message: e.message
      });
    }
  };