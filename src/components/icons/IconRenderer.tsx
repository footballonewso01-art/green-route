// src/components/icons/IconRenderer.tsx
import { Globe } from 'lucide-react';
import { getPresetIcon } from './presets';

interface IconRendererProps {
    type: string | string[] | undefined | null;
    value: string | undefined;
    url?: string;
    className?: string;
    fallback?: boolean;
}

function normalizeType(type: string | string[] | undefined | null): string {
    if (!type) return "none";
    if (Array.isArray(type)) return type[0] || "none";
    return type;
}

function getDomain(url?: string): string | null {
    if (!url) return null;
    try {
        return new URL(url).hostname;
    } catch {
        return null;
    }
}

export function IconRenderer({ type, value, url, className = "w-5 h-5", fallback = true }: IconRendererProps) {
    const normalizedType = normalizeType(type);

    if (normalizedType === "preset" && value) {
        const preset = getPresetIcon(value);
        if (!preset) return <Fallback url={url} className={className} fallback={fallback} />;

        // Inject width/height into SVG for mobile compatibility
        const svgWithDimensions = preset.svg.replace(
            '<svg ',
            '<svg width="100%" height="100%" '
        );

        return (
            <div
                className={`flex items-center justify-center ${className}`}
                style={{ minWidth: 0, minHeight: 0 }}
                dangerouslySetInnerHTML={{ __html: svgWithDimensions }}
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
                className={`object-cover rounded-[2px] ${className.includes('w-') ? className : `w-full h-full ${className}`}`}
            />
        );
    }

    return <Fallback url={url} className={className} fallback={fallback} />;
}

function Fallback({ className, fallback }: { url?: string, className: string, fallback: boolean }) {
    if (!fallback) return null;

    // Always use the consistent Lucide vector globe as requested.
    // (Removed Google Favicon API to avoid random low-poly planets)
    return <Globe className={className} />;
}

