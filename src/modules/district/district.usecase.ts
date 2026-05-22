import {
  createDistrictService,
  getAllDistrictsService,
  getDistrictByIdService,
  updateDistrictService,
  deleteDistrictService,
} from "./district.service";

export const createDistrictUsecase = async (input: any) => {
  return createDistrictService(input);
};

export const getAllDistrictsUsecase = async ({
  pageNumber,
  pageSize,
  search,
  type,
  isDropdown,
}: {
  pageNumber?: string;
  pageSize?: string;
  search?: string;
  type?: string;
  isDropdown?: boolean;
}) => {
  return getAllDistrictsService({
    pageNumber,
    pageSize,
    search,
    type,
    isDropdown,
  });
};



export const getDistrictByIdUsecase = async (id: string) => {
  const district = await getDistrictByIdService(id);
  if (!district) throw new Error("District not found");
  return district;
};

export const updateDistrictUsecase = async (id: string, input: any) => {
  return updateDistrictService(id, input);
};

export const deleteDistrictUsecase = async (id: string) => {
  return deleteDistrictService(id);
};