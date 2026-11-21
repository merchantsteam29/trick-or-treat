// How Sam dies. Every death has a first-person moment (always) and, with Gore set to Full, a few seconds afterwards
// looking at what is left. With Quick cut it goes to black at the moment it happens.
import * as THREE from 'three';
import { makePerson, pose } from './people.js';
import * as T2 from './tex2.js';
import { FY } from './world.js';

const SAM = { head: 'sam', shirt: 0x7a2a22, pants: 0x2a3650, shoes: 0xc8c4b8 };
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = v3(0, 1, 0);

export function createDeaths(c) {
  const { scene, camera, P, A, gore, U, pm } = c;
  let body = null, extra = [], kind = null, t = 0, full = true, phase = 'fp', info = {}, inner = null;
  const carvedMat = (() => { const tx = T2.carvedHead(0xd8a888); return new THREE.MeshStandardMaterial({ map: tx, emissive: 0xffffff, emissiveMap: tx.glow, emissiveIntensity: 1.6, roughness: 0.6 }); })();
  function makeBody() { body?.root.parent?.remove(body.root); body = makePerson(SAM); scene.add(body.root); return body; }
  function cleanup() {
    body?.root.parent?.remove(body.root); body = null;
    for (const e of extra) e.parent?.remove(e); extra = [];
    if (inner) { inner.parent?.remove(inner); inner = null; }
    gore.clear();
    document.getElementById('bloodFX').className = '';
  }
  const blood = (k) => { document.getElementById('bloodFX').className = 'on ' + k; };
  const look = (from, at, roll = 0) => { camera.position.copy(from); camera.lookAt(at); if (roll) camera.rotateZ(roll); camera.updateMatrixWorld(); };
  const lay = (b, x, y, z, yaw, back = true) => { b.root.position.set(x, y, z); b.root.rotation.set(0, yaw, 0); pose(b, 'stand'); b.hips.rotation.x = back ? -Math.PI / 2 : Math.PI / 2; b.hips.position.y = 0.13; };
  const pmHead = () => { const p = v3(); pm.R.head.getWorldPosition(p); return p; };

  const KINDS = {
    // he has you: lifted to his face, the candle in his head, and the knife
    carved: {
      fp: 2.3, fpU(t, dt) {
        const h = pmHead(), lift = Math.min(1, t / 0.7), eye = v3(P.x, P.y + 1.55 + lift * 0.9, P.z);
        // he pulls you in towards him
        eye.x += (h.x - eye.x) * lift * 0.45; eye.z += (h.z - eye.z) * lift * 0.45;
        const sh = 0.04 + (t > 1.3 ? 0.08 : 0);
        eye.x += (Math.random() - 0.5) * sh; eye.y += (Math.random() - 0.5) * sh;
        look(eye, h.clone().add(v3(0, -0.05 + Math.sin(t * 9) * 0.02, 0)), Math.sin(t * 3) * 0.1);
        pm.R.limbs.L.sh.rotation.x = -1.6; pm.R.limbs.R.sh.rotation.x = -1.2 + Math.min(1, Math.max(0, t - 1.0)) * -0.9;
        pm.R.light.intensity = 9 + Math.random() * 4;
        if (t > 0.05 && !this.r) { this.r = 1; A.roar(h, 0.9); }
        if (t > 1.35 && !this.k) { this.k = 1; A.carve(eye, 5, 0.16); A.crunch(eye, 0.9); blood('heavy'); U.red.value = 0.55; c.shake(0.7); }
        if (t > 1.35) U.red.value = Math.min(0.8, U.red.value + dt * 0.4);
        if (!full && t > 1.4) U.black.value = 1;
        else if (t > 2.0) U.black.value = (t - 2.0) * 3.5;
      },
      tp: 5.5, tpStart() {
        // what he leaves on the lawn: you, with your head carved like one of his, a candle lit inside
        const b = makeBody(), yaw = Math.random() * 6.3;
        lay(b, P.x, P.y, P.z, yaw, true);
        b.headMesh.material = carvedMat;
        inner = new THREE.PointLight(0xff8030, 3, 3.5, 2); b.head.add(inner); inner.position.set(0, 0.05, 0.12);
        b.limbs.L.sh.rotation.z = -1.1; b.limbs.R.sh.rotation.z = 1.3; b.limbs.R.el.rotation.x = -0.8; b.limbs.L.hp.rotation.z = -0.25;
        b.neck.rotation.z = 0.5;
        const hp = v3(); b.head.getWorldPosition(hp);
        gore.spray(hp, UP, 160, 3.2, 1.2); gore.pool(v3(hp.x, P.y, hp.z), 1.7, 0.3);
        for (let i = 0; i < 9; i++) gore.splat(v3(P.x + (Math.random() - 0.5) * 3, P.y, P.z + (Math.random() - 0.5) * 3), 0.15 + Math.random() * 0.35);
        // what he scooped out, on the grass beside you
        for (let i = 0; i < 14; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.02 + Math.random() * 0.035, 5, 4), new THREE.MeshStandardMaterial({ color: Math.random() < 0.5 ? 0x7a1010 : 0xc8a890, roughness: 0.35 })); s.position.set(hp.x + (Math.random() - 0.5) * 0.9, P.y + 0.02, hp.z + (Math.random() - 0.5) * 0.9); scene.add(s); extra.push(s); }
        // he stands over you, a little way off, then walks away
        pm.place(P.x + Math.cos(yaw) * 1.6, P.z + Math.sin(yaw) * 1.6, Math.atan2(-(P.x - (P.x + Math.cos(yaw) * 1.6)), -(P.z - (P.z + Math.sin(yaw) * 1.6))));
        U.black.value = 0; U.red.value = 0.1; this.cam = { yaw, a: Math.random() * 6.3 };
      },
      tpU(t) {
        const b = body, hp = v3(); b.head.getWorldPosition(hp);
        const a = this.cam.a + t * 0.12, r = 2.6 - t * 0.12;
        look(v3(hp.x + Math.cos(a) * r, P.y + 1.9 - t * 0.12, hp.z + Math.sin(a) * r), hp.clone().add(v3(0, -0.1, 0)));
        inner.intensity = 2.5 + Math.sin(t * 17) * 0.4 + Math.random() * 0.4;
        b.headMesh.material.emissiveIntensity = 1.4 + Math.random() * 0.3;
        if (t > 4.6) U.black.value = (t - 4.6) * 1.2;
      },
    },
    // pulled out of where you were hiding
    found: {
      fp: 2.0, fpU(t, dt) {
        const h = pmHead();
        const k = Math.min(1, t / 0.5), eye = v3(P.x, P.y + (info.eye ?? 1.5), P.z);
        eye.x += (h.x - eye.x) * k * 0.5; eye.y += (h.y - 0.3 - eye.y) * k * 0.6; eye.z += (h.z - eye.z) * k * 0.5;
        eye.x += (Math.random() - 0.5) * 0.06; eye.y += (Math.random() - 0.5) * 0.06;
        look(eye, h, Math.sin(t * 5) * 0.2);
        pm.R.limbs.L.sh.rotation.x = -1.5; pm.R.limbs.R.sh.rotation.x = -1.5;
        if (!this.r) { this.r = 1; A.roar(h, 1); A.thud(eye, 0.8, 0, 60); c.shake(0.6); }
        if (t > 1.2 && !this.k) { this.k = 1; A.carve(eye, 4, 0.18); A.splat(eye, 0.9); blood('heavy'); }
        if (t > 1.2) U.red.value = Math.min(0.8, U.red.value + dt * 0.5);
        if (!full && t > 1.25) U.black.value = 1; else if (t > 1.7) U.black.value = (t - 1.7) * 3.5;
      },
      tp: 5, tpStart() { KINDS.carved.tpStart.call(this); }, tpU(t) { KINDS.carved.tpU.call(this, t); },
    },
    // they hold your arms; he comes up the path
    held: {
      fp: 3.0, fpU(t, dt) {
        if (!this.s) { this.s = 1; A.shriek(v3(P.x, P.y + 1.6, P.z)); c.shake(0.4); pm.place(P.x - Math.sin(P.yaw) * 6, P.z - Math.cos(P.yaw) * 6, P.yaw + Math.PI); pm.setActive(true); pm.state = 'grab'; }
        // walk him in
        const dx = P.x - pm.x, dz = P.z - pm.z, d = Math.hypot(dx, dz);
        if (d > 1.0) { pm.x += dx / d * dt * 2.2; pm.z += dz / d * dt * 2.2; }
        pm.root.position.set(pm.x, pm.y, pm.z); pm.root.rotation.y = Math.atan2(-dx, -dz) + Math.PI;
        const h = pmHead(), eye = v3(P.x + (Math.random() - 0.5) * 0.03, P.y + 1.55, P.z);
        look(eye, h, Math.sin(t * 8) * 0.04);
        pm.R.light.intensity = 9;
        if (t > 2.1 && !this.k) { this.k = 1; A.roar(h, 1); A.carve(eye, 5, 0.15); blood('heavy'); U.red.value = 0.5; c.shake(0.8); }
        if (t > 2.1) U.red.value = Math.min(0.85, U.red.value + dt * 0.5);
        if (!full && t > 2.15) U.black.value = 1; else if (t > 2.6) U.black.value = (t - 2.6) * 3;
      },
      tp: 5, tpStart() { KINDS.carved.tpStart.call(this); }, tpU(t) { KINDS.carved.tpU.call(this, t); },
    },
    // the blade: your view falls to the floor, rolls, and you see your body standing there
    headless: {
      fp: 2.6, fpU(t, dt) {
        if (!this.s) { this.s = 1; A.blade(v3(16.5, 1.5, 64.3)); A.crunch(v3(P.x, 1.5, P.z), 1); blood('heavy'); c.shake(0.5); this.body = makeBody(); this.body.root.position.set(P.x, P.y, P.z); this.body.root.rotation.y = P.yaw + Math.PI; this.body.headMesh.visible = false; this.spin = (Math.random() < 0.5 ? -1 : 1); }
        if (!full) { U.black.value = t > 0.1 ? 1 : 0; return; }
        // the head drops and rolls
        const k = Math.min(1, t / 0.55), roll = Math.min(1, t / 1.6);
        const hx = P.x + Math.sin(P.yaw) * -0.6 * roll + 0.3 * this.spin * roll, hz = P.z + Math.cos(P.yaw) * -0.6 * roll;
        const hy = 0.05 + 0.16 + (1.55 - 0.16) * (1 - k * k) + Math.abs(Math.sin(t * 9)) * 0.1 * (1 - roll);
        const neck = v3(P.x, P.y + 1.45, P.z);
        camera.position.set(hx, hy, hz); camera.lookAt(neck.x, neck.y - 0.4 * roll, neck.z); camera.rotateZ(this.spin * (1.2 + roll * 0.6) * k); camera.updateMatrixWorld();
        if (t > 0.08 && !this.sp) { this.sp = 1; gore.spray(neck, UP, 140, 4.5, 0.35); }
        if (t > 0.08 && t < 1.8 && Math.random() < 0.6) gore.spray(neck, v3((Math.random() - 0.5) * 0.4, 1, (Math.random() - 0.5) * 0.4), 6, 3.4, 0.3);
        if (t > 1.2 && !this.fall) { this.fall = 1; A.thud(neck, 0.8, 0, 60); gore.pool(v3(P.x, P.y + 0.01, P.z), 1.5, 0.35); }
        if (this.fall) { const f = Math.min(1, (t - 1.2) / 0.6); this.body.spine.rotation.x = f * 0.8; this.body.hips.position.y = 0.95 - f * 0.6; this.body.limbs.L.kn.rotation.x = this.body.limbs.R.kn.rotation.x = f * 1.6; this.body.limbs.L.hp.rotation.x = this.body.limbs.R.hp.rotation.x = -f * 1.2; }
        if (t > 2.1) U.black.value = (t - 2.1) * 2;
      },
      tp: 0,
    },
    // in the run home, with Toby: torn
    torn: {
      fp: 2.0, fpU(t, dt) { KINDS.carved.fpU.call(this, t, dt); },
      tp: 5, tpStart() {
        const b = makeBody(), yaw = Math.random() * 6.3; lay(b, P.x, P.y, P.z, yaw, false);
        const f = v3(Math.cos(yaw), 0, Math.sin(yaw));
        gore.loose(b.limbs.R.sh, v3(f.x * 2 + 1, 2.4, f.z * 2), 8); gore.loose(b.limbs.L.hp, v3(-f.x * 2, 2, -f.z * 2 + 1), 7);
        const hp = v3(); b.spine.getWorldPosition(hp);
        gore.spray(hp, UP, 200, 4, 1.2); gore.pool(v3(hp.x, P.y, hp.z), 2.0, 0.35);
        for (let i = 0; i < 12; i++) gore.splat(v3(P.x + (Math.random() - 0.5) * 4, P.y, P.z + (Math.random() - 0.5) * 4), 0.2 + Math.random() * 0.4);
        // Toby's bucket, on its side
        const bk = c.bucket(); if (bk) { bk.visible = true; bk.position.set(P.x + 1.2, P.y + 0.1, P.z + 0.4); bk.rotation.set(0, 0, Math.PI / 2); }
        pm.place(P.x + 30, P.z + 30, 0); U.black.value = 0; U.red.value = 0.12; this.cam = { a: Math.random() * 6.3 };
      },
      tpU(t) { const a = this.cam.a + t * 0.1; look(v3(P.x + Math.cos(a) * 3.2, P.y + 2.6, P.z + Math.sin(a) * 3.2), v3(P.x, P.y + 0.2, P.z)); if (t > 4.2) U.black.value = (t - 4.2) * 1.3; },
    },
  };

  return {
    start(k, i = {}, isFull = true) {
      cleanup(); kind = k; info = i; full = isFull; t = 0; phase = 'fp';
      for (const key of Object.keys(KINDS)) { const K = KINDS[key]; delete K.r; delete K.k; delete K.s; delete K.sp; delete K.fall; delete K.body; }
    },
    update(dt) {
      const K = KINDS[kind] || KINDS.carved;
      t += dt;
      if (phase === 'fp') {
        K.fpU.call(K, t, dt);
        if (t >= K.fp) {
          if (!full || !K.tp) return true;
          phase = 'tp'; t = 0; K.tpStart.call(K); document.getElementById('bloodFX').className = '';
        }
        return false;
      }
      K.tpU.call(K, t, dt);
      return t >= K.tp;
    },
    cleanup,
    get kind() { return kind; },
  };
}
void FY;
