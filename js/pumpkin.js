// The Tall Pumpkin Man: nine and a half feet of black coat and long white fingers, and a carved head with a candle
// in it that you can see coming from the other end of the street. He walks the lane, listens, looks, and runs.
// You can't fight him. You can hide, keep low, keep your light off, and hold your breath.
import * as THREE from 'three';
import { pumpkinMesh, collide, clearLine, findPath, randomNode, W, groundY, zoneOf, indoors, inCorn, setDoor } from './world.js';
import * as T2 from './tex2.js';

const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

function buildBody(scene) {
  const root = new THREE.Group();
  const coatM = new THREE.MeshStandardMaterial({ color: 0x0d0c0e, roughness: 0.95, side: THREE.DoubleSide });
  const skinM = new THREE.MeshStandardMaterial({ color: 0xa8a898, roughness: 0.6 });
  const clothM = new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 0.9 });
  const seg = (parent, len, r0, r1, m, y = 0) => { const g = new THREE.Group(); g.position.y = y; parent.add(g); const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, 7), m); mesh.position.y = -len / 2; mesh.castShadow = true; g.add(mesh); return g; };
  const hips = new THREE.Group(); hips.position.y = 1.34; root.add(hips);
  const spine = new THREE.Group(); hips.add(spine);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.8, 8), clothM); torso.position.y = 0.4; torso.castShadow = true; spine.add(torso);
  // the coat: a long, ragged cone from the shoulders to the shins
  const cg = new THREE.CylinderGeometry(0.24, 0.48, 1.55, 14, 4, true); const p = cg.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < -0.7) p.setY(i, y - Math.random() * 0.35); const k = 1 + (Math.random() - 0.5) * 0.12; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); }
  cg.computeVertexNormals();
  const coat = new THREE.Mesh(cg, coatM); coat.position.y = 0.05; coat.castShadow = true; spine.add(coat);
  const neck = new THREE.Group(); neck.position.y = 0.82; spine.add(neck);
  const nk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.2, 6), skinM); nk.position.y = 0.08; neck.add(nk);
  const head = new THREE.Group(); head.position.y = 0.32; neck.add(head);
  const pump = pumpkinMesh('pm', 66); pump.scale.set(1.55, 1.7, 1.55); pump.position.y = -0.3; head.add(pump);
  const headMat = pump.material; headMat.emissiveIntensity = 2.2;
  const glowS = new THREE.Sprite(new THREE.SpriteMaterial({ map: T2.glow(), color: 0xff7a20, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  glowS.scale.set(2.2, 2.2, 1); glowS.position.set(0, 0, 0.15); head.add(glowS);
  const light = new THREE.PointLight(0xff7020, 0, 11, 1.6); light.position.set(0, 0.0, 0.6); head.add(light);
  const limbs = {};
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.26, 0.74, 0); spine.add(sh);
    const up = seg(sh, 0.66, 0.05, 0.06, coatM); const el = new THREE.Group(); el.position.y = -0.66; up.add(el);
    const fo = seg(el, 0.62, 0.035, 0.045, skinM);
    const hand = new THREE.Group(); hand.position.y = -0.62; fo.add(hand);
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.04), skinM); palm.position.y = -0.04; hand.add(palm);
    for (let f = 0; f < 4; f++) { const fg = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.013, 0.26, 4), skinM); fg.position.set(-0.03 + f * 0.02, -0.2, 0); fg.rotation.z = (f - 1.5) * 0.06; hand.add(fg); }
    const hp = new THREE.Group(); hp.position.set(s * 0.11, 0, 0); hips.add(hp);
    const th = seg(hp, 0.68, 0.06, 0.08, clothM); const kn = new THREE.Group(); kn.position.y = -0.68; th.add(kn);
    const sn = seg(kn, 0.64, 0.045, 0.06, clothM);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.34), clothM); boot.position.set(0, -0.66, 0.08); sn.add(boot);
    limbs[s < 0 ? 'L' : 'R'] = { sh, el, hp, kn, fo, hand };
  }
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(root);
  return { root, hips, spine, neck, head, headMat, glowS, light, limbs, pump };
}

export function createPumpkinMan(c) {
  const { scene, A } = c;
  const R = buildBody(scene);
  const pm = {
    R, root: R.root, active: false, state: 'off', x: 0, z: -40, y: 0, yaw: 0, aware: 0, speed: 0, path: [], pi: 0, wait: 0,
    target: null, last: null, lastSeenT: 99, lostT: 0, searchT: 0, region: null, onArrive: null, lookAt: null, phase: 0, stepT: 0,
    hideSeen: null, hearT: 0, flare: 0, visibleToPlayer: false, seenByPlayerT: 0, script: null, stoop: 0, tpT: 0, noTeleport: false, chaseSpeed: 3.7,
    grabbing: false, sawSpot: null, sinceAlert: 99,
  };
  R.root.visible = false;
  let humH = null;

  pm.setActive = (on, region = null) => {
    pm.active = on; R.root.visible = on; pm.region = region;
    if (!on) { pm.state = 'off'; R.light.intensity = 0; A.flame(null, 0); humH?.stop(); humH = null; return; }
    if (!humH) humH = A.hum(v3(pm.x, 2.4, pm.z));
    if (pm.state === 'off') pm.state = 'patrol';
  };
  pm.place = (x, z, yaw = 0) => { pm.x = x; pm.z = z; pm.y = groundY(x, z, 0.5); pm.yaw = yaw; R.root.position.set(x, pm.y, z); R.root.rotation.y = yaw + Math.PI; pm.path = []; pm.wait = 0; pm.aware = 0; pm.lastSeenT = 99; pm.hideSeen = null; pm.hearT = 0; pm.grabbing = false; };
  pm.goTo = (x, z, speed = 1.5, onArrive = null) => { pm.path = findPath(pm.x, pm.z, x, z); pm.pi = 0; pm.speed = speed; pm.onArrive = onArrive; pm.wait = 0; };
  // a list of moves for scripted scenes: [{ to: [x, z], speed, wait, look: [x, z], fn }]
  pm.runScript = (steps, then = 'patrol') => { pm.script = { steps, i: -1, then }; pm.state = 'script'; nextStep(); };
  function nextStep() {
    const s = pm.script; if (!s) return;
    s.i++; const st = s.steps[s.i];
    if (!st) { pm.state = s.then; pm.script = null; return; }
    st.fn?.();
    if (st.to) pm.goTo(st.to[0], st.to[1], st.speed ?? 1.5, () => { pm.wait = st.wait ?? 0; pm.lookAt = st.look || null; pm.waitThen = nextStep; });
    else { pm.wait = st.wait ?? 0.01; pm.lookAt = st.look || null; pm.waitThen = nextStep; }
  }
  // someone told him where you are (a neighbour screamed, or you made a noise)
  pm.alert = (x, z, loud = 1) => {
    if (!pm.active || pm.state === 'chase' || pm.state === 'script' || pm.state === 'grab') return;
    pm.sinceAlert = 0;
    const d = Math.hypot(x - pm.x, z - pm.z);
    if (loud >= 1 && d > 40 && !pm.visibleToPlayer && !pm.noTeleport) { // he's never as far away as you'd like
      const n = randomNode((n) => { const dd = Math.hypot(n.x - x, n.z - z); return dd > 18 && dd < 30 && Math.hypot(n.x - c.P.x, n.z - c.P.z) > 14 && regionOk(n); });
      if (n) pm.place(n.x, n.z, Math.atan2(-(x - n.x), -(z - n.z)));
    }
    pm.state = 'investigate'; pm.last = { x, z }; pm.goTo(x, z, loud >= 1 ? 2.8 : 2.0, () => { pm.state = 'search'; pm.searchT = 7; pm.wait = 1.5; });
  };
  pm.hear = (x, z, radius) => { if (!pm.active || pm.state === 'chase' || pm.state === 'script' || pm.state === 'grab') return; if (Math.hypot(x - pm.x, z - pm.z) < radius) { if (pm.state === 'patrol' || pm.state === 'search' || (pm.state === 'investigate' && pm.sinceAlert > 2)) pm.alert(x, z, 0.5); } };
  const regionOk = (n) => !pm.region || pm.region(n);

  // ---- can he see Sam? 0 = no, up to 1 = clearly ----
  function visibility(p) {
    if (p.hidden) return 0;
    const dx = p.x - pm.x, dz = p.z - pm.z, d = Math.hypot(dx, dz);
    const zone = p.zone;
    let range = indoors(zone) ? (zone === 'maze' ? 7 : 10) : zone === 'corn' ? 3.5 : 17;
    if (inCorn(pm.x, pm.z) && zone !== 'corn') range = Math.min(range, 8);
    if (p.flash) range *= 1.75;
    if (p.crouching) range *= 0.55;
    if (p.lit) range *= 1.35;
    if (p.moving < 0.2) range *= 0.8;
    if (d > range) return 0;
    const face = Math.atan2(-dx, -dz), off = Math.abs(angDiff(face, pm.yaw));
    if (d > 2.2 && off > (pm.state === 'chase' ? 1.6 : 1.25)) return 0;
    const eye = Math.min(2.4, p.y + (p.crouching ? 0.9 : 1.5));
    if (!clearLine(pm.x, pm.z, p.x, p.z, eye, true, !p.crouching)) return 0;
    return Math.max(0.15, 1 - d / range);
  }

  function moveAlong(dt, sp) {
    if (!pm.path.length || pm.pi >= pm.path.length) return true;
    const [tx, tz] = pm.path[pm.pi];
    const dx = tx - pm.x, dz = tz - pm.z, d = Math.hypot(dx, dz);
    if (d < 0.35) { pm.pi++; if (pm.pi >= pm.path.length) return true; return false; }
    step(dt, dx / d, dz / d, sp);
    return false;
  }
  function step(dt, nx, nz, sp) {
    const want = Math.atan2(-nx, -nz); pm.yaw += angDiff(want, pm.yaw) * Math.min(1, dt * 6);
    // doors in the way: he opens them (hard, if he's running)
    for (const d of W.doors.values()) if (!d.open && Math.hypot(d.cx - pm.x, d.cz - pm.z) < 1.3) { setDoor(d, true); A.doorSound(v3(d.cx, 1, d.cz), true, pm.state === 'chase'); c.onDoor?.(d); }
    // squeezing through a doorway he does not quite fit: he just goes (he always gets through)
    const [x, z] = pm.squeeze > 0 ? [pm.x + nx * sp * dt, pm.z + nz * sp * dt] : collide(pm.x, pm.z, nx * sp * dt, nz * sp * dt, 0.3, pm.y, 1.9);
    if (pm.squeeze > 0) pm.squeeze -= dt;
    const moved = Math.hypot(x - pm.x, z - pm.z);
    pm.stuck = moved < sp * dt * 0.2 ? (pm.stuck || 0) + dt : 0;
    if (pm.stuck > 0.5 && pm.state !== 'chase') { pm.squeeze = 0.6; pm.stuck = 0; }
    if (pm.stuck > 0.9 && pm.state === 'chase' && pm.path.length) { pm.squeeze = 0.4; pm.stuck = 0; }
    pm.x = x; pm.z = z; pm.y += (groundY(x, z, pm.y + 0.3) - pm.y) * Math.min(1, dt * 10);
    pm.moved = moved / Math.max(dt, 1e-4);
  }

  function patrol(dt) {
    if (pm.wait > 0) { pm.wait -= dt; return; }
    if (!pm.path.length || pm.pi >= pm.path.length) {
      const n = randomNode((n) => regionOk(n) && Math.hypot(n.x - pm.x, n.z - pm.z) > 8);
      if (n) pm.goTo(n.x, n.z, 1.45, () => { pm.wait = 1.5 + Math.random() * 3; });
      return;
    }
    if (moveAlong(dt, pm.speed)) { pm.path = []; const f = pm.onArrive; pm.onArrive = null; f?.(); }
  }

  // update. p = Sam: { x, y, z, crouching, hidden, hide, flash, flashDir, lit, moving, running, zone, breath, holding }
  pm.update = (dt, t, p) => {
    if (!pm.active) return null;
    pm.lastSeenT += dt; pm.sinceAlert += dt;
    const vis = pm.state === 'grab' ? 0 : visibility(p);
    // the flashlight in his face: he knows
    let lit = false;
    if (p.flash && !p.hidden) {
      const dx = pm.x - p.x, dz = pm.z - p.z, dy = (pm.y + 2.3) - (p.y + 1.5), d = Math.hypot(dx, dy, dz);
      if (d < 28 && (dx * p.flashDir.x + dy * p.flashDir.y + dz * p.flashDir.z) / d > 0.93 && clearLine(p.x, p.z, pm.x, pm.z, 1.5, true, true)) lit = true;
    }
    if (vis > 0 || lit) { pm.aware = Math.min(1.2, pm.aware + (lit ? 3 : vis * 2.6) * dt); }
    else pm.aware = Math.max(0, pm.aware - dt * 0.35);
    const sees = (vis > 0 || lit) && pm.aware >= 1;
    if (sees) { pm.lastSeenT = 0; pm.last = { x: p.x, z: p.z }; }
    const dist = Math.hypot(p.x - pm.x, p.z - pm.z);

    // you hid while he was watching: he knows exactly where
    if (p.hidden && pm.lastSeenT < 1.3 && pm.state === 'chase' && !pm.hideSeen) pm.hideSeen = p.hide;

    if (pm.state !== 'chase' && pm.state !== 'grab' && sees) {
      if (pm.state !== 'script' || pm.script?.chaseOnSight !== false) { pm.state = 'chase'; pm.script = null; A.seen(v3(pm.x, 2.4, pm.z)); pm.flare = 1; c.onSeen?.(); }
    } else if ((pm.state === 'patrol' || pm.state === 'search') && pm.aware > 0.4 && (vis > 0 || lit)) {
      // something moved over there: he stops, turns his head
      pm.lookAt = [p.x, p.z]; pm.path = []; pm.wait = 0.6;
      if (pm.aware > 0.7 && pm.state !== 'investigate') { pm.state = 'investigate'; pm.last = { x: p.x, z: p.z }; pm.goTo(p.x, p.z, 1.9, () => { pm.state = 'search'; pm.searchT = 6; }); }
    }

    let result = null;
    const sp0 = indoors(zoneOf(pm.x, pm.y + 0.5, pm.z)) || p.zone === 'maze' ? 0.86 : 1;
    switch (pm.state) {
      case 'patrol': patrol(dt); break;
      case 'script': {
        if (pm.wait > 0) { pm.wait -= dt; if (pm.wait <= 0 && pm.waitThen) { const f = pm.waitThen; pm.waitThen = null; f(); } break; }
        if (moveAlong(dt, pm.speed * sp0)) { pm.path = []; const f = pm.onArrive; pm.onArrive = null; f?.(); if (pm.wait <= 0 && pm.waitThen) { const g = pm.waitThen; pm.waitThen = null; g(); } }
        break;
      }
      case 'investigate': case 'search': {
        if (pm.wait > 0) { pm.wait -= dt; break; }
        if (pm.state === 'search') {
          pm.searchT -= dt; if (!pm.last) pm.last = { x: pm.x, z: pm.z };
          if (pm.searchT <= 0) { pm.state = 'patrol'; pm.path = []; break; }
          if (!pm.path.length || pm.pi >= pm.path.length) {
            const n = randomNode((n) => Math.hypot(n.x - pm.last.x, n.z - pm.last.z) < 9 && regionOk(n));
            if (n) pm.goTo(n.x, n.z, 1.6, () => { pm.wait = 1 + Math.random() * 1.5; });
          }
        }
        if (moveAlong(dt, pm.speed * sp0)) { pm.path = []; const f = pm.onArrive; pm.onArrive = null; f?.(); }
        if (pm.stuck > 2) { pm.path = []; pm.stuck = 0; }
        break;
      }
      case 'chase': {
        if (pm.hideSeen && p.hidden) {
          // straight to your hiding place
          const h = pm.hideSeen, d = Math.hypot(h.x - pm.x, h.z - pm.z);
          if (d < 1.25) { pm.state = 'grab'; result = 'found'; break; }
          if (!pm.path.length || (pm.repath -= dt) <= 0) { pm.repath = 0.6; pm.path = findPath(pm.x, pm.z, h.exit[0], h.exit[1]); pm.path.push([h.x, h.z]); pm.pi = 0; }
          moveAlong(dt, pm.chaseSpeed * sp0);
          break;
        }
        if (!p.hidden && pm.hideSeen && !p.hidden) pm.hideSeen = null;
        const sp = pm.chaseSpeed * sp0 * (dist > 14 ? 1.15 : 1);
        if (!p.hidden && sees && clearLine(pm.x, pm.z, p.x, p.z, 0.6, true) && dist < 12) {
          const dx = p.x - pm.x, dz = p.z - pm.z; step(dt, dx / dist, dz / dist, sp); pm.path = [];
          if (pm.stuck > 0.6) { pm.path = findPath(pm.x, pm.z, p.x, p.z); pm.pi = 0; pm.stuck = 0; }
        } else {
          if (!pm.path.length || (pm.repath = (pm.repath ?? 0) - dt) <= 0) { pm.repath = 0.5; const tgt = pm.lastSeenT < 1.5 && !p.hidden ? p : pm.last; pm.path = findPath(pm.x, pm.z, tgt.x, tgt.z); pm.pi = 0; }
          if (moveAlong(dt, sp)) pm.path = [];
        }
        if (!p.hidden && dist < 1.05 && Math.abs(p.y - pm.y) < 1.2) { pm.state = 'grab'; result = 'caught'; break; }
        // lost you
        if (pm.lastSeenT > (p.hidden ? 2.5 : 5)) { pm.state = 'search'; pm.searchT = 9; pm.path = []; pm.goTo(pm.last.x, pm.last.z, 2.2); pm.aware = 0.6; c.onLost?.(); }
        break;
      }
      case 'grab': break;
    }
    // hidden, and he's right there: hold your breath
    if (p.hidden && p.hide && pm.state !== 'grab') {
      const h = p.hide, dh = Math.hypot(h.x - pm.x, h.z - pm.z);
      if (dh < 2.6 && !p.holding) { pm.hearT += dt * (p.breathOut ? 3 : 1); if (pm.hearT > 1.1 && pm.state !== 'grab') { pm.state = 'chase'; pm.hideSeen = h; pm.lastSeenT = 0; pm.flare = 1; A.seen(v3(pm.x, 2.4, pm.z)); } }
      else pm.hearT = Math.max(0, pm.hearT - dt * 0.5);
    } else pm.hearT = 0;
    // he drifts closer when you've lost him for too long (never far, never gone)
    if (pm.state === 'patrol' && !pm.noTeleport && (pm.tpT -= dt) <= 0) {
      pm.tpT = 6;
      if (dist > 42 && !pm.visibleToPlayer) {
        const n = randomNode((n) => { const d = Math.hypot(n.x - p.x, n.z - p.z); return d > 20 && d < 32 && regionOk(n); });
        if (n && !c.onScreen(n.x, 2.4, n.z)) pm.place(n.x, n.z, Math.random() * 6.3);
      }
    }
    animateBody(dt, t, p, dist);
    return result;
  };

  function animateBody(dt, t, p, dist) {
    R.root.position.set(pm.x, pm.y, pm.z); R.root.rotation.y = pm.yaw + Math.PI;
    const mv = Math.min(pm.moved || 0, 5); pm.moved *= 0.5;
    const run = pm.state === 'chase' && mv > 2;
    pm.phase += dt * (run ? 6.5 : 3.4) * Math.min(1, mv / 1.2);
    const ph = pm.phase, a = Math.min(1, mv / 1.4) * (run ? 0.85 : 0.5);
    const { L, R: Rr } = R.limbs;
    L.hp.rotation.x = Math.sin(ph) * a; Rr.hp.rotation.x = -Math.sin(ph) * a;
    L.kn.rotation.x = Math.max(0, -Math.cos(ph)) * a * 1.4; Rr.kn.rotation.x = Math.max(0, Math.cos(ph)) * a * 1.4;
    const reach = pm.state === 'chase' && dist < 4 ? 1 : 0;
    L.sh.rotation.x = -Math.sin(ph) * a * 0.6 - reach * 1.3 + Math.sin(t * 1.3) * 0.03; Rr.sh.rotation.x = Math.sin(ph) * a * 0.6 - reach * 1.2 + Math.sin(t * 1.1) * 0.03;
    L.el.rotation.x = -0.25 - reach * 0.2; Rr.el.rotation.x = -0.3 - reach * 0.2;
    L.sh.rotation.z = -0.08; Rr.sh.rotation.z = 0.08;
    // hunched: more when indoors (the ceilings are too low for him)
    const inside = indoors(zoneOf(pm.x, pm.y + 0.5, pm.z));
    pm.stoop += ((inside ? 1 : 0) - pm.stoop) * Math.min(1, dt * 3);
    R.spine.rotation.x = 0.12 + (run ? 0.3 : 0) + pm.stoop * 0.45;
    R.hips.position.y = 1.34 - pm.stoop * 0.18 + Math.abs(Math.sin(ph)) * a * 0.06;
    R.neck.rotation.x = -pm.stoop * 0.3;
    // his head: tilted, turning to whatever he's looking at
    let look = 0;
    const lt = pm.state === 'chase' ? [p.x, p.z] : pm.lookAt;
    if (lt) look = Math.max(-1.2, Math.min(1.2, angDiff(Math.atan2(-(lt[0] - pm.x), -(lt[1] - pm.z)), pm.yaw)));
    if (pm.wait > 0 && !lt) look = Math.sin(t * 0.7) * 0.9;
    R.neck.rotation.y += (look - R.neck.rotation.y) * Math.min(1, dt * 4);
    R.head.rotation.z = Math.sin(t * 0.5) * 0.12 + 0.18;
    // the light inside him
    pm.flare = Math.max(0, pm.flare - dt * 0.6);
    const fl = 0.85 + Math.sin(t * 13) * 0.06 + Math.sin(t * 31) * 0.05 + (Math.random() - 0.5) * 0.08;
    const k = (pm.state === 'chase' ? 1.5 : 1) * fl + pm.flare * 1.5;
    R.light.intensity = 5.5 * k; R.headMat.emissiveIntensity = 1.8 * k; R.glowS.material.opacity = 0.35 + 0.2 * k;
    R.light.color.setHex(pm.state === 'chase' ? 0xff4a10 : 0xff7020);
    // sounds: steps, the flame, the humming
    if (mv > 0.3) { pm.stepT += dt * mv / (run ? 1.6 : 1.1); if (pm.stepT > 1) { pm.stepT = 0; const z = zoneOf(pm.x, pm.y + 0.5, pm.z); A.bigStep(v3(pm.x, pm.y, pm.z), run ? 0.75 : 0.5, c.muffle(pm.x, pm.y, pm.z), indoors(z) ? 'wood' : z === 'corn' || z === 'yard' ? 'leaves' : 'dirt'); } }
    const hp = v3(pm.x, pm.y + 2.4, pm.z);
    A.flame(hp, Math.min(1, 0.3 + (pm.state === 'chase' ? 0.5 : 0) + pm.flare * 0.5), c.muffle(pm.x, pm.y, pm.z));
    humH?.set(hp, pm.state === 'chase' || pm.state === 'grab' ? 0 : 0.9 * (1 - c.muffle(pm.x, pm.y, pm.z) * 0.7));
  }
  pm.stopSounds = () => { humH?.stop(); humH = null; A.flame(null, 0); };
  return pm;
}
