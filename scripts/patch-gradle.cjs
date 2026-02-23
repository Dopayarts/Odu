/**
 * Patches Capacitor-generated Android Gradle files to replace deprecated
 * flatDir repositories with maven uri equivalents.
 * Run automatically after `cap sync` via the build:mobile script.
 */
const fs = require('fs');
const path = require('path');

const FILES = [
  'android/capacitor-cordova-android-plugins/build.gradle',
];

const FLAT_DIR_RE = /\bflatDir\s*\{[^}]*\}/g;

for (const rel of FILES) {
  const file = path.resolve(__dirname, '..', rel);
  if (!fs.existsSync(file)) continue;

  const original = fs.readFileSync(file, 'utf8');

  const patched = original.replace(FLAT_DIR_RE, (match) => {
    // Extract each quoted path from dirs '...', '...'
    const dirs = [...match.matchAll(/'([^']+)'/g)].map(m => m[1]);
    return dirs.map(d => `maven { url uri('${d}') }`).join('\n    ');
  });

  if (patched !== original) {
    fs.writeFileSync(file, patched, 'utf8');
    console.log(`  patched: ${rel}`);
  } else {
    console.log(`  already clean: ${rel}`);
  }
}
