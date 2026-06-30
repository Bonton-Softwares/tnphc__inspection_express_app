// src/modules/pdf/configs/stageConfig.ts

export const STAGE_LABELS: Record<string, string> = {
  "Land Site Inspection":     "Land Site Inspection",
  "Pre-Construction":         "Pre-Construction Inspection",
  "Foundation Stage":         "Foundation Stage",
  "Plinth Stage":             "Plinth Stage",
  "Framed Structure":         "Framed Structure",       // was "Superstructure Stage"
  "Load Bearing Structure":   "Load Bearing Structure",  // was "Non Superstructure Stage"
  "Interiors":                "Interiors",
  "Exteriors":                "Exteriors",
  "Development Work":         "Development Work",
  "Take Over":                "Take Over",
};

export const STAGE_ORDER = [
  "Land Site Inspection",
  "Pre-Construction",
  "Foundation Stage",
  "Plinth Stage",
  "Framed Structure",
  "Load Bearing Structure",
  "Interiors",
  "Exteriors",
  "Development Work",
  "Take Over",
];

// Stages that are now driven by the generic inspection_module pipeline
// (createProgressService / saveAnswersService / inspection_progress table)
// instead of bespoke Prisma models + quality tables.
export const MODULE_STAGE_MAP: Record<string, string> = {
  "Framed Structure":       "FRAMED_STRUCTURE",
  "Load Bearing Structure": "LOAD_BEARING_STRUCTURE",
  "Interiors":              "INTERIOR",
  "Exteriors":              "EXTERIOR",
};

export function isModuleDrivenStage(key: string): boolean {
  return key in MODULE_STAGE_MAP;
}