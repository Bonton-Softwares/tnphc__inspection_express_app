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

export const saveAnswersUsecase = async (
  progressId: string,
  body:        any,
  files:       any,
  req:         any
) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;

  // Merge file uploads into answers where the question answer is a file key
  const answersWithFiles = (body.answers as { questionId: string; answer: string }[]).map(
    (item) => {
      const fileKey = item.answer; // Frontend sends the multer field name as the answer value for image questions
      const uploadedFiles = files?.[fileKey];

      if (uploadedFiles && uploadedFiles.length > 0) {
        const fileJson = uploadedFiles.map((f: any) => ({
          fileName: f.filename,
          url:      `${baseUrl}/uploads/${f.filename}`
        }));
        return { questionId: item.questionId, answer: JSON.stringify(fileJson) };
      }

      return item;
    }
  );

  return saveAnswersService(progressId, answersWithFiles, extractMeta(req));
};

export const getProgressByModuleFloorUsecase = async (
  moduleSlug: string,
  floorId: string
) => getProgressByModuleFloorService(moduleSlug, floorId);