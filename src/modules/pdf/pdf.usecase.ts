import {
  generateSuperStructurePdf
} from "./pdf.service";

export const generateSuperStructurePdfUsecase =
  async (
    projectId: string
  ) => {

    return generateSuperStructurePdf(
      projectId
    );
  };