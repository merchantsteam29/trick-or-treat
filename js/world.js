// Hollow Lane, Halloween night, built from boxes: twelve houses down a dead-end street (two you can go into),
// Sam's house at the bottom, the Dorseys' haunted garage, the Marsh farmhouse at the top and the corn behind it.
// Collision is circles against boxes (in a 2 m grid), the ground is a list of flat surfaces, and the Pumpkin Man
// walks a graph of points joined wherever there is a clear line between them.
import * as THREE from 'three';
import * as TX from './tex.js';
import * as T2 from './tex2.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const FY = 0.25, CEIL = 2.7; // house floors, room height
export const W = { colliders: [], floors: [], inter: [], doors: new Map(), fixtures: [], meshes: {}, hides: [], nodes: [], scene: null, dyn: [], props: {}, glows: null };

// ---------- materials ----------
export const M = {};
function mat(name, tex, tile = [1, 1], o = {}) {
  const m = new THREE.MeshStandardMaterial({ map: tex || null, color: o.color ?? 0xffffff, roughness: o.rough ?? 0.85, metalness: o.metal ?? 0, emissive: o.emissive ?? 0x000000, emissiveIntensity: o.ei ?? 1, emissiveMap: o.emap ?? null, transparent: !!o.transparent, opacity: o.opacity ?? 1, side: o.side ?? THREE.FrontSide, alphaTest: o.alphaTest ?? 0 });
  m.userData.tile = tile; M[name] = m; return m;
}
export const col = (c, rough = 0.75, metal = 0) => { const k = 'c' + c.toString(16) + '_' + rough + '_' + metal; return M[k] || mat(k, null, [1, 1], { color: c, rough, metal }); };
function makeMaterials() {
  mat('asphalt', TX.asphalt(), [4, 4], { rough: 0.95, color: 0x8a8a90 });
  mat('paving', TX.paving(), [1.6, 1.6], { color: 0x9a9a98 });
  mat('lawn', T2.lawn(), [3, 3]);
  mat('lawn2', T2.lawn('lawn2', 36, 0x343824), [3, 3]);
  mat('dirt', T2.dirt(), [3, 3]);
  mat('field', T2.dirt('field', 37, 0x2a2014), [3, 3]);
  const sid = [[0xa8a090, 30], [0x7a8a8a, 31], [0x9a7a5a, 32], [0x6a7a6a, 33], [0xb8b0a0, 34], [0x8a6a6a, 35], [0x5a5a6a, 36]];
  sid.forEach(([c, s], i) => mat('siding' + i, T2.siding('siding' + i, c, s), [2, 2]));
  mat('sidingDead', T2.siding('sidingDead', 0x5a5650, 39), [2, 2]);
  mat('roof', T2.shingles('roof', 0x3a3430, 40), [2, 2]);
  mat('roof2', T2.shingles('roof2', 0x3a2a24, 41), [2, 2]);
  mat('roofDead', T2.shingles('roofDead', 0x2a2a28, 42), [2, 2]);
  mat('trim', null, [1, 1], { color: 0xd8d4c8, rough: 0.6 });
  mat('trimDark', null, [1, 1], { color: 0x3a3430, rough: 0.7 });
  mat('wallA', TX.wallpaper('wallA', 0x8a7a5a, 0x5a4a30, 'damask', 1), [2, 2.7]);
  mat('wallB', TX.wallpaper('wallB', 0x7a8a8a, 0x4a5a5a, 'stripe', 2), [2, 2.7]);
  mat('wallC', TX.wallpaper('wallC', 0xb0a080, 0x806848, 'dots', 3), [2, 2.7]);
  mat('wallD', TX.wallpaper('wallD', 0xc8a8b0, 0x8a6878, 'dots', 4), [2, 2.7]); // Lisa's pink room
  mat('wallE', TX.wallpaper('wallE', 0x6a6a5a, 0x3a3a2a, 'stripe', 5), [2, 2.7]);
  mat('wallMarsh', TX.wallpaper('wallMarsh', 0x4a4030, 0x2a2418, 'damask', 6), [2, 2.7]);
  mat('kitchTile', TX.tiles('kitchTile', 0xd8d0b8, 0xc0b8a0, 8, 7), [1.2, 1.2]);
  mat('floorWood', TX.planks('floorWood', 0x6a4a2a, 2), [2, 2]);
  mat('floorWood2', TX.planks('floorWood2', 0x4a3a2a, 8), [2, 2]);
  mat('lino', TX.tiles('lino', 0xb8b0a0, 0x5a5048, 8, 9), [2, 2]);
  mat('carpet', TX.fabric('carpet', 0x5a3a3a, 10), [0.8, 0.8]);
  mat('carpetBlue', TX.fabric('carpetB', 0x3a4258, 11), [0.8, 0.8]);
  mat('ceil', TX.plaster('ceil', 0xc8c4b8, 12), [2, 2]);
  mat('concrete', TX.concrete('conc', 0x6a6660, 13), [3, 3]);
  mat('wood', TX.wood('wood', 0x6a4a2e, 14), [1, 1]);
  mat('darkWood', TX.wood('dwood', 0x3a2618, 15), [1, 1]);
  mat('oldWood', TX.planks('oldWood', 0x4a3e30, 16), [1.5, 1.5]);
  mat('door', TX.wood('doorW', 0x5a3424, 17), [1, 2]);
  mat('doorRed', TX.wood('doorR', 0x6a1a14, 18), [1, 2]);
  mat('fabricRed', TX.fabric('fr', 0x6a2a24, 19), [0.5, 0.5]);
  mat('fabricGreen', TX.fabric('fgr', 0x3a4a30, 20), [0.5, 0.5]);
  mat('fabricBrown', TX.fabric('fbr', 0x5a4a38, 21), [0.5, 0.5]);
  mat('fabricPink', TX.fabric('fpk', 0xc890a0, 22), [0.5, 0.5]);
  mat('sheet', TX.fabric('sheet', 0xd8d8d0, 23), [0.5, 0.5]);
  mat('curtain', TX.fabric('curtain', 0x0c0a0c, 24), [0.6, 0.6], { rough: 1 });
  mat('canvas', TX.fabric('canvasT', 0x5a4e3a, 25), [1, 1], { rough: 1 });
  mat('bark', TX.wood('bark', 0x2e261e, 26), [0.5, 0.5]);
  mat('hedge', TX.fabric('hedge', 0x1e2a16, 27), [0.6, 0.6]);
  mat('hay', TX.fabric('hay', 0x9a8040, 28), [0.4, 0.4]);
  mat('stone', TX.concrete('stone', 0x6a6a68, 29), [1, 1]);
  mat('glassDark', null, [1, 1], { color: 0x0a0c10, rough: 0.1, metal: 0.4 });
  mat('glassLit', null, [1, 1], { color: 0x2a2010, emissive: 0xffa040, ei: 0.55 });
  mat('glassTV', null, [1, 1], { color: 0x101418, emissive: 0x8090a0, ei: 0.3 });
  mat('lamp', null, [1, 1], { color: 0xfff4e0, emissive: 0xffd8a0, ei: 1.4 });
  mat('lampOff', null, [1, 1], { color: 0x2a2a28, rough: 0.4 });
  mat('steel', null, [1, 1], { color: 0x8a9096, rough: 0.35, metal: 0.7 });
  mat('rust', null, [1, 1], { color: 0x5a3a2a, rough: 0.8, metal: 0.4 });
  mat('black', null, [1, 1], { color: 0x0c0c0e, rough: 0.8 });
  mat('white', null, [1, 1], { color: 0xd8d6cc, rough: 0.5 });
  mat('blood', null, [1, 1], { color: 0x3a0303, rough: 0.25 });
  mat('bone', null, [1, 1], { color: 0xd8d0b8, rough: 0.6 });
  mat('candle', null, [1, 1], { color: 0xe8e0c8, rough: 0.6 });
  mat('flame', null, [1, 1], { color: 0xffc060, emissive: 0xffa030, ei: 2 });
  mat('green', null, [1, 1], { color: 0x2a4a2a, rough: 0.7 });
  M.sky = new THREE.MeshBasicMaterial({ map: T2.sky(), side: THREE.BackSide, fog: false, depthWrite: false });
}

// ---------- building blocks ----------
function boxGeo(w, h, d, tile) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, [tu, tv] = tile;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / tu, uv.getY(k) * dims[f][1] / tv); }
  return g;
}
export function B(x0, y0, z0, x1, y1, z1, m, o = {}) {
  if (x1 < x0) [x0, x1] = [x1, x0]; if (y1 < y0) [y0, y1] = [y1, y0]; if (z1 < z0) [z0, z1] = [z1, z0];
  const w = x1 - x0, h = y1 - y0, d = z1 - z0;
  const mesh = new THREE.Mesh(boxGeo(w, h, d, m.userData.tile || [1, 1]), m);
  mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  mesh.castShadow = o.cast ?? (h > 0.3 && w + d > 0.4); mesh.receiveShadow = true; mesh.userData.static = !o.parent && !o.dyn;
  (o.parent || W.scene).add(mesh);
  if (o.collide !== false && !o.parent) W.colliders.push({ x0, x1, y0, y1, z0, z1, mesh, see: o.see });
  if (o.floor) W.floors.push({ x0, x1, z0, z1, y: y1 });
  return mesh;
}
const V = (x0, y0, z0, x1, y1, z1, m, o = {}) => B(x0, y0, z0, x1, y1, z1, m, { ...o, collide: false });
function floor(x0, z0, x1, z1, y, m, thick = 0.2) { return B(x0, y - thick, z0, x1, y, z1, m, { floor: true, collide: false, cast: false }); }
function rotBox(cx, cy, cz, w, h, d, rx, ry, rz, m, cast = true) {
  const mesh = new THREE.Mesh(boxGeo(w, h, d, m.userData.tile || [1, 1]), m);
  mesh.position.set(cx, cy, cz); mesh.rotation.set(rx, ry, rz); mesh.castShadow = cast; mesh.receiveShadow = true; mesh.userData.static = true; W.scene.add(mesh); return mesh;
}
function cyl(x, y0, z, r0, r1, h, m, seg = 10, o = {}) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, h, seg), m); mesh.position.set(x, y0 + h / 2, z); mesh.castShadow = o.cast ?? true; mesh.receiveShadow = true; mesh.userData.static = !o.dyn;
  if (o.rx) mesh.rotation.x = o.rx; if (o.rz) mesh.rotation.z = o.rz; (o.parent || W.scene).add(mesh);
  if (o.collide) W.colliders.push({ x0: x - r0, x1: x + r0, y0, y1: y0 + h, z0: z - r0, z1: z + r0 });
  return mesh;
}
// a triangle (gable end) in the plane x = at, from z0..z1, y0 up to the peak
function gable(at, z0, z1, y0, y1, m) {
  const s = new THREE.Shape(); s.moveTo(z0, y0); s.lineTo(z1, y0); s.lineTo((z0 + z1) / 2, y1); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: false });
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2, uv.getY(i) / 2);
  g.rotateY(-Math.PI / 2); g.translate(at + 0.06, 0, 0);
  const mesh = new THREE.Mesh(g, m); mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.static = true; W.scene.add(mesh); return mesh;
}
// a gable roof whose ridge runs along z: eaves at x = xa and xb, from z0 to z1, the ridge at y1
function roofZ(xa, xb, z0, z1, y0, y1, m, ov = 0.45) {
  if (xb < xa) [xa, xb] = [xb, xa];
  const xm = (xa + xb) / 2, half = (xb - xa) / 2, a = Math.atan2(y1 - y0, half), L = (half + ov) / Math.cos(a), ye = y0 - ov * Math.tan(a);
  for (const s of [-1, 1]) { const ex = s < 0 ? xa - ov : xb + ov; rotBox((ex + xm) / 2, (ye + y1) / 2, (z0 + z1) / 2, L + 0.1, 0.14, z1 - z0 + ov * 2, 0, 0, s < 0 ? a : -a, m); }
}
// a gable roof whose ridge runs along x
function roofX(za, zb, x0, x1, y0, y1, m, ov = 0.45) {
  if (zb < za) [za, zb] = [zb, za];
  const zm = (za + zb) / 2, half = (zb - za) / 2, a = Math.atan2(y1 - y0, half), L = (half + ov) / Math.cos(a), ye = y0 - ov * Math.tan(a);
  for (const s of [-1, 1]) { const ez = s < 0 ? za - ov : zb + ov; rotBox((x0 + x1) / 2, (ye + y1) / 2, (ez + zm) / 2, x1 - x0 + ov * 2, 0.14, L + 0.1, s < 0 ? -a : a, 0, 0, m); }
}
function windowLit(axis, at, a, b, y0, y1, lit, face = 1) {
  const m = lit === 'tv' ? M.glassTV : lit ? M.glassLit : M.glassDark;
  const d = 0.02 * face;
  const g = axis === 'x' ? V(a, y0, at + d - 0.005, b, y1, at + d + 0.005, m, { cast: false }) : V(at + d - 0.005, y0, a, at + d + 0.005, y1, b, m, { cast: false });
  const f = 0.06;
  if (axis === 'x') { V(a - f, y0 - f, at - 0.04 * face, b + f, y0, at + 0.08 * face, M.trim); V(a - f, y1, at - 0.04 * face, b + f, y1 + f, at + 0.06 * face, M.trim); V((a + b) / 2 - 0.02, y0, at, (a + b) / 2 + 0.02, y1, at + 0.05 * face, M.trim); }
  else { V(at - 0.04 * face, y0 - f, a - f, at + 0.08 * face, y0, b + f, M.trim); V(at - 0.04 * face, y1, a - f, at + 0.06 * face, y1 + f, b + f, M.trim); V(at, y0, (a + b) / 2 - 0.02, at + 0.05 * face, y1, (a + b) / 2 + 0.02, M.trim); }
  return g;
}
// a hinged door. axis 'x' = it lies along x (in a wall at z); 'z' = along z (in a wall at x)
function door(id, axis, at, a, b, y, m, o = {}) {
  const w = b - a, pivot = new THREE.Group();
  if (axis === 'x') pivot.position.set(a, y, at); else pivot.position.set(at, y, a);
  W.scene.add(pivot);
  const h = o.h ?? 2.08;
  const panel = new THREE.Mesh(boxGeo(w - 0.02, h, 0.05, m.userData.tile), m); panel.castShadow = true; panel.receiveShadow = true;
  if (axis === 'x') panel.position.set(w / 2, h / 2, 0); else { panel.position.set(0, h / 2, w / 2); panel.rotation.y = Math.PI / 2; }
  pivot.add(panel);
  const hm = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), M.steel);
  if (axis === 'x') { hm.position.set(w - 0.1, 1.0, 0.05); const h2 = hm.clone(); h2.position.z = -0.05; pivot.add(hm, h2); }
  else { hm.position.set(0.05, 1.0, w - 0.1); const h2 = hm.clone(); h2.position.x = -0.05; pivot.add(hm, h2); }
  const c = axis === 'x' ? { x0: a, x1: b, y0: y, y1: y + h, z0: at - 0.07, z1: at + 0.07, door: true } : { x0: at - 0.07, x1: at + 0.07, y0: y, y1: y + h, z0: a, z1: b, door: true };
  W.colliders.push(c);
  const d = { id, axis, at, a, b, y, pivot, panel, col: c, open: false, ang: 0, target: 0, swing: o.swing ?? 1, locked: !!o.locked, name: o.name || 'Door', lockedText: o.lockedText || 'Locked.', label: o.label };
  d.cx = axis === 'x' ? (a + b) / 2 : at; d.cz = axis === 'x' ? at : (a + b) / 2;
  W.doors.set(id, d);
  W.inter.push({ id: 'door:' + id, x: d.cx, y: y + 1.1, z: d.cz, r: 1.8, door: d });
  if (o.open) setDoor(d, true, true);
  return d;
}
export function setDoor(d, open, snap = false) {
  d.open = open; d.target = open ? d.swing * 1.5 : 0; d.col.off = open;
  if (snap) { d.ang = d.target; d.pivot.rotation.y = d.axis === 'x' ? -d.ang : d.ang; }
}
export function inter(id, x, y, z, r = 1.6) { const it = { id, x, y, z, r }; W.inter.push(it); return it; }
function fixture(x, y, z, o = {}) {
  const m = o.mesh === false ? null : V(x - 0.12, y - 0.1, z - 0.12, x + 0.12, y + 0.06, z + 0.12, o.off ? M.lampOff : M.lamp, { cast: false });
  const f = { x, y: y - 0.25, z, m, color: o.color ?? 0xffc888, power: o.power ?? 9, range: o.range ?? 10, on: !o.off, tag: o.tag, flicker: o.flicker || 0, inside: !!o.inside };
  W.fixtures.push(f); return f;
}
export function setFixture(f, on) { f.on = on; if (f.m) { f.m.material = on ? M.lamp : M.lampOff; } }
// a flat picture on a wall (photos, notes, signs)
function plane(tex, x, y, z, ry, w, h, o = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, transparent: !!o.transparent, alphaTest: o.transparent ? 0.3 : 0, emissive: o.glow ? 0xffffff : 0, emissiveMap: o.glow ? tex : null, emissiveIntensity: o.glow ?? 0, side: o.double ? THREE.DoubleSide : THREE.FrontSide }));
  m.position.set(x, y, z); m.rotation.y = ry; if (o.rx) m.rotation.x = o.rx; m.userData.static = !o.dyn; W.scene.add(m); return m;
}
function hide(id, kind, x, y, z, yaw, exit, o = {}) {
  const h = { id, kind, x, y, z, yaw, exit, range: o.range ?? 0.9, eye: o.eye ?? (kind === 'bed' ? 0.22 : kind === 'hedge' ? 0.8 : 1.5), inside: !!o.inside };
  W.hides.push(h); W.inter.push({ id: 'hide:' + id, x: exit[0] + (x - exit[0]) * 0.6, y: y + (kind === 'bed' ? 0.4 : 1.0), z: exit[1] + (z - exit[1]) * 0.6, r: 1.7, hide: h });
  return h;
}

// ---------- a lot on Hollow Lane ----------
// side +1 = the east side of the street (x > 0), -1 = the west. Local u = distance from the road's centre line,
// v = along the street from the lot's centre. Houses: front wall at u = 14, back wall at u = 26, v from -6 to 6.
function lot(side, zc) {
  const L = {
    side, zc,
    x: (u) => side * u, z: (v) => zc + v,
    B(u0, y0, v0, u1, y1, v1, m, o) { return B(side * u0, y0, zc + v0, side * u1, y1, zc + v1, m, o); },
    V(u0, y0, v0, u1, y1, v1, m, o = {}) { return B(side * u0, y0, zc + v0, side * u1, y1, zc + v1, m, { ...o, collide: false }); },
    // a wall in local space: along 'u' (at v = at) or along 'v' (at u = at), with gaps { a, b, top, bottom, win }
    wall(axis, at, a0, a1, y, m, gaps = [], t = 0.14, h = CEIL, win = null) {
      const seg = (a, b, y0, y1) => axis === 'u' ? L.B(a, y0, at - t / 2, b, y1, at + t / 2, m) : L.B(at - t / 2, y0, a, at + t / 2, y1, b, m);
      let p = a0; gaps = [...gaps].sort((g1, g2) => g1.a - g2.a);
      for (const gp of gaps) {
        if (gp.a > p) seg(p, gp.a, y, y + h);
        const top = gp.top ?? 2.1, bottom = gp.bottom ?? 0;
        if (top < h) { const mm = seg(gp.a, gp.b, y + top, y + h); W.colliders.pop(); void mm; }
        if (bottom > 0) seg(gp.a, gp.b, y, y + bottom);
        if (gp.win && win) win(gp, y);
        p = gp.b;
      }
      if (p < a1) seg(p, a1, y, y + h);
    },
    door(id, axis, at, a, b, y, m, o) {
      // local 'v' axis door (in a wall at u = at) -> world axis z; local 'u' -> world axis x
      if (axis === 'v') return door(id, 'z', side * at, zc + a, zc + b, y, m, o);
      const xa = Math.min(side * a, side * b), xb = Math.max(side * a, side * b);
      return door(id, 'x', zc + at, xa, xb, y, m, o);
    },
    inter(id, u, y, v, r) { return inter(id, side * u, y, zc + v, r); },
    fixture(u, y, v, o) { return fixture(side * u, y, zc + v, o); },
    hide(id, kind, u, y, v, yawLocal, eu, ev, o) { return hide(id, kind, side * u, y, zc + v, yawL(yawLocal), [side * eu, zc + ev], o); },
    // a yaw in local terms: 0 = looking towards the road (-u), PI/2 = towards +v
    yaw: (a) => yawL(a),
    pos: (u, v) => [side * u, zc + v],
  };
  // world yaw (three.js: 0 looks down -z) from local: facing -u (towards the road) = looking at -side*x
  const yawL = (a) => { const dx = -side * Math.cos(a), dz = Math.sin(a); return Math.atan2(-dx, -dz); };
  return L;
}

// the outside of a house: siding, roof, porch, windows, front door. Solid unless `shell` (then it's only skin:
// the rooms are built separately). o: { sid, roof, lit: [front windows], porchLight, tv, dead, door: 'closed'|'none' }
function houseOutside(L, o = {}) {
  const sid = M['siding' + (o.sid ?? 0)], roof = o.roof || M.roof, y = FY, top = y + CEIL;
  if (!o.shell) {
    L.B(14, 0, -6, 26, top, 6, sid);
    // windows on the front (u = 14 face)
    const fw = (v0, v1, lit) => { const x = L.x(14) - L.side * 0.01; windowLit('z', x, L.z(Math.min(v0, v1)), L.z(Math.max(v0, v1)), y + 0.9, y + 2.0, lit, -L.side); };
    fw(2.5, 4.5, o.lit?.[0]); fw(-4.5, -2.5, o.lit?.[1]);
    // the front door (a flat one; it doesn't open)
    L.V(13.94, y, -0.55, 14.0, y + 2.08, 0.55, o.doorMat || M.door);
    // side windows
    for (const v of [-6, 6]) for (const [u0, u1] of [[16, 18], [22, 24]]) windowLit('x', L.z(v) + Math.sign(v) * 0.01, Math.min(L.x(u0), L.x(u1)), Math.max(L.x(u0), L.x(u1)), y + 0.9, y + 2.0, false, Math.sign(v));
  }
  // foundation
  L.V(13.9, 0, -6.1, 26.1, y, 6.1, M.concrete);
  // roof: ridge along v (the street)
  const xa = L.x(13.7), xb = L.x(26.3), ridge = top + 2.0;
  roofZ(Math.min(xa, xb), Math.max(xa, xb), L.z(-6.3), L.z(6.3), top, ridge, roof);
  // gable ends (the triangles at each end)
  for (const v of [-6.05, 6.05]) {
    const s = new THREE.Shape(); s.moveTo(-6.05, 0); s.lineTo(6.05, 0); s.lineTo(0, 2.0); s.closePath();
    const g = new THREE.ShapeGeometry(s); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2, uv.getY(i) / 2);
    const mesh = new THREE.Mesh(g, sid); mesh.position.set(L.x(20), top, L.z(v)); mesh.rotation.y = v > 0 ? 0 : Math.PI; mesh.userData.static = true; mesh.castShadow = true; W.scene.add(mesh);
  }
  // the porch: floor, steps, two posts, a little roof
  floor(Math.min(L.x(11.4), L.x(14)), L.z(-2.2), Math.max(L.x(11.4), L.x(14)), L.z(2.2), y, M.oldWood, y);
  L.V(11.0, 0, -1, 11.4, y * 0.5, 1, M.oldWood);
  for (const v of [-2.05, 2.05]) L.B(11.5, y, v - 0.07, 11.64, top - 0.2, v + 0.07, M.trim);
  L.V(11.3, top - 0.25, -2.3, 14, top - 0.1, 2.3, roof);
  if (o.porchLight !== undefined) W.props['porch' + L.zc + L.side] = L.fixture(13.75, y + 2.25, 0.9, { off: !o.porchLight, power: 6, range: 8, color: 0xffb070, tag: 'porch' });
  // the path to the street
  floor(Math.min(L.x(5.3), L.x(11.4)), L.z(-0.6), Math.max(L.x(5.3), L.x(11.4)), L.z(0.6), 0.04, M.paving, 0.1);
}

// a house you can go into. Rooms (local): hall/corridor u 14..26 v -1.5..1.5; living u 14..20 v 1.5..6; kitchen
// u 20..26 v 1.5..6; bedroom u 14..20 v -6..-1.5; kid's room u 20..26 v -6..-1.5. Front and back doors on v = 0.
function houseInside(L, id, o) {
  const y = FY, top = y + CEIL, sid = M['siding' + (o.sid ?? 0)];
  const fl = (u0, v0, u1, v1, m) => floor(Math.min(L.x(u0), L.x(u1)), L.z(v0), Math.max(L.x(u0), L.x(u1)), L.z(v1), y, m, y);
  fl(14, -1.5, 26, 1.5, M.floorWood); fl(14, 1.5, 20, 6, o.livingFloor || M.carpet); fl(20, 1.5, 26, 6, M.lino); fl(14, -6, 20, -1.5, M.carpetBlue); fl(20, -6, 26, -1.5, o.kidFloor || M.floorWood2);
  L.V(14, top, -6, 26, top + 0.08, 6, M.ceil, { cast: false });
  // outer walls: siding outside, paper inside (two thin layers through the same openings)
  const win = (axis, at, face) => (gp, yy) => {
    if (axis === 'v') windowLit('z', L.x(at) + face * L.side * 0.0, Math.min(L.z(gp.a), L.z(gp.b)), Math.max(L.z(gp.a), L.z(gp.b)), yy + gp.bottom, yy + gp.top, o.litWin ?? false, face * L.side);
    else windowLit('x', L.z(at), Math.min(L.x(gp.a), L.x(gp.b)), Math.max(L.x(gp.a), L.x(gp.b)), yy + gp.bottom, yy + gp.top, o.litWin ?? false, face);
  };
  const W1 = { bottom: 0.9, top: 2.0, win: true };
  const front = [{ a: -0.55, b: 0.55 }, { a: 2.5, b: 4.5, ...W1 }, { a: -4.5, b: -2.5, ...W1 }];
  const back = [{ a: -0.55, b: 0.55 }, { a: 2.5, b: 4.5, ...W1 }, { a: -4.5, b: -2.5, ...W1 }];
  const sideG = [{ a: 16, b: 18, ...W1 }, { a: 22, b: 24, ...W1 }];
  L.wall('v', 13.96, -6.1, 6.1, y, sid, front, 0.08, CEIL, win('v', 13.92, -1));
  L.wall('v', 26.04, -6.1, 6.1, y, sid, back, 0.08, CEIL, win('v', 26.08, 1));
  L.wall('u', 6.04, 13.9, 26.1, y, sid, sideG, 0.08, CEIL, win('u', 6.08, 1));
  L.wall('u', -6.04, 13.9, 26.1, y, sid, sideG, 0.08, CEIL, win('u', -6.08, -1));
  const P = o.paper || [M.wallA, M.wallB, M.wallC, M.wallE];
  // inner skins, per room
  L.wall('v', 14.06, 1.5, 6, y, P[0], front.filter((g) => g.a > 1).map((g) => ({ ...g, win: false })), 0.06);
  L.wall('v', 14.06, -1.5, 1.5, y, P[3], [{ a: -0.55, b: 0.55 }], 0.06);
  L.wall('v', 14.06, -6, -1.5, y, P[1], front.filter((g) => g.b < -1).map((g) => ({ ...g, win: false })), 0.06);
  L.wall('v', 25.94, 1.5, 6, y, M.kitchTile, back.filter((g) => g.a > 1).map((g) => ({ ...g, win: false })), 0.06);
  L.wall('v', 25.94, -1.5, 1.5, y, P[3], [{ a: -0.55, b: 0.55 }], 0.06);
  L.wall('v', 25.94, -6, -1.5, y, o.kidWall || P[2], back.filter((g) => g.b < -1).map((g) => ({ ...g, win: false })), 0.06);
  L.wall('u', 5.96, 14, 20, y, P[0], [{ a: 16, b: 18, bottom: 0.9, top: 2.0 }], 0.06); L.wall('u', 5.96, 20, 26, y, M.kitchTile, [{ a: 22, b: 24, bottom: 0.9, top: 2.0 }], 0.06);
  L.wall('u', -5.96, 14, 20, y, P[1], [{ a: 16, b: 18, bottom: 0.9, top: 2.0 }], 0.06); L.wall('u', -5.96, 20, 26, y, o.kidWall || P[2], [{ a: 22, b: 24, bottom: 0.9, top: 2.0 }], 0.06);
  // inner walls
  L.wall('u', 1.5, 14.1, 25.9, y, P[3], [{ a: 15.4, b: 16.9, top: 2.2 }, { a: 22.6, b: 24.1, top: 2.2 }]);
  L.wall('u', -1.5, 14.1, 25.9, y, P[3], [{ a: 16.2, b: 17.1 }, { a: 22.8, b: 23.7 }]);
  L.wall('v', 20, 1.57, 5.9, y, P[0], [{ a: 3.2, b: 4.6, top: 2.2 }]);
  L.wall('v', 20, -5.9, -1.57, y, P[1]);
  // doors
  const dFront = L.door(id + 'Front', 'v', 14, -0.53, 0.53, y, o.frontMat || M.door, { name: 'Front door', locked: !!o.frontLocked, lockedText: o.frontLockedText, open: !!o.frontOpen });
  const dBack = L.door(id + 'Back', 'v', 26, -0.53, 0.53, y, M.door, { name: 'Back door', locked: !!o.backLocked, lockedText: o.backLockedText });
  const dBed = L.door(id + 'Bed', 'u', -1.5, 16.22, 17.08, y, M.door, { name: 'Bedroom' });
  const dKid = L.door(id + 'Kid', 'u', -1.5, 22.82, 23.68, y, M.door, { name: o.kidName || 'Bedroom', label: o.kidLabel });
  // lights inside (off until something turns them on)
  const lights = {
    hall: L.fixture(18, top - 0.05, 0, { off: !o.lightsOn, power: 5, range: 7, inside: true, tag: id }),
    living: L.fixture(17, top - 0.05, 3.8, { off: !o.lightsOn, power: 5, range: 7, inside: true, tag: id }),
    kitchen: L.fixture(23, top - 0.05, 3.8, { off: !o.lightsOn, power: 6, range: 7, inside: true, tag: id }),
    bed: L.fixture(17, top - 0.05, -3.8, { off: true, power: 5, range: 7, inside: true, tag: id }),
    kid: L.fixture(23, top - 0.05, -3.8, { off: true, power: 5, range: 7, inside: true, tag: id }),
  };
  // ---- furniture ----
  // living: sofa, armchair, coffee table, TV, lamp, bookcase
  L.B(14.3, y, 2.0, 15.2, y + 0.85, 5.2, M.fabricBrown); L.B(14.3, y, 2.0, 14.5, y + 1.0, 5.2, M.fabricBrown);
  L.B(16.0, y, 2.6, 16.9, y + 0.42, 4.4, M.darkWood);
  L.B(18.6, y, 5.3, 19.6, y + 0.75, 5.9, M.darkWood); // TV stand
  W.meshes[id + 'TV'] = L.V(18.75, y + 0.75, 5.4, 19.45, y + 1.35, 5.85, M.black);
  W.meshes[id + 'Screen'] = L.V(18.82, y + 0.8, 5.38, 19.38, y + 1.3, 5.4, M.glassDark, { cast: false });
  L.B(19.2, y, 1.7, 19.9, y + 2.0, 2.6, M.wood);
  for (let i = 0; i < 4; i++) L.V(19.25, y + 0.3 + i * 0.45, 1.75, 19.85, y + 0.32 + i * 0.45, 2.55, M.darkWood);
  // kitchen: counters along v = 6, a fridge, the table and chairs
  L.B(20.2, y, 5.35, 25.8, y + 0.9, 5.95, M.wood); L.V(20.2, y + 0.9, 5.3, 25.8, y + 0.95, 5.95, M.white);
  L.B(25.0, y, 1.7, 25.85, y + 1.8, 2.5, M.white);
  L.B(22.2, y, 3.0, 24.0, y + 0.76, 4.2, M.wood);
  const chairs = [[21.7, 3.6], [24.5, 3.6], [23.1, 2.5], [23.1, 4.7]];
  for (const [u, v] of chairs) { L.B(u - 0.22, y, v - 0.22, u + 0.22, y + 0.45, v + 0.22, M.darkWood, { collide: false }); }
  L.B(21.4, y, 3.0, 24.8, y + 0.45, 4.2, M.darkWood, { collide: true, see: true }).visible = false;
  // bedroom: a bed (you can get under it), a wardrobe (you can get in it), a dresser
  L.B(16.0, y, -5.95, 18.0, y + 0.55, -3.9, M.wood, { collide: true });
  L.V(16.05, y + 0.55, -5.9, 17.95, y + 0.7, -4.0, M.sheet); L.V(16.2, y + 0.7, -5.85, 17.8, y + 0.82, -5.4, M.white);
  L.B(15.9, y, -5.98, 18.1, y + 1.1, -5.85, M.darkWood);
  L.B(19.0, y, -5.95, 19.92, y + 2.1, -4.7, M.darkWood); // the wardrobe
  L.V(18.98, y + 0.1, -5.9, 19.0, y + 2.0, -4.75, M.wood);
  L.B(14.2, y, -2.9, 14.75, y + 0.9, -1.7, M.wood);
  L.hide(id + 'Wardrobe', 'closet', 19.45, y, -5.32, 0, 18.4, -5.0, { inside: true });
  L.hide(id + 'Bed', 'bed', 17.0, y, -4.9, Math.PI / 2, 17.0, -3.4, { inside: true });
  // kid's room: a small bed (under), a toy chest, a desk
  L.B(23.4, y, -5.95, 25.8, y + 0.48, -4.9, M.wood, { collide: true });
  L.V(23.45, y + 0.48, -5.9, 25.75, y + 0.6, -4.95, o.kidSheet || M.sheet);
  L.B(20.2, y, -3.1, 20.8, y + 0.75, -2.0, M.wood);
  L.B(20.2, y, -5.9, 21.6, y + 0.5, -5.3, M.darkWood);
  L.hide(id + 'KidBed', 'bed', 24.6, y, -5.42, Math.PI / 2, 24.6, -4.1, { inside: true });
  // hall: a coat rack, a little table, a mirror
  L.B(14.3, y, 1.1, 14.6, y + 1.8, 1.4, M.darkWood);
  L.B(21.0, y, -1.42, 22.0, y + 0.8, -1.12, M.wood);
  return { doors: { front: dFront, back: dBack, bed: dBed, kid: dKid }, lights };
}

// ---------- the haunted garage at the Dorseys' (#7, east) ----------
// garage u 10..22 v 0..8.5: four lanes of black curtain; the tent behind it u 22..32 v 0..8.5
function dorseyGarage(L) {
  const y = 0.05, h = 2.6, top = y + h, sid = M.siding3;
  floor(Math.min(L.x(10), L.x(32)), L.z(0), Math.max(L.x(10), L.x(32)), L.z(8.5), y, M.concrete, 0.1);
  // the garage box
  L.wall('v', 10, 0, 8.5, y, sid, [{ a: 3.6, b: 5.0, top: 2.2 }], 0.14, h);
  L.wall('u', 0, 10, 22, y, sid, [], 0.14, h); L.wall('u', 8.5, 10, 22, y, sid, [], 0.14, h);
  L.wall('v', 22, 0, 8.5, y, M.curtain, [{ a: 0.6, b: 1.9 }], 0.08, h);
  L.V(10, top, 0, 22, top + 0.1, 8.5, M.black, { cast: false });
  roofZ(Math.min(L.x(9.8), L.x(22.2)), Math.max(L.x(9.8), L.x(22.2)), L.z(-0.2), L.z(8.7), top, top + 1.2, M.roof2, 0.3);
  // the sign over the door
  const sign = T2.painted("DORSEY'S\nHOUSE OF HORRORS", { w: 512, h: 192, font: 'bold 62px Impact, "Arial Black", sans-serif' });
  plane(sign, L.x(9.9), y + 2.55, L.z(4.3), L.side > 0 ? -Math.PI / 2 : Math.PI / 2, 3.2, 1.2, { glow: 0.7 });
  L.fixture(9.4, y + 2.1, 4.3, { power: 3.5, range: 7, color: 0xff3010, tag: 'dorseySign' });
  const small = T2.painted('ENTER IF YOU DARE\n25¢', { w: 256, h: 128, bg: '#d8c8a0', fg: '#6a0a06', font: 'bold 30px Impact, sans-serif', drip: false });
  plane(small, L.x(9.85), y + 1.2, L.z(2.9), L.side > 0 ? -Math.PI / 2 : Math.PI / 2, 0.9, 0.45);
  // curtains: lanes along v
  const cur = (u, v0, v1) => L.B(u - 0.04, y, v0, u + 0.04, top, v1, M.curtain);
  cur(12.6, 0, 7.0); cur(15.2, 1.5, 8.5); cur(17.8, 0, 7.0);
  // lane 1 dead end: a pop-up skeleton behind a half-curtain
  cur(11.3, 0.05, 2.3);
  // the tent: canvas walls, one room
  L.wall('u', 0, 22, 32, y, M.canvas, [{ a: 28, b: 29.5 }], 0.08, h);
  L.wall('u', 8.5, 22, 32, y, M.canvas, [], 0.08, h);
  L.wall('v', 32, 0, 8.5, y, M.canvas, [], 0.08, h);
  rotBox(L.x(27), top + 0.5, L.z(4.25), 10.4, 0.06, 8.8, 0, 0, L.side * 0.0, M.canvas, false);
  L.V(22, top, 0, 32, top + 0.05, 8.5, M.canvas, { cast: false });
  // the guillotine in lane 3 (u 15.2..17.8) at v = 4.3: two posts, a crossbar, the blade (moves)
  L.B(15.25, y, 4.15, 15.45, y + 2.45, 4.45, M.darkWood); L.B(17.55, y, 4.15, 17.75, y + 2.45, 4.45, M.darkWood);
  L.V(15.25, y + 2.45, 4.15, 17.75, y + 2.6, 4.45, M.darkWood);
  const blade = new THREE.Group(); const bl = new THREE.Mesh(boxGeo(2.1, 0.5, 0.05, [1, 1]), M.steel); bl.castShadow = true; blade.add(bl);
  const edge = new THREE.Mesh(boxGeo(2.1, 0.08, 0.06, [1, 1]), M.blood); edge.position.y = -0.27; blade.add(edge);
  blade.position.set(L.x(16.5), y + 2.15, L.z(4.3)); W.scene.add(blade);
  W.meshes.blade = blade;
  // the basket of heads under it
  cyl(L.x(16.5), y, L.z(4.75), 0.3, 0.35, 0.4, M.hay);
  // props along the lanes
  W.props.maze = {
    popA: L.pos(11.95, 1.0), popB: L.pos(14.0, 1.2), popC: L.pos(19.5, 7.5),
    coffin: L.pos(21.2, 5.6), body: L.pos(30.5, 4.3), blade: L.pos(16.5, 4.3), strobe: L.pos(14, 4.5),
  };
  // coffin (a hide spot) in lane 4, gravestones
  L.B(20.7, y, 5.0, 21.75, y + 0.6, 6.95, M.darkWood);
  L.hide('coffin', 'bed', 21.2, y + 0.1, 6.0, 0, 19.9, 6.0, { eye: 0.4, inside: true });
  for (const [u, v] of [[18.4, 2.0], [19.5, 3.4], [21.3, 7.9], [21.4, 2.6]]) { L.B(u - 0.3, y, v - 0.08, u + 0.3, y + 0.75, v + 0.08, M.stone); }
  L.fixture(14, top - 0.1, 4.5, { off: false, power: 4, range: 6, color: 0xc0d0ff, tag: 'strobe', inside: true, flicker: 1 });
  L.fixture(19.8, top - 0.1, 4.3, { off: false, power: 2.5, range: 5, color: 0x40ff60, tag: 'maze', inside: true });
  L.fixture(11.3, top - 0.1, 6.5, { power: 1.6, range: 4.5, color: 0xff4020, tag: 'maze', inside: true });
  L.fixture(16.5, top - 0.1, 2.0, { power: 2.2, range: 5, color: 0xffa040, tag: 'maze', inside: true });
  L.fixture(16.5, top - 0.1, 6.6, { power: 1.6, range: 4.5, color: 0x8040ff, tag: 'maze', inside: true });
  L.fixture(27, top - 0.1, 4.3, { off: false, power: 4, range: 8, color: 0xff3020, tag: 'tent', inside: true });
  // the tent: "THE BUTCHER'S TABLE" — a real one now
  L.B(29.6, y, 3.2, 31.0, y + 0.8, 5.4, M.wood);
  L.B(31.4, y, 2.5, 31.9, y + 1.8, 6.0, M.darkWood);
  const t2 = T2.painted("THE BUTCHER'S\nTABLE", { w: 512, h: 192, bg: null, fg: '#c01a0a', font: 'bold 60px Impact, sans-serif' });
  plane(t2, L.x(31.86), y + 2.1, L.z(4.25), L.side > 0 ? -Math.PI / 2 : Math.PI / 2, 2.6, 0.95, { transparent: true });
  return { top };
}

// ---------- the Marsh farmhouse at the top of the lane, and the corn behind it ----------
function marsh() {
  const y = FY, top = y + CEIL + 0.3, h = CEIL + 0.3, sid = M.sidingDead;
  floor(-9, 142, 9, 154, y, M.oldWood, y);
  B(-9.2, 0, 141.9, 9.2, y, 154.1, M.concrete, { collide: false });
  const wx = (z, x0, x1, gaps, m = sid, t = 0.16) => { let p = x0; for (const g of [...gaps].sort((a, b) => a.a - b.a)) { if (g.a > p) B(p, y, z - t / 2, g.a, y + h, z + t / 2, m); V(g.a, y + (g.top ?? 2.1), z - t / 2, g.b, y + h, z + t / 2, m); if (g.bottom) B(g.a, y, z - t / 2, g.b, y + g.bottom, z + t / 2, m); p = g.b; } if (p < x1) B(p, y, z - t / 2, x1, y + h, z + t / 2, m); };
  const wz = (x, z0, z1, gaps, m = sid, t = 0.16) => { let p = z0; for (const g of [...gaps].sort((a, b) => a.a - b.a)) { if (g.a > p) B(x - t / 2, y, p, x + t / 2, y + h, g.a, m); V(x - t / 2, y + (g.top ?? 2.1), g.a, x + t / 2, y + h, g.b, m); if (g.bottom) B(x - t / 2, y, g.a, x + t / 2, y + g.bottom, g.b, m); p = g.b; } if (p < z1) B(x - t / 2, y, p, x + t / 2, y + h, z1, m); };
  const Wn = { bottom: 0.9, top: 2.1 };
  wx(142, -9, 9, [{ a: -0.55, b: 0.55 }, { a: -6, b: -4, ...Wn }, { a: 4, b: 6, ...Wn }]);
  wx(154, -9, 9, [{ a: 4.0, b: 5.1 }, { a: -6, b: -4, ...Wn }]);
  wz(-9, 142, 154, [{ a: 144, b: 146, ...Wn }]); wz(9, 142, 154, [{ a: 150, b: 152, ...Wn }]);
  wx(148, -8.92, 8.92, [{ a: -2.4, b: -1.3 }, { a: 1.3, b: 2.4 }], M.wallMarsh, 0.12);
  wz(0, 148, 153.92, [{ a: 150.5, b: 151.6 }], M.wallMarsh, 0.12);
  // inner paper on the outer walls (thin)
  V(-8.9, y, 142.09, 8.9, y + h, 142.11, M.wallMarsh); V(-8.9, y, 153.89, 8.9, y + h, 153.91, M.wallMarsh);
  // broken boards over the front windows
  for (const x of [-5, 5]) for (let i = 0; i < 3; i++) rotBox(x, y + 1.2 + i * 0.32, 141.85, 2.4, 0.16, 0.04, 0, 0, (i - 1) * 0.15, M.oldWood);
  windowLit('x', 141.92, -6, -4, y + 0.9, y + 2.1, false, -1); windowLit('x', 141.92, 4, 6, y + 0.9, y + 2.1, false, -1);
  windowLit('x', 154.08, -6, -4, y + 0.9, y + 2.1, false, 1);
  windowLit('z', -9.08, 144, 146, y + 0.9, y + 2.1, false, -1); windowLit('z', 9.08, 150, 152, y + 0.9, y + 2.1, false, 1);
  V(-9, top, 142, 9, top + 0.08, 154, M.ceil, { cast: false });
  roofX(141.6, 154.4, -9.3, 9.3, top, top + 3.2, M.roofDead);
  // gable ends on x = +-9
  for (const x of [-9.05, 9.05]) { const s = new THREE.Shape(); s.moveTo(-6.4, 0); s.lineTo(6.4, 0); s.lineTo(0, 3.2); s.closePath(); const g = new THREE.ShapeGeometry(s); const mesh = new THREE.Mesh(g, sid); mesh.position.set(x, top, 148); mesh.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2; mesh.userData.static = true; W.scene.add(mesh); }
  // porch
  floor(-3, 139.8, 3, 142, y, M.oldWood, y);
  for (const x of [-2.9, 2.9]) B(x - 0.08, y, 139.85, x + 0.08, top - 0.3, 140.0, M.oldWood);
  rotBox(0, top - 0.25, 140.9, 6.4, 0.12, 2.6, 0.12, 0, 0, M.roofDead);
  const dFront = door('marshFront', 'x', 142, -0.53, 0.53, y, M.oldWood, { name: 'Front door' });
  const dBack = door('marshBack', 'x', 154, 4.02, 5.08, y, M.oldWood, { name: 'Back door', label: 'Back door' });
  door('marshWork', 'x', 148, -2.38, -1.32, y, M.oldWood, { name: 'Door', open: true });
  // parlour: dust sheets over the furniture, a fireplace, Abel's photograph
  B(-8.5, y, 144.5, -6.6, y + 0.9, 147.5, M.sheet); B(4.5, y, 145.5, 7.0, y + 0.8, 147.2, M.sheet); B(-2.0, y, 145.2, 0.6, y + 0.5, 146.4, M.sheet);
  B(7.9, y, 143.2, 8.9, y + 1.3, 145.0, M.stone); V(7.88, y + 0.1, 143.6, 7.9, y + 0.8, 144.6, M.black);
  plane(T2.photo('abel'), 8.86, y + 1.75, 144.1, -Math.PI / 2, 0.42, 0.52);
  // workshop (x -9..0, z 148..154): his carving bench, the knives, the faces
  B(-8.8, y, 151.6, -3.0, y + 0.92, 153.8, M.oldWood);
  for (let i = 0; i < 7; i++) { const x = -8.4 + i * 0.8; V(x, y + 1.3, 153.85, x + 0.04, y + 1.75, 153.88, M.steel); V(x - 0.03, y + 1.2, 153.84, x + 0.07, y + 1.32, 153.88, M.darkWood); }
  V(-8.8, y + 0.92, 151.7, -3.1, y + 0.94, 153.7, M.blood, { cast: false });
  B(-8.9, y, 148.2, -8.1, y + 2.2, 150.4, M.oldWood); // a pantry: hide in it
  hide('pantry', 'closet', -8.5, y, 149.3, -Math.PI / 2, -7.3, 149.3, { inside: true });
  // kitchen (x 0..9, z 148..154)
  B(5.6, y, 153.2, 8.9, y + 0.9, 153.9, M.oldWood); B(8.2, y, 148.2, 8.9, y + 0.9, 151.0, M.oldWood);
  B(2.0, y, 150.0, 3.6, y + 0.76, 151.4, M.oldWood);
  fixture(-4.5, top - 0.05, 151, { off: false, power: 3, range: 6, color: 0xffa050, inside: true, tag: 'marsh', mesh: false });
  W.props.marsh = { front: dFront, back: dBack };
  return { dFront, dBack };
}

// ---------- the corn: z 156..205, x -30..30, a path to the clearing at (0, 182) ----------
const PATH = [[4.5, 156], [4.5, 160], [-3, 164], [-6, 170], [2, 175], [0, 179]];
export const CLEARING = { x: 0, z: 183, r: 6.5 };
function inClearing(x, z, extra = 0) { return Math.hypot(x - CLEARING.x, z - CLEARING.z) < CLEARING.r + extra; }
function nearPath(x, z, w) {
  for (let i = 0; i < PATH.length - 1; i++) {
    const [ax, az] = PATH[i], [bx, bz] = PATH[i + 1], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    if (Math.hypot(x - (ax + dx * t), z - (az + dz * t)) < w) return true;
  }
  return false;
}
export function inCorn(x, z) { return z > 156.5 && z < 205 && Math.abs(x) < 30 && !inClearing(x, z, 0.5) && !nearPath(x, z, 1.1) && !(z < 160 && Math.abs(x) < 12); }
function field(scene) {
  floor(-32, 154, 32, 207, 0.02, M.field, 0.1);
  // the corn: instanced crossed planes
  const tex = T2.corn();
  const cm = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 1, color: 0x9a9070 });
  const p1 = new THREE.PlaneGeometry(1.0, 2.5); p1.translate(0, 1.25, 0); const p2 = p1.clone(); p2.rotateY(Math.PI / 2);
  const cg = mergeGeometries([p1, p2]);
  const R = TX.rng(808), list = [];
  for (let z = 157; z < 205; z += 0.75) for (let x = -29.5; x < 29.5; x += 0.85) {
    const px = x + (R() - 0.5) * 0.5, pz = z + (R() - 0.5) * 0.4;
    if (!inCorn(px, pz)) continue;
    list.push([px, pz, R() * 6.3, 0.8 + R() * 0.45]);
  }
  for (let i = list.length - 1; i > 0; i--) { const j = (R() * (i + 1)) | 0; [list[i], list[j]] = [list[j], list[i]]; } // shuffled, so Low can draw just the first part
  const im = new THREE.InstancedMesh(cg, cm, list.length); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  list.forEach(([x, z, r, sc], i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r); s.set(sc, sc * (0.85 + R() * 0.3), sc); p.set(x, 0, z); m4.compose(p, q, s); im.setMatrixAt(i, m4); });
  im.castShadow = false; im.receiveShadow = true; scene.add(im); W.meshes.corn = im; im.userData.full = list.length;
  // the edge: a fence of old boards round the field, and a wall you can't see past
  for (const [x0, z0, x1, z1] of [[-31, 155, -30.8, 206], [30.8, 155, 31, 206], [-31, 205.8, 31, 206]]) B(x0, 0, z0, x1, 1.2, z1, M.oldWood);
  B(-31, 0, 154.6, -9.3, 1.2, 154.8, M.oldWood); B(9.3, 0, 154.6, 31, 1.2, 154.8, M.oldWood);
  // the clearing: hay bales in a ring, the altar, candles, the big pumpkin
  const cx = CLEARING.x, cz = CLEARING.z;
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2 + 0.3; if (Math.abs(a - Math.PI * 1.5) < 0.4) continue; const x = cx + Math.cos(a) * 5.6, z = cz + Math.sin(a) * 5.6; const m = rotBox(x, 0.35, z, 1.2, 0.7, 0.8, 0, -a, 0, M.hay); void m; W.colliders.push({ x0: x - 0.6, x1: x + 0.6, y0: 0, y1: 0.7, z0: z - 0.6, z1: z + 0.6 }); }
  B(cx - 0.8, 0, cz + 0.6, cx + 0.8, 0.55, cz + 1.4, M.hay); // Toby's bale
  B(cx - 1.4, 0, cz - 1.6, cx + 1.4, 0.8, cz - 0.6, M.oldWood); // the altar (his carving table)
  V(cx - 1.3, 0.8, cz - 1.5, cx + 1.3, 0.82, cz - 0.7, M.blood, { cast: false });
  W.props.candles = [];
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, x = cx + Math.cos(a) * 3.2, z = cz + Math.sin(a) * 3.2; const h = 0.15 + ((i * 7) % 5) * 0.04; cyl(x, 0, z, 0.04, 0.035, h, M.candle, 6, { cast: false }); W.props.candles.push([x, h + 0.04, z]); }
  // scarecrows on posts round the edge of the clearing
  W.props.scarecrows = [[cx - 7.5, cz + 4], [cx + 7.8, cz - 3.5], [cx + 3, cz + 9]];
  for (const [x, z] of W.props.scarecrows) { cyl(x, 0, z, 0.06, 0.06, 2.4, M.oldWood, 6, { collide: true }); V(x - 0.8, 1.85, z - 0.04, x + 0.8, 1.93, z + 0.04, M.oldWood); B(x - 0.25, 1.2, z - 0.15, x + 0.25, 1.95, z + 0.15, M.fabricBrown, { collide: false }); cyl(x, 1.95, z, 0.18, 0.18, 0.32, M.hay, 8); cyl(x, 2.27, z, 0.3, 0.05, 0.3, M.darkWood, 8); }
  fixture(cx, 1.0, cz, { off: false, power: 7, range: 10, color: 0xff8030, tag: 'altar', mesh: false });
}

// ---------- the street ----------
export const LOTS = {
  home: { side: 1, zc: 0 }, moss: { side: 1, zc: 20 }, e5: { side: 1, zc: 40 }, dorsey: { side: 1, zc: 60 }, e9: { side: 1, zc: 80 }, e11: { side: 1, zc: 100 },
  w2: { side: -1, zc: 10 }, w4: { side: -1, zc: 30 }, ferris: { side: -1, zc: 50 }, w8: { side: -1, zc: 70 }, w10: { side: -1, zc: 90 }, w12: { side: -1, zc: 110 },
};
function street(scene) {
  // ground everywhere, the road, the sidewalks, the cul-de-sac
  floor(-40, -24, 40, 154, 0, M.lawn, 0.3);
  floor(-3.6, -24, 3.6, 124, 0.01, M.asphalt, 0.05);
  floor(-15, 122, 15, 139, 0.01, M.asphalt, 0.05);
  for (const s of [-1, 1]) {
    floor(Math.min(s * 3.6, s * 5.3), -24, Math.max(s * 3.6, s * 5.3), 122, 0.1, M.paving, 0.1);
    V(Math.min(s * 3.55, s * 3.68), 0, -24, Math.max(s * 3.55, s * 3.68), 0.12, 122, M.concrete, { cast: false });
  }
  // the centre line, worn
  for (let z = -22; z < 120; z += 4) V(-0.06, 0.012, z, 0.06, 0.016, z + 2, M.white, { cast: false });
  // the bottom of the lane: a road-closed barrier and the dark beyond
  for (const x of [-3, 0, 3]) { B(x - 1.1, 0.7, -14.05, x + 1.1, 0.95, -13.95, M.white); for (const s of [-1, 1]) B(x + s * 0.9 - 0.04, 0, -14.3, x + s * 0.9 + 0.04, 0.9, -13.7, M.white, { collide: false }); }
  B(-40, 0, -14.2, 40, 3, -13.8, M.black, { cast: false }).visible = false;
  plane(TX.sign('ROAD CLOSED', { w: 256, h: 64, bg: '#e8a020', fg: '#111', font: 'bold 34px Arial, sans-serif' }), 0, 1.15, -13.92, 0, 1.2, 0.3);
  B(-40, 0, -24, -36, 4, 154, M.black, { cast: false }).visible = false; B(36, 0, -24, 40, 4, 154, M.black, { cast: false }).visible = false;
  // street lamps (most of them broken tonight)
  const lamps = [[5.0, -6, 1], [-5.0, 14, 0], [5.0, 34, 1], [-5.0, 54, 0], [5.0, 74, 1], [-5.0, 94, 0], [5.0, 114, 1], [-12, 130, 1]];
  W.props.lamps = [];
  lamps.forEach(([x, z, on], i) => {
    cyl(x, 0, z, 0.08, 0.06, 4.6, M.steel, 8, { collide: true });
    const s = Math.sign(-x); V(Math.min(x, x + s * 1.0), 4.5, z - 0.05, Math.max(x, x + s * 1.0), 4.6, z + 0.05, M.steel);
    W.props.lamps.push(fixture(x + s * 1.0, 4.48, z, { off: !on, power: 16, range: 16, color: 0xffb870, tag: 'lamp', flicker: i === 2 || i === 5 ? 1 : 0 }));
  });
  // every lot
  const dress = {
    home: { sid: 4, porchLight: true, lit: [true, false] }, e5: { sid: 1, porchLight: false, lit: [false, false] }, e9: { sid: 5, porchLight: false, lit: ['tv', false] }, e11: { sid: 6, porchLight: false },
    w2: { sid: 2, porchLight: false, lit: [false, true] }, w4: { sid: 0, porchLight: false }, w8: { sid: 3, porchLight: false, lit: [false, false] }, w10: { sid: 1, porchLight: false }, w12: { sid: 2, porchLight: false, roof: M.roof2 },
  };
  for (const [k, o] of Object.entries(dress)) houseOutside(lot(LOTS[k].side, LOTS[k].zc), o);
  // fences between back yards (with a broken board here and there), and the back fence
  for (const s of [-1, 1]) {
    B(Math.min(s * 34, s * 34.15), 0, -14, Math.max(s * 34, s * 34.15), 2.2, 122, M.oldWood);
    const zs = s > 0 ? [10, 30, 50, 70, 90] : [20, 40, 60, 80, 100];
    for (const z of zs) {
      const gapAt = 29 + ((z / 10) % 3);
      B(Math.min(s * 26, s * gapAt), 0, z - 0.05, Math.max(s * 26, s * gapAt), 1.8, z + 0.05, M.oldWood);
      B(Math.min(s * (gapAt + 1.1), s * 34), 0, z - 0.05, Math.max(s * (gapAt + 1.1), s * 34), 1.8, z + 0.05, M.oldWood);
    }
    // the top end of each side
    B(Math.min(s * 14, s * 34), 0, 121.9, Math.max(s * 14, s * 34), 2.2, 122.1, M.oldWood);
    B(Math.min(s * 14, s * 34), 0, -14.1, Math.max(s * 14, s * 34), 2.2, -13.9, M.oldWood);
  }
  // the Marsh fence across the top of the cul-de-sac, and its gate
  B(-15, 0, 138.9, -1.2, 1.4, 139.05, M.rust); B(1.2, 0, 138.9, 15, 1.4, 139.05, M.rust);
  B(-15.1, 0, 122, -14.9, 1.4, 139, M.rust); B(14.9, 0, 122, 15.1, 1.4, 139, M.rust);
  B(-40, 0, 138.9, -15, 2.2, 139.1, M.oldWood); B(15, 0, 138.9, 40, 2.2, 139.1, M.oldWood);
  for (const x of [-1.25, 1.25]) cyl(x, 0, 139, 0.09, 0.09, 1.7, M.rust, 8);
  W.props.gate = door('gate', 'x', 139, -1.18, 1.18, 0, M.rust, { name: 'Gate', locked: true, lockedText: 'Chained shut. The padlock says MARSH.', h: 1.4 });
  const gs = T2.painted('PRIVATE\nKEEP OUT', { w: 256, h: 128, bg: '#c8c0a8', fg: '#4a0a06', font: 'bold 40px Impact, sans-serif', drip: false });
  plane(gs, -3.5, 1.05, 138.85, Math.PI, 1, 0.5);
  // the cul-de-sac: bushes to hide in
  for (const [x, z] of [[-11, 126], [11, 132]]) { B(x - 1.3, 0, z - 0.8, x + 1.3, 1.25, z + 0.8, M.hedge, { see: true }); hide('bush' + x, 'hedge', x, 0, z, x < 0 ? -Math.PI / 2 : Math.PI / 2, [x + (x < 0 ? 2.0 : -2.0), z], {}); }
}

// ---------- yard decorations: hedges, trees, gravestones, sheets, skeletons, pumpkins, leaves ----------
const PUMPKINS = []; // [x, y, z, yaw, scale, kind] kind: 0 classic 1 grin 2 angry 3 plain
function yards(scene) {
  const R = TX.rng(31);
  for (const [k, { side, zc }] of Object.entries(LOTS)) {
    const L = lot(side, zc);
    // a hedge along the front of most yards, with a gap for the path
    if (!['dorsey'].includes(k)) for (const [v0, v1] of [[-8.5, -1.6], [1.6, 8.5]]) {
      L.B(6.2, 0, v0, 7.2, 1.15, v1, M.hedge, { see: true });
    }
    if (['moss', 'e5', 'ferris', 'w8', 'e9', 'w4'].includes(k)) L.hide(k + 'Hedge', 'hedge', 6.7, 0, side > 0 ? 5.0 : -5.0, 0, 8.4, side > 0 ? 5.0 : -5.0);
    // a bare tree in the front yard
    const tu = 9.5 + R() * 2, tv = k === 'dorsey' ? -6 : (R() < 0.5 ? -1 : 1) * (4 + R() * 3);
    bareTree(L.x(tu), L.z(tv), 4.5 + R() * 2, R);
    // jack-o'-lanterns on the steps and the porch rail
    if (k !== 'home') {
      const n = 1 + ((R() * 3) | 0);
      for (let i = 0; i < n; i++) PUMPKINS.push([L.x(11.75 + R() * 0.3), FY, L.z((i % 2 ? 1.4 : -1.4) + (R() - 0.5) * 0.3), R() * 0.6 - 0.3 + (side > 0 ? -Math.PI / 2 : Math.PI / 2), 0.75 + R() * 0.5, (R() * 4) | 0]);
    } else PUMPKINS.push([L.x(11.8), 0.13, L.z(1.3), -Math.PI / 2, 1, 1]);
    // gravestones in some yards, a sheet ghost hanging in some trees
    const gs = R() < 0.5 ? -1 : 1;
    if (R() < 0.6 && k !== 'dorsey') for (let i = 0; i < 3; i++) { const u = 8.2 + i * 1.1, v = gs * (3.2 + (i % 2) * 1.4); L.B(u - 0.06, 0, v - 0.3, u + 0.06, 0.6 + R() * 0.3, v + 0.3, M.stone, { collide: false }); }
    if (R() < 0.5) { const g = sheetGhost(); g.position.set(L.x(tu), 3.2, L.z(tv) + 0.8); W.dyn.push({ o: g, kind: 'sway', ph: R() * 6 }); }
  }
  // trees behind the back fences (a dark wood)
  for (let z = -10; z < 150; z += 6) for (const s of [-1, 1]) bareTree(s * (36.5 + R() * 2), z + R() * 3, 6 + R() * 3, R);
  for (let x = -30; x <= 30; x += 7) bareTree(x + R() * 2, 209 + R() * 3, 6 + R() * 3, R);
  // leaves: one instanced mesh, thousands of them
  const lt = T2.leaf(), lm = new THREE.MeshStandardMaterial({ map: lt, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 });
  const lg = new THREE.PlaneGeometry(0.16, 0.16); lg.rotateX(-Math.PI / 2);
  const N = 2600, im = new THREE.InstancedMesh(lg, lm, N), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
  const cols = [0x8a3a10, 0x9a5a14, 0x5a2a10, 0x8a6a20, 0x6a2010, 0xa04010];
  for (let i = 0; i < N; i++) {
    const x = (R() - 0.5) * 66, z = -12 + R() * 150;
    e.set((R() - 0.5) * 0.4, R() * 6.3, (R() - 0.5) * 0.4); q.setFromEuler(e); const s = 0.7 + R() * 0.9; sc.set(s, s, s);
    p.set(x, 0.12 + R() * 0.02, z); m4.compose(p, q, sc); im.setMatrixAt(i, m4); im.setColorAt(i, c.set(cols[(R() * cols.length) | 0]).multiplyScalar(0.6 + R() * 0.5));
  }
  im.receiveShadow = true; im.castShadow = false; scene.add(im);
}
function bareTree(x, z, h, R) {
  cyl(x, 0, z, 0.22, 0.12, h, M.bark, 7, { collide: true });
  for (let i = 0; i < 5; i++) {
    const a = R() * 6.3, y = h * (0.45 + R() * 0.5), len = 1.2 + R() * 1.8, tilt = 0.6 + R() * 0.5;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.08, len, 5), M.bark);
    m.position.set(x + Math.cos(a) * Math.sin(tilt) * len / 2, y + Math.cos(tilt) * len / 2, z + Math.sin(a) * Math.sin(tilt) * len / 2);
    m.rotation.set(0, -a, 0); m.rotateZ(-tilt); m.castShadow = true; m.userData.static = true; W.scene.add(m);
  }
}
function sheetGhost() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.1, 10, 1, true), new THREE.MeshStandardMaterial({ color: 0xd8d8d0, side: THREE.DoubleSide, roughness: 0.9 })); body.position.y = -0.55; body.rotation.x = Math.PI; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), body.material); head.position.y = 0; g.add(head);
  const eyeM = M.black; for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), eyeM); e.position.set(s * 0.07, 0.02, 0.17); g.add(e); }
  W.scene.add(g); return g;
}

// instanced jack-o'-lanterns: one mesh per face kind, a glow sprite each (one draw call for all the glows)
const pumpkinGeo = (() => { const g = new THREE.SphereGeometry(0.2, 18, 12); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const a = Math.atan2(z, x), rib = 1 + 0.06 * Math.cos(a * 10); p.setXYZ(i, x * rib * 1.18, y * 0.86, z * rib * 1.18); } g.computeVertexNormals(); g.translate(0, 0.17, 0); return g; })();
export function pumpkinMesh(kind, seed = 41, text = '') {
  const tex = kind === 'plain' ? T2.pumpkinSkin(seed) : T2.carved(kind, seed, text);
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, emissive: kind === 'plain' ? 0x000000 : 0xffffff, emissiveMap: tex.glow || null, emissiveIntensity: kind === 'plain' ? 0 : 1.6 });
  const mesh = new THREE.Mesh(pumpkinGeo, m); mesh.castShadow = true;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.08, 6), M.green || col(0x3a4a20)); stem.position.y = 0.36; mesh.add(stem);
  return mesh;
}
function lanterns(scene) {
  const kinds = ['classic', 'grin', 'angry', 'plain'];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const glowPos = [];
  kinds.forEach((kind, ki) => {
    const list = PUMPKINS.filter((x) => x[5] === ki); if (!list.length) return;
    const src = pumpkinMesh(kind, 41 + ki);
    const im = new THREE.InstancedMesh(pumpkinGeo, src.material, list.length); im.castShadow = true; im.receiveShadow = true;
    list.forEach(([x, y, z, yaw, sc], i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw); s.setScalar(sc); p.set(x, y, z); m4.compose(p, q, s); im.setMatrixAt(i, m4); if (kind !== 'plain') glowPos.push(x, y + 0.17 * sc, z); });
    scene.add(im); W.meshes['lanterns' + ki] = im;
  });
  const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(glowPos, 3));
  const pts = new THREE.Points(gg, new THREE.PointsMaterial({ map: T2.glow(), color: 0xff8a30, size: 1.4, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  scene.add(pts); W.glows = pts;
}

// ---------- the build ----------
export function buildWorld(scene) {
  W.scene = scene; makeMaterials();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 16), M.sky); sky.renderOrder = -1; scene.add(sky); W.meshes.sky = sky;
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: T2.moon(), fog: false, depthWrite: false, color: 0xffd8b0 })); moon.scale.set(60, 60, 1); moon.position.set(-90, 70, 220); scene.add(moon); W.meshes.moon = moon;
  street(scene);
  // Sam's house (#1): you can't go in until the end
  const home = lot(1, 0);
  W.props.homeDoor = home.inter('home', 13.9, FY + 1.1, 0, 1.9);
  // the Moss house (#3, east): the door is open
  const moss = lot(1, 20); houseOutside(moss, { sid: 0, shell: true, porchLight: false });
  W.props.moss = houseInside(moss, 'moss', { sid: 0, frontOpen: true, paper: [M.wallA, M.wallB, M.wallC, M.wallE], livingFloor: M.carpet });
  // the Ferris house (#6, west): the front door is locked; round the back
  const fer = lot(-1, 50); houseOutside(fer, { sid: 1, shell: true, porchLight: false });
  W.props.ferris = houseInside(fer, 'ferris', { sid: 1, frontLocked: true, frontLockedText: 'Locked. The candy goes round the side of the house.', paper: [M.wallC, M.wallB, M.wallD, M.wallA], kidWall: M.wallD, kidName: "Lisa's room", kidSheet: M.fabricPink, livingFloor: M.carpetBlue });
  // the Dorseys' (#7, east): the house is dark, the garage is open
  const dor = lot(1, 60);
  dor.B(14, 0, -8.5, 26, FY + CEIL, -0.6, M.siding3);
  windowLit('z', dor.x(14) - 0.01, dor.z(-6.5), dor.z(-4.5), FY + 0.9, FY + 2.0, false, -1);
  dor.V(13.94, FY, -3.1, 14.0, FY + 2.08, -2.0, M.door);
  roofZ(dor.x(13.7), dor.x(26.3), dor.z(-8.8), dor.z(-0.3), FY + CEIL, FY + CEIL + 2, M.roof);
  floor(dor.x(5.3), dor.z(3.6), dor.x(10), dor.z(5.0), 0.04, M.concrete, 0.1);
  W.props.dorsey = dorseyGarage(dor);
  marsh();
  field(scene);
  yards(scene);
  lanterns(scene);
  details(scene);
  W.props.corn = W.meshes.corn;
  mergeStatic(scene);
  buildGrid();
  buildNav();
}

// ---------- detail ----------
function details(scene) {
  const R = TX.rng(5);
  // the Moss house: the TV is on, a rocking chair in front of it, a candy bowl on the porch
  const ms = lot(1, 20);
  W.props.mossChair = ms.pos(17.6, 4.2);
  ms.B(15.0, 0, 0.9, 15.6, FY + 0.9, 1.3, M.wood, { collide: false });
  cyl(ms.x(12.6), FY, ms.z(-1.2), 0.2, 0.15, 0.12, M.steel, 10);
  // photographs in the halls
  plane(T2.photo('danny'), ms.x(21.5), FY + 1.6, ms.z(1.43), Math.PI, 0.3, 0.38);
  const fs = lot(-1, 50);
  plane(T2.photo('lisa'), fs.x(24.8), FY + 1.5, fs.z(-5.92), 0, 0.36, 0.45);
  plane(T2.photo('lisa'), fs.x(19.0), FY + 1.6, fs.z(-1.43), Math.PI, 0.3, 0.38);
  // Lisa's room: drawings taped to the walls
  for (let i = 0; i < 5; i++) plane(T2.paper(70 + i), fs.x(20.07), FY + 1.1 + (i % 2) * 0.5, fs.z(-5.2 + i * 0.7), fs.side > 0 ? Math.PI / 2 : -Math.PI / 2, 0.3, 0.38);
  // the Ferris dinner: plates, and in the middle a pumpkin with something else in it
  for (const [u, v] of [[23.1, 3.2], [23.1, 4.0]]) fs.V(u - 0.15, FY + 0.76, v - 0.15, u + 0.15, FY + 0.78, v + 0.15, M.white, { cast: false });
  // the Dorsey yard: a hay bale, a skeleton slumped in a lawn chair
  const ds = lot(1, 60);
  ds.B(7.8, 0, 6.0, 8.9, 0.5, 7.4, M.hay);
  // sawhorse, crates in the Marsh cul-de-sac
  B(-12.5, 0, 133, -11.5, 0.8, 134, M.oldWood); B(10, 0, 124, 11.2, 0.6, 125.2, M.oldWood);
  // lit candles on the Marsh porch
  for (const x of [-2.2, 2.2]) cyl(x, FY, 140.3, 0.05, 0.045, 0.25, M.candle, 6, { cast: false });
  void R;
}

// ---------- optimisation: bake every static box into a few big meshes ----------
function mergeStatic(scene) {
  const keep = new Set();
  const mark = (o) => { if (!o) return; if (o.isObject3D) o.traverse((c) => keep.add(c)); };
  for (const v of Object.values(W.meshes)) mark(v);
  for (const f of W.fixtures) mark(f.m);
  const vcMats = new Map(), _col = new THREE.Color();
  const vcMat = (m) => { const k = m.roughness.toFixed(1) + '|' + m.metalness.toFixed(1); if (!vcMats.has(k)) vcMats.set(k, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: m.roughness, metalness: m.metalness })); return vcMats.get(k); };
  const plain = (m) => m.isMeshStandardMaterial && !m.map && !m.transparent && m.side === THREE.FrontSide && m.emissive.getHex() === 0;
  const groups = new Map();
  for (const m of [...scene.children]) {
    if (!m.isMesh || m.isInstancedMesh || !m.userData.static || keep.has(m)) continue;
    const p = m.position, cell = Math.floor(p.x / 40) + ',' + Math.floor(p.z / 40);
    const vc = plain(m.material), mt = vc ? vcMat(m.material) : m.material;
    const key = mt.uuid + '|' + m.castShadow + '|' + cell;
    if (!groups.has(key)) groups.set(key, { mat: mt, vc, cast: m.castShadow, list: [] });
    groups.get(key).list.push(m);
  }
  let before = 0, after = 0;
  for (const gr of groups.values()) {
    before += gr.list.length;
    if (gr.list.length < 2 && !gr.vc) { after++; continue; }
    const geos = gr.list.map((m) => {
      m.updateMatrixWorld(true); let g = m.geometry.clone(); g.applyMatrix4(m.matrixWorld);
      if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      if (gr.vc) { _col.copy(m.material.color); const n = g.attributes.position.count, c = new Float32Array(n * 3); for (let i = 0; i < n; i++) { c[i * 3] = _col.r; c[i * 3 + 1] = _col.g; c[i * 3 + 2] = _col.b; } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); }
      return g;
    });
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) { after += gr.list.length; continue; }
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, gr.mat); mesh.castShadow = gr.cast; mesh.receiveShadow = true; mesh.matrixAutoUpdate = false;
    scene.add(mesh); after++;
    for (const m of gr.list) { scene.remove(m); m.geometry.dispose(); for (const c of W.colliders) if (c.mesh === m) c.mesh = null; }
  }
  for (const m of scene.children) if (m.isMesh && m.userData.static && !keep.has(m)) { m.updateMatrix(); m.matrixAutoUpdate = false; }
  W.stats = { before, after };
}

// ---------- collision grid ----------
const CELL = 2, GRID = new Map();
const gkey = (i, j) => i * 10007 + j;
function buildGrid() {
  GRID.clear();
  W.colliders.forEach((c) => {
    for (let i = Math.floor(c.x0 / CELL); i <= Math.floor(c.x1 / CELL); i++) for (let j = Math.floor(c.z0 / CELL); j <= Math.floor(c.z1 / CELL); j++) {
      const k = gkey(i, j); let a = GRID.get(k); if (!a) GRID.set(k, (a = [])); a.push(c);
    }
  });
}
const EMPTY = [];
const cellAt = (x, z) => GRID.get(gkey(Math.floor(x / CELL), Math.floor(z / CELL))) || EMPTY;
const near = (x, z, r) => {
  if (r <= 0.5) { const out = new Set(); for (const dx of [-r, r]) for (const dz of [-r, r]) for (const c of cellAt(x + dx, z + dz)) out.add(c); return out; }
  const out = new Set(); for (let i = Math.floor((x - r) / CELL); i <= Math.floor((x + r) / CELL); i++) for (let j = Math.floor((z - r) / CELL); j <= Math.floor((z + r) / CELL); j++) for (const c of GRID.get(gkey(i, j)) || EMPTY) out.add(c); return out;
};

// ---------- queries ----------
export function groundY(x, z, feet) {
  let best = 0;
  for (const f of W.floors) {
    if (x < f.x0 || x > f.x1 || z < f.z0 || z > f.z1) continue;
    if (f.y <= feet + 0.45 && f.y > best) best = f.y;
  }
  return best;
}
export function collide(x, z, dx, dz, r, feet, h = 1.7) {
  const lo = feet + 0.3, hi = feet + h;
  const cand = near(x + dx / 2, z + dz / 2, r + Math.hypot(dx, dz));
  const test = (px, pz) => {
    for (const c of cand) {
      if (c.off || c.y1 <= lo || c.y0 >= hi) continue;
      if (px > c.x0 - r && px < c.x1 + r && pz > c.z0 - r && pz < c.z1 + r) return c;
    }
    return null;
  };
  let nx = x + dx, c;
  if ((c = test(nx, z))) nx = dx > 0 ? c.x0 - r - 0.001 : dx < 0 ? c.x1 + r + 0.001 : nx;
  if (test(nx, z)) nx = x;
  let nz = z + dz;
  if ((c = test(nx, nz))) nz = dz > 0 ? c.z0 - r - 0.001 : dz < 0 ? c.z1 + r + 0.001 : nz;
  if (test(nx, nz)) nz = z;
  return [nx, nz];
}
// is there a wall between two points at height y? doors: true = closed doors block, false = doors never block.
// see: hedges and the like don't block sight (seeThrough = true) but do block walking
// (an exact segment-against-box test: the walls inside the houses are thinner than any sampling step)
let lineStamp = 0;
export function clearLine(x0, z0, x1, z1, y, doors = true, seeThrough = false) {
  const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz), n = Math.max(1, Math.ceil(len / CELL));
  const stamp = ++lineStamp;
  for (let i = 0; i <= n; i++) {
    const cx = x0 + dx * i / n, cz = z0 + dz * i / n;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const list = GRID.get(gkey(Math.floor(cx / CELL) + a, Math.floor(cz / CELL) + b)); if (!list) continue;
      for (const c of list) {
        if (c.stamp === stamp) continue; c.stamp = stamp;
        if (c.y0 > y || c.y1 < y || c.off) continue;
        if (c.door && !doors) continue;
        if (seeThrough && c.see) continue;
        // ignore a box either end is standing in
        if ((x0 > c.x0 && x0 < c.x1 && z0 > c.z0 && z0 < c.z1) || (x1 > c.x0 && x1 < c.x1 && z1 > c.z0 && z1 < c.z1)) continue;
        let t0 = 0, t1 = 1, hit = true;
        for (const [p, d, lo, hi] of [[x0, dx, c.x0, c.x1], [z0, dz, c.z0, c.z1]]) {
          if (Math.abs(d) < 1e-9) { if (p <= lo || p >= hi) { hit = false; break; } continue; }
          let ta = (lo - p) / d, tb = (hi - p) / d; if (ta > tb) [ta, tb] = [tb, ta];
          if (ta > t0) t0 = ta; if (tb < t1) t1 = tb;
          if (t0 >= t1) { hit = false; break; }
        }
        if (hit && t1 > 0.001 && t0 < 0.999) return false;
      }
    }
  }
  return true;
}
// where you are (for the story, the sounds, how far he can see)
export function zoneOf(x, y, z) {
  const inHouse = (side, zc) => side * x > 13.95 && side * x < 26.05 && z > zc - 6.05 && z < zc + 6.05 && y > 0.15;
  if (inHouse(1, 20)) return 'moss';
  if (inHouse(-1, 50)) return 'ferris';
  if (x > 10 && x < 32 && z > 60 && z < 68.5) return 'maze';
  if (x > -9 && x < 9 && z > 142 && z < 154 && y > 0.15) return 'marsh';
  if (z > 154.6) return inCorn(x, z) ? 'corn' : 'field';
  if (z > 122) return 'culdesac';
  if (Math.abs(x) < 5.3) return 'street';
  return 'yard';
}
export const indoors = (zone) => zone === 'moss' || zone === 'ferris' || zone === 'maze' || zone === 'marsh';

// ---------- the Pumpkin Man's map: points, joined where there's a clear line ----------
function buildNav() {
  const N = W.nodes;
  const add = (x, z, tag = '') => { const n = { x, z, tag, id: N.length, e: [] }; N.push(n); return n; };
  for (let z = -10; z <= 120; z += 7) { add(0, z, 'street'); add(4.4, z, 'walk'); add(-4.4, z, 'walk'); }
  for (let z = 124; z <= 136; z += 4) for (let x = -12; x <= 12; x += 6) add(x, z, 'culdesac');
  for (const [k, { side, zc }] of Object.entries(LOTS)) {
    const L = lot(side, zc);
    if (k === 'dorsey') { add(...L.pos(9, -2.5), 'path'); add(...L.pos(9, -6), 'yard'); add(...L.pos(13, -9.3), 'side'); add(...L.pos(20, -9.3), 'side'); add(...L.pos(27, -9.3), 'side'); }
    else {
      add(...L.pos(9, 0), 'path'); add(...L.pos(12.4, 0), 'porch'); add(...L.pos(9, 4.5), 'yard'); add(...L.pos(9, -4.5), 'yard');
      add(...L.pos(13, 7.6), 'side'); add(...L.pos(20, 7.6), 'side'); add(...L.pos(27, 7.6), 'side');
      add(...L.pos(13, -7.6), 'side'); add(...L.pos(20, -7.6), 'side'); add(...L.pos(27, -7.6), 'side');
    }
    for (const v of [-6, -1, 4]) add(...L.pos(30, v), 'back');
    const g = 29 + (((zc + (side > 0 ? 10 : 10)) / 10) % 3); void g;
    if (k === 'moss' || k === 'ferris') {
      for (const [u, v] of [[15.0, 0], [18.6, 0], [21.5, 0], [24.8, 0], [27.3, 0], [16.15, 1.5], [23.35, 1.5], [16.65, -1.5], [23.25, -1.5], [20, 3.9], [17.8, 2.6], [18.0, 4.6], [23.0, 2.3], [21.0, 4.9], [24.6, 4.9], [16.6, -2.6], [17.4, -3.3], [23.2, -2.6], [22.4, -3.8]]) add(...L.pos(u, v), k);
    }
  }
  // the back-yard fence gaps
  for (const s of [-1, 1]) for (const z of s > 0 ? [10, 30, 50, 70, 90] : [20, 40, 60, 80, 100]) { const g = 29 + ((z / 10) % 3) + 0.55; add(s * g, z - 1.2, 'gap'); add(s * g, z + 1.2, 'gap'); }
  // the haunted garage lanes (east, zc 60): local u, v
  const D = lot(1, 60);
  for (const [u, v] of [[8.5, 4.3], [11.3, 4.3], [11.3, 7.7], [13.9, 7.7], [13.9, 4.3], [13.9, 0.8], [16.5, 0.8], [16.5, 3.3], [16.5, 5.4], [16.5, 7.7], [19.6, 7.7], [19.6, 4.3], [19.6, 1.25], [22.8, 1.25], [25.5, 1.8], [25.5, 4.3], [28.7, 1.2], [28.7, -0.8], [28.7, -3]]) add(...D.pos(u, v), 'maze');
  // the Marsh house and the field
  for (const [x, z] of [[0, 140.5], [0, 143.3], [1.4, 145.8], [0.9, 147.2], [-1.85, 147.3], [-1.85, 148], [-1.85, 148.8], [-1.85, 149.6], [-5, 150], [1.85, 147.4], [1.85, 148], [1.85, 149.3], [4.6, 149.4], [4.55, 152.5], [4.55, 154], [4.55, 155.3]]) add(x, z, 'marsh');
  for (const [x, z] of PATH) add(x, z, 'path');
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; add(CLEARING.x + Math.cos(a) * 8.5, CLEARING.z + Math.sin(a) * 8.5, 'ring'); }
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.5; add(CLEARING.x + Math.cos(a) * 3.8, CLEARING.z + Math.sin(a) * 3.8, 'clearing'); }
  for (let z = 160; z <= 202; z += 8) for (let x = -24; x <= 24; x += 8) { if (Math.hypot(x - CLEARING.x, z - CLEARING.z) < 9) continue; add(x, z, 'corn'); }
  // join: within 10 m and nothing in the way (closed doors don't count: he opens them), with room for his shoulders
  const ok = (a, b) => {
    const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz), nx = -dz / l * 0.32, nz = dx / l * 0.32;
    return clearLine(a.x, a.z, b.x, b.z, 0.6, false) && clearLine(a.x + nx, a.z + nz, b.x + nx, b.z + nz, 0.6, false) && clearLine(a.x - nx, a.z - nz, b.x - nx, b.z - nz, 0.6, false);
  };
  for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) {
    const a = N[i], b = N[j], d = Math.hypot(a.x - b.x, a.z - b.z);
    if (d > 10.5 || d < 0.3) continue;
    if (ok(a, b)) { a.e.push([j, d]); b.e.push([i, d]); }
  }
}
export function nearestNode(x, z, needClear = true) {
  let best = null, bd = Infinity;
  for (const n of W.nodes) {
    const d = (n.x - x) ** 2 + (n.z - z) ** 2;
    if (d < bd && (!needClear || d < 0.5 || clearLine(x, z, n.x, n.z, 0.6, false))) { bd = d; best = n; }
  }
  return best;
}
// A* over the graph: the list of points from (x0,z0) to (x1,z1)
export function findPath(x0, z0, x1, z1) {
  const s = nearestNode(x0, z0), t = nearestNode(x1, z1);
  if (!s || !t) return [[x1, z1]];
  const N = W.nodes, g = new Map([[s.id, 0]]), from = new Map(), open = new Set([s.id]), h = (n) => Math.hypot(n.x - t.x, n.z - t.z);
  const f = new Map([[s.id, h(s)]]);
  let guard = 0;
  while (open.size && guard++ < 4000) {
    let cur = null, cf = Infinity; for (const id of open) { const v = f.get(id); if (v < cf) { cf = v; cur = id; } }
    if (cur === t.id) break;
    open.delete(cur);
    for (const [nb, d] of N[cur].e) {
      const ng = g.get(cur) + d;
      if (ng < (g.get(nb) ?? Infinity)) { g.set(nb, ng); from.set(nb, cur); f.set(nb, ng + h(N[nb])); open.add(nb); }
    }
  }
  if (!from.has(t.id) && s !== t) return [[x1, z1]];
  const out = [[x1, z1]]; let c = t.id; while (c !== undefined && c !== s.id) { out.push([N[c].x, N[c].z]); c = from.get(c); }
  out.push([s.x, s.z]); out.reverse();
  // cut the corner: skip the first points when there is already a clear line past them
  while (out.length > 1 && clearLine(x0, z0, out[1][0], out[1][1], 0.6, false)) out.shift();
  return out;
}
export function randomNode(filter) { const list = W.nodes.filter(filter); return list[(Math.random() * list.length) | 0]; }

export function updateWorld(dt, t) {
  for (const d of W.doors.values()) {
    if (Math.abs(d.ang - d.target) < 0.001) continue;
    d.ang += (d.target - d.ang) * Math.min(1, dt * 7);
    d.pivot.rotation.y = d.axis === 'x' ? -d.ang : d.ang;
  }
  for (const o of W.dyn) if (o.kind === 'sway') { o.o.rotation.z = Math.sin(t * 0.9 + o.ph) * 0.12; o.o.rotation.x = Math.sin(t * 0.6 + o.ph * 2) * 0.08; }
}
export { lot };
