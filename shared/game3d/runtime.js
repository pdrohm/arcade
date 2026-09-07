import * as THREE from '/vendor/three/three.module.js';
// Motor mínimo: um renderizador, uma cena, várias câmeras (uma por jogador) e o buffer de quadros.
// A luz é de desenho animado: céu claro, sol quente e sombra em degraus (os materiais toon fazem o resto).
export class Game3D {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
    this.renderer.setScissorTest(true);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#cdeafb');
    this.scene.fog = new THREE.Fog('#cdeafb', 120, 330);
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#9fd3ff', 2.2));
    const sun = new THREE.DirectionalLight('#fff4dc', 2.4); sun.position.set(-60, 90, 70); this.scene.add(sun);
    this.cameras = new CameraSystem(); this.canvas = canvas; this.size = [0, 0]; this.frames = 0; this.cost = 0;
  }
  render(views, dt) {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    if (w !== this.size[0] || h !== this.size[1]) { this.renderer.setSize(w, h, false); this.size = [w, h]; }
    for (const v of views) {
      const r = v.rect, x = Math.floor(r.x * w), y = Math.floor((1 - r.y - r.h) * h), width = Math.ceil(r.w * w), height = Math.ceil(r.h * h);
      const camera = this.cameras.get(v.id, v.target, width / height, dt, v.overhead, v.orbit);
      this.renderer.setViewport(x, y, width, height); this.renderer.setScissor(x, y, width, height); this.renderer.render(this.scene, camera);
    }
    this.cost += Math.min(dt, 0.1); this.frames++;
    if (this.frames >= 180) { if (this.cost / this.frames > 0.024) this.renderer.setPixelRatio(Math.max(0.65, this.renderer.getPixelRatio() - 0.15)); this.frames = 0; this.cost = 0; }
  }
  dispose() {
    const geometries = new Set(), materials = new Set();
    this.scene.traverse(o => { if (o.geometry) geometries.add(o.geometry); if (o.material) for (const m of Array.isArray(o.material) ? o.material : [o.material]) materials.add(m); });
    for (const g of geometries) g.dispose(); for (const m of materials) m.dispose();
    this.renderer.dispose(); this.renderer.forceContextLoss(); this.cameras.items.clear();
  }
}
export class CameraSystem {
  constructor() { this.items = new Map(); this.desired = new THREE.Vector3(); this.focus = new THREE.Vector3(); }
  static layout(n) {
    if (n <= 1) return [{ x: 0, y: 0, w: 1, h: 1 }];
    if (n === 2) return [{ x: 0, y: 0, w: 0.5, h: 1 }, { x: 0.5, y: 0, w: 0.5, h: 1 }];
    return Array.from({ length: n }, (_, i) => ({ x: (i % 2) / 2, y: Math.floor(i / 2) / 2, w: 0.5, h: 0.5 }));
  }
  // Câmera de perseguição um pouco alta e recuada: mostra a pista à frente como um cenário de
  // ilustração (o kart fica no terço de baixo). Em modo visão geral ela passeia devagar ao redor.
  get(id, t, aspect, dt, overhead = false, orbit = 0) {
    let c = this.items.get(id); const fresh = !c;
    if (!c) { c = new THREE.PerspectiveCamera(60, aspect, 0.2, 900); this.items.set(id, c); }
    const fov = overhead ? 55 : t.boost > 0 ? 72 : 60;
    if (fresh) c.fov = fov; else c.fov += (fov - c.fov) * (1 - Math.exp(-dt * 6));
    c.aspect = aspect; c.updateProjectionMatrix();
    if (overhead) { const a = orbit * .12 - .9, d = 118; this.desired.set(t.x + Math.sin(a) * d, t.y + 62, t.z + Math.cos(a) * d); this.focus.set(t.x, t.y + 2, t.z); }
    else { const s = Math.sin(t.heading), z = Math.cos(t.heading); this.desired.set(t.x - s * 12.5, t.y + 7.4, t.z - z * 12.5); this.focus.set(t.x + s * 10, t.y + 1.4, t.z + z * 10); }
    if (fresh || c.position.distanceTo(this.desired) > 40) c.position.copy(this.desired); else c.position.lerp(this.desired, 1 - Math.exp(-dt * (overhead ? 3 : 10)));
    c.lookAt(this.focus); return c;
  }
}
export class SnapshotBuffer {
  constructor() { this.samples = []; }
  push(world) { if (!world || this.samples.at(-1)?.world === world) return; this.samples.push({ at: performance.now(), world }); if (this.samples.length > 6) this.samples.shift(); }
  read(now) {
    if (!this.samples.length) return null;
    const t = now - 75; let a = this.samples[0], b = a;
    for (const s of this.samples) { if (s.at <= t) a = s; if (s.at >= t) { b = s; break; } b = s; }
    const f = Math.max(0, Math.min(1, (t - a.at) / Math.max(1, b.at - a.at)));
    return { ...b.world, karts: b.world.karts.map(k => { const old = a.world.karts.find(p => p.pid === k.pid); if (!old || Math.hypot(k.x - old.x, k.z - old.z) > 20) return k; const turn = Math.atan2(Math.sin(k.heading - old.heading), Math.cos(k.heading - old.heading)); return { ...k, x: old.x + (k.x - old.x) * f, y: old.y + (k.y - old.y) * f, z: old.z + (k.z - old.z) * f, heading: old.heading + turn * f }; }) };
  }
}
