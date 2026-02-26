import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, ImagePlus, Smile, LayoutGrid, X, Check } from 'lucide-react';
import { PRESET_ICONS, PresetIconCategory } from './presets';

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
    const pickerRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ top: 0, left: 0 });

    const filteredPresets = useMemo(() => {
        return PRESET_ICONS.filter(icon => {
            const matchesSearch = icon.name.toLowerCase().includes(search.toLowerCase());
            const matchesCategory = activeCategory === "All" || icon.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [search, activeCategory]);

    // Calculate position from anchor
    useEffect(() => {
        if (anchorRef?.current) {
            const rect = anchorRef.current.getBoundingClientRect();
            setPos({ top: rect.bottom + 8, left: rect.left });
        }
    }, [anchorRef]);

    // Click outside or scroll to close
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        const scrollHandler = () => {
            onClose();
        };

        document.addEventListener("mousedown", handler);
        window.addEventListener("scroll", scrollHandler, true); // Use capture to detect scroll on elements
        return () => {
            document.removeEventListener("mousedown", handler);
            window.removeEventListener("scroll", scrollHandler, true);
        };
    }, [onClose]);

    const content = (
        <div
            ref={pickerRef}
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
            < div className="p-4 h-64 overflow-y-auto custom-scrollbar" >
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
                            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center border border-accent/20">
                                <ImagePlus className="w-6 h-6 text-accent" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-white">Upload Custom Icon</p>
                                <p className="text-xs text-muted-foreground mt-1 px-4">Upload a custom PNG or SVG file to use as this link's icon.</p>
                            </div>
                            {/* Custom upload logic requires PocketBase file relation manipulation, keeping disabled for MVP placeholder */}
                            <button disabled className="px-4 py-2 bg-background border border-border rounded-lg text-sm text-muted-foreground opacity-50 cursor-not-allowed">
                                Coming Soon
                            </button>
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
