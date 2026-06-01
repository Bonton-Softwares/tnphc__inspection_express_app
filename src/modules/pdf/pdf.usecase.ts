import {
  generateAdminPdfService,
  generateUserPdfService,
  generateProjectPdfService,
} from "./pdf.service";

export const generateAdminPdfUsecase = async (params: {
  search?: string;
  districts?: string[];
  departments?: string[];
  stages?: string[];
  generatedBy?: string;
  generatedByUserId?: string;
}) => {
  return generateAdminPdfService(params);
};

export const generateUserPdfUsecase = async (params: {
  userId: string;
  generatedBy?: string;
  generatedByUserId?: string;
}) => {
  return generateUserPdfService(params);
};

export const generateProjectPdfUsecase = async (params: {
  projectId: string;
  generatedBy?: string;
  generatedByUserId?: string;
}) => {
  return generateProjectPdfService(params);
};