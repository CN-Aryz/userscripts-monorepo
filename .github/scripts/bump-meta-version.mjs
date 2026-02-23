import { promises as fs } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const scriptsDir = path.join(rootDir, "scripts");

function bumpPatchVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]) + 1;
  return `${major}.${minor}.${patch}`;
}

async function listMetaFiles(baseDir) {
  const entries = await fs.readdir(baseDir, { withFileTypes: true });
  const metaFiles = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const metaPath = path.join(baseDir, entry.name, "src", "meta.ts");
    try {
      await fs.access(metaPath);
      metaFiles.push(metaPath);
    } catch {
      // Ignore folders without meta.ts
    }
  }

  return metaFiles;
}

async function bumpMetaVersion(metaPath) {
  const raw = await fs.readFile(metaPath, "utf8");
  const versionPattern = /version:\s*["']([^"']+)["']/;
  const found = raw.match(versionPattern);
  if (!found) return null;

  const current = found[1];
  const next = bumpPatchVersion(current);
  if (!next) {
    throw new Error(`Unsupported version format in ${metaPath}: ${current}`);
  }

  const updated = raw.replace(versionPattern, `version: "${next}"`);
  if (updated === raw) return null;

  await fs.writeFile(metaPath, updated, "utf8");
  return { current, next };
}

async function main() {
  const metaFiles = await listMetaFiles(scriptsDir);
  if (metaFiles.length === 0) {
    console.log("No meta.ts files found under scripts/*/src.");
    return;
  }

  let changed = 0;
  for (const metaPath of metaFiles) {
    const result = await bumpMetaVersion(metaPath);
    if (!result) continue;

    const relative = path.relative(rootDir, metaPath);
    console.log(`${relative}: ${result.current} -> ${result.next}`);
    changed += 1;
  }

  if (changed === 0) {
    console.log("No version changes were applied.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
