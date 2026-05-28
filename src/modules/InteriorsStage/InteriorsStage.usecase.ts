import {
  getInteriorsFullViewService,
  upsertInteriorsProgressDB,
  upsertInteriorsQualityDB,
  getInteriorsProgressByProjectService,
  getInteriorsQualityByProgressService,
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

  return upsertInteriorsProgressDB(
    {
      projectId:       body.projectId,
      blockId:         body.blockId,
      floorId:         body.floorId,
      stage:           body.stage           ?? null,
      progressRemarks: body.progressRemarks ?? null,
      progressPhoto:   progressPhoto.length ? progressPhoto : undefined,
      status:          body.status          ?? "IN_PROGRESS"
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

  return upsertInteriorsProgressDB(
    {
      id,
      projectId:       body.projectId,
      blockId:         body.blockId,
      floorId:         body.floorId,
      stage:           body.stage           ?? null,
      progressRemarks: body.progressRemarks ?? null,
      ...(progressPhoto.length ? { progressPhoto } : {}), // only overwrite photo if new one sent
      status:          body.status          ?? "IN_PROGRESS"
    },
    extractMeta(req)
  );
};

// ─── DELETE ────────────────────────────────────────────────────────
export const deleteInteriorsProgressUsecase = async (
  id:  string,
  req: any
) => deleteInteriorsProgressDB(id, extractMeta(req));

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
    progressId:       body.progressId,

    workStartedDate:  body.workStartedDate ? new Date(body.workStartedDate) : null,
    isDelay:          body.isDelay === "true" || body.isDelay === true,
    delayDays:        body.delayDays ? Number(body.delayDays) : null,
    delayReason:      body.delayReason      ?? null,
    delayOtherReason: body.delayOtherReason ?? null,

    // CEMENT
    cementGradeId: body.cementGradeId ?? null,
    cementBrandId: body.cementBrandId ?? null,
    cementRemarks: body.cementRemarks ?? null,
    cementLabTest: body.cementLabTest ?? null,
    cementPhoto:   getFiles("cementPhoto"),

    // SAND
    sandType:          body.sandType          ?? null,
    sandLabTest:       body.sandLabTest       ?? null,
    sandPhoto:         getFiles("sandPhoto"),
    sandSieveTestDone: body.sandSieveTestDone === "true" || body.sandSieveTestDone === true,
    sandSieveLabTest:  body.sandSieveLabTest  ?? null,
    sandSievePhoto:    getFiles("sandSievePhoto"),

    // AGGREGATE
    aggregateSize:    body.aggregateSize ? Number(body.aggregateSize) : null,
    aggregateLabTest: body.aggregateLabTest ?? null,
    aggregatePhoto:   getFiles("aggregatePhoto"),

    // WATER
    waterLabTest: body.waterLabTest ?? null,
    waterPhoto:   getFiles("waterPhoto"),

    // CONCRETE
    concreteLabTest:         body.concreteLabTest         ?? null,
    concretePhoto:           getFiles("concretePhoto"),
    concreteQualityTestDone: body.concreteQualityTestDone === "true" || body.concreteQualityTestDone === true,
    concreteQualityLabTest:  body.concreteQualityLabTest  ?? null,
    concreteQualityPhoto:    getFiles("concreteQualityPhoto"),

    // BRICKS
    bricksLabTest:         body.bricksLabTest         ?? null,
    bricksPhoto:           getFiles("bricksPhoto"),
    bricksQualityTestDone: body.bricksQualityTestDone === "true" || body.bricksQualityTestDone === true,
    bricksQualityLabTest:  body.bricksQualityLabTest  ?? null,
    bricksQualityPhoto:    getFiles("bricksQualityPhoto"),

    // PLASTERING
    plasteringTestDone: body.plasteringTestDone === "true" || body.plasteringTestDone === true,
    plasteringLabTest:  body.plasteringLabTest ?? null,
    plasteringPhoto:    getFiles("plasteringPhoto"),

    // DOORS & WINDOWS
    doorWoodType:   body.doorWoodType   ?? null,
    upvcBrand:      body.upvcBrand      ?? null,
    glassBrand:     body.glassBrand     ?? null,
    glassThickness: body.glassThickness ?? null,

    // TILES
    floorType:   body.floorType   ?? null,
    tileBrand:   body.tileBrand   ?? null,
    tileRemarks: body.tileRemarks ?? null,

    // PAINTING
    paintBrand:      body.paintBrand      ?? null,
    paintingQuality: body.paintingQuality ?? null,

    qualityRemarks: body.qualityRemarks ?? null
  };
};

export const createInteriorsQualityUsecase = async (
  body:  any,
  files: any,
  req:   any
) => upsertInteriorsQualityDB(buildQualityPayload(body, files, req), extractMeta(req));

// Update quality uses the same upsert logic (idempotent via progressId)
export const updateInteriorsQualityUsecase = createInteriorsQualityUsecase;

// ─── GETS ──────────────────────────────────────────────────────────
export const getInteriorsProgressByProjectUsecase = async (
  projectId: string
) => getInteriorsProgressByProjectService(projectId);

export const getInteriorsQualityByProgressUsecase = async (
  progressId: string
) => getInteriorsQualityByProgressService(progressId);