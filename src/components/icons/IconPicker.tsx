import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, ImagePlus, Smile, LayoutGrid, X, Check } from 'lucide-react';
import { PRESET_ICONS, PresetIconCategory } from './presets';
import { ImageCropper } from '@/components/ImageCropper';

interface IconPickerProps {
    currentType: string | undefined;
    currentValue: string | undefined;
    onChange: (type: "preset" | "emoji" | "custom" | "none", value: string) => void;
    onClose: () => void;
    anchorRef?: React.RefObject<HTMLElement>;
}

type Tab = "preset" | "emoji" | "custom";

const CATEGORIES: PresetIconCategory[] = ["Social", "Messaging", "Video", "Music", "Other"];

// A curated list of quick emojis for the MVP (avoids heavy libraries)
const QUICK_EMOJIS = [
    "🚀", "🔥", "✨", "💻", "📱", "🎧", "🎮", "📚", "🎨", "🎵",
    "🍔", "☕", "⚽", "🚗", "✈️", "💰", "💎", "🛒", "🛍️", "🎁",
    "❤️", "👀", "👋", "🎉", "🌟", "💡", "🛠️", "📸", "🎤", "🌍"
];

export function IconPicker({ currentType, currentValue, onChange, onClose, anchorRef }: IconPickerProps) {
    const [activeTab, setActiveTab] = useState<Tab>(
        (currentType as Tab) && currentType !== "none" ? (currentType as Tab) : "preset"
    );

    const [search, setSearch] = useState("");
    const [activeCategory, setActiveCategory] = useState<PresetIconCategory | "All">("All");
    const [rawImage, setRawImage] = useState<string | null>(null);
    const pickerRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ top: 0, left: 0 });

    const filteredPresets = useMemo(() => {
        return PRESET_ICONS.filter(icon => {
            const matchesSearch = icon.name.toLowerCase().includes(search.toLowerCase());
            const matchesCategory = activeCategory === "All" || icon.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [search, activeCategory]);

    // Calculate position from anchor, with viewport boundary detection
    useEffect(() => {
        if (anchorRef?.current) {
            const rect = anchorRef.current.getBoundingClientRect();
            const pickerHeight = 420; // approximate max height of picker
            const viewportHeight = window.innerHeight;
            const spaceBelow = viewportHeight - rect.bottom;
            const spaceAbove = rect.top;

            let top: number;
            if (spaceBelow >= pickerHeight || spaceBelow >= spaceAbove) {
                // Position below the anchor
                top = rect.bottom + 8;
                // Clamp to not go below viewport
                if (top + pickerHeight > viewportHeight - 8) {
                    top = viewportHeight - pickerHeight - 8;
                }
            } else {
                // Flip above the anchor
                top = rect.top - pickerHeight - 8;
                if (top < 8) top = 8;
            }

            let left = rect.left;
            // Clamp horizontal to not overflow right edge
            if (left + 320 > window.innerWidth) {
                left = window.innerWidth - 328;
            }

            setPos({ top, left });
        }
    }, [anchorRef]);

    const mouseOverRef = useRef(false);

    // Click outside or scroll to close
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            // Absolute foolproof guard: if the mouse is over the picker, DO NOT CLOSE.
            if (mouseOverRef.current) {
                return;
            }

            // Ignore if clicking on the anchor button
            if (anchorRef?.current?.contains(e.target as Node)) {
                return;
            }
            onClose();
        };

        const scrollHandler = (e: Event) => {
            // 1. Ignore if target is NOT document/window (meaning it's a local scroll)
            if (e.target !== document && e.target !== window) {
                return;
            }

            // 2. Ignore page scrolls IF the mouse is over the picker.
            // This happens when the internal scroll hits the boundary and "leaks" to the body.
            // We want it to be stable during interaction.
            if (mouseOverRef.current) {
                return;
            }

            onClose();
        };

        document.addEventListener("mousedown", handler);
        // Use capture phase for scroll to be safe, but we filter by target below
        window.addEventListener("scroll", scrollHandler, true);

        return () => {
            document.removeEventListener("mousedown", handler);
            window.removeEventListener("scroll", scrollHandler, true);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onClose]);

    const content = (
        <div
            ref={pickerRef}
            onMouseEnter={() => { mouseOverRef.current = true; }}
            onMouseLeave={() => { mouseOverRef.current = false; }}
            className="w-80 bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fade-in ring-1 ring-white/5"
            style={anchorRef ? { position: 'fixed', top: pos.top, left: pos.left, zIndex: 99999 } : { position: 'absolute', top: '3.5rem', left: 0, zIndex: 99999 }}
        >

            {/* Header & Tabs */}
            <div className="p-4 border-b border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">Select Icon</h3>
                    <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex bg-background rounded-lg p-1">
                    <button
                        onClick={() => setActiveTab("preset")}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-1.5 transition-all ${activeTab === "preset" ? 'bg-accent text-accent-foreground shadow-sm' : 'text-muted-foreground hover:text-white'}`}
                    >
                        <LayoutGrid className="w-3.5 h-3.5" /> Icons
                    </button>
                    <button
                        onClick={() => setActiveTab("emoji")}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-1.5 transition-all ${activeTab === "emoji" ? 'bg-accent text-accent-foreground shadow-sm' : 'text-muted-foreground hover:text-white'}`}
                    >
                        <Smile className="w-3.5 h-3.5" /> Emoji
                    </button>
                    <button
                        onClick={() => setActiveTab("custom")}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-1.5 transition-all ${activeTab === "custom" ? 'bg-accent text-accent-foreground shadow-sm' : 'text-muted-foreground hover:text-white'}`}
                    >
                        <ImagePlus className="w-3.5 h-3.5" /> Custom
                    </button>
                </div >
            </div >

            {/* Content Area */}
            <div className={`p-4 overflow-y-auto custom-scrollbar overscroll-contain transition-all duration-300 ${rawImage ? 'h-[340px]' : 'h-64'}`}>
                {activeTab === "preset" && (
                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search brands..."
                                className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 transition-colors"
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setActiveCategory("All")}
                                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${activeCategory === "All" ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-surface border-border text-muted-foreground hover:text-white'}`}
                            >
                                All
                            </button>
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${activeCategory === cat ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-surface border-border text-muted-foreground hover:text-white'}`}
                                >
                                    {cat}
                                </button>
                            ))
                            }
                        </div >

                        <div className="grid grid-cols-5 gap-3 pt-2">
                            {filteredPresets.map(icon => (
                                <button
                                    key={icon.id}
                                    onClick={() => { onChange("preset", icon.id); onClose(); }}
                                    className={`relative w-11 h-11 shrink-0 rounded-xl flex items-center justify-center transition-all group overflow-hidden ${currentType === "preset" && currentValue === icon.id ? 'bg-accent/10 text-accent ring-1 ring-accent' : 'bg-background text-muted-foreground hover:text-white hover:bg-surface-hover'}`}
                                    title={icon.name}
                                >
                                    <div dangerouslySetInnerHTML={{ __html: icon.svg }} className="w-5 h-5 flex-shrink-0 fill-current [&>svg]:w-full [&>svg]:h-full" />
                                </button>
                            ))}
                        </div >
                        {
                            filteredPresets.length === 0 && (
                                <p className="text-center text-xs text-muted-foreground pt-4">No icons found.</p>
                            )
                        }
                    </div >
                )}

                {
                    activeTab === "emoji" && (
                        <div className="grid grid-cols-6 gap-2">
                            {QUICK_EMOJIS.map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => { onChange("emoji", emoji); onClose(); }}
                                    className={`h-10 text-xl rounded-xl flex items-center justify-center transition-all hover:scale-110 ${currentType === "emoji" && currentValue === emoji ? 'bg-accent/20 ring-1 ring-accent' : 'hover:bg-background'}`}
                                >
                                    {emoji}
                                </button>
                            ))
                            }
                        </div >
                    )}

                {
                    activeTab === "custom" && (
                        <div className="flex flex-col items-center justify-center h-full space-y-4 text-center">
                            {rawImage ? (
                                <ImageCropper
                                    imageSrc={rawImage}
                                    onCrop={(croppedDataUrl) => {
                                        onChange("custom", croppedDataUrl);
                                        setRawImage(null);
                                        onClose();
                                    }}
                                    onCancel={() => setRawImage(null)}
                                />
                            ) : (
                                <>
                                    {currentType === "custom" && currentValue ? (
                                        <div className="space-y-3">
                                            <div className="w-20 h-20 rounded-2xl bg-background border border-accent/30 flex items-center justify-center overflow-hidden mx-auto">
                                                <img src={currentValue} alt="Custom icon" className="w-16 h-16 object-cover rounded-xl" />
                                            </div>
                                            <p className="text-xs text-muted-foreground">Current custom icon</p>
                                        </div>
                                    ) : (
                                        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center border border-accent/20">
                                            <ImagePlus className="w-6 h-6 text-accent" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm font-medium text-white">Upload Custom Icon</p>
                                        <p className="text-xs text-muted-foreground mt-1 px-4">PNG, JPG, SVG or WebP. Max 500KB.</p>
                                    </div>
                                    <label className="px-4 py-2 bg-accent/10 border border-accent/30 rounded-lg text-sm text-accent hover:bg-accent/20 transition-colors cursor-pointer">
                                        Choose File
                                        <input
                                            type="file"
                                            accept="image/png,image/jpeg,image/svg+xml,image/webp"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                if (file.size > 500 * 1024) {
                                                    alert("File is too large. Maximum size is 500KB.");
                                                    return;
                                                }
                                                const reader = new FileReader();
                                                reader.onload = (ev) => {
                                                    const dataUrl = ev.target?.result as string;
                                                    if (dataUrl) setRawImage(dataUrl);
                                                };
                                                reader.readAsDataURL(file);
                                            }}
                                        />
                                    </label>
                                </>
                            )}
                        </div>
                    )
                }
            </div >

            {/* Footer Clear */}
            {
                currentType && currentType !== "none" && (
                    <div className="p-3 border-t border-border bg-background/50">
                        <button
                            onClick={() => { onChange("none", ""); onClose(); }}
                            className="w-full py-2 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                            Remove Icon
                        </button>
                    </div>
                )
            }
        </div >
    );

    // Use portal when anchorRef is provided (Social Links section), otherwise render inline
    if (anchorRef) {
        return createPortal(content, document.body);
    }
    return content;
}
