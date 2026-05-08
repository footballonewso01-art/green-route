import fs from 'fs';
import path from 'path';

/**
 * SEO Sitemap Generator for Linktery (Vite/React)
 * 
 * This script generates a production-ready sitemap.xml in the public directory.
 * It includes all public-facing pages and excludes private/auth sections.
 */

const DOMAIN = 'https://linktery.com';

// Indexable static routes currently defined in App.tsx
const staticRoutes = [
  '',           // Homepage
  'pricing',    // Pricing
  'login',      // Login
  'register',   // Register
  'privacy',    // Privacy Policy
  'terms',      // Terms & Conditions
];

// Routes requested by user that are planned or indexable public pages
const additionalRoutes = [
  'features',   // Features page
  'blog',       // Blog index
  'docs',       // Documentation
  // Landing pages & comparison pages
  'alternatives/linktree',
  'alternatives/beacons',
];

const allRoutes = [...staticRoutes, ...additionalRoutes];

const generateSitemap = () => {
  const today = new Date().toISOString().split('T')[0];
  
  const urlEntries = allRoutes.map(route => {
    // Ensure trailing slashes are handled correctly
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
  
  // Ensure the directory exists (though public should exist)
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, sitemap.trim());
  
  console.log(`✅ Sitemap successfully generated at: ${outputPath}`);
  console.log(`📊 Total URLs: ${allRoutes.length}`);
};

// Run generation
try {
  generateSitemap();
} catch (error) {
  console.error('❌ Failed to generate sitemap:', error);
  process.exit(1);
}
