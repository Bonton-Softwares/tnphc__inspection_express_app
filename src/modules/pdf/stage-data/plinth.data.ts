// src/modules/pdf/stage-data/plinth.data.ts
import { renderSectionHeading, spacer } from "../helpers/renderSection";
import { renderFields }                  from "../helpers/renderFields";
import { renderPhotoReferences }         from "../helpers/renderPhotos";

export function renderPlinthData(doc: any, stageData: any) {
  if (!stageData?.records?.length) return;

  renderSectionHeading(doc, "Plinth Stage", 1);
  spacer(doc, 4);

  stageData.records.forEach((r: any, idx: number) => {
    renderSectionHeading(doc, `Plinth Record ${idx + 1}`, 2);

    renderSectionHeading(doc, "Progress", 3);
    renderFields(doc, [
      { label: "Stage of Work",    value: r.stageOfWork },
      { label: "Completed",        value: r.isCompleted },
      { label: "Work Started",     value: r.workStartedDate },
      { label: "Is Delayed",       value: r.isDelay },
      { label: "Delay Days",       value: r.delayDays },
      { label: "Delay Reason",     value: r.delayReason },
      { label: "Progress Remarks", value: r.progressRemarks },
    ]);
    renderPhotoReferences(doc, "Progress Photos", r.progressPhoto);

    renderSectionHeading(doc, "Quality — Cement", 3);
    renderFields(doc, [
      { label: "Grade",    value: r.cementGradeId },
      { label: "Brand",    value: r.cementBrandId },
      { label: "Lab Test", value: r.cementLabTest },
      { label: "Remarks",  value: r.cementRemarks },
    ]);
    renderPhotoReferences(doc, "Cement Photos", r.cementPhoto);

    renderSectionHeading(doc, "Quality — Sand / Steel / Aggregate", 3);
    renderFields(doc, [
      { label: "Sand Type",         value: r.sandType },
      { label: "Sand Lab Test",     value: r.sandLabTest },
      { label: "Sieve Test",        value: r.sandSieveTestDone },
      { label: "Steel Grade",       value: r.steelGradeId },
      { label: "Steel Brand",       value: r.steelBrandId },
      { label: "Steel Lab Test",    value: r.steelLabTest },
      { label: "Aggregate Size",    value: r.aggregateSize },
      { label: "Aggregate Lab",     value: r.aggregateLabTest },
      { label: "Water Lab Test",    value: r.waterLabTest },
      { label: "Concrete Lab Test", value: r.concreteLabTest },
      { label: "Bricks Lab Test",   value: r.bricksLabTest },
      { label: "Quality Remarks",   value: r.qualityRemarks },
    ]);
  });

  spacer(doc, 8);
}
