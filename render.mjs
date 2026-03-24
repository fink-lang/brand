// Render SVGs to PNGs using Playwright/Chromium.
// Designed to run inside Docker for consistent, isolated rendering.

import { chromium } from "playwright";
import { readFileSync, cpSync, mkdirSync, readdirSync } from "node:fs";

const assetsDir = "./build/assets";
mkdirSync(assetsDir, { recursive: true });

const svgFiles = readdirSync("assets").filter((f) => f.endsWith(".svg"));
const browser = await chromium.launch();

for (const file of svgFiles) {
  cpSync(`assets/${file}`, `${assetsDir}/${file}`);

  const svg = readFileSync(`assets/${file}`, "utf-8");

  const widthMatch = svg.match(/width="(\d+)"/);
  const heightMatch = svg.match(/height="(\d+)"/);
  const width = widthMatch ? parseInt(widthMatch[1]) : 512;
  const height = heightMatch ? parseInt(heightMatch[1]) : 512;

  const page = await browser.newPage({ viewport: { width, height } });

  const html = `<!DOCTYPE html>
<html><head><style>
  body { margin: 0; background: transparent; }
  img { display: block; width: ${width}px; height: ${height}px; }
</style></head>
<body><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}"></body></html>`;

  await page.setContent(html, { waitUntil: "load" });

  const outName = file.replace(".svg", ".png");
  await page.screenshot({
    path: `${assetsDir}/${outName}`,
    omitBackground: true,
  });

  console.log(`  ${file} → ${outName} (${width}x${height})`);
  await page.close();
}

await browser.close();
console.log(`\nDone. ${svgFiles.length} SVGs + PNGs written to ${assetsDir}/`);
