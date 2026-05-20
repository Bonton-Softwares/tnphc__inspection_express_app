import * as service from "./brand.service";

export const createBrandUsecase = async (data: any) => {
  return service.createBrandService(data);
};

export const getBrandByIdUsecase = async (id: string) => {
  return service.getBrandByIdService(id);
};

export const updateBrandUsecase = async (
  id: string,
  data: any
) => {
  return service.updateBrandService(id, data);
};

export const deleteBrandUsecase = async (id: string) => {
  return service.deleteBrandService(id);
};

export const listBrandsUsecase = async (query: any) => {
  return service.listBrandsService(query);
};