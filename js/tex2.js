// Hollow Lane's own textures, painted on canvases: siding, shingles, dead lawns, pumpkins and their carved faces,
// cheap plastic masks, corn, leaves, the moon, hand-painted signs, photographs, paper.
import * as THREE from 'three';
import { rng } from './tex.js';

const cache = new Map();
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
function done(c, name, clamp = false) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  cache.set(name, t); return t;
}

// clapboard siding: one texture is 2 m wide, 2 m high
export function siding(name, base, seed = 30) {
  if (cache.has(name)) return cache.get(name);
  const [c, g] = mk(256, 256), r = rng(seed);
  for (let y = 0; y < 256; y += 16) {
    g.fillStyle = shade(base, 0.85 + r() * 0.2); g.fillRect(0, y, 256, 16);
    const gr = g.createLinearGradient(0, y, 0, y + 16); gr.addColorStop(0, 'rgba(255,255,255,0.08)'); gr.addColorStop(0.8, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.45)');
    g.fillStyle = gr; g.fillRect(0, y, 256, 16);
    if (r() < 0.3) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect((r() * 256) | 0, y, 2, 16); }
  }
  noise(g, 256, 256, r, 0.1); grime(g, 256, 256, r, 1.3);
  for (let i = 0; i < 20; i++) { g.fillStyle = `rgba(60,50,40,${0.2 + r() * 0.3})`; g.fillRect(r() * 256, r() * 256, 3 + r() * 14, 2 + r() * 4); }
  return done(c, name);
}
export function shingles(name, base, seed = 31) {
  if (cache.has(name)) return cache.get(name);
  const [c, g] = mk(256, 256), r = rng(seed);
  g.fillStyle = shade(base, 0.5); g.fillRect(0, 0, 256, 256);
  for (let y = 0, row = 0; y < 256; y += 20, row++) for (let x = (row % 2) * -16; x < 256; x += 32) {
    g.fillStyle = shade(base, 0.7 + r() * 0.45); g.fillRect(x + 1, y, 30, 19);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x + 1, y + 16, 30, 3);
  }
  noise(g, 256, 256, r, 0.15); grime(g, 256, 256, r, 0.8, false);
  return done(c, name);
}
// dead lawn: dark, patchy, leaves everywhere
export function lawn(name = 'lawn', seed = 32, base = 0x2e3a1e) {
  if (cache.has(name)) return cache.get(name);
  const [c, g] = mk(256, 256), r = rng(seed);
  g.fillStyle = hex(base); g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) { const k = 0.6 + r() * 0.8; g.fillStyle = shade(r() < 0.3 ? 0x5a5030 : base, k); g.fillRect(r() * 256, r() * 256, 1, 2 + r() * 4); }
  for (let i = 0; i < 60; i++) {
    const x = r() * 256, y = r() * 256, a = r() * 6.3, s = 3 + r() * 4;
    g.fillStyle = ['#7a3a10', '#9a5a14', '#5a2a10', '#8a6a20', '#6a2010'][(r() * 5) | 0];
    g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.ellipse(0, 0, s, s * 0.55, 0, 0, 7); g.fill(); g.restore();
  }
  noise(g, 256, 256, r, 0.12, 2);
  return done(c, name);
}
export function dirt(name = 'dirt', seed = 33, base = 0x3a2a1a) {
  if (cache.has(name)) return cache.get(name);
  const [c, g] = mk(256, 256), r = rng(seed);
  g.fillStyle = hex(base); g.fillRect(0, 0, 256, 256);
  noise(g, 256, 256, r, 0.3, 2); noise(g, 256, 256, r, 0.2, 4);
  for (let y = 0; y < 256; y += 32) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, y + r() * 6, 256, 8); }
  return done(c, name);
}
// a pumpkin's skin round a sphere: vertical ribs, a little rot
export function pumpkinSkin(seed = 40, base = 0xd8640e) {
  const name = 'pskin' + seed + base;
  if (cache.has(name)) return cache.get(name);
  const [c, g] = mk(256, 128), r = rng(seed);
  for (let x = 0; x < 256; x++) { const k = 0.62 + 0.42 * Math.pow(Math.abs(Math.sin((x / 256) * Math.PI * 10)), 0.5); g.fillStyle = shade(base, k); g.fillRect(x, 0, 1, 128); }
  const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(60,40,0,0.6)'); gr.addColorStop(0.18, 'rgba(0,0,0,0)'); gr.addColorStop(0.82, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(40,20,0,0.7)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
  noise(g, 256, 128, r, 0.12);
  for (let i = 0; i < 5; i++) { const x = r() * 256, y = 30 + r() * 70, rad = 4 + r() * 10; const q = g.createRadialGradient(x, y, 0, x, y, rad); q.addColorStop(0, 'rgba(40,30,0,0.5)'); q.addColorStop(1, 'rgba(40,30,0,0)'); g.fillStyle = q; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  return done(c, name);
}
// a carved face: the cut-out shapes on the skin and a matching glow map (the candle through the holes).
// kind: classic | grin | angry | scream | pm (his long jagged mouth) | name (carved letters). The front is at 1/4 width.
function faceShapes(g, kind, text, r) {
  const cx = 64, poly = (pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(cx + x, y) : g.moveTo(cx + x, y))); g.closePath(); g.fill(); };
  if (kind === 'name') {
    g.font = 'bold 15px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const [a, b] = text.split('|'); g.fillText(a, cx, 58); if (b) { g.font = 'bold 13px Georgia, serif'; g.fillText(b, cx, 76); }
    poly([[-20, 42], [-10, 42], [-15, 33]]); poly([[20, 42], [10, 42], [15, 33]]);
    return;
  }
  if (kind === 'pm') {
    poly([[-28, 38], [-5, 50], [-9, 59], [-25, 52]]); poly([[28, 38], [5, 50], [9, 59], [25, 52]]);
    poly([[-3, 61], [3, 61], [0, 69]]);
    const m = [];
    for (let i = 0; i <= 12; i++) m.push([-36 + i * 6, (i % 2 ? 82 : 74) + Math.abs(6 - i) * -0.5]);
    for (let i = 12; i >= 0; i--) m.push([-36 + i * 6, (i % 2 ? 92 : 100) - Math.abs(6 - i) * 1.4]);
    poly(m); return;
  }
  const eyes = { classic: [[-20, 52], [-6, 52], [-13, 38]], grin: [[-22, 48], [-6, 48], [-14, 40]], angry: [[-22, 40], [-4, 50], [-20, 54]], scream: [[-20, 40], [-6, 40], [-6, 56], [-20, 56]] }[kind] || [[-20, 52], [-6, 52], [-13, 38]];
  poly(eyes); poly(eyes.map(([x, y]) => [-x, y]));
  poly([[-3, 62], [3, 62], [0, 55]]);
  if (kind === 'scream') { g.beginPath(); g.ellipse(cx, 84, 12, 16, 0, 0, 7); g.fill(); return; }
  const w = kind === 'grin' ? 34 : 26, pts = [[-w, 68]];
  for (let i = 0; i <= 8; i++) { const x = -w + i * (w * 2 / 8); pts.push([x, 76 + (i % 2 ? 6 : 0) + Math.sin((i / 8) * Math.PI) * 6]); }
  pts.push([w, 68]); pts.push([w * 0.4, 86 + r() * 3]); pts.push([0, 90]); pts.push([-w * 0.4, 86]);
  poly(pts);
}
export function carved(kind = 'classic', seed = 41, text = '', base = 0xd8640e) {
  const name = 'carved' + kind + seed + text + base;
  if (cache.has(name)) return cache.get(name);
  const skin = pumpkinSkin(seed, base).image;
  const [c, g] = mk(256, 128), r = rng(seed * 3 + 1);
  g.drawImage(skin, 0, 0);
  g.fillStyle = '#f0c060'; faceShapes(g, kind, text, r);
  const [e, eg] = mk(256, 128);
  eg.fillStyle = '#000'; eg.fillRect(0, 0, 256, 128);
  eg.fillStyle = '#ffb040'; eg.shadowColor = '#ff7010'; eg.shadowBlur = 8; faceShapes(eg, kind, text, rng(seed * 3 + 1));
  const map = done(c, name);
  const glow = new THREE.CanvasTexture(e); glow.colorSpace = THREE.SRGBColorSpace; glow.wrapS = THREE.RepeatWrapping;
  map.glow = glow; return map;
}
// a human head carved like one: skin, the holes, the light inside (what he does to you)
export function carvedHead(skinHex = 0xd8a888) {
  const name = 'chead' + skinHex;
  if (cache.has(name)) return cache.get(name);
  const [c, g] = mk(256, 128), r = rng(77);
  g.fillStyle = hex(skinHex); g.fillRect(0, 0, 256, 128); noise(g, 256, 128, r, 0.06);
  g.fillStyle = '#3a2a1a'; g.fillRect(0, 0, 256, 30); g.fillRect(110, 0, 146, 80);
  g.fillStyle = '#5a0606'; faceShapes(g, 'classic', '', r);
  g.fillStyle = 'rgba(110,4,2,0.9)'; for (let i = 0; i < 22; i++) g.fillRect(36 + r() * 56, 60 + r() * 30, 2, 12 + r() * 40);
  const [e, eg] = mk(256, 128); eg.fillStyle = '#000'; eg.fillRect(0, 0, 256, 128); eg.fillStyle = '#ff9030'; eg.shadowColor = '#ff5010'; eg.shadowBlur = 6; faceShapes(eg, 'classic', '', rng(77));
  const map = done(c, name); const glw = new THREE.CanvasTexture(e); glw.colorSpace = THREE.SRGBColorSpace; map.glow = glw; return map;
}
// cheap plastic masks round a head: the front is the mask, the back is hair
export function mask(kind) {
  const name = 'mask-' + kind;
  if (cache.has(name)) return cache.get(name);
  const [c, g] = mk(256, 128), r = rng(kind.length * 17);
  const cx = 64;
  const hair = { smile: '#2a2420', pig: '#5a4a3a', cat: '#1a1410', witch: '#1a1a1a', skull: '#0e0e10', old: '#b8b8b8', wolf: '#3a2a20', toby: '#5a3a1a', sam: '#3a2414' }[kind] || '#222';
  g.fillStyle = hair; g.fillRect(0, 0, 256, 128); noise(g, 256, 128, r, 0.2);
  const base = { smile: '#e8e4dc', pig: '#e8a0a0', cat: '#2a2a2a', witch: '#5a8a3a', skull: '#ecebe4', old: '#e0e0dc', wolf: '#6a5a4a', toby: '#e0b090', sam: '#d8a888' }[kind] || '#ddd';
  g.fillStyle = base; g.beginPath(); g.ellipse(cx, 68, 48, 58, 0, 0, 7); g.fill();
  if (kind !== 'toby' && kind !== 'sam') { const sheen = g.createRadialGradient(cx - 10, 50, 2, cx, 64, 56); sheen.addColorStop(0, 'rgba(255,255,255,0.35)'); sheen.addColorStop(1, 'rgba(0,0,0,0.15)'); g.fillStyle = sheen; g.beginPath(); g.ellipse(cx, 68, 48, 58, 0, 0, 7); g.fill(); }
  const hole = (x, y, w, h) => { g.fillStyle = '#050404'; g.beginPath(); g.ellipse(cx + x, y, w, h, 0, 0, 7); g.fill(); };
  if (kind === 'smile') {
    hole(-12, 54, 6, 4); hole(12, 54, 6, 4);
    g.strokeStyle = '#a01818'; g.lineWidth = 3.5; g.beginPath(); g.arc(cx, 62, 24, 0.25, Math.PI - 0.25); g.stroke();
    g.fillStyle = '#c03030'; g.globalAlpha = 0.35; for (const dx of [-17, 17]) { g.beginPath(); g.arc(cx + dx, 72, 6, 0, 7); g.fill(); } g.globalAlpha = 1;
    g.fillStyle = '#1a1410'; g.fillRect(cx - 18, 45, 12, 2); g.fillRect(cx + 6, 45, 12, 2);
  } else if (kind === 'pig') {
    hole(-12, 50, 4, 4); hole(12, 50, 4, 4);
    g.fillStyle = '#d88080'; g.beginPath(); g.ellipse(cx, 70, 14, 10, 0, 0, 7); g.fill(); hole(-5, 70, 3, 4); hole(5, 70, 3, 4);
    g.strokeStyle = '#7a3030'; g.lineWidth = 2; g.beginPath(); g.arc(cx, 82, 10, 0.3, Math.PI - 0.3); g.stroke();
  } else if (kind === 'cat') {
    g.fillStyle = '#e8d8a0'; for (const dx of [-12, 12]) { g.beginPath(); g.ellipse(cx + dx, 54, 7, 5, dx < 0 ? 0.3 : -0.3, 0, 7); g.fill(); } hole(-12, 54, 2, 4); hole(12, 54, 2, 4);
    g.fillStyle = '#e88a9a'; g.beginPath(); g.moveTo(cx - 4, 66); g.lineTo(cx + 4, 66); g.lineTo(cx, 71); g.fill();
    g.strokeStyle = '#ddd'; g.lineWidth = 1; for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(cx + s * 8, 72 + i * 3); g.lineTo(cx + s * 30, 68 + i * 6); g.stroke(); }
  } else if (kind === 'witch') {
    hole(-12, 52, 5, 4); hole(12, 52, 5, 4);
    g.fillStyle = '#4a7a2a'; g.beginPath(); g.moveTo(cx - 5, 56); g.lineTo(cx + 5, 56); g.lineTo(cx + 2, 80); g.fill();
    g.fillStyle = '#3a5a1a'; g.beginPath(); g.arc(cx + 4, 72, 3, 0, 7); g.fill();
    g.fillStyle = '#1a1a0a'; g.fillRect(cx - 14, 88, 28, 3); for (let i = 0; i < 4; i++) g.fillRect(cx - 12 + i * 8, 86, 3, 7);
  } else if (kind === 'skull') {
    hole(-12, 54, 9, 9); hole(12, 54, 9, 9); g.fillStyle = '#050404'; g.beginPath(); g.moveTo(cx, 64); g.lineTo(cx - 4, 74); g.lineTo(cx + 4, 74); g.fill();
    g.fillStyle = '#050404'; g.fillRect(cx - 18, 84, 36, 9); g.fillStyle = base; for (let i = 0; i < 7; i++) g.fillRect(cx - 17 + i * 5.2, 84, 3, 9);
  } else if (kind === 'wolf') {
    hole(-12, 50, 5, 3); hole(12, 50, 5, 3); g.fillStyle = '#2a2018'; g.beginPath(); g.ellipse(cx, 72, 10, 8, 0, 0, 7); g.fill();
    g.fillStyle = '#eee'; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(cx - 14 + i * 5.6, 84); g.lineTo(cx - 11 + i * 5.6, 84); g.lineTo(cx - 12.5 + i * 5.6, 91); g.fill(); }
  } else if (kind === 'old') {
    // an old woman's mask: too smooth, painted lashes, a small pink smile
    hole(-12, 54, 5, 3); hole(12, 54, 5, 3);
    g.strokeStyle = '#222'; g.lineWidth = 1; for (const dx of [-12, 12]) for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(cx + dx + i * 2, 51); g.lineTo(cx + dx + i * 2.6, 47); g.stroke(); }
    g.strokeStyle = '#d07080'; g.lineWidth = 2.5; g.beginPath(); g.arc(cx, 72, 9, 0.3, Math.PI - 0.3); g.stroke();
  } else {
    // a real face (Toby, Sam)
    for (const dx of [-11, 11]) { g.fillStyle = '#eee8e0'; g.beginPath(); g.ellipse(cx + dx, 55, 5, 2.6, 0, 0, 7); g.fill(); g.fillStyle = '#4a3020'; g.beginPath(); g.arc(cx + dx, 55, 2.2, 0, 7); g.fill(); }
    g.fillStyle = '#b06a5a'; g.beginPath(); g.ellipse(cx, 80, 6, 1.8, 0, 0, 7); g.fill();
    g.fillStyle = hair; g.fillRect(0, 0, 256, 34);
  }
  noise(g, 256, 128, r, 0.05);
  return done(c, name);
}
// corn: one stalk with leaves, on a transparent canvas
export function corn() {
  if (cache.has('corn')) return cache.get('corn');
  const [c, g] = mk(128, 256), r = rng(50);
  g.clearRect(0, 0, 128, 256);
  g.strokeStyle = '#6a5a2a'; g.lineWidth = 5; g.beginPath(); g.moveTo(64, 256); g.lineTo(62, 10); g.stroke();
  for (let i = 0; i < 9; i++) {
    const y = 230 - i * 24, s = i % 2 ? 1 : -1, len = 40 + r() * 22;
    g.fillStyle = ['#8a7a3a', '#a08a40', '#6a6028', '#7a6a30'][(r() * 4) | 0];
    g.beginPath(); g.moveTo(63, y); g.quadraticCurveTo(63 + s * len * 0.6, y - 30, 63 + s * len, y + 10 + r() * 20); g.quadraticCurveTo(63 + s * len * 0.5, y - 18, 63, y - 6); g.fill();
  }
  g.fillStyle = '#c8a850'; g.beginPath(); g.ellipse(70, 110, 6, 18, 0.2, 0, 7); g.fill();
  return done(c, 'corn', true);
}
export function leaf() {
  if (cache.has('leaf')) return cache.get('leaf');
  const [c, g] = mk(32, 32);
  g.clearRect(0, 0, 32, 32); g.fillStyle = '#fff';
  g.beginPath(); g.moveTo(16, 2); g.quadraticCurveTo(30, 12, 16, 30); g.quadraticCurveTo(2, 12, 16, 2); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.moveTo(16, 4); g.lineTo(16, 30); g.stroke();
  const t = new THREE.CanvasTexture(c); cache.set('leaf', t); return t;
}
export function moon() {
  if (cache.has('moon')) return cache.get('moon');
  const [c, g] = mk(256, 256), r = rng(51);
  const gr = g.createRadialGradient(128, 128, 40, 128, 128, 128); gr.addColorStop(0, 'rgba(255,220,170,0.5)'); gr.addColorStop(0.45, 'rgba(255,190,120,0.12)'); gr.addColorStop(1, 'rgba(255,180,120,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#f0d8b0'; g.beginPath(); g.arc(128, 128, 44, 0, 7); g.fill();
  for (let i = 0; i < 12; i++) { g.fillStyle = `rgba(150,120,90,${0.15 + r() * 0.2})`; g.beginPath(); g.arc(100 + r() * 56, 100 + r() * 56, 3 + r() * 9, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; cache.set('moon', t); return t;
}
// a soft round glow (porch lights, the jack-o'-lanterns, candles)
export function glow() {
  if (cache.has('glow')) return cache.get('glow');
  const [c, g] = mk(64, 64);
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); cache.set('glow', t); return t;
}
// a hand-painted sign
export function painted(text, { w = 512, h = 128, bg = '#1a0a06', fg = '#e8401a', font = 'bold 54px Impact, "Arial Black", sans-serif', drip = true } = {}) {
  const name = 'painted-' + text + bg + fg + w + h;
  if (cache.has(name)) return cache.get(name);
  const [c, g] = mk(w, h), r = rng(text.length * 7);
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); noise(g, w, h, r, 0.15); } else g.clearRect(0, 0, w, h);
  g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  const lines = text.split('\n'), lh = parseInt(/(\d+)px/.exec(font)[1], 10) * 1.05;
  lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * lh));
  if (drip) for (let i = 0; i < text.length; i++) g.fillRect(w * 0.1 + r() * w * 0.8, h / 2 + 8, 2 + r() * 3, 6 + r() * h * 0.3);
  return done(c, name, true);
}
// a photograph: 'abel' (a boy in front of a farmhouse), 'lisa' (school photo), 'danny', 'marcus'
export function photo(kind) {
  const name = 'photo-' + kind;
  if (cache.has(name)) return cache.get(name);
  const [c, g] = mk(128, 160), r = rng(kind.length * 11 + kind.charCodeAt(0));
  g.fillStyle = '#e8e0cc'; g.fillRect(0, 0, 128, 160);
  const bgc = { lisa: ['#4a6a9a', '#2a3a5a'], danny: ['#8a7a5a', '#5a4a3a'], marcus: ['#5a7a5a', '#2a4a3a'] }[kind] || ['#8a8a80', '#4a4a40'];
  const inner = g.createLinearGradient(0, 10, 0, 130); inner.addColorStop(0, bgc[0]); inner.addColorStop(1, bgc[1]); g.fillStyle = inner; g.fillRect(10, 10, 108, 120);
  if (kind === 'abel') { g.fillStyle = '#3a3a34'; g.fillRect(20, 40, 88, 60); g.fillStyle = '#2a2a24'; g.beginPath(); g.moveTo(14, 42); g.lineTo(64, 18); g.lineTo(114, 42); g.fill(); }
  g.fillStyle = { lisa: '#c03040', danny: '#3a5a8a', marcus: '#d8a020' }[kind] || '#5a5048'; g.fillRect(46, 94, 36, 36);
  g.fillStyle = kind === 'marcus' ? '#8a5a3a' : '#d8b090'; g.beginPath(); g.arc(64, 78, 15, 0, 7); g.fill();
  g.fillStyle = { lisa: '#c8a040', danny: '#c87a30', marcus: '#1a1410' }[kind] || '#3a2a1a'; g.beginPath(); g.arc(64, 72, 16, Math.PI, 0); g.fill(); if (kind === 'lisa') { g.fillRect(48, 72, 6, 24); g.fillRect(74, 72, 6, 24); }
  g.fillStyle = '#222'; g.fillRect(58, 76, 2, 2); g.fillRect(68, 76, 2, 2); g.fillRect(60, 84, 8, 1.5);
  g.fillStyle = '#3a3020'; g.font = 'italic 11px Georgia, serif'; g.textAlign = 'center';
  g.fillText({ abel: 'Abel, Oct. 1958', lisa: 'Lisa, 3rd grade', danny: 'Danny, \'71', marcus: 'Marcus, \'83' }[kind] || '', 64, 148);
  noise(g, 128, 160, r, 0.18);
  return done(c, name, true);
}
// paper with handwriting (what it says is in the HTML; this is how it looks lying there)
export function paper(seed = 60) {
  const name = 'paper' + seed;
  if (cache.has(name)) return cache.get(name);
  const [c, g] = mk(128, 160), r = rng(seed);
  g.fillStyle = '#e8e2d0'; g.fillRect(0, 0, 128, 160);
  g.strokeStyle = 'rgba(80,110,160,0.35)'; for (let y = 20; y < 160; y += 10) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); }
  g.strokeStyle = 'rgba(30,30,40,0.8)'; g.lineWidth = 1.2;
  for (let y = 18; y < 150; y += 10) { g.beginPath(); let x = 10; g.moveTo(x, y); while (x < 110 - r() * 30) { x += 3 + r() * 5; g.lineTo(x, y - r() * 4); } g.stroke(); }
  noise(g, 128, 160, r, 0.1);
  return done(c, name, true);
}
// a sky dome: near-black at the top, a sick orange haze at the horizon
export function sky() {
  if (cache.has('sky')) return cache.get('sky');
  const [c, g] = mk(8, 256);
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#020208'); gr.addColorStop(0.42, '#090a18'); gr.addColorStop(0.5, '#1c1418'); gr.addColorStop(0.53, '#0a0a10'); gr.addColorStop(1, '#050508');
  g.fillStyle = gr; g.fillRect(0, 0, 8, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; cache.set('sky', t); return t;
}
