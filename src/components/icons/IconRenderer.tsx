// src/components/icons/IconRenderer.tsx
import { Globe } from 'lucide-react';
import { getPresetIcon } from './presets';

interface IconRendererProps {
    type: string | string[] | undefined | null;
    value: string | undefined;
    url?: string; // New: destination URL for favicon fetch
    className?: string;
    fallback?: boolean; // If true, renders a Globe (or favicon) when no icon is set
}

/**
 * Normalizes PocketBase select field values.
 * PocketBase `select` fields can return values as arrays (e.g., ["preset"]).
 */
function normalizeType(type: string | string[] | undefined | null): string {
    if (!type) return "none";
    if (Array.isArray(type)) return type[0] || "none";
    return type;
}

/**
 * Extracts domain for favicon API.
 */
function getDomain(url?: string): string | null {
    if (!url) return null;
    try {
        const domain = new URL(url).hostname;
        return domain;
    } catch {
        return null;
    }
}

export function IconRenderer({ type, value, url, className = "w-5 h-5", fallback = true }: IconRendererProps) {
    const normalizedType = normalizeType(type);

    if (normalizedType === "preset" && value) {
        const preset = getPresetIcon(value);
        if (!preset) return <Fallback url={url} className={className} fallback={fallback} />;

        return (
            <div
                className={`flex items-center justify-center ${className} fill-current text-current`}
                dangerouslySetInnerHTML={{ __html: preset.svg }}
            />
        );
    }

    if (normalizedType === "emoji" && value) {
        return (
            <div className={`flex items-center justify-center ${className} text-xl leading-none`}>
                {value}
            </div>
        );
    }

    if (normalizedType === "custom" && value) {
        return (
            <img
                src={value}
                alt="Custom icon"
                className={`object-cover rounded-md ${className}`}
            />
        );
    }

    // No icon set → render fallback favicon or Globe
    return <Fallback url={url} className={className} fallback={fallback} />;
}

function Fallback({ url, className, fallback }: { url?: string, className: string, fallback: boolean }) {
    const domain = getDomain(url);
    if (domain) {
        return (
            <img
                src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
                alt="Favicon"
                className={`object-contain rounded-sm ${className}`}
                onError={(e) => {
                    // Fallback to Globe if favicon fails
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSIsIHdpZHRoLCAgaGVpZ2h0LCAgbWFyZ2luLCAgYm9yZGVyLCAgcGFkZGluZyIsICBzdHlsZT0iLCAiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIj48L2NpcmNsZT48bGluZSB4MT0iMiIgeTE9IjEyIiB4Mj0iMjIiIHkyPSIxMiI+PC9saW5lPjxwYXRoIGQ9Ik0xMiAyYWMtMi43NiAzLTEuNzYgOC0xLjc2IDEwcy0xIDcgMS43NiAxMGMyLjc2LTMgMS43Ni04IDEuNzYtMTBzMS03LTEuNzYtMTAiPjwvcGF0aD48L3N2Zz4=';
                }}
            />
        );
    }
    return fallback ? <Globe className={className} /> : null;
}

