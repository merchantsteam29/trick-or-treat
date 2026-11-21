// TRICK OR TREAT — the game loop: Sam, the flashlight, hiding, the night, the menus, the dying.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { W, M, FY, buildWorld, updateWorld, collide, groundY, zoneOf, indoors, clearLine, setDoor, inCorn, CLEARING } from './world.js';
import { makePerson, makeGhost, animate, pose, headMaterial } from './people.js';
import { createGore } from './gore.js';
import { createPumpkinMan } from './pumpkin.js';
import { createStory, DEATHS, NOTES, SOULS } from './story.js';
import { createDeaths } from './deaths.js';
import * as T2 from './tex2.js';
import * as A from './audio.js';
import { voice } from './voice.js';
import { Input } from './input.js';
import { createGovernor } from '../perf.js';

const $ = (id) => document.getElementById(id);
const TEST = /[?&]test\b/.test(location.search);
const COARSE = matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches;
const load = (k) => { try { return JSON.parse(localStorage.getItem(k)) || null; } catch { return null; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };
const SKEY = 'trickortreat.settings', PKEY = 'trickortreat.progress', SAVE = 'trickortreat.save';
const settings = Object.assign({ vol: 0.8, voices: true, subs: true, sens: 1, invert: false, bright: 1, fov: 75, quality: COARSE ? 'low' : 'medium', gore: 'full', pads: true, rumble: true }, load(SKEY) || {});
const progress = Object.assign({ endings: {}, deaths: {}, total: 0, souls: 0 }, load(PKEY) || {});
const freshSave = () => ({ cp: 0, souls: {}, notes: {} });
let save = Object.assign(freshSave(), load(SAVE) || {});
const persist = () => { store(SAVE, save); store(PKEY, progress); syncSave(); };

// ---------- renderer ----------
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
renderer.info.autoReset = false; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false;
const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x0a0b13, 0.042);
const camera = new THREE.PerspectiveCamera(settings.fov, innerWidth / innerHeight, 0.05, 220); camera.rotation.order = 'YXZ'; scene.add(camera);
const FX = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, fear: { value: 0 }, bright: { value: 1 }, flash: { value: 0 }, red: { value: 0 }, black: { value: 0 }, him: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time, fear, bright, flash, red, black, him; varying vec2 vUv;
    vec3 rrt(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
    vec3 aces(vec3 c){ const mat3 I = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777)); const mat3 O = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602)); c *= 1.0 / 0.6; return clamp(O * rrt(I * c), 0.0, 1.0); }
    vec3 srgb(vec3 c){ return mix(pow(c, vec3(0.41666)) * 1.055 - 0.055, c * 12.92, step(c, vec3(0.0031308))); }
    float rnd(vec2 c){ return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv, c = uv - 0.5;
      uv.x += him * 0.004 * sin(uv.y * 40.0 + time * 5.0);
      float ab = 0.0008 + fear * 0.005 + him * 0.008;
      vec3 col = vec3(texture2D(tDiffuse, uv + c * ab).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - c * ab).b);
      col = srgb(aces(max(col * 1.25, 0.0)));
      col = pow(col, vec3(1.0 / bright));
      // night grade: shadows go blue-violet, the warm lights stay warm
      float l = dot(col, vec3(0.3, 0.59, 0.11));
      col = mix(col * vec3(0.82, 0.86, 1.1), col, smoothstep(0.05, 0.4, l));
      col = mix(col, vec3(l) * vec3(1.04, 0.96, 0.9), fear * 0.3);
      col += (rnd(uv * vec2(1013.0, 717.0) + fract(time * 7.13)) - 0.5) * (0.03 + fear * 0.05);
      float v = smoothstep(0.85 - fear * 0.25, 0.2, length(c * vec2(1.0, 0.8)) * (1.0 + fear * 0.3));
      col *= mix(0.3, 1.0, v);
      col += vec3(1.0, 0.75, 0.5) * flash;
      col = mix(col, vec3(0.3, 0.0, 0.0), red);
      col *= 1.0 - black;
      gl_FragColor = vec4(col, 1.0);
    }`,
};
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const fxPass = new ShaderPass(FX); composer.addPass(fxPass);
const U = fxPass.uniforms;

// lights: a little sky, the moon (the one shadow-casting light; its shadow box follows you), your flashlight,
// and point lights moved to the lamps nearest you. He brings his own.
const hemi = new THREE.HemisphereLight(0x46507a, 0x1e1810, 0.8); scene.add(hemi);
const moon = new THREE.DirectionalLight(0x9ab0e0, 0.8); moon.castShadow = true; scene.add(moon, moon.target);
Object.assign(moon.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 120 }); moon.shadow.bias = -0.0006; moon.shadow.normalBias = 0.04;
const MOON_DIR = new THREE.Vector3(-0.4, 0.7, 0.6).normalize();
const flash = new THREE.SpotLight(0xfff0d8, 0, 24, 0.42, 0.45, 1.4); flash.position.set(0.15, -0.12, 0); camera.add(flash, flash.target); flash.target.position.set(0, -0.2, -5);
const pool = Array.from({ length: 4 }, () => { const l = new THREE.PointLight(0xffc888, 0, 10, 2); scene.add(l); return l; });
let basePR = 1;
const gov = createGovernor({ apply: (s) => { renderer.setPixelRatio(basePR * s); composer.setPixelRatio(basePR * s); } });
const lamb = new Map();
function toLambert(on) {
  scene.traverse((o) => {
    if (!o.isMesh || !o.material || Array.isArray(o.material) || o.isInstancedMesh && o === W.meshes.corn) return;
    const m = o.material;
    if (on && m.isMeshStandardMaterial) {
      let l = lamb.get(m);
      if (!l) { l = new THREE.MeshLambertMaterial({ map: m.map, color: m.color, vertexColors: m.vertexColors, emissive: m.emissive, emissiveMap: m.emissiveMap, emissiveIntensity: m.emissiveIntensity, transparent: m.transparent, opacity: m.opacity, side: m.side, depthWrite: m.depthWrite, alphaTest: m.alphaTest }); l.userData.std = m; lamb.set(m, l); }
      l.emissiveIntensity = m.emissiveIntensity; o.material = l; o.userData.lamb = true;
    } else if (!on && m.isMeshLambertMaterial && m.userData.std) { const st = m.userData.std; o.material = st; }
  });
}
let lambertOn = false;
function applyQuality() {
  const q = settings.quality, dpr = devicePixelRatio || 1;
  basePR = q === 'low' ? Math.min(dpr, 1) * 0.75 : q === 'high' ? Math.min(dpr, 1.5) : Math.min(dpr, 1);
  pool.forEach((l, i) => { const on = i < (q === 'low' ? 2 : q === 'high' ? 4 : 3); if (!on) l.intensity = 0; l.userData.off = !on; });
  renderer.setPixelRatio(basePR * gov.scale); composer.setPixelRatio(basePR * gov.scale);
  moon.castShadow = q !== 'low'; flash.castShadow = q === 'high';
  if (W.meshes.corn) W.meshes.corn.count = Math.round(W.meshes.corn.userData.full * (q === 'low' ? 0.55 : 1));
  if ((q === 'low') !== lambertOn) { lambertOn = q === 'low'; toLambert(lambertOn); }
  const sm = q === 'high' ? 2048 : 1024;
  if (moon.shadow.mapSize.x !== sm) { moon.shadow.mapSize.set(sm, sm); moon.shadow.map?.dispose(); moon.shadow.map = null; }
  renderer.shadowMap.type = q === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap; renderer.shadowMap.needsUpdate = true;
}
function resize() { renderer.setSize(innerWidth, innerHeight, false); composer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize);
applyQuality(); resize();

buildWorld(scene);
const gore = createGore(scene, groundY);

// ---------- Sam ----------
const P = { x: 6, y: 0.1, z: 18.6, yaw: -Math.PI / 2, pitch: 0, eye: 1.55, crouch: false, crouching: false, stam: 1, zone: 'street', bob: 0, stepT: 0, vy: 0, lookDir: new THREE.Vector3(), hidden: false, hide: null, carry: false, breath: 1, holding: false, breathOut: 0, moving: 0, lit: false };
const input = new Input(canvas);
input.pads = settings.pads; input.padSens = settings.sens; input.touchSens = settings.sens; input.rumbleOn = settings.rumble;
voice.on = settings.voices; A.setVolume(settings.vol);
let mode = 'warn', fear = 0, spike = 0, shakeT = 0, focus = null, T = 0, deathKind = null, holdT = 0, holdId = null, readFrom = null;
const flashOn = { on: false, dir: new THREE.Vector3(), batt: 1, flick: 0 };

// ---------- HUD ----------
const ui = {
  subT: 0, toastT: 0, hintT: 0, objT: 0,
  sub(text, dur = 4, kind = 'think') { if (!settings.subs && kind !== 'think') return; const e = $('sub'); e.innerHTML = text; e.className = 'on ' + kind; this.subT = dur; },
  toast(text) { const e = $('toast'); e.textContent = text; e.classList.add('on'); this.toastT = 2.6; },
  hint(text) { const e = $('hint'); e.textContent = text; e.classList.add('on'); this.hintT = 7; },
  skip(k) { const e = $('skip'); e.classList.toggle('on', k > 0 || mode === 'intro'); $('skipFill').style.width = (Math.min(1, k) * 100).toFixed(0) + '%'; },
  objective(show = true) {
    const o = story.objective(); const e = $('obj');
    $('objMain').textContent = o.main; $('objSub').innerHTML = o.sub.map((s) => `<div>${s}</div>`).join('');
    if (show) { e.classList.add('on'); this.objT = 6; }
  },
  tick(dt) {
    if (this.subT > 0 && (this.subT -= dt) <= 0) $('sub').classList.remove('on');
    if (this.toastT > 0 && (this.toastT -= dt) <= 0) $('toast').classList.remove('on');
    if (this.hintT > 0 && (this.hintT -= dt) <= 0) $('hint').classList.remove('on');
    if (this.objT > 0 && (this.objT -= dt) <= 0) $('obj').classList.remove('on');
  },
};
const keyName = (what) => {
  if (input.padMode) return { use: input.label(0), crouch: input.label(1), run: input.label(4), notes: input.label(3), light: input.label(2), breath: input.label(7) }[what];
  if (input.touchMode) return { use: 'USE', crouch: 'CROUCH', run: 'RUN', notes: 'GOAL', light: 'LIGHT', breath: 'BREATH' }[what];
  return { use: 'E', crouch: 'C', run: 'Shift', notes: 'Tab', light: 'F', breath: 'Space' }[what];
};

// ---------- the API the story and the monster use ----------
const _v = new THREE.Vector3();
const onScreen = (x, y, z) => { _v.set(x, y, z).project(camera); return _v.z < 1 && Math.abs(_v.x) < 1.05 && Math.abs(_v.y) < 1.05; };
const muffle = (x, y, z) => { const z1 = zoneOf(x, y + 0.5, z); if (indoors(P.zone) !== indoors(z1) || (indoors(z1) && z1 !== P.zone)) return 0.6; return clearLine(P.x, P.z, x, z, 1.5, true, true) ? 0 : 0.3; };
const pm = createPumpkinMan({ scene, A, P, muffle, onScreen: (x, y, z) => onScreen(x, y, z) && clearLine(P.x, P.z, x, z, 1.5, true, true), onSeen: () => { spike = Math.max(spike, 1); input.rumble(0.6, 0.6, 300); }, onLost: () => {} });
const bucket = (() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.18, 12, 1, true), new THREE.MeshStandardMaterial({ color: 0xd8640e, side: THREE.DoubleSide })); m.visible = false; scene.add(m); return m; })();
const g = {
  scene, camera, P, A, voice, ui, gore, W, pm, U, flash: flashOn,
  get save() { return save; },
  groundY, collide,
  zone: () => P.zone, mode: () => mode, key: keyName,
  fearSpike(v) { spike = Math.max(spike, v); },
  shake(s) { shakeT = Math.max(shakeT, s); input.rumble(s, s, 300); },
  watching(x, y, z) { if (!onScreen(x, y, z)) return false; _v.set(x - camera.position.x, y - camera.position.y, z - camera.position.z).normalize(); return _v.dot(P.lookDir) > 0.6; },
  die(kind, info) { die(kind, info); },
  ending(kind) { startEnding(kind); },
  readNote(n) { showNote(n); },
  persistSouls(s) { save.souls = { ...s }; progress.souls = Math.max(progress.souls || 0, Object.keys(s).length); persist(); },
  saveCheckpoint(cp) { save.cp = cp; save.souls = { ...story.S.souls }; save.notes = { ...story.S.notes }; persist(); ui.toast('Checkpoint'); ui.objective(); },
  spawn(x, z, yaw) { Object.assign(P, { x, z, yaw, pitch: 0, crouch: false, stam: 1, vy: 0, hidden: false, hide: null, breath: 1, holding: false }); P.y = groundY(x, z, 2); P.zone = zoneOf(x, P.y, z); },
};
const story = createStory(g);
const deaths = createDeaths({ scene, camera, P, A, gore, U, pm, shake: (s) => g.shake(s), bucket: () => bucket });
lambertOn = false; applyQuality();

// ---------- screens ----------
const SCREENS = ['warn', 'title', 'how', 'settings', 'pause', 'know', 'dead', 'ending', 'card', 'note'];
function show(id) { $(id).hidden = false; $(id).querySelector('button')?.focus({ preventScroll: true }); }
function only(id) { for (const s of SCREENS) $(s).hidden = s !== id; if (id) show(id); }
function lockSoon() { if (!TEST && !input.touchMode) setTimeout(() => input.lock(), 30); }
document.addEventListener('pointerlockchange', () => { if (!input.locked && mode === 'play' && !TEST && !input.touchMode) pause(true); });
canvas.addEventListener('click', () => { if (mode === 'play') input.lock(); });
function pause(on) {
  if (on && mode === 'play') { mode = 'paused'; only('pause'); voice.pause(); input.unlock(); }
  else if (!on && mode === 'paused') { mode = 'play'; only(null); voice.resume(); lockSoon(); }
}
function setHud(on) { $('hud').hidden = !on; $('touch').classList.toggle('on', on && input.touchMode); }
function showNote(n) { readFrom = mode; mode = 'read'; $('noteTitle').textContent = n.title; $('noteBody').innerHTML = n.html; only('note'); input.unlock(); }
function closeNote() { if (mode !== 'read') return; only(null); mode = readFrom === 'paused' ? 'paused' : 'play'; if (mode === 'paused') { only('know'); knowList(); } else lockSoon(); }

// ---------- a run of the night, from a checkpoint ----------
function startFrom(cp) {
  gore.clear(); deaths.cleanup();
  spike = 0; fear = 0; U.red.value = 0; U.flash.value = 0; U.black.value = 1;
  story.S.souls = { ...save.souls }; story.S.notes = { ...save.notes }; story.S.items = {}; story.S.flags = {};
  flashOn.on = false;
  story.setup(cp);
  mode = 'card'; only('card'); setHud(false);
  $('cardTime').textContent = ['', '7:53 PM', '8:10 PM', '8:31 PM', '8:58 PM', '9:20 PM', '9:44 PM'][cp] || '';
  $('cardSub').textContent = ['', 'Hollow Lane', 'Across the street', 'The haunted house', 'The top of the lane', 'The corn', 'Home'][cp] || '';
  A.initAudio();
  setTimeout(() => { if (mode !== 'card') return; only(null); mode = 'play'; setHud(true); lockSoon(); ui.objective(); if (cp === 1) ui.hint(input.padMode ? 'Left stick move · right stick look · A use · X flashlight' : input.touchMode ? 'Left thumb move · right thumb look' : 'WASD move · mouse look · E use · F flashlight · Shift run · C crouch · Tab objective'); }, TEST ? 200 : 2200);
}
function newGame() {
  save = freshSave(); store(SAVE, save);
  if (TEST || load('trickortreat.seenIntro')) { save.cp = 1; persist(); startFrom(1); return; }
  mode = 'intro'; only(null); setHud(false); A.initAudio(); story.intro.start(); ui.skip(0);
}
function continueGame() { if (save.cp < 1) { newGame(); return; } startFrom(save.cp); }

// ---------- dying ----------
function die(kind, info = {}) {
  if (mode !== 'play') return;
  if (P.carry && (kind === 'carved' || kind === 'found')) kind = 'torn';
  mode = 'dying'; deathKind = kind;
  const first = !progress.deaths[kind];
  progress.deaths[kind] = (progress.deaths[kind] || 0) + 1; progress.total++;
  persist(); voice.cancel(); input.rumble(1, 1, 700);
  setHud(false); $('dead').dataset.first = first ? '1' : '';
  if (P.hidden) { info.eye = P.hide.eye; }
  P.hidden = false;
  flashOn.on = false;
  deaths.start(kind, info, settings.gore === 'full');
}
function showDead() {
  const d = DEATHS[deathKind] || DEATHS.carved;
  mode = 'dead'; input.unlock(); pm.stopSounds();
  $('deadTitle').textContent = d.title; $('deadLine').textContent = d.line;
  $('deadLearn').textContent = d.learn;
  $('deadCount').textContent = `Died ${progress.total} time${progress.total === 1 ? '' : 's'} · ${Object.keys(progress.deaths).length} of ${Object.keys(DEATHS).length} ways`;
  only('dead');
}

// ---------- endings ----------
const ENDINGS = {
  treat: { title: 'TREAT', lines: ['You get the door shut and the lock turned and you hold on to him.', 'Out in the lane, three small lights come down the middle of the road. Danny. Marcus. Lisa.', 'They take his long white hands. He lets them. He can\'t see where he\'s going any more.', 'They lead him back up Hollow Lane, past the Marsh gate, into the corn, and the candle in his head goes out.', 'At 6:40 in the morning the porch lights on Hollow Lane come on, one by one, and nobody ever turns them off again.', 'Toby keeps his skull mask under his bed. He says it\'s so they can find him, if they want to play.'], note: 'The true ending. You put out every candle.' },
  trick: { title: 'TRICK', lines: ['You get the door shut and the lock turned and you hold on to him so tight he squeaks.', 'Outside, the candle goes back up the lane, unhurried. He doesn\'t need to hurry.', '"Sam," says Toby. "Sam, my head feels funny. Like it\'s empty."', 'Through the eyeholes of his mask, something is lit.', 'Next year the Wrens\' porch light is the only one left on. Next year, the Lane draws again.'], note: 'He still had candles to see by. Somewhere, three are still burning.' },
  place: { title: 'THE CANDLE', lines: ['You pick up the little lantern with his name on it. It\'s warm, like a hand.', '"Go home, Toby. Don\'t look back. Run."', 'He runs. He doesn\'t look back. You told him not to.', 'Long white fingers settle on your shoulders, gently. He has all night, and he is very careful.', 'In the morning Toby is home, asleep in his costume. Your bed is made.', 'In Mrs. Moss\'s kitchen, the list has a new name on it, in fresh red pen: SAM WREN, 1990.'], note: 'You took his place.' },
  alone: { title: 'PORCH LIGHT', lines: ['You shut the door behind you. The house is warm. The TV is on.', '"Where\'s your brother?" says Mom.', 'You tell them. Dad goes very quiet. He calls someone, not the police, and talks in a low voice for a long time.', 'When he hangs up, he goes to the front door and turns the porch light off.', '"I grew up on this street," he says. "I thought if we came back with you two, they\'d leave us alone. That we\'d be the ones who keep their light on."', 'Toby never came home. Every Halloween after that, your father turned the light off by eight.'], note: 'You went home without him.' },
};
let endKind = null, endT = 0, endRig = null, endGhosts = [];
function startEnding(kind) {
  if (mode !== 'play') return;
  endKind = kind; mode = 'endcut'; endT = 0; setHud(false); voice.cancel(); P.hidden = false;
  input.unlock(); A.hush(6);
  for (const gh of endGhosts) gh.root.parent?.remove(gh.root); endGhosts = [];
  if (endRig) { endRig.root.parent?.remove(endRig.root); endRig = null; }
  if (kind === 'treat') {
    pm.setActive(true, null); pm.state = 'grab'; pm.place(0, 12, 0); pm.root.visible = true;
    for (let i = 0; i < 3; i++) { const gh = makeGhost({ head: 'toby', dress: i === 2 ? 0xffffff : undefined }); gh.root.position.set(-1.2 + i * 1.2, 0, 9 + i * 0.4); scene.add(gh.root); endGhosts.push(gh); }
    A.whisper(new THREE.Vector3(0, 1, 10), 0, 3, 0.2);
  } else if (kind === 'trick') {
    pm.setActive(false);
    endRig = makePerson({ head: 'toby', shirt: 0x111114, pants: 0x111114, skeleton: true, kid: 0.6 });
    const tx = T2.carvedHead(0xe0b090); endRig.headMesh.material = new THREE.MeshStandardMaterial({ map: tx, emissive: 0xffffff, emissiveMap: tx.glow, emissiveIntensity: 0, roughness: 0.6 });
    endRig.root.position.set(12.4, FY, 1.2); endRig.root.rotation.y = Math.PI / 2; scene.add(endRig.root);
  } else if (kind === 'place') {
    endRig = makePerson({ head: 'skull', shirt: 0x111114, pants: 0x111114, skeleton: true, kid: 0.6 }); endRig.root.position.set(CLEARING.x, 0, CLEARING.z + 1.5); scene.add(endRig.root);
    pm.setActive(true, null); pm.state = 'grab'; pm.place(CLEARING.x - 6, CLEARING.z - 3, 0);
  } else if (kind === 'alone') { pm.setActive(false); }
}
function updateEndcut(dt) {
  endT += dt;
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  if (endKind === 'treat') {
    // from your porch: the children lead him away up the lane
    camera.position.set(11.6, FY + 1.5, 0.6); camera.lookAt(0, 2.0, 14); camera.updateMatrixWorld();
    const k = Math.max(0, endT - 1.2);
    pm.x = Math.sin(endT * 0.3) * 0.2; pm.z = 12 + k * 1.4; pm.yaw = Math.PI; pm.root.position.set(pm.x, 0, pm.z); pm.root.rotation.y = 0;
    pm.R.light.intensity = Math.max(0, 5 - k * 1.1); pm.R.headMat.emissiveIntensity = Math.max(0, 1.8 - k * 0.4);
    pm.R.limbs.L.sh.rotation.x = pm.R.limbs.R.sh.rotation.x = -0.4; pm.R.limbs.L.sh.rotation.z = -0.5; pm.R.limbs.R.sh.rotation.z = 0.5;
    endGhosts.forEach((gh, i) => { gh.root.position.set(pm.x - 1.0 + i, 0, pm.z - 0.6 + (i === 1 ? -0.8 : 0)); gh.root.rotation.y = 0; animate(gh, dt, k > 0 ? 1 : 0, endT); gh.body.material.opacity = Math.min(0.32, endT * 0.3); });
    U.black.value = endT < 1 ? 1 - endT : Math.max(0, (endT - 7) / 1.5);
    if (endT > 8.6) showEnding();
  } else if (endKind === 'trick') {
    camera.position.set(11.4, FY + 1.35, -0.4); camera.lookAt(12.4, FY + 0.7, 1.2); camera.updateMatrixWorld();
    const r = endRig, f = Math.min(1, Math.max(0, endT - 2.0) / 1.5), a0 = Math.PI / 2, a1 = Math.atan2(-1, -1.6); r.root.rotation.y = a0 + (a1 - a0) * f * f * (3 - 2 * f);
    r.headMesh.material.emissiveIntensity = endT > 3.6 ? Math.min(2, (endT - 3.6) * 2) : 0;
    if (endT > 3.6 && !r.giggled) { r.giggled = true; A.giggle(v(12.4, 1, 1.2), 0.25, 0); }
    U.black.value = endT < 1 ? 1 - endT : Math.max(0, (endT - 5.6) / 1.2);
    if (endT > 7) showEnding();
  } else if (endKind === 'place') {
    camera.position.set(CLEARING.x + 1.0, 1.4, CLEARING.z - 0.4); camera.lookAt(CLEARING.x, 0.8, CLEARING.z + 6); camera.updateMatrixWorld();
    const r = endRig, k = Math.max(0, endT - 1.5); r.root.position.set(CLEARING.x + Math.sin(k) * 0.3, 0, CLEARING.z + 1.5 + k * 2.6); r.root.rotation.y = 0; animate(r, dt, k > 0 ? 2 : 0, endT);
    if (endT > 4.5 && !r.f) { r.f = 1; A.bigStep(v(CLEARING.x - 1, 0, CLEARING.z - 2), 0.8); A.flame(v(CLEARING.x, 2.4, CLEARING.z - 1.5), 0.8); }
    U.black.value = endT < 0.8 ? 1 - endT / 0.8 : Math.max(0, (endT - 5.2) / 0.8);
    if (endT > 6.4) showEnding();
  } else {
    camera.position.set(12.9, FY + 1.6, -0.2); camera.lookAt(9, 1.4, 6); camera.updateMatrixWorld();
    U.black.value = endT < 0.8 ? 1 - endT / 0.8 : Math.max(0, (endT - 3.0) / 1.0);
    if (endT > 2.4 && !W.props._alone) { W.props._alone = 1; const f = W.fixtures.find((f) => f.tag === 'porch' && f.x > 10 && Math.abs(f.z - 0.9) < 0.5); if (f) f.on = false; A.click(0.4); }
    if (endT > 4.3) { W.props._alone = 0; showEnding(); }
  }
}
function showEnding() {
  const e = ENDINGS[endKind]; mode = 'ending';
  progress.endings[endKind] = 1; pm.setActive(false); pm.stopSounds();
  for (const gh of endGhosts) gh.root.parent?.remove(gh.root); endGhosts = [];
  if (endRig) { endRig.root.parent?.remove(endRig.root); endRig = null; }
  const souls = Object.keys(story.S.souls).length;
  save = freshSave(); persist();
  $('endTitle').textContent = e.title;
  $('endLines').innerHTML = e.lines.map((l, i) => `<p style="animation-delay:${1 + i * 2.8}s">${l}</p>`).join('');
  $('endFoot').style.animationDelay = (2 + e.lines.length * 2.8) + 's';
  $('endWhich').textContent = `${e.note} · candles out: ${souls} of 3 · endings found: ${Object.keys(progress.endings).length} of 4`;
  only('ending'); input.unlock(); U.black.value = 1;
}

// ---------- interaction ----------
function promptFor(it) {
  if (it.hide) return P.carry ? null : 'Hide';
  if (it.door) { const d = it.door; if (d.id === 'gate' && d.locked && story.S.items.keys) return null; return d.locked ? d.name : d.open ? 'Close' : 'Open ' + (d.label || d.name.toLowerCase()); }
  const s = story.I[it.id]; return s ? s.p() : null;
}
function findFocus() {
  const eye = camera.position, dir = P.lookDir;
  let best = null, bs = -1;
  for (const it of W.inter) {
    const dx = it.x - eye.x, dy = it.y - eye.y, dz = it.z - eye.z;
    if (Math.abs(dy) > 2.0) continue;
    const d = Math.hypot(dx, dy, dz);
    if (d > it.r) continue;
    const dot = (dx * dir.x + dy * dir.y + dz * dir.z) / d;
    if (dot < (d < 0.9 ? 0.5 : 0.8)) continue;
    const label = promptFor(it); if (!label) continue;
    const hd = Math.hypot(dx, dz) || 1;
    if (!it.door && hd > 0.5 && !clearLine(P.x, P.z, it.x - (dx / hd) * 0.45, it.z - (dz / hd) * 0.45, Math.min(P.y + 1.2, it.y + 0.2), true, true)) continue;
    const s = dot - d * 0.08; if (s > bs) { bs = s; best = { it, label }; }
  }
  return best;
}
function use(it) {
  if (it.hide) { enterHide(it.hide); return; }
  if (it.door) {
    const d = it.door;
    if (d.locked) { ui.sub(d.lockedText, 3, 'think'); A.click(0.2); A.thud(new THREE.Vector3(d.cx, 1, d.cz), 0.2, 0, 200); return; }
    setDoor(d, !d.open); A.doorSound(new THREE.Vector3(d.cx, 1, d.cz), d.open); pm.hear(d.cx, d.cz, 5); return;
  }
  story.I[it.id]?.use(); ui.objective(false);
}
function enterHide(h) {
  P.hidden = true; P.hide = h; P.breath = Math.max(P.breath, 0.3); A.creak(new THREE.Vector3(h.x, 1, h.z), 0.2, 0, 0.4);
  P.hideYaw = 0; P.hidePitch = 0; flashOn.on = false;
  if (pm.active && pm.lastSeenT < 1.3 && pm.state === 'chase') pm.hideSeen = h;
}
function exitHide() { const h = P.hide; P.hidden = false; P.hide = null; P.x = h.exit[0]; P.z = h.exit[1]; P.y = groundY(P.x, P.z, h.y + 0.4); P.yaw = h.yaw; P.pitch = 0; A.creak(new THREE.Vector3(h.x, 1, h.z), 0.2, 0, 0.3); }

// ---------- playing ----------
const SURF = { moss: 'wood', ferris: 'wood', marsh: 'wood', maze: 'concrete', street: 'concrete', culdesac: 'concrete', yard: 'leaves', field: 'dirt', corn: 'dirt' };
let lastObj = '', noiseT = 0;
function updatePlay(dt, t) {
  const K = (...c) => input.down(...c), H = (...c) => input.hit(...c), pad = input.pad;
  if (H('Escape', 'KeyP') || pad?.pause) { pause(true); return; }
  const sens = 0.0021 * settings.sens;
  if (H('Tab', 'KeyJ') || pad?.notes) ui.objective();
  // the flashlight
  if ((H('KeyF') || pad?.light || input.rmbHit) && !P.hidden) { flashOn.on = !flashOn.on; A.click(0.25); }
  if (P.hidden) { updateHidden(dt, t, sens); return; }
  P.yaw -= input.dx * sens; P.pitch -= input.dy * sens * (settings.invert ? -1 : 1);
  P.pitch = Math.max(-1.45, Math.min(1.45, P.pitch));
  if (H('KeyC') || pad?.crouch) P.crouch = !P.crouch;
  const crouch = P.crouch || K('ControlLeft', 'ControlRight');
  let fx = 0, sx = 0;
  if (K('KeyW', 'ArrowUp')) fx += 1; if (K('KeyS', 'ArrowDown')) fx -= 1; if (K('KeyD', 'ArrowRight')) sx += 1; if (K('KeyA', 'ArrowLeft')) sx -= 1;
  if (pad) { fx += pad.mz; sx += pad.mx; }
  const l = Math.hypot(fx, sx); if (l > 1) { fx /= l; sx /= l; }
  const run = !crouch && (K('ShiftLeft', 'ShiftRight') || pad?.run) && P.stam > 0.05 && fx > 0.3;
  const corn = inCorn(P.x, P.z);
  let spd = crouch ? 1.15 : run ? 4.3 : 2.2;
  if (P.carry) spd *= run ? 0.86 : 0.9;
  if (corn) spd *= 0.85;
  const fw = [-Math.sin(P.yaw), -Math.cos(P.yaw)], rt = [Math.cos(P.yaw), -Math.sin(P.yaw)];
  const mx = (fw[0] * fx + rt[0] * sx) * spd * dt, mz = (fw[1] * fx + rt[1] * sx) * spd * dt;
  const [nx, nz] = collide(P.x, P.z, mx, mz, 0.28, P.y, crouch ? 1.1 : 1.7);
  P.moving = Math.hypot(nx - P.x, nz - P.z) / dt;
  P.x = nx; P.z = nz;
  const gy = groundY(P.x, P.z, P.y);
  if (gy > P.y - 0.02) { P.y += (gy - P.y) * Math.min(1, dt * 16); P.vy = 0; }
  else if (gy > P.y - 0.45 && P.vy === 0) { P.y += (gy - P.y) * Math.min(1, dt * 16); }
  else { P.vy -= 18 * dt; P.y = Math.max(gy, P.y + P.vy * dt); if (P.y === gy) P.vy = 0; }
  const drain = P.carry ? 30 : 6.5; // with Toby on your back, fear keeps you going
  P.stam = run && P.moving > 1 ? Math.max(0, P.stam - dt / drain) : Math.min(1, P.stam + dt / (P.stam < 0.1 ? 7 : 4.5));
  P.eye += ((crouch ? 0.95 : 1.55) - P.eye) * Math.min(1, dt * 10);
  P.crouching = crouch;
  P.zone = zoneOf(P.x, P.y, P.z);
  P.breath = Math.min(1, P.breath + dt / 3);
  if (P.moving > 0.3) {
    P.bob += dt * P.moving * 2.6;
    P.stepT += (P.moving * dt) / (run ? 0.9 : crouch ? 0.55 : 0.7);
    if (P.stepT >= 1) { P.stepT = 0; A.step(new THREE.Vector3(P.x, P.y, P.z), corn ? 'carpet' : SURF[P.zone] === 'leaves' ? 'carpet' : SURF[P.zone] || 'wood', run ? 0.3 : crouch ? 0.06 : 0.15); }
  } else P.bob *= 0.9;
  // noise: running carries, walking a little, creeping nothing
  if ((noiseT -= dt) <= 0) { noiseT = 0.4; const r = P.moving < 0.3 ? 0 : run ? (indoors(P.zone) ? 10 : 14) : crouch ? 0 : corn ? 4.5 : 3.2; if (r) pm.hear(P.x, P.z, r); }
  // interaction (some things need holding)
  focus = findFocus();
  const hold = focus ? (focus.it.hide ? 0 : story.I[focus.it.id]?.hold || 0) : 0;
  const pressing = K('KeyE') || input.lmb || !!pad?.useHeld;
  let prog = '';
  if (focus && hold) {
    if (pressing && (holdId === focus.it.id)) { holdT += dt; if (holdT >= hold) { holdT = 0; holdId = null; use(focus.it); } }
    else if ((H('KeyE') || input.lmbHit || pad?.use)) { holdId = focus.it.id; holdT = 0; }
    else if (!pressing) { holdId = null; holdT = 0; }
    if (holdId === focus.it.id) prog = `<i style="--p:${Math.min(1, holdT / hold)}"></i>`;
  } else { holdId = null; holdT = 0; if (focus && (H('KeyE') || input.lmbHit || pad?.use)) use(focus.it); }
  $('prompt').innerHTML = focus ? `<b>${keyName('use')}</b> ${focus.label}${prog}` : '';
  afterMove(dt, t);
  placeCamera(dt);
  $('xhair').classList.toggle('on', !!focus);
}
// hiding: you can only look a little; leave with use; hold your breath when he's close
function updateHidden(dt, t, sens) {
  const h = P.hide, pad = input.pad;
  P.hideYaw = Math.max(-0.75, Math.min(0.75, P.hideYaw - input.dx * sens));
  P.hidePitch = Math.max(-0.45, Math.min(0.45, P.hidePitch - input.dy * sens * (settings.invert ? -1 : 1)));
  const want = input.down('Space') || !!pad?.breath;
  if (want && P.breath > 0 && P.breathOut <= 0) { P.holding = true; P.breath = Math.max(0, P.breath - dt / 7); if (P.breath <= 0) { P.holding = false; P.breathOut = 1.6; A.gasp(); } }
  else { P.holding = false; P.breath = Math.min(1, P.breath + dt / 3.5); }
  if (P.breathOut > 0) P.breathOut -= dt;
  P.moving = 0; P.zone = zoneOf(h.x, h.y + 0.3, h.z); P.x = h.x; P.z = h.z; P.y = h.y;
  $('prompt').innerHTML = `<b>${keyName('use')}</b> Get out &nbsp; <b>${keyName('breath')}</b> Hold your breath`;
  if (input.hit('KeyE') || input.lmbHit || pad?.use) { exitHide(); return; }
  afterMove(dt, t);
  camera.position.set(h.x, h.y + h.eye, h.z);
  camera.rotation.set(P.hidePitch + (h.kind === 'bed' ? -0.05 : 0), h.yaw + P.hideYaw, 0); camera.updateMatrixWorld(); camera.getWorldDirection(P.lookDir);
  $('hideFX').className = 'on ' + h.kind;
}
function afterMove(dt, t) {
  // fear: him, the dark, the moment
  spike = Math.max(0, spike - dt * 0.3);
  const pd = pm.active ? Math.hypot(pm.x - P.x, pm.z - P.z) : 99;
  const near = pm.active ? Math.max(0, 1 - pd / 16) : 0;
  const ft = Math.max(spike, near * (pm.state === 'chase' ? 1 : 0.7), pm.state === 'chase' ? 0.8 : 0);
  fear += (ft - fear) * Math.min(1, dt * (ft > fear ? 2.5 : 0.4));
  A.heartbeat(dt, 62 + fear * 85, Math.max(0, fear - 0.15) * 0.55);
  A.breath(dt, P.holding ? 0 : 0.25 + (1 - P.stam) * 0.6 + fear * 0.35, P.holding ? 0 : 0.004 + (1 - P.stam) * 0.05 + fear * 0.02);
  // are you standing in the light?
  let lit = false; for (const f of W.fixtures) if (f.on && Math.hypot(f.x - P.x, f.z - P.z) < f.range * 0.38 && Math.abs(f.y - P.y) < 4) { lit = true; break; }
  P.lit = lit;
  if (!P.hidden) $('hideFX').className = '';
  // him
  const res = pm.update(dt, t, { x: P.x, y: P.y, z: P.z, crouching: P.crouching, hidden: P.hidden, hide: P.hide, flash: flashOn.on, flashDir: flashOn.dir, lit, moving: P.moving, zone: P.zone, holding: P.holding, breathOut: P.breathOut > 0 });
  if (res === 'caught') { die('carved'); return; }
  if (res === 'found') { die('found'); return; }
  story.update(dt, t, mode);
  if (mode !== 'play') return;
  const o = story.objective(); if (o.main + o.sub[0] !== lastObj) { lastObj = o.main + o.sub[0]; ui.objective(); }
  // breath meter
  $('breath').classList.toggle('on', P.hidden); $('breathFill').style.width = (P.breath * 100).toFixed(0) + '%'; $('breath').classList.toggle('hold', P.holding);
  $('stam').style.opacity = P.stam < 0.98 && !P.hidden ? 0.8 : 0; $('stamFill').style.width = (P.stam * 100).toFixed(0) + '%';
}
function placeCamera(dt) {
  const k = Math.min(1, P.moving / 2), bob = Math.sin(P.bob) * 0.035 * k, sway = Math.cos(P.bob * 0.5) * 0.02 * k;
  camera.position.set(P.x + Math.cos(P.yaw) * sway, P.y + P.eye + bob, P.z - Math.sin(P.yaw) * sway);
  let sh = fear > 0.65 ? (fear - 0.65) * 0.012 : 0;
  if (shakeT > 0) { shakeT -= dt; sh += shakeT * 0.05; }
  camera.rotation.set(P.pitch + (Math.random() - 0.5) * sh, P.yaw + (Math.random() - 0.5) * sh, 0);
  camera.updateMatrixWorld(); camera.getWorldDirection(P.lookDir);
}

// ---------- lights each frame ----------
let poolT = 0;
function updateLights(dt, t) {
  const c = camera.position;
  moon.target.position.set(Math.round(c.x), 0, Math.round(c.z)); moon.position.copy(moon.target.position).addScaledVector(MOON_DIR, 60); moon.target.updateMatrixWorld();
  if ((poolT -= dt) <= 0) {
    poolT = 0.2;
    const live = pool.filter((l) => !l.userData.off);
    const near = W.fixtures.filter((f) => f.on).map((f) => ({ f, d: (f.x - c.x) ** 2 + ((f.y - c.y) * 2) ** 2 + (f.z - c.z) ** 2 })).sort((a, b) => a.d - b.d).slice(0, live.length);
    live.forEach((l, i) => { const n = near[i]; if (!n) { l.userData.base = 0; return; } const f = n.f; l.position.set(f.x, f.y, f.z); l.color.set(f.color); l.distance = f.range; l.userData.base = f.power; l.userData.f = f; });
  }
  for (const l of pool) {
    if (l.userData.off) { l.intensity = 0; continue; }
    const f = l.userData.f; let k = 1;
    if (f?.flicker) k = f.tag === 'strobe' ? (Math.sin(t * 31) > 0.6 ? 1.6 : 0.03) : Math.random() < 0.08 ? 0.1 : 1;
    if (pm.active && pm.state === 'chase' && f && Math.hypot(f.x - pm.x, f.z - pm.z) < 7 && Math.random() < 0.3) k *= 0.2;
    l.intensity = (l.userData.base || 0) * k;
  }
  // the flashlight: a little flicker when he's close
  const pd = pm.active ? Math.hypot(pm.x - P.x, pm.z - P.z) : 99;
  flashOn.flick = pd < 10 && Math.random() < 0.06 ? 0.15 : 1;
  flash.intensity = flashOn.on && (mode === 'play') ? 22 * flashOn.flick : 0;
  camera.getWorldDirection(flashOn.dir);
  // street lamps and windows: the glow sprites of the jack-o'-lanterns breathe
  if (W.glows) W.glows.material.opacity = 0.45 + Math.sin(t * 7) * 0.04 + Math.sin(t * 13.7) * 0.03;
}

// ---------- the title screen: the bottom of Hollow Lane, looking up it, and his light far away ----------
function updateTitle(dt, t) {
  camera.position.set(1.2 + Math.sin(t * 0.1) * 0.15, 1.6, -11 + Math.sin(t * 0.07) * 0.2);
  camera.lookAt(0.4 + Math.sin(t * 0.06) * 0.8, 2.0 + Math.sin(t * 0.13) * 0.1, 40); camera.updateMatrixWorld(); camera.getWorldDirection(P.lookDir);
  if (!pm.active) { pm.setActive(true, null); pm.state = 'grab'; pm.place(0.5, 34, 0); }
  pm.R.root.position.set(0.5, 0, 34); pm.R.root.rotation.y = Math.PI; pm.R.neck.rotation.y = Math.sin(t * 0.4) * 0.3; pm.R.head.rotation.z = 0.2 + Math.sin(t * 0.5) * 0.1;
  pm.R.light.intensity = 5 + Math.sin(t * 13) * 0.3 + Math.random() * 0.4; pm.R.headMat.emissiveIntensity = 1.9;
  A.flame(new THREE.Vector3(0.5, 2.4, 34), 0.2, 0.3);
  U.black.value = Math.max(0, U.black.value - dt);
}

// ---------- the loop ----------
let last = performance.now(), slowAcc = 0.016, slowT = 0, frameN = 0;
const prof = { upd: 0, ren: 0, n: 0, calls: 0 };
function frame(now) {
  requestAnimationFrame(frame);
  const raw = Math.max(0, Math.min(0.1, (now - last) / 1000)); last = now;
  const dt = Math.min(raw, 0.05); T += dt;
  gov.tick(raw);
  if (mode === 'play') { slowAcc = slowAcc * 0.98 + raw * 0.02; if (gov.scale <= 0.56 && slowAcc > 0.026 && settings.quality !== 'low' && (slowT += raw) > 6) { slowT = 0; settings.quality = settings.quality === 'high' ? 'medium' : 'low'; store(SKEY, settings); $('sQuality').value = settings.quality; gov.reset(); applyQuality(); ui.toast('Graphics lowered to keep it smooth'); } else if (slowAcc < 0.022) slowT = 0; }
  frameN++; renderer.shadowMap.needsUpdate = settings.quality === 'high' || frameN % 3 === 0 || mode !== 'play';
  input.pollPad(raw);
  const _t0 = performance.now();
  if (mode === 'play') { U.black.value = Math.max(0, U.black.value - dt * 0.7); updatePlay(dt, T); }
  else if (mode === 'title' || mode === 'warn' || mode === 'how' || mode === 'settings') updateTitle(dt, T);
  else if (mode === 'intro') {
    const skip = input.down('KeyE', 'Space', 'Enter', 'Escape') || !!input.pad?.use || input.lmb;
    pm.update(dt, T, { x: 5, y: 0.1, z: 18.8, crouching: true, hidden: false, flash: false, flashDir: flashOn.dir, lit: false, moving: 0, zone: 'street' });
    pm.aware = 0;
    if (story.intro.update(dt, skip)) { store('trickortreat.seenIntro', 1); save.cp = 1; persist(); startFrom(1); }
  }
  else if (mode === 'dying') { if (deaths.update(dt)) showDead(); }
  else if (mode === 'endcut') updateEndcut(dt);
  else if (mode === 'card' || mode === 'ending' || mode === 'dead') U.black.value = 1;
  if (mode === 'play' || mode === 'dying') gore.update(dt);
  menuPad();
  updateWorld(dt, T);
  updateLights(dt, T);
  ui.tick(dt);
  U.time.value = T; U.fear.value = mode === 'play' ? fear : 0.05; U.bright.value = settings.bright; U.him.value = mode === 'play' && pm.state === 'chase' ? Math.max(0, fear - 0.5) : 0;
  if (mode !== 'dying' && mode !== 'endcut') { U.red.value = Math.max(0, U.red.value - dt); U.flash.value = Math.max(0, U.flash.value - dt * 2); }
  A.setListener(camera.position, P.lookDir);
  const zone = mode === 'play' ? P.zone : 'street';
  A.ambience(dt, { outdoors: indoors(zone) ? 0 : 1, fear, corn: mode === 'play' && inCorn(P.x, P.z) ? Math.min(1, P.moving / 2) : 0, crickets: pm.active && Math.hypot(pm.x - P.x, pm.z - P.z) < 20 ? 0 : 1, listener: camera.position });
  if (mode !== 'play' && mode !== 'intro' && mode !== 'title' && mode !== 'warn' && mode !== 'how' && mode !== 'settings') { A.walkie(0); }
  if (mode === 'title' || mode === 'warn' || mode === 'how' || mode === 'settings' || mode === 'paused' || mode === 'read') A.walkie(0);
  if (mode === 'paused' || mode === 'read' || mode === 'dead' || mode === 'ending') A.flame(null, 0);
  const _t1 = performance.now();
  renderer.info.reset();
  composer.render();
  prof.upd += _t1 - _t0; prof.ren += performance.now() - _t1; prof.n++; prof.calls += renderer.info.render.calls;
  input.endFrame();
}

// ---------- menus ----------
function menuPad() {
  const p = input.pad; if (!p || mode === 'play' || mode === 'dying' || mode === 'intro') return;
  const scr = SCREENS.map($).find((e) => !e.hidden); if (!scr) return;
  const items = [...scr.querySelectorAll('button:not([disabled]), input, select')].filter((e) => e.offsetParent);
  if (!items.length) return;
  let i = items.indexOf(document.activeElement);
  if (p.up) i = (i <= 0 ? items.length : i) - 1; if (p.downB) i = (i + 1) % items.length;
  if (p.up || p.downB) items[Math.max(0, i)].focus();
  const f = document.activeElement;
  if (f && f.type === 'range' && (p.mx > 0.6 || p.mx < -0.6)) { f.value = +f.value + Math.sign(p.mx) * (+f.step || 1); f.dispatchEvent(new Event('input')); }
  if (f && f.tagName === 'SELECT' && p.a) { f.selectedIndex = (f.selectedIndex + 1) % f.options.length; f.dispatchEvent(new Event('change')); return; }
  if (p.a && f && items.includes(f)) { if (f.type === 'checkbox') { f.checked = !f.checked; f.dispatchEvent(new Event('change')); } else f.click(); }
  if (p.b) { const back = scr.querySelector('[data-back]') || (mode === 'paused' && $('btnResume')) || (mode === 'read' && $('noteClose')); back?.click(); }
  if (p.pause && mode === 'paused') pause(false);
}
addEventListener('keydown', (e) => {
  if (mode === 'paused' && e.code === 'Escape' && !$('pause').hidden) pause(false);
  else if (mode === 'read' && (e.code === 'Escape' || e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space')) { e.preventDefault(); closeNote(); }
  else if (mode === 'dead' && (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE')) { e.preventDefault(); $('btnRetry').click(); }
  else if (e.code === 'Escape') { const scr = SCREENS.map($).find((s) => !s.hidden); scr?.querySelector('[data-back]')?.click(); }
});
function toTitle() { mode = 'title'; setHud(false); voice.cancel(); deaths.cleanup(); gore.clear(); pm.setActive(false); pm.stopSounds(); P.hidden = false; flashOn.on = false; U.black.value = 1; only('title'); refreshTitle(); A.tv(null, false); story.setup(Math.max(1, Math.min(5, save.cp || 1))); flashOn.on = false; for (const f of W.fixtures) if (f.tag === 'porch') f.on = f.x > 10 && Math.abs(f.z - 0.9) < 0.5; }
$('warnOk').onclick = () => { store('trickortreat.warned', 1); A.initAudio(); mode = 'title'; only('title'); refreshTitle(); };
$('btnNew').onclick = () => { if (save.cp > 0 && !confirmNew()) return; newGame(); };
const confirmNew = () => { const b = $('btnNew'); if (b.dataset.sure) { delete b.dataset.sure; return true; } b.dataset.sure = 1; b.textContent = 'Start over? (press again)'; setTimeout(() => { delete b.dataset.sure; b.textContent = 'New night'; }, 3000); return false; };
$('btnContinue').onclick = () => continueGame();
$('btnHow').onclick = () => only('how');
$('btnSettings').onclick = () => { settingsFrom = 'title'; only('settings'); };
$('btnResume').onclick = () => pause(false);
$('btnKnow').onclick = () => { knowList(); only('know'); };
$('btnPauseSettings').onclick = () => { settingsFrom = 'pause'; only('settings'); };
$('btnQuit').onclick = () => toTitle();
$('btnRetry').onclick = () => { if (mode === 'dead') startFrom(save.cp || 1); };
$('btnDeadTitle').onclick = () => toTitle();
$('btnEndTitle').onclick = () => toTitle();
$('btnReplayIntro').onclick = () => { mode = 'intro'; only(null); setHud(false); A.initAudio(); save = freshSave(); story.intro.start(); };
$('noteClose').onclick = () => closeNote();
let settingsFrom = 'title';
document.querySelectorAll('[data-back]').forEach((b) => (b.onclick = () => {
  const scr = b.closest('.screen').id;
  if (scr === 'know' || (scr === 'settings' && settingsFrom === 'pause')) { only('pause'); return; }
  only('title'); refreshTitle();
}));
function knowList() {
  const box = $('knowList'); box.innerHTML = '';
  const add = (h, items) => { if (!items.length) return; const e = document.createElement('div'); e.className = 'kgroup'; e.innerHTML = `<h3>${h}</h3>` + items.join(''); box.appendChild(e); };
  add('Candles', Object.keys(SOULS).map((k) => `<p>${story.S.souls[k] ? '<b>Out.</b> ' : '<span class="dim">Still burning.</span> '}${story.S.souls[k] ? SOULS[k] : '???'}</p>`));
  add('What you read', Object.keys(story.S.notes).map((k) => `<p><button class="link" data-note="${k}">${NOTES[k].title}</button></p>`));
  add('How you died', Object.keys(progress.deaths).map((k) => `<p><b>${DEATHS[k].title}.</b> ${DEATHS[k].learn}</p>`));
  box.querySelectorAll('[data-note]').forEach((b) => (b.onclick = () => { readFrom = 'paused'; mode = 'read'; $('noteTitle').textContent = NOTES[b.dataset.note].title; $('noteBody').innerHTML = NOTES[b.dataset.note].html; only('note'); }));
  $('knowCount').textContent = `Candles out: ${Object.keys(story.S.souls).length} of 3`;
}
function refreshTitle() {
  $('btnContinue').hidden = save.cp < 1;
  $('btnContinue').textContent = 'Continue';
  $('btnNew').textContent = 'New night';
  $('btnReplayIntro').hidden = !load('trickortreat.seenIntro');
  const e = Object.keys(progress.endings).map((k) => ENDINGS[k].title);
  $('titleProg').textContent = e.length ? `Endings: ${e.join(' · ')}` : progress.total ? `Died ${progress.total} times` : '';
}
function bindSetting(id, keyN, fmt, apply) {
  const el = $(id), out = el.parentElement.querySelector('output');
  if (el.type === 'checkbox') el.checked = !!settings[keyN]; else el.value = settings[keyN];
  const upd = () => { settings[keyN] = el.type === 'checkbox' ? el.checked : el.tagName === 'SELECT' ? el.value : +el.value; if (out) out.textContent = fmt ? fmt(settings[keyN]) : settings[keyN]; apply?.(settings[keyN]); store(SKEY, settings); };
  el.addEventListener('input', upd); el.addEventListener('change', upd); if (out) out.textContent = fmt ? fmt(settings[keyN]) : settings[keyN];
}
bindSetting('sVol', 'vol', (v) => Math.round(v * 100) + '%', (v) => A.setVolume(v));
bindSetting('sSens', 'sens', (v) => v.toFixed(2), (v) => { input.padSens = v; input.touchSens = v; });
bindSetting('sBright', 'bright', (v) => Math.round(v * 100) + '%');
bindSetting('sFov', 'fov', (v) => v + '°', (v) => { camera.fov = v; camera.updateProjectionMatrix(); });
bindSetting('sQuality', 'quality', null, () => { gov.reset(); applyQuality(); });
bindSetting('sGore', 'gore');
bindSetting('sVoices', 'voices', null, (v) => { voice.on = v; });
bindSetting('sSubs', 'subs');
bindSetting('sInvert', 'invert');
bindSetting('sPads', 'pads', null, (v) => { input.pads = v; });
bindSetting('sRumble', 'rumble', null, (v) => { input.rumbleOn = v; });
input.onKind = (m) => { document.body.dataset.input = m; $('touch').classList.toggle('on', m === 'touch' && mode === 'play'); };
if (COARSE) input.setMode('touch');
input.bindTouch($('touch'));
document.body.dataset.input = input.padMode ? 'pad' : input.touchMode ? 'touch' : 'keys';

// ---------- sync + achievements ----------
function syncSave() { try { window.GameSync?.syncNow?.(); } catch { /* fine */ } }
if (window.GameSync) {
  const pr = (gg) => gg(PKEY) || {};
  const en = (gg, k) => !!(pr(gg).endings || {})[k];
  GameSync.init({ game: 'trickortreat', idle: () => mode === 'title' || mode === 'warn', keys: [{ match: PKEY, mode: 'max' }], ach: [
    { id: 'first', name: 'Trick', desc: 'Die for the first time', test: (gg) => (pr(gg).total || 0) > 0 },
    { id: 'ways', name: 'Every way', desc: 'Die all five ways', test: (gg) => Object.keys(pr(gg).deaths || {}).length >= 5 },
    { id: 'candles', name: 'Lights out', desc: 'Put out all three candles in one night', test: (gg) => (pr(gg).souls || 0) >= 3 },
    { id: 'treat', name: 'Treat', desc: 'Bring Toby home, and set them free', test: (gg) => en(gg, 'treat') },
    { id: 'trick', name: 'Something lit', desc: 'Bring Toby home', test: (gg) => en(gg, 'trick') },
    { id: 'place', name: 'The candle', desc: 'Take his place', test: (gg) => en(gg, 'place') },
    { id: 'alone', name: 'Porch light', desc: 'Go home without him', test: (gg) => en(gg, 'alone') },
  ] });
  $('syncBtn').onclick = () => GameSync.open();
} else $('syncBtn').hidden = true;

// ---------- boot ----------
document.body.dataset.ready = '1';
story.setup(Math.max(1, Math.min(5, save.cp || 1)));
for (const f of W.fixtures) if (f.tag === 'porch') f.on = f.x > 10 && Math.abs(f.z - 0.9) < 0.5;
if (load('trickortreat.warned')) { mode = 'title'; only('title'); refreshTitle(); } else { mode = 'warn'; only('warn'); }
setHud(false); U.black.value = 1;
try { renderer.compile(scene, camera); } catch { /* compiles on first use instead */ }
document.addEventListener('pointerdown', () => A.initAudio(), { once: true });
requestAnimationFrame(frame);

if (TEST) window.__s = {
  P, W, story, g, camera, U, renderer, scene, progress, settings, deaths, gore, pm,
  get save() { return save; }, get mode() { return mode; }, set mode(v) { mode = v; },
  newGame, continueGame, startFrom, setQuality(q) { settings.quality = q; applyQuality(); }, setGore(v) { settings.gore = v; },
  tp(x, z, yaw = P.yaw, pitch = 0) { P.x = x; P.z = z; P.y = groundY(x, z, 3); P.yaw = yaw; P.pitch = pitch; P.vy = 0; P.zone = zoneOf(x, P.y, z); },
  use(id) { const it = W.inter.find((i) => i.id === id); if (it) use(it); return !!it; },
  focus() { return focus ? focus.label : null; },
  key(code, down = true) { if (down) { input.keys.add(code); input.pressed.add(code); } else input.keys.delete(code); },
  flash(on) { flashOn.on = on; },
  hideIn(id) { const h = W.hides.find((h) => h.id === id); if (h) enterHide(h); return !!h; },
  unhide() { if (P.hidden) exitHide(); },
  prof() { const r = { upd: +(prof.upd / prof.n).toFixed(2), ren: +(prof.ren / prof.n).toFixed(2), n: prof.n, calls: Math.round(prof.calls / prof.n) }; prof.upd = prof.ren = prof.n = prof.calls = 0; return r; },
  stats() { return { programs: renderer.info.programs.length, calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries, tex: renderer.info.memory.textures, merge: W.stats, children: scene.children.length, nodes: W.nodes.length, edges: W.nodes.reduce((a, n) => a + n.e.length, 0) / 2 }; },
};
void headMaterial; void pose; void M;
