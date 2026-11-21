// People: one jointed body for everyone (Sam, Toby, the neighbours in their masks, the children he took).
// One person = ONE skinned mesh (every part baked in, coloured per vertex, bound rigidly to its joint) + the head
// (it needs its own texture: a face, a mask, a skull). Two draw calls a person.
import * as THREE from 'three';
import * as T2 from './tex2.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const G = {
  head: new THREE.SphereGeometry(0.115, 20, 14),
  neck: new THREE.CylinderGeometry(0.05, 0.055, 0.1, 8),
  torso: new THREE.CapsuleGeometry(0.16, 0.34, 4, 10),
  hips: new THREE.CapsuleGeometry(0.15, 0.08, 4, 10),
  upper: new THREE.CapsuleGeometry(0.052, 0.22, 3, 8),
  lower: new THREE.CapsuleGeometry(0.045, 0.22, 3, 8),
  hand: new THREE.SphereGeometry(0.048, 8, 6),
  thigh: new THREE.CapsuleGeometry(0.075, 0.3, 3, 8),
  shin: new THREE.CapsuleGeometry(0.06, 0.32, 3, 8),
  shoe: new THREE.BoxGeometry(0.11, 0.08, 0.26),
  coat: new THREE.CylinderGeometry(0.2, 0.32, 0.8, 12, 1, true),
  dress: new THREE.CylinderGeometry(0.19, 0.36, 0.75, 12, 1, true),
  rib: new THREE.BoxGeometry(0.26, 0.022, 0.02),
  bone: new THREE.BoxGeometry(0.03, 0.24, 0.02),
  ear: new THREE.SphereGeometry(0.025, 6, 4),
  hat: new THREE.ConeGeometry(0.16, 0.42, 12),
  brim: new THREE.CylinderGeometry(0.28, 0.28, 0.015, 18),
  earC: new THREE.ConeGeometry(0.04, 0.09, 4),
};
G.shoe.translate(0, 0, 0.05);

const headMats = new Map();
// kind: a mask (smile pig cat witch skull wolf old), or a face (toby sam)
export function headMaterial(kind) {
  if (!headMats.has(kind)) headMats.set(kind, new THREE.MeshStandardMaterial({ map: T2.mask(kind), roughness: ['toby', 'sam'].includes(kind) ? 0.65 : 0.3 }));
  return headMats.get(kind);
}
const bodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
export const ghostMat = new THREE.MeshBasicMaterial({ color: 0xbfd8ff, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
const ghostHead = new THREE.MeshBasicMaterial({ color: 0xd8e8ff, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
const _c = new THREE.Color();
export const RIGS = []; // every body, so the far ones can be skipped
export function cullRigs(cam, far = 50) { for (const r of RIGS) { const p = r.root.position; const on = Math.hypot(p.x - cam.x, p.z - cam.z) < far || !!r.root.parent?.isBone || r.root.parent !== r.root.parent; r.body.visible = r.headMesh.visible = on; } }

// o: { head, skin, shirt, pants, shoes, coat, dress, hat ('witch'), skeleton, kid, ears ('cat') }
export function makePerson(o = {}) {
  const C = { skin: o.skin ?? 0xd8a888, shirt: o.shirt ?? 0x3a5a8a, pants: o.pants ?? 0x2a2a3a, shoes: o.shoes ?? 0x1a1410, coat: o.coat ?? 0x555555, hair: o.hair ?? 0x3a2414 };
  const root = new THREE.Group();
  const bone = (parent, x, y, z) => { const b = new THREE.Bone(); b.position.set(x, y, z); parent.add(b); return b; };
  const hips = bone(root, 0, 0.95, 0), spine = bone(hips, 0, 0.08, 0), neck = bone(spine, 0, 0.56, 0), head = bone(neck, 0, 0.16, 0);
  const limbs = {};
  for (const s of [-1, 1]) {
    const sh = bone(spine, s * 0.21, 0.47, 0), el = bone(sh, 0, -0.3, 0), hp = bone(hips, s * 0.09, -0.02, 0), kn = bone(hp, 0, -0.45, 0);
    limbs[s < 0 ? 'L' : 'R'] = { sh, el, hp, kn };
  }
  const bones = [hips, spine, neck, head, limbs.L.sh, limbs.L.el, limbs.L.hp, limbs.L.kn, limbs.R.sh, limbs.R.el, limbs.R.hp, limbs.R.kn];
  root.updateMatrixWorld(true);
  const parts = [];
  const part = (geo, color, b, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rz = 0) => {
    const g = geo.clone();
    if (g.index) { /* keep */ } else g.setIndex([...Array(g.attributes.position.count).keys()]);
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, rz)), new THREE.Vector3(sx, sy, sz)));
    g.applyMatrix4(b.matrixWorld);
    const n = g.attributes.position.count, bi = bones.indexOf(b);
    _c.set(color);
    const col = new Float32Array(n * 3), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; si[i * 4] = bi; sw[i * 4] = 1; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    parts.push(g);
  };
  const W = 0xe8e6dc;
  part(G.hips, C.pants, hips, 0, 0.02, 0, 1, 1, 1, Math.PI / 2);
  part(G.torso, C.shirt, spine, 0, 0.27, 0, 1.12, 1, 0.78);
  part(G.neck, C.skin, neck, 0, 0.03, 0);
  part(G.ear, C.skin, head, -0.112, 0, 0); part(G.ear, C.skin, head, 0.112, 0, 0);
  if (o.skeleton) for (let i = 0; i < 5; i++) part(G.rib, W, spine, 0, 0.42 - i * 0.07, 0.125, 1 - i * 0.06, 1, 1);
  for (const s of ['L', 'R']) {
    const l = limbs[s];
    part(G.upper, o.coat ? C.coat : C.shirt, l.sh, 0, -0.15, 0);
    part(G.lower, o.coat ? C.coat : C.shirt, l.el, 0, -0.14, 0); part(G.hand, o.skeleton ? W : C.skin, l.el, 0, -0.31, 0.01);
    part(G.thigh, C.pants, l.hp, 0, -0.22, 0);
    part(G.shin, C.pants, l.kn, 0, -0.22, 0); part(G.shoe, C.shoes, l.kn, 0, -0.46, 0);
    if (o.skeleton) { part(G.bone, W, l.sh, 0, -0.15, 0.05); part(G.bone, W, l.el, 0, -0.14, 0.045); part(G.bone, W, l.hp, 0, -0.22, 0.075); part(G.bone, W, l.kn, 0, -0.22, 0.062); }
  }
  if (o.coat) part(G.coat, C.coat, spine, 0, 0.1, 0, 1.1, 1, 0.85);
  if (o.dress) part(G.dress, o.dress, hips, 0, -0.3, 0, 1, 1, 0.85);
  if (o.hat === 'witch') { part(G.hat, 0x141414, head, 0, 0.28, -0.01); part(G.brim, 0x141414, head, 0, 0.08, 0); }
  if (o.ears === 'cat') { part(G.earC, 0x1a1a1a, head, -0.07, 0.12, 0, 1, 1, 0.5, 0.3); part(G.earC, 0x1a1a1a, head, 0.07, 0.12, 0, 1, 1, 0.5, -0.3); }
  if (o.ears === 'pig') { part(G.earC, 0xd88080, head, -0.08, 0.1, 0.02, 1, 0.8, 0.5, 0.8); part(G.earC, 0xd88080, head, 0.08, 0.1, 0.02, 1, 0.8, 0.5, -0.8); }
  const geo = mergeGeometries(parts, false); parts.forEach((g) => g.dispose());
  const body = new THREE.SkinnedMesh(geo, bodyMat);
  body.castShadow = true; body.receiveShadow = true; body.frustumCulled = false;
  root.add(body); body.bind(new THREE.Skeleton(bones));
  const headMesh = new THREE.Mesh(G.head, headMaterial(o.head || 'sam')); headMesh.scale.set(1, 1.12, 1.02); headMesh.castShadow = true; head.add(headMesh);
  if (o.kid) root.scale.setScalar(o.kid);
  const rig = { root, body, hips, spine, neck, head, headMesh, limbs, phase: Math.random() * 6, opts: o };
  RIGS.push(rig); return rig;
}
export function makeGhost(o = {}) {
  const r = makePerson({ ...o, kid: o.kid ?? 0.66 });
  r.body.material = ghostMat; r.headMesh.material = ghostHead; r.body.castShadow = false; r.headMesh.castShadow = false;
  return r;
}
export function setLayer(rig, n) { rig.root.traverse((c) => c.layers.set(n)); }

// walk = 0 standing, 1 walking, 2 running. look = head yaw/pitch (radians, relative)
export function animate(rig, dt, walk = 0, t = 0, look = null) {
  rig.phase += dt * (walk > 1.5 ? 11 : 7.2) * Math.min(1, walk);
  const p = rig.phase, a = Math.min(1, walk) * (walk > 1.5 ? 1.0 : 0.55);
  const { L, R } = rig.limbs;
  L.hp.rotation.x = Math.sin(p) * a; R.hp.rotation.x = -Math.sin(p) * a;
  L.kn.rotation.x = Math.max(0, -Math.cos(p)) * a * 1.3; R.kn.rotation.x = Math.max(0, Math.cos(p)) * a * 1.3;
  L.sh.rotation.x = -Math.sin(p) * a * 0.8; R.sh.rotation.x = Math.sin(p) * a * 0.8;
  L.el.rotation.x = -0.15 - a * 0.4; R.el.rotation.x = -0.15 - a * 0.4;
  L.sh.rotation.z = -0.06; R.sh.rotation.z = 0.06;
  rig.hips.position.y = 0.95 + Math.abs(Math.sin(p)) * a * 0.05 + Math.sin(t * 1.7) * 0.004;
  rig.spine.rotation.x = walk > 1.5 ? 0.18 : 0.02;
  rig.spine.rotation.y = Math.sin(p) * a * 0.12;
  if (look) { rig.neck.rotation.y = look[0]; rig.head.rotation.x = look[1]; }
}
export function pose(rig, name, t = 0) {
  const { L, R } = rig.limbs;
  if (name === 'stand') { for (const s of [L, R]) { s.sh.rotation.set(0, 0, 0); s.el.rotation.set(0, 0, 0); s.hp.rotation.set(0, 0, 0); s.kn.rotation.set(0, 0, 0); } L.sh.rotation.z = -0.06; R.sh.rotation.z = 0.06; rig.spine.rotation.set(0, 0, 0); rig.hips.rotation.set(0, 0, 0); rig.hips.position.y = 0.95; rig.neck.rotation.set(0, 0, 0); rig.head.rotation.set(0, 0, 0); }
  if (name === 'reach') { L.sh.rotation.x = R.sh.rotation.x = -1.4; L.el.rotation.x = R.el.rotation.x = -0.2; L.sh.rotation.z = 0.15; R.sh.rotation.z = -0.15; }
  if (name === 'point') { R.sh.rotation.x = -1.55; R.el.rotation.x = 0; }
  if (name === 'bucket') { R.sh.rotation.x = -0.5; R.el.rotation.x = -1.0; }
  if (name === 'wrong') { rig.neck.rotation.z = 0.5 + Math.sin(t * 0.7) * 0.05; }
  if (name === 'sit') { L.hp.rotation.x = R.hp.rotation.x = -1.5; L.kn.rotation.x = R.kn.rotation.x = 1.5; rig.hips.position.y = 0.5; }
  if (name === 'hug') { rig.spine.rotation.x = 0.35; L.sh.rotation.x = R.sh.rotation.x = -0.6; L.sh.rotation.z = 0.5; R.sh.rotation.z = -0.5; L.el.rotation.x = R.el.rotation.x = -1.6; L.hp.rotation.x = R.hp.rotation.x = -1.4; L.kn.rotation.x = R.kn.rotation.x = 2.2; rig.hips.position.y = 0.38; }
  if (name === 'lie') { rig.hips.rotation.x = -Math.PI / 2; rig.hips.position.y = 0.13; }
}
