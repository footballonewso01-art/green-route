import { useState, useRef, useCallback, useEffect } from 'react';
import { Check, X, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageCropperProps {
    imageSrc: string;
    onCrop: (croppedDataUrl: string) => void;
    onCancel: () => void;
}

export function ImageCropper({ imageSrc, onCrop, onCancel }: ImageCropperProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);

    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const CROP_WIDTH = 220;
    const CROP_HEIGHT = 198; // 220 * 0.9 (10% reduction from height)
    const CANVAS_SIZE = 240;

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const img = imgRef.current;
        if (!canvas || !img) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // Dark bg
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // Calculate image dimensions to fit
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const cropAspect = CROP_WIDTH / CROP_HEIGHT;
        let drawW: number, drawH: number;

        if (imgAspect > cropAspect) {
            drawH = CROP_HEIGHT * scale;
            drawW = drawH * imgAspect;
        } else {
            drawW = CROP_WIDTH * scale;
            drawH = drawW / imgAspect;
        }

        const cropOffsetX = (CANVAS_SIZE - CROP_WIDTH) / 2;
        const cropOffsetY = (CANVAS_SIZE - CROP_HEIGHT) / 2;
        const drawX = cropOffsetX + (CROP_WIDTH - drawW) / 2 + offset.x;
        const drawY = cropOffsetY + (CROP_HEIGHT - drawH) / 2 + offset.y;

        // Draw image
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(cropOffsetX, cropOffsetY, CROP_WIDTH, CROP_HEIGHT, 16);
        ctx.clip();
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.restore();

        // Draw crop border
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(cropOffsetX, cropOffsetY, CROP_WIDTH, CROP_HEIGHT, 16);
        ctx.stroke();
    }, [scale, offset]);

    useEffect(() => {
        const img = new Image();
        img.onload = () => {
            imgRef.current = img;
            draw();
        };
        img.src = imageSrc;
    }, [imageSrc, draw]);

    useEffect(() => {
        draw();
    }, [draw]);

    const handleMouseDown = (e: React.MouseEvent) => {
        setDragging(true);
        setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragging) return;
        setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    };

    const handleMouseUp = () => setDragging(false);

    const handleTouchStart = (e: React.TouchEvent) => {
        const t = e.touches[0];
        setDragging(true);
        setDragStart({ x: t.clientX - offset.x, y: t.clientY - offset.y });
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!dragging) return;
        const t = e.touches[0];
        setOffset({ x: t.clientX - dragStart.x, y: t.clientY - dragStart.y });
    };

    const handleCrop = () => {
        const img = imgRef.current;
        if (!img) return;

        const outCanvas = document.createElement('canvas');
        outCanvas.width = 600;
        outCanvas.height = 540;
        const ctx = outCanvas.getContext('2d');
        if (!ctx) return;

        const imgAspect = img.naturalWidth / img.naturalHeight;
        const cropAspect = CROP_WIDTH / CROP_HEIGHT;
        let drawW: number, drawH: number;

        if (imgAspect > cropAspect) {
            drawH = CROP_HEIGHT * scale;
            drawW = drawH * imgAspect;
        } else {
            drawW = CROP_WIDTH * scale;
            drawH = drawW / imgAspect;
        }

        const cropOffsetX = (CANVAS_SIZE - CROP_WIDTH) / 2;
        const cropOffsetY = (CANVAS_SIZE - CROP_HEIGHT) / 2;
        const drawX = cropOffsetX + (CROP_WIDTH - drawW) / 2 + offset.x;
        const drawY = cropOffsetY + (CROP_HEIGHT - drawH) / 2 + offset.y;

        // Calculate source rectangle area from the natural image
        const srcX = -((drawX - cropOffsetX) / drawW) * img.naturalWidth;
        const srcY = -((drawY - cropOffsetY) / drawH) * img.naturalHeight;
        const srcW = (CROP_WIDTH / drawW) * img.naturalWidth;
        const srcH = (CROP_HEIGHT / drawH) * img.naturalHeight;

        ctx.clearRect(0, 0, 600, 540);
        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, 600, 540);

        onCrop(outCanvas.toDataURL('image/png'));
    };

    return (
        <div className="flex flex-col items-center space-y-3">
            <p className="text-xs text-muted-foreground">Drag to reposition, zoom to adjust</p>
            <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className="rounded-2xl cursor-grab active:cursor-grabbing touch-none"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={() => setDragging(false)}
            />

            {/* Zoom controls */}
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => setScale(Math.max(0.5, scale - 0.15))}
                    className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
                >
                    <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <div className="w-20 h-1 bg-border rounded-full relative">
                    <div className="absolute left-0 top-0 h-full bg-accent rounded-full" style={{ width: `${((scale - 0.5) / 2) * 100}%` }} />
                </div>
                <button
                    type="button"
                    onClick={() => setScale(Math.min(2.5, scale + 0.15))}
                    className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
                >
                    <ZoomIn className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-1.5 rounded-lg bg-background border border-border text-xs text-muted-foreground hover:text-white transition-colors flex items-center gap-1.5"
                >
                    <X className="w-3 h-3" /> Cancel
                </button>
                <button
                    type="button"
                    onClick={handleCrop}
                    className="px-4 py-1.5 rounded-lg bg-accent/10 border border-accent/30 text-xs text-accent hover:bg-accent/20 transition-colors flex items-center gap-1.5"
                >
                    <Check className="w-3 h-3" /> Apply
                </button>
            </div>
        </div>
    );
}
