import {
  getSuperStructureFullViewService,
  upsertProgressDB,
  deleteProgressDB,
  upsertQualityDB,
  getProgressByProjectService,
  getQualityByProgressService
} from "./superStructureProgress.service";

const extractMeta = (req: any) => ({
  userId: req.user?.id,
  roleId: req.user?.roleId,
  ip:     req.ip
});

// ─── GET ───────────────────────────────────────────────────────────
export const getSuperStructureFullViewUsecase = async (
  projectId: string
) => getSuperStructureFullViewService(projectId);

// ─── PROGRESS CREATE ───────────────────────────────────────────────
export const createProgressUsecase = async (
  body:  any,
  files: any,
  req:   any
) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;

  const photo = (files?.photo || []).map((f: any) => ({
    fileName: f.filename,
    url:      `${baseUrl}/uploads/${f.filename}`
  }));

  return upsertProgressDB(
    {
      projectId: body.projectId,
      blockId:   body.blockId,
      floorId:   body.floorId,
      stage:     body.stage ?? null,
      remarks:   body.remarks ?? null,
      photo:     photo.length ? photo : undefined,
      status:    body.status ?? "IN_PROGRESS"
    },
    extractMeta(req)
  );
};

// ─── PROGRESS UPDATE ───────────────────────────────────────────────
export const updateProgressUsecase = async (
  id:    string,
  body:  any,
  files: any,
  req:   any
) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;

  const photo = (files?.photo || []).map((f: any) => ({
    fileName: f.filename,
    url:      `${baseUrl}/uploads/${f.filename}`
  }));

  return upsertProgressDB(
    {
      id,
      projectId: body.projectId,
      blockId:   body.blockId,
      floorId:   body.floorId,
      stage:     body.stage ?? null,
      remarks:   body.remarks ?? null,
      ...(photo.length ? { photo } : {}), // only overwrite photo if new one sent
      status:    body.status ?? "IN_PROGRESS"
    },
    extractMeta(req)
  );
};

// ─── DELETE ────────────────────────────────────────────────────────
export const deleteProgressUsecase = async (id: string, req: any) =>
  deleteProgressDB(id, extractMeta(req));

// ─── QUALITY BUILD PAYLOAD ─────────────────────────────────────────
// Quality is linked to a specific progress record via progressId.
const buildQualityPayload = (body: any, files: any, req: any) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const getFiles = (key: string) =>
    (files?.[key] || []).map((f: any) => ({
      fileName: f.filename,
      url:      `${baseUrl}/uploads/${f.filename}`
    }));

  return {
    progressId:      body.progressId,

    workStartedDate: body.workStartedDate ? new Date(body.workStartedDate) : null,
    isDelay:         body.isDelay === "true" || body.isDelay === true,
    delayDays:       body.delayDays ? Number(body.delayDays) : null,
    delayReason:     body.delayReason ?? null,
    delayOtherReason: body.delayOtherReason ?? null,
    generalRemarks:  body.generalRemarks ?? null,

    cementGradeId: body.cementGradeId ?? null,
    cementBrandId: body.cementBrandId ?? null,
    cementRemarks: body.cementRemarks ?? null,
    cementLabTest: body.cementLabTest ?? null,
    cementPhoto:   getFiles("cementPhoto"),

    sandType:          body.sandType ?? null,
    sandLabTest:       body.sandLabTest ?? null,
    sandPhoto:         getFiles("sandPhoto"),
    sandSieveTestDone: body.sandSieveTestDone === "true" || body.sandSieveTestDone === true,
    sandSieveLabTest:  body.sandSieveLabTest ?? null,
    sandSievePhoto:    getFiles("sandSievePhoto"),

    steelGradeId: body.steelGradeId ?? null,
    steelBrandId: body.steelBrandId ?? null,
    steelLabTest: body.steelLabTest ?? null,
    steelPhoto:   getFiles("steelPhoto"),

    aggregateSize:    body.aggregateSize ? Number(body.aggregateSize) : null,
    aggregateLabTest: body.aggregateLabTest ?? null,
    aggregatePhoto:   getFiles("aggregatePhoto"),

    waterLabTest: body.waterLabTest ?? null,
    waterPhoto:   getFiles("waterPhoto"),

    concreteLabTest:         body.concreteLabTest ?? null,
    concretePhoto:           getFiles("concretePhoto"),
    concreteQualityTestDone: body.concreteQualityTestDone === "true" || body.concreteQualityTestDone === true,
    concreteQualityLabTest:  body.concreteQualityLabTest ?? null,
    concreteQualityPhoto:    getFiles("concreteQualityPhoto"),

    bricksLabTest:             body.bricksLabTest ?? null,
    bricksPhoto:               getFiles("bricksPhoto"),
    bricksQualityTestDone:     body.bricksQualityTestDone === "true" || body.bricksQualityTestDone === true,
    bricksQualityLabTest:      body.bricksQualityLabTest ?? null,
    bricksQualityPhoto:        getFiles("bricksQualityPhoto"),
    brickWallAlignmentDone:    body.brickWallAlignmentDone === "true" || body.brickWallAlignmentDone === true,
    brickWallAlignmentRemarks: body.brickWallAlignmentRemarks ?? null,
    brickWallAlignmentPhoto:   getFiles("brickWallAlignmentPhoto"),

    qualityRemarks: body.qualityRemarks ?? null
  };
};

export const createQualityUsecase = async (
  body:  any,
  files: any,
  req:   any
) => upsertQualityDB(buildQualityPayload(body, files, req), extractMeta(req));

// Update quality uses the same upsert logic (idempotent via progressId)
export const updateQualityUsecase = createQualityUsecase;

// ─── GET PROGRESS / QUALITY ────────────────────────────────────────
export const getProgressByProjectUsecase = async (projectId: string) =>
  getProgressByProjectService(projectId);

export const getQualityByProgressUsecase = async (progressId: string) =>
  getQualityByProgressService(progressId);