import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT_DIR = process.cwd();
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const ZIP_NAME = 'export-to-pdf-for-chatgpt.zip';

console.log('📦 Step 1: Compiling export.js with esbuild...');
execSync('npm run build', { stdio: 'inherit' });

console.log('📁 Step 2: Preparing dist/ folder...');
if (fs.existsSync(DIST_DIR)) {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(DIST_DIR, { recursive: true });

const FILES_TO_COPY = [
  'manifest.json',
  'background.js',
  'export.js',
  'options.html',
  'options.css',
  'options.js'
];

for (const file of FILES_TO_COPY) {
  const src = path.join(ROOT_DIR, file);
  const dest = path.join(DIST_DIR, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

const ICONS_DIR = path.join(ROOT_DIR, 'icons');
if (fs.existsSync(ICONS_DIR)) {
  fs.cpSync(ICONS_DIR, path.join(DIST_DIR, 'icons'), { recursive: true });
}

console.log(`🗜️  Step 3: Creating Chrome Web Store upload zip (${ZIP_NAME})...`);
execSync(`zip -r "${ZIP_NAME}" * -x "${ZIP_NAME}"`, { cwd: DIST_DIR, stdio: 'inherit' });

console.log('\n✅ Packaging complete!');
console.log(`- Folder: dist/ (ready for "Load unpacked" testing)`);
console.log(`- ZIP:    dist/${ZIP_NAME} (ready for Chrome Web Store upload)\n`);
