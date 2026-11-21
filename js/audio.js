// All the sound is made live with Web Audio: wind in dead leaves, crickets, his steps and the candle in his head,
// the walkie-talkie, the neighbours, the guillotine, what bodies sound like. No sound files.
let ctx = null, master, sfx, amb, verb, verbIn, noiseBuf, listenerReady = false;
export const audio = { vol: 0.8, get ctx() { return ctx; } };

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = audio.vol;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
  master.connect(comp).connect(ctx.destination);
  sfx = ctx.createGain(); sfx.connect(master);
  amb = ctx.createGain(); amb.gain.value = 0.9; amb.connect(master);
  // a small dark room reverb
  verb = ctx.createConvolver(); const len = ctx.sampleRate * 1.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
  verb.buffer = ir; verbIn = ctx.createGain(); verbIn.gain.value = 0.35; verbIn.connect(verb); const vo = ctx.createGain(); vo.gain.value = 0.5; verb.connect(vo).connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  startAmbience();
}
export function setVolume(v) { audio.vol = v; if (master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.05); }

const now = () => ctx.currentTime;
function noise(loop = false) { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = loop; if (!loop) s.loopStart = 0; return s; }
function env(g, t, a, peak, d, end = 0.0001) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(end, t + a + d); }
function filt(type, f, q = 1) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }

// ---------- 3D: sounds placed in the house ----------
export function setListener(pos, fwd) {
  if (!ctx) return; const L = ctx.listener;
  if (L.positionX) { L.positionX.value = pos.x; L.positionY.value = pos.y; L.positionZ.value = pos.z; L.forwardX.value = fwd.x; L.forwardY.value = fwd.y; L.forwardZ.value = fwd.z; L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0; }
  else { L.setPosition(pos.x, pos.y, pos.z); L.setOrientation(fwd.x, fwd.y, fwd.z, 0, 1, 0); }
  listenerReady = true;
}
// muffled = behind walls / on another floor (0 clear .. 1 very muffled)
function out(pos, muffled = 0, wet = 0.4) {
  const g = ctx.createGain();
  let node = g;
  if (muffled > 0) { const lp = filt('lowpass', 5000 * Math.pow(0.12, muffled)); g.connect(lp); node = lp; }
  if (pos && listenerReady) {
    const p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 1.2; p.rolloffFactor = 1.3; p.maxDistance = 40;
    if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y, pos.z);
    node.connect(p); p.connect(sfx); const w = ctx.createGain(); w.gain.value = wet; p.connect(w).connect(verbIn);
  } else { node.connect(sfx); const w = ctx.createGain(); w.gain.value = wet; node.connect(w).connect(verbIn); }
  return g;
}
export const occl = { fn: () => 0 }; // set by the game: how muffled a position is from where you are

// ---------- one-shots ----------
export function step(pos, surface = 'wood', vol = 0.3, muffled = 0) {
  if (!ctx) return; const t = now();
  const s = noise(), g = out(pos, muffled, 0.25);
  const f = { wood: [500, 1.2], carpet: [260, 0.8], tile: [1600, 2], concrete: [900, 1.5], dirt: [300, 0.7] }[surface] || [500, 1];
  const bp = filt('bandpass', f[0] * (0.85 + Math.random() * 0.3), f[1]);
  s.connect(bp).connect(g); env(g, t, 0.005, vol, 0.09); s.start(t, Math.random()); s.stop(t + 0.15);
  if (surface === 'wood' && Math.random() < 0.18) creak(pos, vol * 0.5, muffled, 0.25);
}
export function creak(pos, vol = 0.25, muffled = 0, len = 0.5) {
  if (!ctx) return; const t = now();
  const o = ctx.createOscillator(); o.type = 'sawtooth';
  const base = 90 + Math.random() * 120; o.frequency.setValueAtTime(base, t); o.frequency.linearRampToValueAtTime(base * (0.7 + Math.random() * 0.8), t + len);
  const am = ctx.createOscillator(); am.frequency.value = 18 + Math.random() * 30; const amg = ctx.createGain(); amg.gain.value = 0.5; am.connect(amg);
  const g = out(pos, muffled, 0.6), bp = filt('bandpass', 900 + Math.random() * 900, 6), vg = ctx.createGain(); vg.gain.value = 0.5; amg.connect(vg.gain);
  o.connect(bp).connect(vg).connect(g); env(g, t, 0.05, vol, len); o.start(t); am.start(t); o.stop(t + len + 0.1); am.stop(t + len + 0.1);
}
export function doorSound(pos, open = true, slam = false, muffled = 0) {
  if (!ctx) return;
  if (slam) { thud(pos, 0.9, muffled, 70); creak(pos, 0.3, muffled, 0.2); return; }
  creak(pos, 0.22, muffled, open ? 0.7 + Math.random() * 0.5 : 0.35);
  if (!open) setTimeout(() => thud(pos, 0.35, muffled, 110), 330);
}
export function thud(pos, vol = 0.5, muffled = 0, freq = 90) {
  if (!ctx) return; const t = now();
  const o = ctx.createOscillator(); o.frequency.setValueAtTime(freq * 1.6, t); o.frequency.exponentialRampToValueAtTime(freq * 0.6, t + 0.2);
  const g = out(pos, muffled, 0.6); o.connect(g); env(g, t, 0.004, vol, 0.3); o.start(t); o.stop(t + 0.4);
  const n = noise(), ng = out(pos, muffled, 0.5), lp = filt('lowpass', 900); n.connect(lp).connect(ng); env(ng, t, 0.002, vol * 0.5, 0.12); n.start(t); n.stop(t + 0.2);
}
export function knock(pos, n = 3, muffled = 0.2, vol = 0.6) { for (let i = 0; i < n; i++) setTimeout(() => thud(pos, vol, muffled, 140 + Math.random() * 20), i * (260 + Math.random() * 80)); }
export function click(vol = 0.25) {
  if (!ctx) return; const t = now(); const n = noise(), g = out(null, 0, 0.05), hp = filt('highpass', 2500);
  n.connect(hp).connect(g); env(g, t, 0.001, vol, 0.03); n.start(t, Math.random()); n.stop(t + 0.05);
}
export function pickup() {
  if (!ctx) return; const t = now();
  const n = noise(), g = out(null, 0, 0.1), bp = filt('bandpass', 3000, 2); n.connect(bp).connect(g); env(g, t, 0.01, 0.15, 0.15); n.start(t, Math.random()); n.stop(t + 0.2);
}
export function paper() {
  if (!ctx) return; const t = now();
  for (let i = 0; i < 4; i++) { const n = noise(), g = out(null, 0, 0.1), bp = filt('bandpass', 2500 + Math.random() * 2000, 1); n.connect(bp).connect(g); env(g, t + i * 0.05, 0.01, 0.12, 0.06); n.start(t + i * 0.05, Math.random()); n.stop(t + i * 0.05 + 0.1); }
}
// a sharp stinger for scares: a stab of dissonant strings and a hit
export function sting(vol = 0.5) {
  if (!ctx) return; const t = now();
  for (const fq of [233, 247, 349, 370, 494]) {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(fq, t); o.frequency.linearRampToValueAtTime(fq * 0.97, t + 1.4);
    const g = out(null, 0, 0.6), lp = filt('lowpass', 2800); o.connect(lp).connect(g); env(g, t, 0.01, vol * 0.13, 1.6); o.start(t); o.stop(t + 1.8);
  }
  thud(null, vol, 0, 55);
}
export function thunder(dist = 0.5) {
  if (!ctx) return; const t = now() + dist * 1.2;
  const n = noise(), g = out(null, 0, 0.8), lp = filt('lowpass', 260);
  n.connect(lp).connect(g); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5 - dist * 0.25, t + 0.08); g.gain.exponentialRampToValueAtTime(0.25, t + 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + 4);
  n.start(t); n.stop(t + 4.2);
}
// ---------- loops you can start and stop ----------
// static from the baby monitor / the TV / the phone line
export function staticLoop(pos, vol = 0.12) {
  if (!ctx) return { stop() {}, set() {} };
  const n = noise(true), bp = filt('bandpass', 2200, 0.7), g = out(pos, 0, 0.3); g.gain.value = 0;
  const crackle = ctx.createGain(); crackle.gain.value = 1;
  n.connect(bp).connect(crackle).connect(g); n.start();
  g.gain.setTargetAtTime(vol, now(), 0.05);
  let alive = true; const tick = () => { if (!alive) return; crackle.gain.setValueAtTime(0.4 + Math.random() * 0.8, now()); setTimeout(tick, 30 + Math.random() * 90); }; tick();
  return { stop() { alive = false; g.gain.setTargetAtTime(0.0001, now(), 0.05); setTimeout(() => n.stop(), 400); }, set(v) { g.gain.setTargetAtTime(v, now(), 0.1); } };
}
// your own breathing: faster when you run, ragged when you're scared, gone when you hold it
let breathG = null, breathF = null, breathT = 0;
export function breath(dt, rate, vol) {
  if (!ctx) return;
  if (!breathG) { const n = noise(true); breathF = filt('bandpass', 700, 1.2); breathG = ctx.createGain(); breathG.gain.value = 0; n.connect(breathF).connect(breathG).connect(sfx); n.start(); }
  breathT += dt * rate;
  const ph = (breathT % 1), inhale = ph < 0.45, k = inhale ? Math.sin((ph / 0.45) * Math.PI) : Math.sin(((ph - 0.45) / 0.55) * Math.PI) * 0.7;
  breathG.gain.setTargetAtTime(Math.max(0, k) * vol, now(), 0.03);
  breathF.frequency.setTargetAtTime(inhale ? 900 : 600, now(), 0.05);
}

export function scream(pos, vol = 1, len = 1.6) {
  if (!ctx) return; const t = now();
  const g = out(pos, 0, 0.7);
  for (const [fq, ty] of [[620, 'sawtooth'], [655, 'square'], [930, 'sawtooth'], [310, 'sawtooth']]) {
    const o = ctx.createOscillator(); o.type = ty; o.frequency.setValueAtTime(fq * 0.7, t); o.frequency.exponentialRampToValueAtTime(fq * 1.3, t + 0.12); o.frequency.exponentialRampToValueAtTime(fq * 0.5, t + len);
    const vib = ctx.createOscillator(); vib.frequency.value = 9 + Math.random() * 6; const vg = ctx.createGain(); vg.gain.value = fq * 0.05; vib.connect(vg).connect(o.frequency); vib.start(t); vib.stop(t + len);
    const og = ctx.createGain(); og.gain.value = 0.07; o.connect(og).connect(g); o.start(t); o.stop(t + len);
  }
  const n = noise(), bp = filt('bandpass', 1500, 0.8), ng = ctx.createGain(); ng.gain.value = 0.6; n.connect(bp).connect(ng).connect(g); n.start(t); n.stop(t + len);
  env(g, t, 0.02, vol, len);
}
// whispering: shaped noise through moving formants
export function whisper(pos, muffled = 0, len = 1.6, vol = 0.18) {
  if (!ctx) return; const t = now();
  const n = noise(), g = out(pos, muffled, 0.6), hp = filt('highpass', 900);
  const f1 = filt('bandpass', 1200, 6), f2 = filt('bandpass', 2600, 8), mix = ctx.createGain();
  n.connect(hp); hp.connect(f1).connect(mix); hp.connect(f2).connect(mix); mix.connect(g);
  const syll = Math.floor(len * 5);
  g.gain.setValueAtTime(0.0001, t);
  for (let i = 0; i < syll; i++) { const tt = t + i * (len / syll); g.gain.linearRampToValueAtTime(vol * (0.4 + Math.random() * 0.6), tt + 0.04); g.gain.linearRampToValueAtTime(vol * 0.05, tt + len / syll * 0.9); f1.frequency.setValueAtTime(800 + Math.random() * 900, tt); f2.frequency.setValueAtTime(2000 + Math.random() * 1500, tt); }
  g.gain.linearRampToValueAtTime(0.0001, t + len + 0.1);
  n.start(t, Math.random()); n.stop(t + len + 0.2);
}
// ---------- dread ----------
// the house goes quiet: the rain and the wind drop away for a few seconds (before something happens)
let hushUntil = 0;
export function hush(sec = 3) {
  if (!ctx) return; const t = now(); hushUntil = t + sec;
  amb.gain.cancelScheduledValues(t); amb.gain.setTargetAtTime(0.12, t, 0.35); amb.gain.setTargetAtTime(0.9, t + sec, 1.2);
}
export const hushed = () => !!ctx && now() < hushUntil;
// its neck: a wet crack, then the small clicks of it turning
export function crack(pos, muffled = 0) {
  if (!ctx) return; const t = now();
  for (let i = 0; i < 7; i++) {
    const n = noise(), g = out(pos, muffled, 0.3), b = filt('bandpass', 1400 + Math.random() * 3000, 6);
    const tt = t + (i === 0 ? 0 : 0.12 + i * 0.05 + Math.random() * 0.03);
    n.connect(b).connect(g); env(g, tt, 0.001, i === 0 ? 0.7 : 0.25, i === 0 ? 0.05 : 0.02); n.start(tt, Math.random()); n.stop(tt + 0.12);
  }
}

// ---------- bodies ----------
export function glass(pos, vol = 0.5) {
  if (!ctx) return; const t = now();
  for (let i = 0; i < 14; i++) { const m = noise(), mg = out(pos, 0, 0.3), b = filt('bandpass', 3500 + Math.random() * 5000, 9); m.connect(b).connect(mg); const tt = t + Math.random() * 0.5; env(mg, tt, 0.001, vol * 0.25, 0.06 + Math.random() * 0.1); m.start(tt, Math.random()); m.stop(tt + 0.25); }
}
export function splat(pos, vol = 0.8) {
  if (!ctx) return; const t = now();
  const n = noise(), lp = filt('lowpass', 700), g = out(pos, 0, 0.4); n.connect(lp).connect(g); env(g, t, 0.003, vol, 0.25); n.start(t, Math.random()); n.stop(t + 0.35);
  thud(pos, vol * 0.8, 0, 55);
  for (let i = 0; i < 4; i++) { const m = noise(), mg = out(pos, 0, 0.2), b = filt('bandpass', 400 + Math.random() * 500, 3); m.connect(b).connect(mg); const tt = t + 0.05 + Math.random() * 0.3; env(mg, tt, 0.01, vol * 0.3, 0.12); m.start(tt, Math.random()); m.stop(tt + 0.2); }
}
export function crunch(pos, vol = 0.8) {
  if (!ctx) return; crack(pos, 0); splat(pos, vol);
  const t = now(); for (let i = 0; i < 10; i++) { const n = noise(), g = out(pos, 0, 0.2), b = filt('bandpass', 900 + Math.random() * 2400, 5); const tt = t + Math.random() * 0.2; n.connect(b).connect(g); env(g, tt, 0.001, vol * 0.4, 0.03); n.start(tt, Math.random()); n.stop(tt + 0.08); }
}
// a knife going in: a wet scrape and a pop, again and again (carving)
export function carve(pos, n = 4, gap = 0.28) {
  if (!ctx) return; const t0 = now();
  for (let i = 0; i < n; i++) {
    const t = t0 + i * gap + Math.random() * 0.06;
    const s = noise(), bp = filt('bandpass', 1800 + Math.random() * 1200, 3), g = out(pos, 0, 0.3); s.connect(bp).connect(g);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    bp.frequency.setValueAtTime(2600, t); bp.frequency.exponentialRampToValueAtTime(700, t + 0.18); s.start(t, Math.random()); s.stop(t + 0.2);
    const m = noise(), lp = filt('lowpass', 500), mg = out(pos, 0, 0.3); m.connect(lp).connect(mg); env(mg, t + 0.12, 0.004, 0.4, 0.15); m.start(t + 0.12, Math.random()); m.stop(t + 0.3);
  }
}

// ---------- him ----------
// his step: heavy, slow, a creak of old boots, and you hear it before you see him
export function bigStep(pos, vol = 0.5, muffled = 0, surface = 'dirt') {
  if (!ctx) return; const t = now();
  const o = ctx.createOscillator(); o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(34, t + 0.22);
  const g = out(pos, muffled, 0.5); o.connect(g); env(g, t, 0.006, vol, 0.32); o.start(t); o.stop(t + 0.4);
  const n = noise(), f = filt('bandpass', surface === 'wood' ? 380 : surface === 'leaves' ? 2200 : 600, 0.9), ng = out(pos, muffled, 0.4); n.connect(f).connect(ng); env(ng, t, 0.004, vol * (surface === 'leaves' ? 0.6 : 0.4), surface === 'leaves' ? 0.25 : 0.12); n.start(t, Math.random()); n.stop(t + 0.3);
  if (surface === 'wood' && Math.random() < 0.4) creak(pos, vol * 0.5, muffled, 0.4);
}
// the candle in his head: a low roar that flares when he sees you
let flameG = null, flameF = null, flameP = null;
export function flame(pos, level = 0.3, muffled = 0) {
  if (!ctx) return;
  if (!flameG) {
    const n = noise(true); flameF = filt('lowpass', 500); flameG = ctx.createGain(); flameG.gain.value = 0;
    flameP = ctx.createPanner(); flameP.panningModel = 'HRTF'; flameP.distanceModel = 'inverse'; flameP.refDistance = 1.5; flameP.rolloffFactor = 1.2; flameP.maxDistance = 50;
    n.connect(flameF).connect(flameG).connect(flameP).connect(sfx); n.start();
    const crackle = ctx.createGain(); crackle.gain.value = 0; const cn = noise(true), cb = filt('highpass', 3000); cn.connect(cb).connect(crackle).connect(flameP); cn.start();
    const tick = () => { if (!flameG) return; crackle.gain.setValueAtTime(Math.random() < 0.2 ? flameG.gain.value * 3 : 0, now()); setTimeout(tick, 40 + Math.random() * 120); }; tick();
  }
  if (pos) { if (flameP.positionX) { flameP.positionX.value = pos.x; flameP.positionY.value = pos.y; flameP.positionZ.value = pos.z; } else flameP.setPosition(pos.x, pos.y, pos.z); }
  flameG.gain.setTargetAtTime(level * 0.5, now(), 0.2);
  flameF.frequency.setTargetAtTime((300 + level * 1400) * Math.pow(0.4, muffled), now(), 0.2);
}
// he hums. An old tune, too slow. Returns a handle so it can be moved and stopped.
export function hum(pos) {
  if (!ctx) return { set() {}, stop() {} };
  const g = ctx.createGain(); g.gain.value = 0;
  const p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 1.5; p.rolloffFactor = 1.3; p.maxDistance = 40;
  const lp = filt('lowpass', 700); g.connect(lp).connect(p).connect(sfx); const w = ctx.createGain(); w.gain.value = 0.5; p.connect(w).connect(verbIn);
  const notes = [57, 60, 59, 57, 55, 57, 52, 52, 57, 60, 62, 60, 59, 57, 55, 57];
  let alive = true, i = 0;
  const tick = () => {
    if (!alive) return;
    const n = notes[i++ % notes.length], t = now();
    for (const [mul, ty, v] of [[1, 'sawtooth', 0.05], [2.003, 'triangle', 0.02]]) {
      const o = ctx.createOscillator(); o.type = ty; o.frequency.value = 440 * Math.pow(2, (n - 69 - 12) / 12) * mul;
      const vib = ctx.createOscillator(); vib.frequency.value = 5; const vg = ctx.createGain(); vg.gain.value = 1.5; vib.connect(vg).connect(o.frequency);
      const e = ctx.createGain(); o.connect(e).connect(g); env(e, t, 0.15, v, 0.85); o.start(t); vib.start(t); o.stop(t + 1.1); vib.stop(t + 1.1);
    }
    setTimeout(tick, 900 + (i % 4 === 0 ? 500 : 0));
  };
  tick();
  return {
    set(q, v = 0.6) { if (q) { if (p.positionX) { p.positionX.value = q.x; p.positionY.value = q.y; p.positionZ.value = q.z; } else p.setPosition(q.x, q.y, q.z); } g.gain.setTargetAtTime(v, now(), 0.3); },
    stop() { alive = false; g.gain.setTargetAtTime(0.0001, now(), 0.2); },
  };
}
// the sound he makes when he sees you: a breath in through a hollow head, and the flame going up
export function seen(pos) {
  if (!ctx) return; const t = now();
  const n = noise(), bp = filt('bandpass', 400, 2), g = out(pos, 0, 0.7); n.connect(bp).connect(g);
  bp.frequency.setValueAtTime(250, t); bp.frequency.exponentialRampToValueAtTime(1400, t + 0.9);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.7, t + 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2); n.start(t); n.stop(t + 1.3);
  sting(0.45);
}
// his scream, when he has you
export function roar(pos, vol = 1) {
  if (!ctx) return; const t = now(), len = 1.8, g = out(pos, 0, 0.8);
  for (const [fq, ty] of [[110, 'sawtooth'], [116, 'sawtooth'], [233, 'square'], [55, 'sawtooth']]) {
    const o = ctx.createOscillator(); o.type = ty; o.frequency.setValueAtTime(fq * 1.3, t); o.frequency.exponentialRampToValueAtTime(fq * 0.7, t + len);
    const og = ctx.createGain(); og.gain.value = 0.12; const lp = filt('lowpass', 1600); o.connect(lp).connect(og).connect(g); o.start(t); o.stop(t + len);
  }
  const n = noise(), bp = filt('bandpass', 700, 0.6), ng = ctx.createGain(); ng.gain.value = 0.8; n.connect(bp).connect(ng).connect(g); n.start(t); n.stop(t + len);
  env(g, t, 0.05, vol, len);
}

// ---------- the street ----------
// the walkie-talkie: a static loop whose level you set every frame (it gets louder when he's near), and a squelch
let walkG = null, walkF = null;
export function walkie(level) {
  if (!ctx) return;
  if (!walkG) { const n = noise(true); walkF = filt('bandpass', 2400, 0.8); walkG = ctx.createGain(); walkG.gain.value = 0; const cr = ctx.createGain(); n.connect(walkF).connect(cr).connect(walkG).connect(sfx); n.start(); const tick = () => { cr.gain.setValueAtTime(0.3 + Math.random() * 0.9, now()); setTimeout(tick, 25 + Math.random() * 80); }; tick(); }
  walkG.gain.setTargetAtTime(level * 0.09, now(), 0.08);
  walkF.frequency.setTargetAtTime(1800 + level * 1600, now(), 0.1);
}
export function squelch() {
  if (!ctx) return; const t = now(); const n = noise(), hp = filt('bandpass', 2600, 1), g = out(null, 0, 0.05); n.connect(hp).connect(g); env(g, t, 0.005, 0.2, 0.18); n.start(t, Math.random()); n.stop(t + 0.25);
  const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 1400; const og = out(null, 0, 0); o.connect(og); env(og, t + 0.18, 0.002, 0.04, 0.05); o.start(t + 0.18); o.stop(t + 0.26);
}
// a neighbour's shriek: the whole street hears it, and so does he
export function shriek(pos) {
  if (!ctx) return; const t = now(), len = 2.2, g = out(pos, 0, 0.9);
  for (const fq of [880, 932, 1245]) {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(fq * 0.8, t); o.frequency.linearRampToValueAtTime(fq, t + 0.3); o.frequency.linearRampToValueAtTime(fq * 0.95, t + len);
    const vib = ctx.createOscillator(); vib.frequency.value = 7; const vg = ctx.createGain(); vg.gain.value = fq * 0.03; vib.connect(vg).connect(o.frequency); vib.start(t); vib.stop(t + len);
    const og = ctx.createGain(); og.gain.value = 0.06; const bp = filt('bandpass', 1500, 1.5); o.connect(bp).connect(og).connect(g); o.start(t); o.stop(t + len);
  }
  env(g, t, 0.08, 1.0, len);
}
// a doorbell (ding-dong), far off: other children, somewhere, still trick-or-treating
export function doorbell(pos, muffled = 0) {
  if (!ctx) return; const t = now();
  for (const [fq, d] of [[659, 0], [523, 0.5]]) { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = fq; const g = out(pos, muffled, 0.6); o.connect(g); env(g, t + d, 0.005, 0.14, 1.4); o.start(t + d); o.stop(t + d + 1.5); }
}
// children laughing, far away, through the fog (formant-filtered noise bursts)
export function giggle(pos, vol = 0.12, muffled = 0.3) {
  if (!ctx) return; const t = now(), n = 4 + ((Math.random() * 4) | 0);
  for (let i = 0; i < n; i++) {
    const tt = t + i * (0.11 + Math.random() * 0.04);
    const o = ctx.createOscillator(); o.type = 'triangle'; const f = 520 + Math.random() * 180; o.frequency.setValueAtTime(f * 1.15, tt); o.frequency.exponentialRampToValueAtTime(f * 0.9, tt + 0.09);
    const bp = filt('bandpass', 1600, 2), g = out(pos, muffled, 0.6); o.connect(bp).connect(g); env(g, tt, 0.01, vol * (1 - i / n * 0.5), 0.08); o.start(tt); o.stop(tt + 0.12);
  }
}
export function dog(pos, muffled = 0.4) {
  if (!ctx) return; const t = now();
  for (let i = 0; i < 2 + ((Math.random() * 2) | 0); i++) {
    const tt = t + i * 0.32, o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(420, tt); o.frequency.exponentialRampToValueAtTime(240, tt + 0.12);
    const bp = filt('bandpass', 900, 1.5), g = out(pos, muffled, 0.7); o.connect(bp).connect(g); env(g, tt, 0.005, 0.12, 0.13); o.start(tt); o.stop(tt + 0.16);
  }
}
export function candy() { // a wrapper crinkling
  if (!ctx) return; const t = now();
  for (let i = 0; i < 6; i++) { const n = noise(), g = out(null, 0, 0.05), bp = filt('bandpass', 4000 + Math.random() * 3000, 3); n.connect(bp).connect(g); const tt = t + i * 0.03 + Math.random() * 0.02; env(g, tt, 0.002, 0.1, 0.03); n.start(tt, Math.random()); n.stop(tt + 0.05); }
}
// a music box, out of tune (the Ferris house; Lisa's)
export function musicBox(pos) {
  if (!ctx) return { stop() {} };
  const notes = [76, 79, 84, 83, 79, 76, 74, 76, 79, 77, 74, 71, 72];
  let alive = true, i = 0;
  const tick = () => {
    if (!alive) return;
    const n = notes[i++ % notes.length], t = now();
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 440 * Math.pow(2, (n - 69) / 12) * (1 + (Math.random() - 0.5) * 0.012);
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = o.frequency.value * 3.01;
    const g = out(pos, 0, 0.6), g2 = ctx.createGain(); g2.gain.value = 0.25; o.connect(g); o2.connect(g2).connect(g); env(g, t, 0.003, 0.08, 1.2); o.start(t); o2.start(t); o.stop(t + 1.3); o2.stop(t + 1.3);
    setTimeout(tick, (i % notes.length === 0 ? 1800 : 420) * (1 + i * 0.002));
  };
  tick();
  return { stop() { alive = false; } };
}
// the guillotine: the chain rattling it up, and the drop
export function chain(pos, len = 1.2) {
  if (!ctx) return; const t = now();
  for (let i = 0; i < len * 14; i++) { const n = noise(), g = out(pos, 0, 0.4), b = filt('bandpass', 2500 + Math.random() * 3000, 8); const tt = t + i / 14 + Math.random() * 0.03; n.connect(b).connect(g); env(g, tt, 0.001, 0.12, 0.04); n.start(tt, Math.random()); n.stop(tt + 0.06); }
}
export function blade(pos) {
  if (!ctx) return; const t = now();
  const n = noise(), bp = filt('bandpass', 3000, 2), g = out(pos, 0, 0.5); n.connect(bp).connect(g); bp.frequency.setValueAtTime(5000, t); bp.frequency.exponentialRampToValueAtTime(800, t + 0.15); env(g, t, 0.01, 0.4, 0.15); n.start(t, Math.random()); n.stop(t + 0.2);
  setTimeout(() => thud(pos, 0.9, 0, 80), 150);
}
// a pop-up prop: a spring, a rattle, a canned cackle
export function popup(pos) {
  if (!ctx) return; const t = now();
  const o = ctx.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(900, t + 0.12); const g = out(pos, 0, 0.3); o.connect(g); env(g, t, 0.002, 0.2, 0.2); o.start(t); o.stop(t + 0.25);
  for (let i = 0; i < 12; i++) { const n = noise(), ng = out(pos, 0, 0.2), b = filt('bandpass', 1500 + Math.random() * 2500, 6); const tt = t + 0.05 + i * 0.04; n.connect(b).connect(ng); env(ng, tt, 0.001, 0.2, 0.03); n.start(tt, Math.random()); n.stop(tt + 0.05); }
  for (let i = 0; i < 6; i++) { const tt = t + 0.3 + i * 0.13; const c = ctx.createOscillator(); c.type = 'sawtooth'; c.frequency.setValueAtTime(300 - i * 10, tt); c.frequency.exponentialRampToValueAtTime(200, tt + 0.1); const cg = out(pos, 0, 0.4), lp = filt('bandpass', 1100, 2); c.connect(lp).connect(cg); env(cg, tt, 0.005, 0.15, 0.1); c.start(tt); c.stop(tt + 0.12); }
  sting(0.35);
}
// the TV: static
let tvH = null;
export function tv(pos, on) {
  if (!ctx) return;
  if (on && !tvH) tvH = staticLoop(pos, 0.05);
  if (!on && tvH) { tvH.stop(); tvH = null; }
}

// ---------- ambience: wind in dead leaves, crickets, a far-off dog, the corn ----------
let windG, windF, crickG, droneG, droneF, cornG, heartT = 0, eventT = 4;
function startAmbience() {
  const w = noise(true); windF = filt('bandpass', 500, 0.5); windG = ctx.createGain(); windG.gain.value = 0.05;
  w.connect(windF).connect(windG).connect(amb); w.start();
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lg = ctx.createGain(); lg.gain.value = 260; lfo.connect(lg).connect(windF.frequency); lfo.start();
  const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.11; const lg2 = ctx.createGain(); lg2.gain.value = 0.03; lfo2.connect(lg2).connect(windG.gain); lfo2.start();
  crickG = ctx.createGain(); crickG.gain.value = 0; crickG.connect(amb);
  for (const [fq, rate] of [[4200, 13], [4700, 17], [3900, 11]]) {
    const o = ctx.createOscillator(); o.frequency.value = fq; const am = ctx.createOscillator(); am.type = 'square'; am.frequency.value = rate; const ag = ctx.createGain(); ag.gain.value = 0.5; const g = ctx.createGain(); g.gain.value = 0.5; am.connect(ag).connect(g.gain);
    const slow = ctx.createOscillator(); slow.frequency.value = 0.3 + Math.random() * 0.3; const sg = ctx.createGain(); sg.gain.value = 0.5; slow.connect(sg).connect(g.gain); slow.start();
    o.connect(g).connect(crickG); o.start(); am.start();
  }
  const c = noise(true), cf = filt('bandpass', 1400, 0.6); cornG = ctx.createGain(); cornG.gain.value = 0; c.connect(cf).connect(cornG).connect(amb); c.start();
  droneG = ctx.createGain(); droneG.gain.value = 0; droneF = filt('lowpass', 200);
  for (const fq of [41, 41.6, 61.7, 82.6]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fq; o.connect(droneF); o.start(); }
  droneF.connect(droneG).connect(amb);
}
// outdoors 0..1, fear 0..1, corn (moving through it) 0..1, crickets (they stop when he's near)
export function ambience(dt, { outdoors = 1, fear = 0, corn = 0, crickets = 1, listener = null }) {
  if (!ctx) return;
  const t = now();
  windG.gain.setTargetAtTime(0.02 + outdoors * 0.06, t, 0.5);
  crickG.gain.setTargetAtTime(crickets * outdoors * 0.004, t, 0.8);
  cornG.gain.setTargetAtTime(corn * 0.12, t, 0.1);
  droneG.gain.setTargetAtTime(fear * 0.14, t, 0.6);
  droneF.frequency.setTargetAtTime(120 + fear * 500, t, 0.6);
  if ((eventT -= dt) <= 0) {
    eventT = 7 + Math.random() * 14;
    if (!listener) return;
    const a = Math.random() * 6.3, d = 25 + Math.random() * 25, pos = { x: listener.x + Math.cos(a) * d, y: 1.5, z: listener.z + Math.sin(a) * d };
    const r = Math.random();
    if (r < 0.3) giggle(pos, 0.1, 0.5); else if (r < 0.5) dog(pos, 0.5); else if (r < 0.62) doorbell(pos, 0.6); else if (r < 0.75 && outdoors) creak(pos, 0.12, 0.3, 0.9);
  }
}
export function heartbeat(dt, bpm, vol) {
  if (!ctx || vol < 0.01) return;
  heartT -= dt; if (heartT > 0) return; heartT = 60 / bpm;
  const t = now();
  for (const [o, v] of [[0, 1], [0.16, 0.7]]) { const s = ctx.createOscillator(); s.frequency.setValueAtTime(70, t + o); s.frequency.exponentialRampToValueAtTime(38, t + o + 0.12); const g = out(null, 0, 0); s.connect(g); env(g, t + o, 0.008, vol * v, 0.16); s.start(t + o); s.stop(t + o + 0.25); }
}
export function presence(vol = 0.3, len = 3) {
  if (!ctx) return; const t = now();
  for (const fq of [55, 58.3, 110.5]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fq; const lp = filt('lowpass', 300); const g = out(null, 0, 0.8); o.connect(lp).connect(g); env(g, t, 0.6, vol * 0.2, len); o.start(t); o.stop(t + len + 0.7); }
}
export function gasp() {
  if (!ctx) return; const t = now(); const n = noise(), bp = filt('bandpass', 900, 1.5), g = out(null, 0, 0.1); n.connect(bp).connect(g);
  bp.frequency.setValueAtTime(600, t); bp.frequency.linearRampToValueAtTime(1400, t + 0.35); env(g, t, 0.05, 0.35, 0.4); n.start(t, Math.random()); n.stop(t + 0.5);
}
