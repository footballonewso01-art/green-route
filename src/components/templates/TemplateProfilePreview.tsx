import { ProfileCanvas } from "@/components/profile/ProfileCanvas";
import { isLightProfileColor, type ProfileTemplateId } from "@/lib/profileTemplates";
import { getPresetIcon } from "@/components/icons/presets";
import creatorPortrait from "@/assets/hero-creator-portrait.webp";
import studioPhoto from "@/assets/auth-creator-editorial.webp";
import { templatePresentation } from "./templatePresentation";
import styles from "./Templates.module.css";

// Existing, source-controlled brand glyphs rendered as images are safe in both SSR and the browser.
// Keep the product's client-side SVG sanitizer unchanged for live/user-supplied profile content.
function exampleIcon(name: string, color: string, inset = false) {
  let svg = getPresetIcon(name)!.svg.replace(/currentColor/g, color);
  if (!svg.includes("xmlns=")) svg = svg.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
  if (inset) svg = svg.replace('viewBox="0 0 24 24"', 'viewBox="-8 -8 40 40"');
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export default function TemplateProfilePreview({ template, full = false }: { template: ProfileTemplateId; full?: boolean }) {
  const presentation = templatePresentation[template];
  const iconColor = isLightProfileColor(presentation.color) ? "#27352e" : "#f3f7f4";
  const socialLinks = ["instagram", "youtube", "linkedin"].map((icon) => ({
    id: icon,
    url: `https://${icon}.com/`,
    icon_type: "custom",
    icon_value: exampleIcon(icon, iconColor),
    label: getPresetIcon(icon)!.name,
  }));
  return (
    <div className={full ? styles.fullPreview : styles.thumbnail} aria-hidden="true">
      <div className={styles.canvas}>
        <ProfileCanvas
          preview
          embeddedPreview
          template={template}
          linkCardStyle={presentation.cardStyle}
          socialLinkStyle="icons"
          name="Nora Lane"
          username="noralane"
          bio="Photography, stories, and things worth sharing."
          avatarUrl={template === "hero" || template === "cutout" ? studioPhoto : creatorPortrait}
          avatarFallback="N"
          cardColor={presentation.color}
          backgroundMode={template === "visual" ? "image" : "color"}
          backgroundImageUrl={template === "visual" ? studioPhoto : undefined}
          backgroundOverlay="balanced"
          socialLinks={socialLinks}
          plan="pro"
          links={[
            { id: "journal", title: "The studio journal", iconType: "custom", iconValue: exampleIcon("instagram", "#f3f7f4", true), backgroundUrl: studioPhoto },
            { id: "work", title: "Selected work", iconType: "custom", iconValue: exampleIcon("youtube", iconColor, true) },
            { id: "contact", title: "Let's work together", iconType: "custom", iconValue: exampleIcon("linkedin", iconColor, true) },
          ]}
        />
      </div>
    </div>
  );
}
