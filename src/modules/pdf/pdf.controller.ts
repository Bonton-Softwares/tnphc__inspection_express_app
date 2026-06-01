// src/modules/pdf/pdf.controller.ts
import { Request, Response } from "express";
import {
  generateAdminPdfUsecase,
  generateUserPdfUsecase,
  generateProjectPdfUsecase,
} from "./pdf.usecase";

/**
 * GET /pdf
 * Query params: search, districts (comma-sep), departments (comma-sep), stages (comma-sep)
 * Downloads admin report PDF.
 */
export const downloadAdminPdfController = async (req: Request, res: Response) => {
  try {
    const search      = req.query.search      as string | undefined;
    const districts   = parseList(req.query.districts   as string | undefined);
    const departments = parseList(req.query.departments as string | undefined);
    const stages      = parseList(req.query.stages      as string | undefined);

    // req.user is set by your auth middleware
    const generatedByUserId = (req as any).user?.id;
    const generatedBy       = (req as any).user?.username;

    const buffer = await generateAdminPdfUsecase({
      search, districts, departments, stages,
      generatedBy, generatedByUserId,
    });

    const filename = `admin-report-${datestamp()}.pdf`;
    res.set({
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length":       buffer.length,
    });
    return res.send(buffer);

  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * GET /pdf/:userId
 * Downloads the project report for a specific user.
 */
export const downloadProjectPdfController = async (
  req: Request,
  res: Response
) => {
  try {
    const projectId = String(req.params.projectId);

    const generatedByUserId = (req as any).user?.id;
    const generatedBy = (req as any).user?.username;

    const buffer = await generateProjectPdfUsecase({
      projectId,
      generatedBy,
      generatedByUserId,
    });

    const filename = `project-report-${projectId.slice(
      0,
      8
    )}-${datestamp()}.pdf`;

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": buffer.length,
    });

    return res.send(buffer);
  } catch (e: any) {
    return res.status(500).json({
      success: false,
      message: e.message,
    });
  }
};

function parseList(val: string | undefined): string[] | undefined {
  if (!val) return undefined;
  const arr = val.split(",").map((s) => s.trim()).filter(Boolean);
  return arr.length ? arr : undefined;
}

function datestamp(): string {
  return new Date().toISOString().slice(0, 10);
}


export const downloadUserPdfController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = String(req.params.userId);

    const generatedByUserId = (req as any).user?.id;
    const generatedBy = (req as any).user?.username;

    const buffer = await generateUserPdfUsecase({
      userId,
      generatedBy,
      generatedByUserId,
    });

    const filename = `user-report-${userId.slice(
      0,
      8
    )}-${datestamp()}.pdf`;

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": buffer.length,
    });

    return res.send(buffer);
  } catch (e: any) {
    return res.status(500).json({
      success: false,
      message: e.message,
    });
  }
};