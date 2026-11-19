// « Moi » — Partie 1 (65 s). Les SMS d'un contact « Moi » annoncent ce qui va arriver.
// Tout est construit en code : rendu BD (toon 3 tons + contour noir), POV fisheye, cartes et sous-titres en DOM/SVG.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const W = 1080, H = 1920;
const DURATION = 55.0;
const X0 = 200; // décalage du décor « rue » (le bus intérieur est à l'origine)

// ======================================================================
// Rendu de base
// ======================================================================
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#A9CDEB');
const camera = new THREE.PerspectiveCamera(98, W / H, 0.03, 90);
scene.add(camera);

function toonRamp() {
  const data = new Uint8Array([150, 150, 150, 255, 205, 205, 205, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
}
const RAMP = toonRamp();
const toon = (color, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap: RAMP, ...extra });

const outlineMats = new Map();
function outlineMat(thick) {
  if (outlineMats.has(thick)) return outlineMats.get(thick);
  const m = new THREE.MeshBasicMaterial({ color: 0x0b0c10, side: THREE.BackSide });
  m.onBeforeCompile = (s) => { s.vertexShader = s.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n transformed += normalize(normal) * ${thick.toFixed(4)};`); };
  outlineMats.set(thick, m); return m;
}
function ink(mesh, thick = 0.012) { const o = new THREE.Mesh(mesh.geometry, outlineMat(thick)); o.raycast = () => {}; mesh.add(o); return mesh; }
function part(geo, mat, { pos, rot, scale, thick = 0.012, cast = true, recv = true, parent } = {}) {
  const m = new THREE.Mesh(geo, mat);
  if (pos) m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  if (scale) m.scale.set(...scale);
  m.castShadow = cast; m.receiveShadow = recv;
  if (thick > 0) ink(m, thick);
  if (parent) parent.add(m);
  return m;
}
const grp = (parent, pos = [0, 0, 0], rot) => { const g = new THREE.Group(); g.position.set(...pos); if (rot) g.rotation.set(...rot); parent.add(g); return g; };

// ---------- lumières ----------
scene.add(new THREE.HemisphereLight('#ffffff', '#d9dce2', 1.25));
const sun = new THREE.DirectionalLight('#fff4e0', 1.9);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 0.5, far: 25 });
sun.shadow.bias = -0.0008;
scene.add(sun, sun.target);

// ======================================================================
// Textures dessinées en code
// ======================================================================
function canvasTex(w, h, draw, { repeat } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  if (draw) draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  t.userData.canvas = c;
  return t;
}
function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

function drawFacade(g, w, h, seed) {
  const r = rnd(seed);
  g.fillStyle = '#A9CDEB'; g.fillRect(0, 0, w, h);
  const bays = 9, bw = w / bays, top = h * 0.16, ground = h * 0.80;
  g.fillStyle = '#7F93AE'; g.beginPath(); g.moveTo(0, top + 40); g.lineTo(w, top + 40); g.lineTo(w, top - 50); g.lineTo(0, top - 50); g.fill();
  for (let i = 0; i < bays; i++) { const x = i * bw + bw * 0.3; g.fillStyle = '#E9E0CC'; g.fillRect(x, top - 95, bw * 0.4, 60); g.fillStyle = '#3B4757'; g.fillRect(x + 10, top - 85, bw * 0.4 - 20, 45); g.strokeStyle = '#111'; g.lineWidth = 5; g.strokeRect(x, top - 95, bw * 0.4, 60); }
  g.fillStyle = '#C9C2B3'; g.fillRect(w * 0.15, top - 140, 30, 60); g.fillRect(w * 0.62, top - 130, 30, 50);
  g.fillStyle = '#EADFC8'; g.fillRect(0, top + 40, w, ground - top - 40);
  g.strokeStyle = 'rgba(120,100,70,.28)'; g.lineWidth = 2;
  for (let y = top + 70; y < ground; y += 34) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  const floors = 5, fh = (ground - top - 60) / floors;
  for (let f = 0; f < floors; f++) {
    const y0 = top + 60 + f * fh;
    g.fillStyle = '#D9CCB0'; g.fillRect(0, y0 + fh - 14, w, 14);
    g.strokeStyle = '#111'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, y0 + fh - 14); g.lineTo(w, y0 + fh - 14); g.stroke();
    for (let i = 0; i < bays; i++) {
      const x = i * bw + bw * 0.22, ww = bw * 0.56, wy = y0 + fh * 0.14, wh = fh * 0.66;
      g.fillStyle = '#F3EEE3'; g.fillRect(x - 8, wy - 8, ww + 16, wh + 16);
      g.fillStyle = r() < 0.25 ? '#566A80' : '#36465A'; g.fillRect(x, wy, ww, wh);
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x + 6, wy + 6, ww * 0.35, wh * 0.5);
      g.strokeStyle = '#F3EEE3'; g.lineWidth = 6; g.beginPath(); g.moveTo(x + ww / 2, wy); g.lineTo(x + ww / 2, wy + wh); g.moveTo(x, wy + wh * 0.4); g.lineTo(x + ww, wy + wh * 0.4); g.stroke();
      g.strokeStyle = '#111'; g.lineWidth = 4; g.strokeRect(x - 8, wy - 8, ww + 16, wh + 16);
      if (f === 1 || f === 4 || r() < 0.3) {
        const by = wy + wh - 26; g.strokeStyle = '#15171c'; g.lineWidth = 3;
        g.strokeRect(x - 14, by, ww + 28, 30);
        for (let k = 0; k < 9; k++) { g.beginPath(); g.arc(x - 14 + (k + 0.5) * (ww + 28) / 9, by + 15, 8, 0, Math.PI * 2); g.stroke(); }
      }
    }
  }
  const shops = ['#2F5E46', '#7D2B2B', '#2F5E46', '#25374F'];
  const sw = w / 3;
  for (let s = 0; s < 3; s++) {
    const x = s * sw, col = shops[Math.floor(r() * shops.length)];
    g.fillStyle = col; g.fillRect(x + 12, ground, sw - 24, h - ground);
    g.fillStyle = '#C9D7DE'; g.fillRect(x + 40, ground + 70, sw - 80, h - ground - 70);
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + 50, ground + 80, (sw - 80) * 0.3, h - ground - 90);
    for (let k = 0; k < 10; k++) { g.fillStyle = k % 2 ? '#F2EFE8' : (col === '#7D2B2B' ? '#C0392B' : '#2F7A52'); g.fillRect(x + 20 + k * (sw - 40) / 10, ground + 6, (sw - 40) / 10, 46); }
    g.strokeStyle = '#111'; g.lineWidth = 5; g.strokeRect(x + 20, ground + 6, sw - 40, 46); g.strokeRect(x + 12, ground, sw - 24, h - ground);
  }
  g.strokeStyle = '#111'; g.lineWidth = 6; g.strokeRect(0, top + 40, w, h - top - 40);
}
const facadeTexes = [11, 47, 93].map((s) => canvasTex(2048, 1400, (g, w, h) => drawFacade(g, w, h, s)));
const facadeMats = facadeTexes.map((t) => new THREE.MeshBasicMaterial({ map: t }));

const treeTex = canvasTex(512, 768, (g) => {
  g.fillStyle = '#6B5A45'; g.fillRect(236, 420, 40, 348); g.strokeStyle = '#111'; g.lineWidth = 6; g.strokeRect(236, 420, 40, 348);
  const blobs = [[256, 250, 170], [150, 320, 120], [360, 320, 125], [256, 380, 130], [190, 170, 110], [330, 170, 110]];
  g.fillStyle = '#111'; for (const [x, y, r] of blobs) { g.beginPath(); g.arc(x, y, r + 7, 0, 7); g.fill(); }
  g.fillStyle = '#3F8A4A'; for (const [x, y, r] of blobs) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  g.fillStyle = '#5FA85E'; for (const [x, y, r] of blobs) { g.beginPath(); g.arc(x - r * 0.25, y - r * 0.3, r * 0.55, 0, 7); g.fill(); }
});
const treeMat = new THREE.MeshBasicMaterial({ map: treeTex, transparent: true, alphaTest: 0.5 });
const treeSpriteMat = new THREE.SpriteMaterial({ map: treeTex, alphaTest: 0.5 });

const fabricTex = canvasTex(256, 256, (g) => {
  g.fillStyle = '#3B63AE'; g.fillRect(0, 0, 256, 256);
  const r = rnd(5);
  for (let i = 0; i < 70; i++) { g.fillStyle = ['#4B73C0', '#E3B23C', '#1E3567', '#6FA0E0'][i % 4]; g.save(); g.translate(r() * 256, r() * 256); g.rotate(r() * 3); g.fillRect(-7, -2.5, 14, 5); g.restore(); }
}, { repeat: [2, 2] });
const floorTex = canvasTex(512, 512, (g) => {
  g.fillStyle = '#8E9196'; g.fillRect(0, 0, 512, 512);
  const r = rnd(9); for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? '#7C7F85' : '#A3A6AB'; g.fillRect(r() * 512, r() * 512, 3, 3); }
}, { repeat: [3, 16] });
const adTex = canvasTex(2048, 128, (g, w, h) => {
  g.fillStyle = '#DDE3EA'; g.fillRect(0, 0, w, h);
  const ads = [['#F2C230', 'LIGNE 0 · CIRCULE TOUTE LA NUIT'], ['#E5664F', 'PENSEZ À VALIDER'], ['#7CC4F2', 'ARRÊT DEMANDÉ']];
  let x = 20; for (const [c, t] of ads) { g.fillStyle = c; g.fillRect(x, 18, 640, 92); g.strokeStyle = '#111'; g.lineWidth = 5; g.strokeRect(x, 18, 640, 92); g.fillStyle = '#111'; g.font = '800 42px Inter, sans-serif'; g.fillText(t, x + 24, 80); x += 680; }
});
const sidewalkTex = canvasTex(512, 512, (g) => {
  g.fillStyle = '#D8D2C4'; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = '#B5AE9F'; g.lineWidth = 4;
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 512); g.stroke(); g.beginPath(); g.moveTo(0, i * 128); g.lineTo(512, i * 128); g.stroke(); }
  const r = rnd(21); for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(120,110,95,.25)'; g.beginPath(); g.arc(r() * 512, r() * 512, 2 + r() * 3, 0, 7); g.fill(); }
}, { repeat: [3, 40] });
const asphaltTex = canvasTex(512, 512, (g) => {
  g.fillStyle = '#6E7076'; g.fillRect(0, 0, 512, 512);
  const r = rnd(33); for (let i = 0; i < 1200; i++) { g.fillStyle = r() < 0.5 ? '#63656B' : '#7B7E84'; g.fillRect(r() * 512, r() * 512, 3, 3); }
}, { repeat: [6, 40] });

// ======================================================================
// Personnages (corps construits en primitives, visages BD)
// ======================================================================
const BLACK = toon('#16171B'), WHITE = toon('#FBFBF8'), TEAR = new THREE.MeshBasicMaterial({ color: '#8FD3FF' });

function person(o) {
  const s = o.scale ?? 1, hs = o.headScale ?? 1;
  const M = { skin: toon(o.skin), top: toon(o.top), top2: toon(o.top2 ?? o.top), bottom: toon(o.bottom), shoe: toon(o.shoe ?? '#2A2A2E'), hair: toon(o.hair ?? '#2A1E18') };
  const root = new THREE.Group(); root.scale.setScalar(s); scene.add(root);
  const P = { root, M };
  P.pelvis = grp(root, [0, 0.95, 0]);
  part(new THREE.CapsuleGeometry(0.15, 0.06, 6, 14), M.bottom, { pos: [0, 0.02, 0], rot: [0, 0, Math.PI / 2], scale: [1, 1.15, 0.8], thick: 0.012, parent: P.pelvis });
  P.thigh = []; P.knee = [];
  for (const sd of [-1, 1]) {
    const th = grp(P.pelvis, [sd * 0.1, -0.02, 0]);
    part(new THREE.CapsuleGeometry(0.075, 0.34, 6, 12), M.bottom, { pos: [0, -0.22, 0], thick: 0.012, parent: th });
    const kn = grp(th, [0, -0.45, 0]);
    part(new THREE.CapsuleGeometry(0.068, 0.34, 6, 12), M.bottom, { pos: [0, -0.21, 0], thick: 0.012, parent: kn });
    part(new RoundedBoxGeometry(0.13, 0.08, 0.26, 2, 0.03), M.shoe, { pos: [0, -0.45, 0.05], thick: 0.01, parent: kn });
    P.thigh.push(th); P.knee.push(kn);
  }
  P.torso = grp(P.pelvis, [0, 0.05, 0]);
  part(new THREE.CapsuleGeometry(0.19, 0.32, 8, 18), M.top, { pos: [0, 0.27, 0], scale: [1, 1, 0.75], thick: 0.013, parent: P.torso });
  if (o.coat) part(new THREE.CylinderGeometry(0.2, 0.27, 0.36, 18), M.top, { pos: [0, -0.1, 0], thick: 0.012, parent: P.torso });
  if (o.zip) part(new THREE.BoxGeometry(0.012, 0.42, 0.012), M.top2, { pos: [0, 0.27, 0.142], thick: 0.003, parent: P.torso });
  part(new THREE.CylinderGeometry(0.07, 0.08, 0.1, 12), M.skin, { pos: [0, 0.58, 0], thick: 0.008, parent: P.torso });
  P.shoulder = []; P.elbow = []; P.armMeshes = [];
  for (const sd of [-1, 1]) {
    const sh = grp(P.torso, [sd * 0.23, 0.5, 0]);
    const up = part(new THREE.CapsuleGeometry(0.06, 0.24, 6, 12), M.top, { pos: [0, -0.16, 0], thick: 0.011, parent: sh });
    const el = grp(sh, [0, -0.33, 0]);
    const fo = part(new THREE.CapsuleGeometry(0.055, 0.22, 6, 12), M.top, { pos: [0, -0.14, 0], thick: 0.011, parent: el });
    const ha = part(new THREE.SphereGeometry(0.058, 12, 12), M.skin, { pos: [0, -0.3, 0], thick: 0.008, parent: el });
    sh.rotation.z = sd * -0.08;
    P.shoulder.push(sh); P.elbow.push(el); P.armMeshes.push([up, fo, ha]);
  }
  // tête
  P.head = grp(P.torso, [0, 0.62 + 0.15 * hs, 0]);
  const hr = 0.15 * hs;
  part(new THREE.SphereGeometry(hr, 28, 22), M.skin, { scale: [1, 1.06, 1], thick: 0.012, parent: P.head });
  part(new THREE.SphereGeometry(hr * 0.15, 12, 12), M.skin, { pos: [0, -hr * 0.1, hr * 0.98], thick: 0.005, parent: P.head });
  for (const sd of [-1, 1]) part(new THREE.SphereGeometry(hr * 0.2, 10, 10), M.skin, { pos: [sd * hr, -hr * 0.05, 0], thick: 0.006, parent: P.head });
  P.eyes = []; P.pupils = []; P.brows = []; P.tears = [];
  for (const sd of [-1, 1]) {
    const e = part(new THREE.SphereGeometry(hr * 0.34, 20, 16), WHITE, { pos: [sd * hr * 0.4, hr * 0.28, hr * 0.78], scale: [1, 1.15, 0.6], thick: 0.007, parent: P.head });
    const p = part(new THREE.SphereGeometry(hr * 0.13, 12, 12), BLACK, { pos: [0, -hr * 0.02, hr * 0.28], thick: 0, parent: e });
    const b = part(new THREE.BoxGeometry(hr * 0.46, hr * 0.08, hr * 0.08), M.hair, { pos: [sd * hr * 0.42, hr * 0.72, hr * 0.82], thick: 0.004, parent: P.head });
    const tr = part(new THREE.SphereGeometry(hr * 0.09, 10, 10), TEAR, { pos: [sd * hr * 0.42, 0, hr * 0.86], scale: [1, 1.4, 1], thick: 0.003, cast: false, parent: P.head });
    tr.visible = false;
    P.eyes.push(e); P.pupils.push(p); P.brows.push(b); P.tears.push(tr);
  }
  P.mouth = part(new RoundedBoxGeometry(hr * 0.38, hr * 0.09, hr * 0.12, 2, hr * 0.04), toon('#5A2A24'), { pos: [0, -hr * 0.45, hr * 0.9], thick: 0.004, parent: P.head });
  // cheveux
  const capGeo = new THREE.SphereGeometry(hr * 1.07, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.52);
  if (o.hairStyle !== 'bald') {
    part(capGeo, M.hair, { pos: [0, hr * 0.06, -hr * 0.06], rot: [-0.3, 0, 0], thick: 0.01, parent: P.head });
    part(new THREE.SphereGeometry(hr * 0.95, 20, 14), M.hair, { pos: [0, 0, -hr * 0.18], scale: [1.05, 1, 0.9], thick: 0.01, parent: P.head });
  }
  if (o.hairStyle === 'puffs') for (const sd of [-1, 1]) part(new THREE.SphereGeometry(hr * 0.5, 16, 12), M.hair, { pos: [sd * hr * 0.75, hr * 0.85, -hr * 0.1], thick: 0.01, parent: P.head });
  if (o.hairStyle === 'bun') part(new THREE.SphereGeometry(hr * 0.42, 16, 12), M.hair, { pos: [0, hr * 0.7, -hr * 0.75], thick: 0.01, parent: P.head });
  if (o.hairStyle === 'beanie') part(new THREE.SphereGeometry(hr * 1.12, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.45), toon(o.beanie ?? '#C0392B'), { pos: [0, hr * 0.1, 0], rot: [-0.15, 0, 0], thick: 0.01, parent: P.head });
  if (o.glasses) for (const sd of [-1, 1]) part(new THREE.TorusGeometry(hr * 0.36, hr * 0.05, 8, 20), BLACK, { pos: [sd * hr * 0.4, hr * 0.28, hr * 0.98], thick: 0, parent: P.head });
  if (o.lock) { // mèche qui couvre l'oreille droite (côté -x du personnage)
    P.lock = grp(P.head, [-hr * 0.95, hr * 0.45, hr * 0.05]);
    part(new THREE.CapsuleGeometry(hr * 0.22, hr * 0.75, 6, 10), M.hair, { pos: [0, -hr * 0.55, 0], thick: 0.008, parent: P.lock });
  }
  if (o.earbud) { // écouteur droit dans l'oreille droite
    P.earbud = part(new THREE.CapsuleGeometry(hr * 0.09, hr * 0.22, 4, 8), WHITE, { pos: [-hr * 1.12, -hr * 0.12, hr * 0.06], rot: [0.2, 0, 0.1], thick: 0.004, parent: P.head });
  }
  P.neutral = {};
  return P;
}

// pose : 0 = debout, 1 = assis
function setSit(P, k, armsLap = true) {
  for (let i = 0; i < 2; i++) { P.thigh[i].rotation.x = -Math.PI / 2 * k; P.knee[i].rotation.x = Math.PI / 2 * k; }
  if (armsLap) for (let i = 0; i < 2; i++) { P.shoulder[i].rotation.x = -0.35 * k; P.elbow[i].rotation.x = -1.15 * k; }
}
function walk(P, phase, amt) {
  for (let i = 0; i < 2; i++) { const a = Math.sin(phase + i * Math.PI) * 0.45 * amt; P.thigh[i].rotation.x = a; P.knee[i].rotation.x = Math.max(0, -a) * 0.9; P.shoulder[i].rotation.x = -a * 0.6; }
}
// visage : expression et parole
function face(P, { brow = 0, squint = 0, talk = 0, tears = -1, t = 0 } = {}) {
  for (let i = 0; i < 2; i++) {
    const sd = i === 0 ? -1 : 1;
    P.brows[i].rotation.z = -sd * brow * 0.45;
    P.brows[i].position.y = P.head.children[0].geometry.parameters.radius * (0.72 + brow * 0.08 - squint * 0.12);
    P.eyes[i].scale.set(1, 1.15 * (1 - squint * 0.5), 0.6);
    if (tears >= 0) { P.tears[i].visible = true; const ph = ((t * 0.55 + i * 0.37) % 1); P.tears[i].position.y = P.head.children[0].geometry.parameters.radius * (0.05 - ph * 0.6); P.tears[i].scale.setScalar(0.6 + 0.6 * Math.min(1, tears)); }
    else P.tears[i].visible = false;
  }
  P.mouth.scale.set(1 - talk * 0.2, 1 + talk * 3.0, 1);
}

// faire regarder une partie (tête) vers un point, mélangé avec sa pose neutre
const _q0 = new THREE.Quaternion(), _q1 = new THREE.Quaternion();
function aim(obj, target, amt, base = [0, 0, 0]) {
  obj.rotation.set(...base); _q0.copy(obj.quaternion);
  obj.lookAt(target); _q1.copy(obj.quaternion);
  obj.quaternion.slerpQuaternions(_q0, _q1, Math.max(0, Math.min(1, amt)));
}
// cylindre tendu entre deux points (bras vers une main tenue)
const _up = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3();
function stretch(mesh, a, b) {
  _d.subVectors(b, a); const len = _d.length();
  mesh.position.copy(a).addScaledVector(_d, 0.5);
  mesh.quaternion.setFromUnitVectors(_up, _d.normalize());
  mesh.scale.set(1, len, 1);
}

// ======================================================================
// L'homme en imperméable (modèle validé au test)
// ======================================================================
const SKIN_M = toon('#E9BC98'), COAT = toon('#C8B184'), COAT_D = toon('#A8915F'), TROUS = toon('#4A3B30'), HAT = toon('#5B4A3A');
const man = new THREE.Group(); scene.add(man);
const manBody = new THREE.Group(); man.add(manBody);
const manNonHead = [];
for (const s of [-1, 1]) {
  manNonHead.push(part(new THREE.CapsuleGeometry(0.075, 0.62, 6, 12), TROUS, { pos: [s * 0.1, 0.42, 0], thick: 0.012, parent: manBody }));
  manNonHead.push(part(new RoundedBoxGeometry(0.13, 0.08, 0.26, 2, 0.03), BLACK, { pos: [s * 0.1, 0.04, 0.05], thick: 0.01, parent: manBody }));
}
manNonHead.push(part(new THREE.CylinderGeometry(0.21, 0.3, 0.62, 18), COAT, { pos: [0, 0.82, 0], thick: 0.014, parent: manBody }));
const torso = new THREE.Group(); torso.position.set(0, 1.12, 0); manBody.add(torso);
manNonHead.push(part(new THREE.CapsuleGeometry(0.2, 0.36, 8, 18), COAT, { pos: [0, 0.18, 0], scale: [1, 1, 0.78], thick: 0.014, parent: torso }));
manNonHead.push(part(new THREE.BoxGeometry(0.42, 0.06, 0.34), COAT_D, { pos: [0, -0.02, 0], thick: 0.01, parent: torso }));
part(new THREE.ConeGeometry(0.2, 0.16, 18, 1, true), COAT_D, { pos: [0, 0.5, 0], rot: [Math.PI, 0, 0], thick: 0.01, parent: torso });
for (const y of [0.1, 0.25]) for (const s of [-1, 1]) manNonHead.push(part(new THREE.SphereGeometry(0.014, 8, 8), BLACK, { pos: [s * 0.06, y, 0.165], thick: 0, parent: torso }));
const armR = new THREE.Group(); armR.position.set(-0.24, 0.42, 0); torso.add(armR);
manNonHead.push(part(new THREE.CapsuleGeometry(0.065, 0.62, 6, 12), COAT, { pos: [0, 0.34, 0], thick: 0.012, parent: armR }));
manNonHead.push(part(new THREE.SphereGeometry(0.065, 12, 12), SKIN_M, { pos: [0, 0.72, 0], thick: 0.01, parent: armR }));
armR.rotation.set(0, 0, -0.32);
const armL = new THREE.Group(); armL.position.set(0.24, 0.42, 0); torso.add(armL);
manNonHead.push(part(new THREE.CapsuleGeometry(0.065, 0.56, 6, 12), COAT, { pos: [0, -0.32, 0], thick: 0.012, parent: armL }));
manNonHead.push(part(new THREE.SphereGeometry(0.062, 12, 12), SKIN_M, { pos: [0, -0.66, 0], thick: 0.01, parent: armL }));
armL.rotation.set(0, 0, 0.12);
const head = new THREE.Group(); head.position.set(0, 0.66, 0); torso.add(head);
part(new THREE.SphereGeometry(0.15, 28, 22), SKIN_M, { scale: [1, 1.08, 1], thick: 0.012, parent: head });
part(new THREE.SphereGeometry(0.022, 12, 12), toon('#E2AE8C'), { pos: [0, -0.015, 0.15], thick: 0.005, parent: head });
for (const s of [-1, 1]) part(new THREE.SphereGeometry(0.03, 10, 10), SKIN_M, { pos: [s * 0.15, 0, 0], thick: 0.006, parent: head });
const eyes = [];
for (const s of [-1, 1]) {
  const e = part(new THREE.SphereGeometry(0.05, 20, 16), WHITE, { pos: [s * 0.058, 0.05, 0.118], scale: [1, 1.12, 0.6], thick: 0.008, parent: head });
  eyes.push(part(new THREE.SphereGeometry(0.019, 12, 12), BLACK, { pos: [0, 0, 0.042], thick: 0, parent: e }));
  part(new THREE.BoxGeometry(0.07, 0.012, 0.012), toon('#4A3A2E'), { pos: [s * 0.06, 0.125, 0.13], rot: [0, 0, s * -0.12], thick: 0.004, parent: head });
}
const mouth = part(new RoundedBoxGeometry(0.06, 0.014, 0.02, 2, 0.006), toon('#5A2A24'), { pos: [0, -0.075, 0.138], thick: 0.004, parent: head });
const hat = new THREE.Group(); hat.position.set(0, 0.12, 0); hat.rotation.x = -0.08; head.add(hat);
part(new THREE.CylinderGeometry(0.24, 0.24, 0.022, 28), HAT, { thick: 0.01, parent: hat });
part(new THREE.CylinderGeometry(0.135, 0.15, 0.13, 24), HAT, { pos: [0, 0.07, 0], thick: 0.01, parent: hat });
part(new THREE.CylinderGeometry(0.152, 0.152, 0.03, 24), BLACK, { pos: [0, 0.025, 0], thick: 0, parent: hat });

// ======================================================================
// Le bus (intérieur)
// ======================================================================
const BUS_W = 2.5, BUS_HALF = BUS_W / 2, CEIL = 2.3, Z_FRONT = -12, Z_REAR = 4.6, BUS_LEN = Z_REAR - Z_FRONT, BUS_MID = (Z_REAR + Z_FRONT) / 2;
const DOOR_Z0 = 2.0, DOOR_Z1 = 3.2;
const bus = new THREE.Group(); scene.add(bus);
const BM = {
  floor: toon('#ffffff', { map: floorTex }), wallLow: toon('#C9D1DB'), wallHigh: toon('#E6EAEF'), ceil: new THREE.MeshBasicMaterial({ color: '#E3E7EC' }),
  pillar: toon('#8A919C'), yellow: toon('#F2C230'), seatFrame: toon('#7C8594'), fabric: toon('#ffffff', { map: fabricTex }),
  red: toon('#D23B33'), dark: toon('#22262D'), ad: toon('#ffffff', { map: adTex }), light: new THREE.MeshBasicMaterial({ color: '#FFFDF4' }),
  glass: new THREE.MeshBasicMaterial({ color: '#A9C3D8', transparent: true, opacity: 0.28, depthWrite: false }),
};
part(new THREE.PlaneGeometry(BUS_W, BUS_LEN), BM.floor, { pos: [0, 0, BUS_MID], rot: [-Math.PI / 2, 0, 0], thick: 0, cast: false, parent: bus });
part(new THREE.PlaneGeometry(BUS_W, BUS_LEN), BM.ceil, { pos: [0, CEIL, BUS_MID], rot: [Math.PI / 2, 0, 0], thick: 0, cast: false, parent: bus });
// fond du bus, avec une vraie lunette arrière (on voit le bus qui suit)
for (const [w, h, x, y] of [[BUS_W, 1.025, 0, 0.5125], [BUS_W, 0.425, 0, 2.0875], [0.3, 0.85, -1.1, 1.45], [0.3, 0.85, 1.1, 1.45]]) part(new THREE.BoxGeometry(w, h, 0.08), BM.wallLow, { pos: [x, y, Z_REAR], thick: 0.01, cast: false, parent: bus });
const busRearGlass = part(new THREE.PlaneGeometry(1.9, 0.85), new THREE.MeshBasicMaterial({ color: '#A9C3D8', transparent: true, opacity: 0.16, depthWrite: false }), { pos: [0, 1.45, Z_REAR - 0.05], rot: [0, Math.PI, 0], thick: 0, cast: false, parent: bus });
const wallSeg = (x, z0, z1, side) => {
  const len = z1 - z0, zc = (z0 + z1) / 2;
  part(new THREE.BoxGeometry(0.06, 0.95, len), BM.wallLow, { pos: [x, 0.475, zc], thick: 0.01, cast: false, parent: bus });
  part(new THREE.BoxGeometry(0.09, 0.07, len), BM.pillar, { pos: [x - side * 0.02, 0.95, zc], thick: 0.008, parent: bus });
};
for (const side of [-1, 1]) {
  const x = side * BUS_HALF;
  if (side < 0) wallSeg(x, Z_FRONT, Z_REAR, side);
  else { wallSeg(x, Z_FRONT, DOOR_Z0, side); wallSeg(x, DOOR_Z1, Z_REAR, side); }
  part(new THREE.BoxGeometry(0.06, 0.4, BUS_LEN), BM.wallHigh, { pos: [x, CEIL - 0.2, BUS_MID], thick: 0.01, cast: false, parent: bus });
  part(new THREE.PlaneGeometry(BUS_LEN, 0.26), BM.ad, { pos: [x - side * 0.035, CEIL - 0.2, BUS_MID], rot: [0, -side * Math.PI / 2, 0], thick: 0, cast: false, parent: bus });
  for (let z = 1.4; z > Z_FRONT; z -= 1.25) part(new THREE.BoxGeometry(0.1, 1.0, 0.09), BM.pillar, { pos: [x - side * 0.02, 1.42, z], thick: 0.008, parent: bus });
  for (const z of side > 0 ? [DOOR_Z0, DOOR_Z1, 4.2] : [2.65, 3.9]) part(new THREE.BoxGeometry(0.1, side > 0 ? 1.9 : 1.0, 0.09), BM.pillar, { pos: [x - side * 0.02, side > 0 ? 0.95 : 1.42, z], thick: 0.008, parent: bus });
  part(new THREE.CylinderGeometry(0.018, 0.018, BUS_LEN, 10), BM.yellow, { pos: [side * 0.36, 2.02, BUS_MID], rot: [Math.PI / 2, 0, 0], thick: 0.006, parent: bus });
}
// porte arrière (deux vantaux vitrés qui coulissent)
const doorLeaves = [];
for (const k of [0, 1]) {
  const leaf = grp(bus, [BUS_HALF + 0.02, 0, DOOR_Z0 + 0.3 + k * 0.6]);
  part(new THREE.BoxGeometry(0.04, 1.9, 0.6), BM.dark, { pos: [0, 0.95, 0], scale: [1, 1, 1], thick: 0.006, parent: leaf }).visible = false;
  for (const [y, h] of [[0.03, 0.06], [1.87, 0.06], [0.95, 0.05]]) part(new THREE.BoxGeometry(0.05, h, 0.6), BM.dark, { pos: [0, y, 0], thick: 0.005, parent: leaf });
  for (const z of [-0.28, 0.28]) part(new THREE.BoxGeometry(0.05, 1.9, 0.05), BM.dark, { pos: [0, 0.95, z], thick: 0.005, parent: leaf });
  part(new THREE.PlaneGeometry(0.56, 1.8), BM.glass, { pos: [0, 0.95, 0], rot: [0, Math.PI / 2, 0], thick: 0, cast: false, parent: leaf });
  doorLeaves.push(leaf);
}
part(new THREE.BoxGeometry(0.3, 0.06, 0.08), BM.red, { pos: [BUS_HALF - 0.1, 1.9, DOOR_Z0 - 0.08], thick: 0.005, parent: bus }); // voyant de porte
for (let z = 0.5; z > Z_FRONT + 1; z -= 2.2) part(new THREE.BoxGeometry(0.5, 0.03, 1.2), BM.light, { pos: [0, CEIL - 0.02, z], thick: 0.006, cast: false, parent: bus });
part(new THREE.BoxGeometry(0.5, 0.03, 1.2), BM.light, { pos: [0, CEIL - 0.02, 2.7], thick: 0.006, cast: false, parent: bus });
for (const [x, z] of [[0.33, -2.6], [-0.33, -3.9], [0.33, -5.4], [-0.33, -6.9], [0.33, -8.4], [0.33, 1.6], [-0.33, 2.6]]) {
  part(new THREE.CylinderGeometry(0.02, 0.02, CEIL, 10), BM.yellow, { pos: [x, CEIL / 2, z], thick: 0.006, parent: bus });
  part(new RoundedBoxGeometry(0.06, 0.09, 0.05, 2, 0.012), BM.red, { pos: [x, 1.25, z + 0.03], thick: 0.006, parent: bus });
}
part(new THREE.PlaneGeometry(BUS_W, 1.3), new THREE.MeshBasicMaterial({ color: '#CFE3F3' }), { pos: [0, 1.45, Z_FRONT + 0.1], thick: 0, cast: false, parent: bus });
part(new THREE.BoxGeometry(BUS_W, 0.8, 0.3), BM.dark, { pos: [0, 0.4, Z_FRONT + 0.2], thick: 0.01, parent: bus });
// afficheur LED « prochain arrêt »
const ledTex = canvasTex(1024, 220);
const ledBox = part(new RoundedBoxGeometry(1.2, 0.27, 0.08, 2, 0.02), BM.dark, { pos: [0, 2.08, -3.2], thick: 0.008, parent: bus });
const ledScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 0.22), new THREE.MeshBasicMaterial({ map: ledTex })); ledScreen.position.set(0, 0, 0.045); ledBox.add(ledScreen);
function drawLed(t) {
  const c = ledTex.userData.canvas, g = c.getContext('2d');
  g.fillStyle = '#0B0B0D'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#FF9A2E'; g.font = '700 44px "Courier New", monospace';
  g.fillText('PROCHAIN ARRÊT', 40, 66);
  g.font = '800 96px "Courier New", monospace';
  g.fillText('RUE DES LILAS', 40, 180);
  g.fillStyle = 'rgba(0,0,0,.55)'; for (let y = 0; y < c.height; y += 6) g.fillRect(0, y, c.width, 2); for (let x = 0; x < c.width; x += 6) g.fillRect(x, 0, 2, c.height);
  ledTex.needsUpdate = true;
}
function seat(x, z) {
  const g = grp(bus, [x, 0, z]);
  part(new RoundedBoxGeometry(0.42, 0.13, 0.44, 3, 0.04), BM.fabric, { pos: [0, 0.47, 0], thick: 0.01, parent: g });
  part(new RoundedBoxGeometry(0.42, 0.62, 0.09, 3, 0.04), BM.fabric, { pos: [0, 0.82, 0.21], rot: [-0.08, 0, 0], thick: 0.01, parent: g });
  part(new RoundedBoxGeometry(0.43, 0.08, 0.11, 2, 0.03), BM.seatFrame, { pos: [0, 1.15, 0.24], thick: 0.008, parent: g });
  part(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 8), BM.seatFrame, { pos: [0, 0.2, -0.05], thick: 0.005, parent: g });
}
for (let z = -1.0; z > -9; z -= 0.9) for (const x of [0.92, 0.48, -0.48, -0.92]) seat(x, z);
for (const x of [0.92, 0.48, -0.48, -0.92]) seat(x, 0.05);
for (const z of [0.95, 1.85]) for (const x of [-0.48, -0.92]) seat(x, z);
for (const x of [0.92, 0.48, -0.48, -0.92]) seat(x, 3.7);

// ---------- extérieur qui défile derrière les vitres ----------
const street = new THREE.Group(); scene.add(street);
const FACADE_LEN = 16, SPEED = 5.5;
const facades = [];
for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(FACADE_LEN, FACADE_LEN * 1400 / 2048), facadeMats[(i + (side > 0 ? 0 : 1)) % 3]);
  m.rotation.y = -side * Math.PI / 2; m.userData = { side, i }; street.add(m); facades.push(m);
}
const trees = [];
for (const side of [-1, 1]) for (let i = 0; i < 6; i++) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 4.8), treeMat); m.rotation.y = -side * Math.PI / 2; m.userData = { side, i }; street.add(m); trees.push(m);
}
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 80), new THREE.MeshBasicMaterial({ color: '#B9B4A8' }));
ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.9, -10); street.add(ground);
// la boulangerie, la dame aux pommes et le pigeon (qui repassent à l'identique)
const bakeryTex = canvasTex(1200, 800);
const bakeries = [].map((tc) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), new THREE.MeshBasicMaterial({ map: bakeryTex })); m.rotation.y = -Math.PI / 2; m.userData.tc = tc; street.add(m); return m; });
function drawBakery(tau) {
  const c = bakeryTex.userData.canvas, g = c.getContext('2d'), w = c.width, h = c.height;
  g.fillStyle = '#EADFC8'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#2F6B4A'; g.fillRect(60, 210, w - 120, 520); g.strokeStyle = '#111'; g.lineWidth = 7; g.strokeRect(60, 210, w - 120, 520);
  g.fillStyle = '#F3E6B5'; g.font = '800 78px Georgia, serif'; g.fillText('BOULANGERIE', 300, 300);
  g.fillStyle = '#CFE0E6'; g.fillRect(120, 340, 560, 330); g.strokeRect(120, 340, 560, 330);
  for (let i = 0; i < 5; i++) { g.fillStyle = '#C8893E'; g.beginPath(); g.ellipse(190 + i * 105, 560, 44, 22, -0.3, 0, 7); g.fill(); g.stroke(); }
  g.fillStyle = '#1E3B2C'; g.fillRect(760, 360, 220, 370); g.strokeRect(760, 360, 220, 370);
  for (let k = 0; k < 12; k++) { g.fillStyle = k % 2 ? '#F2EFE8' : '#2F7A52'; g.fillRect(40 + k * (w - 80) / 12, 130, (w - 80) / 12, 80); }
  g.strokeRect(40, 130, w - 80, 80);
  g.fillStyle = '#B7B0A0'; g.fillRect(0, 730, w, 70);
  // pigeon qui picore
  const peck = Math.max(0, Math.sin(tau * 9)) * 18;
  g.fillStyle = '#8D93A0'; g.beginPath(); g.ellipse(250, 745, 46, 26, 0, 0, 7); g.fill(); g.stroke();
  g.beginPath(); g.arc(292, 712 + peck, 16, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#E09A2E'; g.beginPath(); g.moveTo(306, 712 + peck); g.lineTo(322, 718 + peck); g.lineTo(306, 722 + peck); g.fill();
  // la dame et son panier
  const lx = 1010;
  g.fillStyle = '#6C3E7A'; g.beginPath(); g.moveTo(lx - 70, 760); g.lineTo(lx - 50, 520); g.lineTo(lx + 50, 520); g.lineTo(lx + 70, 760); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#F0C9A8'; g.beginPath(); g.arc(lx, 480, 44, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#C9C9C9'; g.beginPath(); g.arc(lx, 448, 40, Math.PI, 0); g.fill(); g.stroke(); g.beginPath(); g.arc(lx, 420, 20, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#111'; g.beginPath(); g.arc(lx - 14, 482, 5, 0, 7); g.arc(lx + 14, 482, 5, 0, 7); g.fill();
  g.fillStyle = '#A0703C'; g.fillRect(lx - 140, 600, 90, 60); g.strokeRect(lx - 140, 600, 90, 60);
  // pommes qui tombent et rebondissent (même chorégraphie à chaque passage)
  for (let k = 0; k < 5; k++) {
    const t0 = -0.7 + k * 0.09, u = tau - t0;
    let x = lx - 100 - k * 14, y = 600;
    if (u > 0) { x -= u * 120 * (1 + k * 0.25); const fall = 600 + 900 * u * u; y = fall < 750 ? fall : 750 - Math.abs(Math.sin((u - 0.4) * 9)) * 40 * Math.exp(-u * 2); }
    g.fillStyle = '#D23B33'; g.beginPath(); g.arc(x, y, 17, 0, 7); g.fill(); g.stroke();
  }
  bakeryTex.needsUpdate = true;
}
// distance parcourue par le bus (il freine et s'arrête avant la porte)
// vitesse du bus : pile sec à 1,2 s, repart tout seul, accélère, s'arrête au choc (37,2 s)
const sp01 = (t, a, b) => { const x = Math.max(0, Math.min(1, (t - a) / (b - a))); return x * x * (3 - 2 * x); };
function busSpeed(t) {
  if (t < 1.0) return SPEED;
  if (t < 1.55) return SPEED * (1 - (t - 1.0) / 0.55);
  if (t < 3.0) return 0;
  if (t < 31.2) return SPEED * (sp01(t, 3.0, 4.6) + 0.8 * sp01(t, 9.9, 13.5) + 0.45 * sp01(t, 21.4, 28));
  return 0;
}
const OFF = [0]; for (let i = 1; i <= 65 * 120; i++) OFF.push(OFF[i - 1] + busSpeed((i - 0.5) / 120) / 120);
const busOffset = (t) => OFF[Math.max(0, Math.min(OFF.length - 1, Math.round(t * 120)))];
function updateStreet(t) {
  const off = busOffset(t);
  for (const f of facades) { const { side, i } = f.userData; const span = FACADE_LEN * 4; f.position.set(side * 7.5, 3.2, ((i * FACADE_LEN + off) % span) - span + FACADE_LEN * 1.5); }
  for (const tr of trees) { const { side, i } = tr.userData; const span = 6 * 5.5; tr.position.set(side * 4.2, 1.6, ((i * 5.5 + off + (side > 0 ? 0 : 2.7)) % span) - span + 9); }
  let tau = null;
  for (const b of bakeries) {
    const z = -1 + SPEED * (t - b.userData.tc);
    b.visible = Math.abs(t - b.userData.tc) < 1.1; b.position.set(4.0, 1.1, z);
    if (Math.abs(t - b.userData.tc) < 2.4) tau = t - b.userData.tc;
  }
  if (tau !== null) drawBakery(tau);
}

// ======================================================================
// La rue (décor extérieur, à X0)
// ======================================================================
const ext = grp(scene, [X0, 0, 0]);
const EM = { walk: new THREE.MeshToonMaterial({ map: sidewalkTex, gradientMap: RAMP }), road: new THREE.MeshToonMaterial({ map: asphaltTex, gradientMap: RAMP }), curb: toon('#E4E2DC'), line: new THREE.MeshBasicMaterial({ color: '#F4F4F0' }), bollard: toon('#5E3B2A'), glass: new THREE.MeshBasicMaterial({ color: '#BFD6E6', transparent: true, opacity: 0.32, depthWrite: false }), roof: toon('#3C4654'), bench: toon('#7C8594') };
part(new THREE.BoxGeometry(4, 0.15, 120), EM.walk, { pos: [-2, 0.075, 0], thick: 0, cast: false, parent: ext });
part(new THREE.BoxGeometry(9, 0.02, 120), EM.road, { pos: [4.5, 0.0, 0], thick: 0, cast: false, parent: ext });
part(new THREE.BoxGeometry(2.5, 0.15, 120), EM.walk, { pos: [10.25, 0.075, 0], thick: 0, cast: false, parent: ext });
part(new THREE.BoxGeometry(0.22, 0.17, 120), EM.curb, { pos: [0.0, 0.085, 0], thick: 0.01, cast: false, parent: ext });
for (let z = -58; z < 60; z += 4) part(new THREE.PlaneGeometry(0.15, 2.2), EM.line, { pos: [4.5, 0.02, z], rot: [-Math.PI / 2, 0, 0], thick: 0, cast: false, parent: ext });
for (let z = -40; z < 40; z += 1.6) if (Math.abs(z - 3.6) > 2.2) { part(new THREE.CylinderGeometry(0.06, 0.07, 0.75, 10), EM.bollard, { pos: [-0.3, 0.52, z], thick: 0.008, parent: ext }); part(new THREE.SphereGeometry(0.065, 10, 8), EM.bollard, { pos: [-0.3, 0.9, z], thick: 0.006, parent: ext }); }
for (let z = -42; z < 42; z += 7.5) { const sp = new THREE.Sprite(treeSpriteMat); sp.scale.set(3.6, 5.4, 1); sp.position.set(-0.9, 2.85, z + 2.5); ext.add(sp); }
for (let z = -42; z < 42; z += 7.5) { const sp = new THREE.Sprite(treeSpriteMat); sp.scale.set(3.6, 5.4, 1); sp.position.set(9.6, 2.85, z); ext.add(sp); }
for (let i = -4; i < 4; i++) {
  const a = new THREE.Mesh(new THREE.PlaneGeometry(FACADE_LEN, FACADE_LEN * 1400 / 2048), facadeMats[(i + 8) % 3]); a.rotation.y = Math.PI / 2; a.position.set(-4, 5.6, i * FACADE_LEN + 8); ext.add(a);
  const b = new THREE.Mesh(new THREE.PlaneGeometry(FACADE_LEN, FACADE_LEN * 1400 / 2048), facadeMats[(i + 9) % 3]); b.rotation.y = -Math.PI / 2; b.position.set(11.5, 5.6, i * FACADE_LEN); ext.add(b);
}
// abribus
const shelter = grp(ext, [-2.4, 0.15, 3.6]);
part(new THREE.BoxGeometry(1.4, 0.08, 3.2), EM.roof, { pos: [0, 2.3, 0], thick: 0.01, parent: shelter });
for (const z of [-1.55, 1.55]) part(new THREE.BoxGeometry(0.06, 2.3, 0.06), EM.roof, { pos: [-0.65, 1.15, z], thick: 0.006, parent: shelter });
part(new THREE.PlaneGeometry(3.1, 2.1), EM.glass, { pos: [-0.66, 1.15, 0], rot: [0, Math.PI / 2, 0], thick: 0, cast: false, parent: shelter });
part(new RoundedBoxGeometry(0.45, 0.06, 2.2, 2, 0.02), EM.bench, { pos: [-0.35, 0.5, 0], thick: 0.006, parent: shelter });
const stopSignTex = canvasTex(256, 256, (g) => { g.fillStyle = '#1F8A7A'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#fff'; g.font = '900 170px Inter, sans-serif'; g.fillText('0', 80, 190); g.strokeStyle = '#111'; g.lineWidth = 12; g.strokeRect(6, 6, 244, 244); });
part(new THREE.CylinderGeometry(0.035, 0.035, 2.6, 8), EM.roof, { pos: [0.55, 1.3, 1.9], thick: 0.005, parent: shelter });
part(new THREE.PlaneGeometry(0.45, 0.45), new THREE.MeshBasicMaterial({ map: stopSignTex, side: THREE.DoubleSide }), { pos: [0.55, 2.45, 1.9], rot: [0, Math.PI / 2, 0], thick: 0, parent: shelter });

ext.children.forEach((o) => { if (o.isSprite && Math.abs(o.position.x + 0.9) < 0.01 && o.position.z > -3 && o.position.z < 40) o.visible = false; });
// le bus vu de dehors (même ligne, même numéro)
const XB = 1.6; // voie du bus
const extBus = grp(ext, [XB, 0, 4]);
const XBM = { body: toon('#F1F2EE'), band: toon('#1F8A7A'), win: toon('#2C3E52'), wheel: toon('#1C1D21'), rearGlass: new THREE.MeshBasicMaterial({ color: '#9FBBD3', transparent: true, opacity: 0.16, depthWrite: false }) };
part(new RoundedBoxGeometry(2.5, 2.75, 12, 4, 0.25), XBM.body, { pos: [0, 0.35 + 1.375, 0], thick: 0.03, parent: extBus });
for (const sd of [-1, 1]) {
  part(new THREE.BoxGeometry(0.02, 0.32, 11.6), XBM.band, { pos: [sd * 1.26, 0.75, 0], thick: 0, parent: extBus });
  part(new THREE.BoxGeometry(0.02, 0.95, 10.8), XBM.win, { pos: [sd * 1.262, 1.85, -0.2], thick: 0.008, parent: extBus });
}
part(new THREE.BoxGeometry(2.2, 1.2, 0.02), XBM.win, { pos: [0, 1.85, 6.01], thick: 0.008, parent: extBus });
const busLedTex = canvasTex(512, 96, (g) => { g.fillStyle = '#0B0B0D'; g.fillRect(0, 0, 512, 96); g.fillStyle = '#FF9A2E'; g.font = '800 64px "Courier New", monospace'; g.fillText('0  TERMINUS', 26, 70); });
part(new THREE.PlaneGeometry(1.8, 0.32), new THREE.MeshBasicMaterial({ map: busLedTex }), { pos: [0, 2.72, 6.02], thick: 0, parent: extBus });
part(new THREE.PlaneGeometry(1.9, 0.95), new THREE.MeshBasicMaterial({ color: '#25364A' }), { pos: [0, 1.95, -6.005], rot: [0, Math.PI, 0], thick: 0, parent: extBus }); // fond vitre arrière
const rearGlass = part(new THREE.PlaneGeometry(1.9, 0.95), XBM.rearGlass, { pos: [0, 1.95, -6.2], rot: [0, Math.PI, 0], thick: 0, cast: false, parent: extBus });
for (const [x, y, w, h] of [[0, 2.45, 2.0, 0.06], [0, 1.45, 2.0, 0.06], [-0.98, 1.95, 0.06, 1.0], [0.98, 1.95, 0.06, 1.0]]) part(new THREE.BoxGeometry(w, h, 0.22), XBM.wheel, { pos: [x, y, -6.1], thick: 0, parent: extBus });
// les deux mains de l'homme plaquées contre la vitre arrière
const glassPalms = [-1, 1].map((sd) => part(new THREE.SphereGeometry(0.075, 14, 12), SKIN_M, { pos: [0.15 + sd * 0.34, 1.98, -6.16], scale: [1, 1.25, 0.35], thick: 0.008, parent: extBus }));
const rearNumTex = canvasTex(256, 128, (g) => { g.fillStyle = '#0B0B0D'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#FF9A2E'; g.font = '800 96px "Courier New", monospace'; g.fillText('0', 96, 100); });
part(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshBasicMaterial({ map: rearNumTex }), { pos: [0, 2.7, -6.01], rot: [0, Math.PI, 0], thick: 0, parent: extBus });
for (const z of [-4, 4]) for (const sd of [-1, 1]) part(new THREE.CylinderGeometry(0.46, 0.46, 0.3, 20), XBM.wheel, { pos: [sd * 1.15, 0.46, z], rot: [0, 0, Math.PI / 2], thick: 0.01, parent: extBus });
// portes côté trottoir (-x) : fond sombre + vantaux qui coulissent
const extDoors = {};
for (const [name, zc] of [['mid', -1.0], ['rear', -4.0]]) {
  part(new THREE.BoxGeometry(0.02, 2.2, 1.2), toon('#1E2733'), { pos: [-1.265, 1.45, zc], thick: 0.006, parent: extBus });
  const leaves = [];
  for (const k of [-1, 1]) {
    const lf = grp(extBus, [-1.29, 0, zc + k * 0.3]);
    part(new THREE.BoxGeometry(0.03, 2.2, 0.6), toon('#3A4C5E'), { pos: [0, 1.45, 0], thick: 0.006, parent: lf });
    part(new THREE.BoxGeometry(0.035, 1.6, 0.42), toon('#8FB0C8'), { pos: [0, 1.6, 0], thick: 0.004, parent: lf });
    leaves.push(lf);
  }
  extDoors[name] = { zc, leaves };
}
function setExtDoor(name, open) { const d = extDoors[name]; d.leaves.forEach((lf, i) => { lf.position.z = d.zc + (i ? 1 : -1) * (0.3 + 0.62 * open); }); }
// après le choc, le bus est arrêté plus loin, puis repart (57 s)
// après le choc, le bus continue de rouler tout seul : lentement, puis il accélère (48 s)
function extBusZ(t) { const u = Math.max(0, t - 31.6); return 12 + 1.6 * u + (t > 48 ? 0.75 * (t - 48) ** 2 : 0); }

// ======================================================================
// Outils de timeline
// ======================================================================
man.visible = false;
glassPalms.forEach((m) => { m.visible = false; });
const ease = (x) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
const span = (t, a, b) => ease((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const lerpV = (a, b, k) => [0, 1, 2].map((j) => lerp(a[j], b[j], k));
const angLerp = (a, b, k) => a + ((((b - a) % 360) + 540) % 360 - 180) * k;
const CUT = 54.0; // coupe noire
const BRAKE = 1.0, SMASH = 5.0, CRASH = 31.2;

// ======================================================================
// Décor ajouté dans le bus : vitre de Sam, branche, éclats, poste de conduite, pare-brise
// ======================================================================
const glassTex = canvasTex(256, 256, (g) => {
  g.fillStyle = 'rgba(190,214,230,0.16)'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 14; g.beginPath(); g.moveTo(40, 230); g.lineTo(150, 20); g.stroke();
  g.lineWidth = 6; g.beginPath(); g.moveTo(90, 240); g.lineTo(190, 50); g.stroke();
});
const glassMat = new THREE.MeshBasicMaterial({ map: glassTex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
const sideGlass = part(new THREE.PlaneGeometry(1.15, 0.92), glassMat, { pos: [BUS_HALF - 0.04, 1.43, 0.05], rot: [0, -Math.PI / 2, 0], thick: 0, cast: false, parent: bus });
// morceaux restés dans le cadre après le choc
const brokenEdge = grp(bus, [BUS_HALF - 0.04, 1.43, 0.05], [0, -Math.PI / 2, 0]);
{
  const R = rnd(4);
  const edgeMat = new THREE.MeshBasicMaterial({ color: '#CFE6F5', transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false });
  for (let i = 0; i < 14; i++) {
    const side = i % 4, u = R() - 0.5, sz = 0.035 + R() * 0.06;
    const [x, y] = side === 0 ? [u * 1.1, 0.46] : side === 1 ? [u * 1.1, -0.46] : side === 2 ? [-0.57, u * 0.9] : [0.57, u * 0.9];
    const dir = side === 0 ? [0, -1] : side === 1 ? [0, 1] : side === 2 ? [1, 0] : [-1, 0];
    const shp = new THREE.Shape([new THREE.Vector2(x - dir[1] * sz * 0.6, y + dir[0] * sz * 0.6), new THREE.Vector2(x + dir[1] * sz * 0.6, y - dir[0] * sz * 0.6), new THREE.Vector2(x + dir[0] * sz * 1.6, y + dir[1] * sz * 1.6)]);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(shp), edgeMat); brokenEdge.add(m);
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: '#0b0c10' })));
  }
}
brokenEdge.visible = false;
// éclats de verre qui volent dans le bus
const shardGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.03, -0.02, 0), new THREE.Vector3(0.035, -0.015, 0), new THREE.Vector3(0, 0.04, 0)]);
const shardMat = new THREE.MeshBasicMaterial({ color: '#E2F1FB', side: THREE.DoubleSide });
const shardLine = new THREE.LineBasicMaterial({ color: '#2B3A48' });
const shards = [];
{
  const R = rnd(77);
  for (let i = 0; i < 80; i++) {
    const m = new THREE.Mesh(shardGeo, shardMat); m.scale.setScalar(0.6 + R() * 1.8);
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(shardGeo), shardLine));
    m.userData = { p: [BUS_HALF - 0.06, 1.05 + R() * 0.8, -0.45 + R() * 1.0], v: [-(1.0 + R() * 3.4), 0.3 + R() * 2.6, (R() - 0.5) * 2.4], w: [R() * 24, R() * 24, R() * 24] };
    bus.add(m); shards.push(m);
  }
}
function updateShards(t) {
  const u = t - SMASH;
  for (const m of shards) {
    m.visible = u > 0; if (u <= 0) continue;
    const { p, v, w } = m.userData;
    let k = u, y = p[1] + v[1] * u - 4.9 * u * u;
    if (y < 0.015) { k = (v[1] + Math.sqrt(v[1] * v[1] + 4 * 4.9 * (p[1] - 0.015))) / (2 * 4.9); y = 0.015; }
    m.position.set(Math.max(-1.15, p[0] + v[0] * k), y, p[2] + v[2] * k);
    m.rotation.set(w[0] * k, w[1] * k, y <= 0.015 ? Math.PI / 2 : w[2] * k);
    if (y <= 0.015) m.rotation.x = -Math.PI / 2;
  }
}
// la branche qui traverse la vitre
const branch = grp(bus, [3, 1.42, 0.05]);
{
  const bark = toon('#5A4330'), leaf = toon('#4E9A4F'), leaf2 = toon('#3B7A3E');
  const b = part(new THREE.CylinderGeometry(0.035, 0.09, 3.2, 10), bark, { pos: [1.6, 0, 0], rot: [0, 0, Math.PI / 2], thick: 0.012, parent: branch });
  part(new THREE.CylinderGeometry(0.02, 0.04, 0.8, 8), bark, { pos: [0.7, 0.18, 0.12], rot: [0.3, 0, Math.PI / 2 - 0.5], thick: 0.01, parent: branch });
  const R = rnd(12);
  for (let i = 0; i < 9; i++) part(new THREE.IcosahedronGeometry(0.16 + R() * 0.14, 0), i % 2 ? leaf : leaf2, { pos: [0.1 + R() * 1.6, (R() - 0.3) * 0.35, (R() - 0.5) * 0.4], rot: [R() * 3, R() * 3, 0], thick: 0.012, parent: branch });
  b.castShadow = false;
}
// poste de conduite vide
seat(-0.72, -10.9);
const wheelTilt = grp(bus, [-0.72, 1.0, -11.42], [-0.5, 0, 0]);
const wheelSpin = grp(wheelTilt);
part(new THREE.TorusGeometry(0.21, 0.026, 10, 32), BM.dark, { thick: 0.008, parent: wheelSpin });
part(new THREE.BoxGeometry(0.4, 0.035, 0.03), BM.dark, { thick: 0.005, parent: wheelSpin });
part(new THREE.BoxGeometry(0.035, 0.2, 0.03), BM.dark, { pos: [0, -0.1, 0], thick: 0.005, parent: wheelSpin });
part(new THREE.CylinderGeometry(0.035, 0.035, 0.55, 8), BM.dark, { pos: [0, 0, -0.28], rot: [Math.PI / 2, 0, 0], thick: 0.006, parent: wheelTilt });
// pare-brise : la route qui défile
const roadTex = canvasTex(1024, 512);
function drawRoad(off, t) {
  const c = roadTex.userData.canvas, g = c.getContext('2d'), w = c.width, h = c.height, hz = h * 0.42;
  g.fillStyle = '#A9CDEB'; g.fillRect(0, 0, w, hz);
  g.fillStyle = '#B9B4A8'; g.fillRect(0, hz, w, h - hz);
  g.fillStyle = '#6E7076'; g.beginPath(); g.moveTo(w * 0.47, hz); g.lineTo(w * 0.53, hz); g.lineTo(w * 1.1, h); g.lineTo(-w * 0.1, h); g.fill();
  for (let i = 0; i < 9; i++) { // pointillés en perspective
    const z = ((i - (off / 3) % 1) + 9) % 9 + 0.2, y0 = hz + (h - hz) * (1 / z), y1 = hz + (h - hz) * (1 / (z + 0.45));
    g.fillStyle = '#F4F4F0'; g.beginPath(); g.moveTo(w / 2 - 14 / z, y0); g.lineTo(w / 2 + 14 / z, y0); g.lineTo(w / 2 + 14 / (z + 0.45), y1); g.lineTo(w / 2 - 14 / (z + 0.45), y1); g.fill();
  }
  for (let i = 0; i < 6; i++) { // immeubles de chaque côté
    const z = ((i - (off / 9) % 1) + 6) % 6 + 0.6, s = 1 / z;
    for (const sd of [-1, 1]) { g.fillStyle = i % 2 ? '#EADFC8' : '#D9CCB0'; const x = w / 2 + sd * (w * 0.62 * s + 30); g.fillRect(x - (sd < 0 ? 260 * s : 0), hz - 420 * s, 260 * s, 420 * s + (h - hz) * s * 0.4); g.strokeStyle = '#111'; g.lineWidth = 3; g.strokeRect(x - (sd < 0 ? 260 * s : 0), hz - 420 * s, 260 * s, 420 * s + (h - hz) * s * 0.4); }
  }
  roadTex.needsUpdate = true;
}
part(new THREE.PlaneGeometry(BUS_W - 0.1, 1.3), new THREE.MeshBasicMaterial({ map: roadTex }), { pos: [0, 1.45, Z_FRONT + 0.12], thick: 0, cast: false, parent: bus });

// ======================================================================
// Le bus qui suit (avec Sam dedans)
// ======================================================================
const glowTex = canvasTex(256, 256, (g) => { const r = g.createRadialGradient(128, 128, 0, 128, 128, 128); r.addColorStop(0, 'rgba(255,252,235,1)'); r.addColorStop(0.25, 'rgba(255,245,210,.8)'); r.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 256); });
const glowMat = () => new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
const follower = grp(scene, [0, -0.5, 20], [0, Math.PI, 0]);
{
  part(new RoundedBoxGeometry(2.5, 2.75, 11, 4, 0.25), XBM.body, { pos: [0, 1.725, -0.5], thick: 0.03, parent: follower });
  for (const [w, h, d, x, y] of [[2.5, 0.87, 1.0, 0, 0.785], [2.5, 0.62, 1.0, 0, 2.79], [0.14, 1.26, 1.0, -1.18, 1.85], [0.14, 1.26, 1.0, 1.18, 1.85]]) part(new THREE.BoxGeometry(w, h, d), XBM.body, { pos: [x, y, 5.5], thick: 0.02, parent: follower });
  part(new THREE.PlaneGeometry(2.3, 1.3), new THREE.MeshBasicMaterial({ color: '#141B24' }), { pos: [0, 1.85, 5.02], thick: 0, parent: follower });
  part(new THREE.PlaneGeometry(2.22, 1.26), new THREE.MeshBasicMaterial({ color: '#9FBBD3', transparent: true, opacity: 0.2, depthWrite: false }), { pos: [0, 1.85, 6.01], thick: 0, cast: false, parent: follower });
  for (const sd of [-1, 1]) part(new THREE.BoxGeometry(0.02, 0.32, 10.6), XBM.band, { pos: [sd * 1.26, 0.75, -0.3], thick: 0, parent: follower });
  part(new THREE.BoxGeometry(2.5, 0.2, 0.06), XBM.band, { pos: [0, 0.75, 6.0], thick: 0.008, parent: follower });
  part(new THREE.PlaneGeometry(1.8, 0.32), new THREE.MeshBasicMaterial({ map: busLedTex }), { pos: [0, 2.72, 6.02], thick: 0, parent: follower });
  for (const sd of [-1, 1]) part(new THREE.CircleGeometry(0.15, 20), new THREE.MeshBasicMaterial({ color: '#FFF4D0' }), { pos: [sd * 0.88, 0.62, 6.02], thick: 0, parent: follower });
}
{ const cab = new THREE.PointLight('#DDEBFF', 2.5, 3.5, 1.5); cab.position.set(0, 2.3, 5.6); follower.add(cab); }
const headGlows = [-1, 1].map((sd) => { const s = new THREE.Sprite(glowMat()); s.position.set(sd * 0.88, 0.62, 6.15); follower.add(s); return s; });
const bigGlow = new THREE.Sprite(glowMat()); bigGlow.position.set(0, 1.0, 6.3); follower.add(bigGlow);
const rearLight = new THREE.PointLight('#FFF4DA', 0, 0, 1.2); rearLight.position.set(0, 1.4, Z_REAR + 0.6); scene.add(rearLight);
function gapAt(t) { return t < 21.4 ? 8.5 : t < CRASH ? 8.5 * (1 - ((t - 21.4) / (CRASH - 21.4)) ** 2) : 0; }

// l'autre Sam, debout derrière le pare-brise, téléphone à la main
const SAM_LOOK = { skin: '#E4B795', top: '#8F949C', bottom: '#2D3D5A', hair: '#3A2A1E', hairStyle: 'short' };
const twin = person(SAM_LOOK);
follower.add(twin.root); twin.root.position.set(0.35, 0.23, 5.45);
const twinPhone = part(new RoundedBoxGeometry(0.075, 0.15, 0.012, 2, 0.008), toon('#1A1C21'), { pos: [0.02, -0.33, 0.05], rot: [0.2, 0, 0], thick: 0.004, parent: twin.elbow[0] });
const twinScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.135), new THREE.MeshBasicMaterial({ color: '#CFE7FF' })); twinScreen.position.z = 0.007; twinPhone.add(twinScreen);
part(new THREE.TorusGeometry(0.06, 0.012, 8, 20), toon('#C8323C'), { pos: [0, -0.24, 0], rot: [Math.PI / 2, 0, 0], thick: 0.003, parent: twin.elbow[0] });

// ======================================================================
// Distribution dans le bus
// ======================================================================
const INES_LOOK = { scale: 0.8, headScale: 1.22, skin: '#9C6644', top: '#E8604C', top2: '#B8412F', bottom: '#3B4F7A', shoe: '#F2F2F2', hair: '#2A1E18', hairStyle: 'puffs', zip: true };
const ines = person(INES_LOOK);
const inesReach = part(new THREE.CapsuleGeometry(0.055, 1, 6, 12), ines.M.top, { thick: 0.011, parent: scene }); inesReach.visible = false;
const COLD = toon('#8E9AA6');
const inesReachHand = part(new THREE.SphereGeometry(0.05, 12, 12), ines.M.skin, { thick: 0.008, parent: scene }); inesReachHand.visible = false;
// la vraie Inès, restée dans le bus, collée à la vitre arrière
const inesReal = person(INES_LOOK);
extBus.add(inesReal.root); inesReal.root.position.set(0.12, 0.62, -5.84); inesReal.root.rotation.y = Math.PI;
const realPalms = [-1, 1].map((sd) => part(new THREE.SphereGeometry(0.062, 14, 12), inesReal.M.skin, { pos: [0.12 + sd * 0.3, 2.0, -6.16], scale: [1, 1.25, 0.35], thick: 0.008, parent: extBus }));

const PASSENGER_LOOKS = [
  { skin: '#F0C8A8', top: '#4C6B4F', bottom: '#2B2F38', hair: '#5A3B22', hairStyle: 'bun' },
  { skin: '#7B4F35', top: '#C48A2E', bottom: '#34384A', hair: '#151515', hairStyle: 'short' },
  { skin: '#E6B896', top: '#6D5A8E', bottom: '#2E3447', hair: '#B9B4AA', hairStyle: 'short', glasses: true },
  { skin: '#D7A37D', top: '#2E5E8C', bottom: '#3A3A3A', hair: '#20180F', hairStyle: 'beanie', beanie: '#C0392B' },
  { skin: '#F2D2B6', top: '#8E3B46', bottom: '#2B2F38', hair: '#D8B25A', hairStyle: 'bun' },
  { skin: '#5E3A26', top: '#3D7A72', bottom: '#2D2D33', hair: '#111111', hairStyle: 'short' },
  { skin: '#EBC2A0', top: '#7A6A55', bottom: '#30343F', hair: '#6B4A2D', hairStyle: 'beanie', beanie: '#2F5E46' },
  { skin: '#C88E68', top: '#4A4F66', bottom: '#282B33', hair: '#2A2A2A', hairStyle: 'short', glasses: true },
];
const SEATED = [[0.92, -1.0], [-0.48, -1.0], [-0.92, -1.9], [0.48, -2.8], [-0.48, -3.7], [0.92, -4.6], [-0.92, -5.5], [0.48, -6.4]];
const STAND = [[0.12, -4.0, 0.2], [-0.1, -5.0, 1.4], [0.1, -6.0, -0.5], [-0.05, -7.0, 2.4]];
const BACK = [[-0.48, 0.95], [-0.92, 0.95], [-0.48, 1.85], [-0.92, 1.85], [-0.92, 3.7], [0.92, 3.7]];
const passengers = [];
let li = 0;
for (const [x, z] of [...SEATED, ...BACK]) {
  const P = person({ ...PASSENGER_LOOKS[li++ % PASSENGER_LOOKS.length], scale: 0.97 + (li % 3) * 0.02 });
  const holder = grp(scene); holder.add(P.root);
  P.root.position.set(x, 0.58 - 0.95 * P.root.scale.x, z + 0.06); P.root.rotation.y = Math.PI; setSit(P, 1);
  passengers.push({ P, holder, kind: z > 0 ? 'back' : 'seat', x, z, d: (li % 5) * 0.035 });
}
for (const [x, z, r] of STAND) {
  const P = person({ ...PASSENGER_LOOKS[li++ % PASSENGER_LOOKS.length], scale: 1.0 });
  const holder = grp(scene, [x, 0, z]); holder.add(P.root);
  P.root.rotation.y = r; setSit(P, 0, false); P.shoulder[0].rotation.set(0, 0, Math.PI * 0.9);
  passengers.push({ P, holder, kind: 'stand', x, z, r, d: (li % 3) * 0.05 });
}
const shouter = passengers.find((p) => p.kind === 'back');
// sacs qui volent au freinage
const bags = [[0.48, 0.85, -1.0, '#C0392B'], [-0.48, 0.75, -3.7, '#2F5E46'], [0.12, 1.0, -2.6, '#E3B23C'], [0.92, 0.8, -4.6, '#6D5A8E']].map(([x, y, z, c], i) => {
  const m = part(new RoundedBoxGeometry(0.32, 0.26, 0.16, 2, 0.04), toon(c), { thick: 0.01, parent: bus }); m.userData = { x, y, z, i }; return m;
});
function updateBags(t) {
  for (const m of bags) {
    const { x, y, z, i } = m.userData, u = Math.max(0, t - BRAKE - 0.05 - i * 0.03);
    const fly = Math.min(u, 0.7), vz = 3.4 + i * 0.5, vy = 1.2;
    const yy = Math.max(0.13, y + vy * fly - 4.9 * fly * fly);
    m.position.set(x, yy, z - vz * fly * (1 - fly * 0.5));
    m.rotation.set(-fly * 7, i, fly * 2);
  }
}

// ---------- POV : cuisses, mains, téléphone ----------
const pov = new THREE.Group(); camera.add(pov);
const SKIN = toon('#E4B795'), SLEEVE = toon('#8F949C'), JEANS = toon('#2D3D5A'), BRACELET = toon('#C8323C'), PHONE = toon('#1A1C21');
const thighs = [-1, 1].map((s) => part(new THREE.CapsuleGeometry(0.085, 0.42, 6, 14), JEANS, { pos: [0.92 + s * 0.1, 0.6, -0.22], rot: [Math.PI / 2, 0, 0], thick: 0.012, parent: scene }));
const phoneCanvas = document.createElement('canvas'); phoneCanvas.width = 360; phoneCanvas.height = 740;
const phoneTex = new THREE.CanvasTexture(phoneCanvas); phoneTex.colorSpace = THREE.SRGBColorSpace;
const hand = new THREE.Group(); pov.add(hand);
const phone = part(new RoundedBoxGeometry(0.075, 0.155, 0.009, 3, 0.008), PHONE, { thick: 0.004, parent: hand });
const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.068, 0.142), new THREE.MeshBasicMaterial({ map: phoneTex })); screenMesh.position.z = 0.0052; phone.add(screenMesh);
part(new RoundedBoxGeometry(0.085, 0.09, 0.03, 3, 0.012), SKIN, { pos: [0.005, -0.045, -0.018], thick: 0.004, parent: hand });
for (let k = 0; k < 3; k++) part(new THREE.CapsuleGeometry(0.0095, 0.03, 4, 8), SKIN, { pos: [-0.042, -0.01 - k * 0.026, -0.004], rot: [0, 0, 0.2], thick: 0.003, parent: hand });
const thumb = part(new THREE.CapsuleGeometry(0.011, 0.045, 4, 8), SKIN, { pos: [0.044, -0.03, 0.0], rot: [0, 0, -0.5], thick: 0.003, parent: hand });
const wrist = grp(hand, [0.02, -0.1, -0.03], [0.9, 0, -0.35]);
part(new THREE.CapsuleGeometry(0.03, 0.06, 4, 10), SKIN, { pos: [0, -0.02, 0], thick: 0.004, parent: wrist });
part(new THREE.TorusGeometry(0.033, 0.007, 8, 24), BRACELET, { pos: [0, -0.045, 0], rot: [Math.PI / 2, 0, 0], thick: 0.003, parent: wrist });
part(new THREE.CylinderGeometry(0.045, 0.06, 0.4, 14), SLEEVE, { pos: [0, -0.25, 0], thick: 0.005, parent: wrist });
// main gauche de Sam (barre du siège, puis la main d'Inès) : bras tendu en coordonnées monde
const samArm = part(new THREE.CylinderGeometry(0.05, 0.062, 1, 14), SLEEVE, { thick: 0.006, parent: scene }); samArm.visible = false;
const samHand = part(new THREE.SphereGeometry(0.052, 14, 12), SKIN, { scale: [1, 0.8, 1.15], thick: 0.006, parent: scene }); samHand.visible = false;

const HAND_POSES = {
  low: { p: [0.14, -0.2, -0.36], r: [-0.35, -0.25, -0.12] },
  pulled: { p: [0.26, -0.3, -0.26], r: [-0.4, -0.6, -0.2] },
  look: { p: [0.05, -0.135, -0.235], r: [-0.12, -0.1, -0.04] },
  read: { p: [0.07, -0.12, -0.27], r: [-0.2, -0.15, -0.06] },
};
const HAND_KEYS = [[0, 'low'], [0.9, 'low'], [1.1, 'pulled'], [1.9, 'pulled'], [2.2, 'look'], [3.5, 'look'], [3.8, 'low'], [4.2, 'low'], [4.4, 'pulled'], [6.2, 'pulled'], [6.5, 'low'],
  [7.8, 'low'], [8.1, 'pulled'], [9.6, 'pulled'], [9.9, 'low'], [50.0, 'low'], [50.4, 'read'], [55, 'read']];

// ======================================================================
// Caméra : [t, décor, position, lacet, tangage, { cut, roll, fov, track }]
// ======================================================================
const B0 = [0.9, 1.36, 0.05], BI = [1.14, 1.38, 0.14], DUCK = [0.72, 1.02, -0.25];
const AF = [0.05, 1.72, -2.2], AD = [0.1, 1.7, 0.9], WIN = [0.62, 1.5, 0.05];
const SW = [-1.2, 1.75, 0.1], LIE = [-1.0, 0.27, 0.95];
const CAM = [
  [0, 'bus', B0, 17, -4], [0.95, 'bus', B0, 17, -4],
  [1.12, 'bus', [0.86, 1.3, -0.34], 20, -7, { roll: -6 }], [1.7, 'bus', [0.88, 1.32, -0.14], 18, -6, { roll: 3 }], [2.05, 'bus', B0, 14, -6],
  [2.3, 'bus', B0, 5, -30], [3.5, 'bus', B0, 5, -30], [3.85, 'bus', B0, 12, -6],
  [4.3, 'bus', [0.82, 1.22, -0.1], -100, 8], [4.8, 'bus', DUCK, -118, 26], [6.15, 'bus', DUCK, -116, 24],
  [6.5, 'bus', BI, 86, -12], [7.5, 'bus', BI, 88, -13], [7.9, 'bus', BI, 80, -24], [9.3, 'bus', BI, 82, -20], [9.9, 'bus', B0, 12, -5],
  [10.4, 'bus', [0.55, 1.62, -0.35], 8, -5], [10.9, 'bus', [0.1, 1.72, -0.75], 5, -5],
  [12.4, 'bus', [0.05, 1.72, -2.0], 5, -5, { fov: 72 }], [13.4, 'bus', AF, 6, -6, { fov: 50 }], [14.0, 'bus', AF, 6, -6, { fov: 50 }],
  [14.35, 'bus', AF, 95, -4, { fov: 90 }], [14.9, 'bus', AF, 180, -2, { fov: 98 }], [15.2, 'bus', AF, 180, -2],
  [16.1, 'bus', AF, 180, -1.2, { fov: 17 }], [21.2, 'bus', AF, 180, -1.2, { fov: 17 }], [21.7, 'bus', AF, 180, -2, { fov: 60 }],
  [22.9, 'bus', AF, 180, -3, { fov: 75 }], [24.0, 'bus', AD, 182, -6], [24.4, 'bus', AD, -150, -10], [26.0, 'bus', AD, -150, -10],
  [26.3, 'bus', AD, 180, -3, { fov: 60 }], [27.15, 'bus', AD, 180, -3, { fov: 60 }],
  [27.5, 'bus', AD, -52, -8], [28.25, 'bus', WIN, -88, -6], [28.55, 'bus', WIN, -22, -22], [29.4, 'bus', WIN, -22, -22], [29.8, 'bus', WIN, -88, -7], [CRASH, 'bus', WIN, -92, -7],
  [CRASH + 0.35, 'bus', [1.95, 1.15, 0.0], -100, -24, { roll: -220 }],
  [31.6, 'ext', [0.7, 0.95, 0.4], -70, 20, { cut: true, roll: -160 }], [32.0, 'ext', [0.1, 0.6, 0.6], -20, -45, { roll: -60 }],
  [32.45, 'ext', [-0.55, 0.35, 0.8], 30, 25, { roll: -15 }], [32.95, 'ext', LIE, 8, 62, { roll: 2 }], [33.6, 'ext', LIE, 3, 63], [34.8, 'ext', LIE, 0, 60],
  [36.0, 'ext', SW, -8, -14], [38.0, 'ext', SW, -6, -12], [39.8, 'ext', SW, -4, -9],
  [40.15, 'ext', SW, -2, -4], [40.55, 'ext', SW, 0, 0, { track: true }], [41.0, 'ext', SW, 0, 0, { track: true, fov: 18 }], [43.2, 'ext', SW, 0, 0, { track: true, fov: 16 }],
  [43.55, 'ext', SW, -4, -6], [47.7, 'ext', SW, -4, -6],
  [48.1, 'ext', SW, 0, 0, { track: true, fov: 16 }], [49.6, 'ext', SW, 0, 0, { track: true, fov: 13 }],
  [50.0, 'ext', SW, -6, -52], [55, 'ext', SW, -6, -53],
];
const D2R = Math.PI / 180;
const dirFrom = (yaw, pitch) => new THREE.Vector3(-Math.sin(yaw * D2R) * Math.cos(pitch * D2R), Math.sin(pitch * D2R), -Math.cos(yaw * D2R) * Math.cos(pitch * D2R));
const yawPitchTo = (from, to) => { const d = new THREE.Vector3().subVectors(to, from); const h = Math.hypot(d.x, d.z); return { yaw: Math.atan2(-d.x, -d.z) / D2R, pitch: Math.atan2(d.y, h) / D2R }; };
const E = (x, y, z) => new THREE.Vector3(X0 + x, y, z);
function keyAngles(k, t) {
  if (k[5] && k[5].track) { const yp = yawPitchTo(E(...k[2]), E(XB + 0.12, 1.95, extBusZ(t) - 6.2)); return [yp.yaw, yp.pitch]; }
  return [k[3], k[4]];
}
function camAt(t) {
  let i = 0; while (i < CAM.length - 1 && CAM[i + 1][0] <= t) i++;
  const a = CAM[i], b = CAM[Math.min(i + 1, CAM.length - 1)];
  const oa = a[5] || {}, ob = b[5] || {};
  const [ya, pa] = keyAngles(a, t);
  if (b === a || b[1] !== a[1] || ob.cut || t <= a[0]) return { set: a[1], p: a[2], yaw: ya, pitch: pa, roll: oa.roll ?? 0, fov: oa.fov ?? 98 };
  const k = ease((t - a[0]) / (b[0] - a[0])), [yb, pb] = keyAngles(b, t);
  return { set: a[1], p: lerpV(a[2], b[2], k), yaw: angLerp(ya, yb, k), pitch: lerp(pa, pb, k), roll: lerp(oa.roll ?? 0, ob.roll ?? 0, k), fov: lerp(oa.fov ?? 98, ob.fov ?? 98, k) };
}
// secousses : freinage, vitre, choc, « LÂCHE »
function shake(t) {
  const hit = (t0, amp, dec) => { const u = t - t0; return u < 0 ? 0 : amp * Math.exp(-u * dec); };
  const a = hit(BRAKE + 0.1, 1, 3) + hit(SMASH, 0.6, 5) + hit(CRASH, 1.8, 2.5) + hit(46.7, 0.3, 4) + 0.12 * span(t, 26, CRASH) * (t < CRASH ? 1 : 0);
  return [Math.sin(t * 61) * 0.02 * a, Math.sin(t * 47 + 1) * 0.016 * a, Math.sin(t * 53 + 2) * 2.2 * a];
}

// ======================================================================
// SMS de « Moi » (cartes), sous-titres
// ======================================================================
const CARDS = [
  { kind: 'm', in: 0.3, out: 2.2, text: 'Accroche-toi.', when: 'envoyé dans 3 min' },
  { kind: 'm', in: 3.8, out: 5.6, text: 'Baisse la tête.', when: 'envoyé dans 3 min' },
  { kind: 'm', in: 8.85, out: 9.85, text: 'Ne lui montre pas.', when: 'envoyé dans 3 min' },
  { kind: 'm', in: 9.9, out: 11.8, text: 'Regarde qui conduit.', when: 'envoyé dans 3 min' },
  { kind: 'm', in: 14.0, out: 15.6, text: 'Retourne-toi.', when: 'envoyé dans 3 min' },
  { kind: 'm', in: 16.4, out: 19.6, text: 'Tu me vois, là ?' },
  { kind: 'm', in: 21.6, out: 23.6, text: 'Je vais vous rentrer dedans.' },
  { kind: 'm', in: 27.4, out: CRASH, text: (t) => t < 28.4 ? 'La fenêtre.' : t < 29.4 ? 'La fenêtre. 3…' : t < 30.4 ? 'La fenêtre. 2…' : 'La fenêtre. 1.', hard: true },
  { kind: 'm', in: 38.2, out: 40.4, text: 'Celle qui te tient la main, c’est pas elle.' },
  { kind: 'm', in: 46.7, out: 48.3, text: 'LÂCHE.', big: true, shake: true },
  { kind: 'out', in: 51.0, out: CUT, text: 'Je fais quoi ?', hard: true },
  { kind: 'typing', in: 52.5, out: CUT, text: '', hard: true },
];
const W_ = '#FFFFFF', Y_ = '#F2C230', R_ = '#E5664F';
const COLOR = { sam: W_, ines: Y_, ines_f: Y_, ines_loin: Y_, homme: R_ };
const DLG = (await (await fetch('/dialogue.json', { cache: 'no-store' })).json()).lines;
let VT = {};
try { VT = await (await fetch('/out/voice-timing.json', { cache: 'no-store' })).json(); console.log('sous-titres calés sur les voix'); } catch { /* pas encore de voix */ }
const SUBS = [], TALK = {};
for (const L of DLG) {
  if (L.nosub) { const v = VT[L.id], t0 = v ? v.t : L.t; (TALK[L.who] ||= []).push([t0, t0 + (v ? v.dur : 1)]); continue; }
  const v = VT[L.id], t0 = v ? v.t : L.t, dur = v ? Math.max(0.4, v.dur) : 0.3 + 0.06 * L.text.length;
  (TALK[L.who] ||= []).push([t0, t0 + dur]);
  const chunks = []; let cur = [];
  const words = [];
  for (const w of L.text.split(' ')) { if (/^[!?:;»…]+$/.test(w) && words.length) words[words.length - 1] += ' ' + w; else if (words.length && words[words.length - 1] === '«') words[words.length - 1] += ' ' + w; else words.push(w); }
  for (const w of words) { if (cur.length && (cur.length >= 3 || (cur.join(' ') + ' ' + w).length > 15)) { chunks.push(cur.join(' ')); cur = []; } cur.push(w); }
  if (cur.length) chunks.push(cur.join(' '));
  const total = chunks.reduce((s, c) => s + c.length, 0); let a = t0;
  chunks.forEach((c, i) => { const d = dur * c.length / total; SUBS.push([a, Math.min(CUT, a + d + (i === chunks.length - 1 ? 0.2 : 0)), c, COLOR[L.who]]); a += d; });
}
const talkAmt = (t, who) => { for (const [a, b] of TALK[who] || []) if (t >= a && t <= b) return Math.abs(Math.sin((t - a) * 17)); return 0; };

const cardsEl = document.getElementById('cards'), sub = document.getElementById('sub');
const MSG_ICON = '<svg width="38" height="38" viewBox="0 0 38 38"><rect width="38" height="38" rx="10" fill="#2DBE5B"/><path d="M19 9c-6.6 0-11 4-11 9 0 2.8 1.4 5.2 3.7 6.8L10.8 30l5.6-3.1c.8.2 1.7.3 2.6.3 6.6 0 11-4 11-9s-4.4-9.2-11-9.2z" fill="#fff"/></svg>';
for (const c of CARDS) {
  const el = document.createElement('div'); el.className = `card ${c.kind}${c.big ? ' big' : ''}`;
  if (c.kind === 'm') el.innerHTML = `<div class="hd">${MSG_ICON}<span class="app">MESSAGES</span><span class="when">${c.when || 'maintenant'}</span></div><div class="from">Moi</div><div class="tx"></div>`;
  else if (c.kind === 'out') el.innerHTML = `<div class="tx"></div><div class="st">Envoyé à <b>Moi</b></div>`;
  else el.innerHTML = `<div class="dots"><i></i><i></i><i></i></div><div class="st"><b>Moi</b> est en train d’écrire…</div>`;
  cardsEl.appendChild(el); c.el = el; c.tx = el.querySelector('.tx'); c.dots = el.querySelector('.dots');
}
function updateCards(t) {
  for (const c of CARDS) {
    const a = t - c.in, fadeOut = c.hard ? 0 : 0.3;
    if (t < c.in || t > c.out + fadeOut || t >= CUT) { c.el.style.opacity = 0; continue; }
    const pop = a < 0.12 ? 0.86 + a / 0.12 * 0.2 : a < 0.24 ? 1.06 - (a - 0.12) / 0.12 * 0.06 : 1;
    const fade = t > c.out ? 1 - (t - c.out) / fadeOut : Math.min(1, a / 0.08);
    let tr = c.kind === 'm' ? `translateY(${(1 - Math.min(1, a / 0.12)) * -30}px) scale(${pop})` : `translateY(${(1 - Math.min(1, a / 0.18)) * 40}px) scale(${pop})`;
    if (c.shake) tr += ` translate(${Math.sin(t * 83) * 8}px, ${Math.cos(t * 71) * 6}px) rotate(${-2 + Math.sin(t * 47) * 1.4}deg)`;
    c.el.style.opacity = fade; c.el.style.transform = tr;
    if (c.tx) c.tx.textContent = typeof c.text === 'function' ? c.text(t) : c.text;
    if (c.dots) [...c.dots.children].forEach((d, i) => { d.style.opacity = 0.35 + 0.65 * Math.max(0, Math.sin(t * 7 - i * 0.9)); });
  }
}
// l'écran du téléphone : la conversation avec « Moi »
function drawPhone(t) {
  const g = phoneCanvas.getContext('2d'), w = 360, h = 740;
  g.fillStyle = '#0E1117'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#1B2029'; g.fillRect(0, 0, w, 120);
  g.fillStyle = '#7C8696'; g.beginPath(); g.arc(w / 2, 52, 26, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.font = '800 26px Inter, sans-serif'; g.textAlign = 'center'; g.fillText('M', w / 2, 61); g.font = '700 22px Inter, sans-serif'; g.fillText('Moi', w / 2, 104); g.textAlign = 'left';
  const msgs = CARDS.filter((c) => c.kind === 'm' && c.in <= t).map((c) => ({ me: false, s: typeof c.text === 'function' ? c.text(Math.min(t, c.out)) : c.text }));
  if (t >= 51.0) msgs.push({ me: true, s: 'Je fais quoi ?' });
  if (t >= 52.5) msgs.push({ me: false, s: '•••' });
  let y = h - 30;
  for (const m of msgs.slice(-6).reverse()) {
    g.font = '700 30px Inter, sans-serif'; const tw = Math.min(270, g.measureText(m.s).width), bh = 58;
    const x = m.me ? w - tw - 46 : 18; y -= bh + 12;
    g.fillStyle = m.me ? '#2F7BF6' : '#2A3140'; g.beginPath(); g.roundRect(x, y, tw + 28, bh, 22); g.fill();
    g.fillStyle = '#fff'; g.fillText(m.s, x + 14, y + 39, 270);
  }
  phoneTex.needsUpdate = true;
}

// ======================================================================
// Post-traitement : fisheye + flou de mouvement + vignette + grain + flash + noir final
// ======================================================================
const rt = new THREE.WebGLRenderTarget(W, H, { samples: 4, colorSpace: THREE.SRGBColorSpace });
const postScene = new THREE.Scene(); const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const postMat = new THREE.ShaderMaterial({
  uniforms: { tex: { value: rt.texture }, k: { value: 0.22 }, aspect: { value: W / H }, time: { value: 0 }, blur: { value: new THREE.Vector2() }, black: { value: 0 }, flash: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: `
    uniform sampler2D tex; uniform float k; uniform float aspect; uniform float time; uniform vec2 blur; uniform float black; uniform float flash; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 p = vUv * 2.0 - 1.0; vec2 q = vec2(p.x * aspect, p.y);
      float r2 = dot(q, q) / (1.0 + aspect*aspect);
      vec2 d = p * (1.0 + k * r2) / (1.0 + k * 0.62);
      vec2 uv = d * 0.5 + 0.5;
      vec3 c = vec3(0.0);
      for (int i = 0; i < 12; i++) { float f = float(i) / 11.0 - 0.5; c += texture2D(tex, uv + blur * f).rgb; }
      c /= 12.0;
      float v = smoothstep(1.25, 0.35, length(q * vec2(1.0, 0.82)));
      c *= mix(0.78, 1.0, v);
      c += (hash(floor(vUv * vec2(540., 960.)) + floor(time*12.)) - 0.5) * 0.025;
      c = mix(c, vec3(1.0), flash);
      gl_FragColor = vec4(c * (1.0 - black), 1.0);
    }`,
});
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat));

// ======================================================================
// Une image à l'instant t
// ======================================================================
const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3();
function handPose(t) {
  let i = 0; while (i < HAND_KEYS.length - 1 && HAND_KEYS[i + 1][0] <= t) i++;
  const a = HAND_POSES[HAND_KEYS[i][1]], b = HAND_POSES[HAND_KEYS[Math.min(i + 1, HAND_KEYS.length - 1)][1]];
  const k = i < HAND_KEYS.length - 1 ? ease((t - HAND_KEYS[i][0]) / (HAND_KEYS[i + 1][0] - HAND_KEYS[i][0])) : 0;
  return { p: a.p.map((v, j) => lerp(v, b.p[j], k)), r: a.r.map((v, j) => lerp(v, b.r[j], k)) };
}
const faceTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
function smile(P, k) { P.mouth.scale.set(1 + 0.9 * k, 1 + 0.4 * k, 1); }

function renderAt(t) {
  // ---------- caméra ----------
  const c = camAt(t), cPrev = camAt(Math.max(0, t - 1 / 30)), cNext = camAt(t + 1 / 30);
  const inExt = c.set === 'ext';
  const base = inExt ? E(...c.p) : new THREE.Vector3(...c.p);
  const moving = !inExt && t < CRASH && busSpeed(t) > 0.5;
  const vib = moving ? Math.sin(t * 57) * 0.0016 + Math.sin(t * 23.3) * 0.0022 * (busSpeed(t) / SPEED) : 0;
  const breathe = Math.sin(t * 1.7) * 0.006 * (t > 33 && t < 34.8 ? 3 : 1);
  const pA = camAt(Math.max(0, t - 0.05)).p, pB = camAt(t + 0.05).p;
  const walkSpd = c.set === cPrev.set && c.set === cNext.set ? Math.min(1, Math.hypot(pB[0] - pA[0], pB[2] - pA[2]) / 0.1 / 1.4) : 0;
  const bobY = -Math.abs(Math.sin(t * 8.5)) * 0.045 * walkSpd, bobX = Math.sin(t * 4.25) * 0.02 * walkSpd;
  const [sx, sy, sr] = shake(t);
  camera.position.set(base.x + sx + bobX, base.y + vib + breathe + sy + bobY, base.z);
  const yaw = c.yaw + Math.sin(t * 0.7) * 0.6, pitch = c.pitch + Math.sin(t * 0.9) * 0.5;
  camera.fov = c.fov; camera.updateProjectionMatrix();
  camera.up.set(0, 1, 0);
  camera.lookAt(tmpV.copy(camera.position).add(dirFrom(yaw, pitch)));
  camera.rotateZ((Math.sin(t * 0.8) * 0.7 + c.roll + sr + Math.sin(t * 4.25) * 1.2 * walkSpd) * D2R);
  camera.updateMatrixWorld();
  const sameSet = cPrev.set === c.set && cNext.set === c.set;
  const dy = sameSet ? angLerp(cPrev.yaw, cNext.yaw, 1) - cPrev.yaw : 0, dp = sameSet ? (cNext.pitch - cPrev.pitch) : 0, dr = sameSet ? (cNext.roll - cPrev.roll) : 0;
  const bx = Math.max(-0.12, Math.min(0.12, (dy / 2) / 67 * 0.6 * (98 / c.fov) + dr * 0.0006)), by = Math.max(-0.12, Math.min(0.12, -(dp / 2) / 98 * 0.6));
  postMat.uniforms.blur.value.set(Math.abs(bx) < 0.004 ? 0 : bx, Math.abs(by) < 0.004 ? 0 : by);
  postMat.uniforms.black.value = t >= CUT ? 1 : 0;
  postMat.uniforms.flash.value = t > CRASH ? Math.max(0, 1 - Math.abs(t - CRASH - 0.18) / 0.22) : t > SMASH && t < SMASH + 0.12 ? 0.25 : 0;
  sun.position.copy(camera.position).add(tmpV2.set(6, 7, 2)); sun.target.position.copy(camera.position).add(tmpV2.set(0, -1.2, -2));
  const camPos = camera.position.clone();
  const seated = !inExt && t < 10.2;
  thighs.forEach((m) => { m.visible = seated; });

  // ---------- passagers : tout le monde part vers l'avant au freinage ----------
  const panic = !inExt && t > 21.6;
  for (const p of passengers) {
    const { P, holder, kind, d } = p;
    holder.visible = !inExt;
    if (kind === 'stand') {
      const slide = span(t, BRAKE + d, BRAKE + 0.5 + d), tip = span(t, BRAKE + 0.1 + d, BRAKE + 0.62 + d);
      holder.position.set(p.x, 0, p.z - 1.7 * slide); holder.rotation.x = -(1.0 + 0.45 * span(t, BRAKE + 0.6 + d, BRAKE + 1.2 + d)) * tip;
      P.shoulder[0].rotation.set(-2.2 * tip, 0, Math.PI * 0.9 * (1 - tip)); P.shoulder[1].rotation.set(-2.0 * tip, 0, 0);
      aim(P.head, camPos, 0, [0.5 * tip, 0, 0]);
      face(P, { brow: 0.8 * tip, squint: 0.6 * tip, t });
    } else {
      const a = span(t, BRAKE + d, BRAKE + 0.3 + d), b = span(t, BRAKE + 0.6 + d, BRAKE + 1.6 + d), c2 = span(t, CRASH, CRASH + 0.25);
      P.torso.rotation.x = 0.95 * a * (1 - 0.75 * b) * (1 - 0.7 * span(t, 3.4, 5.4)) + 0.9 * c2;
      for (let i = 0; i < 2; i++) { P.shoulder[i].rotation.x = -0.35 - 1.3 * a * (1 - b) - (panic && kind === 'back' ? 0.6 : 0); P.elbow[i].rotation.x = -1.15 * (1 - a * (1 - b)); }
      const look = kind === 'back' ? (t > 14.3 && t < 21.6 ? 0.6 : panic ? 0 : 0.1) : 0.05;
      if (kind === 'back' && panic) aim(P.head, new THREE.Vector3(0, 1.4, 10), 1, [0, 0, 0]);
      else aim(P.head, camPos, look, [0.45 * a * (1 - b), 0, 0]);
      face(P, { brow: panic || (t > BRAKE && t < 3.5) ? 0.9 : t > SMASH ? 0.5 : -0.2, squint: t > BRAKE + 0.2 && t < 2.4 ? 0.7 : 0, talk: p === shouter ? talkAmt(t, 'homme') : 0, t });
    }
  }
  updateBags(t);

  // ---------- Inès (dans le bus, puis dehors) ----------
  const P = ines, s = P.root.scale.x, iTalk = talkAmt(t, 'ines') + talkAmt(t, 'ines_f');
  inesReach.visible = false; inesReachHand.visible = false; P.armMeshes.forEach((arr) => arr.forEach((m) => { m.visible = true; }));
  samArm.visible = false; samHand.visible = false;
  let clasp = null, inesShoulder = null, grip = null;
  P.root.visible = true; P.torso.rotation.set(0, 0, 0); P.head.rotation.set(0, 0, 0);
  for (let i = 0; i < 2; i++) { P.shoulder[i].rotation.set(0, 0, i ? 0.08 : -0.08); P.elbow[i].rotation.set(0, 0, 0); }
  if (!inExt) {
    const seatY = 0.58 - 0.95 * s;
    if (t < 10.0) { // assise ; projetée en avant au freinage ; veut voir le téléphone
      const fwd = span(t, BRAKE + 0.05, BRAKE + 0.4) * (1 - span(t, 2.4, 3.6));
      setSit(P, 1 - 0.5 * fwd);
      P.root.position.set(0.48, seatY - 0.2 * fwd, 0.12 - 0.55 * fwd); P.root.rotation.set(0, Math.PI, 0);
      P.torso.rotation.x = 0.8 * fwd; P.shoulder[0].rotation.x = -1.4 * fwd - 0.35 * (1 - fwd); P.shoulder[1].rotation.x = -1.4 * fwd - 0.35 * (1 - fwd);
      const grab = span(t, 7.6, 8.0) * (1 - span(t, 9.0, 9.5));
      if (grab > 0) { P.shoulder[0].rotation.x = -1.3 * grab - 0.35; P.shoulder[0].rotation.z = -0.55 * grab; P.torso.rotation.y = -0.3 * grab; }
      aim(P.head, camPos, t > 2.2 ? 0.95 : 0.2);
    } else {
      const K = [[10.0, 0.48, 0.12, Math.PI, 1], [10.6, 0.22, -0.5, Math.PI, 0], [12.4, 0.3, -3.25, Math.PI, 0], [21.8, 0.3, -3.25, Math.PI, 0],
        [23.1, 0.22, 1.2, 0, 0], [23.7, 0.72, 2.6, Math.PI / 2, 0], [27.45, 0.72, 2.6, Math.PI / 2, 0], [27.85, 0.15, 1.0, Math.PI, 0], [28.15, 0.15, -0.5, Math.PI, 0], [28.5, 0.78, -0.52, Math.PI / 2, 0], [40, 0.78, -0.52, Math.PI / 2, 0]];
      let i = 0; while (i < K.length - 2 && K[i + 1][0] <= t) i++;
      const a = K[i], b = K[i + 1], k = (t - a[0]) / (b[0] - a[0]), ke = ease(k);
      const sit = lerp(a[4], b[4], ke);
      setSit(P, sit, false);
      P.root.position.set(lerp(a[1], b[1], k), lerp(0, seatY, sit), lerp(a[2], b[2], k));
      P.root.rotation.set(0, angLerp(a[3] / D2R, b[3] / D2R, Math.min(1, k * 2.5)) * D2R, 0);
      const moving = k > 0 && k < 1 && Math.hypot(b[1] - a[1], b[2] - a[2]) > 0.05;
      if (moving && sit < 0.5) walk(P, t * 13, 1);
      const push = t > 23.7 && t < 27.45 ? 1 : 0;
      if (push) for (let j = 0; j < 2; j++) { const bang = Math.max(0, Math.sin(t * 9 + j * 1.3)); P.shoulder[j].rotation.x = -1.35 - 0.15 * bang; P.elbow[j].rotation.x = -0.5 + 0.3 * bang; }
      const lookAt = t < 14.3 ? (t > 12.4 && t < 13.4 ? camPos : new THREE.Vector3(-0.7, 1.2, -11)) : t < 21.6 ? new THREE.Vector3(0, 1.4, 12) : t < 23.7 ? camPos : t < 27.45 ? new THREE.Vector3(1.4, 1.5, 2.6) : camPos;
      aim(P.head, lookAt, 0.95);
      if (t > 28.6 && t < CRASH + 0.15) { P.root.updateMatrixWorld(true); inesShoulder = P.shoulder[0].getWorldPosition(new THREE.Vector3()); clasp = new THREE.Vector3(0.84, 1.08, -0.22); grip = 0; }
    }
    face(P, { brow: t > BRAKE ? 0.85 : 0, squint: t > SMASH && t < 8.4 ? 0.5 : 0, talk: iTalk, t });
  } else if (t < CRASH + 0.4) {
    P.root.visible = false;
  } else { // dehors : la fausse Inès
    const LEAN = [-1.08, 0.15, 0.32], STANDP = [-1.28, 0.15, -0.78];
    const k = span(t, 34.8, 36.0);
    P.root.position.copy(E(...lerpV(LEAN, STANDP, k)));
    setSit(P, 0, false);
    P.root.rotation.set(0, faceTo(P.root.position, camPos) - 0.25 * k, 0);
    P.torso.rotation.x = 0.55 * (1 - k);
    if (t < 35.4) { P.shoulder[0].rotation.x = -1.3 * span(t, 34.0, 34.6); }
    aim(P.head, camPos, 0.95);
    const creep = span(t, 37.3, 38.4), tilt = span(t, 43.6, 44.3);
    P.head.rotateZ(0.32 * tilt);
    smile(P, Math.max(0.35 * creep, span(t, 45.0, 45.6)) * (iTalk > 0.05 ? 0.3 : 1));
    face(P, { brow: t < 37 ? 0.7 : -0.3 * creep, talk: iTalk, t });
    if (iTalk < 0.05) smile(P, Math.max(0.35 * creep, 0.9 * span(t, 45.0, 45.6)));
    P.pupils.forEach((pp) => pp.scale.setScalar(1 - 0.55 * span(t, 46.7, 47.1)));
    if (t >= 35.4) { P.root.updateMatrixWorld(true); inesShoulder = P.shoulder[0].getWorldPosition(new THREE.Vector3()); clasp = E(-1.27, 1.0, -0.38); grip = span(t, 43.6, 44.2); }
  }
  if (clasp && inesShoulder) {
    P.armMeshes[0].forEach((m) => { m.visible = false; });
    inesReach.visible = true; inesReachHand.visible = true;
    const sq = grip ? Math.sin(t * 40) * 0.004 * grip : 0;
    const cl = clasp.clone().add(tmpV2.set(sq, sq, 0));
    stretch(inesReach, inesShoulder, cl); inesReach.scale.x = inesReach.scale.z = s;
    inesReachHand.position.copy(cl); inesReachHand.scale.setScalar(s * (1 + 0.15 * (grip || 0)));
    inesReachHand.material = t > 49.8 ? COLD : P.M.skin;
    const shoulderW = new THREE.Vector3(-0.2, -0.32, 0.05).applyMatrix4(camera.matrixWorld);
    samArm.visible = true; samHand.visible = true;
    stretch(samArm, shoulderW, cl.clone().add(tmpV2.subVectors(shoulderW, cl).normalize().multiplyScalar(0.06)));
    samHand.position.copy(cl).addScaledVector(tmpV2.subVectors(shoulderW, cl).normalize(), 0.04);
  } else if (false) { // Sam s'accroche à la barre du siège devant
    const bar = new THREE.Vector3(0.86, 1.17, -0.74);
    const shoulderW = new THREE.Vector3(-0.2, -0.32, 0.05).applyMatrix4(camera.matrixWorld);
    const reach = span(t, BRAKE - 0.15, BRAKE + 0.05) * (1 - span(t, 3.9, 4.3));
    if (reach > 0.02) {
      const tgt = shoulderW.clone().lerp(bar, reach);
      samArm.visible = true; samHand.visible = true;
      stretch(samArm, shoulderW, tgt.clone().add(tmpV2.subVectors(shoulderW, tgt).normalize().multiplyScalar(0.06))); samArm.scale.x = samArm.scale.z = 0.75;
      samHand.position.copy(tgt);
    }
  }

  // ---------- la vraie Inès, derrière la vitre du bus arrêté ----------
  const R2 = inesReal, bang = (x) => { let v = 0; for (const b of [40.9, 41.3, 41.7, 42.4, 42.8, 48.5, 48.9, 49.3]) { const u = x - b; if (u > 0 && u < 0.25) v = Math.max(v, Math.sin(u / 0.25 * Math.PI)); } return v; };
  const bv = bang(t);
  R2.torso.rotation.x = 0.4; R2.head.rotation.set(-0.3, 0, 0);
  for (let i = 0; i < 2; i++) { R2.shoulder[i].rotation.set(-2.3, 0, (i ? 1 : -1) * 0.25); R2.elbow[i].rotation.set(-0.5, 0, 0); }
  face(R2, { brow: 0.95, talk: Math.max(talkAmt(t, 'ines_loin'), 0.25), tears: 1, t });
  realPalms.forEach((m, i) => { m.position.z = -6.16 - 0.04 * bv; m.position.y = 2.0 + (i ? 0.03 : 0); });

  // ---------- le bus qui suit et l'autre Sam ----------
  follower.visible = !inExt && t > 13 && t < CRASH + 0.4;
  follower.position.z = Z_REAR + 6.25 + gapAt(t);
  const flare = span(t, 21.4, 21.7) * (0.6 + 0.4 * span(t, 21.7, CRASH));
  headGlows.forEach((g) => { g.scale.setScalar(0.4 + 2.6 * flare); g.material.opacity = 0.35 + 0.65 * flare; });
  bigGlow.scale.setScalar(0.1 + 2.5 * flare + 9 * flare * span(t, 24, CRASH)); bigGlow.material.opacity = flare * span(t, 22, CRASH);
  rearLight.intensity = inExt ? 0 : 14 * flare * (0.3 + 0.7 * span(t, 24, CRASH));
  const T = twin;
  const typing = t < 16.4 ? 1 : 0, show = span(t, 21.0, 21.4) * (1 - span(t, 23.6, 24.0));
  T.shoulder[0].rotation.set(-1.0 - 0.6 * show, 0, 0.1); T.elbow[0].rotation.set(-1.25 + 0.6 * show + typing * Math.sin(t * 22) * 0.06, 0, 0);
  T.shoulder[1].rotation.set(-0.9 * (1 - show), 0, -0.15); T.elbow[1].rotation.set(-1.3 * (1 - show) + typing * Math.sin(t * 22 + 1.5) * 0.06, 0, 0);
  const lookUp = span(t, 16.7, 17.1);
  aim(T.head, camPos, lookUp, [0.45, 0, 0]);
  face(T, { brow: -0.4 * lookUp, t });
  smile(T, 0.7 * span(t, 17.6, 18.4));
  twinScreen.material.color.set(t > 15.6 && t < 16.45 ? '#FFFFFF' : '#CFE7FF');

  // ---------- décor ----------
  sideGlass.visible = !inExt && t < SMASH; brokenEdge.visible = !inExt && t >= SMASH;
  updateShards(t);
  const bIn = span(t, SMASH - 0.14, SMASH + 0.06), scrape = span(t, SMASH + 0.06, SMASH + 1.0), bOut = span(t, SMASH + 1.0, SMASH + 1.35);
  branch.visible = t > SMASH - 0.2 && t < SMASH + 1.4;
  const jit = t > SMASH && t < SMASH + 1.0 ? Math.sin(t * 70) * 0.015 : 0;
  branch.position.set(lerp(3.2, 0.5, bIn) + 2.6 * bOut, 1.42 + jit + 0.1 * bOut, 0.05 + 0.5 * scrape + 2.6 * bOut);
  branch.rotation.set(0, -0.15 * scrape - 0.3 * bOut, 0.05 + jit);
  wheelSpin.rotation.z = Math.sin(t * 1.1) * 0.5 + Math.sin(t * 3.7) * 0.15 + (t > 25 ? Math.sin(t * 6) * 0.3 : 0);
  busRearGlass.visible = true;
  extBus.position.z = extBusZ(t);
  setExtDoor('rear', 0); setExtDoor('mid', 0);
  extBus.visible = inExt;
  bus.visible = street.visible = !inExt;
  updateStreet(t);
  drawLed(t);
  drawRoad(busOffset(t), t);
  doorLeaves[0].position.z = DOOR_Z0 + 0.3 + (t > 23.7 && t < 27.45 ? Math.sin(t * 13) * 0.012 : 0); doorLeaves[1].position.z = DOOR_Z0 + 0.9;

  // ---------- main droite et téléphone ----------
  const hp = handPose(t);
  hand.visible = !(t > CRASH + 0.05 && t < 35.2);
  hand.position.set(hp.p[0] + Math.sin(t * 2.1) * 0.003, hp.p[1] + 0.015 * span(t, 0.3, 0.6) + Math.sin(t * 31) * 0.0008, hp.p[2]);
  hand.rotation.set(...hp.r);
  thumb.position.y = -0.03 + (t > 50.4 && t < 51.0 ? Math.abs(Math.sin(t * 24)) * 0.012 : 0);
  drawPhone(t);

  postMat.uniforms.time.value = t;
  renderer.setRenderTarget(rt); renderer.render(scene, camera);
  renderer.setRenderTarget(null); renderer.render(postScene, postCam);

  // ---------- interface ----------
  updateCards(t);
  const st = SUBS.find(([a0, b0]) => t >= a0 && t < b0);
  if (st && t < CUT) { sub.textContent = st[2]; sub.setAttribute('fill', st[3]); const pa = t - st[0]; sub.style.transform = `scale(${pa < 0.08 ? 0.9 + pa / 0.08 * 0.1 : 1})`; }
  else sub.textContent = '';
}

window.DURATION = DURATION;
window.renderAt = renderAt;
await document.fonts.ready;
renderAt(0);
window.sceneReady = true;

const qs = new URLSearchParams(location.search);
// ?render : piloté par render.js · ?t=16 : image fixe à 16 s · sinon lecture en boucle (?play=16 pour partir de 16 s)
if (qs.has('t')) renderAt(Number(qs.get('t')) || 0);
else if (!qs.has('render')) {
  const t0 = performance.now() - (Number(qs.get('play')) || 0) * 1000;
  const loop = () => { renderAt(((performance.now() - t0) / 1000) % DURATION); requestAnimationFrame(loop); };
  loop();
}
const fit = () => { const sc = Math.min(innerWidth / W, innerHeight / H); document.getElementById('stage').style.transform = `scale(${sc})`; };
if (!qs.has('render')) { addEventListener('resize', fit); fit(); }
