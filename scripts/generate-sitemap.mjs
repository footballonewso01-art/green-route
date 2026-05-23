import fs from 'fs';
import path from 'path';

/**
 * SEO Sitemap Generator for Linktery (Vite/React)
 * 
 * This script dynamically extracts indexable pages from src/lib/seo-config.ts
 * and generates a production-ready sitemap.xml.
 */

const DOMAIN = 'https://linktery.com';

const getRoutesFromConfig = () => {
  const configPath = path.join(process.cwd(), 'src/lib/seo-config.ts');
  if (!fs.existsSync(configPath)) {
    console.error(`⚠️ SEO Config file not found at: ${configPath}`);
    return [];
  }

  const text = fs.readFileSync(configPath, 'utf8');
  
  // Match configuration blocks like: pageKey: { ... }
  const blockRegex = /(\w+)\s*:\s*\{([^}]+)\}/g;
  const routes = [];
  let match;

  while ((match = blockRegex.exec(text)) !== null) {
    const key = match[1];
    const content = match[2];

    // Exclude noIndex configurations (e.g. login, register)
    if (content.includes('noIndex: true')) {
      continue;
    }

    // Extract the canonical property value
    const canonicalMatch = content.match(/canonical\s*:\s*["']([^"']+)["']/);
    if (canonicalMatch) {
      let route = canonicalMatch[1];
      // Normalize leading slash (e.g. "/pricing" -> "pricing", "/" -> "")
      if (route.startsWith('/')) {
        route = route.slice(1);
      }
      routes.push(route);
    }
  }

  return routes;
};

const generateSitemap = () => {
  const routes = getRoutesFromConfig();
  if (routes.length === 0) {
    console.error('❌ No indexable routes found in seo-config.ts');
    process.exit(1);
  }

  const today = new Date().toISOString().split('T')[0];
  
  const urlEntries = routes.map(route => {
    const url = route === '' ? DOMAIN : `${DOMAIN}/${route}`;
    
    // Assign priorities: Homepage (1.0) > Main Pages (0.8) > Nested/SEO Pages (0.6)
    let priority = '0.8';
    if (route === '') priority = '1.0';
    if (route.includes('/')) priority = '0.6';

    const changefreq = route === '' ? 'daily' : 'weekly';
    
    return `  <url>
    <loc>${url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }).join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

  const outputPath = path.join(process.cwd(), 'public', 'sitemap.xml');
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, sitemap.trim());
  
  console.log(`✅ Sitemap successfully generated at: ${outputPath}`);

  // Write to dist/sitemap.xml as well if dist folder exists (prevents build race condition)
  const distPath = path.join(process.cwd(), 'dist', 'sitemap.xml');
  const distDir = path.dirname(distPath);
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(distPath, sitemap.trim());
    console.log(`✅ Sitemap successfully copied to: ${distPath}`);
  }
  
  console.log(`📊 Total URLs: ${routes.length}`);
};

try {
  generateSitemap();
} catch (error) {
  console.error('❌ Failed to generate sitemap:', error);
  process.exit(1);
}

