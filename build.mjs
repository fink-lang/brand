import { writeFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";

mkdirSync("./build", { recursive: true });

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
  const match = output.match(/next release version is (\d+\.\d+\.\d+)/i);
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
// 2. Render SVGs to PNGs via Docker
// ---------------------------------------------------------------------------

execSync(
  [
    "docker run --rm",
    "-v ./assets:/work/assets:ro",
    "-v ./build:/work/build",
    "fink-brand-render",
  ].join(" "),
  { stdio: "inherit" }
);

// ---------------------------------------------------------------------------
// 3. Package tarball
// ---------------------------------------------------------------------------

execSync("tar -czf build/brand-assets.tar.gz -C build version.md assets");
console.log(`\nDone. brand-assets.tar.gz (v${version})`);
