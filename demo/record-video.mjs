// npm run demo:video — builds, starts the demo server, runs the Cypress demo spec in
// Chrome with video recording, stops the server. Video: cypress/videos/demo.cy.js.mp4
import { spawn, spawnSync } from 'node:child_process';

const run = (cmd, args) => spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
if (run('node', ['build.mjs']).status !== 0) process.exit(1);
const server = spawn(process.execPath, ['demo/serve.mjs'], { stdio: 'inherit' });
await new Promise((r) => setTimeout(r, 800));
const res = run('npx', ['cypress', 'run', '--browser', process.env.CY_BROWSER || 'chrome', '--spec', 'cypress/e2e/demo.cy.js']);
server.kill();
process.exit(res.status ?? 1);
