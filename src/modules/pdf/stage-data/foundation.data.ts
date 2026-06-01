// src/modules/pdf/stage-data/foundation.data.ts
import { renderSectionHeading, spacer } from "../helpers/renderSection";
import { renderFields }                  from "../helpers/renderFields";
import { renderPhotoReferences }         from "../helpers/renderPhotos";
import { renderTable }                   from "../helpers/renderTable";

function renderQualityCheck(doc: any, q: any) {
  renderSectionHeading(doc, "Quality Check", 2);

  renderSectionHeading(doc, "Cement", 3);
  renderFields(doc, [
    { label: "Grade",      value: q.cementGradeId },
    { label: "Brand",      value: q.cementBrandId },
    { label: "Lab Test",   value: q.cementLabTest },
    { label: "Remarks",    value: q.cementRemarks },
  ]);
  renderPhotoReferences(doc, "Cement Photos", q.cementPhoto);

  renderSectionHeading(doc, "Sand", 3);
  renderFields(doc, [
    { label: "Type",              value: q.sandType },
    { label: "Lab Test",          value: q.sandLabTest },
    { label: "Sieve Test Done",   value: q.sandSieveTestDone },
    { label: "Sieve Lab Test",    value: q.sandSieveLabTest },
  ]);
  renderPhotoReferences(doc, "Sand Photos",       q.sandPhoto);
  renderPhotoReferences(doc, "Sieve Test Photos", q.sandSievePhoto);

  renderSectionHeading(doc, "Steel", 3);
  renderFields(doc, [
    { label: "Grade",    value: q.steelGradeId },
    { label: "Brand",    value: q.steelBrandId },
    { label: "Lab Test", value: q.steelLabTest },
  ]);
  renderPhotoReferences(doc, "Steel Photos", q.steelPhoto);

  renderSectionHeading(doc, "Aggregate / Water / Concrete / Bricks", 3);
  renderFields(doc, [
    { label: "Aggregate Size (mm)",   value: q.aggregateSize },
    { label: "Aggregate Lab Test",    value: q.aggregateLabTest },
    { label: "Water Lab Test",        value: q.waterLabTest },
    { label: "Concrete Lab Test",     value: q.concreteLabTest },
    { label: "Concrete Quality Test", value: q.concreteQualityTestDone },
    { label: "Bricks Lab Test",       value: q.bricksLabTest },
    { label: "Bricks Quality Test",   value: q.bricksQualityTestDone },
    { label: "Remarks",               value: q.remarks },
  ]);
}

export function renderFoundationData(doc: any, stageData: any) {
  if (!stageData) return;

  renderSectionHeading(doc, "Foundation Stage", 1);
  spacer(doc, 4);

  // Progress records
  if (stageData.progresses?.length) {
    const rows = stageData.progresses.map((p: any) => ({
      type:      p.type,
      total:     p.total,
      completed: p.completed,
      started:   p.workStartedDate,
      delay:     p.isDelay ? `Yes (${p.delayDays ?? 0} days)` : "No",
      reason:    p.delayReason ?? "—",
      remarks:   p.generalRemarks ?? "—",
    }));

    renderTable(doc, [
      { header: "Type",      key: "type",      width: 1.2 },
      { header: "Total",     key: "total",     width: 0.7 },
      { header: "Completed", key: "completed", width: 0.8 },
      { header: "Started",   key: "started",   width: 1.2 },
      { header: "Delay",     key: "delay",     width: 1.0 },
      { header: "Reason",    key: "reason",    width: 1.5 },
      { header: "Remarks",   key: "remarks",   width: 1.6 },
    ], rows, "Foundation Progress");
  }

  if (stageData.qualityChecks?.length) {
    renderQualityCheck(doc, stageData.qualityChecks[0]);
  }

  spacer(doc, 8);
}
