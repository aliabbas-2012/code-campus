// Copies the Pyodide runtime from node_modules into public/pyodide so it's
// served from our own origin instead of depending on an external CDN at
// runtime. Runs automatically after `npm install` (see postinstall script)
// so it always matches whatever `pyodide` version is actually installed.
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'node_modules', 'pyodide');
const DEST_DIR = path.join(__dirname, '..', 'public', 'pyodide');

const FILES_TO_COPY = [
  'pyodide.mjs',
  'pyodide.asm.mjs',
  'pyodide.asm.wasm',
  'pyodide-lock.json',
  'python_stdlib.zip',
];

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.warn('[copy-pyodide-assets] node_modules/pyodide not found, skipping.');
    return;
  }

  fs.mkdirSync(DEST_DIR, { recursive: true });

  for (const file of FILES_TO_COPY) {
    const src = path.join(SRC_DIR, file);
    const dest = path.join(DEST_DIR, file);
    if (!fs.existsSync(src)) {
      console.warn(`[copy-pyodide-assets] missing expected file: ${file}`);
      continue;
    }
    fs.copyFileSync(src, dest);
  }

  const version = require(path.join(SRC_DIR, 'package.json')).version;

  // Individual package wheels (numpy, pandas, ...) aren't part of the npm package and would
  // be impractical to vendor here (hundreds of packages, easily gigabytes) — only the core
  // runtime above is self-hosted. The worker reads this file to fetch packages from
  // Pyodide's own release CDN instead, at the exact version installed, so it can never
  // request a wheel from a mismatched release.
  fs.writeFileSync(path.join(DEST_DIR, 'version.txt'), version);

  console.log(`[copy-pyodide-assets] Copied Pyodide runtime to public/pyodide (v${version}).`);
}

main();
