// Shared parts for ParachuteClear: the standard atmosphere, a falling-body stepper, a skydiver figure,
// round and ram-air canopies, and a small graph that sits on the camera as a heads-up display.
// The physics is the textbook one: weight pulls down, drag (F = 1/2 rho Cd A v^2) pushes up, and the two
// balance at the terminal speed v = sqrt(2 m g / (rho Cd A)). Numbers for body and canopy drag areas are
// typical round values chosen to give the speeds skydivers report, not measurements of any one person.
import { THREE, M, box, sphere, canvasTexture, clamp, lerp, smooth, approach } from './kit.js';

export { THREE, M, box, sphere, clamp, lerp, smooth, approach };
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
export const COL = { sky: 0x6fb4ff, deep: 0x0a1230, cyan: 0x8ef0ff, amber: 0xffb547, coral: 0xff7a59, lime: 0xa3e635, violet: 0xc49bff, cloth: 0xf2f4f8, orange: 0xff8a3d, ground: 0x3d5a3a };
export const G = 9.80665;
export const MASS = 90; // skydiver plus kit, kg

// ---------------------------------------------------------------- standard atmosphere (ISA, to 47 km)
export function isa(h) {
  h = clamp(h, 0, 47000);
  const g0 = G, R = 287.053, T0 = 288.15, p0 = 101325;
  const p11 = p0 * Math.pow(216.65 / T0, g0 / (R * 0.0065));
  const p20 = p11 * Math.exp((-g0 * 9000) / (R * 216.65));
  let T, p;
  if (h <= 11000) { T = T0 - 0.0065 * h; p = p0 * Math.pow(T / T0, g0 / (R * 0.0065)); }
  else if (h <= 20000) { T = 216.65; p = p11 * Math.exp((-g0 * (h - 11000)) / (R * 216.65)); }
  else { T = 216.65 + 0.001 * (h - 20000); p = p20 * Math.pow(T / 216.65, -g0 / (R * 0.001)); }
  return { T, p, rho: p / (R * T), a: Math.sqrt(1.4 * R * T) };
}
export const rhoAt = (h) => isa(h).rho;

// ---------------------------------------------------------------- bodies and drag
// Drag area CdA in square metres (drag coefficient times reference area).
export const POSE = {
  belly: { name: 'Belly to earth', cda: 0.5 },
  head: { name: 'Head down', cda: 0.22 },
};
export const CANOPY = { area: 28, cd: 1.4 }; // a round sport-style canopy: about 39 m2 of drag area
export const vTerm = (m, cda, rho) => Math.sqrt((2 * m * G) / (rho * cda));
export const dragForce = (cda, rho, v) => 0.5 * rho * cda * v * v;

// Advance a falling body. st = { h (m), v (m/s, down), t }. Returns the acceleration (m/s2, down positive).
export function fall(st, dt, m, cda, { rho = rhoAt } = {}) {
  const n = Math.max(1, Math.ceil(dt / (1 / 120)));
  const d = dt / n;
  let a = 0;
  for (let i = 0; i < n; i++) {
    a = G - (0.5 * rho(st.h) * cda * st.v * st.v) / m;
    st.v += a * d;
    st.h -= st.v * d;
    st.t += d;
    if (st.h <= 0) { st.h = 0; break; }
  }
  return a;
}
export const kmh = (ms) => Math.round(ms * 3.6);

// ---------------------------------------------------------------- the skydiver figure
// Local frame: up is +Y (head), the belly faces +Z. Pivot groups let the limbs swing.
export function makeJumper(color = COL.coral) {
  const g = new THREE.Group();
  const suit = M.plastic(color), skin = M.plastic(0xf1c9a5), dark = M.plastic(0x1c2230), pack = M.plastic(0x2a3350);
  const body = new THREE.Group(); g.add(body);
  const cap = (r, len, mat) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 12), mat); m.castShadow = true; return m; };
  const torso = cap(0.2, 0.5, suit); torso.position.y = 0.65; torso.scale.z = 0.72; body.add(torso);
  const rig = box(0.32, 0.55, 0.16, pack); rig.position.set(0, 0.68, -0.22); body.add(rig); // container on the back
  const head = sphere(0.15, skin, 20); head.position.y = 1.22; body.add(head);
  const helmet = sphere(0.17, M.plastic(0xe8eaf0), 20); helmet.position.set(0, 1.25, -0.01); helmet.scale.set(1, 0.9, 1.05); body.add(helmet);
  const limb = (r, len, mat, x, y) => {
    const piv = new THREE.Group(); piv.position.set(x, y, 0);
    const m = cap(r, len, mat); m.position.y = -(len / 2 + r); piv.add(m);
    body.add(piv); return piv;
  };
  const armL = limb(0.07, 0.5, suit, -0.27, 0.98), armR = limb(0.07, 0.5, suit, 0.27, 0.98);
  const legL = limb(0.095, 0.62, suit, -0.11, 0.2), legR = limb(0.095, 0.62, suit, 0.11, 0.2);
  [legL, legR].forEach((l) => { const b = box(0.12, 0.08, 0.22, dark); b.position.set(0, -0.92, 0.04); l.add(b); });
  const poses = {
    belly: { rx: Math.PI / 2, arm: 1.75, armF: -0.45, leg: 0.22 },
    head: { rx: Math.PI, arm: 0.12, armF: 0, leg: 0.04 },
    hang: { rx: 0, arm: 0.2, armF: 0, leg: 0.06 },
    brakes: { rx: 0, arm: 0.2, armF: -0.2, leg: 0.06 },
  };
  const cur = { ...poses.hang };
  g.body = body;
  g.pose = (name, dt = 0, rate = 5) => {
    const p = poses[name] || poses.hang;
    const k = dt ? 1 - Math.exp(-rate * dt) : 1;
    for (const key of Object.keys(cur)) cur[key] += (p[key] - cur[key]) * k;
    body.rotation.x = cur.rx;
    armL.rotation.set(cur.armF, 0, -cur.arm); armR.rotation.set(cur.armF, 0, cur.arm);
    legL.rotation.z = -cur.leg; legR.rotation.z = cur.leg;
    body.position.y = -0.62 * Math.cos(cur.rx) - 0.0; // keep the centre of mass near the origin when lying down
    body.position.z = 0;
  };
  g.pose('hang');
  g.hands = (l, r) => { armL.rotation.x = l; armR.rotation.x = r; };
  g.rig = rig;
  return g;
}

// ---------------------------------------------------------------- round canopy
const stripeTex = (cols, rep) => {
  const { tex } = canvasTexture(cols.length * 8, 8, (g, w, h) => { cols.forEach((c, i) => { g.fillStyle = c; g.fillRect((i * w) / cols.length, 0, w / cols.length + 1, h); }); });
  tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(rep, 1);
  return tex;
};
// A round canopy (a flattened dome) with its lines gathered to one point at the origin.
// R: radius of the flat circle, L: line length. Returns a group; .dome holds the cloth. ventR 0 = no hole.
export function roundCanopy({ R = 3, L = 4.6, ventR = 0.3, gores = 12, colors = ['#ff8a3d', '#f4f6fa'] } = {}) {
  const g = new THREE.Group();
  const prof = [];
  const steps = 18, phi0 = ventR > 0 ? Math.asin(Math.min(0.9, ventR / (R * 0.98))) : 0.0;
  for (let i = 0; i <= steps; i++) {
    const ph = lerp(phi0, 1.42, i / steps);
    prof.push(new THREE.Vector2(Math.max(ventR > 0 ? ventR : 0.0001, R * 0.98 * Math.sin(ph)), R * 0.62 * Math.cos(ph) + 0.0));
  }
  const geo = new THREE.LatheGeometry(prof, gores * 4);
  const mat = new THREE.MeshStandardMaterial({ map: stripeTex(colors, gores / 2), roughness: 0.7, side: THREE.DoubleSide });
  const dome = new THREE.Mesh(geo, mat); dome.castShadow = true;
  dome.position.y = L - R * 0.62 * Math.cos(1.42) + 0.0;
  g.add(dome);
  const rimY = L, rimR = R * 0.98 * Math.sin(1.42);
  const pts = [];
  for (let i = 0; i < gores; i++) { const a = (i / gores) * Math.PI * 2; pts.push(0, 0, 0, Math.cos(a) * rimR, rimY, Math.sin(a) * rimR); }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  g.lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xdfe6f2, transparent: true, opacity: 0.7 }));
  g.add(g.lines);
  g.dome = dome; g.rimY = rimY; g.rimR = rimR; g.top = dome.position.y + R * 0.62;
  return g;
}

// ---------------------------------------------------------------- ram-air canopy (a parafoil)
// Forward is -Z. A cambered aerofoil section is swept along a curved span. The lower leading edge is open
// (the air intake), ribs divide the wing into cells, and the trailing edge can be pulled down for brakes.
const NS = 36, NC = 16;
export function ramAir({ span = 5.2, chord = 1.8, cells = 7, arcDeg = 62, colors = ['#ff8a3d', '#f4f6fa'] } = {}) {
  const g = new THREE.Group();
  const arcR = span / ((arcDeg * Math.PI) / 180);
  const half = (arcDeg * Math.PI) / 360;
  const sx = (i) => { const th = lerp(-half, half, i / NS); return [arcR * Math.sin(th), -arcR * (1 - Math.cos(th)) * 0.9 + 0, th]; };
  const thick = 0.17, cam = 0.045;
  const yt = (x) => 5 * thick * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1015 * x ** 4);
  const camb = (x) => cam * 4 * x * (1 - x);
  const mkAttr = (n) => new THREE.BufferAttribute(new Float32Array(n * 3), 3);
  const nTop = (NS + 1) * (NC + 1), nBot = nTop;
  const top = new THREE.BufferGeometry(), bot = new THREE.BufferGeometry();
  top.setAttribute('position', mkAttr(nTop)); bot.setAttribute('position', mkAttr(nBot));
  const uvT = new Float32Array(nTop * 2);
  const idx = [], idxB = [];
  for (let i = 0; i <= NS; i++) for (let j = 0; j <= NC; j++) { uvT[(i * (NC + 1) + j) * 2] = i / NS; uvT[(i * (NC + 1) + j) * 2 + 1] = j / NC; }
  for (let i = 0; i < NS; i++) for (let j = 0; j < NC; j++) {
    const a = i * (NC + 1) + j, b = a + 1, c = a + NC + 1, d = c + 1;
    idx.push(a, b, c, b, d, c); idxB.push(a, c, b, b, c, d);
  }
  top.setIndex(idx); bot.setIndex(idxB);
  top.setAttribute('uv', new THREE.BufferAttribute(uvT, 2));
  const tex = stripeTex(colors, cells / 2);
  const topMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.65, side: THREE.DoubleSide, transparent: true, opacity: 0.93 });
  const botMat = new THREE.MeshStandardMaterial({ color: 0xe9edf5, roughness: 0.7, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
  const topM = new THREE.Mesh(top, topMat), botM = new THREE.Mesh(bot, botMat);
  topM.castShadow = true; g.add(topM, botM);
  // ribs: one flat polygon per cell wall
  const ribMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  const ribs = [];
  for (let r = 0; r <= cells; r++) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', mkAttr((NC + 1) * 2));
    const id = [];
    for (let j = 0; j < NC; j++) { const a = j * 2; id.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    geo.setIndex(id);
    const m = new THREE.Mesh(geo, ribMat); g.add(m); ribs.push({ m, i: Math.round((r / cells) * NS) });
  }
  // airflow marks through the intakes
  const flow = new THREE.Group(); g.add(flow);
  const st = { inflate: 1, bl: 0, br: 0 };
  const tl = []; // trailing-edge and attachment points the caller can use
  g.set = ({ inflate = st.inflate, bl = st.bl, br = st.br, clip = 0 } = {}) => {
    Object.assign(st, { inflate, bl, br });
    const pt = top.attributes.position, pb = bot.attributes.position;
    for (let i = 0; i <= NS; i++) {
      const [x, y0, th] = sx(i);
      const brake = lerp(bl, br, clamp((x / span) * 1.4 + 0.5, 0, 1));
      for (let j = 0; j <= NC; j++) {
        const u = j / NC; // 0 leading edge, 1 trailing edge
        const k = Math.pow(u, 0.9);
        const t = yt(k) * inflate + 0.012, c = camb(k) * (0.4 + 0.6 * inflate);
        const flap = brake * 0.34 * Math.pow(smooth((u - 0.55) / 0.45), 1.4);
        const z = -(chord / 2) + u * chord * (1 - 0.1 * brake * smooth((u - 0.6) / 0.4));
        // keep each section square to the chord line, nodding down around the arc
        const base = new THREE.Vector3(x, y0, z);
        const yTop = (c + t * chord) * 1.0 - flap * chord, yBot = (c - t * chord) * 1.0 - flap * chord;
        pt.setXYZ(i * (NC + 1) + j, base.x, base.y + yTop , base.z);
        // the lower surface skips the open mouth: it starts at 10 % chord
        const jb = u < 0.1 ? 0.1 : u;
        const kb = Math.pow(jb, 0.9);
        const tb = yt(kb) * inflate + 0.012, cb = camb(kb) * (0.4 + 0.6 * inflate);
        const zb = -(chord / 2) + jb * chord * (1 - 0.1 * brake * smooth((jb - 0.6) / 0.4));
        const flapb = brake * 0.34 * Math.pow(smooth((jb - 0.55) / 0.45), 1.4);
        pb.setXYZ(i * (NC + 1) + j, base.x, y0 + (cb - tb * chord) - flapb * chord, zb);
      }
    }
    pt.needsUpdate = true; pb.needsUpdate = true;
    top.computeVertexNormals(); bot.computeVertexNormals();
    ribs.forEach(({ m, i }) => {
      const p = m.geometry.attributes.position, [x, y0] = sx(i);
      const brake = lerp(bl, br, clamp((x / span) * 1.4 + 0.5, 0, 1));
      for (let j = 0; j <= NC; j++) {
        const u = j / NC, k = Math.pow(u, 0.9);
        const t = yt(k) * inflate + 0.012, c = camb(k) * (0.4 + 0.6 * inflate);
        const flap = brake * 0.34 * Math.pow(smooth((u - 0.55) / 0.45), 1.4);
        const z = -(chord / 2) + u * chord * (1 - 0.1 * brake * smooth((u - 0.6) / 0.4));
        const jb = u < 0.1 ? 0.1 : u, kb = Math.pow(jb, 0.9);
        const tb = yt(kb) * inflate + 0.012, cb = camb(kb) * (0.4 + 0.6 * inflate);
        p.setXYZ(j * 2, x, y0 + (c + t * chord) - flap * chord, z);
        p.setXYZ(j * 2 + 1, x, y0 + (cb - tb * chord) - flap * chord * (jb > 0.55 ? 1 : 0.0), -(chord / 2) + jb * chord * (1 - 0.1 * brake * smooth((jb - 0.6) / 0.4)));
      }
      p.needsUpdate = true;
    });
    void tl; void clip;
  };
  // a point on the lower surface: span fraction f (0..1), chord fraction u
  g.lowerPoint = (f, u) => {
    const i = Math.round(clamp(f, 0, 1) * NS), j = Math.round(clamp(u, 0, 1) * NC);
    const p = bot.attributes.position;
    return new THREE.Vector3(p.getX(i * (NC + 1) + j), p.getY(i * (NC + 1) + j), p.getZ(i * (NC + 1) + j));
  };
  g.arcY = (x) => -arcR * (1 - Math.sqrt(Math.max(0, 1 - (x / arcR) ** 2))) * 0.9;
  g.span = span; g.chord = chord; g.cells = cells; g.flow = flow;
  g.set({ inflate: 1 });
  return g;
}

// ---------------------------------------------------------------- a heads-up graph that sits on the camera
// The plane is a child of the camera, so it shows in the video frames too. w is its width as a fraction of
// the view height; the graph is drawn by draw(g, w, h) on a 2D canvas.
export function hud(stage, { aspect = 1.55, w = 0.62, pw = 560, anchor = 'br', draw }) {
  const ph = Math.round(pw / aspect);
  const cv = canvasTexture(pw, ph, (g, W, H) => draw(g, W, H));
  const mat = new THREE.MeshBasicMaterial({ map: cv.tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1 / aspect), mat);
  mesh.renderOrder = 999;
  const cam = stage.camera;
  if (!cam.parent) stage.scene.add(cam);
  cam.add(mesh);
  const D = 5;
  const api = {
    mesh, redraw: cv.redraw,
    place() {
      const vh = 2 * D * Math.tan((cam.fov * Math.PI) / 360), vw = vh * cam.aspect;
      let ww = Math.min(w * vh * aspect * 0.42, vw * 0.5); if (cam.aspect < 1) ww = vw * 0.62;
      mesh.scale.set(ww, ww, 1);
      const margin = 0.03 * vh, hh = ww / aspect;
      const x = anchor.includes('r') ? vw / 2 - ww / 2 - margin : -vw / 2 + ww / 2 + margin;
      const y = anchor.includes('b') ? -vh / 2 + hh / 2 + margin : vh / 2 - hh / 2 - margin;
      mesh.position.set(x, y, -D);
    },
    dispose() { cam.remove(mesh); mesh.geometry.dispose(); mat.dispose(); cv.tex.dispose(); },
  };
  api.place();
  return api;
}

// Small helpers for drawing on the heads-up canvases.
export function plot(g, W, H, { x0 = 46, y0 = 28, x1 = 14, y1 = 34, title = '', xlab = '', ylab = '' } = {}) {
  g.clearRect(0, 0, W, H);
  g.fillStyle = 'rgba(7,8,12,.82)'; g.beginPath(); g.roundRect(0, 0, W, H, 18); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = '#e8ecf4'; g.font = '600 20px Geist, system-ui, sans-serif'; g.textAlign = 'left'; g.fillText(title, 16, 28);
  g.fillStyle = '#9aa3b6'; g.font = '500 15px Geist, system-ui, sans-serif';
  if (xlab) { g.textAlign = 'right'; g.fillText(xlab, W - 14, H - 10); }
  if (ylab) { g.textAlign = 'left'; g.fillText(ylab, 16, 50); }
  const px = x0 + 6, py = 62, pr = W - x1 - 6, pb = H - y1 - 4;
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(px, py - 4); g.lineTo(px, pb); g.lineTo(pr, pb); g.stroke();
  return { px, py, pr, pb };
}
