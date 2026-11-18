// Chapter 5: atmosphere and altitude. Air gets thin with height, so the same body falls much faster up high
// (terminal speed goes as one over the square root of the air density). From very high, a jumper keeps speeding
// up through thin air and only slows once the air thickens. This uses the International Standard Atmosphere
// and the same drag law as chapter 1, with fixed drag areas and no change in drag near the speed of sound
// (which real bodies have), so it is a rough picture of the real record jumps, not a replay. Records: Kittinger
// 1960, about 31.3 km; Baumgartner 2012, about 38.97 km and about Mach 1.25; Eustace 2014, about 41.4 km.
import { THREE, M, COL, MASS, G, POSE, isa, vTerm, fall, kmh, makeJumper, hud, plot, rng, clamp, lerp } from '../chute.js';
import { swarm, canvasTexture } from '../kit.js';

const TOP = 42, STOP = 2500;
const MARKS = [
  { h: 4, n: 'Normal skydive exit, about 4 km' },
  { h: 8.85, n: 'Mount Everest, 8.85 km' },
  { h: 11, n: 'Airliner cruise, about 11 km' },
  { h: 31.3, n: 'Kittinger 1960, 31.3 km' },
  { h: 38.97, n: 'Baumgartner 2012, 38.97 km' },
  { h: 41.4, n: 'Eustace 2014, 41.4 km' },
];

export default {
  id: 'altitude',
  short: 'Altitude and thin air',
  title: 'Why height changes everything',
  subtitle: 'Thin air gives drag little to push on, so you fall faster up high.',
  view: { pos: [38, 24, 66], target: [0, 20, 0] },
  learn: `<p>Drag depends on <b>air density</b>. At sea level a cubic metre of air weighs about 1.2 kg. At 11 km, the height of an airliner, it is about a third of that. At 39 km it is under <b>half of one percent</b>. Terminal speed goes as one over the square root of the density, so the same body that falls at 55 m/s near the ground can fall at <b>several times that</b> in thin air.</p>
    <p>That is why a jump from the edge of space is so different. <b>Joseph Kittinger</b> stepped out at about 31 km in 1960. <b>Felix Baumgartner</b> jumped from about 39 km in 2012 and went faster than sound, around <b>Mach 1.25</b>. <b>Alan Eustace</b> went higher still in 2014. In the thin air at the top there is almost nothing to push on, so they keep speeding up. Only when the air thickens lower down does drag catch up and slow them.</p>
    <p>The same thin-air problem shapes <b>spacecraft and cargo drops</b>. A capsule returning to Earth, or a heavy pallet dropped from a plane, needs a canopy sized for the air it will meet. On Mars the air is so thin that landers need much larger parachutes, and even then they need rockets to finish the job.</p>
    <p class="tip"><b>Try it:</b> drop from 39 km head down and watch the graph. The cyan line is your speed. The amber line is the speed you would fall at if the air were the same all the way. Where they meet, your speed peaks.</p>
    <p class="note">Rough model: standard-atmosphere air and fixed drag areas. Real jumpers change position, and drag changes near the speed of sound, so results differ from the records.</p>`,
  terms: [
    { t: 'Air density', d: 'The mass of air in each cubic metre. It falls steadily with height.' },
    { t: 'Standard atmosphere', d: 'An agreed model of how temperature, pressure and density change with height, used in aviation.' },
    { t: 'Mach number', d: 'Speed divided by the local speed of sound. Mach 1 is the speed of sound.' },
    { t: 'Drogue', d: 'A small stabilising parachute that keeps a high-altitude jumper from spinning.' },
  ],
  defaults: { exit: 39, pose: 'head', speed: 14, air: true },
  controls: [
    { key: 'exit', type: 'range', label: 'Jump from', min: 4, max: 41, step: 0.5, fmt: (v) => `${v.toFixed(1)} km` },
    { key: 'pose', type: 'seg', label: 'Body position', options: [{ v: 'belly', label: 'Belly to earth' }, { v: 'head', label: 'Head down' }] },
    { key: 'speed', type: 'range', label: 'Time speed', min: 2, max: 30, step: 1, fmt: (v) => `×${v}` },
    { key: 'air', type: 'toggle', label: 'Show the air' },
    { key: 'again', type: 'buttons', label: 'Drop', items: [{ label: 'Jump again', act: (s, inst) => inst.reset() }] },
  ],
  quiz: [
    { q: 'Why can a jumper from 39 km go faster than from 4 km?', options: ['Gravity is stronger', 'The air is far thinner, so drag is small at first', 'They are heavier', 'They have a bigger canopy'], answer: 1, why: 'Drag depends on density. With little air to push on, they keep speeding up for longer.' },
    { q: 'How does air density change as you go up?', options: ['It stays the same', 'It increases', 'It falls steadily', 'It drops to zero at 5 km'], answer: 2, why: 'There is less air above you the higher you go, so the air is thinner.' },
    { q: 'Where does a jumper from very high up reach top speed?', options: ['At the exit', 'Where drag has caught up with weight, as the air thickens', 'At the ground', 'Just after opening'], answer: 1, why: 'Speed peaks when drag rises to equal weight, and then it falls as the air gets thicker.' },
  ],
  reel: [
    { ms: 6000, caption: 'Air thins with height. From 39 km there is almost nothing to push on, so a jumper keeps speeding up.', set: { exit: 39, pose: 'head', speed: 12, air: true }, act: (s, inst) => inst.reset(), view: { pos: [26, 30, 46], target: [0, 29, 0] }, spin: 0 },
  ],
  build({ stage, s }) {
    stage.floor.visible = true;
    const grad = canvasTexture(4, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#02030a'); gr.addColorStop(0.15, '#07103a'); gr.addColorStop(0.45, '#1b4a9a'); gr.addColorStop(0.8, '#5aa2ee'); gr.addColorStop(1, '#a9d5ff');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
    stage.scene.background = grad.tex;
    const rand = rng(9);
    const rho0 = isa(0).rho, dots = swarm(2400, new THREE.SphereGeometry(0.07, 6, 4), M.glow(0xffffff, { transparent: true, opacity: 0.7 }));
    dots.castShadow = false;
    let n = 0;
    while (n < 2400) { const y = rand() * TOP; if (rand() < isa(y * 1000).rho / rho0) { dots.place(n, [(rand() - 0.5) * 16, y, (rand() - 0.5) * 8 - 2]); n++; } }
    dots.done(); stage.root.add(dots);
    // marks
    MARKS.forEach((m) => {
      const r = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.05, 6, 64), M.glow(0xffb547, { transparent: true, opacity: 0.55 })); r.rotation.x = Math.PI / 2; r.position.y = m.h; stage.root.add(r);
      stage.label(m.n, [-6.2, m.h, 0], stage.root, '');
    });
    // density curve
    const dp = []; for (let h = 0; h <= TOP; h += 0.5) dp.push(new THREE.Vector3(-14 + (isa(h * 1000).rho / rho0) * 10, h, 4));
    stage.root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(dp), new THREE.LineBasicMaterial({ color: 0x8ef0ff })));
    stage.root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-14, 0, 4), new THREE.Vector3(-14, TOP, 4)]), new THREE.LineBasicMaterial({ color: 0x6b7388 })));
    stage.label('Air density', [-11, TOP + 1.5, 4], stage.root, 'hot');
    const me = new THREE.Mesh(new THREE.SphereGeometry(0.8, 20, 14), M.glow(COL.coral)); stage.root.add(me);
    stage.label('You', [0, 1.3, 0], me, 'hot');
    const MAXP = 1600;
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAXP * 3), 3)); tg.setDrawRange(0, 0);
    const trail = new THREE.Line(tg, new THREE.LineBasicMaterial({ color: COL.coral })); trail.frustumCulled = false; stage.root.add(trail);

    let sim, path, pT, done, hold, vmax, tmax, mmax, frame = 0;
    const reset = () => { sim = { h: s.exit * 1000, v: 0, t: 0 }; path = []; pT = 0; done = false; hold = 0; vmax = 0; tmax = 0; mmax = 0; tg.setDrawRange(0, 0); };
    reset();
    const hudG = hud(stage, {
      anchor: 'tr', aspect: 0.95, pw: 480,
      draw(g, W, H) {
        const P = plot(g, W, H, { title: 'Speed against height', xlab: 'speed (m/s)' });
        const vmaxA = 450, X = (v) => P.px + (v / vmaxA) * (P.pr - P.px), Y = (hk) => P.pb - (hk / TOP) * (P.pb - P.py);
        g.font = '500 13px Geist, system-ui, sans-serif'; g.textAlign = 'right'; g.fillStyle = '#9aa3b6';
        [0, 10, 20, 30, 40].forEach((hk) => { g.fillText(`${hk} km`, P.px - 6, Y(hk) + 4); g.strokeStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.moveTo(P.px, Y(hk)); g.lineTo(P.pr, Y(hk)); g.stroke(); });
        const cda = POSE[s.pose].cda;
        const curve = (f, col, dash) => { g.strokeStyle = col; g.lineWidth = 2.5; g.setLineDash(dash || []); g.beginPath(); let st = false; for (let hk = 0; hk <= TOP; hk += 0.5) { const v = f(hk * 1000); if (v > vmaxA) { st = false; continue; } const x = X(v), y = Y(hk); st ? g.lineTo(x, y) : g.moveTo(x, y); st = true; } g.stroke(); g.setLineDash([]); };
        curve((h) => isa(h).a, 'rgba(255,255,255,.6)', [5, 5]);
        curve((h) => vTerm(MASS, cda, isa(h).rho), '#ffb547');
        g.strokeStyle = '#8ef0ff'; g.lineWidth = 3.5; g.beginPath();
        (path || []).forEach((p, i) => { const x = X(p.v), y = Y(p.h / 1000); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
        if (sim) { g.fillStyle = '#ff7a59'; g.beginPath(); g.arc(X(sim.v), Y(sim.h / 1000), 5, 0, 7); g.fill(); }
        g.textAlign = 'left'; g.font = '500 13px Geist, system-ui, sans-serif';
        g.fillStyle = '#8ef0ff'; g.fillText('your speed', P.px + 10, P.py + 12); g.fillStyle = '#ffb547'; g.fillText('terminal speed in the air at that height', P.px + 10, P.py + 28); g.fillStyle = '#d6dbe8'; g.fillText('speed of sound', P.px + 10, P.py + 44);
      },
    });
    return {
      reset,
      dispose() { hudG.dispose(); stage.floor.visible = true; },
      update(dt, st) {
        const sdt = Math.min(dt * st.speed, 0.5);
        if (!done) {
          fall(sim, sdt, MASS, POSE[st.pose].cda);
          pT += sdt;
          const a = isa(sim.h).a;
          vmax = Math.max(vmax, sim.v); mmax = Math.max(mmax, sim.v / a);
          if (pT >= 0.25) { pT = 0; if (path.length < MAXP) { path.push({ v: sim.v, h: sim.h }); const pos = tg.attributes.position; pos.setXYZ(path.length - 1, 0.3, sim.h / 1000, 0.4); pos.needsUpdate = true; tg.setDrawRange(0, path.length); } }
          if (sim.h <= STOP) { done = true; hold = 0; tmax = sim.t; }
        } else { hold += dt; if (hold > 4) reset(); }
        me.position.y = sim.h / 1000;
        dots.visible = st.air;
        if (!(frame++ % 3)) { hudG.place(); hudG.redraw(); }
      },
      readout(st) {
        const I = isa(sim.h), a = I.a;
        const say = done ? `Reached ${Math.round(sim.h)} m after ${Math.floor(sim.t / 60)} min ${Math.round(sim.t % 60)} s. Top speed ${Math.round(vmax)} m/s (${kmh(vmax)} km/h), Mach ${mmax.toFixed(2)}.`
          : sim.v / a > 1 ? 'Faster than the speed of sound.' : sim.v < vTerm(MASS, POSE[st.pose].cda, I.rho) * 0.97 ? 'Still speeding up: drag is smaller than weight.' : 'Drag has caught up with weight.';
        return `<div class="big">${kmh(sim.v)} km/h</div><p class="r-say">${say}</p>
          <div class="row"><span>Height</span><b>${(sim.h / 1000).toFixed(1)} km</b></div>
          <div class="row"><span>Speed</span><b>${sim.v.toFixed(0)} m/s · Mach ${(sim.v / a).toFixed(2)}</b></div>
          <div class="row"><span>Air density</span><b>${(I.rho / rho0 * 100).toFixed(1)}% of sea level</b></div>
          <div class="row"><span>Terminal speed here</span><b>${Math.round(vTerm(MASS, POSE[st.pose].cda, I.rho))} m/s</b></div>`;
      },
    };
  },
};
