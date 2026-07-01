// src/modules/pdf/pdf.usecase.ts
import {
  generateAdminPdfService,
  generateUserPdfService,
  generateProjectPdfService,
} from "./pdf.service";

export const generateAdminPdfUsecase = async (params: {
  search?:            string;
  districts?:         string[];
  departments?:       string[];
  stages?:            string[];
  generatedBy?:       string;
  generatedByUserId?: string;
}) => generateAdminPdfService(params);

export const generateProjectPdfUsecase = async (params: {
  projectId:          string;
  generatedBy?:       string;
  generatedByUserId?: string;
}) => generateProjectPdfService(params);

export const generateUserPdfUsecase = async (params: {
  userId:             string;
  generatedBy?:       string;
  generatedByUserId?: string;
}) => generateUserPdfService(params);