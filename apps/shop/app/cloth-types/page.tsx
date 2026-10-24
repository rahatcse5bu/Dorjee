"use client";

import { Scissors } from "lucide-react";
import { CatalogListEditor } from "../../components/CatalogListEditor";
import { useI18n } from "../../lib/i18n";

const SUGGESTED_EN = ["Shirt", "Pant", "Panjabi", "Pajama", "Salwar", "Kameez", "Blouse", "Coat"];
const SUGGESTED_BN = ["শার্ট", "প্যান্ট", "পাঞ্জাবি", "পায়জামা", "সালোয়ার", "কামিজ", "ব্লাউজ", "কোট"];

export default function ClothTypesPage() {
  const { lang } = useI18n();
  return (
    <CatalogListEditor
      field="clothTypes"
      endpoint="cloth-types"
      icon={Scissors}
      suggestions={lang === "bn" ? SUGGESTED_BN : SUGGESTED_EN}
      keys={{
        title: "clothTypes.title",
        sub: "clothTypes.sub",
        newLabel: "clothTypes.new",
        placeholder: "clothTypes.placeholder",
        list: "clothTypes.list",
        empty: "clothTypes.empty",
        saved: "clothTypes.saved",
        save: "clothTypes.save",
      }}
    />
  );
}
