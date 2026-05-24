import {
  getInteriorsFullViewService,
  upsertInteriorsProgressDB,
  upsertInteriorsQualityDB,
  getInteriorsProgressByProjectService,
  getInteriorsQualityByProjectService,
  deleteInteriorsProgressDB
} from "./InteriorsStage.service";

const extractMeta = (req: any) => ({
  userId: req.user?.id,
  roleId: req.user?.roleId,
  ip:     req.ip
});

// ─── GET ───────────────────────────────────────────────────────────
export const getInteriorsFullViewUsecase = async (projectId: string) =>
  getInteriorsFullViewService(projectId);

// ─── PROGRESS CREATE ───────────────────────────────────────────────
export const createInteriorsProgressUsecase = async (
  body:  any,
  files: any,
  req:   any
) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;

  const progressPhoto = (files?.progressPhoto || []).map((f: any) => ({
    fileName: f.filename,
    url:      `${baseUrl}/uploads/${f.filename}`
  }));

  const isCompleted =
    body.isCompleted === "true" || body.isCompleted === true;

  return upsertInteriorsProgressDB(
    {
      projectId:       body.projectId,
      block:           body.block       ?? null,
      floor:           body.floor       ?? null,
      stageOfWork:     body.stageOfWork ?? null,
      isCompleted,
      progressRemarks: body.progressRemarks,
      progressPhoto,
      status:          isCompleted ? "COMPLETED" : "IN_PROGRESS"
    },
    extractMeta(req)
  );
};

// ─── PROGRESS UPDATE ───────────────────────────────────────────────
export const updateInteriorsProgressUsecase = async (
  id:    string,
  body:  any,
  files: any,
  req:   any
) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;

  const progressPhoto = (files?.progressPhoto || []).map((f: any) => ({
    fileName: f.filename,
    url:      `${baseUrl}/uploads/${f.filename}`
  }));

  const isCompleted =
    body.isCompleted === "true" || body.isCompleted === true;

  return upsertInteriorsProgressDB(
    {
      id,
      projectId:       body.projectId,
      block:           body.block       ?? null,
      floor:           body.floor       ?? null,
      stageOfWork:     body.stageOfWork ?? null,
      isCompleted,
      progressRemarks: body.progressRemarks,
      ...(progressPhoto.length ? { progressPhoto } : {}),
      status:          isCompleted ? "COMPLETED" : "IN_PROGRESS"
    },
    extractMeta(req)
  );
};

// ─── DELETE ────────────────────────────────────────────────────────
export const deleteInteriorsProgressUsecase = async (
  id:  string,
  req: any
) => deleteInteriorsProgressDB(id, extractMeta(req));

// ─── QUALITY (shared builder) ──────────────────────────────────────
const buildQualityPayload = (body: any, files: any, req: any) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const getFiles = (key: string) =>
    (files?.[key] || []).map((f: any) => ({
      fileName: f.filename,
      url:      `${baseUrl}/uploads/${f.filename}`
    }));

  return {
    projectId:       body.projectId,
    workStartedDate: body.workStartedDate ? new Date(body.workStartedDate) : null,
    isDelay:         body.isDelay === "true" || body.isDelay === true,
    delayDays:       body.delayDays ? Number(body.delayDays) : null,
    delayReason:     body.delayReason,
    delayOtherReason: body.delayOtherReason,

    cementGradeId: body.cementGradeId,
    cementBrandId: body.cementBrandId,
    cementRemarks: body.cementRemarks,
    cementLabTest: body.cementLabTest,
    cementPhoto:   getFiles("cementPhoto"),

    sandType:          body.sandType,
    sandLabTest:       body.sandLabTest,
    sandPhoto:         getFiles("sandPhoto"),
    sandSieveTestDone: body.sandSieveTestDone === "true" || body.sandSieveTestDone === true,
    sandSieveLabTest:  body.sandSieveLabTest,
    sandSievePhoto:    getFiles("sandSievePhoto"),

    aggregateSize:    body.aggregateSize ? Number(body.aggregateSize) : null,
    aggregateLabTest: body.aggregateLabTest,
    aggregatePhoto:   getFiles("aggregatePhoto"),

    waterLabTest: body.waterLabTest,
    waterPhoto:   getFiles("waterPhoto"),

    concreteLabTest:         body.concreteLabTest,
    concretePhoto:           getFiles("concretePhoto"),
    concreteQualityTestDone: body.concreteQualityTestDone === "true" || body.concreteQualityTestDone === true,
    concreteQualityLabTest:  body.concreteQualityLabTest,
    concreteQualityPhoto:    getFiles("concreteQualityPhoto"),

    bricksLabTest:         body.bricksLabTest,
    bricksPhoto:           getFiles("bricksPhoto"),
    bricksQualityTestDone: body.bricksQualityTestDone === "true" || body.bricksQualityTestDone === true,
    bricksQualityLabTest:  body.bricksQualityLabTest,
    bricksQualityPhoto:    getFiles("bricksQualityPhoto"),

    plasteringTestDone: body.plasteringTestDone === "true" || body.plasteringTestDone === true,
    plasteringLabTest:  body.plasteringLabTest,
    plasteringPhoto:    getFiles("plasteringPhoto"),

    doorWoodType:    body.doorWoodType,
    upvcBrand:       body.upvcBrand,
    glassBrand:      body.glassBrand,
    glassThickness:  body.glassThickness,

    floorType:   body.floorType,
    tileBrand:   body.tileBrand,
    tileRemarks: body.tileRemarks,

    paintBrand:      body.paintBrand,
    paintingQuality: body.paintingQuality,

    qualityRemarks: body.qualityRemarks
  };
};

export const createInteriorsQualityUsecase = async (
  body:  any,
  files: any,
  req:   any
) => upsertInteriorsQualityDB(buildQualityPayload(body, files, req), extractMeta(req));

export const updateInteriorsQualityUsecase = createInteriorsQualityUsecase;

// ─── GETS ──────────────────────────────────────────────────────────
export const getInteriorsProgressByProjectUsecase = async (
  projectId: string
) => getInteriorsProgressByProjectService(projectId);

export const getInteriorsQualityByProjectUsecase = async (
  projectId: string
) => getInteriorsQualityByProjectService(projectId);