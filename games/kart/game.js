// Kart uses the Arcade room, its player seats and its existing WebSocket.
const crypto = require('node:crypto');
const { performance } = require('node:perf_hooks');
const Sim = require('../../shared/kart/simulation');
const DRIVERS = ['Robô', 'Alien', 'Esqueleto', 'Gato', 'Cavaleiro', 'Geleia'];
const KARTS = ['Faísca', 'Cometa', 'Tijolinho'];
const INPUT_TTL = 350;
module.exports = {
  meta: { id: 'kart', name: 'KART', emoji: '🏎️', tagline: 'Acelere, derrape e dispute. Seu celular é o controle.', art: 'linear-gradient(180deg,#58c8f5 0,#9fdcfb 48%,#7fd35b 48.5%,#4aa848 100%)', minPlayers: 2, maxPlayers: 4 },
  create(api) {
    let phase = 'setup', mode = 'race', matchId = crypto.randomUUID(), roster = [], world = null;
    let tvReady = false, countdown = 3, error = '', loop = null, inputs = new Map();
    let previous = 0, accumulator = 0, streamClock = 0, phaseClock = 0, disposed = false, lastDiag = -Infinity;
    const now = () => performance.now();
    function entrant(p, i) { return { pid: p.pid, name: p.name, color: api.colorInfo(p.color).hex, driver: i % DRIVERS.length, kart: 0, ready: false }; }
    function syncNames() {
      for (const p of roster) { const live = api.byPid(p.pid); if (live) p.name = live.name; }
    }
    function canStart() { return roster.length >= 2 && roster.length <= 4 && roster.every(p => p.ready); }
    function stopLoop() { clearInterval(loop); loop = null; inputs.clear(); }
    function publish() { if (!disposed) api.broadcast(); }
    function beginCountdown() { phase = 'countdown'; countdown = 3; phaseClock = 0; publish(); }
    function startLoop() {
      stopLoop(); previous = now(); accumulator = 0; streamClock = 0;
      loop = setInterval(() => {
        if (disposed) return;
        const n = now(); accumulator += Math.min(.1, (n - previous) / 1000); previous = n;
        while (accumulator >= 1 / 60) {
          accumulator -= 1 / 60;
          if (phase === 'loading') {
            phaseClock += 1 / 60;
            if (tvReady) { beginCountdown(); }
            else if (phaseClock >= 20) { phase = 'setup'; error = 'A TV não ficou pronta. Abra a tela da TV e tente de novo.'; stopLoop(); publish(); return; }
          } else if (phase === 'countdown') {
            phaseClock += 1 / 60;
            const next = Math.max(0, Math.ceil(3 - phaseClock));
            if (next !== countdown) { countdown = next; if (!next) phase = 'playing'; publish(); }
          } else if (phase === 'playing') {
            const sampled = new Map();
            for (const p of roster) {
              const input = inputs.get(p.pid);
              const active = !!input && n - input.at < INPUT_TTL && input.active;
              sampled.set(p.pid, active ? { steer: input.steer, drift: input.drift, item: input.item || input.pendingItem, boost: input.boost || input.pendingBoost, active: true } : { steer: 0, drift: false, item: false, boost: false, active: false });
              if (input) { input.pendingItem = false; input.pendingBoost = false; }
            }
            Sim.step(world, sampled, 1 / 60);
            if (world.finished) { phase = 'results'; stopLoop(); api.setEvent('Partida encerrada! Veja o resultado na TV.'); publish(); return; }
          }
        }
        streamClock += 1;
        // Three simulation ticks per 20 Hz snapshot. State transitions use the core path.
        if (streamClock >= 3) { streamClock = 0; api.stream(); }
      }, 1000 / 60);
      if (loop.unref) loop.unref();
    }
    function setupAgain() {
      stopLoop(); phase = 'setup'; world = null; error = ''; countdown = 3;
      matchId = crypto.randomUUID(); tvReady = false;
      for (const p of roster) p.ready = false;
    }
    return {
      start() { roster = api.players.slice(0, 4).map(entrant); api.setEvent('Escolha CORRIDA ou BATALHA. Cada pessoa prepara seu piloto no celular.'); },
      action(player, msg) {
        const p = roster.find(x => x.pid === player.pid);
        const host = roster[0] && roster[0].pid === player.pid;
        if (phase === 'results' && msg.t === 'kart-again' && host) { setupAgain(); return; }
        if (phase !== 'setup') return;
        error = '';
        if (msg.t === 'kart-seat') {
          if (p) roster = roster.filter(x => x.pid !== player.pid);
          else if (roster.length < 4) roster.push(entrant(player, roster.length));
          return;
        }
        if (!p) return;
        if (msg.t === 'kart-mode' && host && ['race', 'battle'].includes(msg.mode)) {
          mode = msg.mode; for (const x of roster) x.ready = false;
        }
        if (msg.t === 'kart-select') {
          if (Number.isInteger(msg.driver) && msg.driver >= 0 && msg.driver < DRIVERS.length) p.driver = msg.driver;
          if (Number.isInteger(msg.kart) && msg.kart >= 0 && msg.kart < KARTS.length) p.kart = msg.kart;
          p.ready = false;
        }
        if (msg.t === 'kart-ready') p.ready = !p.ready;
        if (msg.t === 'kart-start' && host && canStart()) {
          syncNames(); world = Sim.createMatch(roster, mode); phase = 'loading'; phaseClock = 0; startLoop();
        }
      },
      tvAction(msg) {
        // A TV não tem console: quando o 3D não sobe, ela conta o que a tela tem e o servidor
        // registra uma linha (no máximo uma a cada 20 s, com o texto cortado e sem quebras).
        if (msg.t === 'kart-tv-3d') {
          const n = now();
          if (n - lastDiag > 20000) {
            lastDiag = n;
            const cut = v => String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').slice(0, 200);
            console.log(`[kart] TV sem 3D · webgl2=${msg.webgl2 === true} webgl1=${msg.webgl1 === true} módulos=${msg.modules === true} · ${cut(msg.renderer)} · ${cut(msg.error)} · ${cut(msg.ua)}`);
          }
          return false;
        }
        if (msg.t !== 'kart-tv-ready' || msg.matchId !== matchId || tvReady) return false;
        tvReady = true;
        return true;
      },
      input(player, msg) {
        if (!['loading', 'countdown', 'playing'].includes(phase) || msg.matchId !== matchId || !roster.some(p => p.pid === player.pid)) return;
        if (typeof msg.steer !== 'number' || !Number.isFinite(msg.steer)) return;
        const old = inputs.get(player.pid);
        inputs.set(player.pid, {
          at: now(), steer: Math.max(-1, Math.min(1, msg.steer)), drift: msg.drift === true,
          item: msg.item === true, boost: msg.boost === true, active: msg.active === true,
          pendingItem: !!(old && old.pendingItem) || (msg.item === true && !(old && old.item)),
          pendingBoost: !!(old && old.pendingBoost) || (msg.boost === true && !(old && old.boost)),
        });
      },
      view(me, type) {
        syncNames();
        const snapshot = world ? Sim.publicState(world) : null;
        const mine = world && me ? world.karts.find(p => p.pid === me.pid) : null;
        // Inventory is private to its phone; all physical effects remain public.
        if (snapshot) for (const p of snapshot.karts) delete p.item;
        return { phase, mode, matchId, hostPid: roster[0] ? roster[0].pid : null, roster: roster.map(p => ({ ...p })), canStart: canStart(), tvReady, countdown, error,
          drivers: DRIVERS, karts: KARTS, world: snapshot,
          private: type === 'phone' && mine ? { item: mine.item, boostCooldown: mine.boostCooldown, driftCharge: mine.driftCharge, hp: mine.hp, respawn: mine.respawn, boost: mine.boost, hit: Math.max(mine.lastHit, mine.bump) } : null };
      },
      onPlayerJoin(p) { if (phase === 'setup' && roster.length < 4) roster.push(entrant(p, roster.length)); },
      onPlayerLeave(pid) {
        // A core identity merge removes a duplicate seat, not the surviving driver.
        if (api.byPid(pid)) return;
        roster = roster.filter(p => p.pid !== pid); inputs.delete(pid);
        if (world) world.karts = world.karts.filter(p => p.pid !== pid);
        if (phase !== 'setup' && roster.length < 2) api.exit('Poucos pilotos: voltamos para a biblioteca.');
      },
      rekey(oldPid, newPid) {
        if (roster.some(p => p.pid === oldPid)) roster = roster.filter(p => p.pid !== newPid);
        for (const p of roster) if (p.pid === oldPid) p.pid = newPid;
        if (world) {
          if (world.karts.some(p => p.pid === oldPid)) world.karts = world.karts.filter(p => p.pid !== newPid);
          for (const p of world.karts) if (p.lastAttacker === oldPid) p.lastAttacker = newPid;
          for (const p of world.karts) if (p.pid === oldPid) p.pid = newPid;
          for (const p of world.results || []) if (p.pid === oldPid) p.pid = newPid;
          for (const p of world.projectiles || []) if (p.owner === oldPid) p.owner = newPid;
        }
        inputs.delete(oldPid); inputs.delete(newPid);
      },
      serialize() { return { version: 1, mode, roster, phase: phase === 'results' ? phase : 'setup', world: phase === 'results' ? world : null }; },
      restore(data) {
        setupAgain();
        if (data.version !== 1) { roster = api.players.slice(0, 4).map(entrant); return; }
        mode = data.mode === 'battle' ? 'battle' : 'race';
        roster = (data.roster || []).filter(p => api.byPid(p.pid)).slice(0, 4).map(p => ({ ...p, ready: false }));
        if (data.phase === 'results' && data.world) { phase = 'results'; world = data.world; }
        else error = 'Servidor reiniciado. Os pilotos foram mantidos; preparem uma nova largada.';
      },
      destroy() { disposed = true; stopLoop(); },
    };
  },
};
