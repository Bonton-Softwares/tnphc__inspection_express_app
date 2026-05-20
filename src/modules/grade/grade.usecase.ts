import * as service from "./grade.service";

export const createGradeUsecase = async (data: any) => {
  return service.createGradeService(data);
};

export const getGradeByIdUsecase = async (id: string) => {
  return service.getGradeByIdService(id);
};

export const updateGradeUsecase = async (id: string, data: any) => {
  return service.updateGradeService(id, data);
};

export const deleteGradeUsecase = async (id: string) => {
  return service.deleteGradeService(id);
};

export const listGradesUsecase = async (query: any) => {
  return service.listGradesService(query);
};