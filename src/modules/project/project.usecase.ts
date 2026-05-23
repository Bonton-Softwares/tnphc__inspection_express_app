import {
  createProjectService,
  getAllProjectsService,
  getProjectByIdService,
  updateProjectService,
  deleteProjectService,
  getProjectDashboardService,
  getProjectsByUserService,
} from "./project.service";

// ─────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────

export const createProjectUsecase = async (data: any) => {
  return createProjectService(data);
};

// ─────────────────────────────────────────────────────────────
// GET ALL
// ─────────────────────────────────────────────────────────────

export const getAllProjectsUsecase = async ({
  pageNumber,
  pageSize,
  search,
  status,
  departmentId,
  districtId,
  specialUnitId,
  userId,
}: {
  pageNumber?: string;
  pageSize?: string;
  search?: string;
  status?: string;
  departmentId?: string;
  districtId?: string;
  specialUnitId?: string;
  userId?: string;
}) => {
  return getAllProjectsService({
    pageNumber,
    pageSize,
    search,
    status,
    departmentId,
    districtId,
    specialUnitId,
    userId,
  });
};

// ─────────────────────────────────────────────────────────────
// GET BY ID
// ─────────────────────────────────────────────────────────────

export const getProjectByIdUsecase = async (id: string) => {
  const project = await getProjectByIdService(id);
  if (!project) throw new Error("Project not found");
  return project;
};

// ─────────────────────────────────────────────────────────────
// GET PROJECTS ASSIGNED TO A USER
// ─────────────────────────────────────────────────────────────

export const getProjectsByUserUsecase = async ({
  userId,
  pageNumber,
  pageSize,
  search,
}: {
  userId?: string;
  pageNumber?: string;
  pageSize?: string;
  search?: string;
}) => {
  return getProjectsByUserService({ userId, pageNumber, pageSize, search });
};

// ─────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────

export const updateProjectUsecase = async (id: string, data: any) => {
  return updateProjectService(id, data);
};

// ─────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────

export const deleteProjectUsecase = async (id: string) => {
  return deleteProjectService(id);
};

// ─────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────

export const getProjectDashboardUsecase = async (userId?: string) => {
  return getProjectDashboardService(userId);
};