import { PROFILE_TEMPLATES, ProfileTemplateId } from "@/lib/profileTemplates";

interface ProfileTemplateSeoPreviewProps {
  templateId: "hub" | ProfileTemplateId;
}

const links = ["Latest release", "Book a session", "Creator portfolio"];

function MiniPhone({ template }: { template: ProfileTemplateId }) {
  const compact = template === "compact";
  const banner = template === "banner";
  const hero = template === "hero";
  const cutout = template === "cutout";

  return (
    <div className={`relative mx-auto w-full max-w-[260px] overflow-hidden border border-white/10 bg-[#0a0d12] shadow-2xl ${cutout ? "rounded-[24px]" : "rounded-[32px]"}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(52,211,153,0.28),transparent_32%),radial-gradient(circle_at_80%_70%,rgba(14,165,233,0.18),transparent_35%)]" />
      {banner && <div className="relative h-24 bg-gradient-to-r from-emerald-500/40 to-cyan-500/30" />}
      {(hero || template === "classic") && <div className={`relative bg-gradient-to-b from-emerald-400/35 via-slate-700/30 to-[#0a0d12] ${hero ? "h-64" : "h-48"}`} />}
      <div className={`relative px-5 pb-6 ${banner ? "-mt-9" : hero || template === "classic" ? "-mt-12" : "pt-7"}`}>
        <div className={`${cutout ? "ml-auto h-32 w-24 rounded-t-[3rem] rounded-b-xl" : compact ? "h-16 w-16 rounded-full" : "h-20 w-20 rounded-full"} border-4 border-[#0a0d12] bg-gradient-to-br from-emerald-300 to-cyan-600 shadow-xl ${banner ? "mx-auto" : cutout ? "" : "mx-auto"}`} />
        <div className={`mt-3 ${cutout ? "text-left" : "text-center"}`}>
          <p className={`${cutout ? "text-2xl uppercase" : "text-lg"} font-black tracking-tight text-white`}>Alex Morgan</p>
          <p className="mt-1 text-xs text-slate-400">Creator · Designer · Explorer</p>
        </div>
        <div className="mt-5 space-y-2.5">
          {links.map((link, index) => (
            <div key={link} className={`${cutout ? "rounded-none border-x-0 border-t-0" : "rounded-xl"} flex items-center justify-between border border-white/10 bg-white/[0.06] px-3.5 py-3 text-xs font-bold text-white`}>
              <span>{link}</span><span className="text-emerald-300">0{index + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProfileTemplateSeoPreview({ templateId }: ProfileTemplateSeoPreviewProps) {
  if (templateId === "hub") {
    return (
      <div className="grid grid-cols-2 gap-3 rounded-3xl border border-border bg-card/50 p-4 sm:grid-cols-3">
        {PROFILE_TEMPLATES.map((template) => (
          <div key={template.id} className="rounded-2xl border border-border/70 bg-background/70 p-3">
            <div className="mx-auto h-24 max-w-20 overflow-hidden rounded-xl border border-white/10 bg-[#0a0d12]">
              <div className="h-8 bg-emerald-400/20" />
              <div className="mx-auto -mt-2 h-5 w-5 rounded-full bg-emerald-300" />
              <div className="mx-2 mt-2 space-y-1"><div className="h-2 rounded bg-white/15" /><div className="h-2 rounded bg-white/10" /></div>
            </div>
            <p className="mt-2 text-center text-[11px] font-bold text-muted-foreground">{template.name}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-card/50 p-5 sm:p-8">
      <MiniPhone template={templateId} />
    </div>
  );
}
