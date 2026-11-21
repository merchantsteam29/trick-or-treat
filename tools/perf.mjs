// Frame rate per area, and how much each suspect costs: node tools/perf.mjs
import { open, sleep } from './harness.mjs';
import { spawn } from 'child_process';
import path from 'path'; import { fileURLToPath } from 'url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 8600 + Math.floor(Math.random() * 300);
const srv = spawn(process.execPath, ['serve.js'], { cwd: root, env: { ...process.env, PORT: port }, stdio: 'ignore' });
process.env.SH_URL = `http://localhost:${port}/`;
await sleep(600);
const { ev, done } = await open(import.meta.url, { size: [960, 540] });
for (let i = 0; i < 60 && (await ev('return document.body.dataset.ready')) !== '1'; i++) await sleep(500);
await ev(`localStorage.clear(); document.getElementById('warnOk').click(); __s.setQuality('${process.argv[2] || 'low'}'); __s.startFrom(3)`);
for (let i = 0; i < 40 && (await ev('return __s.mode')) !== 'play'; i++) await sleep(250);
await ev(`__s.pm.place(1, 72, Math.PI); __s.pm.state = 'patrol'`);
const fps = async () => { await sleep(1500); await ev('__s.prof()'); const t0 = Date.now(); await sleep(3000); const p = await ev('return __s.prof()'); return { fps: +(p.n / ((Date.now() - t0) / 1000)).toFixed(1), calls: p.calls, upd: p.upd }; };
const V = {
  base: '', far: `__s.camera.far = 60; __s.camera.updateProjectionMatrix()`, corn: `__s.W.meshes.corn.visible = false`, post: `__s.noPost = true`,
  people: `__s.scene.traverse(o => { if (o.isSkinnedMesh) o.visible = false })`, shadows: `__s.renderer.shadowMap.enabled = false`, leaves: `__s.scene.children.filter(o => o.isInstancedMesh && o.count > 2000 && o !== __s.W.meshes.corn).forEach(o => o.visible = false)`,
};
const undo = `__s.camera.far = 80; __s.camera.updateProjectionMatrix(); __s.W.meshes.corn.visible = true; __s.noPost = false; __s.scene.traverse(o => { if (o.isSkinnedMesh) o.visible = true; if (o.isInstancedMesh) o.visible = true }); __s.renderer.shadowMap.enabled = true`;
for (const [n, x, z, yaw] of [['street', 1, 40, Math.PI], ['inside', -18, 50, Math.PI / 2], ['maze', 13.9, 66, Math.PI], ['field', 4.5, 158, Math.PI]]) {
  await ev(`__s.tp(${x}, ${z}, ${yaw}, 0)`);
  const row = [];
  for (const [k, js] of Object.entries(V)) { await ev(undo); await ev(js); const r = await fps(); row.push(`${k} ${r.fps}fps/${r.calls}c`); }
  await ev(undo);
  console.log(n.padEnd(7), row.join('  '));
}
srv.kill(); await done();
