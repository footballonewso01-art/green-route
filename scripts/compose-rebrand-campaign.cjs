const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const source = process.argv[2];
const outputStem = process.argv[3] || "linktery-rebrand-telegram";

if (!source) {
  throw new Error("Pass the generated campaign render as the first argument.");
}

const outputDirectory = path.join(root, "design", "marketing");
const finalOutput = path.join(outputDirectory, `${outputStem}.png`);
const cleanRenderOutput = path.join(
  outputDirectory,
  `${outputStem}-clean.png`,
);
const wordmarkPath = path.join(
  root,
  "src",
  "assets",
  "linktery-wordmark-light.png",
);

const width = 1080;
const height = 1080;

const typography = Buffer.from(`
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="topShade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#020604" stop-opacity="0.88"/>
        <stop offset="0.72" stop-color="#020604" stop-opacity="0.22"/>
        <stop offset="1" stop-color="#020604" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="1080" height="380" fill="url(#topShade)"/>
    <text x="82" y="78" fill="#12C77A" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="700" letter-spacing="3.2">MAJOR REBRAND</text>
    <rect x="82" y="278" width="42" height="4" rx="2" fill="#12C77A"/>
    <text x="82" y="326" fill="#F4F7F2" font-family="Arial, Helvetica, sans-serif" font-size="27" font-weight="700" letter-spacing="-0.7">A NEW IDENTITY FOR EVERY LINK.</text>
  </svg>
`);

async function compose() {
  await fs.mkdir(outputDirectory, { recursive: true });

  const cleanRender = await sharp(source)
    .resize(width, height, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toBuffer();

  await fs.writeFile(cleanRenderOutput, cleanRender);

  const wordmark = await sharp(wordmarkPath)
    .resize({ width: 430 })
    .png()
    .toBuffer();

  await sharp(cleanRender)
    .composite([
      { input: typography, left: 0, top: 0 },
      { input: wordmark, left: 82, top: 108 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(finalOutput);

  console.log(finalOutput);
}

compose().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
