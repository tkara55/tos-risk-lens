// Builds the unpacked extension into dist/ (load it via chrome://extensions → "Load unpacked")
// plus the demo harness bundle used by Cypress.
import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, rmSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });

const common = { bundle: true, target: 'chrome116', logLevel: 'info', legalComments: 'none' };
await Promise.all([
  esbuild.build({ ...common, entryPoints: ['src/content/extract.js'], outfile: 'dist/extract.js', format: 'iife' }),
  esbuild.build({ ...common, entryPoints: ['src/content/detect.js'], outfile: 'dist/detect.js', format: 'iife' }),
  esbuild.build({ ...common, entryPoints: ['src/background.js'], outfile: 'dist/background.js', format: 'esm' }),
  esbuild.build({ ...common, entryPoints: ['src/sidepanel/sidepanel.js'], outfile: 'dist/sidepanel.js', format: 'esm' }),
  esbuild.build({ ...common, entryPoints: ['src/options/options.js'], outfile: 'dist/options.js', format: 'esm' }),
  esbuild.build({ ...common, entryPoints: ['demo/harness.js'], outfile: 'dist/harness.js', format: 'esm' }),
]);

cpSync('manifest.json', 'dist/manifest.json');
cpSync('src/sidepanel/sidepanel.html', 'dist/sidepanel.html');
cpSync('src/options/options.html', 'dist/options.html');
cpSync('src/ui/report.css', 'dist/report.css');
