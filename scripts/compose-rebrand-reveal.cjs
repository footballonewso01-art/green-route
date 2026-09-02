const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const source = process.argv[2];

if (!source) {
  throw new Error("Pass the generated reveal render as the first argument.");
}

const outputDirectory = path.join(root, "design", "marketing");
const finalOutput = path.join(
  outputDirectory,
  "linktery-rebrand-telegram-reveal.png",
);
const cleanOutput = path.join(
  outputDirectory,
  "linktery-rebrand-telegram-reveal-clean.png",
);
const wordmarkPath = path.join(
  root,
  "src",
  "assets",
  "linktery-wordmark-light.png",
);

const size = 1080;

const copy = Buffer.from(`
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <text x="472" y="373" text-anchor="middle" fill="#12C77A" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" letter-spacing="4">INTRODUCING</text>
    <rect x="443" y="627" width="58" height="4" rx="2" fill="#12C77A"/>
    <text x="472" y="676" text-anchor="middle" fill="#F4F7F2" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="700" letter-spacing="-0.6">A NEW IDENTITY FOR EVERY LINK.</text>
  </svg>
`);

async function compose() {
  await fs.mkdir(outputDirectory, { recursive: true });

  const cleanRender = await sharp(source)
    .resize(size, size, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toBuffer();

  await fs.writeFile(cleanOutput, cleanRender);

  const wordmark = await sharp(wordmarkPath)
    .resize({ width: 610 })
    .png()
    .toBuffer();

  await sharp(cleanRender)
    .composite([
      { input: copy, left: 0, top: 0 },
      { input: wordmark, left: 167, top: 405 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(finalOutput);

  console.log(finalOutput);
}

compose().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
