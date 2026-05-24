import {
  getSuperStructureFullViewService,
  upsertProgressDB,
  deleteProgressDB,
  upsertQualityDB,
  getProgressByProjectService,
  getQualityByProjectService
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
      blockName: body.blockName ?? null,
      floorName: body.floorName ?? null,
      stage:     body.stage,
      photo,
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
      blockName: body.blockName ?? null,
      floorName: body.floorName ?? null,
      stage:     body.stage,
      ...(photo.length ? { photo } : {}), // only overwrite photo if new one sent
      status:    body.status ?? "IN_PROGRESS"
    },
    extractMeta(req)
  );
};

// ─── DELETE ────────────────────────────────────────────────────────
export const deleteProgressUsecase = async (id: string, req: any) =>
  deleteProgressDB(id, extractMeta(req));

// ─── QUALITY CREATE / UPDATE ───────────────────────────────────────
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
    generalRemarks:  body.generalRemarks,

    cementGradeId: body.cementGradeId,
    cementBrandId: body.cementBrandId,
    cementRemarks: body.cementRemarks,
    cementLabTest: body.cementLabTest,
    cementPhoto:   getFiles("cementPhoto"),

    sandType:         body.sandType,
    sandLabTest:      body.sandLabTest,
    sandPhoto:        getFiles("sandPhoto"),
    sandSieveTestDone: body.sandSieveTestDone === "true" || body.sandSieveTestDone === true,
    sandSieveLabTest: body.sandSieveLabTest,
    sandSievePhoto:   getFiles("sandSievePhoto"),

    steelGradeId: body.steelGradeId,
    steelBrandId: body.steelBrandId,
    steelLabTest: body.steelLabTest,
    steelPhoto:   getFiles("steelPhoto"),

    aggregateSize:    body.aggregateSize ? Number(body.aggregateSize) : null,
    aggregateLabTest: body.aggregateLabTest,
    aggregatePhoto:   getFiles("aggregatePhoto"),

    waterLabTest: body.waterLabTest,
    waterPhoto:   getFiles("waterPhoto"),

    concreteLabTest:         body.concreteLabTest,
    concretePhoto:           getFiles("concretePhoto"),
    concreteQualityTestDone: body.concreteQualityTestDone === "true",
    concreteQualityLabTest:  body.concreteQualityLabTest,
    concreteQualityPhoto:    getFiles("concreteQualityPhoto"),

    bricksLabTest:             body.bricksLabTest,
    bricksPhoto:               getFiles("bricksPhoto"),
    bricksQualityTestDone:     body.bricksQualityTestDone === "true",
    bricksQualityLabTest:      body.bricksQualityLabTest,
    bricksQualityPhoto:        getFiles("bricksQualityPhoto"),
    brickWallAlignmentDone:    body.brickWallAlignmentDone === "true" || body.brickWallAlignmentDone === true,
    brickWallAlignmentRemarks: body.brickWallAlignmentRemarks,
    brickWallAlignmentPhoto:   getFiles("brickWallAlignmentPhoto"),

    qualityRemarks: body.qualityRemarks
  };
};

export const createQualityUsecase = async (
  body:  any,
  files: any,
  req:   any
) => upsertQualityDB(buildQualityPayload(body, files, req), extractMeta(req));

export const updateQualityUsecase = createQualityUsecase;

// ─── GET PROGRESS / QUALITY ────────────────────────────────────────
export const getProgressByProjectUsecase = async (projectId: string) =>
  getProgressByProjectService(projectId);

export const getQualityByProjectUsecase = async (projectId: string) =>
  getQualityByProjectService(projectId);