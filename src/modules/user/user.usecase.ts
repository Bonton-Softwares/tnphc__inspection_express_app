// user.usecase.ts
import {
  getAllUsersService,
  getUserByIdService,
  createUserService,
  updateUserService,
  deleteUserService,
  loginService,
  getDepartmentsService,
  getMasterDistrictsService,
  getRolesService,
  getSpecialUnitsService,
} from "./user.service";

export const getAllUsersUsecase = async (filters?: any) =>
  getAllUsersService(filters);

export const getUserByIdUsecase = async (id: string) => {
  const user = await getUserByIdService(id);
  if (!user) throw new Error("User not found");
  return user;
};

export const createUserUsecase = async (data: any) =>
  createUserService(data);

export const updateUserUsecase = async (id: string, data: any) =>
  updateUserService(id, data);

export const deleteUserUsecase = async (id: string, updatedById?: string) =>
  deleteUserService(id, updatedById);

export const loginUsecase = async (data: any) =>
  loginService(data);

export const getDepartmentsUsecase = async () =>
  getDepartmentsService();

export const getMasterDistrictsUsecase = async (type?: "DISTRICT" | "CITY") =>
  getMasterDistrictsService(type);

export const getRolesUsecase = async () =>
  getRolesService();

export const getSpecialUnitsUsecase = async () =>
  getSpecialUnitsService();