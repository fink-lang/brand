import { chromium } from "playwright";
import { readFileSync, writeFileSync, cpSync, mkdirSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";

const assetsDir = "./build/assets";
mkdirSync(assetsDir, { recursive: true });

// ---------------------------------------------------------------------------
// 1. Determine version via semantic-release dry-run
// ---------------------------------------------------------------------------

let version = "unreleased";
try {
  const branch = execSync("git branch --show-current", {
    encoding: "utf-8",
  }).trim();
  const output = execSync(
    `npx semantic-release --dry-run --no-ci --branches ${branch}`,
    {
      encoding: "utf-8",
      env: { ...process.env, GITHUB_ACTIONS: "" },
      stdio: ["pipe", "pipe", "pipe"],
    }
  );
  const match = output.match(/next release version is (\d+\.\d+\.\d+)/);
  if (match) version = match[1];
} catch {
  // no release pending or no git tags yet
}
console.log(`Version: ${version}`);

const date = new Date().toISOString().split("T")[0];
const commit = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();

writeFileSync(
  "./build/version.md",
  `# fink-brand\nversion: ${version}\nreleased: ${date}\ncommit: ${commit}\n`
);

// ---------------------------------------------------------------------------
// 2. Render SVGs to PNGs
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 3. Package tarball
// ---------------------------------------------------------------------------

execSync("tar -czf build/brand-assets.tar.gz -C build version.md assets");
console.log(`\nDone. brand-assets.tar.gz (v${version})`);
