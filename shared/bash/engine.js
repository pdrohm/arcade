// Motor comum dos quatro jogos de arena (Crate Crush, Polar Push, Pogo Pandemonium, Ballistix).
// Só o servidor roda este arquivo. Cada jogo entrega uma simulação (games/<id>/sim.js) e o motor
// cuida do resto: vagas (até 4, a CPU completa), regras escolhidas pelo primeiro jogador, TV pronta,
// 3-2-1, rodadas, troféus ("quem ganha N rodadas leva"), revanche, quedas e reconexão.
//
// Contrato da simulação (sim.js):
//   levels: [{ id, name, short, how: [frases] }]            as 4 arenas do jogo
//   controls(levelId) → { stick: 'free'|'axis'|'grid', buttons: [{ id:'a'|'b'|'c', label, hold? }] }
//   create(entrants, { level, cpuLevel }) → world             entrants: [{ slot, bot, name, color }]
//   step(world, inputs, dt)                                   inputs[slot] = { x, y, a, b, c, ap, bp, cp, ar, br, cr }
//                                                             (ap = apertou neste passo, ar = soltou neste passo)
//     A rodada acaba quando a simulação põe world.result = { winners: [slot…], order: [slot…] }.
//     Depois disso o motor ainda chama step() uns segundos (festa do vencedor); o resultado não muda mais.
//     Efeitos de um instante (explosão, gol, pancada) vão em world.fx.push({ k, ... }).
//   bot(world, slot, skill, dt) → input                       skill: 0 fácil, 1 normal, 2 difícil
//   snapshot(world) → estado público (números arredondados)   vai para a TV ~30 vezes por segundo
//   private(world, slot) → { status, hp, max, out, hit }      vai só para o celular daquela vaga
'use strict';
const crypto = require('node:crypto');
const { performance } = require('node:perf_hooks');
const Avatar = require('../avatar');

const DT = 1 / 60, INPUT_TTL = 350, TV_WAIT = 6, COUNT = 3, ROUND_END = 3.6;
const BOT_COLORS = ['#f97316', '#22d3ee', '#a3e635', '#f472b6', '#facc15', '#60a5fa', '#c084fc', '#94a3b8'];
const BOT_NAMES = ['Tatu', 'Jacaré', 'Quati', 'Capivara', 'Tucano', 'Mico', 'Lontra', 'Gambá'];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

module.exports = function bashGame(meta, Sim) {
  return {
    meta: Object.assign({ category: 'acao', minPlayers: 1, maxPlayers: 4, spectators: true }, meta),
    sim: Sim,
    create(api) {
      let phase = 'setup', matchId = crypto.randomUUID(), error = '';
      let roster = [];                  // pids de quem vai jogar (até 4), na ordem das vagas
      let level = 0, cpu = true, cpuLevel = 1, target = 2;
      let entrants = [], world = null, wins = [], roundNo = 0, roundWinners = [], champions = [];
      let tvReady = false, clock = 0, countdown = COUNT, loop = null, previous = 0, acc = 0, ticks = 0, disposed = false;
      let inputs = new Map(), fxLog = [], fxSeq = 0, snap = null, snapTick = -1;
      const now = () => performance.now();
      const host = () => roster[0] || (api.players[0] && api.players[0].pid) || null;
      const levelId = () => Sim.levels[level].id;
      const publish = () => { if (!disposed) api.broadcast(); };
      const humanCount = () => roster.filter(pid => api.byPid(pid)).length;
      const canStart = () => humanCount() >= 1 && (cpu || humanCount() >= 2);

      function seatFor(pid) { return entrants.find(e => e.pid === pid) || null; }
      function makeEntrants() {
        const list = [], used = new Set();
        for (const pid of roster) {
          const p = api.byPid(pid); if (!p) continue;
          const hex = (api.colorInfo(p.color) || { hex: '#94a3b8' }).hex; used.add(hex);
          list.push({ slot: list.length, pid, bot: false, name: p.name, color: hex, av: p.av });
        }
        let b = 0;
        const names = BOT_NAMES.slice().sort(() => Math.random() - .5);
        while (cpu && list.length < 4) {
          const color = BOT_COLORS.find(c => !used.has(c)) || BOT_COLORS[b % BOT_COLORS.length]; used.add(color);
          list.push({ slot: list.length, pid: null, bot: true, name: 'CPU ' + names[b % names.length], color, av: Avatar.random() });
          b++;
        }
        return list;
      }
      function stopLoop() { clearInterval(loop); loop = null; inputs.clear(); }
      function newWorld() {
        world = Sim.create(entrants.map(e => ({ slot: e.slot, bot: e.bot, name: e.name, color: e.color })), { level: levelId(), cpuLevel });
        world.fx = world.fx || [];
        fxLog = []; snap = null; snapTick = -1;
      }
      function beginMatch() {
        entrants = makeEntrants(); wins = entrants.map(() => 0); roundNo = 0; roundWinners = []; champions = [];
        matchId = crypto.randomUUID(); tvReady = false; error = '';
        roundNo = 1; newWorld();
        phase = 'loading'; clock = 0; startLoop(); publish();
      }
      function nextRound() { roundNo++; newWorld(); phase = 'countdown'; clock = 0; countdown = COUNT; publish(); }
      function sample(e, n) {
        if (e.bot) return Sim.bot(world, e.slot, cpuLevel, DT) || {};
        const s = inputs.get(e.pid);
        if (!s || n - s.at > INPUT_TTL || !s.active) return { x: 0, y: 0, a: false, b: false, c: false, ap: false, bp: false, cp: false, ar: !!(s && s.a), br: !!(s && s.b), cr: !!(s && s.c) };
        const out = { x: s.x, y: s.y, a: s.a, b: s.b, c: s.c, ap: s.ap, bp: s.bp, cp: s.cp, ar: s.ar, br: s.br, cr: s.cr };
        s.ap = s.bp = s.cp = s.ar = s.br = s.cr = false;
        return out;
      }
      function drainFx() {
        const list = world.fx; if (!list || !list.length) return;
        for (const f of list) { f.id = ++fxSeq; f.at = world.time || 0; fxLog.push(f); }
        list.length = 0;
        const cut = (world.time || 0) - 1.2;
        while (fxLog.length && fxLog[0].at < cut) fxLog.shift();
        if (fxLog.length > 80) fxLog.splice(0, fxLog.length - 80);
      }
      function stepWorld(n, live) {
        const ins = [];
        for (const e of entrants) ins[e.slot] = live ? sample(e, n) : { x: 0, y: 0 };
        Sim.step(world, ins, DT);
        drainFx();
      }
      function endRound() {
        const r = world.result || { winners: [] };
        roundWinners = (r.winners || []).filter(s => entrants[s]);
        for (const s of roundWinners) wins[s]++;
        const top = Math.max.apply(null, wins);
        phase = 'roundEnd'; clock = 0;
        if (top >= target) champions = entrants.filter(e => wins[e.slot] === top).map(e => e.slot);
        const names = roundWinners.map(s => entrants[s].name);
        api.setEvent(names.length ? `${names.join(' e ')} venceu a rodada ${roundNo}!` : `Rodada ${roundNo} empatada.`);
        publish();
      }
      function finish() {
        phase = 'results'; stopLoop();
        const names = champions.map(s => entrants[s].name);
        api.setEvent(`${names.join(' e ')} ganhou o troféu de ${meta.name}!`);
        publish();
      }
      function startLoop() {
        stopLoop(); previous = now(); acc = 0; ticks = 0;
        loop = setInterval(() => {
          if (disposed || !world) return;
          const n = now(); acc += Math.min(.1, (n - previous) / 1000); previous = n;
          while (acc >= DT) {
            acc -= DT; clock += DT;
            if (phase === 'loading') {
              if (tvReady || clock >= TV_WAIT) {
                if (!tvReady && api.tvCount() === 0) { phase = 'setup'; error = 'Nenhuma TV aberta nesta sala. Abra /tv no navegador da TV e comece de novo.'; stopLoop(); publish(); return; }
                phase = 'countdown'; clock = 0; countdown = COUNT; publish();
              }
            } else if (phase === 'countdown') {
              const c = Math.max(0, Math.ceil(COUNT - clock));
              if (c !== countdown) { countdown = c; if (!c) { phase = 'playing'; clock = 0; } publish(); }
            } else if (phase === 'playing') {
              stepWorld(n, true);
              if (world.result) { endRound(); }
            } else if (phase === 'roundEnd') {
              stepWorld(n, true);
              if (clock >= ROUND_END) { if (champions.length) { finish(); return; } nextRound(); }
            }
          }
          if (++ticks % 2 === 0) api.stream();   // 30 quadros por segundo; trocas de fase usam o broadcast
        }, 1000 / 60);
        if (loop.unref) loop.unref();
      }
      function snapshot() {
        if (!world) return null;
        if (snapTick !== fxSeq * 1e6 + Math.round((world.time || 0) * 60)) {
          snapTick = fxSeq * 1e6 + Math.round((world.time || 0) * 60);
          snap = Sim.snapshot(world); snap.t = Math.round((world.time || 0) * 1000) / 1000; snap.fx = fxLog.slice();
        }
        return snap;
      }
      function toSetup(msg) {
        stopLoop(); phase = 'setup'; world = null; entrants = []; champions = []; roundWinners = []; error = msg || '';
        matchId = crypto.randomUUID(); tvReady = false;
      }
      function view(me, type) {
        const seated = me ? seatFor(me.pid) : null;
        const live = me ? api.byPid(me.pid) : null;
        for (const e of entrants) if (e.pid) { const p = api.byPid(e.pid); if (p) { e.name = p.name; e.av = p.av; } }
        return {
          phase, matchId, error, level, cpu, cpuLevel, target, hostPid: host(), canStart: canStart(),
          levels: Sim.levels.map(l => ({ id: l.id, name: l.name, short: l.short, how: l.how })),
          controls: Sim.controls(levelId()),
          roster: roster.map(pid => { const p = api.byPid(pid); return p ? { pid, name: p.name, color: (api.colorInfo(p.color) || {}).hex, av: p.av } : null; }).filter(Boolean),
          seats: entrants.map(e => ({ slot: e.slot, pid: e.pid, bot: e.bot, name: e.name, color: e.color, av: e.av, wins: wins[e.slot] || 0 })),
          roundNo, countdown, roundWinners, champions,
          world: type === 'tv' && phase !== 'setup' && phase !== 'results' ? snapshot() : null,
          me: type === 'phone' && seated && world ? Object.assign({ slot: seated.slot }, Sim.private(world, seated.slot)) : (seated ? { slot: seated.slot } : null),
          spectator: type === 'phone' && !!live && !seated && phase !== 'setup',
        };
      }
      return {
        start() { roster = api.players.slice(0, 4).map(p => p.pid); api.setEvent(`${meta.name}: o primeiro jogador escolhe a arena no celular.`); },
        action(player, msg) {
          const isHost = player.pid === host();
          if (msg.t === 'bash-seat' && phase === 'setup') {
            if (roster.includes(player.pid)) roster = roster.filter(p => p !== player.pid);
            else if (roster.length < 4) roster.push(player.pid);
            error = ''; return;
          }
          if (!isHost) return;
          if (phase === 'setup') {
            error = '';
            if (msg.t === 'bash-level' && Number.isInteger(msg.level) && msg.level >= 0 && msg.level < Sim.levels.length) level = msg.level;
            if (msg.t === 'bash-cpu') cpu = !!msg.on;
            if (msg.t === 'bash-cpulevel' && [0, 1, 2].includes(msg.v)) cpuLevel = msg.v;
            if (msg.t === 'bash-target' && [1, 2, 3].includes(msg.n)) target = msg.n;
            if (msg.t === 'bash-start' && canStart()) beginMatch();
            return;
          }
          if (phase === 'results' && msg.t === 'bash-again') { roster = roster.filter(pid => api.byPid(pid)); if (canStart()) beginMatch(); else toSetup(); return; }
          if (phase === 'results' && msg.t === 'bash-setup') { toSetup(); return; }
          if (msg.t === 'bash-abort' && phase !== 'setup') { toSetup('Partida interrompida.'); return; }
        },
        tvAction(msg) {
          if (msg.t !== 'bash-tv-ready' || msg.matchId !== matchId || tvReady) return false;
          tvReady = true; return false;
        },
        input(player, msg) {
          if (!['countdown', 'playing', 'roundEnd', 'loading'].includes(phase) || msg.matchId !== matchId || !seatFor(player.pid)) return;
          const old = inputs.get(player.pid) || {};
          const a = msg.a === true, b = msg.b === true, c = msg.c === true;
          inputs.set(player.pid, {
            at: now(), active: msg.active === true, x: clamp(num(msg.x), -1, 1), y: clamp(num(msg.y), -1, 1), a, b, c,
            ap: !!old.ap || (a && !old.a), bp: !!old.bp || (b && !old.b), cp: !!old.cp || (c && !old.c),
            ar: !!old.ar || (!a && !!old.a), br: !!old.br || (!b && !!old.b), cr: !!old.cr || (!c && !!old.c),
          });
        },
        view,
        onPlayerJoin(p) { if (phase === 'setup' && roster.length < 4 && !roster.includes(p.pid)) roster.push(p.pid); },
        onPlayerLeave(pid) {
          if (api.byPid(pid)) return;   // fusão de vagas do núcleo: a pessoa continua na sala
          roster = roster.filter(p => p !== pid); inputs.delete(pid);
          const e = seatFor(pid);
          if (e) { e.pid = null; e.bot = true; e.name = e.name + ' (CPU)'; if (world && Sim.makeBot) Sim.makeBot(world, e.slot); }
          if (phase !== 'setup' && phase !== 'results' && !entrants.some(x => !x.bot)) { toSetup('Todo mundo saiu da partida.'); }
        },
        rekey(oldPid, newPid) {
          roster = roster.filter(p => p !== newPid).map(p => (p === oldPid ? newPid : p));
          for (const e of entrants) if (e.pid === oldPid) e.pid = newPid;
          inputs.delete(oldPid); inputs.delete(newPid);
        },
        serialize() { return { version: 1, roster, level, cpu, cpuLevel, target }; },
        restore(d) {
          toSetup();
          if (!d || d.version !== 1) { roster = api.players.slice(0, 4).map(p => p.pid); return; }
          roster = (d.roster || []).filter(pid => api.byPid(pid)).slice(0, 4);
          level = clamp(d.level | 0, 0, Sim.levels.length - 1); cpu = d.cpu !== false; cpuLevel = [0, 1, 2].includes(d.cpuLevel) ? d.cpuLevel : 1; target = [1, 2, 3].includes(d.target) ? d.target : 2;
          if (d.phase && d.phase !== 'setup') error = 'O servidor reiniciou. Comecem de novo.';
        },
        destroy() { disposed = true; stopLoop(); },
        // só para os testes: avança a simulação sem esperar o relógio
        _debug: { get world() { return world; }, get phase() { return phase; }, entrants: () => entrants },
      };
    },
  };
};
