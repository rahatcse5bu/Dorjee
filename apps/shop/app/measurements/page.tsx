"use client";

import { Ruler } from "lucide-react";
import { CatalogListEditor } from "../../components/CatalogListEditor";
import { useI18n } from "../../lib/i18n";

const SUGGESTED_EN = ["Chest", "Shoulder", "Sleeve", "Collar", "Length", "Waist", "Hip", "Inseam"];
const SUGGESTED_BN = ["বুক", "কাঁধ", "হাতা", "কলার", "লম্বা", "কোমর", "হিপ", "মুহুরি"];

export default function MeasurementsPage() {
  const { lang } = useI18n();
  return (
    <CatalogListEditor
      field="measurementLabels"
      endpoint="measurements"
      icon={Ruler}
      suggestions={lang === "bn" ? SUGGESTED_BN : SUGGESTED_EN}
      keys={{
        title: "measurements.title",
        sub: "measurements.sub",
        newLabel: "measurements.new",
        placeholder: "measurements.placeholder",
        list: "measurements.labels",
        empty: "measurements.empty",
        saved: "measurements.saved",
        save: "measurements.save",
      }}
    />
  );
}
