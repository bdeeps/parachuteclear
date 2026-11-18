// Chapter 4: the deployment sequence. Pilot chute, bag, line stretch, inflation and slider, then the safety net:
// a cutaway to a reserve, and an automatic activation device (AAD) for a jumper who cannot act. The timings are
// round teaching numbers, not data for any system. The "drag ÷ weight" curve is the model's own: drag area grows
// as the canopy fills, and the slider simply makes that take longer, so the peak force is smaller. Real opening
// forces vary with speed, canopy, slider and packing.
import { THREE, M, COL, MASS, G, isa, vTerm, ramAir, roundCanopy, makeJumper, hud, plot, rng, clamp, lerp, smooth } from '../chute.js';
import { swarm } from '../kit.js';

const HC = 5.6, SCW = 0.05, CDA_MAIN = 38.7, AAD_ALT = 230;
const ease = (k) => smooth(clamp(k, 0, 1));
const cache = {};

// Work out the whole sequence (events and the speed/force curve) for a scenario.
function plan(scn, slider) {
  const key = scn + slider;
  if (cache[key]) return cache[key];
  const infl = slider ? 4.2 : 1.8, dt = 0.05;
  const mk = (pull, bag, iS, fail) => ({ pull, bag, iS, iE: iS + infl, sl0: iS + 0.5, sl1: iS + infl + 0.8, fail });
  const E = {};
  const h0 = scn === 'aad' ? 750 : 1500;
  if (scn !== 'aad') E.main = mk(1.0, 1.8, 3.0, scn === 'cutaway');
  if (scn === 'cutaway') { E.cut = 5.6; E.res = mk(E.cut + 0.6, E.cut + 1.2, E.cut + 2.1, false); }
  let h = h0, v = vTerm(MASS, 0.5, isa(h0).rho), tt = 0;
  const pr = (S, t) => (S ? ease((t - S.iS) / (S.iE - S.iS)) : 0);
  const out = { t: [], v: [], h: [], n: [] };
  let T = 60;
  for (let i = 0; tt < T && h > 0; i++) {
    let cda = 0.5;
    if (E.main && tt >= E.main.pull) cda += 0.08 * ease((tt - E.main.pull - 0.2) / 0.8);
    if (E.main && !(E.cut && tt >= E.cut)) cda += E.main.fail ? 3 * pr(E.main, tt) : CDA_MAIN * Math.pow(pr(E.main, tt), 2);
    if (E.res) cda += CDA_MAIN * Math.pow(pr(E.res, tt), 2);
    const rho = isa(h).rho, drag = 0.5 * rho * cda * v * v;
    out.t.push(tt); out.v.push(v); out.h.push(h); out.n.push(drag / (MASS * G));
    if (scn === 'aad' && !E.res && h <= AAD_ALT) { E.fire = tt; E.res = mk(tt + 0.15, tt + 0.6, tt + 1.5, false); }
    v += (G - drag / MASS) * dt; h -= v * dt; tt += dt;
    const last = E.res || E.main;
    if (last) T = Math.min(T, last.sl1 + 2.5);
    else T = 60;
  }
  const idx = out.t.length - 1;
  const res = { E, T: Math.min(T, out.t[idx]), out, peak: Math.max(...out.n), infl };
  const e = (t) => out.t.findIndex((x) => x >= t);
  res.at = (t) => { const i = clamp(Math.round(t / dt), 0, idx); return { v: out.v[i], h: out.h[i], n: out.n[i] }; };
  return (cache[key] = res);
}

function makeSet(colors, name) {
  const g = new THREE.Group();
  const wingG = new THREE.Group(); const W = ramAir({ span: 8.4, chord: 2.8, cells: 7, colors }); wingG.add(W); wingG.rotation.x = -0.17; g.add(wingG);
  const pc = roundCanopy({ R: 0.55, L: 0.75, ventR: 0.06, gores: 8, colors: ['#ffd166', '#ff7a59'] }); g.add(pc);
  const bag = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.32, 0.4), M.plastic(0x2b3345)); g.add(bag);
  const slider = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 0.42), M.plastic(0xffd166)); g.add(slider);
  const br = new THREE.BufferGeometry(); br.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const bridle = new THREE.Line(br, new THREE.LineBasicMaterial({ color: 0xffd166 })); bridle.frustumCulled = false; g.add(bridle);
  const NL = 32 * 2;
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NL * 6), 3));
  const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xe8edf8, transparent: true, opacity: 0.85 })); lines.frustumCulled = false; g.add(lines);
  const lbl = { pc: null };
  return { g, wingG, W, pc, bag, slider, bridle, br, lines, lg, name, lbl };
}

const R0 = new THREE.Vector3(0, 0.5, 0);
// Place one set's parts for time t. info: { pull, bag, iS, iE, sl0, sl1, fail }, cut: time the set is released.
function pose(S, t, info, cutAt, hasSlider, spin) {
  const { g, wingG, W, pc, bag, slider, br, lg } = S;
  const out = { p: 0, up: false, shown: false };
  const gone = cutAt != null && t >= cutAt;
  g.position.set(0, 0, 0); g.scale.setScalar(1);
  if (!info || t < info.pull) { g.visible = false; return out; }
  g.visible = true; out.shown = true;
  if (gone) { const k = t - cutAt; g.visible = k < 2.2; g.position.set(2.6 * k, 3.2 * k - 0.5 * k * k, 1.2 * k); g.scale.setScalar(Math.max(0.01, 1 - k / 2.4)); }
  const p = ease((t - info.iS) / (info.iE - info.iS));
  const pp = info.fail ? Math.min(p, 1) * 0.22 : p;
  out.p = pp;
  const bridleTop = new THREE.Vector3();
  const bgp = br.attributes.position;
  const lp = lg.attributes.position; let k = 0;
  if (t < info.iS) {
    // pilot chute out, then the bag drawn up with the lines paying out
    const tp = t < info.bag ? ease((t - info.pull) / (info.bag - info.pull)) : 1;
    const bk = t < info.bag ? 0 : ease((t - info.bag) / (info.iS - info.bag));
    const by = lerp(0.62, HC, bk);
    const pcY = t < info.bag ? lerp(0.7, 2.4, tp) : by + 2.2;
    bag.visible = true; bag.position.set(0, by, 0); bag.rotation.set(0, 0, 0);
    wingG.visible = false; slider.visible = false;
    pc.visible = true; pc.position.set(0, pcY, 0); const s = lerp(0.2, 1, tp); pc.scale.set(s, s, s);
    bgp.setXYZ(0, 0, by + 0.15, 0); bgp.setXYZ(1, 0, pcY, 0); bgp.needsUpdate = true;
    // two lines from the harness to the bag, paying out
    lp.setXYZ(k++, -0.15, 0.5, 0); lp.setXYZ(k++, -0.1, by - 0.1, 0);
    lp.setXYZ(k++, 0.15, 0.5, 0); lp.setXYZ(k++, 0.1, by - 0.1, 0);
    for (; k < lp.count; k++) lp.setXYZ(k, 0, 0.5, 0);
    lp.needsUpdate = true; lg.setDrawRange(0, 4);
    return out;
  }
  // canopy out of the bag and filling
  bag.visible = false;
  const spinA = info.fail ? spin * 4 : 0;
  wingG.visible = true;
  wingG.position.set(0, HC, 0);
  wingG.scale.set(info.fail ? lerp(0.12, 0.4, pp / 0.22) : lerp(0.14, 1, Math.pow(p, 0.8)), 1, 1);
  wingG.rotation.set(-0.17, spinA, 0);
  W.set({ inflate: lerp(0.04, 1, Math.pow(pp, 0.7)) });
  wingG.updateMatrix();
  pc.visible = true; const topY = HC + 1.2 + 0.0; pc.position.set(0, topY, 0); const ps = lerp(1, 0.3, p); pc.scale.set(ps, ps, ps);
  bgp.setXYZ(0, 0, HC + 0.1, 0); bgp.setXYZ(1, 0, topY, 0); bgp.needsUpdate = true;
  const sOn = hasSlider && !info.fail;
  const sy = sOn ? lerp(HC - 0.9, 1.35, ease((t - info.sl0) / (info.sl1 - info.sl0))) : 0;
  slider.visible = sOn; if (sOn) slider.position.set(0, sy, 0);
  const rL = new THREE.Vector3(-0.2, 0.55, 0), rR = new THREE.Vector3(0.2, 0.55, 0), q = new THREE.Vector3(), a = new THREE.Vector3();
  for (let r = 0; r <= 7; r++) for (let u = 0; u < 4; u++) {
    const f = r / 7;
    a.copy(W.lowerPoint(f, [0.12, 0.38, 0.62, 0.9][u])).applyMatrix4(wingG.matrix);
    const R = f < 0.5 ? rL : rR;
    const w = sOn ? clamp((sy - R.y) / Math.max(0.01, a.y - R.y), 0, 1) : 0.5;
    if (sOn) q.set(R.x + (a.x - R.x) * w * 0.12, lerp(R.y, a.y, w), R.z + (a.z - R.z) * w * 0.12); else q.copy(a).lerp(R, 0.5);
    lp.setXYZ(k++, a.x, a.y, a.z); lp.setXYZ(k++, q.x, q.y, q.z);
    lp.setXYZ(k++, q.x, q.y, q.z); lp.setXYZ(k++, R.x, R.y, R.z);
  }
  lg.setDrawRange(0, k);
  lp.needsUpdate = true;
  out.up = true;
  return out;
}

export default {
  id: 'deploy',
  short: 'Opening sequence',
  title: 'From pack to canopy',
  subtitle: 'Pilot chute, bag, line stretch, inflation. Then the safety net: reserve and AAD.',
  view: { pos: [11, 5, 14], target: [0, 3.6, 0] },
  learn: `<p>A canopy does not open all at once. Each stage hands over to the next. The jumper (or a spring) releases a small <b>pilot chute</b>. It catches the air and pulls the <b>bag</b> out of the container. The <b>lines</b> pay out until they are taut, which is <b>line stretch</b>. Only then does the canopy leave the bag and fill with air.</p>
    <p>Filling takes a moment, and the speed change is the <b>opening shock</b>. A <b>slider</b>, a small rectangle of fabric on the lines, starts near the canopy and slides down slowly because it catches air too. It holds the lines together at first, so the canopy spreads over a few seconds instead of in one snap. Same speed lost, longer time, lower peak force.</p>
    <p>If the main will not fly, the jumper <b>cuts it away</b> and deploys a separate <b>reserve</b>, packed by a rigger. If the jumper cannot act, an <b>automatic activation device (AAD)</b> measures height and fall speed. If a jumper is still falling fast near a set height, it fires a small cutter that frees the reserve.</p>
    <p class="tip"><b>Try it:</b> press play, then switch the slider off and compare the force curve. Try the other two stories too.</p>
    <p class="note">The timings and the force curve are a teaching model with round numbers. They are not data for any particular rig.</p>`,
  terms: [
    { t: 'Pilot chute', d: 'A small parachute that is thrown or springs out and drags the bag out of the container.' },
    { t: 'Line stretch', d: 'The moment the lines are fully out and pull tight, just before the canopy leaves the bag.' },
    { t: 'Slider', d: 'A rectangle of fabric on the lines that slides down slowly and so slows the canopy’s opening.' },
    { t: 'Reserve', d: 'A second, separately packed canopy for use if the main fails.' },
    { t: 'AAD', d: 'An automatic activation device that fires the reserve if a jumper is falling too low and too fast.' },
  ],
  defaults: { scn: 'normal', slider: true, t: 0, play: true, rate: 1 },
  onChange(s, key) { if (key === 'scn' || key === 'slider') { s.t = 0; s.play = true; } },
  controls: [
    { key: 'scn', type: 'seg', label: 'Story', options: [{ v: 'normal', label: 'Normal opening' }, { v: 'cutaway', label: 'Cutaway' }, { v: 'aad', label: 'AAD fires' }] },
    { key: 'slider', type: 'toggle', label: 'Slider fitted' },
    { key: 't', type: 'range', label: 'Sequence', min: 0, max: 1, step: 0.002, fmt: (v, s) => `${(v * plan(s.scn, s.slider).T).toFixed(1)} s` },
    { key: 'play', type: 'toggle', label: 'Play' },
    { key: 'rate', type: 'range', label: 'Speed', min: 0.25, max: 2, step: 0.05, fmt: (v) => `×${v.toFixed(2)}` },
  ],
  quiz: [
    { q: 'What does the pilot chute do?', options: ['Steers the main canopy', 'Catches air and pulls the bag and canopy out', 'Slows the fall to 6 m/s on its own', 'Measures height'], answer: 1, why: 'It is a small drogue that drags the bag out of the container.' },
    { q: 'What does a slider do?', options: ['Makes the canopy open faster', 'Slows the opening so the shock is smaller', 'Steers the canopy', 'Cuts the canopy away'], answer: 1, why: 'It slides down slowly, so the canopy spreads over a longer time and the peak force is lower.' },
    { q: 'What does an AAD do?', options: ['Opens the main at 3,000 m', 'Fires the reserve if the jumper is low and still falling fast', 'Steers the reserve', 'Replaces the pilot chute'], answer: 1, why: 'It senses height and speed and cuts the reserve’s closing loop if the jumper has not acted.' },
    { q: 'If the main canopy is twisted and will not fly, the jumper should…', options: ['Wait', 'Cut it away and open the reserve', 'Open a second main on top', 'Pull both toggles'], answer: 1, why: 'The reserve is a separate canopy made for exactly this case. Jumpers are trained to decide by a set height.' },
  ],
  reel: [
    { ms: 5600, caption: 'A small pilot chute drags the bag out. Then the lines stretch tight and the canopy fills.', set: { scn: 'normal', slider: true, play: false, rate: 1 }, anim: { t: [0.04, 0.62] }, view: { pos: [11, 5, 14], target: [0, 3.6, 0] }, spin: 0 },
    { ms: 5400, caption: 'If the main fails, cut it away and open the reserve. An AAD does it automatically if you cannot.', set: { scn: 'aad', slider: true, play: false }, anim: { t: [0.1, 0.95] }, view: { pos: [11, 4.6, 14], target: [0, 3.6, 0] }, spin: 0 },
  ],
  build({ stage, s }) {
    stage.floor.visible = false;
    stage.scene.background = new THREE.Color(0x77b3ff);
    const world = new THREE.Group(); stage.root.add(world);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), M.matte(0x3d6a45)); ground.rotation.x = -Math.PI / 2; world.add(ground);
    const grid = new THREE.GridHelper(900, 225, 0x6b9c72, 0x4f7f58); grid.position.y = 0.03; world.add(grid);
    const ringMat = M.glow(0xffffff, { transparent: true, opacity: 0.4 });
    for (let a = 100; a <= 1600; a += 100) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.03, 8, 72), ringMat); r.rotation.x = Math.PI / 2; r.position.y = a * SCW; world.add(r);
      stage.label(`${a} m`, [4.4, a * SCW, 0], world, '');
    }
    const rand = rng(3);
    const dust = swarm(900, new THREE.BoxGeometry(0.02, 0.5, 0.02), M.glow(0xffffff, { transparent: true, opacity: 0.45 }));
    for (let i = 0; i < 900; i++) { let x, z; do { x = (rand() - 0.5) * 30; z = (rand() - 0.5) * 30; } while (Math.hypot(x, z) < 3); dust.place(i, [x, rand() * 1600 * SCW, z]); }
    dust.done(); world.add(dust);
    const J = makeJumper(); stage.root.add(J);
    const main = makeSet(['#ff8a3d', '#f4f6fa'], 'Main'), res = makeSet(['#ff4d6d', '#ffe9ee'], 'Reserve');
    stage.root.add(main.g, res.g);
    const labMain = stage.label('Main canopy', [0, HC + 1.9, 0], main.g, ''), labRes = stage.label('Reserve canopy', [0, HC + 1.9, 0], res.g, '');
    const labPC = stage.label('Pilot chute', [0.9, 0.2, 0], main.pc, ''), labSl = stage.label('Slider', [0.8, 0, 0], main.slider, '');
    const aad = stage.label('AAD', [0, 1.05, 0], J, 'hot');
    let cur = null, hold = 0, frame = 0, spin = 0, ring = null;
    const flash = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.04, 8, 40), M.glow(COL.amber)); flash.visible = false; stage.root.add(flash);
    const hudG = hud(stage, {
      anchor: 'br', aspect: 1.5,
      draw(g, W, H) {
        const P = plot(g, W, H, { title: 'Speed and drag ÷ weight', xlab: 'time (s)' });
        if (!cur) return;
        const pl = cur.plan, tmax = pl.T, o = pl.out, vmax = 70, nmax = Math.max(4, Math.ceil(pl.peak));
        const X = (t) => P.px + (t / tmax) * (P.pr - P.px);
        const n = o.t.length;
        g.lineWidth = 3; g.strokeStyle = '#8ef0ff'; g.beginPath();
        for (let i = 0; i < n && o.t[i] <= tmax; i++) { const x = X(o.t[i]), y = P.pb - (o.v[i] / vmax) * (P.pb - P.py); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
        g.strokeStyle = '#ffb547'; g.beginPath();
        for (let i = 0; i < n && o.t[i] <= tmax; i++) { const x = X(o.t[i]), y = P.pb - (o.n[i] / nmax) * (P.pb - P.py); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
        const sec = cur.sec, cx = X(sec); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, P.py); g.lineTo(cx, P.pb); g.stroke();
        g.font = '500 14px Geist, system-ui, sans-serif'; g.textAlign = 'left'; g.fillStyle = '#8ef0ff'; g.fillText('speed (m/s)', P.px + 10, P.py + 14); g.fillStyle = '#ffb547'; g.fillText(`drag ÷ weight (peak ${pl.peak.toFixed(1)})`, P.px + 10, P.py + 32);
      },
    });
    const syncSlider = (s) => {
      const el = document.querySelector('#panel input[aria-label="Sequence"]'); if (!el) return;
      el.value = s.t; el.style.setProperty('--p', s.t * 100 + '%');
      const out = el.closest('.ctl')?.querySelector('output'); if (out) out.textContent = `${(s.t * plan(s.scn, s.slider).T).toFixed(1)} s`;
      const pl = document.querySelector('#panel input[aria-label="Play"]'); if (pl) pl.checked = !!s.play;
    };
    return {
      dispose() { hudG.dispose(); stage.floor.visible = true; },
      update(dt, st) {
        const pl = plan(st.scn, st.slider);
        if (st.play) {
          if (st.t >= 1) { hold += dt; if (hold > 1.8) { st.t = 0; hold = 0; } }
          else st.t = Math.min(1, st.t + (dt * st.rate) / pl.T);
        }
        const sec = st.t * pl.T, E = pl.E, a = pl.at(sec);
        spin += dt;
        const om = pose(main, sec, E.main, E.cut, st.slider, spin);
        const or = pose(res, sec, E.res, null, st.slider, spin);
        const up = (om.up && !E.main?.fail) || or.up;
        const upK = or.up ? or.p : om.up && !E.main?.fail ? om.p : 0;
        J.pose(upK > 0.35 ? 'hang' : 'belly', dt, 4);
        J.position.y = 0;
        world.position.y = -a.h * SCW - 1.4;
        labMain.visible = !!(om.up && st.scn !== 'aad');
        labRes.visible = !!(or.up);
        labPC.visible = !!(om.shown && !om.up);
        labSl.visible = !!(st.slider && om.up && !E.main?.fail && sec < E.main.sl1 + 1);
        aad.visible = !!(st.scn === 'aad');
        const fireK = E.fire != null ? sec - E.fire : -1;
        flash.visible = fireK >= 0 && fireK < 0.6; if (flash.visible) { flash.position.set(0, 0.6, 0); flash.rotation.x = Math.PI / 2; flash.scale.setScalar(1 + fireK * 4); }
        cur = { plan: pl, sec, a, om, or, st };
        if (!(frame++ % 3)) { hudG.place(); hudG.redraw(); syncSlider(st); }
        void up; void ring;
      },
      readout(st) {
        const pl = plan(st.scn, st.slider), sec = st.t * pl.T, E = pl.E, a = pl.at(sec);
        const phase = (S, pre) => (sec < S.pull ? null : sec < S.bag ? `${pre}Pilot chute thrown: it catches the air.` : sec < S.iS ? `${pre}The bag is drawn out and the lines pay out (line stretch).` : sec < S.iE ? `${pre}${S.fail ? 'The canopy is twisted and will not fly.' : 'The canopy fills: opening shock.'}` : sec < S.sl1 ? `${pre}${st.slider ? 'The slider slides down the lines.' : 'The canopy is open.'}` : `${pre}Flying under canopy.`);
        let say = 'Falling belly to earth.';
        if (st.scn === 'aad') say = !E.res ? 'Falling, with nobody acting.' : sec < E.fire ? 'Falling, with nobody acting. The AAD is watching height and speed.' : sec < E.fire + 0.3 ? 'AAD fires: its cutter frees the reserve.' : phase(E.res, 'Reserve: ');
        else if (st.scn === 'cutaway') say = sec >= E.res.pull ? phase(E.res, 'Reserve: ') : sec >= E.cut ? 'Cutaway: the failed main is released.' : phase(E.main, '') || say;
        else say = phase(E.main, '') || say;
        return `<div class="big">${Math.round(a.v * 3.6)} km/h</div><p class="r-say">${say}</p>
          <div class="row"><span>Height</span><b>${Math.round(a.h)} m</b></div>
          <div class="row"><span>Speed</span><b>${a.v.toFixed(1)} m/s</b></div>
          <div class="row"><span>Drag ÷ weight now</span><b>${a.n.toFixed(1)}</b></div>
          <div class="row"><span>Peak (this model)</span><b>${pl.peak.toFixed(1)}</b></div>
          <div class="row"><span>Slider</span><b class="${st.slider ? 'ok' : 'no'}">${st.slider ? 'on' : 'off'}</b></div>`;
      },
    };
  },
};
