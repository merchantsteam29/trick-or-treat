// Boots the game, starts a night, looks around every area, prints draw-call stats, fails on any console error.
// node tools/smoke.mjs [only-these-view-names...]
import { open, sleep } from './harness.mjs';
import { spawn } from 'child_process';
import path from 'path'; import { fileURLToPath } from 'url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 8600 + Math.floor(Math.random() * 300);
const srv = spawn(process.execPath, ['serve.js'], { cwd: root, env: { ...process.env, PORT: port }, stdio: 'ignore' });
process.env.SH_URL = `http://localhost:${port}/`;
await sleep(600);
const { ev, shot, check, done } = await open(import.meta.url);
for (let i = 0; i < 60 && (await ev('return document.body.dataset.ready')) !== '1'; i++) await sleep(500);
check(await ev(`return document.body.dataset.ready`) === '1', 'booted');
await shot('01-warn');
await ev(`document.getElementById('warnOk').click()`); await sleep(2500); await shot('02-title');
console.log(JSON.stringify(await ev(`return __s.stats()`)));
await ev(`__s.setQuality('medium'); document.getElementById('btnNew').click()`);
for (let i = 0; i < 60 && (await ev(`return __s.mode`)) !== 'play'; i++) await sleep(250);
check((await ev(`return __s.mode`)) === 'play', 'playing');
await ev(`__s.pm.setActive(false)`);
await shot('03-start');
const only = process.argv.slice(2);
const PI = Math.PI;
const views = [
  ['moss-front', 6, 18.6, -PI / 2, 0.05], ['lane-north', 0, 5, 0, 0.05], ['lane-south', 0, 60, PI, 0.05],
  ['moss-hall', 15, 20, -PI / 2, 0], ['moss-living', 16.4, 21.0, -PI * 0.25 - PI / 2, -0.1], ['moss-kid', 22.6, 18, PI * 0.9, -0.2], ['moss-kitchen', 21.5, 21, -PI * 0.75, -0.2], ['moss-bed', 18.5, 17.3, PI * 0.6, -0.2],
  ['ferris-back', -29, 50, -PI / 2, 0], ['ferris-kitchen', -21, 51.5, PI * 0.75, -0.1], ['ferris-lisa', -21, 47.6, PI * 0.8, -0.15],
  ['dorsey-front', 4, 64.3, -PI / 2, 0.1], ['maze-1', 11.3, 65, PI, 0], ['maze-blade', 16.5, 61.5, PI, 0], ['maze-4', 19.6, 67.5, 0, -0.1], ['tent', 24, 62, -PI * 0.6, 0],
  ['culdesac', 0, 126, PI, 0.05], ['marsh-front', 0, 136, PI, 0.1], ['marsh-in', 0, 143.5, PI, 0], ['marsh-work', -1.85, 149.6, PI * 0.6, -0.1],
  ['field-path', 4.5, 157, PI, 0], ['clearing', 0, 178.5, PI, -0.05],
].filter((v) => !only.length || only.includes(v[0]));
for (const [n, x, z, yaw, pitch] of views) {
  await ev(`__s.tp(${x}, ${z}, ${yaw}, ${pitch}); __s.flash(${n.includes('moss') || n.includes('ferris') || n.includes('marsh') ? 'true' : 'false'})`);
  await sleep(900); await shot('v-' + n);
  console.log(n, JSON.stringify(await ev(`return { zone: __s.P.zone, calls: __s.renderer.info.render.calls, y: +__s.P.y.toFixed(2) }`)));
}
console.log(JSON.stringify(await ev(`return __s.stats()`)));
srv.kill();
await done();
