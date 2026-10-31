import { redirect } from "next/navigation";

// Measurement names are managed per garment on the Cloth Types page.
export default function MeasurementsPage() {
  redirect("/cloth-types");
}
