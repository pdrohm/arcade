import * as THREE from '/vendor/three/three.module.js';
// Direção de arte do KART: um mundo 2.5D "de ilustração". Tudo aqui é pintado em canvas na hora
// (nenhuma imagem no servidor), sombreado em degraus (toon) e contornado com a mesma tinta roxa
// que a interface usa. Formas redondas, cores saturadas, sombras simples.
export const PAL = {
  ink: '#2a2250', paper: '#fff6e3', sun: '#ffcf3f', coral: '#ff6a5c', mint: '#43d9a0', sky: '#58c8f5', grape: '#7c5cff', lilac: '#c9b8ff',
  grass: ['#7fd35b', '#63bd4c', '#4aa848'], hills: ['#9be07a', '#7fcf88', '#a9e6c3', '#c3ecdc'], leaf: ['#4fbf5a', '#77d66a', '#2f9d4b', '#ff9ecb', '#ffd166'],
  trunk: '#9b5d3a', road: '#6f6d8f', cream: '#fff3d6', red: '#ff5a5a', cloud: '#ffffff', wood: '#d9a066', stone: '#b7b0d9', lava: '#ff7a3d', sand: '#e8cf8f',
  skyTop: '#4fb8f0', skyMid: '#9fdcfb', horizon: '#e6f6ff', fog: '#cdeafb',
};
// Sorteio fixo: as texturas saem iguais em toda TV, em toda partida.
export function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
const textures = new Map();
export function paint(name, size, draw, repeat = true) {
  if (textures.has(name)) return textures.get(name);
  const c = document.createElement('canvas'); c.width = size; c.height = size; const ctx = c.getContext('2d'); draw(ctx, size, rng(name.length * 7919 + 17));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping; t.anisotropy = 4;
  textures.set(name, t); return t;
}
export function disposeTextures() { for (const t of textures.values()) t.dispose(); textures.clear(); }
// Pinceladas: manchas ovais meio transparentes, o que dá o ar de "pintado à mão" sem ruído.
function dabs(ctx, size, n, colors, rmin, rmax, r, alpha = .55) {
  for (let i = 0; i < n; i++) { const x = r() * size, y = r() * size, rx = rmin + r() * (rmax - rmin), ry = rx * (.5 + r() * .5); ctx.fillStyle = colors[Math.floor(r() * colors.length)]; ctx.globalAlpha = alpha * (.6 + r() * .4);
    for (const [dx, dy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size]]) { ctx.beginPath(); ctx.ellipse(x + dx, y + dy, rx, ry, r() * Math.PI, 0, Math.PI * 2); ctx.fill(); } }
  ctx.globalAlpha = 1;
}
export const TEX = {
  grass: () => paint('grass', 512, (ctx, s, r) => { ctx.fillStyle = '#6cc551'; ctx.fillRect(0, 0, s, s); dabs(ctx, s, 140, ['#7fd35b', '#8ddc68', '#5db34a'], 18, 46, r, .5); dabs(ctx, s, 60, ['#4aa848'], 6, 14, r, .35);
    for (let i = 0; i < 40; i++) { ctx.fillStyle = ['#ff9ecb', '#ffd166', '#ffffff'][i % 3]; ctx.beginPath(); ctx.arc(r() * s, r() * s, 2.5 + r() * 2, 0, 7); ctx.fill(); } }),
  road: () => paint('road', 512, (ctx, s, r) => { ctx.fillStyle = PAL.road; ctx.fillRect(0, 0, s, s); dabs(ctx, s, 120, ['#7a789a', '#66647f', '#7d7ba0'], 20, 60, r, .4);
    ctx.fillStyle = PAL.cream; ctx.fillRect(s * .035, 0, s * .03, s); ctx.fillRect(s * .935, 0, s * .03, s);
    for (let y = 0; y < s; y += s / 2) { ctx.fillRect(s * .49, y + s * .08, s * .02, s * .28); } }),
  curb: () => paint('curb', 128, (ctx, s) => { ctx.fillStyle = PAL.red; ctx.fillRect(0, 0, s, s); ctx.fillStyle = PAL.cream; ctx.fillRect(0, 0, s, s / 2); }),
  checker: () => paint('checker', 128, (ctx, s) => { ctx.fillStyle = PAL.paper; ctx.fillRect(0, 0, s, s); ctx.fillStyle = PAL.ink; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if ((x + y) % 2) ctx.fillRect(x * s / 4, y * s / 4, s / 4, s / 4); }),
  chevron: () => paint('chevron', 128, (ctx, s) => { ctx.fillStyle = '#37c7e8'; ctx.fillRect(0, 0, s, s); ctx.fillStyle = '#eafcff'; for (const y0 of [0, s / 2]) { ctx.beginPath(); ctx.moveTo(0, y0 + s * .34); ctx.lineTo(s / 2, y0 + s * .08); ctx.lineTo(s, y0 + s * .34); ctx.lineTo(s, y0 + s * .5); ctx.lineTo(s / 2, y0 + s * .24); ctx.lineTo(0, y0 + s * .5); ctx.fill(); } }),
  planks: () => paint('planks', 256, (ctx, s, r) => { ctx.fillStyle = PAL.wood; ctx.fillRect(0, 0, s, s); dabs(ctx, s, 50, ['#e3ae78', '#c88f58'], 14, 40, r, .4); ctx.fillStyle = '#a86a3c'; for (let i = 0; i < 4; i++) ctx.fillRect(0, i * s / 4 - 3, s, 6); }),
  stone: () => paint('stone', 512, (ctx, s, r) => { ctx.fillStyle = PAL.stone; ctx.fillRect(0, 0, s, s); dabs(ctx, s, 90, ['#c4bde4', '#a9a1cf'], 20, 60, r, .45); ctx.strokeStyle = '#8f86bd'; ctx.lineWidth = 6; for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(0, i * s / 4); ctx.lineTo(s, i * s / 4); ctx.moveTo(i * s / 4, 0); ctx.lineTo(i * s / 4, s); ctx.stroke(); } for (let i = 0; i < 8; i++) { const gx = Math.floor(r() * 4) * s / 4 + s / 8; ctx.beginPath(); ctx.moveTo(gx, Math.floor(r() * 4) * s / 4); ctx.lineTo(gx, Math.floor(r() * 4) * s / 4 + s / 4); ctx.stroke(); } }),
  lava: () => paint('lava', 256, (ctx, s, r) => { ctx.fillStyle = PAL.lava; ctx.fillRect(0, 0, s, s); dabs(ctx, s, 40, ['#ffb347', '#ffd166'], 12, 34, r, .8); dabs(ctx, s, 20, ['#ff4d4d'], 8, 20, r, .6); }),
  sand: () => paint('sand', 256, (ctx, s, r) => { ctx.fillStyle = PAL.sand; ctx.fillRect(0, 0, s, s); dabs(ctx, s, 70, ['#f2dea6', '#d9bd78'], 14, 40, r, .45); }),
  itembox: () => paint('itembox', 128, (ctx, s) => { ctx.fillStyle = PAL.sun; ctx.fillRect(0, 0, s, s); ctx.fillStyle = PAL.ink; ctx.font = `900 ${s * .78}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', s / 2, s * .55); }, false),
  wall: () => paint('wall', 256, (ctx, s, r) => { ctx.fillStyle = '#c9c2ea'; ctx.fillRect(0, 0, s, s); dabs(ctx, s, 40, ['#d8d2f2', '#b6aedb'], 16, 40, r, .5); ctx.strokeStyle = '#8f86bd'; ctx.lineWidth = 7; for (let i = 0; i < 4; i++) { const y = i * s / 4; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(s, y); ctx.stroke(); const off = i % 2 ? s / 4 : 0; for (let x = off; x <= s; x += s / 2) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + s / 4); ctx.stroke(); } } }),
  sky: () => paint('sky', 256, (ctx, s) => { const g = ctx.createLinearGradient(0, 0, 0, s); g.addColorStop(0, PAL.skyTop); g.addColorStop(.42, PAL.skyMid); g.addColorStop(.5, PAL.horizon); g.addColorStop(.56, '#fff1d6'); g.addColorStop(1, '#ffe4c4'); ctx.fillStyle = g; ctx.fillRect(0, 0, s, s); }, false),
  shadow: () => paint('shadow', 128, (ctx, s) => { const g = ctx.createRadialGradient(s / 2, s / 2, s * .1, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(42,34,80,.85)'); g.addColorStop(.7, 'rgba(42,34,80,.55)'); g.addColorStop(1, 'rgba(42,34,80,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, s, s); }, false),
  // Partículas: desenhos brancos, coloridos pelo material.
  puff: () => paint('puff', 128, (ctx, s) => { ctx.fillStyle = '#fff'; for (const [x, y, r] of [[.5, .55, .3], [.32, .6, .22], [.68, .6, .22], [.45, .4, .2], [.6, .42, .18]]) { ctx.beginPath(); ctx.arc(x * s, y * s, r * s, 0, 7); ctx.fill(); } }, false),
  spark: () => paint('spark', 128, (ctx, s) => { ctx.fillStyle = '#fff'; star(ctx, s / 2, s / 2, 4, s * .48, s * .12); }, false),
  star: () => paint('star', 128, (ctx, s) => { ctx.fillStyle = '#fff'; star(ctx, s / 2, s / 2, 5, s * .48, s * .22); }, false),
  ring: () => paint('ring', 128, (ctx, s) => { ctx.strokeStyle = '#fff'; ctx.lineWidth = s * .12; ctx.beginPath(); ctx.arc(s / 2, s / 2, s * .4, 0, 7); ctx.stroke(); }, false),
  streak: () => paint('streak', 128, (ctx, s) => { ctx.fillStyle = '#fff'; for (const [y, w] of [[.3, .9], [.5, .6], [.7, .8]]) { ctx.beginPath(); ctx.roundRect(s * (1 - w) / 2, s * y - s * .05, s * w, s * .1, s * .05); ctx.fill(); } }, false),
  confetti: () => paint('confetti', 64, (ctx, s) => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(s * .2, s * .35, s * .6, s * .3, s * .1); ctx.fill(); }, false),
  sunDisc: () => paint('sunDisc', 128, (ctx, s) => { const g = ctx.createRadialGradient(s / 2, s / 2, s * .18, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(255,246,210,1)'); g.addColorStop(.35, 'rgba(255,236,170,.95)'); g.addColorStop(.5, 'rgba(255,220,150,.25)'); g.addColorStop(1, 'rgba(255,220,150,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, s, s); }, false),
};
function star(ctx, cx, cy, n, R, r) { ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n - Math.PI / 2, d = i % 2 ? r : R; ctx.lineTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d); } ctx.closePath(); ctx.fill(); }
// Sombra em três degraus: a "pintura" fica lisa, com uma sombra bem marcada e um meio-tom.
let gradient = null;
export function gradientMap() {
  if (!gradient) { gradient = new THREE.DataTexture(new Uint8Array([120, 120, 120, 255, 190, 190, 190, 255, 255, 255, 255, 255]), 3, 1); gradient.minFilter = gradient.magFilter = THREE.NearestFilter; gradient.needsUpdate = true; }
  return gradient;
}
export function toon(color, extra = {}) { return new THREE.MeshToonMaterial(Object.assign({ color, gradientMap: gradientMap() }, extra)); }
export function flat(color, extra = {}) { return new THREE.MeshBasicMaterial(Object.assign({ color }, extra)); }
// Contorno: a mesma malha, um pouco maior, só com as faces de trás pintadas de tinta.
let inkMaterial = null;
export function outline(mesh, scale = 1.07) {
  inkMaterial = inkMaterial || new THREE.MeshBasicMaterial({ color: PAL.ink, side: THREE.BackSide });
  const o = new THREE.Mesh(mesh.geometry, inkMaterial); o.scale.setScalar(scale); o.raycast = () => {}; mesh.add(o); return o;
}
export function mesh(geometry, material, x = 0, y = 0, z = 0, parent = null) { const m = new THREE.Mesh(geometry, typeof material === 'string' ? toon(material) : material); m.position.set(x, y, z); if (parent) parent.add(m); return m; }
// Malhas instanciadas para o cenário: uma chamada de desenho por tipo (árvores, colinas, nuvens, arbustos).
export function instanced(geometry, material, items, parent, outlined = 0) {
  const im = new THREE.InstancedMesh(geometry, material, items.length), m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), color = new THREE.Color();
  items.forEach((it, i) => { p.set(it.x, it.y, it.z); s.set(it.sx ?? it.s ?? 1, it.sy ?? it.s ?? 1, it.sz ?? it.s ?? 1); q.setFromEuler(new THREE.Euler(it.rx || 0, it.ry || 0, it.rz || 0)); m.compose(p, q, s); im.setMatrixAt(i, m); if (it.color) im.setColorAt(i, color.set(it.color)); });
  im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.frustumCulled = false; parent.add(im);
  if (outlined) { inkMaterial = inkMaterial || new THREE.MeshBasicMaterial({ color: PAL.ink, side: THREE.BackSide }); const o = new THREE.InstancedMesh(geometry, inkMaterial, items.length); items.forEach((it, i) => { p.set(it.x, it.y, it.z); s.set((it.sx ?? it.s ?? 1) * outlined, (it.sy ?? it.s ?? 1) * outlined, (it.sz ?? it.s ?? 1) * outlined); q.setFromEuler(new THREE.Euler(it.rx || 0, it.ry || 0, it.rz || 0)); m.compose(p, q, s); o.setMatrixAt(i, m); }); o.instanceMatrix.needsUpdate = true; o.frustumCulled = false; parent.add(o); }
  return im;
}
// Céu: cúpula com degradê pintado, sol e nuvens fofas que giram devagar.
export function sky(scene) {
  const dome = new THREE.Mesh(new THREE.SphereGeometry(520, 24, 14), new THREE.MeshBasicMaterial({ map: TEX.sky(), side: THREE.BackSide, fog: false, depthWrite: false })); dome.renderOrder = -10; scene.add(dome);
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.sunDisc(), fog: false, depthWrite: false, transparent: true })); sun.position.set(-260, 210, 300); sun.scale.setScalar(150); scene.add(sun);
  return { dome, sun };
}
export function clouds(parent, count, seed = 3) {
  const r = rng(seed), items = [];
  for (let i = 0; i < count; i++) { const a = i / count * Math.PI * 2 + r() * .4, d = 190 + r() * 120, y = 45 + r() * 45, cx = Math.sin(a) * d, cz = Math.cos(a) * d, n = 3 + Math.floor(r() * 3);
    for (let j = 0; j < n; j++) { const off = (j - (n - 1) / 2) * 7, s = 7 + r() * 5 - Math.abs(off) * .25; items.push({ x: cx + off + (r() - .5) * 3, y: y + (r() - .5) * 3 + (j % 2) * 2, z: cz + (r() - .5) * 6, sx: s * 1.15, sy: s * .7, sz: s, color: j % 2 ? '#ffffff' : '#f2fbff' }); } }
  const group = new THREE.Group(); parent.add(group); instanced(new THREE.SphereGeometry(1, 12, 9), toon('#ffffff', { fog: false }), items, group); return group;
}
export function hills(parent, items) { return instanced(new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon('#ffffff'), items, parent); }
export function trees(parent, spots) {
  const trunks = spots.map(t => ({ x: t.x, y: t.y + 1.2 * t.s, z: t.z, sx: t.s, sy: t.s, sz: t.s, color: PAL.trunk }));
  const leaves = []; spots.forEach(t => { const c = t.color || PAL.leaf[0]; leaves.push({ x: t.x, y: t.y + 3.4 * t.s, z: t.z, sx: 2.3 * t.s, sy: 1.9 * t.s, sz: 2.3 * t.s, color: c }, { x: t.x + .6 * t.s, y: t.y + 5 * t.s, z: t.z - .3 * t.s, sx: 1.5 * t.s, sy: 1.35 * t.s, sz: 1.5 * t.s, color: c }, { x: t.x - .9 * t.s, y: t.y + 4.5 * t.s, z: t.z + .5 * t.s, sx: 1.2 * t.s, sy: 1.1 * t.s, sz: 1.2 * t.s, color: t.light || c }); });
  instanced(new THREE.CylinderGeometry(.32, .5, 2.6, 7), toon('#ffffff'), trunks, parent);
  return instanced(new THREE.SphereGeometry(1, 12, 9), toon('#ffffff'), leaves, parent, 1.06);
}
export function bushes(parent, spots) { return instanced(new THREE.SphereGeometry(1, 10, 8), toon('#ffffff'), spots.map(b => ({ x: b.x, y: b.y + b.s * .55, z: b.z, sx: b.s * 1.2, sy: b.s * .8, sz: b.s, color: b.color || PAL.leaf[1] })), parent, 1.08); }
export function flowers(parent, spots) { return instanced(new THREE.SphereGeometry(.28, 7, 5), toon('#ffffff'), spots, parent); }
// Kart e piloto: proporções de desenho animado (rodas grandes, cabeça grande, corpo redondo).
export function buildKart(k) {
  const car = new THREE.Group(), color = k.color || PAL.coral, type = k.kart || 0, body = new THREE.Group(); car.add(body);
  const len = type === 1 ? 2.05 : type === 2 ? 1.75 : 1.85;
  let chassis;
  if (type === 2) { chassis = mesh(new THREE.BoxGeometry(2.4, 1, 3.5), color, 0, .95, 0, body); outline(chassis, 1.05); }
  else { chassis = mesh(new THREE.SphereGeometry(1, 18, 12), color, 0, .85, 0, body); chassis.scale.set(1.3, .58, len); outline(chassis, 1.06); }
  const bumper = mesh(new THREE.CapsuleGeometry(.22, 2.1, 4, 8), PAL.ink, 0, .62, type === 2 ? 1.8 : len + .25, body); bumper.rotation.z = Math.PI / 2;
  const seat = mesh(new THREE.SphereGeometry(1, 12, 8), PAL.ink, 0, 1.2, -.35, body); seat.scale.set(.8, .42, .75);
  const back = mesh(new THREE.BoxGeometry(1.3, .9, .3), PAL.ink, 0, 1.55, -1.05, body);
  if (type === 1) { const wing = mesh(new THREE.BoxGeometry(3.1, .18, .7), color, 0, 1.75, -1.7, body); outline(wing, 1.08); for (const x of [-1, 1]) mesh(new THREE.BoxGeometry(.16, .7, .5), PAL.ink, x, 1.35, -1.7, body); for (const x of [-.55, .55]) { const pipe = mesh(new THREE.CylinderGeometry(.24, .3, .8, 10), '#b9c4e6', x, .75, -2.15, body); pipe.rotation.x = Math.PI / 2; outline(pipe, 1.12); } }
  else if (type === 0) { const fin = mesh(new THREE.BoxGeometry(.18, .55, .9), color, 0, 1.55, -1.55, body); outline(fin, 1.12); }
  else { for (const x of [-.9, .9]) mesh(new THREE.BoxGeometry(.5, .35, .35), PAL.cream, x, 1.05, 1.78, body); }
  const nose = mesh(new THREE.SphereGeometry(.34, 10, 8), PAL.cream, 0, 1.05, len + .15, body); outline(nose, 1.12);
  const wheels = [], wheelGeo = new THREE.CylinderGeometry(.62, .62, .52, 14), hubGeo = new THREE.CylinderGeometry(.3, .3, .56, 10);
  for (const x of [-1.25, 1.25]) for (const z of [-1.05, 1.15]) { const w = mesh(wheelGeo, PAL.ink, x, .62, z, car); w.rotation.z = Math.PI / 2; const hub = mesh(hubGeo, PAL.cream, 0, 0, 0, w); hub.material.map = null; wheels.push(w); }
  const driver = buildDriver(k.driver || 0, color); driver.position.set(0, 1.35, -.3); body.add(driver);
  const shield = mesh(new THREE.SphereGeometry(2.3, 16, 12), toon(PAL.sky, { transparent: true, opacity: .32 }), 0, 1.2, 0, car); shield.visible = false;
  const flames = [];
  for (const x of type === 1 ? [-.55, .55] : [0]) { const f = new THREE.Group(); f.position.set(x, .75, -(type === 2 ? 1.9 : len + .35)); car.add(f); const outer = mesh(new THREE.ConeGeometry(.42, 1.7, 8), flat(PAL.coral), 0, 0, -.6, f); outer.rotation.x = -Math.PI / 2; const inner = mesh(new THREE.ConeGeometry(.24, 1.2, 8), flat(PAL.sun), 0, 0, -.4, f); inner.rotation.x = -Math.PI / 2; f.visible = false; flames.push(f); }
  car.userData = { driver: k.driver, kart: k.kart, body, wheels, shield, flames, head: driver.userData.head, spin: 0 };
  return car;
}
export function buildDriver(i, color) {
  const g = new THREE.Group(), face = new THREE.Group(); g.add(face);
  const torso = mesh(new THREE.CapsuleGeometry(.42, .5, 4, 10), color, 0, .3, 0, g); outline(torso, 1.1);
  for (const x of [-.55, .55]) { const arm = mesh(new THREE.CapsuleGeometry(.14, .6, 3, 8), color, x, .55, .35, g); arm.rotation.x = -1.1; arm.rotation.z = x * -.35; }
  const wheel = mesh(new THREE.TorusGeometry(.42, .08, 8, 18), PAL.ink, 0, .85, .75, g); wheel.rotation.x = -1.05;
  const skin = ['#cfe2ee', '#8de071', '#f7f1e6', '#f4b183', '#b9c4e6', '#7de3b1'][i] || '#f4b183';
  let head;
  if (i === 0) { head = mesh(new THREE.BoxGeometry(1.15, 1.15, 1.05), skin, 0, 1.3, 0, face); outline(head, 1.06); mesh(new THREE.BoxGeometry(.9, .36, .1), PAL.ink, 0, 1.4, .55, face); for (const x of [-.22, .22]) mesh(new THREE.BoxGeometry(.2, .18, .06), flat(PAL.sky), x, 1.4, .62, face); const ant = mesh(new THREE.CylinderGeometry(.05, .05, .5, 6), PAL.ink, 0, 2.1, 0, face); const ball = mesh(new THREE.SphereGeometry(.16, 8, 6), flat(PAL.coral), 0, 2.4, 0, face); outline(ball, 1.15); face.userData = { ant, ball }; }
  else if (i === 5) { head = mesh(new THREE.IcosahedronGeometry(.68, 1), toon(skin, { transparent: true, opacity: .92 }), 0, 1.3, 0, face); outline(head, 1.06); eyesFor(face, 1.35, .5, .17, PAL.ink); }
  else {
    head = mesh(new THREE.SphereGeometry(.66, 16, 12), skin, 0, 1.3, 0, face); outline(head, 1.06);
    if (i === 1) { head.scale.set(1, 1.12, 1); for (const x of [-.24, .24]) { const e = mesh(new THREE.SphereGeometry(.2, 10, 8), flat(PAL.ink), x, 1.32, .52, face); e.scale.set(1, 1.5, .6); e.rotation.z = -x * 1.3; mesh(new THREE.SphereGeometry(.06, 6, 4), flat('#ffffff'), x * .8, 1.45, .68, face); } for (const x of [-.3, .3]) { const st = mesh(new THREE.CylinderGeometry(.04, .04, .5, 6), PAL.ink, x, 2.05, 0, face); st.rotation.z = -x * .6; const b = mesh(new THREE.SphereGeometry(.13, 8, 6), flat(PAL.sun), x * 1.5, 2.3, 0, face); outline(b, 1.2); } }
    else if (i === 2) { for (const x of [-.24, .24]) { mesh(new THREE.SphereGeometry(.2, 10, 8), flat(PAL.ink), x, 1.35, .5, face); mesh(new THREE.SphereGeometry(.07, 6, 4), flat('#ffffff'), x, 1.37, .66, face); } mesh(new THREE.BoxGeometry(.5, .16, .12), PAL.ink, 0, .98, .6, face); }
    else if (i === 3) { eyesFor(face, 1.38, .5, .16, '#ffffff'); mesh(new THREE.SphereGeometry(.09, 6, 4), flat(PAL.coral), 0, 1.15, .66, face); for (const x of [-.4, .4]) { const ear = mesh(new THREE.ConeGeometry(.24, .55, 4), skin, x, 1.95, 0, face); ear.rotation.y = Math.PI / 4; outline(ear, 1.12); mesh(new THREE.ConeGeometry(.12, .3, 4), flat('#ff9ecb'), x, 1.95, .05, face).rotation.y = Math.PI / 4; } }
    else if (i === 4) { head.material = toon('#b9c4e6'); mesh(new THREE.BoxGeometry(.95, .26, .2), PAL.ink, 0, 1.35, .6, face); for (const x of [-.22, .22]) mesh(new THREE.BoxGeometry(.14, .12, .08), flat(PAL.sky), x, 1.35, .72, face); const plume = mesh(new THREE.ConeGeometry(.22, .9, 8), color, 0, 2.3, -.1, face); plume.rotation.x = .35; outline(plume, 1.15); }
    else eyesFor(face, 1.38, .5, .16, '#ffffff');
  }
  g.userData = { head: face };
  return g;
}
function eyesFor(parent, y, z, r, white) { for (const x of [-.24, .24]) { const e = mesh(new THREE.SphereGeometry(r, 10, 8), flat(white), x, y, z, parent); if (white !== PAL.ink) mesh(new THREE.SphereGeometry(r * .5, 8, 6), flat(PAL.ink), x * 1.1, y, z + r * .75, parent); else mesh(new THREE.SphereGeometry(r * .35, 6, 4), flat('#ffffff'), x * 1.1, y + .03, z + r * .8, parent); } }
// Partículas: um pool fixo de sprites. Nada é criado por quadro.
const PARTICLE_TEX = { puff: 'puff', spark: 'spark', star: 'star', ring: 'ring', streak: 'streak', confetti: 'confetti' };
export class Particles {
  constructor(parent, n = 200) {
    this.items = []; this.group = new THREE.Group(); parent.add(this.group); this.cursor = 0;
    for (let i = 0; i < n; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.puff(), transparent: true, depthWrite: false })); s.visible = false; this.group.add(s); this.items.push({ s, life: 0, max: 1, vx: 0, vy: 0, vz: 0, g: 0, size: 1, grow: 0, spin: 0, fade: 1 }); }
  }
  emit(type, x, y, z, o = {}) {
    let p = null; for (let i = 0; i < this.items.length; i++) { const c = this.items[(this.cursor + i) % this.items.length]; if (c.life <= 0) { p = c; this.cursor = (this.cursor + i + 1) % this.items.length; break; } }
    if (!p) { p = this.items[this.cursor]; this.cursor = (this.cursor + 1) % this.items.length; }
    p.s.material.map = TEX[PARTICLE_TEX[type] || 'puff'](); p.s.material.color.set(o.color || '#ffffff'); p.s.material.rotation = o.rot ?? Math.random() * Math.PI * 2; p.s.material.opacity = o.opacity ?? 1;
    p.s.position.set(x, y, z); p.life = p.max = o.life || .5; p.vx = o.vx || 0; p.vy = o.vy || 0; p.vz = o.vz || 0; p.g = o.g || 0; p.size = o.size || 1; p.grow = o.grow || 0; p.spin = o.spin || 0; p.fade = o.fade ?? 1; p.s.scale.setScalar(p.size); p.s.visible = true;
  }
  burst(type, x, y, z, n, o = {}) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = (o.speed || 6) * (.4 + Math.random() * .6); this.emit(type, x, y, z, { ...o, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: (o.up || 4) * (.5 + Math.random()), size: (o.size || 1) * (.7 + Math.random() * .6), color: Array.isArray(o.color) ? o.color[i % o.color.length] : o.color }); } }
  update(dt) {
    for (const p of this.items) { if (p.life <= 0) continue; p.life -= dt; if (p.life <= 0) { p.s.visible = false; continue; } const t = p.life / p.max; p.vy -= p.g * dt; p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; p.s.position.z += p.vz * dt; p.s.scale.setScalar(p.size * (1 + p.grow * (1 - t))); p.s.material.opacity = p.fade ? Math.min(1, t * 2) : 1; p.s.material.rotation += p.spin * dt; }
  }
  dispose() { for (const p of this.items) p.s.material.dispose(); this.group.removeFromParent(); }
}
