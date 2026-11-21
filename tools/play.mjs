// Plays the night through the test hooks: every chapter's beats, every death, all four endings. Fails on errors.
import { open, sleep } from './harness.mjs';
import { spawn } from 'child_process';
import path from 'path'; import { fileURLToPath } from 'url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 8600 + Math.floor(Math.random() * 300);
const srv = spawn(process.execPath, ['serve.js'], { cwd: root, env: { ...process.env, PORT: port }, stdio: 'ignore' });
process.env.SH_URL = `http://localhost:${port}/`;
await sleep(600);
const { ev, shot, check, done } = await open(import.meta.url);
const waitFor = async (js, secs = 30, what = js) => { for (let i = 0; i < secs * 4; i++) { if (await ev(`return !!(${js})`)) return true; await sleep(250); } check(false, 'timed out: ' + what); return false; };
const log = (...a) => console.log(...a);
for (let i = 0; i < 60 && (await ev('return document.body.dataset.ready')) !== '1'; i++) await sleep(500);
await ev(`localStorage.clear(); document.getElementById('warnOk').click(); __s.setQuality('low')`);
await ev(`document.getElementById('btnNew').click()`);
await waitFor(`__s.mode === 'play'`, 20, 'play');
const S = '__s.story.S';

// ---- 1: the bucket, the mask, his first visit ----
await ev(`__s.tp(8.4, 19.7, -Math.PI / 2, -0.5)`); await sleep(1500);
log('focus at bucket:', await ev(`return __s.focus()`));
await ev(`__s.use('bucket')`); check(await ev(`return !!${S}.items.bucket`), 'got bucket');
await ev(`__s.tp(21.6, 17.4, Math.PI * 0.75, -0.7)`); await sleep(1500);
log('focus at mask:', await ev(`return __s.focus()`));
await ev(`__s.use('mask')`); check(await ev(`return !!${S}.items.mask`), 'got mask');
await ev(`__s.hideIn('mossKidBed')`);
await waitFor(`__s.pm.active && __s.pm.state === 'script'`, 30, 'he comes in');
await shot('01-pm-in-house');
// hold your breath when he's close
for (let i = 0; i < 900; i++) {
  const st = await ev(`const d = Math.hypot(__s.pm.x - __s.P.x, __s.pm.z - __s.P.z); return { d, st: __s.pm.state, mode: __s.mode, left: !!${S}.flags.mossLeft }`);
  if (st.mode !== 'play') { check(false, 'died hiding: ' + await ev('return __s.deaths.kind')); break; }
  await ev(`__s.key('Space', ${st.d < 3.2})`);
  if (i % 20 === 0) log('  pm', st.st, st.d.toFixed(1));
  if (i === 60) await shot('02-under-bed');
  if (st.left && st.st === 'patrol') break;
  await sleep(250);
}
await ev(`__s.key('Space', false); __s.unhide(); __s.pm.place(0, 70, 0); __s.tp(28.4, 20.5, Math.PI / 2)`);
await waitFor(`__s.save.cp === 2`, 10, 'checkpoint 2');
log('cp', await ev('return __s.save.cp'), 'souls', await ev(`return JSON.stringify(${S}.souls)`));

// ---- a death: walk into him ----
await ev(`__s.pm.place(__s.P.x + 3, __s.P.z, Math.PI / 2); __s.pm.state = 'chase'; __s.pm.aware = 1.2; __s.pm.last = { x: __s.P.x, z: __s.P.z }`);
await waitFor(`__s.mode === 'dying'`, 15, 'caught');
await sleep(2500); await shot('03-carved-fp');
await waitFor(`__s.mode === 'dying' && document.getElementById('bloodFX').className === ''`, 10, 'third person');
await sleep(1500); await shot('04-carved-tp');
await waitFor(`__s.mode === 'dead'`, 15, 'dead screen'); await shot('05-dead');
await ev(`document.getElementById('btnRetry').click()`);
await waitFor(`__s.mode === 'play'`, 10, 'retry');
check(await ev(`return ${S}.cp === 2`), 'retry at cp 2');

// ---- 2: the Ferris house ----
await ev(`__s.pm.place(0, 5, 0)`);
await ev(`__s.tp(-24.6, 46.0, 0, -0.3)`); await sleep(1200);
log('focus at Lisa\'s pumpkin:', await ev(`return __s.focus()`));
await ev(`__s.use('soul:lisa')`); check(await ev(`return !!${S}.souls.lisa`), 'blew out Lisa');
await sleep(1500); await shot('06-lisa-ghost');
await ev(`__s.use('diary'); `); await sleep(500); await shot('07-note'); check(await ev(`return __s.mode === 'read'`), 'reading'); await ev(`document.getElementById('noteClose').click()`);
await ev(`__s.tp(-21.8, 46.6, Math.PI, 0)`);
await ev(`__s.use('shoe')`); check(await ev(`return !!${S}.items.shoe`), 'got shoe');
// look at the wall: they come
await ev(`__s.tp(-21.0, 45.0, 0, 0)`);
await waitFor(`__s.mode === 'dying'`, 90, 'held');
log('death:', await ev('return __s.deaths.kind'));
await waitFor(`__s.mode === 'dead'`, 20, 'dead screen'); await ev(`document.getElementById('btnRetry').click()`); await waitFor(`__s.mode === 'play'`, 10, 'retry');
check(await ev(`return !!${S}.souls.lisa`), 'kept Lisa after dying');
await ev(`__s.pm.place(0, 5, 0); __s.tp(-21.8, 46.6, Math.PI, 0); __s.use('shoe'); __s.tp(-12.5, 50, -Math.PI / 2)`);
await waitFor(`__s.save.cp === 3`, 10, 'checkpoint 3');

// ---- 3: the garage ----
await ev(`__s.pm.place(0, 110, 0); __s.tp(16.5, 61.0, Math.PI, 0)`); await sleep(500); await shot('08-blade');
await ev(`__s.tp(16.5, 64.3, Math.PI, 0)`);
await waitFor(`__s.mode === 'dying'`, 10, 'guillotine'); log('death:', await ev('return __s.deaths.kind'));
await sleep(1200); await shot('09-headless');
await waitFor(`__s.mode === 'dead'`, 15, 'dead'); await ev(`document.getElementById('btnRetry').click()`); await waitFor(`__s.mode === 'play'`, 10, 'retry');
await ev(`__s.pm.place(0, 110, 0); __s.tp(20.2, 65.6, -Math.PI / 2, -0.5)`); await sleep(1200); log('focus at Marcus:', await ev(`return __s.focus()`));
await ev(`__s.use('soul:marcus'); __s.tp(29.0, 63.6, -Math.PI / 2, -0.4)`); await sleep(1200); log('focus at keys:', await ev(`return __s.focus()`));
await ev(`__s.use('keys')`); check(await ev(`return !!${S}.items.keys`), 'got keys');
await sleep(4000); await shot('10-garage-hunt');
await ev(`__s.tp(28.7, 58.8, Math.PI / 2)`);
await waitFor(`__s.save.cp === 4`, 10, 'checkpoint 4');

// ---- 4: the gate, the Marsh house ----
await ev(`__s.pm.place(0, 60, 0); __s.tp(0, 137.5, Math.PI, 0)`); await sleep(1200); log('focus at gate:', await ev(`return __s.focus()`));
await ev(`__s.use('gateKey')`); check(await ev(`return !__s.W.doors.get('gate').locked`), 'gate unlocked');
await ev(`__s.tp(-5.5, 151.2, Math.PI, -0.5); __s.use('letter')`); await sleep(400); await ev(`document.getElementById('noteClose').click()`);
await waitFor(`__s.pm.state === 'script'`, 10, 'he comes home'); await sleep(2500); await shot('11-marsh');
await ev(`__s.pm.place(25, 200, 0); __s.pm.state = 'patrol'; __s.tp(4.5, 156.2, Math.PI)`);
await waitFor(`__s.save.cp === 5`, 10, 'checkpoint 5');

// ---- 5: the corn, Toby ----
await ev(`__s.pm.place(20, 200, 0); __s.tp(0, 182.6, Math.PI, -0.4)`); await sleep(2000); await shot('12-toby');
log('focus at Toby:', await ev(`return __s.focus()`));
await ev(`__s.use('untie')`);
await waitFor(`__s.save.cp === 6 && __s.pm.state === 'chase'`, 10, 'chase');
await sleep(1500); await shot('13-chase');
// run home: teleport to the porch, he's behind
await ev(`__s.pm.place(4, 30, Math.PI); __s.pm.state = 'chase'; __s.tp(12.2, 0, -Math.PI / 2)`);
await sleep(1500); log('focus at home:', await ev(`return __s.focus()`));
await ev(`__s.use('home')`);
await waitFor(`__s.mode === 'endcut'`, 5, 'end cut'); await sleep(3000); await shot('14-endcut');
await waitFor(`__s.mode === 'ending'`, 90, 'ending'); await sleep(4000); await shot('15-ending');
log('endings', await ev(`return JSON.stringify(__s.progress.endings)`));

// ---- the other endings ----
for (const [cp, how, want] of [[5, 'candle', 'place'], [2, 'home', 'alone'], [6, 'home', 'treat']]) {
  await ev(`document.getElementById('btnEndTitle').click()`); await sleep(500);
  if (want === 'treat') await ev(`__s.save.souls = { danny: 1, lisa: 1, marcus: 1 }`);
  await ev(`__s.startFrom(${cp})`); await waitFor(`__s.mode === 'play'`, 10, 'play ' + cp);
  await ev(`__s.pm.place(-30, 200, 0); __s.pm.state = 'patrol'`);
  if (how === 'home') await ev(`__s.tp(12.2, 0, -Math.PI / 2)`); else await ev(`__s.tp(0.8, 181, Math.PI, -0.3)`);
  await ev(`__s.use('${how}')`);
  await waitFor(`__s.mode === 'endcut'`, 5, 'end cut ' + want); await sleep(2500); await shot('16-cut-' + want);
  await waitFor(`__s.mode === 'ending'`, 90, 'ending ' + want);
}
log('endings', await ev(`return JSON.stringify(__s.progress.endings)`), 'deaths', await ev(`return JSON.stringify(__s.progress.deaths)`));
check(Object.keys(JSON.parse(await ev(`return JSON.stringify(__s.progress.endings)`))).length === 4, 'all four endings');
console.log(JSON.stringify(await ev(`return __s.prof()`)));
srv.kill();
await done();
