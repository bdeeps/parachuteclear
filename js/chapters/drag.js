// Chapter 1: gravity against drag. A live drop: weight is constant, drag grows with the square of speed, and the
// jumper stops speeding up when the two are equal (terminal velocity). Drag F = 1/2 rho Cd A v^2. The drag areas
// (about 0.5 m2 belly-to-earth, 0.22 m2 head-down, about 39 m2 under a round canopy) are typical round values
// chosen to match reported speeds (roughly 190-200 km/h belly-to-earth, 5-7 m/s under canopy), not measurements.
import { THREE, M, COL, MASS, G, POSE, CANOPY, isa, vTerm, dragForce, fall, kmh, makeJumper, roundCanopy, hud, plot, rng, clamp, lerp, smooth } from '../chute.js';
import { arrow, swarm } from '../kit.js';

const EXIT = 4000, SC = 0.05, HOFF = 1.5;

export default {
  id: 'drag',
  short: 'Gravity vs drag',
  title: 'Gravity against drag',
  subtitle: 'A falling body speeds up until the air pushes back as hard as gravity pulls.',
  view: { pos: [7, 1.2, 8.5], target: [0, 0.6, 0] },
  learn: `<p>Jump out of a plane and gravity pulls you down with a steady force, your <b>weight</b>. At first you speed up by about <b>9.8 m/s every second</b>. But the faster you go, the harder the air pushes back. That push is <b>drag</b>, and it grows with the <b>square</b> of your speed: <b>F = ½ × ρ × Cd × A × v²</b>.</p>
    <p>Sooner or later drag equals weight. The forces balance, you stop speeding up, and you fall at a steady <b>terminal velocity</b>: <b>v = √(2mg ÷ (ρ·Cd·A))</b>. Belly to earth that is about <b>55 m/s (roughly 200 km/h)</b> near the ground. Tuck head down, so you present less area, and you fall faster.</p>
    <p>A parachute does not remove gravity. It adds a huge <b>drag area</b>, about eighty times bigger, so the balance point drops to <b>5 to 7 m/s</b>.</p>
    <p class="tip"><b>Try it:</b> watch the two arrows. Weight stays the same; drag grows until the arrows match. Switch to head down, then change the opening height and watch the graph.</p>
    <p class="note">A teaching model with round numbers for body and canopy drag. Real values vary with the person, the kit and the pose.</p>`,
  terms: [
    { t: 'Terminal velocity', d: 'The steady speed at which drag equals weight, so there is no more acceleration.' },
    { t: 'Drag area (Cd·A)', d: 'The drag coefficient times the frontal area. It sums up how much air a shape grabs.' },
    { t: 'Air density (ρ)', d: 'The mass of air per cubic metre. About 1.2 kg/m³ at sea level, and less higher up.' },
    { t: 'Free fall', d: 'The part of a skydive before the canopy opens, when only gravity and air drag act.' },
  ],
  defaults: { pose: 'belly', open: 900, speed: 6, forces: true },
  controls: [
    { key: 'pose', type: 'seg', label: 'Body position', options: [{ v: 'belly', label: 'Belly to earth' }, { v: 'head', label: 'Head down' }] },
    { key: 'open', type: 'range', label: 'Open the canopy at', min: 300, max: 2500, step: 50, fmt: (v) => `${v} m` },
    { key: 'speed', type: 'range', label: 'Time speed', min: 1, max: 10, step: 0.5, fmt: (v) => `×${v.toFixed(1)}` },
    { key: 'forces', type: 'toggle', label: 'Show the forces' },
    { key: 'again', type: 'buttons', label: 'Drop', items: [{ label: 'Jump again', act: (s, inst) => inst.reset() }] },
  ],
  quiz: [
    { q: 'What happens at terminal velocity?', options: ['Gravity switches off', 'Drag equals weight, so you stop speeding up', 'Drag is zero', 'You stop falling'], answer: 1, why: 'The forces balance. You still fall, but at a steady speed.' },
    { q: 'If you double your speed, drag becomes about…', options: ['The same', 'Twice as big', 'Four times as big', 'Half as big'], answer: 2, why: 'Drag depends on speed squared, so doubling speed quadruples it.' },
    { q: 'Why does a head-down skydiver fall faster than a belly-to-earth one?', options: ['Gravity is stronger head down', 'The body has a smaller drag area', 'The air is thinner', 'Heavier clothes'], answer: 1, why: 'Less area meets the air, so drag is smaller and it takes a higher speed to match weight.' },
    { q: 'A canopy slows you because it…', options: ['Cancels gravity', 'Adds a huge drag area, so the balance speed is much lower', 'Pushes air downward with a motor', 'Makes you lighter'], answer: 1, why: 'Terminal speed falls as drag area grows: v = √(2mg ÷ ρCdA).' },
  ],
  reel: [
    { ms: 5000, caption: 'Jump out and gravity pulls you down, faster every second.', set: { pose: 'belly', open: 900, speed: 6, forces: true }, act: (s, inst) => inst.reset(), view: { pos: [5, 0.9, 6.5], target: [0, 0.3, 0] }, spin: 0 },
    { ms: 4800, caption: 'Drag grows with speed squared, until it matches your weight. That is terminal velocity.', set: { speed: 6 }, view: { pos: [4.6, 0.9, 6.8], target: [0, 0.3, 0] }, spin: 0 },
    { ms: 5200, caption: 'A canopy adds around eighty times the drag area. You settle at about 5 to 7 m/s.', set: { open: 3900, speed: 5 }, view: { pos: [9, 3.2, 11], target: [0, 2.4, 0] }, spin: 0 },
  ],
  build({ stage, s }) {
    stage.floor.visible = false;
    const world = new THREE.Group(); stage.root.add(world);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), M.matte(0x3d6a45)); ground.rotation.x = -Math.PI / 2; world.add(ground);
    const grid = new THREE.GridHelper(500, 125, 0x6b9c72, 0x4f7f58); grid.position.y = 0.03; world.add(grid);
    const ringMat = M.glow(0xffffff, { transparent: true, opacity: 0.4 });
    for (let a = 500; a <= EXIT; a += 500) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.03, 8, 72), ringMat); r.rotation.x = Math.PI / 2; r.position.y = a * SC; world.add(r);
      stage.label(`${a} m`, [3.5, a * SC, 0], world, '');
    }
    const rand = rng(7);
    const dust = swarm(1100, new THREE.BoxGeometry(0.02, 0.5, 0.02), M.glow(0xffffff, { transparent: true, opacity: 0.45 }));
    for (let i = 0; i < 1100; i++) {
      let x, z; do { x = (rand() - 0.5) * 30; z = (rand() - 0.5) * 30; } while (Math.hypot(x, z) < 2.4);
      dust.place(i, [x, rand() * EXIT * SC, z]);
    }
    dust.done(); world.add(dust);
    const cloudMat = M.matte(0xffffff, { transparent: true, opacity: 0.85 });
    for (let i = 0; i < 26; i++) {
      const c = new THREE.Group(), cx = (rand() - 0.5) * 80, cz = (rand() - 0.5) * 80;
      if (Math.hypot(cx, cz) < 7) continue;
      for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(1.6 + rand() * 1.8, 14, 10), cloudMat); b.position.set((k - 1.5) * 2.2, rand(), rand() * 1.5); b.scale.y = 0.6; c.add(b); }
      c.position.set(cx, (700 + rand() * 3000) * SC, cz); world.add(c);
    }

    const J = makeJumper(); stage.root.add(J);
    const can = roundCanopy({ R: 3.2, L: 5, ventR: 0.3 }); can.position.y = 0.5; can.visible = false; stage.root.add(can);
    const wA = arrow(COL.amber, 1.6, 0.35, 0.05), dA = arrow(COL.cyan, 1.6, 0.35, 0.05);
    wA.rotation.x = Math.PI; wA.position.set(-1.3, 0.2, 0); dA.position.set(1.3, -0.2, 0);
    const arrows = new THREE.Group(); arrows.add(wA, dA); stage.root.add(arrows);
    const wl = stage.label('Weight', [-1.3, -1.9, 0], stage.root, 'hot');
    const dl = stage.label('Drag', [1.3, 1.9, 0], stage.root, 'hot');

    let sim, phase, cda, tOpen, hist, hT, hold, landed = 0, vmaxSeen = 0, frame = 0;
    const reset = () => {
      sim = { h: EXIT, v: 0, t: 0 }; phase = 'free'; cda = POSE[s.pose].cda; tOpen = 0; hist = []; hT = 0; hold = 0; vmaxSeen = 0;
      can.visible = false; J.pose(s.pose === 'head' ? 'head' : 'belly');
    };
    reset();

    const hudG = hud(stage, {
      anchor: 'br',
      draw(g, W, H) {
        const P = plot(g, W, H, { title: 'Speed and height', xlab: 'time (s)' });
        const h = hist || [];
        const tmax = Math.max(60, (h.length ? h[h.length - 1].t : 0) * 1.05), vmax = 90;
        const X = (t) => P.px + (t / tmax) * (P.pr - P.px), Y = (v) => P.pb - (v / vmax) * (P.pb - P.py);
        g.font = '500 14px Geist, system-ui, sans-serif'; g.fillStyle = '#9aa3b6'; g.textAlign = 'right';
        [0, 30, 60, 90].forEach((v) => { g.fillText(v, P.px - 6, Y(v) + 4); g.strokeStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.moveTo(P.px, Y(v)); g.lineTo(P.pr, Y(v)); g.stroke(); });
        if (sim && phase === 'free') {
          const vt = vTerm(MASS, cda, isa(sim.h).rho);
          g.setLineDash([6, 5]); g.strokeStyle = '#ffb547'; g.lineWidth = 2; g.beginPath(); g.moveTo(P.px, Y(vt)); g.lineTo(P.pr, Y(vt)); g.stroke(); g.setLineDash([]);
          g.fillStyle = '#ffb547'; g.textAlign = 'right'; g.fillText(`terminal ${vt.toFixed(0)} m/s`, P.pr - 4, Y(vt) - 6);
        }
        const line = (key, scale, col, wd) => {
          g.strokeStyle = col; g.lineWidth = wd; g.beginPath();
          h.forEach((p, i) => { const x = X(p.t), y = P.pb - (p[key] / scale) * (P.pb - P.py); i ? g.lineTo(x, y) : g.moveTo(x, y); });
          g.stroke();
        };
        line('hh', 1, '#ffd9a0', 2);
        line('v', vmax, '#8ef0ff', 3);
        g.textAlign = 'left'; g.fillStyle = '#8ef0ff'; g.fillText('speed (m/s)', P.px + 10, P.py + 14);
        g.fillStyle = '#ffd9a0'; g.fillText('height (thin)', P.px + 10, P.py + 32);
      },
    });

    return {
      reset,
      dispose() { hudG.dispose(); stage.floor.visible = true; },
      update(dt, st) {
        const sdt = dt * st.speed;
        if (phase !== 'landed') {
          const target = phase === 'free' ? POSE[st.pose].cda : CANOPY.area * CANOPY.cd;
          cda += (target - cda) * (1 - Math.exp(-(phase === 'free' ? 3 : 1.3) * sdt));
          fall(sim, sdt, MASS, cda);
          if (phase === 'free' && sim.h <= st.open) { phase = 'canopy'; can.visible = true; tOpen = 0; }
          if (phase === 'canopy') tOpen += sdt;
          if (sim.h <= 0) { phase = 'landed'; landed = sim.v; sim.v = 0; hold = 0; }
        } else { hold += dt; if (hold > 3.5) reset(); }
        vmaxSeen = Math.max(vmaxSeen, sim.v);
        hT += sdt;
        if (hT >= 0.25 && phase !== 'landed') { hT = 0; hist.push({ t: sim.t, v: sim.v, h: sim.h, hh: sim.h / EXIT * 90 }); }
        J.pose(phase === 'free' ? (st.pose === 'head' ? 'head' : 'belly') : 'hang', sdt, 2.5);
        const k = smooth(tOpen / 2.2);
        can.scale.set(lerp(0.2, 1, k), lerp(0.15, 1, k), lerp(0.2, 1, k));
        can.rotation.z = phase === 'free' ? 0 : 0.045 * Math.sin(sim.t * 0.9) * k;
        world.position.y = -sim.h * SC - HOFF;
        const rho = isa(sim.h).rho;
        const lc = clamp(dragForce(cda, rho, sim.v) / (MASS * G), 0, 3.6) * 1.6;
        wA.set(1.6); dA.set(Math.max(0.001, lc));
        arrows.visible = st.forces; wl.visible = dl.visible = st.forces;
        wl.element.style.display = dl.element.style.display = st.forces ? '' : 'none';
        wl.position.y = -1.9; dl.position.y = Math.max(0.6, lc - 0.2);
        stage.scene.background = new THREE.Color().setRGB(lerp(0.52, 0.2, sim.h / EXIT), lerp(0.75, 0.42, sim.h / EXIT), lerp(1, 0.78, sim.h / EXIT));
        if (!(frame++ % 3)) { hudG.place(); hudG.redraw(); }
      },
      readout() {
        const v = sim.v, rho = isa(sim.h).rho, vt = vTerm(MASS, cda, rho);
        const say = phase === 'landed' ? `Landed at ${landed.toFixed(1)} m/s, about the same as stepping off a ${(landed * landed / 2 / G).toFixed(1)} m wall.`
          : phase === 'canopy' ? 'Under the canopy: a huge drag area, so a gentle terminal speed.'
          : Math.abs(v - vt) / vt < 0.03 ? 'Drag equals weight. This is terminal velocity.' : 'Still speeding up: drag is smaller than weight.';
        return `<div class="big">${kmh(v)} km/h</div><p class="r-say">${say}</p>
          <div class="row"><span>Height</span><b>${Math.round(sim.h)} m</b></div>
          <div class="row"><span>Speed</span><b>${v.toFixed(1)} m/s</b></div>
          <div class="row"><span>Drag ÷ weight</span><b>${Math.round(dragForce(cda, rho, v) / (MASS * G) * 100)}%</b></div>
          <div class="row"><span>Terminal speed here</span><b>${vt.toFixed(1)} m/s</b></div>
          <div class="row"><span>Air density</span><b>${rho.toFixed(2)} kg/m³</b></div>`;
      },
    };
  },
};
