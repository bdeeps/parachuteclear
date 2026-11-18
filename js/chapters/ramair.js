// Chapter 3: how a ram-air canopy flies. A square canopy is an inflatable wing. Forward speed rams air into the open
// front of its cells, which puffs it into an aerofoil that makes lift. A sport canopy glides forward roughly three
// metres for each metre it sinks (the figure varies a lot between canopies, loads and wind). The toggles pull the
// trailing edge down: one side turns the canopy, both slow it, and a quick pull near the ground (the flare) trades
// speed for lift to soften the landing. The numbers here (about 12 m/s forward, 4 m/s down at full flight) are
// round, typical values for a teaching model, not data for any canopy.
import { THREE, M, COL, ramAir, makeJumper, hud, rng, clamp, lerp, smooth, approach } from '../chute.js';
import { swarm } from '../kit.js';

const TARGET = 330, START = 120;
const trim = (b, inf) => ({ vf: (12 - 6.5 * b) * (0.45 + 0.55 * inf), vs: 4 + 0.8 * b + (b > 0.85 ? (b - 0.85) * 9 : 0) + (1 - inf) * 9 });

export default {
  id: 'ramair',
  short: 'How a ram-air wing flies',
  title: 'A parachute that flies',
  subtitle: 'Air rams into the cells and makes a wing. The toggles steer it and soften the landing.',
  view: { pos: [11, 5, 14], target: [0, 3.4, 0] },
  learn: `<p>A modern sport canopy is a <b>ram-air</b> wing. It is two layers of fabric joined by <b>ribs</b> into a row of <b>cells</b>, open at the front. As it moves forward, air is <b>rammed</b> into the cells and puffs the wing into the shape of an <b>aerofoil</b>. The air flowing over it makes <b>lift</b>, so it glides instead of just dropping.</p>
    <p>A typical sport canopy goes about <b>three metres forward for each metre down</b>, a <b>glide ratio</b> of roughly 3 to 1 (it varies, from about 2 for a student canopy to well above 3). That is why you can steer to a spot, fly into the wind and choose where to land.</p>
    <p>The <b>toggles</b> pull the trailing edge down. Pull one and that side drags more, so the canopy <b>turns</b>. Pull both and it slows. Just above the ground a quick, full pull called the <b>flare</b> trades forward speed for lift, so you touch down gently.</p>
    <p class="tip"><b>Try it:</b> pull the right toggle to turn onto the target. Set the flare height too high or too low and see how the touchdown changes. Drop the cell pressure to see why the wing needs ram air.</p>
    <p class="note">A simplified flight model with round numbers. Real canopies differ a great deal.</p>`,
  terms: [
    { t: 'Ram air', d: 'Air forced into the open front of the cells by the canopy’s forward motion, which keeps the wing inflated.' },
    { t: 'Aerofoil', d: 'A wing-shaped section that makes lift when air flows over it.' },
    { t: 'Glide ratio', d: 'Distance travelled forward for each unit of height lost. 3:1 means three metres on for one down.' },
    { t: 'Toggle', d: 'The handle at the end of a brake line that pulls the trailing edge down.' },
    { t: 'Flare', d: 'A strong, smooth pull of both toggles just before landing to cut the speed.' },
  ],
  defaults: { bl: 0, br: 0, flareAt: 3, inflate: 1, air: true, speed: 2 },
  controls: [
    { key: 'bl', type: 'range', label: 'Left toggle', min: 0, max: 1, step: 0.01, fmt: (v) => `${Math.round(v * 100)}%` },
    { key: 'br', type: 'range', label: 'Right toggle', min: 0, max: 1, step: 0.01, fmt: (v) => `${Math.round(v * 100)}%` },
    { key: 'flareAt', type: 'range', label: 'Flare at height', min: 0, max: 10, step: 0.5, fmt: (v) => (v === 0 ? 'No flare' : `${v.toFixed(1)} m`), hint: 'The flare pulls both toggles fully when you drop below this height.' },
    { key: 'inflate', type: 'range', label: 'Air pressure in the cells', min: 0, max: 1, step: 0.01, fmt: (v) => (v > 0.9 ? 'Full' : `${Math.round(v * 100)}%`) },
    { key: 'air', type: 'toggle', label: 'Show the air' },
    { key: 'speed', type: 'range', label: 'Time speed', min: 0.5, max: 4, step: 0.5, fmt: (v) => `×${v.toFixed(1)}` },
    { key: 'again', type: 'buttons', label: 'Flight', items: [{ label: 'Fly again', act: (s, inst) => inst.reset(START) }] },
  ],
  quiz: [
    { q: 'What keeps a ram-air canopy inflated?', options: ['Helium', 'Air rammed into the open front of the cells', 'A motor', 'Stiff plastic'], answer: 1, why: 'The forward motion pushes air into the cells, and the pressure holds the aerofoil shape.' },
    { q: 'A glide ratio of 3:1 means…', options: ['It sinks 3 m for each metre forward', 'It moves about 3 m forward for each metre it sinks', 'It flies for 3 minutes', 'It weighs 3 kg per metre'], answer: 1, why: 'Glide ratio is forward distance divided by height lost.' },
    { q: 'How do you turn a ram-air canopy?', options: ['Lean back', 'Pull the toggle on one side', 'Open the vent', 'Pull both toggles'], answer: 1, why: 'One toggle drags that side’s trailing edge down, so the canopy turns toward it.' },
    { q: 'What is the flare for?', options: ['To speed up', 'To trade forward speed for lift just before landing', 'To open the canopy', 'To cut away'], answer: 1, why: 'A strong, smooth pull of both toggles slows the canopy and briefly lifts it, so the landing is gentle.' },
  ],
  reel: [
    { ms: 5400, caption: 'A square canopy is an inflatable wing. Air rams into its cells and puffs up an aerofoil.', set: { bl: 0, br: 0, flareAt: 3, air: true, speed: 2 }, anim: { inflate: [0.05, 1] }, act: (s, inst) => inst.reset(START), view: { pos: [9, 6.8, 11], target: [0, 5.3, 0] }, spin: 0.35 },
    { ms: 5600, caption: 'It glides about three metres for every one it sinks. Pull a toggle to turn, and flare to land.', set: { bl: 0, flareAt: 3, inflate: 1, air: false, speed: 2.5 }, anim: { br: [0, 0.35] }, act: (s, inst) => inst.reset(26), view: { pos: [13, 4.5, 17], target: [0, 3.4, 0] }, spin: 0 },
  ],
  build({ stage, s }) {
    stage.floor.visible = false;
    stage.scene.background = new THREE.Color(0x86bdff);
    const world = new THREE.Group(); stage.root.add(world);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), M.matte(0x44704a)); ground.rotation.x = -Math.PI / 2; world.add(ground);
    const grid = new THREE.GridHelper(1600, 160, 0x78a97e, 0x5b8c62); grid.position.y = 0.03; world.add(grid);
    const pad = new THREE.Group(); pad.position.set(0, 0.05, -TARGET); world.add(pad);
    [14, 9, 4].forEach((r, i) => { const m = new THREE.Mesh(new THREE.RingGeometry(r - 1.1, r, 48), M.glow([0xff7a59, 0xffffff, 0xff7a59][i], { side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; pad.add(m); });
    stage.label('Landing target', [0, 2.2, 0], pad, 'hot');
    const rand = rng(5);
    for (let i = 0; i < 40; i++) {
      const tr = new THREE.Group(), x = (rand() - 0.5) * 500, z = -rand() * 700 + 100;
      if (Math.abs(x) < 25 && Math.abs(z + TARGET) < 40) continue;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 3, 8), M.matte(0x6a4a2c)); trunk.position.y = 1.5;
      const crown = new THREE.Mesh(new THREE.ConeGeometry(2.2, 6.5, 10), M.matte(0x2f5e3a)); crown.position.y = 5.5;
      tr.add(trunk, crown); tr.position.set(x, 0, z); world.add(tr);
    }
    const rig = new THREE.Group(); rig.rotation.order = 'YXZ'; stage.root.add(rig);
    const J = makeJumper(); J.rotation.y = Math.PI; J.pose('hang'); rig.add(J);
    const wing = new THREE.Group(); wing.position.y = 5.6; wing.rotation.x = -0.17; rig.add(wing);
    const W = ramAir({ span: 8.4, chord: 2.8, cells: 7 }); wing.add(W);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xe8edf8, transparent: true, opacity: 0.8 });
    const NL = 8 * 4 + 6;
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NL * 6), 3));
    const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xe8edf8, transparent: true, opacity: 0.8 })); lines.frustumCulled = false; rig.add(lines);
    void lineMat;
    const brakeMat = new THREE.LineBasicMaterial({ color: 0xff7a59 });
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6 * 6), 3));
    const blines = new THREE.LineSegments(bg, brakeMat); blines.frustumCulled = false; rig.add(blines);
    const togL = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), M.glow(COL.coral)), togR = togL.clone(); rig.add(togL, togR);
    stage.label('Toggle', [0, 0.35, 0], togR, '');
    // air dots
    const N = 66, dots = swarm(N, new THREE.SphereGeometry(0.05, 8, 6), M.glow(COL.cyan)); dots.castShadow = false; wing.add(dots);
    const seed = Array.from({ length: N }, () => rand());
    const xs = Array.from({ length: N }, (_, i) => ((i % 11) / 10 - 0.5) * 7.4 + (rand() - 0.5) * 0.3);

    let st = null;
    const reset = (alt = START) => { st = { x: 0, z: 0, alt, psi: 0, vf: 12, vs: 4, bl: 0, br: 0, hold: 0, landed: false, tv: 0, flaring: false, t: 0, ph: 0 }; };
    reset();
    const V = new THREE.Vector3();
    const hudG = hud(stage, {
      anchor: 'br', aspect: 1.55,
      draw(g, Wd, H) {
        g.clearRect(0, 0, Wd, H); g.fillStyle = 'rgba(7,8,12,.82)'; g.beginPath(); g.roundRect(0, 0, Wd, H, 18); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1.5; g.stroke();
        g.fillStyle = '#e8ecf4'; g.font = '600 20px Geist, system-ui, sans-serif'; g.textAlign = 'left'; g.fillText('Glide ratio', 16, 28);
        if (!st) return;
        const vf = st.vf, vs = st.vs, k = 17;
        const ox = 36, oy = 62;
        g.lineWidth = 4;
        g.strokeStyle = '#8ef0ff'; g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + vf * k, oy); g.stroke();
        g.strokeStyle = '#ffb547'; g.beginPath(); g.moveTo(ox + vf * k, oy); g.lineTo(ox + vf * k, oy + vs * k); g.stroke();
        g.strokeStyle = '#ffffff'; g.setLineDash([8, 6]); g.lineWidth = 3; g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + vf * k, oy + vs * k); g.stroke(); g.setLineDash([]);
        g.font = '500 16px Geist, system-ui, sans-serif'; g.fillStyle = '#8ef0ff'; g.textAlign = 'left'; g.fillText(`forward ${vf.toFixed(1)} m/s`, ox, oy - 10);
        g.fillStyle = '#ffb547'; g.textAlign = 'right'; g.fillText(`down ${vs.toFixed(1)} m/s`, Wd - 16, oy + vs * k + 22 > H - 30 ? H - 30 : oy + 60);
        g.fillStyle = '#fff'; g.font = '600 30px Geist, system-ui, sans-serif'; g.textAlign = 'left'; g.fillText(`${(vf / Math.max(0.5, vs)).toFixed(1)} : 1`, 16, H - 20);
      },
    });
    let frame = 0;
    return {
      reset,
      dispose() { hudG.dispose(); stage.floor.visible = true; },
      update(dt, c) {
        const sdt = Math.min(dt * c.speed, 0.1);
        st.t += sdt;
        if (!st.landed) {
          st.flaring = c.flareAt > 0 && st.alt < c.flareAt;
          const tl = st.flaring ? 1 : c.bl, tr = st.flaring ? 1 : c.br;
          st.bl = approach(st.bl, tl, 6, sdt); st.br = approach(st.br, tr, 6, sdt);
          const b = (st.bl + st.br) / 2, d = st.br - st.bl;
          const T = trim(b, c.inflate);
          const dvf = (T.vf - st.vf) / 0.9;
          st.vf += dvf * sdt;
          const bonus = clamp(-dvf * 0.42, 0, 3.3);
          st.vs = Math.max(0.2, T.vs - bonus + 2.2 * d * d + clamp((4.2 - st.vf) * 1.0, 0, 3));
          st.psi += 0.5 * d * (st.vf / 12) * sdt;
          st.x += Math.sin(st.psi) * st.vf * sdt; st.z -= Math.cos(st.psi) * st.vf * sdt;
          st.alt -= st.vs * sdt;
          if (st.alt <= 0) { st.alt = 0; st.landed = true; st.tv = st.vs; st.hold = 0; }
        } else { st.hold += dt; if (st.hold > 3.5) reset(START); }
        // world transform: the canopy stays at the origin and the ground moves round it
        const cp = Math.cos(st.psi), sp = Math.sin(st.psi);
        world.rotation.y = st.psi;
        world.position.set(-(cp * st.x + sp * st.z), -st.alt - 1.45, -(-sp * st.x + cp * st.z));
        const d = st.br - st.bl;
        rig.rotation.z = -0.45 * d * (st.landed ? 0 : 1);
        rig.rotation.x = st.landed ? 0 : -0.04 * (st.bl + st.br);
        W.set({ inflate: c.inflate, bl: st.bl, br: st.br });
        J.pose(st.bl + st.br > 0.3 ? 'brakes' : 'hang', sdt, 6);
        // lines
        const pos = lg.attributes.position; let k = 0;
        const wm = wing.matrix; wing.updateMatrix();
        const put = (a, b2) => { pos.setXYZ(k++, a.x, a.y, a.z); pos.setXYZ(k++, b2.x, b2.y, b2.z); };
        const riserL = V.clone().set(-0.2, 0.55, 0), riserR = V.clone().set(0.2, 0.55, 0);
        for (let r = 0; r <= 7; r++) for (let q = 0; q < 4; q++) {
          const f = r / 7, p = W.lowerPoint(f, [0.12, 0.38, 0.62, 0.9][q]).applyMatrix4(wm);
          put(p, f < 0.5 ? riserL : riserR);
        }
        pos.needsUpdate = true;
        const bp = bg.attributes.position; k = 0;
        const handL = new THREE.Vector3(-0.34, 0.2 - 0.75 * st.bl, -0.25), handR = new THREE.Vector3(0.34, 0.2 - 0.75 * st.br, -0.25);
        [0.04, 0.12, 0.24].forEach((f, i) => { const p = W.lowerPoint(f, 1).applyMatrix4(wm); bp.setXYZ(k++, p.x, p.y, p.z); bp.setXYZ(k++, handL.x, handL.y, handL.z); });
        [0.76, 0.88, 0.96].forEach((f) => { const p = W.lowerPoint(f, 1).applyMatrix4(wm); bp.setXYZ(k++, p.x, p.y, p.z); bp.setXYZ(k++, handR.x, handR.y, handR.z); });
        bp.needsUpdate = true;
        togL.position.copy(handL); togR.position.copy(handR);
        J.hands(-0.3 - st.bl * 0.6, -0.3 - st.br * 0.6);
        // air
        dots.visible = W.flow.visible = c.air;
        if (c.air) {
          st.ph += sdt * 0.45;
          const ch = W.chord;
          for (let i = 0; i < N; i++) {
            const kind = i % 3, p = (seed[i] + st.ph) % 1, x = xs[i];
            const zs = lerp(-ch * 1.6, ch * 0.9, p), u = clamp((zs + ch / 2) / ch, 0, 1);
            const ay = W.arcY(x);
            let y, sc = 1, z = zs;
            if (kind === 0) y = ay + ch * (0.13 + 0.17 * Math.sin(Math.PI * Math.pow(u, 0.8))) * c.inflate + 0.1;
            else if (kind === 1) y = ay - ch * (0.05 + 0.03 * Math.sin(Math.PI * u)) - 0.12;
            else {
              const m = clamp((p - 0.05) / 0.4, 0, 1); z = lerp(-ch * 1.6, -ch / 2 + ch * 0.4, m); y = ay + ch * 0.01 + 0.0;
              sc = p > 0.45 ? 0.55 + 0.45 * Math.sin(st.t * 8 + i) : 1; if (p > 0.55) sc *= Math.max(0, 1 - (p - 0.55) * 6);
            }
            dots.place(i, [x, y, z], null, sc);
          }
          dots.done();
        }
        if (!(frame++ % 3)) { hudG.place(); hudG.redraw(); }
      },
      readout() {
        const gr = st.vf / Math.max(0.5, st.vs);
        const dist = Math.hypot(st.x, st.z + TARGET);
        const say = st.landed ? (st.tv < 1.6 ? 'Feather-soft touchdown.' : st.tv < 3.2 ? 'A good landing.' : st.tv < 5 ? 'Firm. A better-timed flare would help.' : 'Hard landing. Flare earlier or hold it longer.')
          : st.flaring ? 'Flaring: trading speed for lift.' : st.alt < 60 && dist > 60 ? 'Steer for the target.' : 'Gliding.';
        return `<div class="big">${gr.toFixed(1)} : 1</div><p class="r-say">${say}</p>
          <div class="row"><span>Height</span><b>${st.alt.toFixed(0)} m</b></div>
          <div class="row"><span>Forward</span><b>${st.vf.toFixed(1)} m/s</b></div>
          <div class="row"><span>Sinking</span><b>${st.vs.toFixed(1)} m/s</b></div>
          <div class="row"><span>To the target</span><b>${Math.round(dist)} m</b></div>
          ${st.landed ? `<div class="row"><span>Touchdown speed (down)</span><b class="${st.tv < 3.2 ? 'ok' : 'no'}">${st.tv.toFixed(1)} m/s</b></div>` : ''}`;
      },
    };
  },
};
