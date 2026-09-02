import { useMemo, useState } from "react";
import { Download, Link2, LockKeyhole, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import ToolDetailLayout from "@/components/tools/ToolDetailLayout";
import styles from "@/components/tools/ToolDetails.module.css";
import { getSeoContentPage } from "@/lib/seoContent";
import { PRIMARY_DOMAIN } from "@/lib/siteConfig";

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

  if (!page || page.kind !== "tool") return null;

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
    <ToolDetailLayout page={page}>
      <div className={styles.workbench} data-workbench="qr">
        <section className={styles.inputPanel} aria-labelledby="qr-input-title">
          <div className={styles.panelKicker}><span><Link2 size={16} aria-hidden="true" />Destination + appearance</span><span>SVG output</span></div>
          <h2 id="qr-input-title">Set the URL. Keep the contrast.</h2>
          <p className={styles.panelIntro}>The code updates immediately. Use a managed Linktery URL if you may need to change the destination after printing.</p>
          <div className={styles.formStack}>
            <label className={styles.field} htmlFor="qr-url">
              <span>URL to encode</span>
              <input id="qr-url" type="url" value={url} onChange={(event) => setUrl(event.target.value)} />
            </label>
            {validation.error && <p className={styles.fieldError} role="alert">{validation.error}</p>}
            <div className={styles.colorGrid}>
              <label className={styles.colorField} htmlFor="qr-foreground">
                <span>Foreground</span>
                <input id="qr-foreground" type="color" value={foreground} onChange={(event) => setForeground(event.target.value)} />
                <code>{foreground}</code>
              </label>
              <label className={styles.colorField} htmlFor="qr-background">
                <span>Background</span>
                <input id="qr-background" type="color" value={background} onChange={(event) => setBackground(event.target.value)} />
                <code>{background}</code>
              </label>
            </div>
          </div>
          <p className={styles.privacyNote}><LockKeyhole size={14} aria-hidden="true" />No account is required. Keep a quiet margin around the code and test the downloaded file on representative phones before printing.</p>
        </section>

        <section className={styles.outputPanel} aria-labelledby="qr-output-title">
          <div className={styles.panelKicker}><span><QrCode size={16} aria-hidden="true" />Live output</span><span>{validation.value ? "Scannable SVG" : "Waiting for a valid URL"}</span></div>
          <h2 id="qr-output-title">Ready for screen or print.</h2>
          <p className={styles.panelIntro}>SVG stays sharp at different sizes. The encoded pixels stay static unless they point to a managed URL.</p>
          <div className={styles.qrStage}>
            <div className={styles.qrSheet} style={{ backgroundColor: background }}>
              <span>SCAN TO CONTINUE</span>
              {validation.value ? <QRCodeSVG id="linktery-free-qr" value={validation.value} size={256} fgColor={foreground} bgColor={background} level="M" marginSize={2} title="QR code preview" /> : <div className={styles.qrFallback}><QrCode size={76} strokeWidth={1.3} aria-hidden="true" /></div>}
              <div className={styles.qrCaption}><span>{PRIMARY_DOMAIN}</span><span>SVG / scalable</span></div>
            </div>
          </div>
          <button type="button" onClick={downloadSvg} disabled={!validation.value} className={styles.toolButton}><Download size={16} aria-hidden="true" />Download SVG</button>
        </section>
      </div>
    </ToolDetailLayout>
  );
}
