import { Router } from "express";
import { baseAuth } from "../middleware/auth/baseAuth";
import userRoutes from "../modules/user/user.routes";
import rolesRouter from "../modules/roles/roles.routes";
import districtRoutes from "../modules/district/district.routes";
import specialUnitRoutes from "../modules/specialUnits/specialUnits.routes";
import projectRoutes from "../modules/project/project.routes";
import stageRoutes from "../modules/stage/stage.routes";
import landSiteInspectionRoutes from "../modules/landSiteInspection/landSiteInspection.routes";
import officerRoutes from "../modules/officer/officer.routes";
import departmentRoutes from "../modules/department/department.routes";
import materialRoutes from "../modules/material/material.routes";
import brandRoutes from "../modules/brand/brand.routes";
import gradeRoutes from "../modules/grade/grade.routes";
// import masterRoutes from "../modules/master/master.routes";
import preConstructionRoutes from "../modules/PreConstructionStage/PreConstruction.routes";
import foundationProgressRoutes from "../modules/FoundationProgress/FoundationProgress.routes";
import foundationQualityCheckRoutes from "../modules/FoundationQualityCheck/FoundationQualityCheck.route";
import plinthStageRoutes from "../modules/PlinthStage/PlinthStage.router";
import interiorsStageRoutes from "../modules/InteriorsStage/InteriorsStage.routes";
import exteriorsStageRoutes from "../modules/ExteriorsStage/Exteriorsstage.router";
import developmentWorkRoutes from "../modules/DevelopmentWork/DevelopmentWork.route";
import  buildingInspectionRoutes  from "../modules/BuildingInspection/BuildingInspection.routers";
import  TakeoverBuildingInspectionRoutes from "../modules/takeoverBuildingInspection/takeoverBuildingInspection.router"; 
import takeoverDevelopmentRoutes from "../modules/takeoverDevelopmentWork/takeoverDevelopmentWork.route";
import superStructureProgressRoutes from "../modules/superStructureProgress/superStructureProgress.routes";
import adminReportsRoute
from "../modules/adminReports/adminReports.route";
import masterDropdownRoutes from "../modules/masterDropdown/masterDropdown.routes";
import dropdownRoutes from "../modules/dropdown/dropdown.route";
import pdfRoutes from "../modules/pdf/pdf.routes";


const router = Router();

router.use("/auth", userRoutes);
router.use("/roles",baseAuth, rolesRouter);
router.use("/special-units",baseAuth, specialUnitRoutes);
router.use("/master-dropdown", baseAuth, masterDropdownRoutes);
router.use("/dropdown", baseAuth, dropdownRoutes);
router.use("/districts",baseAuth,districtRoutes);
router.use("/projects",baseAuth, projectRoutes);
router.use("/officers",baseAuth, officerRoutes); 
router.use("/departments",baseAuth,departmentRoutes); 
router.use("/stages",baseAuth, stageRoutes); 
router.use("/land-site-inspections",baseAuth, landSiteInspectionRoutes); 
router.use("/materials",baseAuth,materialRoutes); 
router.use("/grades",baseAuth,gradeRoutes); 
router.use("/brands",baseAuth,brandRoutes); 
// router.use("/master",baseAuth,masterRoutes);
router.use("/pre-construction", baseAuth, preConstructionRoutes);
router.use("/foundation-progress", baseAuth, foundationProgressRoutes);
router.use("/foundation-quality-check", baseAuth, foundationQualityCheckRoutes); 
router.use("/plinth-stage", baseAuth, plinthStageRoutes);
router.use("/interiors-stage", baseAuth, interiorsStageRoutes);
router.use("/exteriors-stage", baseAuth, exteriorsStageRoutes);
router.use("/building-inspection", baseAuth, buildingInspectionRoutes);
router.use("/development-work", baseAuth, developmentWorkRoutes);
router.use("/takeover-buildinginspection", baseAuth,TakeoverBuildingInspectionRoutes);
router.use("/takeover-developmentwork", baseAuth, takeoverDevelopmentRoutes);
router.use("/superstructure",baseAuth,superStructureProgressRoutes);
router.use(
  "/admin-reports",
  adminReportsRoute
);

router.use(
  "/pdf",
  pdfRoutes
);





export default router;   