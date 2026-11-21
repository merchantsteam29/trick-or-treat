// The run home: a bot carries Toby from the clearing down the whole lane while he chases. Reports how close he got.
// node tools/chase.mjs [runs]
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
await ev(`localStorage.clear(); document.getElementById('warnOk').click(); __s.setQuality('low')`);
const ROUTE = [[0, 181], [0, 179.6], [1, 177.6], [2, 175.6], [0, 174.5], [-3, 172.5], [-6, 170], [-4.5, 167], [-3, 164.6], [-1, 163], [2, 161.5], [4.5, 159], [4.55, 155.3], [4.55, 154], [4.6, 152.5], [4.6, 149.4], [1.85, 149.0], [1.85, 147.4], [0.9, 147.2], [0, 143.3], [0, 140.5], [0, 136], [0, 126], [0, 110], [0, 80], [0, 40], [1, 12], [6, 3], [9, 0.5], [12.2, 0]];
const runs = +(process.argv[2] || 2);
let wins = 0;
for (let r = 0; r < runs; r++) {
  await ev(`__s.startFrom(6)`);
  for (let i = 0; i < 40 && (await ev('return __s.mode')) !== 'play'; i++) await sleep(250);
  // drive: aim at the next waypoint, hold W and Shift (stamina permitting)
  await ev(`
    const R = ${JSON.stringify(ROUTE)}; window.__bot = { i: 0, min: 99, t: 0, R };
    const tick = () => {
      const b = window.__bot; if (!b || __s.mode !== 'play') return;
      const P = __s.P; let [x, z] = b.R[b.i];
      if (Math.hypot(x - P.x, z - P.z) < 0.8 && b.i < b.R.length - 1) { b.i++; [x, z] = b.R[b.i]; }
      P.yaw = Math.atan2(-(x - P.x), -(z - P.z)); P.pitch = 0;
      __s.key('KeyW', true); __s.key('ShiftLeft', true);
      const d = Math.hypot(__s.pm.x - P.x, __s.pm.z - P.z); if (d < b.min) b.min = d;
      requestAnimationFrame(tick);
    }; tick();`);
  let res = null, last = -1;
  for (let i = 0; i < 1200; i++) {
    const s = await ev(`const b = window.__bot, P = __s.P; return { i: b.i, mode: __s.mode, d: Math.hypot(__s.pm.x - P.x, __s.pm.z - P.z), z: P.z, st: __s.pm.state, stam: P.stam }`);
    if (s.i !== last && s.i % 4 === 0) { last = s.i; console.log(`  wp ${s.i} z=${s.z.toFixed(0)} him ${s.d.toFixed(1)} m (${s.st}) stamina ${s.stam.toFixed(2)}`); }
    if (s.mode !== 'play') { res = 'died: ' + (await ev('return __s.deaths.kind')); break; }
    if (s.i === ROUTE.length - 1 && Math.hypot(12.2 - (await ev('return __s.P.x')), 0 - s.z) < 1.2) { res = 'home'; break; }
    if (i === 100) await shot('chase-' + r);
    await sleep(250);
  }
  const min = await ev(`return window.__bot.min`);
  await ev(`window.__bot = null; __s.key('KeyW', false); __s.key('ShiftLeft', false)`);
  console.log(`run ${r + 1}: ${res}, closest ${min.toFixed(2)} m`);
  if (res === 'home') wins++;
  if (await ev(`return __s.mode`) !== 'play') { for (let i = 0; i < 60 && (await ev('return __s.mode')) !== 'dead'; i++) await sleep(250); }
}
console.log(`made it home ${wins} of ${runs}`);
srv.kill();
await done();
void check;
