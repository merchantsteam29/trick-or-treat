// The night: Toby's candy trail from house to house, what's in each house, the neighbours on their porches,
// the Ferrises at their table, the Dorseys' garage, the Marsh farm and the corn, and the run home.
// Checkpoints: 1 Moss house · 2 across the street · 3 the Ferris house is behind you · 4 out of the garage ·
// 5 the corn · 6 you have Toby.
import * as THREE from 'three';
import { W, M, FY, setDoor, setFixture, clearLine, findPath, pumpkinMesh, CLEARING } from './world.js';
import { makePerson, makeGhost, animate, pose, headMaterial } from './people.js';
import * as T2 from './tex2.js';

const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const faceYaw = (dx, dz) => Math.atan2(dx, dz); // rig yaw to face a direction
export const DEATHS = {
  carved: { title: 'CARVED', line: 'He was very careful with your face.', learn: 'Keep low (C), keep your light off (F), and break his line of sight. The walkie-talkie hisses when he is near.' },
  found: { title: 'FOUND', line: 'He watched you climb in.', learn: 'Never hide while he can see you. Lose him first, then hide. When he is right beside you, hold your breath (Space).' },
  held: { title: 'HELD', line: 'They held you still for him.', learn: 'They only move when nobody is looking at them. Keep your eyes, and your light, on them, and back away.' },
  headless: { title: 'HEADLESS', line: 'The Dorseys\' guillotine was never a prop.', learn: 'Watch the blade. Go under it the moment it has risen all the way up.' },
  torn: { title: 'TORN', line: 'He took you both.', learn: 'You can\'t hide with Toby. Don\'t stop, go round the neighbours, and use the houses and hedges to break his line of sight.' },
};
export const NOTES = {
  list: { title: 'Taped inside the cupboard door', html: '<p class="hand">HOLLOW LANE &mdash; ALL HALLOWS</p><p>When the lights on the Lane go dark, the Lane chooses. The house that is chosen gives. The rest keep their lights on.</p><ul class="list"><li>1959 &mdash; Peter Ames</li><li>1962 &mdash; Ruthie Kole</li><li>1966 &mdash; June Pratt</li><li>1971 &mdash; Danny Moss</li><li>1977 &mdash; Carl Dwyer</li><li>1983 &mdash; Marcus Bell</li><li>1989 &mdash; Lisa Ferris</li><li class="fresh">1990 &mdash; Toby Wren</li></ul><p class="small">The last name is in red pen. The ink is still wet.</p>' },
  diary: { title: 'Ellen Ferris\'s diary', html: '<p class="hand">Oct. 31, 1989</p><p>We drew at the Mosses\' again. Ed Dorsey held the hat. I knew before Frank unfolded it.</p><p class="hand">Nov. 1</p><p>Her bed is still made. Frank says we kept the Lane safe for another year. I said I\'m keeping her room. He said we don\'t get to keep anything.</p><p class="hand">Nov. 19</p><p>Mrs. Moss says the candle is what lets him see. Danny\'s, and all the others. She says if you could put them out he\'d be blind as a mole, and they\'d be free. She says it like she\'s tried.</p><p class="hand">Oct. 30, 1990</p><p>New family at number 1. Two boys. Wren. They don\'t know. I hear Lisa\'s music box every night now.</p>' },
  dorsey: { title: 'Pinned to the shelf', html: '<p class="hand">ED &mdash;</p><p>Your year to carry the candle up to Marsh\'s. Don\'t make him come and get it, not like Carl\'s year.</p><p>It\'s the Wren boy. Number 1. The family\'s new, they don\'t know a thing. Better that way. Leave their porch light on, it\'s only fair.</p><p>Lights off by eight.</p><p class="hand">&mdash; M.</p>' },
  paper: { title: 'The Hollow Herald, November 3, 1958', html: '<p class="hand">BOY, 8, KILLED ON HOLLOW LANE</p><p>Abel Marsh, 8, was struck and killed by an automobile while trick-or-treating on Hollow Lane on Friday night. Witnesses said the street was "very dark"; several residents had turned off their porch lights early in the evening.</p><p>The driver has not been identified. Police say no charges are expected. The boy\'s father, Cornelius Marsh, who farms the land at the top of the Lane, could not be reached for comment.</p>' },
  letter: { title: 'On the carving bench', html: '<p>They turned their lights off so the children would pass them by. They didn\'t want to give. So my boy walked home in the dark, and the car never saw him, and every one of them knew whose car it was, and not one of them said.</p><p>I have carved myself a face, so I can find my way in the dark.</p><p>Every year I take a candle from them, one child for my one child, and I see by its light. Let the Lane keep its porch lights on now. Let them give.</p><p class="hand">&mdash; C. M.</p>' },
};
export const SOULS = { danny: 'Danny Moss, 1971', marcus: 'Marcus Bell, 1983', lisa: 'Lisa Ferris, 1989' };

// the candy trail (world x, z), one list per stretch of the night
const TRAILS = {
  1: [[9.4, 19.7], [11.2, 20], [12.7, 20], [14.6, 20], [16.4, 20], [18.6, 20], [20.6, 20], [22.4, 19.6], [23.2, 18.4], [23.0, 17.4]],
  2: [[24.6, 20], [26.6, 20], [28.2, 21.5], [27.5, 25], [24, 27.6], [20, 27.6], [16, 27.6], [12.5, 27.4], [9.5, 27], [6.4, 28.5], [4.4, 31], [2.4, 35], [0, 39], [-2.4, 43], [-4.4, 47], [-6.5, 50], [-9, 53], [-11.5, 56], [-13.5, 57.6], [-17, 57.6], [-20.5, 57.6], [-24, 57.6], [-27, 57.2], [-28.5, 55], [-28.2, 52.5], [-27.2, 50.6], [-25.6, 50], [-24, 49.8], [-23.3, 48.9], [-22.6, 47.6]],
  3: [[-20, 49.8], [-17, 50], [-15, 50], [-12.8, 50], [-10.5, 50.2], [-7.5, 51], [-4.4, 53], [-1.5, 56], [1.5, 59], [4.4, 62], [6.5, 64], [8.6, 64.3], [10.8, 64.3], [11.3, 66], [11.6, 67.7], [13.9, 67.7], [13.9, 65.3], [13.9, 62.8], [13.9, 60.9], [15.4, 60.8], [16.5, 61.8], [16.5, 63.2], [16.5, 65.4], [16.5, 67.2], [18, 67.8], [19.6, 67.4], [19.6, 64.3], [19.6, 62], [20.8, 61.25], [22.8, 61.25], [24.8, 61.9], [26.6, 63], [28.2, 63.8]],
  4: [[28.7, 59], [28.5, 56], [27, 51.2], [23.5, 50.8], [20, 50.7], [16, 50.7], [12.5, 51.5], [9.5, 53.5], [6.4, 56], [4.4, 60], [4.4, 66], [4.4, 72], [4.4, 78], [4.4, 84], [4.4, 90], [4.4, 96], [4.4, 102], [4.4, 108], [4.4, 114], [4.4, 120], [2.5, 124], [0.5, 128], [0, 132], [0, 136], [0, 138.3]],
  5: [[0, 140.4], [0, 142.6], [0, 144.6], [0.9, 146.6], [1.85, 147.7], [2.6, 149.2], [4.5, 149.6], [4.6, 151.8], [4.6, 153.3], [4.6, 154.7]],
  6: [[4.5, 156.6], [4.5, 159], [2, 161.5], [-1, 163], [-3, 164.6], [-4.5, 167], [-6, 170], [-3, 172.5], [0, 174.5], [2, 175.6], [1, 177.6], [0, 179.6], [0, 181]],
};
const SPAWN = { 1: [6.0, 18.6, -Math.PI / 2], 2: [28.4, 20.0, Math.PI / 2], 3: [-10.5, 50.0, -Math.PI / 2], 4: [28.7, 58.6, Math.PI / 2], 5: [4.5, 156.6, Math.PI], 6: [0.2, 182.6, 0] };
const REGION = {
  street: (z0, z1) => (n) => n.z > z0 && n.z < z1 && !['moss', 'ferris', 'maze', 'marsh', 'ring', 'corn', 'clearing', 'gap'].includes(n.tag),
  field: (n) => ['ring', 'corn'].includes(n.tag),
};
const HOSTS = [
  { id: 'w4', x: -12.7, z: 31, mask: 'witch', o: { dress: 0x1a1a22, shirt: 0x1a1a22, pants: 0x1a1a22, hat: 'witch', skin: 0xd8b8a0 } },
  { id: 'e5', x: 12.7, z: 41, mask: 'smile', o: { shirt: 0x3a3a40, pants: 0x2a2a30, coat: 0x2a2a30 } },
  { id: 'w8', x: -12.7, z: 71, mask: 'pig', o: { shirt: 0x6a5a40, pants: 0x3a3428, ears: 'pig' } },
  { id: 'e9', x: 12.7, z: 81, mask: 'wolf', o: { shirt: 0x4a3a2a, pants: 0x2a2a2a } },
  { id: 'w10', x: -12.7, z: 91, mask: 'cat', o: { shirt: 0x111111, pants: 0x111111, ears: 'cat', dress: 0x111111 } },
  { id: 'e11', x: 12.7, z: 101, mask: 'smile', o: { shirt: 0x5a6a7a, pants: 0x3a3a3a, dress: 0x5a6a7a } },
  { id: 'w12', x: -12.7, z: 111, mask: 'old', o: { shirt: 0x6a5a6a, pants: 0x4a3a4a, dress: 0x6a5a6a } },
];
const HOSTS_AT = { 1: [], 2: ['w4', 'e5'], 3: ['w4', 'e5', 'w8', 'e9'], 4: ['w8', 'e9', 'w10', 'e11', 'w12'], 5: [], 6: ['w4', 'e5', 'w8', 'e9', 'w10', 'e11', 'w12'] };

export function createStory(g) {
  const { scene, A, voice, ui, P, pm } = g;
  const S = { cp: 1, souls: {}, items: {}, notes: {}, flags: {} };
  let t = 0, trailOn = 0;
  const I = {}; // interactions by id: { p(): prompt | null, use(), hold }
  const it = (id, x, y, z, r, def) => { W.inter.push({ id, x, y, z, r }); I[id] = def; };

  // ---------- the candy trail: one instanced mesh, coloured wrappers that glow a little in the dark ----------
  const candyGeo = (() => { const b = new THREE.BoxGeometry(0.07, 0.035, 0.035); const c1 = new THREE.ConeGeometry(0.025, 0.04, 5); c1.rotateZ(Math.PI / 2); c1.translate(0.05, 0, 0); const c2 = new THREE.ConeGeometry(0.025, 0.04, 5); c2.rotateZ(-Math.PI / 2); c2.translate(-0.05, 0, 0); b.deleteAttribute('uv'); c1.deleteAttribute('uv'); c2.deleteAttribute('uv'); const g = new THREE.BufferGeometry(); const parts = [b, c1, c2].map((x) => x.index ? x.toNonIndexed() : x); const pos = [], nor = []; for (const p of parts) { pos.push(...p.attributes.position.array); nor.push(...p.attributes.normal.array); } g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); return g; })();
  const candies = new THREE.InstancedMesh(candyGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), 160);
  candies.count = 0; candies.frustumCulled = false; scene.add(candies);
  const CANDY = [0xc02020, 0xe0b020, 0x7a30b0, 0x20a040, 0xe06010, 0x3060d0];
  function setTrail(...ids) {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(); let k = 0;
    for (const id of ids) {
      const list = TRAILS[id];
      for (let i = 0; i < list.length - 1 || (i === list.length - 1 && i === 0); i++) {
        const [ax, az] = list[i], [bx, bz] = list[Math.min(i + 1, list.length - 1)], n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 1.6));
        for (let j = 0; j < n && k < 160; j++) {
          const f = j / n, x = ax + (bx - ax) * f + (Math.random() - 0.5) * 0.25, z = az + (bz - az) * f + (Math.random() - 0.5) * 0.25;
          const y = groundAt(x, z) + 0.02;
          q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * 6.3); m4.compose(v3(x, y, z), q, v3(1, 1, 1)); candies.setMatrixAt(k, m4);
          candies.setColorAt(k, c.set(CANDY[(Math.random() * CANDY.length) | 0]).multiplyScalar(0.55)); k++;
        }
      }
    }
    candies.count = k; candies.instanceMatrix.needsUpdate = true; if (candies.instanceColor) candies.instanceColor.needsUpdate = true;
    trailOn = ids[0] || 0;
  }
  const groundAt = (x, z) => g.groundY(x, z, 1.5);

  // ---------- people ----------
  const toby = makePerson({ head: 'skull', shirt: 0x111114, pants: 0x111114, shoes: 0xc8c8c0, skeleton: true, kid: 0.6 });
  scene.add(toby.root); toby.root.visible = false;
  const bucketMesh = (() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.18, 12, 1, true), pumpkinMesh('classic', 44).material); const gg = new THREE.Group(); m.position.y = 0.09; gg.add(m); const hd = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.008, 4, 12, Math.PI), new THREE.MeshStandardMaterial({ color: 0x111111 })); hd.position.y = 0.18; gg.add(hd); scene.add(gg); return gg; })();
  const mossLady = makePerson({ head: 'old', shirt: 0x6a5a6a, pants: 0x4a3a4a, dress: 0x6a5a6a, shoes: 0x2a2a2a });
  scene.add(mossLady.root);
  const rocker = new THREE.Group(); scene.add(rocker); rocker.add(mossLady.root);
  { const wm = new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.8 }); const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.5), wm); seat.position.y = 0.48; rocker.add(seat); const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.8, 0.05), wm); back.position.set(0, 0.9, -0.24); back.rotation.x = -0.12; rocker.add(back); for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.02, 4, 12, 1.1), wm); r.rotation.y = Math.PI / 2; r.rotation.z = -Math.PI / 2 - 0.55; r.position.set(s * 0.25, 0.52, 0); rocker.add(r); } }
  rocker.position.set(17.6, FY, 24.0); rocker.rotation.y = faceYaw(1.4, 1.6);
  pose(mossLady, 'sit'); mossLady.root.position.set(0, 0.02, -0.05);
  const ferris = [
    makePerson({ head: 'pig', shirt: 0x5a4a3a, pants: 0x2a2a2a, ears: 'pig' }),
    makePerson({ head: 'cat', shirt: 0x6a2a3a, pants: 0x2a1a1a, dress: 0x6a2a3a, ears: 'cat' }),
  ];
  const FSEAT = [[-21.7, 53.6], [-24.5, 53.6]], FSTAND = [[-21.05, 53.4], [-25.15, 53.4]];
  ferris.forEach((f) => scene.add(f.root));
  const hosts = HOSTS.map((h) => { const r = makePerson({ head: h.mask, ...h.o }); r.root.position.set(h.x, FY, h.z); r.root.rotation.y = h.x > 0 ? -Math.PI / 2 : Math.PI / 2; scene.add(r.root); return { ...h, r, alarm: 0, cool: 0, on: false, base: [h.x, h.z], street: false }; });
  const dorsey = makePerson({ head: 'wolf', shirt: 0x5a3a2a, pants: 0x2a2a3a, coat: 0x3a2a1a });
  dorsey.headMesh.material = (() => { const tx = T2.carvedHead(0xc89878); return new THREE.MeshStandardMaterial({ map: tx, emissive: 0xffffff, emissiveMap: tx.glow, emissiveIntensity: 1.2, roughness: 0.6 }); })();
  pose(dorsey, 'sit'); dorsey.spine.rotation.x = 0.5; dorsey.neck.rotation.x = 0.6; dorsey.limbs.L.sh.rotation.x = -0.3; dorsey.limbs.R.sh.rotation.z = 0.4;
  dorsey.root.position.set(28.6, 0.05, 64.3); dorsey.root.rotation.y = faceYaw(-1, 0); scene.add(dorsey.root);
  g.gore.pool(v3(28.6, 0.06, 64.3), 1.0, 0); // (cleared on restart, so the story re-adds it)
  // the maze's pop-up props: skeletons on springs
  const pops = ['popA', 'popB', 'popC'].map((k) => { const r = makePerson({ head: 'skull', shirt: 0x111111, pants: 0x111111, skeleton: true }); const [x, z] = W.props.maze[k]; r.root.position.set(x, -1.6, z); r.root.rotation.y = k === 'popC' ? faceYaw(0, -1) : faceYaw(0, 1); pose(r, 'reach'); scene.add(r.root); return { k, r, x, z, t: -1, done: false }; });
  // the ghosts of the children
  const ghosts = { danny: makeGhost({ head: 'toby' }), marcus: makeGhost({ head: 'toby' }), lisa: makeGhost({ head: 'toby', dress: 0xffffff }) };
  for (const gh of Object.values(ghosts)) { scene.add(gh.root); gh.root.visible = false; gh.fade = 0; }
  // the soul pumpkins: carved with their names
  const SOULP = { danny: [14.55, FY, 14.5, faceYaw(1, 0.3), "DANNY|'71"], lisa: [-24.6, FY + 0.6, 44.6, faceYaw(1, 0.4), "LISA|'89"], marcus: [21.2, 0.65, 65.4, faceYaw(-1, 0), "MARCUS|'83"] };
  const soulMesh = {};
  for (const [k, [x, y, z, yaw, text]] of Object.entries(SOULP)) {
    const m = pumpkinMesh('name', 50 + k.length, text); m.scale.setScalar(1.15); m.position.set(x, y, z); m.rotation.y = yaw; scene.add(m); soulMesh[k] = m;
    const l = new THREE.Sprite(new THREE.SpriteMaterial({ map: T2.glow(), color: 0xff9040, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending })); l.scale.set(0.9, 0.9, 1); l.position.y = 0.22; m.add(l); m.userData.glow = l;
    it('soul:' + k, x, y + 0.3, z, 1.6, { p: () => S.souls[k] ? null : `Blow out the candle (${text.split('|')[0][0] + text.split('|')[0].slice(1).toLowerCase()})`, use: () => blowOut(k) });
  }
  // the clearing: the big pumpkin he's carving with Toby's face, and Toby's candle
  const big = pumpkinMesh('name', 90, "TOBY|'90"); big.scale.setScalar(2.4); big.position.set(CLEARING.x, 0.8, CLEARING.z - 1.1); big.rotation.y = Math.PI; scene.add(big);
  const tobyCandle = pumpkinMesh('classic', 91); tobyCandle.scale.setScalar(0.7); tobyCandle.position.set(CLEARING.x + 1.0, 0.8, CLEARING.z - 0.9); tobyCandle.rotation.y = Math.PI - 0.4; scene.add(tobyCandle);
  // flames on the candles round the clearing (points, one draw call)
  { const pos = []; for (const [x, y, z] of W.props.candles) pos.push(x, y, z); const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); scene.add(new THREE.Points(gg, new THREE.PointsMaterial({ map: T2.glow(), color: 0xffa040, size: 0.35, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))); }
  // little things you pick up or read, lying in the world
  const thing = (geo, mat, x, y, z, ry = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; scene.add(m); return m; };
  const paperMat = new THREE.MeshStandardMaterial({ map: T2.paper(61), roughness: 0.8 });
  const flatPaper = new THREE.PlaneGeometry(0.21, 0.28); flatPaper.rotateX(-Math.PI / 2);
  const props = {
    mask: thing(new THREE.SphereGeometry(0.11, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), headMaterial('skull'), 22.3, FY + 0.03, 16.6, 0.5),
    list: thing(flatPaper, paperMat, 23.1, FY + 0.78, 23.4, 0.2),
    shoe: thing(new THREE.BoxGeometry(0.08, 0.06, 0.18), new THREE.MeshStandardMaterial({ color: 0xc8c8c0 }), -21.8, FY + 0.03, 46.2, 0.8),
    diary: thing(new THREE.BoxGeometry(0.16, 0.03, 0.22), new THREE.MeshStandardMaterial({ color: 0x6a2a3a }), -17, 0.97, 45.5, 0.3),
    musicbox: thing(new THREE.BoxGeometry(0.16, 0.1, 0.12), new THREE.MeshStandardMaterial({ color: 0xd8a8b8 }), -20.9, 0.8, 44.4, 0.1),
    keys: thing(new THREE.TorusGeometry(0.035, 0.008, 4, 10), new THREE.MeshStandardMaterial({ color: 0xb0a070, metalness: 0.8, roughness: 0.3 }), 29.8, 0.86, 64.0),
    dnote: thing(new THREE.PlaneGeometry(0.21, 0.28), paperMat, 31.38, 1.4, 64.3, -Math.PI / 2),
    paper: thing(flatPaper, new THREE.MeshStandardMaterial({ color: 0xd8d0b8, roughness: 0.9 }), -0.7, 0.77, 145.8, 0.4),
    letter: thing(flatPaper, paperMat, -5.5, 1.19, 152.4, -0.3),
  };
  props.keys.rotation.x = Math.PI / 2;

  // ---------- interactions ----------
  it('bucket', 9.4, 0.3, 19.7, 1.7, { p: () => S.items.bucket ? null : 'Pick up Toby\'s bucket', use: () => { S.items.bucket = 1; bucketMesh.visible = false; A.candy(); ui.sub('His pumpkin bucket. Half full. He\'d never leave it.', 4, 'think'); walkieSay('Sam? Sam, it\'s dark in here.', 1.5); } });
  it('mask', 22.3, FY + 0.3, 16.6, 1.6, { p: () => S.items.mask || !S.items.bucket ? null : 'Pick up Toby\'s mask', use: () => { S.items.mask = 1; props.mask.visible = false; A.pickup(); mossScare(); } });
  it('list', 23.1, FY + 0.9, 23.4, 1.6, { p: () => 'Read the paper', use: () => read('list') });
  it('shoe', -21.8, FY + 0.2, 46.2, 1.6, { p: () => S.items.shoe ? null : 'Pick up Toby\'s shoe', use: () => { S.items.shoe = 1; props.shoe.visible = false; A.pickup(); ferrisWake(); } });
  it('diary', -17, 1.1, 45.5, 1.6, { p: () => 'Read the diary', use: () => read('diary') });
  it('musicbox', -20.9, 0.9, 44.4, 1.3, { p: () => S.flags.boxShut ? null : 'Close the music box', use: () => { S.flags.boxShut = 1; boxH?.stop(); boxH = null; A.click(0.3); } });
  it('ferrisUnlock', -14.4, FY + 1.1, 50, 1.4, { p: () => W.doors.get('ferrisFront').locked && g.zone() === 'ferris' ? 'Unlock the front door' : null, use: () => { W.doors.get('ferrisFront').locked = false; A.click(0.4); setDoor(W.doors.get('ferrisFront'), true); A.doorSound(v3(-14, 1, 50), true); } });
  it('keys', 29.8, 0.95, 64.0, 1.5, { p: () => S.items.keys ? null : 'Take the keys (one tag says MARSH)', use: () => { S.items.keys = 1; props.keys.visible = false; A.pickup(); garageHunt(); } });
  it('dnote', 31.3, 1.4, 64.3, 1.5, { p: () => 'Read the note', use: () => read('dorsey') });
  it('gateKey', 0, 1.0, 138.6, 1.6, { p: () => W.doors.get('gate').locked ? (S.items.keys ? 'Unlock the gate' : null) : null, use: () => { const d = W.doors.get('gate'); d.locked = false; A.click(0.4); A.chainRattle?.(); A.creak(v3(0, 1, 139), 0.4, 0, 1.2); setDoor(d, true); ui.objective(); } });
  it('paper', -0.7, 0.9, 145.8, 1.6, { p: () => 'Read the newspaper', use: () => read('paper') });
  it('letter', -5.5, 1.3, 152.4, 1.6, { p: () => 'Read the letter', use: () => { read('letter'); marshComes(); } });
  it('untie', CLEARING.x, 0.9, CLEARING.z + 1.0, 1.7, { hold: 2.2, p: () => S.cp === 5 && !S.flags.untied ? 'Untie Toby (hold)' : null, use: () => untie() });
  it('candle', CLEARING.x + 1.0, 1.0, CLEARING.z - 0.9, 1.4, { hold: 2.5, p: () => S.cp === 5 && !S.flags.untied ? 'Take his candle, and his place (hold)' : null, use: () => g.ending('place') });
  I.home = { p: () => (S.cp >= 6 ? 'Get inside!' : 'Go home without him (hold)'), get hold() { return S.cp >= 6 ? 0 : 2.5; }, use: () => g.ending(S.cp >= 6 ? (Object.keys(S.souls).length >= 3 ? 'treat' : 'trick') : 'alone') };

  // ---------- reading ----------
  function read(id) { S.notes[id] = 1; A.paper(); g.readNote(NOTES[id]); }

  // ---------- the walkie-talkie ----------
  const walkieQ = [];
  function walkieSay(text, delay = 0, who = 'TOBY') { walkieQ.push({ text, at: t + delay, who }); }
  function updateWalkie() {
    if (!walkieQ.length || walkieQ[0].at > t || voice.busy) return;
    const w = walkieQ.shift(); A.squelch();
    setTimeout(() => { ui.sub(`<b>${w.who === 'TOBY' ? 'Toby' : w.who === 'HIM' ? '???' : w.who}</b> (walkie-talkie): ${w.text}`, 5, 'walkie'); voice.say(w.who, w.text); }, 250);
  }

  // ---------- blowing out a candle: one of the children goes free ----------
  const SOULTALK = {
    danny: ['It\'s cold in here. Mom never turns the heat on.', 'He sees with our candles. Put them all out, and he can\'t see you. Not ever.'],
    lisa: ['Is my mom still sad?', 'Toby\'s scared. He\'s at the farm. Hurry.'],
    marcus: ['They used to charge a quarter for this.', 'Two more and he\'s blind. We\'ll hold his hands.'],
  };
  function blowOut(k) {
    S.souls[k] = 1; const m = soulMesh[k];
    m.material.emissiveIntensity = 0; m.userData.glow.visible = false; A.whisper(m.position, 0, 1.0, 0.25);
    const gh = ghosts[k]; gh.root.visible = true; gh.fade = 0.01; gh.life = 6.5;
    const p = m.position; gh.root.position.set(p.x + (P.x - p.x) * 0.35, Math.max(FY, p.y - 0.6), p.z + (P.z - p.z) * 0.35); gh.root.rotation.y = faceYaw(P.x - gh.root.position.x, P.z - gh.root.position.z);
    const lines = SOULTALK[k], n = Object.keys(S.souls).length;
    setTimeout(() => { ui.sub(`<b>${SOULS[k].split(',')[0]}</b>: ${lines[0]}`, 4, 'ghost'); voice.say('KIDS', lines[0]); }, 600);
    setTimeout(() => { ui.sub(`<b>${SOULS[k].split(',')[0]}</b>: ${n >= 3 ? 'That\'s all of us. Now he\'s blind. Go get your brother.' : lines[1]}`, 5, 'ghost'); voice.say('KIDS', n >= 3 ? 'That\'s all of us. Now he\'s blind. Go get your brother.' : lines[1]); }, 4200);
    ui.toast(`Candles out: ${n} of 3`);
    g.persistSouls(S.souls);
  }

  // ---------- scripted moments ----------
  // ch 1: you pick up the mask, and he comes in through the front door
  function mossScare() {
    S.flags.mossScare = 1;
    A.hush(5);
    walkieSay('Sam? I can hear you. He can hear you too.', 0.6);
    ui.hint(`Something's coming. Hide: ${g.key('use')} at a bed or the wardrobe.`);
    setTimeout(() => {
      const d = W.doors.get('mossFront'); setDoor(d, false); A.doorSound(v3(14, 1, 20), false, true);
      setTimeout(() => {
        pm.place(11.5, 20, -Math.PI / 2); pm.setActive(true, REGION.street(-8, 76)); A.presence(0.5, 4);
        setDoor(d, true); A.doorSound(v3(14, 1, 20), true, true);
        pm.runScript([
          { to: [15.0, 20], speed: 1.3, wait: 1.2, look: [17, 24] },
          { to: [18.6, 20], speed: 1.2, wait: 1.5, look: [17.4, 16.7] },
          { to: [21.5, 20], speed: 1.2, wait: 0.6 },
          { to: [22.4, 16.2], speed: 1.1, wait: 3.2, look: [24.6, 14.6] },
          { to: [21.5, 20], speed: 1.2 },
          { to: [17.4, 16.7], speed: 1.1, wait: 2.6, look: [19.4, 14.7] },
          { to: [18.6, 20], speed: 1.3 },
          { to: [27.3, 20], speed: 1.5, fn: () => { S.flags.mossLeft = 1; setTrail(2); } },
          { to: [28.5, 28], speed: 1.5 },
        ], 'patrol');
      }, 2200);
    }, 3500);
  }
  // ch 2: the shoe is in Lisa's room, and her parents get up from the table
  let boxH = null, ferrisAwake = false;
  function ferrisWake() {
    S.flags.ferrisAwake = 1; ferrisAwake = true;
    ferris.forEach((f, i) => { f.mode = 'stalk'; f.root.position.set(FSTAND[i][0], FY, FSTAND[i][1]); pose(f, 'stand'); pose(f, 'reach'); f.path = null; });
    A.hush(3); A.creak(v3(-23, 1, 53), 0.4, 0.2, 1.0);
    setTimeout(() => { ui.sub('<b>Mrs. Ferris</b>: Stay for supper, Sam. Lisa\'s been so lonely.', 4.5, 'speak'); voice.say('FERRIS', 'Stay for supper, Sam. Lisa\'s been so lonely.'); }, 700);
    ui.hint('They move when you aren\'t looking. Keep your eyes on them, and get out.');
    // they scream for him, too
    setTimeout(() => { if (g.zone() === 'ferris' && g.mode() === 'play') { A.shriek(v3(-23, 1.6, 52)); pm.alert(-14, 50, 1); } }, 9000);
  }
  // ch 3: you take the keys, and he comes into the garage
  function garageHunt() {
    S.flags.keys = 1; A.hush(4);
    walkieSay('Sam, he\'s going in after you. Get out, get out!', 0.3);
    setTimeout(() => {
      pm.noTeleport = true; pm.place(7, 64.3, -Math.PI / 2); pm.setActive(true, REGION.street(20, 116)); A.presence(0.4, 3);
      pm.runScript([
        { to: [11.3, 64.3], speed: 1.6 }, { to: [11.3, 67.7], speed: 1.6 }, { to: [13.9, 67.7], speed: 1.6 }, { to: [13.9, 60.8], speed: 1.6 }, { to: [16.5, 60.8], speed: 1.6 },
        { to: [16.5, 67.7], speed: 1.6 }, { to: [19.6, 67.7], speed: 1.6, wait: 1.2, look: [21.2, 66] }, { to: [19.6, 61.25], speed: 1.6 }, { to: [25.5, 63], speed: 1.6, wait: 2 },
        { to: [28.7, 59], speed: 1.6, fn: () => { pm.noTeleport = false; } },
      ], 'patrol');
    }, 2500);
  }
  // ch 4: you read his letter, and he comes home
  function marshComes() {
    if (S.flags.marshComes) return; S.flags.marshComes = 1;
    setTimeout(() => {
      A.hush(4); A.presence(0.5, 4);
      pm.noTeleport = true; pm.place(0, 137, Math.PI); pm.setActive(true, REGION.field);
      pm.runScript([
        { to: [0, 140.5], speed: 1.3 }, { to: [0, 144], speed: 1.2, wait: 2.0, look: [-0.7, 145.8] }, { to: [-1.85, 149], speed: 1.2, wait: 1.5, look: [-5.5, 152.4] },
        { to: [-5, 150], speed: 1.1, wait: 2.5, look: [-8.5, 149.3] }, { to: [1.85, 149.5], speed: 1.2 }, { to: [4.5, 153], speed: 1.2 },
        { to: [4.55, 155.6], speed: 1.3 }, { to: [8, 166], speed: 1.4, fn: () => { pm.noTeleport = false; } },
      ], 'patrol');
    }, 1800);
  }
  // ch 5: you untie him
  let carryT = 0;
  function untie() {
    S.flags.untied = 1; P.carry = true;
    toby.root.visible = false;
    walkieQ.length = 0;
    ui.sub('<b>Toby</b>: Sam! I knew you\'d come. I knew it. He\'s coming back, he\'s coming back!', 4, 'speak'); voice.say('TOBY', 'Sam! I knew you\'d come. He\'s coming back!');
    reach(6);
    startChase(true);
  }
  function startChase(fresh) {
    P.carry = true; toby.root.visible = false;
    pm.noTeleport = true; pm.setActive(true, null);
    const a = Math.random() * 6.3; pm.place(CLEARING.x + Math.cos(a) * 12, CLEARING.z + 9, Math.PI);
    pm.state = 'chase'; pm.lastSeenT = 0; pm.last = { x: P.x, z: P.z }; pm.aware = 1.2;
    A.roar(v3(pm.x, 2.4, pm.z), 0.8); A.seen(v3(pm.x, 2.4, pm.z));
    ui.hint(fresh ? 'RUN. Get him home. Number 1, at the bottom of the lane.' : 'Run.');
    // the neighbours come down off their porches into the street
    hosts.forEach((h, i) => { h.on = true; h.street = true; h.r.root.position.set(i % 2 ? 2.8 : -2.8, 0, h.z + 4); h.r.root.rotation.y = Math.PI; });
    carryT = 0;
  }

  // ---------- each checkpoint: put the whole world in the state it was in ----------
  function setup(cp) {
    S.cp = cp;
    const D = (id) => W.doors.get(id);
    // doors
    setDoor(D('mossFront'), cp === 1, true); setDoor(D('mossBack'), cp >= 2, true); setDoor(D('mossBed'), false, true); setDoor(D('mossKid'), cp >= 2, true);
    setDoor(D('ferrisFront'), cp >= 3, true); D('ferrisFront').locked = cp < 3; setDoor(D('ferrisBack'), cp >= 3, true); setDoor(D('ferrisBed'), false, true); setDoor(D('ferrisKid'), cp >= 3, true);
    const gate = D('gate'); gate.locked = cp < 5; setDoor(gate, cp >= 5, true);
    setDoor(D('marshFront'), cp >= 5, true); setDoor(D('marshBack'), cp >= 5, true);
    // items
    bucketMesh.position.set(9.4, 0.04, 19.7); bucketMesh.rotation.set(0, 0, Math.PI / 2.3); bucketMesh.visible = cp === 1 && !S.items.bucket;
    props.mask.visible = cp === 1; props.shoe.visible = cp <= 2; props.keys.visible = cp <= 3;
    if (cp > 1) { S.items.bucket = S.items.mask = 1; } else { delete S.items.bucket; delete S.items.mask; }
    if (cp > 2) S.items.shoe = 1; else delete S.items.shoe;
    if (cp > 3) S.items.keys = 1; else delete S.items.keys;
    for (const k of Object.keys(soulMesh)) { const out = !!S.souls[k]; soulMesh[k].material.emissiveIntensity = out ? 0 : 1.6; soulMesh[k].userData.glow.visible = !out; }
    for (const gh of Object.values(ghosts)) gh.root.visible = false;
    S.flags = { boxShut: S.flags.boxShut && cp > 2 ? 1 : 0 };
    // people
    rocker.visible = cp <= 2; mossTalk = 0;
    ferris.forEach((f, i) => { f.mode = cp <= 2 ? 'sit' : 'gone'; f.root.visible = cp <= 2; pose(f, 'stand'); pose(f, 'sit'); f.root.position.set(FSEAT[i][0], FY - 0.02, FSEAT[i][1]); f.root.rotation.y = faceYaw(-23.1 - FSEAT[i][0], 0.0001); f.spine.rotation.x = 0.15; f.neck.rotation.x = 0.35; });
    ferrisAwake = false;
    hosts.forEach((h) => { h.on = HOSTS_AT[cp].includes(h.id); h.r.root.visible = h.on || cp >= 6; h.alarm = 0; h.cool = 0; h.street = false; h.r.root.position.set(h.x, FY, h.z); h.r.root.rotation.y = h.x > 0 ? -Math.PI / 2 : Math.PI / 2; pose(h.r, 'stand'); });
    pops.forEach((p) => { p.done = false; p.t = -1; p.r.root.position.y = -1.6; });
    toby.root.visible = false; if (cp === 5) seatToby();
    big.visible = tobyCandle.visible = cp <= 5;
    P.carry = cp >= 6;
    // the house lights
    for (const f of W.fixtures) if (f.tag === 'moss' || f.tag === 'ferris') setFixture(f, false);
    setFixture(W.fixtures.find((f) => f.tag === 'moss' && Math.abs(f.z - 23.8) < 0.1), cp <= 2);
    setFixture(W.fixtures.find((f) => f.tag === 'ferris' && Math.abs(f.z - 53.8) < 0.1), cp <= 2);
    // the TV in the Moss house
    A.tv(v3(19.1, 1.3, 25.6), cp <= 2); W.meshes.mossScreen.material = cp <= 2 ? M_TV : M.glassDark;
    for (const f of W.props.lamps) setFixture(f, f.startOn);
    // music box
    boxH?.stop(); boxH = null;
    // him
    pm.setActive(false); pm.noTeleport = false; pm.chaseSpeed = 3.7;
    walkieQ.length = 0;
    if (cp === 1) { /* he comes when you take the mask */ }
    if (cp === 2) { pm.place(4, 60, 0); pm.setActive(true, REGION.street(-8, 76)); pm.state = 'patrol'; }
    if (cp === 3) { pm.place(0, 95, 0); pm.setActive(true, REGION.street(20, 116)); pm.state = 'patrol'; }
    if (cp === 4) { pm.place(0, 118, 0); pm.setActive(true, REGION.street(55, 140)); pm.state = 'patrol'; }
    if (cp === 5) { pm.place(CLEARING.x - 8.5, CLEARING.z, 0); pm.setActive(true, REGION.field); pm.state = 'patrol'; }
    // the trail
    setTrail(...({ 1: [1], 2: [2], 3: [3], 4: [4, 5], 5: [6], 6: [] }[cp]));
    // where you start
    const [x, z, yaw] = SPAWN[cp]; g.spawn(x, z, yaw);
    if (cp === 6) startChase(false);
    // welcome back lines
    if (cp === 2) walkieSay('Sam? He went outside. The candy goes across the street. I dropped it for you.', 2);
    if (cp === 3) walkieSay('There\'s a house with a scary garage. I didn\'t want to go in. He made me.', 3);
    if (cp === 4) walkieSay('Sam, it smells like dirt here. And candles. Lots of candles.', 3);
    if (cp === 5) walkieSay('Sam? I can see you. I can see your light. Be quiet, he\'s close.', 2.5);
    dorsey.root.visible = true;
    g.gore.pool(v3(28.6, 0.06, 64.3), 1.0, 0); g.gore.splat(v3(29.8, 0.06, 64.8), 0.5);
  }

  // ---------- reaching a checkpoint mid-play: the night moves on (no respawn) ----------
  function seatToby() { toby.root.visible = true; toby.root.position.set(CLEARING.x, 0.55, CLEARING.z + 1.0); toby.root.rotation.y = Math.PI; pose(toby, 'stand'); pose(toby, 'hug'); toby.hips.position.y = 0.32; }
  function reach(cp) {
    if (cp <= S.cp) return;
    S.cp = cp; walkieQ.length = 0;
    if (cp === 5) seatToby();
    hosts.forEach((h) => { if (!h.street) { h.on = HOSTS_AT[cp].includes(h.id); h.r.root.visible = h.on; } });
    if (cp === 2) { setTrail(2); pm.region = REGION.street(-8, 76); }
    if (cp === 3) { setTrail(3); pm.region = REGION.street(20, 116); ferris.forEach((f) => { f.mode = 'gone'; f.root.visible = false; }); ferrisAwake = false; }
    if (cp === 4) { setTrail(4, 5); pm.region = REGION.street(55, 140); }
    if (cp === 5) { setTrail(6); pm.region = REGION.field; if (pm.state !== 'script' && Math.hypot(pm.x - CLEARING.x, pm.z - CLEARING.z) > 30) { pm.place(CLEARING.x - 8.5, CLEARING.z, 0); pm.state = 'patrol'; pm.path = []; } walkieSay('Sam? I can see you. I can see your light. Be quiet, he\'s close.', 2); }
    g.saveCheckpoint(cp);
  }

  // ---------- the objective, for the HUD ----------
  function objective() {
    const n = Object.keys(S.souls).length, souls = n ? `Candles out: ${n} of 3` : null;
    const sub = [];
    let main = 'Find Toby.';
    switch (S.cp) {
      case 1: if (!S.items.bucket) sub.push('His bucket is lying on the path.'); else if (!S.items.mask) sub.push('Follow the candy.'); else if (!S.flags.mossLeft) sub.push('Hide.'); else sub.push('The candy goes out the back door.'); break;
      case 2: if (!S.items.shoe) sub.push('Follow the candy across the street.'); else { main = 'Get out.'; sub.push('Don\'t take your eyes off them.'); } break;
      case 3: if (!S.items.keys) sub.push('The candy goes into the Dorseys\' garage.'); else { main = 'Get out.'; sub.push('The tent at the back has a way out.'); } break;
      case 4: if (W.doors.get('gate').locked) { main = 'The top of the lane.'; sub.push('The keys say MARSH. So does the gate.'); } else { main = 'The Marsh house.'; sub.push('Find a way through.'); } break;
      case 5: sub.push('The candles, in the middle of the corn.'); break;
      case 6: main = 'RUN.'; sub.push('Get him home: number 1, at the bottom of the lane.'); break;
    }
    if (souls) sub.push(souls);
    return { main, sub };
  }

  // ---------- every frame ----------
  let mossTalk = 0, hintHosts = false, hintHide = false, hintBreath = false;
  function update(dt, tt, mode) {
    t = tt;
    updateWalkie();
    // the walkie hisses when he is near (your best warning)
    const pd = pm.active ? Math.hypot(pm.x - P.x, pm.z - P.z) : 99;
    A.walkie(pm.active ? Math.max(0, Math.min(1, (22 - pd) / 18)) * (pm.state === 'chase' ? 1.2 : 0.8) : 0);
    // Mrs. Moss rocks in front of the TV
    if (rocker.visible) {
      rocker.rotation.x = Math.sin(tt * 1.6) * 0.06;
      const d = Math.hypot(P.x - 17.6, P.z - 24.0);
      const want = d < 6 ? Math.max(-1.2, Math.min(1.2, Math.atan2(P.x - 17.6, P.z - 24.0) - rocker.rotation.y)) : 0;
      mossLady.neck.rotation.y += (want - mossLady.neck.rotation.y) * Math.min(1, dt * 1.5);
      if (d < 3.2 && g.zone() === 'moss' && mossTalk === 0) {
        mossTalk = 1;
        const lines = [['Is that you, Sam? Come in, dear. Shut the door.', 0], ['You let go of his hand. I let go of Danny\'s, in 1971.', 4.5], ['It\'s his night. Every year the Lane gives him one. This year it\'s yours.', 9.5]];
        for (const [l, d2] of lines) setTimeout(() => { if (rocker.visible) { ui.sub(`<b>Mrs. Moss</b>: ${l}`, 4.4, 'speak'); voice.say('MOSS', l); } }, d2 * 1000);
      }
    }
    // the TV flickers
    const scr = W.meshes.mossScreen; if (scr && rocker.visible) { scr.material = M_TV; M_TV.emissiveIntensity = 0.4 + Math.random() * 0.5; }
    // Lisa's music box, while you are in the Ferris house
    if (S.cp === 2 && !S.flags.boxShut && g.zone() === 'ferris') { if (!boxH) boxH = A.musicBox(v3(-20.9, 0.9, 44.4)); } else if (boxH) { boxH.stop(); boxH = null; }
    // the Ferrises
    if (ferrisAwake && mode === 'play') {
      for (const f of ferris) {
        if (f.mode !== 'stalk') continue;
        const head = v3(f.root.position.x, FY + 1.6, f.root.position.z);
        const d = Math.hypot(P.x - head.x, P.z - head.z);
        const watched = d < 14 && g.watching(head.x, head.y, head.z) && clearLine(P.x, P.z, head.x, head.z, 1.5, true);
        f.root.rotation.y = faceYaw(P.x - head.x, P.z - head.z);
        if (!watched && g.zone() === 'ferris') {
          if (!f.path || (f.repath -= dt) <= 0) { f.path = findPath(head.x, head.z, P.x, P.z); f.pi = 0; f.repath = 0.4; }
          const tgt = f.path[Math.min(f.pi, f.path.length - 1)];
          if (tgt) { const dx = tgt[0] - head.x, dz = tgt[1] - head.z, l = Math.hypot(dx, dz); if (l < 0.3) f.pi++; else { const [nx, nz] = g.collide(head.x, head.z, dx / l * 2.6 * dt, dz / l * 2.6 * dt, 0.25, FY); f.root.position.x = nx; f.root.position.z = nz; } }
          if ((f.creakT = (f.creakT || 0) - dt) <= 0) { f.creakT = 0.7; A.creak(head, 0.15, 0, 0.3); }
          for (const d of W.doors.values()) if (!d.open && Math.hypot(d.cx - head.x, d.cz - head.z) < 1.1) { setDoor(d, true); A.doorSound(v3(d.cx, 1, d.cz), true); }
        }
        if (d < 0.85 && !P.hidden) { g.die('held'); return; }
        if (watched && d < 4) g.fearSpike(0.7);
      }
    }
    // the neighbours on their porches watch you
    for (const h of hosts) {
      if (!h.on || !h.r.root.visible) continue;
      const hp = h.r.root.position, dx = P.x - hp.x, dz = P.z - hp.z, d = Math.hypot(dx, dz);
      if (h.street) { // the run home: they reach for you
        h.r.root.rotation.y = faceYaw(dx, dz); pose(h.r, 'reach');
        if (d < 5) { const [nx, nz] = g.collide(hp.x, hp.z, dx / d * 0.9 * dt, dz / d * 0.9 * dt, 0.25, 0); hp.x = nx; hp.z = nz; animate(h.r, dt, 1, tt); pose(h.r, 'reach'); }
        if (d < 0.6) { g.die('held'); return; }
        continue;
      }
      if (d < 24) { let want = Math.atan2(dx, dz) - h.r.root.rotation.y; while (want > Math.PI) want -= Math.PI * 2; while (want < -Math.PI) want += Math.PI * 2; want = Math.max(-1.3, Math.min(1.3, want)); h.r.neck.rotation.y += (want - h.r.neck.rotation.y) * Math.min(1, dt * 2); }
      if (h.cool > 0) { h.cool -= dt; if (h.cool < 20) pose(h.r, 'stand'); continue; }
      let sees = 0;
      if (!P.hidden && d < 11 && clearLine(hp.x, hp.z, P.x, P.z, 1.4, true, true)) sees = P.crouching ? (d < 3.5 ? 0.7 : 0) : (1.2 - d / 11);
      if (g.flash.on && !P.hidden && d < 22) { const fd = g.flash.dir, ex = hp.x - P.x, ey = FY + 1.6 - (P.y + 1.5), ez = hp.z - P.z, l = Math.hypot(ex, ey, ez); if ((ex * fd.x + ey * fd.y + ez * fd.z) / l > 0.95 && clearLine(P.x, P.z, hp.x, hp.z, 1.5, true, true)) sees = Math.max(sees, 1.6); }
      if (sees > 0 && !hintHosts) { hintHosts = true; ui.hint('The neighbours are watching. Crouch (C) to slip past them, and keep your light off their faces.'); }
      h.alarm = sees > 0 ? h.alarm + sees * dt * 0.75 : Math.max(0, h.alarm - dt * 0.25);
      h.r.neck.rotation.z = h.alarm * 0.5;
      if (h.alarm > 0.3) { if ((h.wT = (h.wT || 0) - dt) <= 0) { h.wT = 1.2; A.whisper(v3(hp.x, 1.8, hp.z), 0, 0.8, 0.08 + h.alarm * 0.15); } }
      if (h.alarm >= 1) { h.alarm = 0; h.cool = 25; pose(h.r, 'point'); A.shriek(v3(hp.x, 1.8, hp.z)); pm.alert(P.x, P.z, 1); g.fearSpike(0.9); ui.toast('They\'ve told him where you are'); }
    }
    // the pop-ups in the garage
    for (const p of pops) {
      if (!p.done && Math.hypot(P.x - p.x, P.z - p.z) < 1.6) { p.done = true; p.t = 0; A.popup(v3(p.x, 1.4, p.z)); g.fearSpike(1); g.shake(0.4); }
      if (p.t >= 0) { p.t += dt; const k = Math.min(1, p.t / 0.12); p.r.root.position.y = -1.6 + k * 1.62 + Math.sin(p.t * 30) * 0.05 * Math.max(0, 1 - p.t); }
    }
    // the guillotine: up 2.2 s, drop, down 0.9 s, back up 1.3 s
    { const cyc = (tt % 4.6), bl = W.meshes.blade; let y, falling = false;
      if (cyc < 2.2) y = 2.15; else if (cyc < 2.36) { y = 2.15 - ((cyc - 2.2) / 0.16) * 1.15; falling = true; } else if (cyc < 3.3) y = 1.0; else y = 1.0 + ((cyc - 3.3) / 1.3) * 1.15;
      if (bl) { const was = bl.position.y; bl.position.y = 0.05 + y; if (was > 1.9 && y < 1.9 && Math.hypot(P.x - 16.5, P.z - 64.3) < 12) A.blade(v3(16.5, 1.5, 64.3)); if (cyc > 3.3 && cyc - dt <= 3.3 && Math.hypot(P.x - 16.5, P.z - 64.3) < 12) A.chain(v3(16.5, 2.4, 64.3), 1.2); }
      if (mode === 'play' && Math.abs(P.z - 64.3) < 0.32 && P.x > 15.4 && P.x < 17.6 && (falling || (y < 1.75 && cyc < 3.3)) && y < (P.crouching ? 1.1 : 1.75)) { g.die('headless'); return; }
    }
    // ghosts fade in, talk, fade out
    for (const gh of Object.values(ghosts)) if (gh.root.visible) { gh.life -= dt; gh.root.position.y += Math.sin(tt * 2) * 0.001; const a = gh.life > 1 ? Math.min(1, gh.fade += dt) : Math.max(0, gh.life); gh.body.material.opacity = 0.32 * a; if (gh.life <= 0) gh.root.visible = false; animate(gh, dt, 0, tt); }
    // Toby, waiting on his bale
    if (toby.root.visible) { toby.head.rotation.x = 0.4 + Math.sin(tt * 3) * 0.05; toby.root.rotation.y = Math.PI + Math.sin(tt * 0.7) * 0.15; }
    // checkpoints
    const z = g.zone();
    if (S.cp === 1 && S.flags.mossLeft && pm.state !== 'script' && z !== 'moss') reach(2);
    if (S.cp === 1 && S.flags.mossLeft && pm.state !== 'script' && z === 'moss' && Math.hypot(P.x - 27.3, P.z - 20) < 2) reach(2);
    if (S.cp === 2 && S.items.shoe && z !== 'ferris') reach(3);
    if (S.cp === 3 && S.items.keys && z !== 'maze' && P.z < 60.2) reach(4);
    if (S.cp === 4 && P.z > 155.2) reach(5);
    // the run home: he stays close behind, but you can make it
    if (S.cp === 6 && pm.state === 'chase') {
      const d = Math.hypot(pm.x - P.x, pm.z - P.z);
      pm.chaseSpeed = d < 4 ? 3.05 : d < 9 ? 3.35 : d < 18 ? 3.9 : 5.0;
      pm.lastSeenT = Math.min(pm.lastSeenT, 0.5); pm.last = { x: P.x, z: P.z }; // he always knows where Toby is
      if ((carryT += dt) > 9) { carryT = 0; const lines = ['He\'s right behind us!', 'Faster, Sam!', 'Don\'t let him take me back!', 'Go round them, go round!']; const l = lines[(Math.random() * lines.length) | 0]; ui.sub(`<b>Toby</b>: ${l}`, 2.5, 'speak'); voice.say('TOBY', l); }
      // the street lamps go out as he passes
      for (const f of W.props.lamps) if (f.on && Math.hypot(f.x - pm.x, f.z - pm.z) < 5) { setFixture(f, false); A.click(0.3); }
    }
    // first time near a hiding place while he's about
    if (!hintHide && pm.active && pd < 25 && S.cp >= 2) { hintHide = true; ui.hint('Lose him, then hide: hedges, beds, wardrobes. Never let him watch you get in.'); }
    if (P.hidden && pm.active && pd < 4 && !hintBreath) { hintBreath = true; ui.hint(`He's right there. Hold your breath: hold ${g.key('breath')}.`); }
  }
  const M_TV = new THREE.MeshStandardMaterial({ color: 0x101418, emissive: 0x9aaab8, emissiveIntensity: 0.5 });

  // ---------- the opening: 7:52 PM, the Moss house ----------
  const intro = {
    t: 0, done: false, lights: [], said: {},
    start() {
      this.t = 0; this.done = false; this.said = {};
      this.lights = W.fixtures.filter((f) => f.tag === 'porch' || f.tag === 'lamp').sort((a, b) => Math.abs(a.z - 20) - Math.abs(b.z - 20));
      for (const f of this.lights) setFixture(f, true);
      toby.root.visible = true; toby.root.position.set(6.4, 0.04, 19.8); toby.root.rotation.y = faceYaw(1, 0); pose(toby, 'stand');
      bucketMesh.visible = true; bucketMesh.rotation.set(0, 0, 0);
      setDoor(W.doors.get('mossFront'), true, true);
      pm.setActive(false);
    },
    update(dt, skip) {
      const k = this.t += dt, T = (s) => k >= s && !this.said[s] && (this.said[s] = true);
      const cam = g.camera;
      if (skip) this.skipT = (this.skipT || 0) + dt; else this.skipT = 0;
      ui.skip(this.skipT / 1.2);
      if (this.skipT > 1.2) return this.finish();
      g.U.black.value = Math.max(0, 1 - k * 0.5);
      // Toby runs up the path with his bucket, onto the porch, and in
      if (k < 3.4) { const f = Math.min(1, k / 3.2); toby.root.position.set(6.4 + f * 6.0, f > 0.8 ? FY : 0.04, 19.8 + Math.sin(f * 3) * 0.1); animate(toby, dt, 2, k); bucketMesh.position.set(toby.root.position.x + 0.2, toby.root.position.y + 0.35, toby.root.position.z + 0.18); }
      if (T(3.2)) { voice.say('TOBY', 'Trick or treat!'); ui.sub('<b>Toby</b>: Trick or treat!', 2.5, 'speak'); }
      if (k > 3.4 && k < 5.8) { animate(toby, dt, 0, k); toby.root.rotation.y = faceYaw(1, 0); }
      if (T(4.4)) { voice.say('TOBY', 'She says come in! She has the big bars!'); ui.sub('<b>Toby</b>: She says come in! She has the big bars!', 3, 'speak'); }
      if (T(6.6)) { ui.sub('Toby, wait for me. Toby...', 3.5, 'think'); }
      if (k > 5.8 && k < 6.6) { const f = (k - 5.8) / 0.8; toby.root.position.x = 12.4 + f * 2.6; animate(toby, dt, 1.5, k); bucketMesh.position.set(toby.root.position.x + 0.2, FY + 0.35, 19.98); }
      if (T(6.6)) { toby.root.visible = false; }
      // the camera: looking at the house, then down at your watch, then back up: the door is open, the porch is empty
      let yaw = -Math.PI / 2 + 0.05, pitch = -0.02;
      if (k > 6.4 && k < 9.6) { const f = Math.min(1, (k - 6.4) / 0.6) * Math.min(1, (9.6 - k) / 0.6); pitch = -0.02 - f * 1.0; yaw += f * 0.25; }
      if (T(7.0)) { ui.sub('7:52. Mom said home by eight. Two more houses, that\'s it.', 3, 'think'); }
      if (T(9.4)) { bucketMesh.visible = true; bucketMesh.position.set(12.5, FY, 19.9); A.thud(v3(12.5, 0.3, 19.9), 0.3, 0, 300); }
      if (k > 9.4 && k < 10.4) { const f = (k - 9.4); bucketMesh.position.set(12.5 - f * 3.1, FY * (1 - f) + 0.04, 19.9 - f * 0.2); bucketMesh.rotation.z = f * 1.4; if (T(10.0)) A.candy(); }
      if (T(10.6)) { ui.sub('Toby?', 2, 'think'); g.fearSpike(0.4); }
      // the porch lights go out, all down the lane, one by one
      if (k > 12 && k < 17.5) { const n = Math.floor((k - 12) / 0.45); for (let i = 0; i < Math.min(n, this.lights.length); i++) { const f = this.lights[i]; if (f.on && !(f.tag === 'porch' && f.x > 10 && Math.abs(f.z - 0.9) < 0.5)) { setFixture(f, false); A.click(0.15); } } }
      if (k > 11.5 && k < 18.5) { const f = Math.min(1, (k - 11.5) / 1.5); yaw = -Math.PI / 2 + 0.05 + f * (Math.PI / 2 - 0.15); pitch = -0.02 + f * 0.05; }
      // up the lane, his light crosses the street
      if (T(16.5)) { pm.place(-14, 74, -Math.PI / 2); pm.setActive(true, null); pm.runScript([{ to: [14, 74], speed: 1.6 }, { to: [20, 74], speed: 1.6, fn: () => pm.setActive(false) }]); A.presence(0.35, 5); }
      if (k > 18.5 && k < 23.5) { yaw = 0.02; pitch = 0.03; }
      if (T(19.5)) { g.fearSpike(0.8); }
      if (T(23.2)) { A.squelch(); setTimeout(() => { ui.sub('<b>Toby</b> (walkie-talkie): Sam? It\'s dark in here. The tall man says I\'m the pumpkin this year.', 5, 'walkie'); voice.say('TOBY', 'Sam? It\'s dark in here. The tall man says I\'m the pumpkin this year.'); }, 300); }
      if (k > 23.5) { const f = Math.min(1, (k - 23.5) / 1.5); yaw = 0.02 + f * (-Math.PI / 2 - 0.02); }
      cam.position.set(5.0, 0.1 + 1.55, 18.8); cam.rotation.set(pitch, yaw, 0); cam.updateMatrixWorld();
      if (k > 29) return this.finish();
      return false;
    },
    finish() {
      if (this.done) return true; this.done = true; ui.skip(0);
      for (const f of W.fixtures) if (f.tag === 'porch' || f.tag === 'lamp') setFixture(f, f.tag === 'porch' ? f.x > 10 && Math.abs(f.z - 0.9) < 0.5 : f.startOn);
      pm.setActive(false); toby.root.visible = false;
      return true;
    },
  };
  for (const f of W.fixtures) f.startOn = f.on;

  return { S, I, setup, update, objective, intro, toby, hosts, ferris, ghosts, pops, blowOut, read, setTrail, get trail() { return trailOn; }, startChase, ghostsList: ghosts, big };
}
