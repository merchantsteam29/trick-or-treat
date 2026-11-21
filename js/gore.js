// Blood and bodies. Two instanced meshes hold every drop and every splat (one draw call each, allocated once),
// and loose body parts get simple physics: gravity, a bounce, a slide, then rest.
import * as THREE from 'three';
import * as TX from './tex.js';

const MAX_DROPS = 700, MAX_SPLATS = 90;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _e = new THREE.Euler();
const UP = new THREE.Vector3(0, 1, 0);

export function createGore(scene, groundY) {
  const dropMat = new THREE.MeshStandardMaterial({ color: 0x5a0303, roughness: 0.25, metalness: 0.1 });
  const drops = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.022, 0), dropMat, MAX_DROPS);
  drops.instanceMatrix.setUsage(THREE.DynamicDrawUsage); drops.count = 0; drops.frustumCulled = false; scene.add(drops);
  const D = Array.from({ length: MAX_DROPS }, () => ({ on: false, p: new THREE.Vector3(), v: new THREE.Vector3(), s: 1, t: 0 }));
  const splatMat = new THREE.MeshStandardMaterial({ map: TX.splat(3), transparent: true, depthWrite: false, roughness: 0.2, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -2 });
  const splats = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), splatMat, MAX_SPLATS);
  splats.instanceMatrix.setUsage(THREE.DynamicDrawUsage); splats.count = 0; splats.frustumCulled = false; splats.renderOrder = 1; scene.add(splats);
  const S = []; // { p, n (normal), size, grow, max, rot }
  let dropHead = 0, live = 0;
  const parts = [];

  function spray(at, dir, n = 40, speed = 4, spread = 0.6) {
    for (let i = 0; i < n; i++) {
      const d = D[dropHead]; dropHead = (dropHead + 1) % MAX_DROPS;
      if (!d.on) live++;
      d.on = true; d.t = 0; d.s = 0.6 + Math.random() * 1.6;
      d.p.copy(at).add(_p.set((Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1));
      d.v.copy(dir).normalize().multiplyScalar(speed * (0.4 + Math.random() * 0.8));
      d.v.x += (Math.random() - 0.5) * speed * spread; d.v.y += (Math.random() - 0.3) * speed * spread; d.v.z += (Math.random() - 0.5) * speed * spread;
    }
  }
  // a stain on a surface: n = its normal (up for floors). It can spread out like a pool.
  function splat(at, size = 0.4, n = UP, grow = 0, max = size) {
    const s = S.length < MAX_SPLATS ? {} : S.shift();
    Object.assign(s, { p: at.clone().addScaledVector(n, 0.004), n: n.clone(), size: grow ? size * 0.2 : size, grow, max, rot: Math.random() * 6.28 });
    S.push(s); dirtySplats = true;
    return s;
  }
  const pool = (at, max = 1.4, rate = 0.25) => splat(at, max, UP, rate, max);
  let dirtySplats = false;

  // a body part flying loose: an Object3D (usually a limb group of a body) moved to the world
  function loose(obj, vel, spin = 6, bleed = true) {
    obj.updateMatrixWorld(true);
    obj.getWorldPosition(_p); obj.getWorldQuaternion(_q);
    scene.attach(obj);
    parts.push({ o: obj, v: vel.clone(), w: new THREE.Vector3((Math.random() - 0.5) * spin, (Math.random() - 0.5) * spin, (Math.random() - 0.5) * spin), rest: false, bleed, bt: 0 });
  }

  function update(dt) {
    // drops
    if (live > 0) {
      let k = 0;
      for (const d of D) {
        if (!d.on) continue;
        d.t += dt; d.v.y -= 9.8 * dt; d.p.addScaledVector(d.v, dt);
        const gy = groundY(d.p.x, d.p.z, d.p.y + 0.3);
        if (d.p.y <= gy || d.t > 3) {
          d.on = false; live--;
          if (d.p.y <= gy && Math.random() < 0.18) splat(_p.set(d.p.x, gy, d.p.z), 0.08 + Math.random() * 0.18);
          continue;
        }
        _s.set(d.s, d.s * (1 + Math.min(2, d.v.length() * 0.3)), d.s);
        _q.setFromUnitVectors(UP, _p.copy(d.v).normalize());
        _m.compose(d.p, _q, _s); drops.setMatrixAt(k++, _m);
      }
      drops.count = k; drops.instanceMatrix.needsUpdate = true;
    } else if (drops.count) drops.count = 0;
    drops.visible = drops.count > 0;
    // pools spreading
    for (const s of S) if (s.grow && s.size < s.max) { s.size = Math.min(s.max, s.size + s.grow * dt * (1 - s.size / s.max * 0.7)); dirtySplats = true; }
    if (dirtySplats) {
      dirtySplats = false;
      S.forEach((s, i) => {
        _q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), s.n); _q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), s.rot));
        _m.compose(s.p, _q, _s.set(s.size, s.size, 1)); splats.setMatrixAt(i, _m);
      });
      splats.count = S.length; splats.instanceMatrix.needsUpdate = true;
    }
    splats.visible = splats.count > 0;
    // loose parts
    for (const pt of parts) {
      if (pt.rest) continue;
      pt.v.y -= 9.8 * dt; pt.o.position.addScaledVector(pt.v, dt);
      pt.o.rotation.x += pt.w.x * dt; pt.o.rotation.y += pt.w.y * dt; pt.o.rotation.z += pt.w.z * dt;
      const gy = groundY(pt.o.position.x, pt.o.position.z, pt.o.position.y + 0.3) + 0.06;
      if (pt.o.position.y < gy) {
        pt.o.position.y = gy;
        if (Math.abs(pt.v.y) > 1.5) { pt.v.y *= -0.25; if (pt.bleed) splat(_p.set(pt.o.position.x, gy - 0.06, pt.o.position.z), 0.25 + Math.random() * 0.25); }
        else pt.v.y = 0;
        pt.v.x *= 0.6; pt.v.z *= 0.6; pt.w.multiplyScalar(0.5);
        if (pt.v.lengthSq() < 0.04) { pt.rest = true; if (pt.bleed) pool(_p.set(pt.o.position.x, gy - 0.06, pt.o.position.z), 0.5, 0.2); }
      }
      if (pt.bleed && (pt.bt -= dt) < 0) { pt.bt = 0.05; spray(pt.o.getWorldPosition(_p), pt.v.clone().multiplyScalar(-0.1).add(UP), 2, 0.8, 1); }
    }
  }
  function clear() {
    for (const d of D) d.on = false; live = 0; drops.count = 0;
    S.length = 0; splats.count = 0; splats.visible = drops.visible = false;
    for (const pt of parts) { pt.o.parent?.remove(pt.o); }
    parts.length = 0;
  }
  return { spray, splat, pool, loose, update, clear, get busy() { return live > 0 || parts.some((p) => !p.rest); } };
}
void _e;
