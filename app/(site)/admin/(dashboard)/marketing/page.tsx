import { redirect } from "next/navigation";

// /admin/marketing is the tab's landing URL; the Report page is the view
// that matters, so the bare path goes straight there.

export default function MarketingIndex() {
  redirect("/admin/marketing/report");
}
