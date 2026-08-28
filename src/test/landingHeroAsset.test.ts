import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

describe("landing Classic Cover image", () => {
  it("ships an optimized portrait with real alpha and matching intrinsic dimensions", async () => {
    const asset = path.join(process.cwd(), "src/assets/mobila-classic-cover.webp");
    const metadata = await sharp(asset).metadata();
    const stats = await sharp(asset).stats();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(941);
    expect(metadata.height).toBe(1672);
    expect(metadata.hasAlpha).toBe(true);
    expect(stats.channels[3].min).toBe(0);
    expect(stats.channels[3].max).toBe(255);
    expect(fs.statSync(asset).size).toBeLessThan(250_000);
  });
});
