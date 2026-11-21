// Every texture is painted on canvases at load time: siding, shingles, grass, leaves, pumpkins and their carved
// faces, masks, notes, the TV static. Nothing is downloaded.
import * as THREE from 'three';

const cache = new Map();
export const rng = (seed) => { let s = (seed * 2654435761) >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const shade = (n, k) => { const r = Math.min(255, ((n >> 16) & 255) * k) | 0, g = Math.min(255, ((n >> 8) & 255) * k) | 0, b = Math.min(255, (n & 255) * k) | 0; return `rgb(${r},${g},${b})`; };

function noise(g, w, h, r, amt, size = 1) {
  for (let i = 0; i < (w * h) / (size * size) * 0.5; i++) {
    const v = (r() - 0.5) * amt;
    g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
    g.fillRect((r() * w) | 0, (r() * h) | 0, size, size);
  }
}
function grime(g, w, h, r, amt = 1, drips = true) {
  for (let i = 0; i < 14 * amt; i++) {
    const x = r() * w, y = r() * h, rad = 8 + r() * 40;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(20,14,6,${0.08 + r() * 0.12})`); gr.addColorStop(1, 'rgba(20,14,6,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  if (drips) for (let i = 0; i < 6 * amt; i++) {
    const x = r() * w, y0 = r() * h * 0.5, len = 30 + r() * 120;
    const gr = g.createLinearGradient(0, y0, 0, y0 + len);
    gr.addColorStop(0, 'rgba(30,22,10,0.18)'); gr.addColorStop(1, 'rgba(30,22,10,0)');
    g.fillStyle = gr; g.fillRect(x, y0, 1 + r() * 3, len);
  }
}
function done(c, name) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  cache.set(name, t); return t;
}

// ---------- inside ----------
// wallpaper: one texture is 2 m across and 2.8 m high, with a skirting board at the bottom
export function wallpaper(name, base, ink, kind = 'stripe', seed = 1) {
  if (cache.has(name)) return cache.get(name);
  const [c, g] = mk(256, 360), r = rng(seed);
  g.fillStyle = hex(base); g.fillRect(0, 0, 256, 360);
  g.fillStyle = hex(ink); g.strokeStyle = hex(ink);
  if (kind === 'stripe') { for (let x = 0; x < 256; x += 32) { g.globalAlpha = 0.25; g.fillRect(x, 0, 12, 360); g.globalAlpha = 0.12; g.fillRect(x + 18, 0, 3, 360); } }
  else if (kind === 'damask') {
    g.globalAlpha = 0.22;
    for (let y = 0; y < 360; y += 45) for (let x = (y / 45) % 2 ? 32 : 0; x < 288; x += 64) {
      g.beginPath(); g.ellipse(x, y + 22, 10, 17, 0, 0, 7); g.fill();
      g.beginPath(); g.moveTo(x, y + 2); g.lineTo(x - 12, y + 22); g.lineTo(x, y + 43); g.lineTo(x + 12, y + 22); g.closePath(); g.lineWidth = 2; g.stroke();
    }
  } else if (kind === 'dots') {
    g.globalAlpha = 0.25;
    for (let y = 8; y < 360; y += 20) for (let x = (y / 20) % 2 ? 10 : 0; x < 256; x += 20) { g.beginPath(); g.arc(x, y, 2.4, 0, 7); g.fill(); }
  }
  g.globalAlpha = 1;
  for (let x = 0; x < 256; x += 128) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x, 0, 1, 360); }
  noise(g, 256, 360, r, 0.08);
  grime(g, 256, 360, r, 0.6);
  g.fillStyle = shade(base, 0.5); g.fillRect(0, 344, 256, 16);
  g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(0, 344, 256, 2);
  return done(c, name);
}
export function planks(name, base, seed = 2) {
  if (cache.has(name)) return cache.get(name);
  const [c, g] = mk(256, 256), r = rng(seed);
  for (let y = 0; y < 256; y += 32) {
    let x = -r() * 200;
    while (x < 256) {
      const len = 90 + r() * 160, k = 0.8 + r() * 0.35;
      g.fillStyle = shade(base, k); g.fillRect(x, y, len, 32);
      g.strokeStyle = 'rgba(0,0,0,0.12)';
      for (let i = 0; i < 5; i++) { g.beginPath(); const yy = y + 4 + r() * 24; g.moveTo(x, yy); g.bezierCurveTo(x + len * 0.3, yy + r() * 6 - 3, x + len * 0.6, yy + r() * 6 - 3, x + len, yy); g.stroke(); }
      g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(x, y, 2, 32);
      x += len;
    }
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, y, 256, 2);
  }
  noise(g, 256, 256, r, 0.08);
  return done(c, name);
}
export function tiles(name, a, b, size = 8, seed = 4) {
  if (cache.has(name)) return cache.get(name);
  const [c, g] = mk(256, 256), r = rng(seed), s = 256 / size;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { g.fillStyle = shade((x + y) % 2 ? a : b, 0.9 + r() * 0.15); g.fillRect(x * s, y * s, s, s); }
  g.strokeStyle = 'rgba(60,55,45,0.6)'; g.lineWidth = 2;
  for (let i = 0; i <= size; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, 256); g.moveTo(0, i * s); g.lineTo(256, i * s); g.stroke(); }
  noise(g, 256, 256, r, 0.07);
  return done(c, name);
}
export function concrete(name, base, seed = 5) {
  if (cache.has(name)) return cache.get(name);
  const [c, g] = mk(256, 256), r = rng(seed);
  g.fillStyle = hex(base); g.fillRect(0, 0, 256, 256);
  noise(g, 256, 256, r, 0.25); noise(g, 256, 256, r, 0.12, 3);
  g.strokeStyle = 'rgba(0,0,0,0.3)';
  for (let i = 0; i < 4; i++) { g.beginPath(); let x = r() * 256, y = r() * 256; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += r() * 30 - 15; y += r() * 30 - 15; g.lineTo(x, y); } g.stroke(); }
  grime(g, 256, 256, r, 1.4);
  return done(c, name);
}
export function plaster(name, base, seed = 6) {
  if (cache.has(name)) return cache.get(name);
  const [c, g] = mk(128, 128), r = rng(seed);
  g.fillStyle = hex(base); g.fillRect(0, 0, 128, 128);
  noise(g, 128, 128, r, 0.08, 2); grime(g, 128, 128, r, 0.4, false);
  return done(c, name);
}
export function wood(name, base, seed = 7) {
  if (cache.has(name)) return cache.get(name);
  const [c, g] = mk(128, 128), r = rng(seed);
  g.fillStyle = hex(base); g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(0,0,0,0.18)';
  for (let i = 0; i < 18; i++) { g.beginPath(); const y = r() * 128; g.moveTo(0, y); g.bezierCurveTo(40, y + r() * 8 - 4, 90, y + r() * 8 - 4, 128, y); g.stroke(); }
  noise(g, 128, 128, r, 0.08);
  return done(c, name);
}
export function fabric(name, base, seed = 8) {
  if (cache.has(name)) return cache.get(name);
  const [c, g] = mk(64, 64), r = rng(seed);
  g.fillStyle = hex(base); g.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 64; i += 2) { g.fillStyle = 'rgba(0,0,0,0.07)'; g.fillRect(i, 0, 1, 64); g.fillRect(0, i, 64, 1); }
  noise(g, 64, 64, r, 0.12);
  return done(c, name);
}

// ---------- outside ----------
export function brick(name, base = 0x7a3a28, seed = 12) {
  if (cache.has(name)) return cache.get(name);
  const [c, g] = mk(256, 256), r = rng(seed);
  g.fillStyle = '#4a4240'; g.fillRect(0, 0, 256, 256);
  for (let y = 0, row = 0; y < 256; y += 16, row++) for (let x = (row % 2) * -16; x < 256; x += 32) {
    g.fillStyle = shade(base, 0.72 + r() * 0.4); g.fillRect(x + 1, y + 1, 30, 14);
  }
  noise(g, 256, 256, r, 0.12); grime(g, 256, 256, r, 1);
  return done(c, name);
}
export function asphalt(name = 'asphalt', seed = 13) {
  if (cache.has(name)) return cache.get(name);
  const [c, g] = mk(256, 256), r = rng(seed);
  g.fillStyle = '#34343a'; g.fillRect(0, 0, 256, 256);
  noise(g, 256, 256, r, 0.3); noise(g, 256, 256, r, 0.15, 2);
  g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) { g.beginPath(); let x = r() * 256, y = r() * 256; g.moveTo(x, y); for (let k = 0; k < 10; k++) { x += r() * 24 - 12; y += r() * 24 - 12; g.lineTo(x, y); } g.stroke(); }
  return done(c, name);
}
export function paving(name = 'paving', seed = 14) {
  if (cache.has(name)) return cache.get(name);
  const [c, g] = mk(256, 256), r = rng(seed);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = shade(0x9a968e, 0.82 + r() * 0.22); g.fillRect(x * 64, y * 64, 64, 64); }
  g.strokeStyle = 'rgba(40,38,35,0.7)'; g.lineWidth = 2;
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 256); g.moveTo(0, i * 64); g.lineTo(256, i * 64); g.stroke(); }
  noise(g, 256, 256, r, 0.14); grime(g, 256, 256, r, 0.6, false);
  return done(c, name);
}
// a building front across the street: rows of windows, a few lit
export function facade(name, base, seed = 15, lit = 0.15) {
  if (cache.has(name)) return cache.get(name);
  const [c, g] = mk(256, 256), r = rng(seed);
  g.fillStyle = hex(base); g.fillRect(0, 0, 256, 256);
  noise(g, 256, 256, r, 0.12);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const wx = x * 64 + 14, wy = y * 64 + 12;
    g.fillStyle = '#d8d0c0'; g.fillRect(wx - 3, wy - 3, 42, 46);
    g.fillStyle = r() < lit ? '#c8a860' : '#26303a'; g.fillRect(wx, wy, 36, 40);
    g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(wx, wy, 36, 14);
    g.fillStyle = '#d8d0c0'; g.fillRect(wx + 17, wy, 2, 40);
  }
  grime(g, 256, 256, r, 1.2);
  return done(c, name);
}

// ---------- faces ----------
// A face painted round a sphere. Canvas x = 1/4 of the width is the front (+z) of a three.js SphereGeometry,
// the top of the canvas is the top of the head. f = { skin, eye, hair, brow, beard, lips, age, bald } or null: no face.
// raw = the edges of a face that was just taken.
export function face(name, f, raw = false) {
  if (cache.has(name)) return cache.get(name);
  const [c, g] = mk(256, 128), r = rng(name.length * 31 + 7);
  const skin = f ? f.skin : 0xc8a890;
  g.fillStyle = hex(skin); g.fillRect(0, 0, 256, 128);
  noise(g, 256, 128, r, 0.05);
  const cx = 64, blank = !f || f.none;
  if (blank) {
    // smooth skin where the face should be: faint hollows for eyes, the ghost of a nose
    for (const dx of [-11, 11]) { const gr = g.createRadialGradient(cx + dx, 54, 0, cx + dx, 54, 12); gr.addColorStop(0, 'rgba(70,40,30,0.2)'); gr.addColorStop(1, 'rgba(70,40,30,0)'); g.fillStyle = gr; g.fillRect(cx + dx - 14, 40, 28, 28); }
    const gr = g.createLinearGradient(cx - 5, 0, cx + 5, 0); gr.addColorStop(0, 'rgba(255,245,235,0)'); gr.addColorStop(0.5, 'rgba(255,245,235,0.14)'); gr.addColorStop(1, 'rgba(255,245,235,0)');
    g.fillStyle = gr; g.fillRect(cx - 5, 50, 10, 24);
    if (raw) {
      g.lineWidth = 5; g.strokeStyle = 'rgba(120,8,6,0.95)'; g.beginPath(); g.ellipse(cx, 64, 25, 34, 0, 0, 7); g.stroke();
      g.fillStyle = 'rgba(110,6,4,0.9)'; for (let i = 0; i < 12; i++) g.fillRect(cx - 22 + r() * 44, 84 + r() * 8, 2, 10 + r() * 34);
    }
  } else {
    const sh = (x, y, rad, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, `rgba(80,40,30,${a})`); gr.addColorStop(1, 'rgba(80,40,30,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); };
    sh(cx - 11, 54, 9, 0.22); sh(cx + 11, 54, 9, 0.22); sh(cx, 74, 6, 0.18);
    for (const dx of [-11, 11]) {
      g.fillStyle = '#eee8e0'; g.beginPath(); g.ellipse(cx + dx, 55, 5, 2.6, 0, 0, 7); g.fill();
      g.fillStyle = hex(f.eye ?? 0x4a3020); g.beginPath(); g.arc(cx + dx, 55, 2.2, 0, 7); g.fill();
      g.fillStyle = '#000'; g.beginPath(); g.arc(cx + dx, 55, 1, 0, 7); g.fill();
      g.strokeStyle = 'rgba(40,20,10,0.7)'; g.lineWidth = 1; g.beginPath(); g.ellipse(cx + dx, 55, 5.2, 2.8, 0, Math.PI, 0); g.stroke();
      if ((f.age || 30) > 50) { g.strokeStyle = 'rgba(80,40,30,0.35)'; g.beginPath(); g.moveTo(cx + dx - 5, 60); g.quadraticCurveTo(cx + dx, 62, cx + dx + 5, 60); g.stroke(); }
      g.fillStyle = hex(f.brow ?? 0x2a1a10); g.save(); g.translate(cx + dx, 48); g.rotate(dx < 0 ? 0.08 : -0.08); g.fillRect(-6, -1.2, 12, 2.6); g.restore();
    }
    g.strokeStyle = 'rgba(70,35,25,0.45)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(cx - 1, 58); g.lineTo(cx - 3, 70); g.lineTo(cx + 3, 71); g.stroke();
    g.fillStyle = hex(f.lips ?? 0x9a5048); g.beginPath(); g.ellipse(cx, 81, 7, 1.8, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(50,20,15,0.6)'; g.beginPath(); g.moveTo(cx - 7, 81); g.lineTo(cx + 7, 81); g.stroke();
    if (f.beard !== undefined) { g.fillStyle = hex(f.beard); g.globalAlpha = 0.5; for (let i = 0; i < 300; i++) { const a = r() * Math.PI, rr = 16 + r() * 9; g.fillRect(cx + Math.cos(a) * rr * 0.95, 68 + Math.sin(a) * rr * 0.9, 1.5, 1.5); } g.globalAlpha = 1; }
  }
  if (f && f.hair !== undefined) {
    g.fillStyle = hex(f.hair);
    if (f.bald) g.fillRect(0, 0, 256, 6);
    else { g.fillRect(0, 0, 256, 36); g.fillRect(cx + 46, 0, 164, 84); g.beginPath(); g.ellipse(cx, 34, 34, 9, 0, 0, Math.PI); g.fill(); }
    noise(g, 256, 40, r, 0.15);
  }
  return done(c, name);
}

// ---------- signs and print ----------
export function sign(text, { w = 256, h = 64, bg = '#1a3a6a', fg = '#fff', font = 'bold 30px Arial, sans-serif', border = null } = {}) {
  const name = 'sign-' + text + bg + fg + w + h + font;
  if (cache.has(name)) return cache.get(name);
  const [c, g] = mk(w, h);
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); } else g.clearRect(0, 0, w, h);
  if (border) { g.strokeStyle = border; g.lineWidth = 4; g.strokeRect(4, 4, w - 8, h - 8); }
  g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  const lines = text.split('\n'); const lh = parseInt(/(\d+)px/.exec(font)[1], 10) * 1.15;
  lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * lh));
  const t = done(c, name); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
// a canvas to redraw every so often (the TV, the alarm clock, the walk signal)
export function screen(w, h) {
  const [c, g] = mk(w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.g = g; t.w = w; t.h = h;
  return t;
}
// writing on a wall
export function scrawl(text, color = '#6a0a06', w = 512, h = 128) {
  const name = 'scrawl-' + text + color;
  if (cache.has(name)) return cache.get(name);
  const [c, g] = mk(w, h), r = rng(text.length * 13);
  g.clearRect(0, 0, w, h);
  g.fillStyle = color; g.font = `bold ${Math.floor(h * 0.5)}px "Special Elite", "Courier New", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 2, h * 0.42);
  for (let i = 0; i < text.length * 2; i++) g.fillRect(w * 0.08 + r() * w * 0.84, h * 0.55, 2 + r() * 2, 8 + r() * h * 0.4);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; cache.set(name, t); return t;
}
// a blood splat (with alpha) for floors and walls
export function splat(seed = 1) {
  const name = 'splat' + seed;
  if (cache.has(name)) return cache.get(name);
  const [c, g] = mk(128, 128), r = rng(seed * 7 + 3);
  g.clearRect(0, 0, 128, 128);
  const col = () => `rgba(${80 + r() * 40 | 0},${r() * 6 | 0},${r() * 5 | 0},${0.88 + r() * 0.12})`;
  g.fillStyle = col(); g.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, rr = 22 + r() * 22; g.lineTo(64 + Math.cos(a) * rr, 64 + Math.sin(a) * rr); } g.fill();
  for (let i = 0; i < 28; i++) { const a = r() * 7, d = 30 + r() * 30, s = 1 + r() * 5; g.fillStyle = col(); g.beginPath(); g.arc(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, s, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; cache.set(name, t); return t;
}
