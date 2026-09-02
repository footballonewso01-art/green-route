import { Navigate, useLocation } from "react-router-dom";
import SeoResourceLayout from "@/components/SeoResourceLayout";
import GuideDetailView from "@/components/guides/GuideDetailView";
import TemplateDetailView from "@/components/templates/TemplateDetailView";
import { getSeoContentPage } from "@/lib/seoContent";

export default function SeoContentPage() {
  const location = useLocation();
  const page = getSeoContentPage(location.pathname);

  if (!page || page.kind === "tool") return <Navigate to="/404" replace />;

  if (page.kind === "template") return <TemplateDetailView page={page} />;

  if (page.kind === "guide") return <GuideDetailView page={page} />;

  return <SeoResourceLayout page={page} />;
}
