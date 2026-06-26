import {
  getInspectionSetupService,
  createProgressService,
  updateProgressService,
  deleteProgressService,
  getProgressDetailService,
  saveAnswersService,
    getProgressDataService,
    getProgressByModuleFloorService
} from "./Inspection.service";

const extractMeta = (req: any) => ({
  userId: req.user?.id,
  roleId: req.user?.roleId,
  ip:     req.ip
});

// ─── SETUP ─────────────────────────────────────────────────────────

export const getInspectionSetupUsecase = async (
  moduleSlug: string,
  projectId:  string
) => getInspectionSetupService(moduleSlug, projectId);

// ─── PROGRESS ──────────────────────────────────────────────────────

export const createProgressUsecase = async (body: any, req: any) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;

  // Handle progressPhoto file uploads
  let progressPhoto: string | null = null;
  const files = req.files as Express.Multer.File[] | undefined;
  if (files && files.length > 0) {
    const fileJson = files.map((f) => ({
      fileName: f.filename,
      url: `${baseUrl}/uploads/${f.filename}`
    }));
    progressPhoto = JSON.stringify(fileJson);
  } else if (body.progressPhoto) {
    progressPhoto = body.progressPhoto; // fallback: plain string/URL
  }

  return createProgressService(
    {
      projectId:        body.projectId,
      blockId:          body.blockId,
      floorId:          body.floorId,
      roomNo:           body.roomName,
      moduleStageId:    body.moduleStageId,
      workStartedDate:  body.workStartedDate ? new Date(body.workStartedDate) : null,
      isDelay:          body.isDelay === "true" || body.isDelay === true,
      delayDays:        body.delayDays ? Number(body.delayDays) : null,
      delayReason:      body.delayReason ?? null,
      delayOtherReason: body.delayOtherReason ?? null,
      generalRemarks:   body.generalRemarks ?? null,
      progressPhoto                           // ← now a JSON string of file info
    },
    extractMeta(req)
  );
};

export const getProgressDataUsecase = async (
  progressId: string
) => getProgressDataService(progressId);

export const updateProgressUsecase = async (
  progressId: string,
  body: any,
  req: any
) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;

  // Handle progressPhoto file uploads
  const files = req.files as Express.Multer.File[] | undefined;
  if (files && files.length > 0) {
    const fileJson = files.map((f) => ({
      fileName: f.filename,
      url: `${baseUrl}/uploads/${f.filename}`
    }));
    body.progressPhoto = JSON.stringify(fileJson);
  }

  return updateProgressService(progressId, body, extractMeta(req));
};

export const deleteProgressUsecase = async (progressId: string, req: any) =>
  deleteProgressService(progressId, extractMeta(req));

// ─── PROGRESS DETAIL (questions + answers) ─────────────────────────

export const getProgressDetailUsecase = async (progressId: string) =>
  getProgressDetailService(progressId);

// ─── ANSWERS ───────────────────────────────────────────────────────
// Image-type answers: store uploaded file info as stringified JSON in answer field.

// Inspection.usecase.ts  — saveAnswersUsecase
export const saveAnswersUsecase = async (
  progressId: string,
  body: any,
  files: any,
  req: any
) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;

  // upload.any() gives a flat array, not a keyed object
  // Each file has f.fieldname matching the questionId the frontend used
  const filesByField: Record<string, Express.Multer.File[]> = {};
  if (Array.isArray(files)) {
    for (const f of files) {
      if (!filesByField[f.fieldname]) filesByField[f.fieldname] = [];
      filesByField[f.fieldname].push(f);
    }
  }

  const answersWithFiles = (
    body.answers as { questionId: string; answer?: string }[]
  ).map((item) => {
    // Frontend should send fieldname = questionId for image uploads
    const uploadedFiles = filesByField[item.questionId] ?? filesByField[item.answer ?? ""];

    if (uploadedFiles && uploadedFiles.length > 0) {
      const fileJson = uploadedFiles.map((f: any) => ({
        fileName: f.filename,
        url: `${baseUrl}/uploads/${f.filename}`
      }));
      return {
        questionId: item.questionId,
        answer: JSON.stringify(fileJson),
        images: fileJson.map((f: any) => ({ imageUrl: f.url }))
      };
    }

    return item;
  });

  return saveAnswersService(progressId, answersWithFiles, extractMeta(req));
};

export const getProgressByModuleFloorUsecase = async (
  moduleSlug: string,
  floorId: string
) => getProgressByModuleFloorService(moduleSlug, floorId);