import {
  getExteriorsFullViewService,
  upsertExteriorsProgressDB,
  upsertExteriorsQualityDB,
  getExteriorsProgressByProjectService,
  getExteriorsQualityByProjectService,
  deleteExteriorsProgressDB
} from "./Exteriorsstage.service";

const extractMeta = (req: any) => ({
  userId: req.user?.id,
  roleId: req.user?.roleId,
  ip:     req.ip
});

// ─── GET ───────────────────────────────────────────────────────────
export const getExteriorsFullViewUsecase = async (projectId: string) =>
  getExteriorsFullViewService(projectId);

// ─── PROGRESS CREATE ───────────────────────────────────────────────
export const createExteriorsProgressUsecase = async (
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

  return upsertExteriorsProgressDB(
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
export const updateExteriorsProgressUsecase = async (
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

  return upsertExteriorsProgressDB(
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
export const deleteExteriorsProgressUsecase = async (
  id:  string,
  req: any
) => deleteExteriorsProgressDB(id, extractMeta(req));

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
    isDelayed:       body.isDelayed === "true" || body.isDelayed === true,
    delayDays:       body.delayDays ? Number(body.delayDays) : null,
    delayReason:     body.delayReason,
    delayOther:      body.delayOther,
    generalRemarks:  body.generalRemarks,

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
    plasteringRemarks:  body.plasteringRemarks,

    doorWindowType:    body.doorWindowType,
    upvcBrand:         body.upvcBrand,
    glassBrand:        body.glassBrand,
    glassThickness:    body.glassThickness,
    doorWindowRemarks: body.doorWindowRemarks,

    interiorFloorType:   body.interiorFloorType,
    interiorTileBrand:   body.interiorTileBrand,
    interiorTileRemarks: body.interiorTileRemarks,

    roofFloorType:   body.roofFloorType,
    roofTileBrand:   body.roofTileBrand,
    roofTileRemarks: body.roofTileRemarks,

    interiorPaintBrand:      body.interiorPaintBrand,
    interiorPaintingQuality: body.interiorPaintingQuality,

    exteriorPaintBrand:      body.exteriorPaintBrand,
    exteriorPaintingQuality: body.exteriorPaintingQuality,

    qualityRemarks: body.qualityRemarks
  };
};

export const createExteriorsQualityUsecase = async (
  body:  any,
  files: any,
  req:   any
) => upsertExteriorsQualityDB(buildQualityPayload(body, files, req), extractMeta(req));

export const updateExteriorsQualityUsecase = createExteriorsQualityUsecase;

// ─── GETS ──────────────────────────────────────────────────────────
export const getExteriorsProgressByProjectUsecase = async (
  projectId: string
) => getExteriorsProgressByProjectService(projectId);

export const getExteriorsQualityByProjectUsecase = async (
  projectId: string
) => getExteriorsQualityByProjectService(projectId);