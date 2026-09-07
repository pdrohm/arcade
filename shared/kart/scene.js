import * as THREE from '/vendor/three/three.module.js';
import { Game3D, CameraSystem, SnapshotBuffer } from '/shared/game3d/runtime.js';
import * as Art from '/shared/kart/art.js';
import '/shared/kart/world.js';
const W = globalThis.KartWorld, PAL = Art.PAL, TEX = Art.TEX;
// Cena do KART em 2.5D ilustrado. O mundo é 3D de verdade (a física manda), mas tudo o que se vê
// foi feito para parecer um desenho: colinas gordinhas, árvores redondas, pista pintada, contornos
// de tinta, sombra em degraus e partículas de estrelinha. As posições de colisão (pista, rampas,
// muros, plataformas) vêm de world.js e não mudam aqui.
export class KartScene {
  constructor(canvas) { this.engine = new Game3D(canvas); this.root = new THREE.Group(); this.engine.scene.add(this.root); this.karts = new Map(); this.buffer = new SnapshotBuffer(); this.last = performance.now(); this.alive = true; this.animate = this.animate.bind(this); this.frame = requestAnimationFrame(this.animate); this.time = 0; this.sky = Art.sky(this.engine.scene); }
  mesh(geometry, material, x = 0, y = 0, z = 0, parent = this.root) { return Art.mesh(geometry, material, x, y, z, parent); }
  box(w, h, d, material, x, y, z, parent) { return this.mesh(new THREE.BoxGeometry(w, h, d), material, x, y, z, parent); }
  disposeGroup(group) { const gs = new Set(), ms = new Set(); group.traverse(o => { if (o.geometry) gs.add(o.geometry); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => ms.add(m)); if (o.isInstancedMesh) o.dispose(); }); gs.forEach(g => g.dispose()); ms.forEach(m => m.dispose()); group.clear(); }
  // Faixa que acompanha a pista (asfalto, meio-fio): dois pontos por amostra, com UV para a pintura.
  strip(from, to, material, lift, vRepeat = 1) {
    const N = 96, v = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) { for (const [j, side] of [from, to].entries()) { const p = W.point(i / N, side); v.push(p.x, p.y + lift, p.z); uv.push(j, i / N * vRepeat); } if (i < N) { const j = i * 2; idx.push(j, j + 1, j + 2, j + 1, j + 3, j + 2); } }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const m = this.mesh(geo, material); m.material.side = THREE.DoubleSide; return m;
  }
  reset(g) {
    this.disposeGroup(this.root); this.karts.clear(); this.projectilePool = null; this.buffer = new SnapshotBuffer(); this.engine.cameras.items.clear(); this.matchId = g.matchId; this.mode = g.mode;
    const map = W.map(g.mode), race = g.mode === 'race', r = Art.rng(race ? 11 : 23);
    // Chão: perto da pista segue a altura da física; longe dela ondula em colinas suaves.
    const size = race ? 520 : 460, terrain = new THREE.PlaneGeometry(size, size, 96, 96); terrain.rotateX(-Math.PI / 2);
    const pos = terrain.attributes.position, uvs = terrain.attributes.uv;
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); let y; if (race) { const n = W.nearest(x, z); const far = Math.max(0, n.distance - 26) / 40; y = n.y - .1 + Math.min(1, far) * (2.2 + 2.6 * Math.sin(x * .05) * Math.cos(z * .045)) * far; } else { const d = Math.max(0, Math.max(Math.abs(x), Math.abs(z)) - 64) / 30; y = -.12 + Math.min(1, d) * d * (2 + 2 * Math.sin(x * .06) * Math.cos(z * .05)); } pos.setY(i, y); uvs.setXY(i, (x + size / 2) / 14, (z + size / 2) / 14); }
    terrain.computeVertexNormals();
    const groundTex = race ? TEX.grass() : TEX.stone(); const ground = this.mesh(terrain, Art.toon('#ffffff', { map: groundTex }));
    if (!race) {
      // Gramado em volta do forte: uma moldura quadrada (o forte é quadrado; um anel deixava os cantos internos verdes).
      const outer = new THREE.Shape(); outer.moveTo(-240, -240); outer.lineTo(240, -240); outer.lineTo(240, 240); outer.lineTo(-240, 240); outer.closePath();
      const hole = new THREE.Path(); hole.moveTo(-60, -60); hole.lineTo(60, -60); hole.lineTo(60, 60); hole.lineTo(-60, 60); hole.closePath(); outer.holes.push(hole);
      const lawn = this.mesh(new THREE.ShapeGeometry(outer), Art.toon('#ffffff', { map: TEX.grass() })); lawn.rotation.x = -Math.PI / 2; lawn.position.y = .02; const uv = lawn.geometry.attributes.uv; const p = lawn.geometry.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 14, p.getY(i) / 14);
    }
    if (race) {
      const roadTex = TEX.road(); roadTex.repeat.set(1, 1); this.strip(-8.6, 8.6, Art.toon('#ffffff', { map: roadTex }), .05, 36);
      const curb = TEX.curb(); for (const [a, b] of [[-9.9, -8.5], [8.5, 9.9]]) this.strip(a, b, Art.toon('#ffffff', { map: curb }), .09, 120);
      // Largada: faixa quadriculada no chão e um portal-cartaz com postes listrados.
      const start = this.box(17, .06, 2.6, Art.toon('#ffffff', { map: TEX.checker() }), 0, 0, 0); const p0 = W.point(0); start.position.set(p0.x, p0.y + .12, p0.z); start.rotation.y = p0.heading; start.material.map.repeat.set(4, .6);
      const gate = new THREE.Group(); gate.position.set(p0.x, p0.y, p0.z); gate.rotation.y = p0.heading; this.root.add(gate);
      for (const x of [-12.6, 12.6]) { const pole = this.mesh(new THREE.CylinderGeometry(.42, .52, 13.5, 12), Art.toon('#ffffff', { map: TEX.curb().clone() }), x, 6.75, 0, gate); pole.material.map.repeat.set(1, 8); pole.material.map.needsUpdate = true; Art.outline(pole, 1.1); const top = this.mesh(new THREE.SphereGeometry(.8, 12, 9), PAL.sun, x, 13.9, 0, gate); Art.outline(top, 1.12); }
      const banner = this.box(26.5, 1.7, .5, Art.toon('#ffffff', { map: TEX.checker() }), 0, 12.3, 0, gate); banner.material.map.repeat.set(16, 1); Art.outline(banner, 1.04);
      for (let i = 0; i < 12; i++) { const flag = this.box(1.1, .75, .08, Art.flat([PAL.coral, PAL.sun, PAL.mint, PAL.sky][i % 4]), -11 + i * 2, 11, 0, gate); flag.rotation.z = -.15; }
      // Dentro do oval: uma colina grande com árvores (esconde o outro lado da pista e dá profundidade).
      Art.hills(this.root, [{ x: 0, y: -1, z: 6, sx: 30, sy: 11, sz: 18, color: PAL.hills[0] }, { x: -14, y: -1, z: 0, sx: 18, sy: 7, sz: 14, color: PAL.hills[1] }, { x: 16, y: -1, z: 4, sx: 16, sy: 6, sz: 13, color: PAL.hills[1] }]);
    }
    for (const s of map.shortcuts || []) { const t = this.box(s.width, .22, s.depth, Art.toon('#ffffff', { map: TEX.sand() }), s.x, s.y, s.z); t.material.map.repeat.set(3, 1); Art.outline(t, 1.02); }
    for (const rp of map.ramps) { const w = rp.width / 2, l = rp.length / 2, h = rp.height; const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([-w, 0, -l, w, 0, -l, -w, h, l, w, h, l, -w, 0, l, w, 0, l], 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1], 2)); geo.setIndex([0, 2, 1, 1, 2, 3, 0, 4, 2, 1, 3, 5, 2, 4, 3, 3, 4, 5]); geo.computeVertexNormals(); const ramp = this.mesh(geo, Art.toon('#ffffff', { map: TEX.planks() }), rp.x, rp.y, rp.z); ramp.material.side = THREE.DoubleSide; ramp.rotation.y = rp.heading; const stripe = this.box(rp.width * .86, .04, rp.length * .95, Art.toon('#ffffff', { map: TEX.chevron() }), 0, h / 2 + .06, 0, ramp); stripe.rotation.x = -Math.atan2(h, rp.length); stripe.material.map = TEX.chevron().clone(); stripe.material.map.repeat.set(1, 3); stripe.material.map.needsUpdate = true; }
    for (const p of map.platforms) { const deck = this.box(p.width, .8, p.depth, Art.toon('#ffffff', { map: TEX.planks() }), p.x, p.y - .4, p.z); deck.material.map.repeat.set(4, 2); Art.outline(deck, 1.02); for (const dx of [-p.width / 2 + 2.5, p.width / 2 - 2.5]) for (const dz of [-p.depth / 2 + 2, p.depth / 2 - 2]) { const leg = this.mesh(new THREE.CylinderGeometry(.7, .9, p.y, 10), PAL.trunk, p.x + dx, p.y / 2, p.z + dz); Art.outline(leg, 1.1); } }
    for (const b of map.barriers) { const wall = this.box(b.width, b.height, b.depth, Art.toon('#ffffff', { map: TEX.wall() }), b.x, (b.y || 0) + b.height / 2, b.z); wall.material.map.repeat.set(Math.max(b.width, b.depth) / 8, b.height / 8); Art.outline(wall, 1.01); const along = b.width > b.depth, span = Math.max(b.width, b.depth), n = Math.floor(span / 6); for (let i = 0; i < n; i++) { const t = -span / 2 + 3 + i * 6; const merlon = this.box(along ? 3 : b.width + .6, 1.4, along ? b.depth + .6 : 3, '#d8d2f2', along ? b.x + t : b.x, (b.y || 0) + b.height + .7, along ? b.z : b.z + t); Art.outline(merlon, 1.05); } }
    for (const b of map.boosts) { const pad = this.box(4.2, .16, 4.2, Art.toon('#ffffff', { map: TEX.chevron() }), b.x, b.y + .12, b.z); pad.rotation.y = b.heading || 0; Art.outline(pad, 1.04); (this.pads = this.pads || []).push(pad); }
    this.pads = this.pads || [];
    for (const h of map.hazards) { const pit = this.mesh(new THREE.CylinderGeometry(h.radius, h.radius, .14, 24), Art.toon('#ffffff', { map: TEX.lava(), emissive: new THREE.Color('#7a2a00') }), h.x, .05, h.z); const rim = this.mesh(new THREE.TorusGeometry(h.radius + .3, .45, 8, 28), '#5b4a7a', h.x, .12, h.z); rim.rotation.x = Math.PI / 2; Art.outline(rim, 1.06); (this.lavas = this.lavas || []).push(pit); }
    this.lavas = this.lavas || [];
    // Cenário: colinas, árvores, arbustos e flores em anéis ao redor da área de jogo.
    const groundY = (x, z) => race ? W.nearest(x, z).y : 0;
    const clearOf = (x, z) => race ? W.nearest(x, z).distance : Math.max(Math.abs(x), Math.abs(z)) - 55;
    const hillItems = []; for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2 + r() * .2, d = race ? 1.75 + r() * .55 : 1, x = race ? Math.sin(a) * 70 * d : Math.sin(a) * (105 + r() * 40), z = race ? Math.cos(a) * 45 * d + 8 : Math.cos(a) * (105 + r() * 40), s = 14 + r() * 16; hillItems.push({ x, y: -2, z, sx: s * (1.2 + r() * .6), sy: s * (.45 + r() * .35), sz: s, color: PAL.hills[Math.floor(r() * 3)] }); }
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, x = Math.sin(a) * (race ? 175 : 190), z = Math.cos(a) * (race ? 150 : 190), s = 30 + r() * 20; hillItems.push({ x, y: -4, z, sx: s * 1.6, sy: s * .7, sz: s, color: PAL.hills[3] }); }
    Art.hills(this.root, hillItems);
    const treeSpots = [], bushSpots = [], flowerSpots = [];
    for (let i = 0; i < 90; i++) { const a = r() * Math.PI * 2, d = race ? 1.28 + r() * .55 : 1, x = race ? Math.sin(a) * 70 * d : Math.sin(a) * (72 + r() * 40), z = race ? Math.cos(a) * 45 * d : Math.cos(a) * (72 + r() * 40); if (clearOf(x, z) < 14) continue; treeSpots.push({ x, y: groundY(x, z) - .2, z, s: .8 + r() * .8, color: PAL.leaf[Math.floor(r() * 3)], light: PAL.leaf[Math.floor(r() * 5)] }); }
    if (race) for (let i = 0; i < 12; i++) { const a = r() * Math.PI * 2, d = 4 + r() * 10, x = Math.sin(a) * d, z = 6 + Math.cos(a) * d * .7; treeSpots.push({ x, y: 8 - d * .5, z, s: .7 + r() * .5, color: PAL.leaf[i % 3], light: PAL.leaf[3] }); }
    if (race) for (let i = 0; i < 96; i++) { for (const side of [-13.6, 13.6]) { if (i % 2 && side > 0) continue; const p = W.point(i / 96 + r() * .004, side * 1.06 + (r() - .5) * 1.2); bushSpots.push({ x: p.x, y: p.y - .1, z: p.z, s: .8 + r() * .8, color: PAL.leaf[Math.floor(r() * 3)] }); } if (i % 3 === 0) { const p = W.point(i / 96 + r() * .01, (r() > .5 ? 1 : -1) * (11 + r() * 1.5)); flowerSpots.push({ x: p.x, y: p.y + .15, z: p.z, s: 1, color: ['#ff9ecb', '#ffd166', '#ffffff', '#ff6a5c'][i % 4] }); } }
    else for (let i = 0; i < 40; i++) { const a = r() * Math.PI * 2, d = 62 + r() * 30, x = Math.sin(a) * d, z = Math.cos(a) * d; bushSpots.push({ x, y: 0, z, s: 1.2 + r() * 1.4, color: PAL.leaf[Math.floor(r() * 3)] }); }
    Art.trees(this.root, treeSpots); Art.bushes(this.root, bushSpots); if (flowerSpots.length) Art.flowers(this.root, flowerSpots);
    this.clouds = Art.clouds(this.root, 16, race ? 5 : 9);
    // Caixas de item: cubos amarelos com "?" que giram e flutuam.
    this.pickupMeshes = map.pickups.map(p => { const g = new THREE.Group(); g.position.set(p.x, p.y + 1.7, p.z); this.root.add(g); const cube = this.mesh(new THREE.BoxGeometry(1.7, 1.7, 1.7), Art.toon('#ffffff', { map: TEX.itembox() }), 0, 0, 0, g); Art.outline(cube, 1.06); return g; });
    this.projectilePool = new THREE.Group(); this.root.add(this.projectilePool); this.projectiles = new Map();
    this.particles = new Art.Particles(this.root, 220); this.seen = new Set(); this.shadows = new Map();
    this.shadowGeo = new THREE.PlaneGeometry(3.8, 3.8); this.shadowMat = new THREE.MeshBasicMaterial({ map: TEX.shadow(), transparent: true, depthWrite: false });
  }
  driver(k) { const car = Art.buildKart(k); this.root.add(car); const shadow = new THREE.Mesh(this.shadowGeo, this.shadowMat); shadow.rotation.x = -Math.PI / 2; shadow.renderOrder = 1; this.root.add(shadow); car.userData.shadow = shadow; car.userData.prev = { x: k.x, z: k.z, boost: 0, respawn: 0, offroad: false }; return car; }
  removeCar(id, car) { this.root.remove(car); if (car.userData.shadow) this.root.remove(car.userData.shadow); this.disposeGroup(car); this.karts.delete(id); }
  projectile(p) {
    const g = new THREE.Group();
    if (p.type === 'oil') { const pool = this.mesh(new THREE.CylinderGeometry(1.4, 1.4, .1, 16), Art.toon('#2f2a4a'), 0, .06, 0, g); pool.scale.set(1.2, 1, .9); Art.outline(pool, 1.05); }
    else if (p.type === 'mine') { const body = this.mesh(new THREE.SphereGeometry(.7, 12, 9), PAL.coral, 0, .5, 0, g); Art.outline(body, 1.1); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const spike = this.mesh(new THREE.ConeGeometry(.16, .5, 6), PAL.ink, Math.cos(a) * .75, .5, Math.sin(a) * .75, g); spike.rotation.z = -Math.PI / 2; spike.rotation.y = -a; } const light = this.mesh(new THREE.SphereGeometry(.2, 8, 6), Art.flat(PAL.sun), 0, 1.15, 0, g); g.userData.light = light; }
    else if (p.type === 'bomb') { const body = this.mesh(new THREE.SphereGeometry(.7, 14, 10), PAL.ink, 0, 0, 0, g); const fuse = this.mesh(new THREE.CylinderGeometry(.06, .06, .5, 6), PAL.cream, .2, .8, 0, g); fuse.rotation.z = -.4; this.mesh(new THREE.SphereGeometry(.16, 8, 6), Art.flat(PAL.sun), .35, 1.05, 0, g); const shine = this.mesh(new THREE.SphereGeometry(.18, 8, 6), Art.flat('#6f66a8'), -.25, .3, .4, g); }
    else { const body = this.mesh(new THREE.CapsuleGeometry(.32, .9, 4, 10), PAL.cream, 0, 0, 0, g); body.rotation.x = Math.PI / 2; Art.outline(body, 1.1); const tip = this.mesh(new THREE.ConeGeometry(.32, .6, 10), PAL.coral, 0, 0, .95, g); tip.rotation.x = Math.PI / 2; Art.outline(tip, 1.1); for (const x of [-.4, .4]) { const fin = this.box(.5, .08, .5, PAL.coral, x, 0, -.5, g); Art.outline(fin, 1.1); } const win = this.mesh(new THREE.SphereGeometry(.16, 8, 6), Art.flat(PAL.sky), 0, .3, .2, g); }
    g.userData.type = p.type; this.projectilePool.add(g); return g;
  }
  update(g) { if (this.matchId !== g.matchId || this.mode !== g.mode) this.reset(g); this.g = g; if (g.world) this.buffer.push(g.world); }
  animate(now) {
    if (!this.alive) return; this.frame = requestAnimationFrame(this.animate); const dt = Math.min(.05, (now - this.last) / 1000); this.last = now; if (!this.g) return; this.time += dt;
    const world = this.buffer.read(now), g = this.g, roster = world ? world.karts : g.roster.map((k, i) => ({ ...k, ...W.map(g.mode).spawns[i] })), race = g.mode === 'race';
    for (const [id, car] of this.karts) if (!roster.some(k => k.pid === id)) this.removeCar(id, car);
    for (const k of roster) {
      let car = this.karts.get(k.pid); if (car && (car.userData.driver !== k.driver || car.userData.kart !== k.kart)) { this.removeCar(k.pid, car); car = null; } if (!car) { car = this.driver(k); this.karts.set(k.pid, car); }
      const u = car.userData, drift = k.driftDir || 0, speed = k.speed || 0;
      car.position.set(k.x, k.y, k.z); car.rotation.y = k.heading + drift * .38; car.rotation.z = drift * -.1; car.visible = !(k.respawn > 0);
      // Balanço do corpo e giro das rodas: barato e dá vida ao boneco.
      u.body.position.y = Math.sin(this.time * 14 + k.x) * .02 * Math.min(1, speed / 10); u.body.rotation.x = -Math.min(.08, Math.max(0, (k.boost || 0)) * .08); u.spin += speed * dt / .62; for (const w of u.wheels) w.rotation.x = u.spin;
      u.head.rotation.y = drift * .6 + Math.sin(this.time * 3 + k.z) * .06; u.head.rotation.z = -drift * .12;
      u.shield.visible = k.shield > 0; u.shield.scale.setScalar(1 + Math.sin(this.time * 6) * .04); u.shield.rotation.y = this.time;
      for (const f of u.flames) { f.visible = k.boost > 0; if (f.visible) { const s = .8 + Math.random() * .5; f.scale.set(s, s, s * (1 + Math.random() * .4)); } }
      if (u.shadow) { u.shadow.visible = car.visible; const gy = W.ground(k.x, k.z, g.mode, k.y + .5); u.shadow.position.set(k.x, gy + .04, k.z); const lift = Math.max(0, Math.min(1, (k.y - gy) / 4)); u.shadow.scale.setScalar(1 - lift * .5); u.shadow.rotation.z = -k.heading; }
      // Partículas do cliente: faísca de derrapagem, poeira fora da pista, rastro de turbo, retorno.
      if (world && g.phase === 'playing' && car.visible) {
        const sinH = Math.sin(k.heading), cosH = Math.cos(k.heading), rx = cosH, rz = -sinH;
        if (drift && speed > 9) { const charged = k.driftCharge >= .65; const side = drift; for (let i = 0; i < 2; i++) this.particles.emit('spark', k.x + rx * side * 1.3 - sinH * 1.1, k.y + .25, k.z + rz * side * 1.3 - cosH * 1.1, { color: charged ? (Math.random() > .5 ? PAL.sky : '#ffffff') : (Math.random() > .5 ? PAL.sun : PAL.coral), life: .25 + Math.random() * .2, size: .5 + Math.random() * .5, vx: (-sinH * 6 + (Math.random() - .5) * 5), vy: 2 + Math.random() * 3, vz: (-cosH * 6 + (Math.random() - .5) * 5), g: 14, spin: 6 }); if (Math.random() < .5) this.particles.emit('puff', k.x - sinH * 1.6, k.y + .3, k.z - cosH * 1.6, { color: '#ffffff', opacity: .7, life: .6, size: 1, grow: 1.6, vy: 1.2, vx: -sinH * 2, vz: -cosH * 2 }); }
        const offroad = race && W.nearest(k.x, k.z).distance > W.ROAD_WIDTH / 2 + .5 && !W.map('race').shortcuts.some(s => Math.abs(k.x - s.x) < s.width / 2 && Math.abs(k.z - s.z) < s.depth / 2);
        if (offroad && speed > 4 && Math.random() < .6) this.particles.emit('puff', k.x - sinH * 1.4 + (Math.random() - .5), k.y + .2, k.z - cosH * 1.4 + (Math.random() - .5), { color: '#d8c39a', opacity: .8, life: .7, size: 1.1, grow: 1.4, vy: 1.6, vx: (Math.random() - .5) * 2, vz: (Math.random() - .5) * 2 });
        if (k.boost > 0 && Math.random() < .8) this.particles.emit('streak', k.x - sinH * 2.4, k.y + .7, k.z - cosH * 2.4, { color: Math.random() > .5 ? PAL.sun : PAL.coral, life: .3, size: 1.4, vx: -sinH * 14, vz: -cosH * 14, rot: Math.atan2(sinH, cosH) });
        if (k.slip > 0 && Math.random() < .5) this.particles.emit('star', k.x, k.y + 2.6, k.z, { color: PAL.sun, life: .5, size: .5, vy: 2, vx: (Math.random() - .5) * 3, vz: (Math.random() - .5) * 3, spin: 4 });
        if (u.prev.respawn > 0 && !(k.respawn > 0)) this.particles.burst('puff', k.x, k.y + 1, k.z, 10, { color: ['#ffffff', PAL.lilac], life: .7, size: 1.6, grow: 1.4, speed: 5, up: 3 });
      }
      u.prev.respawn = k.respawn || 0;
    }
    // Cenário vivo: nuvens giram, caixas flutuam, setas do turbo correm, lava borbulha.
    this.clouds.rotation.y = this.time * .004;
    this.pickupMeshes.forEach((m, i) => { m.rotation.y = this.time * 1.3 + i; m.position.y = W.map(g.mode).pickups[i].y + 1.7 + Math.sin(this.time * 2.2 + i) * .25; m.visible = !world || !world.pickups[i] || world.pickups[i].cooldown <= 0; });
    for (const pad of this.pads) pad.material.map.offset.y = -this.time * 1.5;
    for (const lava of this.lavas) lava.material.map.offset.set(Math.sin(this.time * .3) * .1, this.time * .05);
    if (world) {
      const live = world.projectiles.slice(0, 48); for (const [id, m] of this.projectiles) if (!live.some(p => p.id === id)) { this.projectilePool.remove(m); this.disposeGroup(m); this.projectiles.delete(id); }
      for (const p of live) { let m = this.projectiles.get(p.id); if (!m) { m = this.projectile(p); this.projectiles.set(p.id, m); } m.position.set(p.x, p.y, p.z); if (p.type === 'rocket' || p.type === 'rapid') { m.rotation.y = Math.atan2(p.vx, p.vz); if (Math.random() < .7) this.particles.emit('puff', p.x, p.y, p.z, { color: p.type === 'rapid' ? '#ffd6ea' : '#ffffff', opacity: .8, life: .35, size: .8, grow: 1.5 }); } else if (p.type === 'bomb') { m.rotation.x += dt * 4; } else if (p.type === 'mine') { m.userData.light.material.color.set(Math.sin(this.time * 8) > 0 ? PAL.sun : PAL.coral); } }
      // Efeitos do servidor chegam como lista; cada um vira um estouro de partículas uma vez só.
      for (const e of world.effects) { if (this.seen.has(e.id)) continue; this.seen.add(e.id); const y = e.y + .8;
        if (e.type === 'explosion') { this.particles.burst('puff', e.x, y, e.z, 14, { color: [PAL.coral, PAL.sun, '#ffffff', PAL.ink], life: .8, size: 2.6, grow: 1.2, speed: 8, up: 6 }); this.particles.emit('ring', e.x, y, e.z, { color: PAL.sun, life: .4, size: 3, grow: 3 }); this.particles.burst('star', e.x, y, e.z, 8, { color: PAL.sun, life: .8, size: 1, speed: 10, up: 8, g: 14, spin: 6 }); }
        else if (e.type === 'hit') { this.particles.burst('star', e.x, y + 1.2, e.z, 7, { color: [PAL.sun, '#ffffff', PAL.coral], life: .55, size: .9, speed: 6, up: 5, g: 12, spin: 8 }); this.particles.emit('ring', e.x, y, e.z, { color: '#ffffff', life: .3, size: 2, grow: 2.5 }); }
        else if (e.type === 'boost') { this.particles.burst('streak', e.x, y, e.z, 8, { color: [PAL.sky, '#ffffff'], life: .4, size: 1.4, speed: 9, up: 1 }); this.particles.emit('ring', e.x, y - .4, e.z, { color: PAL.sky, life: .35, size: 2.5, grow: 2.5 }); }
        else if (e.type === 'pickup') { this.particles.burst('star', e.x, y + 1, e.z, 10, { color: [PAL.sun, '#ffffff', PAL.lilac], life: .6, size: .8, speed: 5, up: 6, g: 10, spin: 5 }); }
        else if (e.type === 'finish') { this.particles.burst('confetti', e.x, y + 3, e.z, 40, { color: [PAL.coral, PAL.sun, PAL.mint, PAL.sky, PAL.grape], life: 1.6, size: .7, speed: 7, up: 9, g: 9, spin: 7, fade: 1 }); } }
      if (this.seen.size > 400) this.seen = new Set([...this.seen].slice(-100));
    }
    this.particles.update(dt);
    const active = ['countdown', 'playing', 'results'].includes(g.phase) && world; let views;
    if (active) { const layout = CameraSystem.layout(roster.length); views = roster.map((k, i) => ({ id: k.pid, target: k, rect: layout[i] })); if (roster.length === 3) views.push({ id: 'overview', target: { x: 0, y: 0, z: 0 }, rect: { x: .5, y: .5, w: .5, h: .5 }, overhead: true }); }
    else views = [{ id: 'overview', target: { x: 0, y: 0, z: 0 }, rect: { x: 0, y: 0, w: 1, h: 1 }, overhead: true, orbit: this.time }];
    this.engine.render(views, dt);
  }
  dispose() { this.alive = false; cancelAnimationFrame(this.frame); if (this.particles) this.particles.dispose(); this.disposeGroup(this.root); this.engine.dispose(); Art.disposeTextures(); this.projectilePool = null; }
}
window.ARCADE.KartScene = KartScene;
