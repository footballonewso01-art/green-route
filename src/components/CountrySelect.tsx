import { useState, useRef, useEffect } from "react";
import { COUNTRIES, getCountryByCode, type Country } from "@/lib/countries";
import { ChevronDown, Search, X } from "lucide-react";

interface CountrySelectProps {
    value: string;
    onChange: (code: string) => void;
    excludeCodes?: string[];
    placeholder?: string;
}

export function CountrySelect({ value, onChange, excludeCodes = [], placeholder = "Select country" }: CountrySelectProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    const selected = value ? getCountryByCode(value) : null;

    const filtered = COUNTRIES.filter((c) => {
        if (excludeCodes.includes(c.code)) return false;
        if (!search) return true;
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
    });

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
                setSearch("");
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // Focus search on open
    useEffect(() => {
        if (open && searchRef.current) {
            searchRef.current.focus();
        }
    }, [open]);

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border text-xs hover:border-accent/30 transition-colors min-w-[140px] ${!selected ? "text-muted-foreground" : "text-foreground"}`}
            >
                {selected ? (
                    <>
                        <span className="text-base leading-none">{selected.flag}</span>
                        <span className="truncate">{selected.name}</span>
                        <span className="text-muted-foreground ml-auto">{selected.code}</span>
                    </>
                ) : (
                    <span>{placeholder}</span>
                )}
                <ChevronDown className={`w-3 h-3 ml-auto shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="absolute z-50 top-full mt-1 left-0 w-72 max-h-64 rounded-xl bg-surface border border-border shadow-2xl overflow-hidden animate-fade-in">
                    {/* Search */}
                    <div className="p-2 border-b border-border">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <input
                                ref={searchRef}
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search country..."
                                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 transition-colors"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Country List */}
                    <div className="overflow-y-auto max-h-48 overscroll-contain">
                        {filtered.length === 0 ? (
                            <div className="p-4 text-center text-xs text-muted-foreground">No countries found</div>
                        ) : (
                            filtered.map((c) => (
                                <button
                                    key={c.code}
                                    type="button"
                                    onClick={() => {
                                        onChange(c.code);
                                        setOpen(false);
                                        setSearch("");
                                    }}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-accent/10 transition-colors text-left ${value === c.code ? "bg-accent/10 text-accent" : "text-foreground"}`}
                                >
                                    <span className="text-base leading-none">{c.flag}</span>
                                    <span className="flex-1 truncate">{c.name}</span>
                                    <span className="text-muted-foreground font-mono text-[10px]">{c.code}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
