import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const logoSrc = path.join(rootDir, 'public', 'logo.webp');
const logoDest = path.join(rootDir, 'public', 'logo.webp'); // In-place update

async function optimizeImages() {
  try {
    console.log('Starting image optimization...');
    sharp.cache(false); // Release file locks immediately on Windows

    // Optimize the legacy logo asset still used by a small set of utility pages.
    if (fs.existsSync(logoSrc)) {
      console.log(`Optimizing logo image: ${logoSrc}`);
      
      const infoBefore = fs.statSync(logoSrc);
      console.log(`Original logo size: ${(infoBefore.size / 1024).toFixed(2)} KB`);

      // Read to buffer first to release file lock, then write back
      const buffer = await sharp(logoSrc)
        .resize({ width: 128 }) // 128px width, fits container of 105x105 perfectly
        .webp({ quality: 85 })
        .toBuffer();

      fs.writeFileSync(logoDest, buffer);

      const infoAfter = fs.statSync(logoDest);
      console.log(`Optimized logo size: ${(infoAfter.size / 1024).toFixed(2)} KB`);
      console.log(`Savings: ${((1 - infoAfter.size / infoBefore.size) * 100).toFixed(2)}%`);
    } else {
      console.warn(`Warning: Logo image not found at ${logoSrc}`);
    }

    console.log('Image optimization finished successfully.');
  } catch (error) {
    console.error('Error during image optimization:', error);
    process.exit(1);
  }
}

optimizeImages();
