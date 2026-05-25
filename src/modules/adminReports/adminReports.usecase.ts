import { getAdminDashboardReportService } from "./adminReports.service";

export const getAdminDashboardReportUsecase = async ({
  pageNumber,
  pageSize,
  search
}: {
  pageNumber?: string;
  pageSize?: string;
  search?: string;
}) => {
  return getAdminDashboardReportService({
    pageNumber,
    pageSize,
    search
  });
};