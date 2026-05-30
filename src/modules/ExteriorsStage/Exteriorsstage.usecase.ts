import {
  getExteriorsFullViewService,
  upsertExteriorsProgressDB,
  upsertExteriorsQualityDB,
  getExteriorsProgressByProjectService,
  getExteriorsQualityByProgressService,
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

  return upsertExteriorsProgressDB(
    {
      projectId:    body.projectId,
      blockId:      body.blockId,
      floorId:      body.floorId,
      stage:        body.stage    ?? null,
      remarks:      body.remarks  ?? null,
      progressPhoto: progressPhoto.length ? progressPhoto : undefined,
      status:       body.status   ?? "IN_PROGRESS"
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

  return upsertExteriorsProgressDB(
    {
      id,
      projectId:    body.projectId,
      blockId:      body.blockId,
      floorId:      body.floorId,
      stage:        body.stage   ?? null,
      remarks:      body.remarks ?? null,
      ...(progressPhoto.length ? { progressPhoto } : {}), // only overwrite if new photo sent
      status:       body.status  ?? "IN_PROGRESS"
    },
    extractMeta(req)
  );
};

// ─── DELETE ────────────────────────────────────────────────────────
export const deleteExteriorsProgressUsecase = async (
  id:  string,
  req: any
) => deleteExteriorsProgressDB(id, extractMeta(req));

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
    isDelayed:       body.isDelayed === "true" || body.isDelayed === true,
    delayDays:       body.delayDays ? Number(body.delayDays) : null,
    delayReason:     body.delayReason  ?? null,
    delayOther:      body.delayOther   ?? null,
    generalRemarks:  body.generalRemarks ?? null,

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
    plasteringRemarks:  body.plasteringRemarks ?? null,

    // DOORS & WINDOWS
    doorWindowType:    body.doorWindowType    ?? null,
    upvcBrand:         body.upvcBrand         ?? null,
    glassBrand:        body.glassBrand        ?? null,
    glassThickness:    body.glassThickness    ?? null,
    doorWindowRemarks: body.doorWindowRemarks ?? null,

    // INTERIOR TILES
    interiorFloorType:   body.interiorFloorType   ?? null,
    interiorTileBrand:   body.interiorTileBrand   ?? null,
    interiorTileRemarks: body.interiorTileRemarks ?? null,

    // ROOF TILES
    roofFloorType:   body.roofFloorType   ?? null,
    roofTileBrand:   body.roofTileBrand   ?? null,
    roofTileRemarks: body.roofTileRemarks ?? null,

    // INTERIOR PAINTING
    interiorPaintBrand:      body.interiorPaintBrand      ?? null,
    interiorPaintingQuality: body.interiorPaintingQuality ?? null,

    // EXTERIOR PAINTING
    exteriorPaintBrand:      body.exteriorPaintBrand      ?? null,
    exteriorPaintingQuality: body.exteriorPaintingQuality ?? null,

    qualityRemarks: body.qualityRemarks ?? null
  };
};

export const createExteriorsQualityUsecase = async (
  body:  any,
  files: any,
  req:   any
) => upsertExteriorsQualityDB(buildQualityPayload(body, files, req), extractMeta(req));

// Update quality uses the same upsert logic (idempotent via progressId)
export const updateExteriorsQualityUsecase = createExteriorsQualityUsecase;

// ─── GETS ──────────────────────────────────────────────────────────
export const getExteriorsProgressByProjectUsecase = async (
  projectId: string
) => getExteriorsProgressByProjectService(projectId);

export const getExteriorsQualityByProgressUsecase = async (
  progressId: string
) => getExteriorsQualityByProgressService(progressId);