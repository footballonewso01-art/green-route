import { Navigate, useLocation } from "react-router-dom";
import ProfileTemplateSeoPreview from "@/components/ProfileTemplateSeoPreview";
import SeoResourceLayout from "@/components/SeoResourceLayout";
import { getSeoContentPage } from "@/lib/seoContent";

export default function SeoContentPage() {
  const location = useLocation();
  const page = getSeoContentPage(location.pathname);

  if (!page || page.kind === "tool") return <Navigate to="/404" replace />;

  const preview = page.kind === "template" && page.templateId
    ? <ProfileTemplateSeoPreview templateId={page.templateId} />
    : undefined;

  return <SeoResourceLayout page={page} preview={preview} />;
}
