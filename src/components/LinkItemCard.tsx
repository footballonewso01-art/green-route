import React, { useState } from "react";
import { LinkItem } from "@/pages/DashboardProfile"; // We need to export this or move it
import { GripVertical, Edit, Trash2, ExternalLink, Loader2, Save, Upload } from "lucide-react";
import { IconRenderer } from "@/components/icons/IconRenderer";
import { IconPicker } from "@/components/icons/IconPicker";
import { DraggableProvided, DraggableStateSnapshot } from "@hello-pangea/dnd";
import { pb } from "@/lib/pocketbase";
import { toast } from "sonner";
import { urlSchema } from "@/lib/validations";

interface LinkItemCardProps {
    link: LinkItem;
    provided: DraggableProvided;
    snapshot: DraggableStateSnapshot;
    onUpdate: (id: string, updatedLink: LinkItem, bgImageFile: File | null, bgImageRemoved: boolean) => void;
    onDelete: (id: string) => void;
}

export const LinkItemCard = React.memo(({ link, provided, snapshot, onUpdate, onDelete }: LinkItemCardProps) => {
    const [isEditing, setIsEditing] = useState(link.id.startsWith("temp-"));

    // Local edit states (prevents O(n) re-renders in parent Dashboard)
    const [editTitle, setEditTitle] = useState(link.title || "");
    const [editUrl, setEditUrl] = useState(link.destination_url || "");
    const [editIconType, setEditIconType] = useState(link.icon_type || "none");
    const [editIconValue, setEditIconValue] = useState(link.icon_value || "");
    const [editSize, setEditSize] = useState(link.size || "regular");
    const [showEditIconPicker, setShowEditIconPicker] = useState(false);
    const [editLoading, setEditLoading] = useState(false);
    const [editBgImageFile, setEditBgImageFile] = useState<File | null>(null);
    const [editBgImagePreview, setEditBgImagePreview] = useState<string | null>(
        link.bg_image ? pb.files.getUrl(link as unknown as Record<string, unknown>, link.bg_image) : null
    );
    const [editBgImageRemoved, setEditBgImageRemoved] = useState(false);

    const startEditing = () => {
        setEditTitle(link.title || "");
        setEditUrl(link.destination_url || "");
        setEditIconType(link.icon_type || "none");
        setEditIconValue(link.icon_value || "");
        setEditSize(link.size || "regular");
        setShowEditIconPicker(false);
        setEditBgImageFile(null);
        setEditBgImageRemoved(false);
        if (link.bg_image) {
            setEditBgImagePreview(pb.files.getUrl(link as unknown as Record<string, unknown>, link.bg_image));
        } else {
            setEditBgImagePreview(null);
        }
        setIsEditing(true);
    };

    const cancelEditing = () => {
        // If it's a completely new, unsaved link and user cancels, maybe we should delete it? 
        // That logic was handled in parent before. We'll just reset state and exit edit mode.
        setEditTitle(link.title || "");
        setEditUrl(link.destination_url || "");
        setIsEditing(false);
    };

    const handleSaveEdit = () => {
        if (!editTitle.trim()) return toast.error("Title is required");

        const urlValidation = urlSchema.safeParse(editUrl);
        if (!urlValidation.success) {
            toast.error(urlValidation.error.errors[0].message);
            return;
        }
        const validatedUrl = urlValidation.data;

        const updatedLink: LinkItem = {
            ...link,
            title: editTitle,
            destination_url: validatedUrl,
            icon_type: editIconType,
            icon_value: editIconValue,
            size: editSize,
            bg_image: editBgImageRemoved ? undefined : link.bg_image,
        };

        onUpdate(link.id, updatedLink, editBgImageFile, editBgImageRemoved);
        setIsEditing(false);
    };

    return (
        <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            style={{
                ...provided.draggableProps.style,
            }}
            className={`group bg-surface border border-border rounded-xl p-3 flex gap-3 transition-colors ${snapshot.isDragging ? 'shadow-xl border-accent/50 z-50 ring-2 ring-accent shadow-accent/20' : 'hover:border-accent/30'}`}
        >
            <div {...provided.dragHandleProps} className="text-muted-foreground hover:text-white cursor-grab active:cursor-grabbing self-center p-1">
                <GripVertical className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0 flex items-center gap-3">
                <div className="relative">
                    {isEditing ? (
                        <button
                            id={`edit-link-icon-btn-${link.id}`}
                            onClick={() => setShowEditIconPicker(!showEditIconPicker)}
                            className="w-10 h-10 bg-background border border-accent/50 rounded-xl flex items-center justify-center shrink-0 overflow-hidden hover:bg-surface-hover transition-colors group/edit-icon"
                        >
                            <IconRenderer type={editIconType} value={editIconValue} className="w-7 h-7 text-accent group-hover/edit-icon:scale-110 transition-transform" />
                        </button>
                    ) : (
                        <div className="w-10 h-10 bg-background border border-border rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                            <IconRenderer type={link.icon_type} value={link.icon_value} url={link.destination_url} className="w-7 h-7 text-accent" />
                        </div>
                    )}

                    {isEditing && showEditIconPicker && (
                        <IconPicker
                            currentType={editIconType}
                            currentValue={editIconValue}
                            anchorRef={{ current: document.getElementById(`edit-link-icon-btn-${link.id}`) } as React.RefObject<HTMLElement>}
                            onChange={(type, value) => {
                                setEditIconType(type);
                                setEditIconValue(value);
                            }}
                            onClose={() => setShowEditIconPicker(false)}
                        />
                    )}
                </div>

                {isEditing ? (
                    <div className="space-y-3 flex-1">
                        <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" className="w-full px-2 py-1 rounded bg-background border border-accent/50 text-sm focus:outline-none text-white" />
                        <input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="URL" className="w-full px-2 py-1 rounded bg-background border border-accent/50 text-sm focus:outline-none text-white" />

                        <div className="flex gap-2">
                            <button
                                onClick={() => setEditSize("regular")}
                                className={`flex-1 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${editSize === "regular" ? "bg-accent/10 border-accent/50 text-accent" : "bg-background border-border text-muted-foreground"}`}
                            >
                                Regular
                            </button>
                            <button
                                onClick={() => setEditSize("large")}
                                className={`flex-1 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${editSize === "large" ? "bg-accent/10 border-accent/50 text-accent" : "bg-background border-border text-muted-foreground"}`}
                            >
                                Large
                            </button>
                        </div>

                        {/* Custom Background upload for Large size */}
                        {editSize === "large" && (
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Custom Background</label>
                                {editBgImagePreview && !editBgImageRemoved ? (
                                    <div className="relative w-full h-16 rounded-lg overflow-hidden border border-border">
                                        <img src={editBgImagePreview} alt="BG Preview" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => { setEditBgImageRemoved(true); setEditBgImageFile(null); setEditBgImagePreview(null); }}
                                            className="absolute top-1 right-1 w-5 h-5 bg-red-500/80 hover:bg-red-500 rounded flex items-center justify-center transition-colors"
                                        >
                                            <Trash2 className="w-3 h-3 text-white" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border hover:border-accent/50 cursor-pointer transition-colors">
                                        <Upload className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-[10px] text-muted-foreground">Upload image</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    if (file.size > 5 * 1024 * 1024) {
                                                        toast.error("Background image must be less than 5MB");
                                                        return;
                                                    }
                                                    setEditBgImageFile(file);
                                                    setEditBgImageRemoved(false);
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => setEditBgImagePreview(reader.result as string);
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                        />
                                    </label>
                                )}
                            </div>
                        )}

                        <div className="flex gap-2 justify-end pt-1">
                            <button onClick={cancelEditing} className="text-xs text-muted-foreground hover:text-white">Cancel</button>
                            <button onClick={handleSaveEdit} className="text-xs text-accent hover:text-accent/80 flex items-center gap-1">
                                {editLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-white truncate">{link.title || "Untitled"}</p>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={startEditing} className="p-1.5 rounded hover:bg-white/10 text-muted-foreground hover:text-white">
                                    <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => onDelete(link.id)} className="p-1.5 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                        <div className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            {link.destination_url}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});
