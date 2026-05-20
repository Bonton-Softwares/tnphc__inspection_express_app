import { Router } from "express";
import * as controller from "./grade.controller";
import { validateRequest } from "../../middleware/validateRequest";
import {
  createGradeSchema, updateGradeSchema,
  gradeIdSchema, listGradeSchema,
} from "./grade.schema";

const router = Router();

router.post("/", validateRequest(createGradeSchema), controller.createGrade);
router.get("/", validateRequest(listGradeSchema, "query"), controller.listGrades);
router.get("/:id", validateRequest(gradeIdSchema, "params"), controller.getGradeById);
router.put("/:id", validateRequest(gradeIdSchema, "params"), validateRequest(updateGradeSchema), controller.updateGrade);
router.delete("/:id", validateRequest(gradeIdSchema, "params"), controller.deleteGrade);

export default router;