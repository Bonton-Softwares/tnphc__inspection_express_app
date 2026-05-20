import * as service from "./material.service";

export const createMaterialUsecase = async (data: any) => {
  return service.createMaterialService(data);
};

export const getMaterialByIdUsecase = async (id: string) => {
  return service.getMaterialByIdService(id);
};

export const updateMaterialUsecase = async (id: string, data: any) => {
  return service.updateMaterialService(id, data);
};

export const deleteMaterialUsecase = async (id: string) => {
  return service.deleteMaterialService(id);
};

export const listMaterialsUsecase = async (query: any) => {
  return service.listMaterialsService(query);
};