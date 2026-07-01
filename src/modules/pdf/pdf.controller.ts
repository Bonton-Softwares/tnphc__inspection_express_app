// src/modules/pdf/pdf.controller.ts
import { Request, Response } from "express";
import {
  generateAdminPdfUsecase,
  generateUserPdfUsecase,
  generateProjectPdfUsecase,
} from "./pdf.usecase";

/**
 * GET /pdf
 * Admin report — all projects
 * Query: ?search=&districts=D1,D2&departments=Dept1&stages=Foundation Stage
 */
export const downloadAdminPdfController = async (req: Request, res: Response) => {
  try {
    const search      = req.query.search      as string | undefined;
    const districts   = parseList(req.query.districts   as string | undefined);
    const departments = parseList(req.query.departments as string | undefined);
    const stages      = parseList(req.query.stages      as string | undefined);

    const generatedByUserId = (req as any).user?.id;
    const generatedBy       = (req as any).user?.username;

    const { buffer } = await generateAdminPdfUsecase({
      search, districts, departments, stages, generatedBy, generatedByUserId,
    });

    sendPdf(res, buffer, `Admin-Report-${datestamp()}.pdf`);
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * GET /pdf/:projectId
 * Single project detailed report — filename uses the project name
 */
export const downloadProjectPdfController = async (req: Request, res: Response) => {
  try {
    const projectId         = req.params.projectId as string;
    const generatedByUserId = (req as any).user?.id;
    const generatedBy       = (req as any).user?.username;

    const { buffer, projectName } = await generateProjectPdfUsecase({
      projectId, generatedBy, generatedByUserId,
    });

    const safeName = sanitizeFilename(projectName);
    sendPdf(res, buffer, `${safeName}-${datestamp()}.pdf`);
  } catch (e: any) {
    const status = e.message === "Project not found" ? 404 : 500;
    res.status(status).json({ success: false, message: e.message });
  }
};

/**
 * GET /pdf/user/:userId
 * User-specific project report — filename uses officer username
 */
export const downloadUserPdfController = async (req: Request, res: Response) => {
  try {
    const userId            = req.params.userId as string;
    const generatedByUserId = (req as any).user?.id;
    const generatedBy       = (req as any).user?.username;

    const { buffer, username } = await generateUserPdfUsecase({
      userId, generatedBy, generatedByUserId,
    });

    const safeName = sanitizeFilename(username ?? "User-Report");
    sendPdf(res, buffer, `${safeName}-Projects-${datestamp()}.pdf`);
  } catch (e: any) {
    const status = e.message === "User not found" ? 404 : 500;
    res.status(status).json({ success: false, message: e.message });
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sendPdf(res: Response, buffer: Buffer, filename: string) {
  // RFC 5987 encoded filename — browsers always prefer filename* over the URL path
  const encoded = encodeURIComponent(filename);
  res.set({
    "Content-Type":        "application/pdf",
    "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encoded}`,
    "Content-Length":       buffer.length,
  });
  res.send(buffer);
}

/** Strip characters that are unsafe in filenames, collapse spaces to hyphens. */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")  // remove illegal chars
    .replace(/\s+/g, "-")                     // spaces → hyphens
    .replace(/-+/g, "-")                      // collapse multiple hyphens
    .replace(/^-|-$/g, "")                    // trim leading/trailing hyphens
    .slice(0, 80)                             // cap length
    || "Report";
}

function parseList(val: string | undefined): string[] | undefined {
  if (!val) return undefined;
  const arr = val.split(",").map((s) => s.trim()).filter(Boolean);
  return arr.length ? arr : undefined;
}

function datestamp(): string {
  return new Date().toISOString().slice(0, 10);
}