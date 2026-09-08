// Dados do mundo do KART: pista, arena, rampas, muros e a geometria que colisão e desenho compartilham.
// Roda no servidor (Node) e na TV — inclusive a TV antiga (Chrome 47), por isso fica em ES5.
(function (root, factory) { var api = factory(); if (typeof module !== 'undefined' && module.exports) module.exports = api; root.KartWorld = api; })(typeof window !== 'undefined' ? window : global, function () {
  'use strict';
  var ROAD_WIDTH = 16;
  var TAU = Math.PI * 2;
  // Harmônicos suaves criam retas, curvas em S e raios diferentes sem produzir cruzamentos.
  function center(p) {
    var a = p * TAU;
    return { x: Math.sin(a) * 70 + Math.sin(a * 2) * 10, z: Math.cos(a) * 45 + Math.cos(a * 3) * 5, y: 1.7 * (1 - Math.cos(a)) + .55 * (1 - Math.cos(a * 2 + .6)) };
  }
  var TRACK = [];
  for (var i = 0; i < 96; i++) TRACK.push(center(i / 96));
  function nearest(x, z) {
    var best = { distance: Infinity };
    for (var i = 0; i < TRACK.length; i++) {
      var a = TRACK[i], b = TRACK[(i + 1) % 96], dx = b.x - a.x, dz = b.z - a.z;
      var t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
      var px = a.x + dx * t, pz = a.z + dz * t, distance = Math.hypot(x - px, z - pz);
      if (distance < best.distance) best = { x: px, z: pz, y: a.y + (b.y - a.y) * t, distance: distance, progress: (i + t) / 96 % 1, heading: Math.atan2(dx, dz), index: i };
    }
    return best;
  }
  function point(p, offset) {
    offset = offset || 0;
    var q = center(p), before = center(p - .001), after = center(p + .001), heading = Math.atan2(after.x - before.x, after.z - before.z);
    return { x: q.x + Math.cos(heading) * offset, z: q.z - Math.sin(heading) * offset, y: q.y, heading: heading };
  }
  function pickupsAt(list) { var out = []; for (var i = 0; i < list.length; i++) { out.push(point(list[i], -3)); out.push(point(list[i], 3)); } return out; }
  function ramp(p, width, length, height) { var q = point(p); return { x: q.x, z: q.z, y: q.y, heading: q.heading, width: width, length: length, height: height }; }
  function shortcut(p, offset, width, depth) { var q = point(p, offset); return { x: q.x, z: q.z, y: q.y, width: width, depth: depth }; }
  // Cada mapa traz também um "tema" para o desenho (cores do céu, chão e cenário). Mais pistas: mais entradas aqui.
  var race = {
    name: 'Circuito Aurora', track: TRACK, width: ROAD_WIDTH,
    spawns: [point(.012, -3), point(.012, 3), point(.001, -3), point(.001, 3)],
    boosts: [point(.15, -3), point(.15, 3), point(.45), point(.73, -3), point(.73, 3)],
    pickups: pickupsAt([.07, .29, .55, .84]),
    ramps: [ramp(.18, 8, 8, 2.2), ramp(.51, 11, 10, 2.8), ramp(.77, 8, 8, 2.2)],
    barriers: [], hazards: [], platforms: [],
    shortcuts: [shortcut(.24, -10, 20, 9), shortcut(.68, 10, 22, 9)],
    theme: { sky: ['#3d8fe0', '#8fd3ff', '#ffe6b3'], horizon: '#ffe6b3', grass: ['#6cc84a', '#5db63f'], far: ['#8ed86e', '#74c055'], road: ['#5a5478', '#6b6492'], rumble: ['#ff5e5b', '#fff1c9'], line: '#fff1c9', mountains: ['#7fb6e8', '#5f95cf', '#4a7bb8'], trees: 1 },
  };
  var battle = {
    name: 'Forte Prisma', track: [], width: 110,
    spawns: [{ x: -32, z: -32, y: 0, heading: .8 }, { x: 32, z: 32, y: 0, heading: 3.9 }, { x: 32, z: -32, y: 0, heading: -.8 }, { x: -32, z: 32, y: 0, heading: 2.4 }],
    boosts: [{ x: 0, z: 32, y: 0 }, { x: 0, z: -32, y: 0 }],
    pickups: [{ x: 0, z: 0, y: 0 }, { x: -25, z: 0, y: 0 }, { x: 25, z: 0, y: 0 }, { x: 0, z: 40, y: 0 }, { x: 0, z: -40, y: 0 }, { x: 0, z: 16, y: 4 }],
    ramps: [{ x: -24, z: 16, y: 0, width: 12, length: 16, height: 4, heading: Math.PI / 2 }, { x: 24, z: 16, y: 0, width: 12, length: 16, height: 4, heading: -Math.PI / 2 }, { x: 0, z: -16, y: 0, width: 12, length: 12, height: 3, heading: 0 }],
    platforms: [{ x: 0, z: 16, y: 4, width: 32, depth: 12 }],
    barriers: [{ x: -55, z: 0, width: 2, depth: 110, height: 4 }, { x: 55, z: 0, width: 2, depth: 110, height: 4 }, { x: 0, z: -55, width: 110, depth: 2, height: 4 }, { x: 0, z: 55, width: 110, depth: 2, height: 4 }],
    hazards: [{ x: -37, z: 20, radius: 6 }, { x: 37, z: -20, radius: 6 }],
    shortcuts: [],
    theme: { sky: ['#2b2a6e', '#7b5cd6', '#ffb27a'], horizon: '#ffb27a', grass: ['#5fbf63', '#52ad57'], far: ['#7fcf88', '#6fbf78'], road: ['#8d84b8', '#978ec3'], rumble: ['#7c5cff', '#fff1c9'], line: '#fff1c9', mountains: ['#9a86d8', '#7b66c2', '#5d4aa6'], trees: 1 },
  };
  function map(mode) { return mode === 'battle' ? battle : race; }
  function ground(x, z, mode, currentY) {
    if (currentY === undefined) currentY = Infinity;
    var m = map(mode), y = mode === 'battle' ? 0 : nearest(x, z).y, i;
    for (i = 0; i < m.platforms.length; i++) { var p = m.platforms[i]; if (Math.abs(x - p.x) <= p.width / 2 && Math.abs(z - p.z) <= p.depth / 2 && currentY >= p.y - .6) y = Math.max(y, p.y); }
    for (i = 0; i < m.ramps.length; i++) {
      var r = m.ramps[i], dx = x - r.x, dz = z - r.z, along = dx * Math.sin(r.heading) + dz * Math.cos(r.heading), side = dx * Math.cos(r.heading) - dz * Math.sin(r.heading);
      if (Math.abs(side) < r.width / 2 && Math.abs(along) <= r.length / 2) { var ry = r.y + (along / r.length + .5) * r.height; if (currentY >= ry - .8) y = Math.max(y, ry); }
    }
    return y;
  }
  return { TRACK: TRACK, ROAD_WIDTH: ROAD_WIDTH, map: map, nearest: nearest, ground: ground, point: point };
});
