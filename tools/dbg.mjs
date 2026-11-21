// one-off debugging: node tools/dbg.mjs "<js to run after starting at a checkpoint>" [cp]
import { open, sleep } from './harness.mjs';
import { spawn } from 'child_process';
import path from 'path'; import { fileURLToPath } from 'url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 8600 + Math.floor(Math.random() * 300);
const srv = spawn(process.execPath, ['serve.js'], { cwd: root, env: { ...process.env, PORT: port }, stdio: 'ignore' });
process.env.SH_URL = `http://localhost:${port}/`;
await sleep(600);
const { ev, shot, done } = await open(import.meta.url);
for (let i = 0; i < 60 && (await ev('return document.body.dataset.ready')) !== '1'; i++) await sleep(500);
await ev(`localStorage.clear(); document.getElementById('warnOk').click(); __s.setQuality('low'); __s.startFrom(${process.argv[3] || 1})`);
for (let i = 0; i < 40 && (await ev('return __s.mode')) !== 'play'; i++) await sleep(250);
const steps = process.argv[2].split(';;');
for (const s of steps) { const r = await ev(s); if (r !== undefined) console.log(typeof r === 'string' ? r : JSON.stringify(r)); }
await shot('dbg');
srv.kill(); await done();
