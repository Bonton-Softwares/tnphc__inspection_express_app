import { Router } from "express";
import * as controller from "./material.controller";
import { validateRequest } from "../../middleware/validateRequest";
import {
  createMaterialSchema,
  updateMaterialSchema,
  materialIdSchema,
  listMaterialSchema,
} from "./material.schema";

const router = Router();

router.post(
  "/",
  validateRequest(createMaterialSchema),
  controller.createMaterial
);

router.get(
  "/",
  validateRequest(listMaterialSchema, "query"),
  controller.listMaterials
);

router.get(
  "/:id",
  validateRequest(materialIdSchema, "params"),
  controller.getMaterialById
);

router.put(
  "/:id",
  validateRequest(materialIdSchema, "params"),
  validateRequest(updateMaterialSchema),
  controller.updateMaterial
);

router.delete(
  "/:id",
  validateRequest(materialIdSchema, "params"),
  controller.deleteMaterial
);

export default router;