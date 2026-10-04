const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const rootDir = path.resolve(__dirname, '..');
const brandDir = path.join(rootDir, 'assets', 'brand');
const tempDir = path.join(rootDir, 'temp-render');

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

function renderHtmlToPng(htmlContent, outputPath, width = 1024, height = 1024) {
  const tempHtmlPath = path.join(tempDir, `temp-${Date.now()}-${Math.random().toString(36).substring(7)}.html`);
  fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');

  execFileSync(edgePath, [
    '--headless=new',
    `--screenshot=${outputPath}`,
    `--window-size=${width},${height}`,
    '--default-background-color=00000000',
    `file:///${tempHtmlPath.replace(/\\/g, '/')}`,
  ]);

  try {
    fs.unlinkSync(tempHtmlPath);
  } catch {}
  console.log(`Rendered: ${path.relative(rootDir, outputPath)}`);
}

// 1. icon-1024.png (full icon from icon.svg with transparent canvas)
const fullIconSvg = fs.readFileSync(path.join(rootDir, 'icon.svg'), 'utf8');
const iconHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1024px; height: 1024px; overflow: hidden; background: transparent; }
  svg { width: 1024px; height: 1024px; display: block; }
</style>
</head>
<body>
${fullIconSvg}
</body>
</html>`;

// 2. adaptive-icon-foreground.png (mark only, centered in safe zone)
// In 512x512, the mark is centered at (256, 268). Let's scale and center it perfectly at (256, 256).
const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <!-- Centered mark: translated by (0, -12) to align ring center (256, 268) to (256, 256) -->
  <g transform="translate(0, -12)">
    <!-- Main Open Ring -->
    <path 
      d="M 256 164 A 104 104 0 1 0 357 242" 
      fill="none" 
      stroke="#b0b3ba" 
      stroke-width="44" 
      stroke-linecap="butt" 
    />
    <!-- Floating Dot -->
    <circle 
      cx="302" 
      cy="204" 
      r="22" 
      fill="#b0b3ba" 
    />
  </g>
</svg>`;

const fgHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1024px; height: 1024px; overflow: hidden; background: transparent; }
  svg { width: 1024px; height: 1024px; display: block; }
</style>
</head>
<body>
${markSvg}
</body>
</html>`;

// 3. adaptive-icon-background.png (solid brand tile color #1a1c1e)
const bgHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1024px; height: 1024px; overflow: hidden; background: #1a1c1e; }
</style>
</head>
<body>
</body>
</html>`;

// 4. splash-icon.png (high-res mark for splash screen on #131316 background)
const splashHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 512px; height: 512px; overflow: hidden; background: transparent; }
  svg { width: 512px; height: 512px; display: block; }
</style>
</head>
<body>
${markSvg}
</body>
</html>`;

console.log('Generating brand assets...');
renderHtmlToPng(iconHtml, path.join(brandDir, 'icon-1024.png'), 1024, 1024);
renderHtmlToPng(fgHtml, path.join(brandDir, 'adaptive-icon-foreground.png'), 1024, 1024);
renderHtmlToPng(bgHtml, path.join(brandDir, 'adaptive-icon-background.png'), 1024, 1024);
renderHtmlToPng(splashHtml, path.join(brandDir, 'splash-icon.png'), 512, 512);

// Clean up temp dir
try {
  fs.rmdirSync(tempDir);
} catch {}

console.log('All brand assets successfully generated!');
