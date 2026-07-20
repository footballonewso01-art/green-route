import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import Cropper, { Area } from "react-easy-crop";
import { DraggableProvided, DraggableStateSnapshot } from "@hello-pangea/dnd";
import { Edit3, ExternalLink, GripVertical, ImagePlus, Loader2, Save, Trash2, Unlink, X } from "lucide-react";
import { IconRenderer } from "@/components/icons/IconRenderer";
import { getCroppedImg } from "@/utils/cropImage";
import { ProfileLinkItem, getProfileLinkTitle } from "@/lib/profileLinks";
import { toast } from "sonner";

interface ProfileLinkEditorCardProps {
  item: ProfileLinkItem;
  provided: DraggableProvided;
  snapshot: DraggableStateSnapshot;
  onUpdate: (
    id: string,
    presentation: { title_override: string; size: "regular" | "large" },
    backgroundFile: File | null,
    backgroundRemoved: boolean,
  ) => Promise<boolean>;
  onRemove: (id: string) => void;
}

export function ProfileLinkEditorCard({
  item,
  provided,
  snapshot,
  onUpdate,
  onRemove,
}: ProfileLinkEditorCardProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [titleOverride, setTitleOverride] = useState(item.title_override || "");
  const [size, setSize] = useState<"regular" | "large">(item.size || "regular");
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(item.backgroundUrl);
  const [backgroundRemoved, setBackgroundRemoved] = useState(false);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const resetEditor = () => {
    setTitleOverride(item.title_override || "");
    setSize(item.size || "regular");
    setBackgroundFile(null);
    setBackgroundPreview(item.backgroundUrl);
    setBackgroundRemoved(false);
    setCropSource(null);
  };

  const handleFile = (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Background image must be less than 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const source = String(reader.result || "");
      setCropSource(source);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
  };

  const applyCrop = async () => {
    if (!cropSource || !croppedAreaPixels) return;
    try {
      const croppedUrl = await getCroppedImg(cropSource, croppedAreaPixels);
      const [header, encoded] = croppedUrl.split(",");
      const mime = header.match(/:(.*?);/)?.[1] || "image/jpeg";
      const bytes = atob(encoded);
      const buffer = new Uint8Array(bytes.length);
      for (let index = 0; index < bytes.length; index++) buffer[index] = bytes.charCodeAt(index);
      const file = new File([buffer], "profile-link-background.jpg", { type: mime });
      setBackgroundFile(file);
      setBackgroundPreview(croppedUrl);
      setBackgroundRemoved(false);
      setCropSource(null);
    } catch (error) {
      toast.error("Could not crop this background image");
    }
  };

  const savePresentation = async () => {
    setSaving(true);
    try {
      const saved = await onUpdate(
        item.id,
        { title_override: titleOverride, size },
        backgroundFile,
        backgroundRemoved,
      );
      if (saved) {
        setBackgroundFile(null);
        setBackgroundRemoved(false);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      className={`rounded-2xl border bg-surface/65 transition-colors ${
        snapshot.isDragging ? "z-50 border-accent/60 shadow-2xl shadow-accent/15" : "border-border/80 hover:border-white/15"
      }`}
    >
      <div className="flex items-center gap-3 p-3.5">
        <button
          type="button"
          {...provided.dragHandleProps}
          className="flex h-9 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground"
          aria-label={`Reorder ${getProfileLinkTitle(item)}`}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background/55">
          <IconRenderer
            type={item.link.icon_type}
            value={item.link.icon_value}
            url={item.link.destination_url}
            className="h-6 w-6 text-accent"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">{getProfileLinkTitle(item)}</p>
            {item.backgroundUrl && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" title="Custom background" />}
          </div>
          <p className="mt-0.5 truncate text-xs font-sans text-muted-foreground">{item.link.destination_url}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <RouterLink
            to={`/dashboard/links/edit/${item.link.id}`}
            className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            aria-label={`Edit redirect settings for ${getProfileLinkTitle(item)}`}
            title="Edit in Links"
          >
            <ExternalLink className="h-4 w-4" />
          </RouterLink>
          <button
            type="button"
            onClick={() => {
              if (editing) resetEditor();
              setEditing(current => !current);
            }}
            className={`rounded-xl p-2 transition-colors ${editing ? "bg-accent/10 text-accent" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}`}
            aria-expanded={editing}
            aria-label={`Customize ${getProfileLinkTitle(item)} card`}
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Remove ${getProfileLinkTitle(item)} from profile`}
            title="Remove from profile"
          >
            <Unlink className="h-4 w-4" />
          </button>
        </div>
      </div>

      {editing && (
        <div className="space-y-4 border-t border-border/70 px-4 pb-4 pt-4 animate-fade-in">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Profile title override</label>
            <input
              value={titleOverride}
              onChange={event => setTitleOverride(event.target.value)}
              placeholder={item.link.title || `/${item.link.slug}`}
              maxLength={200}
              className="mt-2 h-10 w-full rounded-xl border border-border bg-background/45 px-3 text-sm text-foreground outline-none transition-colors focus:border-accent/45"
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">Leave empty to use the title from Links.</p>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Card size</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["regular", "large"] as const).map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSize(option)}
                  className={`rounded-xl border py-2 text-xs font-semibold capitalize transition-colors ${
                    size === option ? "border-accent/45 bg-accent/10 text-accent" : "border-border bg-background/30 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Background image</label>
            {backgroundPreview && !backgroundRemoved ? (
              <div className={`relative mt-2 overflow-hidden rounded-2xl border border-white/10 ${size === "large" ? "aspect-[2/1]" : "h-24"}`}>
                <img src={backgroundPreview} alt="Card background preview" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-black/35" />
                <button
                  type="button"
                  onClick={() => {
                    setBackgroundPreview(null);
                    setBackgroundFile(null);
                    setBackgroundRemoved(true);
                  }}
                  className="absolute right-2 top-2 rounded-lg bg-black/65 p-2 text-white transition-colors hover:bg-destructive"
                  aria-label="Remove card background"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-background/25 px-4 py-5 text-xs font-semibold text-muted-foreground transition-colors hover:border-accent/35 hover:text-accent">
                <ImagePlus className="h-4 w-4" /> Upload background
                <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={event => handleFile(event.target.files?.[0])} />
              </label>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-border/60 pt-3">
            <button
              type="button"
              onClick={() => {
                resetEditor();
                setEditing(false);
              }}
              className="rounded-xl px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void savePresentation()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-3.5 py-2 text-xs font-bold text-black disabled:cursor-wait disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save card
            </button>
          </div>
        </div>
      )}

      {cropSource && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setCropSource(null)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Crop card background</h3>
              <button type="button" onClick={() => setCropSource(null)} className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground" aria-label="Close cropper">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="relative mt-4 h-72 overflow-hidden rounded-xl bg-black">
              <Cropper
                image={cropSource}
                crop={crop}
                zoom={zoom}
                aspect={size === "large" ? 2 : 10 / 3}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_area, pixels) => setCroppedAreaPixels(pixels)}
              />
            </div>
            <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={event => setZoom(Number(event.target.value))} className="mt-4 w-full" aria-label="Background zoom" />
            <button type="button" onClick={() => void applyCrop()} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-sm font-bold text-black">
              <ImagePlus className="h-4 w-4" /> Use background
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
