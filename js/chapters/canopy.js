// Chapter 2: canopy size and shape. A canopy works by drag area: the bigger the open canopy, the lower the speed
// at which drag balances weight. v = sqrt(2 m g / (rho Cd A)) with a round dome's Cd taken as 1.4 on its open
// (projected) area, a typical round figure. A hole at the top (the vent) lets air leave steadily, which
// calms the rocking a plain dome tends to get as it spills air first from one side and then the other. The
// rocking here is a cartoon of that effect, not a simulation of it.
import { THREE, M, COL, G, isa, makeJumper, roundCanopy, rng, clamp, lerp, approach } from '../chute.js';
import { swarm } from '../kit.js';

const CD = 1.4, RHO = 1.225;
const verdict = (v) => (v < 3.5 ? 'Very gentle, but you would drift a long way and a gust would carry you.' : v < 5 ? 'A soft landing.' : v < 7.5 ? 'About right for a landing on your feet.' : v < 10 ? 'Hard. You would land like a drop from a few metres.' : 'Far too fast to survive without injury.');

export default {
  id: 'canopy',
  short: 'Size and shape',
  title: 'Canopy size and shape',
  subtitle: 'More cloth means more drag area and a slower fall. A small hole at the top keeps it steady.',
  view: { pos: [14, 5, 22], target: [0, 4.2, 0] },
  learn: `<p>What slows you down is <b>drag area</b>: the drag coefficient times the area of the open canopy. Double the area and the speed at which drag balances weight drops by about <b>30 percent</b> (it goes as one over the square root of the area). A heavier load needs more cloth for the same landing speed.</p>
    <p>A <b>round canopy</b> is the classic shape. It is simple, cheap and very reliable, but it is a blunt dome: air spills from the rim, first on one side and then the other, so it tends to <b>rock</b>. A small <b>vent hole</b> at the crown lets some air escape steadily through the top. That smooths the flow and calms the swinging. Many round canopies have one.</p>
    <p>A <b>square ram-air canopy</b> is a different kind of thing. It is a wing, not a brake, and it steers and glides. The next chapter shows how.</p>
    <p class="tip"><b>Try it:</b> shrink the canopy until the landing speed gets scary, then add load. Turn the vent off and watch the canopy rock.</p>
    <p class="note">Teaching model: the drag coefficient is fixed at 1.4 on the open area, in sea-level air. Real canopies differ in cloth, shape and porosity.</p>`,
  terms: [
    { t: 'Canopy', d: 'The fabric part of a parachute that catches the air.' },
    { t: 'Vent', d: 'A hole at the top of a round canopy that lets air escape steadily.' },
    { t: 'Gore', d: 'One of the tapered panels that are sewn together to make a round canopy.' },
    { t: 'Suspension lines', d: 'The cords that join the canopy rim to the harness.' },
  ],
  defaults: { area: 28, load: 90, vent: true, speed: 3 },
  controls: [
    { key: 'area', type: 'range', label: 'Open canopy area', min: 6, max: 80, step: 1, fmt: (v) => `${v} m²` },
    { key: 'load', type: 'range', label: 'Total weight carried', min: 40, max: 160, step: 1, fmt: (v) => `${v} kg` },
    { key: 'vent', type: 'toggle', label: 'Vent hole at the top' },
    { key: 'speed', type: 'range', label: 'Time speed', min: 1, max: 6, step: 0.5, fmt: (v) => `×${v.toFixed(1)}` },
  ],
  quiz: [
    { q: 'If you make a canopy bigger, the steady descent speed…', options: ['Goes up', 'Goes down', 'Stays the same', 'Reaches zero'], answer: 1, why: 'More drag area means drag balances weight at a lower speed.' },
    { q: 'What does the vent hole in a round canopy mainly do?', options: ['Lets air out steadily, so the canopy rocks less', 'Lets the jumper breathe', 'Makes the canopy lighter', 'Speeds up the fall'], answer: 0, why: 'A steady flow out of the top stops air from spilling alternately round the rim.' },
    { q: 'A heavier load under the same canopy descends…', options: ['Slower', 'Faster', 'At the same speed', 'Not at all'], answer: 1, why: 'More weight needs more drag, which means a higher speed (v goes as the square root of the mass).' },
  ],
  reel: [
    { ms: 5200, caption: 'Bigger canopy, bigger drag area, slower fall. A small vent hole keeps it from rocking.', set: { area: 22, load: 90, vent: false, speed: 3 }, anim: { area: [14, 40] }, view: { pos: [14, 5, 22], target: [0, 4.2, 0] }, spin: 0.2 },
  ],
  build({ stage, s }) {
    stage.floor.visible = false;
    stage.scene.background = new THREE.Color(0x7fb8ff);
    const rand = rng(11);
    const dust = new THREE.Group(); stage.root.add(dust);
    const cell = swarm(260, new THREE.BoxGeometry(0.03, 0.9, 0.03), M.glow(0xffffff, { transparent: true, opacity: 0.55 }));
    for (let i = 0; i < 260; i++) { let x, z; do { x = (rand() - 0.5) * 50; z = (rand() - 0.5) * 50; } while (Math.hypot(x, z) < 6); cell.place(i, [x, rand() * 20, z]); }
    cell.done();
    const cells = [];
    for (let k = -2; k <= 2; k++) { const c = new THREE.Group(); c.add(cell.clone()); c.position.y = k * 20; dust.add(c); cells.push(c); }
    const pivot = new THREE.Group(); stage.root.add(pivot);
    const rig = new THREE.Group(); pivot.add(rig);
    const J = makeJumper(); J.pose('hang'); rig.add(J);
    let can = null, lastArea = -1, lastVent = null, off = 0, sway = 0.25, t = 0;
    const build = (st) => {
      if (can) { rig.remove(can); can.traverse((o) => { o.geometry?.dispose(); }); }
      const R = Math.sqrt(st.area / Math.PI);
      can = roundCanopy({ R, L: Math.max(3.2, R * 1.5), ventR: st.vent ? Math.max(0.2, R * 0.09) : 0, gores: 12 });
      can.position.y = 0.4; rig.add(can);
      const top = 0.4 + can.top;
      pivot.position.y = top; rig.position.y = -top;
      lastArea = st.area; lastVent = st.vent;
    };
    build(s);
    const rings = new THREE.Group(); stage.root.add(rings);
    return {
      update(dt, st) {
        if (st.area !== lastArea || st.vent !== lastVent) build(st);
        const v = Math.sqrt((2 * st.load * G) / (RHO * CD * st.area));
        const sdt = dt * st.speed;
        t += sdt; off = (off + v * sdt) % 20;
        dust.position.y = off;
        const tgt = st.vent ? 0.035 : 0.3;
        sway = approach(sway, tgt, 0.8, sdt);
        pivot.rotation.z = sway * Math.sin(t * 1.5);
        pivot.rotation.x = sway * 0.45 * Math.sin(t * 1.5 + 1.2);
        const R = Math.sqrt(st.area / Math.PI);
        can.dome.scale.y = 1 + (st.vent ? 0.0 : 0.05 * Math.sin(t * 3));
        void R;
      },
      readout(st) {
        const v = Math.sqrt((2 * st.load * G) / (RHO * CD * st.area));
        return `<div class="big">${v.toFixed(1)} m/s</div><p class="r-say">${verdict(v)}</p>
          <div class="row"><span>Descent speed</span><b>${Math.round(v * 3.6)} km/h</b></div>
          <div class="row"><span>Drag area (Cd × A)</span><b>${(CD * st.area).toFixed(0)} m²</b></div>
          <div class="row"><span>Like dropping from</span><b>${(v * v / 2 / G).toFixed(1)} m</b></div>
          <div class="row"><span>Canopy width</span><b>${(2 * Math.sqrt(st.area / Math.PI)).toFixed(1)} m</b></div>
          <div class="row"><span>Rocking</span><b class="${st.vent ? 'ok' : 'no'}">${st.vent ? 'calm' : 'swinging'}</b></div>`;
      },
      dispose() { stage.floor.visible = true; },
    };
  },
};
