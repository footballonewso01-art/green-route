import { useMemo, useState } from "react";
import { Download, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import SeoResourceLayout from "@/components/SeoResourceLayout";
import { getSeoContentPage } from "@/lib/seoContent";

const page = getSeoContentPage("/tools/qr-code-generator");

export default function QrCodeGenerator() {
  const [url, setUrl] = useState("https://linktery.com");
  const [foreground, setForeground] = useState("#07110d");
  const [background, setBackground] = useState("#ffffff");

  const validation = useMemo(() => {
    try {
      const parsed = new URL(url);
      if (!/^https?:$/.test(parsed.protocol)) throw new Error("unsupported protocol");
      return { value: parsed.toString(), error: "" };
    } catch {
      return { value: "", error: "Enter a complete http:// or https:// URL." };
    }
  }, [url]);

  if (!page) return null;

  const downloadSvg = () => {
    if (!validation.value || typeof document === "undefined") return;
    const svg = document.getElementById("linktery-free-qr");
    if (!svg) return;
    const serialized = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = "linktery-qr-code.svg";
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  };

  return (
    <SeoResourceLayout page={page}>
      <section className="border-b border-border/60 px-5 py-14 sm:px-6 sm:py-18">
        <div className="mx-auto grid max-w-5xl items-start gap-8 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-3xl border border-border bg-card/60 p-5 sm:p-8">
            <div className="flex items-center gap-3"><QrCode className="h-6 w-6 text-accent" /><h2 className="text-2xl font-extrabold">QR code settings</h2></div>
            <label className="mt-7 block" htmlFor="qr-url">
              <span className="mb-2 block text-sm font-bold">URL to encode</span>
              <input id="qr-url" type="url" value={url} onChange={(event) => setUrl(event.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-accent" />
            </label>
            {validation.error && <p className="mt-2 text-sm text-destructive">{validation.error}</p>}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="rounded-xl border border-border bg-background p-4" htmlFor="qr-foreground">
                <span className="mb-3 block text-sm font-bold">Foreground</span>
                <div className="flex items-center gap-3"><input id="qr-foreground" type="color" value={foreground} onChange={(event) => setForeground(event.target.value)} className="h-10 w-12 cursor-pointer rounded border-0 bg-transparent" /><span className="font-mono text-xs text-muted-foreground">{foreground}</span></div>
              </label>
              <label className="rounded-xl border border-border bg-background p-4" htmlFor="qr-background">
                <span className="mb-3 block text-sm font-bold">Background</span>
                <div className="flex items-center gap-3"><input id="qr-background" type="color" value={background} onChange={(event) => setBackground(event.target.value)} className="h-10 w-12 cursor-pointer rounded border-0 bg-transparent" /><span className="font-mono text-xs text-muted-foreground">{background}</span></div>
              </label>
            </div>
            <p className="mt-5 text-xs leading-5 text-muted-foreground">For reliable scanning, keep strong contrast between the foreground and background and preserve the outer margin.</p>
          </div>

          <div className="rounded-3xl border border-accent/25 bg-accent/[0.04] p-5 text-center sm:p-8">
            <h2 className="text-xl font-extrabold">Live preview</h2>
            <div className="mx-auto mt-6 flex aspect-square max-w-[300px] items-center justify-center rounded-2xl border border-border p-5" style={{ backgroundColor: background }}>
              {validation.value ? <QRCodeSVG id="linktery-free-qr" value={validation.value} size={256} fgColor={foreground} bgColor={background} level="M" marginSize={2} title="QR code preview" /> : <QrCode className="h-20 w-20 text-muted-foreground/40" />}
            </div>
            <button type="button" onClick={downloadSvg} disabled={!validation.value} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 font-bold text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50">
              <Download className="h-4 w-4" /> Download SVG
            </button>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">No account is required. Scan the downloaded file on representative phones before printing it.</p>
          </div>
        </div>
      </section>
    </SeoResourceLayout>
  );
}
