const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const source = process.argv[2];

if (!source) {
  throw new Error("Pass the generated editorial render as the first argument.");
}

const outputDirectory = path.join(root, "design", "marketing");
const finalOutput = path.join(
  outputDirectory,
  "linktery-rebrand-telegram-editorial.png",
);
const cleanOutput = path.join(
  outputDirectory,
  "linktery-rebrand-telegram-editorial-clean.png",
);
const wordmarkPath = path.join(
  root,
  "src",
  "assets",
  "linktery-wordmark-dark.png",
);

const size = 1080;

const copy = Buffer.from(`
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <text x="74" y="78" fill="#12C77A" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" letter-spacing="3.5">MEET THE NEW</text>
    <rect x="74" y="276" width="42" height="4" rx="2" fill="#12C77A"/>
    <text x="74" y="326" fill="#071A11" font-family="Arial, Helvetica, sans-serif" font-size="27" font-weight="700" letter-spacing="-0.8">A NEW ERA FOR EVERY LINK.</text>
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
    .resize({ width: 430 })
    .png()
    .toBuffer();

  await sharp(cleanRender)
    .composite([
      { input: copy, left: 0, top: 0 },
      { input: wordmark, left: 74, top: 104 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(finalOutput);

  console.log(finalOutput);
}

compose().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
