import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DOMAIN = 'https://linktery.com';

const getSeoPagesConfig = () => {
  const configPath = path.join(process.cwd(), 'src/lib/seo-config.ts');
  if (!fs.existsSync(configPath)) {
    console.error(`⚠️ SEO Config file not found at: ${configPath}`);
    return [];
  }

  const text = fs.readFileSync(configPath, 'utf8');
  
  // Match configuration blocks like: key: { ... }
  const blockRegex = /(\w+)\s*:\s*\{([^}]+)\}/g;
  const configs = [];
  let match;

  while ((match = blockRegex.exec(text)) !== null) {
    const key = match[1];
    const content = match[2];

    const titleMatch = content.match(/title\s*:\s*["']([^"']+)["']/);
    const descMatch = content.match(/description\s*:\s*["']([^"']+)["']/);
    const canonicalMatch = content.match(/canonical\s*:\s*["']([^"']+)["']/);
    const noIndex = content.includes('noIndex: true');

    if (canonicalMatch) {
      configs.push({
        key,
        route: canonicalMatch[1], // e.g. "/pricing" or "/" or "/alternatives/linktree"
        title: titleMatch ? titleMatch[1] : '',
        description: descMatch ? descMatch[1] : '',
        noIndex,
      });
    }
  }

  return configs;
};

const runPrerender = async () => {
  const serverBundlePath = path.join(process.cwd(), 'dist-server', 'entry-server.js');
  if (!fs.existsSync(serverBundlePath)) {
    console.error(`❌ Server bundle not found at: ${serverBundlePath}`);
    console.error('Please run the server build first: npm run build:server');
    process.exit(1);
  }

  // Dynamically import the render function from the compiled server bundle
  const serverModuleUrl = pathToFileURL(serverBundlePath).href;
  const { render } = await import(serverModuleUrl);

  // Read indexable config
  const configs = getSeoPagesConfig();
  if (configs.length === 0) {
    console.error('❌ No routes configured for SEO pre-rendering.');
    process.exit(1);
  }

  // Load client template
  const templatePath = path.join(process.cwd(), 'dist', 'index.html');
  if (!fs.existsSync(templatePath)) {
    console.error(`❌ Client template not found at: ${templatePath}`);
    process.exit(1);
  }
  const template = fs.readFileSync(templatePath, 'utf8');

  console.log('🚀 Starting pre-rendering (Static Site Generation)...');

  for (const config of configs) {
    // We only prerender indexable paths (skip noIndex routes like /login, /register)
    if (config.noIndex) {
      console.log(`⏭️ Skipping noIndex route: ${config.route}`);
      continue;
    }

    const route = config.route;
    console.log(`📦 Prerendering route: ${route}`);

    try {
      // 1. Render components to HTML string
      const appHtml = render(route);

      // 2. Inject React HTML into the root div
      let pageHtml = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);

      // 3. Inject SEO metadata in head
      const mainDomain = DOMAIN;
      const canonicalUrl = route === '/' ? mainDomain : `${mainDomain}${route}`;

      // Update Title
      if (config.title) {
        pageHtml = pageHtml.replace(/<title>.*?<\/title>/, `<title>${config.title}</title>`);
        pageHtml = pageHtml.replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/, `<meta property="og:title" content="${config.title}" />`);
        pageHtml = pageHtml.replace(/<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/, `<meta name="twitter:title" content="${config.title}" />`);
      }

      // Update Description
      if (config.description) {
        pageHtml = pageHtml.replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/, `<meta name="description" content="${config.description}" />`);
        pageHtml = pageHtml.replace(/<meta\s+property="og:description"\s+content=".*?"\s*\/?>/, `<meta property="og:description" content="${config.description}" />`);
        pageHtml = pageHtml.replace(/<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/, `<meta name="twitter:description" content="${config.description}" />`);
      }

      // Add Canonical link tag
      const canonicalTag = `<link rel="canonical" href="${canonicalUrl}" />`;
      // Insert right before </head>
      pageHtml = pageHtml.replace('</head>', `  ${canonicalTag}\n  <meta property="og:url" content="${canonicalUrl}" />\n</head>`);

      // Add Robots tag
      const robotsTag = `<meta name="robots" content="index, follow" />`;
      pageHtml = pageHtml.replace('</head>', `  ${robotsTag}\n</head>`);

      // 4. Determine output file path
      let outDir = path.join(process.cwd(), 'dist');
      let outFile = 'index.html';

      if (route !== '/' && route !== '') {
        // Create matching subdirectories (e.g. dist/pricing/index.html)
        outDir = path.join(outDir, route.replace(/^\//, ''));
        fs.mkdirSync(outDir, { recursive: true });
      }

      const outFilePath = path.join(outDir, outFile);
      fs.writeFileSync(outFilePath, pageHtml, 'utf8');
      console.log(`✅ Generated: ${outFilePath}`);
    } catch (err) {
      console.error(`❌ Failed to prerender ${route}:`, err);
    }
  }

  // Cleanup dist-server directory
  const serverDir = path.join(process.cwd(), 'dist-server');
  if (fs.existsSync(serverDir)) {
    fs.rmSync(serverDir, { recursive: true, force: true });
    console.log('🧹 Cleaned up temporary dist-server directory.');
  }

  console.log('🎉 Pre-rendering completed successfully!');
};

try {
  await runPrerender();
} catch (error) {
  console.error('❌ Pre-rendering execution failed:', error);
  process.exit(1);
}
