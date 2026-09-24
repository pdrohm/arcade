// Último de Pé. Party game de memória espacial e ação simultânea, em duas variantes:
//   🐧 Pinguins — num bloco de gelo, todo mundo dá um dash ao mesmo tempo. Quem cai na água sai.
//   🤠 Tiroteio — numa arena do velho oeste, todo mundo atira ao mesmo tempo. Quem leva tiro sai.
//
// Uma rodada é uma pequena máquina de estados, igual para as duas variantes:
//   intro (só na 1ª) → reveal (MEMORIZE: todos visíveis) → aim (escondidos: cada um gira a mira)
//   → ready (3, 2, 1: ainda dá para girar) → lock (as miras fecham; folga curta para o ping)
//   → action (o servidor resolve UMA vez e todas as telas tocam o mesmo replay) → result → …
//   … → reveal da próxima rodada, ou end.
//
// Quem manda é o servidor: ele abre e fecha cada fase (api.armTimer), guarda a mira de cada um
// (t:'input', só um ângulo), resolve a rodada com rules.js e decide quem caiu e quem venceu.
// Nas fases escondidas a view NÃO leva a posição dos outros, nem para a TV: não há o que espiar.
// Clique rápido não vale nada: a ação acontece sozinha quando o tempo acaba.
//
// Empate: se todos os que estavam vivos saem na mesma rodada, eles voltam para um DESEMPATE só
// entre eles. Três desempates seguidos sem ninguém sobrar = vitória dividida.
const crypto = require('node:crypto');
const { VARIANTS, rng, seedOf, norm } = require('./rules');

// Tempos das fases (ms). ULTIMO_TIME_SCALE acelera tudo nos testes.
const SCALE = Number(process.env.ULTIMO_TIME_SCALE) || 1;
const T = { intro: 5600, reveal: 3200, revealFirst: 4200, revealBlind: 1600, aim: 5200, ready: 3000, lock: 260, result: 2300, resultEnd: 2600 };
const ms = k => Math.max(15, Math.round(T[k] * SCALE));
const MAX_PLAYERS = 8, MAX_ROUNDS = 24, MAX_TIES = 3;
const HIDDEN = ['aim', 'ready', 'lock'];          // fases em que ninguém vê ninguém
const AIMING = ['aim', 'ready', 'lock'];          // fases em que a mira ainda pode mudar (lock = folga do ping)
const IN_ROUND = ['intro', 'reveal', 'aim', 'ready', 'lock', 'action', 'result'];

module.exports = {
  meta: {
    id: 'ultimodepe', name: 'Último de Pé', emoji: '🐧',
    tagline: 'Decore onde todo mundo está, escolha a direção e ajam todos juntos. Pinguins no gelo ou tiroteio no velho oeste.',
    art: 'linear-gradient(160deg,#bfe9ff 0%,#5fb4e6 38%,#1d4f86 62%,#f59e0b 62.5%,#b45309 100%)',
    minPlayers: 2, maxPlayers: MAX_PLAYERS, spectators: true,   // até 8 na disputa; quem sobra assiste
    howTo: [
      'Escolha a variante: 🐧 Pinguins (dash no gelo) ou 🤠 Tiroteio (um tiro cada).',
      'Todo mundo aparece por alguns segundos. Decore onde cada um está.',
      'Depois os outros somem. Só você se vê. Arraste o dedo para escolher a direção (e, nos pinguins, a força do dash).',
      'Quer mais difícil? Desligue "mostrar todo mundo antes de cada rodada": só vale a memória.',
      'No 3, 2, 1… a ação acontece sozinha, para todos ao mesmo tempo.',
      'Pinguim que cai na água sai. Pistoleiro que leva tiro sai.',
      'Se todos os que restam saem juntos, eles jogam um desempate.',
      'O último de pé vence.',
    ],
  },

  create(api) {
    let s = fresh('penguins', true);
    let disposed = false;

    function fresh(variant, showOthers) {
      return {
        phase: 'setup', variant, matchId: crypto.randomUUID(),
        showOthers: showOthers !== false,   // opção da preparação: mostrar todo mundo antes de cada rodada (MEMORIZE)
        roster: [],            // [{ pid, name, color }] quem está na disputa (fixo durante a partida)
        alive: [],             // pids vivos
        outList: [],           // [{ pid, round }] na ordem em que saíram
        bodies: [],            // [{ pid, x, y, face }] posições atuais dos vivos
        aims: {},              // pid -> ângulo escolhido (radianos). Nunca sai para os outros antes da ação.
        powers: {},            // pid -> força do dash (pinguins), de POWER_MIN a 1. Também nunca sai antes da ação.
        moves: {},             // pid -> { x, y } lugar novo escolhido escondido (tiroteio). Nunca sai antes da ação.
        radius: VARIANTS[variant].R0,
        base: VARIANTS[variant].R0,   // raio inicial desta partida (cresce com o número de jogadores)
        round: 0, tie: 0, tiebreak: false, shrunk: false,
        action: null,          // { replay, out } a execução resolvida (só existe de action em diante)
        result: null,          // { out, tie, none }
        winners: [],           // no fim: 1 = vencedor; mais de 1 = vitória dividida
        phaseMs: 0,
      };
    }
    const V = () => VARIANTS[s.variant];
    const hostPid = () => { const h = s.roster.find(p => api.byPid(p.pid)) || null; return h ? h.pid : ((api.players[0] || {}).pid || null); };
    const nameOf = pid => { const p = api.byPid(pid) || s.roster.find(x => x.pid === pid); return p ? p.name : 'Alguém'; };
    const colorKey = pid => { const p = api.byPid(pid); return p ? p.color : null; };
    const hexOf = key => { const c = api.colorInfo(key); return c ? c.hex : '#94a3b8'; };
    const roundRnd = tag => rng(seedOf(s.matchId + ':' + s.round + ':' + tag));
    function go(phase, key) { s.phase = phase; s.phaseMs = typeof key === 'number' ? key : ms(key); api.armTimer(s.phaseMs); }
    function syncNames() { for (const p of s.roster) { const live = api.byPid(p.pid); if (live) { p.name = live.name; p.color = hexOf(live.color); } } }

    // ---------- partida ----------
    function begin() {
      const variant = s.variant;
      s = fresh(variant, s.showOthers);
      s.roster = api.players.slice(0, MAX_PLAYERS).map(p => ({ pid: p.pid, name: p.name, color: hexOf(p.color) }));
      s.alive = s.roster.map(p => p.pid);
      s.round = 0;
      s.base = V().base(s.alive.length);
      s.radius = s.base;
      s.bodies = V().spawn(s.alive, s.radius, rng(seedOf(s.matchId + ':spawn')));
      for (const b of s.bodies) s.aims[b.pid] = b.face;
      go('intro', 'intro');
      api.setEvent(variant === 'penguins' ? '🐧 Pinguins no gelo! Decore, mire e escorregue.' : '🤠 Tiroteio! Decore, mire e todo mundo atira junto.');
    }
    function startRound() {
      const tiebreak = s.tiebreak;
      s.round++;
      const prevRadius = s.radius;
      s.radius = V().radius(s.round, s.radius, tiebreak, s.base);
      s.shrunk = !tiebreak && s.round > 1 && s.radius < prevRadius;
      const rnd = roundRnd('prep');
      if (tiebreak) s.bodies = V().spawn(s.alive, s.radius, rnd);
      else s.bodies = V().prepare(s.bodies.filter(b => s.alive.includes(b.pid)), s.radius, s.round, rnd, !s.showOthers);
      // quem não tem corpo (não devia acontecer) nasce agora
      const missing = s.alive.filter(pid => !s.bodies.some(b => b.pid === pid));
      if (missing.length) s.bodies = s.bodies.concat(V().spawn(missing, s.radius, rnd));
      resetAims();
      s.action = null; s.result = null;
      // Sem MEMORIZE (opção desligada): a fase existe só como abertura curta da rodada, sem ninguém à vista.
      go('reveal', !s.showOthers ? 'revealBlind' : s.round === 1 ? 'revealFirst' : 'reveal');
    }
    function resetAims() {
      s.aims = {}; s.powers = {}; s.moves = {};
      for (const b of s.bodies) { s.aims[b.pid] = b.face; if (V().power) s.powers[b.pid] = V().POWER_DEF; }
    }
    // No fim do 3, 2, 1: fecha as miras e resolve a rodada inteira de uma vez.
    function resolve() {
      const bodies = s.bodies.filter(b => s.alive.includes(b.pid));
      const res = V().resolve(bodies, s.aims, s.radius, roundRnd('resolve'), s.powers, s.moves);
      s.action = { replay: res.replay, out: res.out.slice(), final: res.final };
      const total = Math.round((res.replay.lead + res.replay.dur) * 1000);
      go('action', Math.max(15, Math.round(total * SCALE)));
    }
    function settle() {
      const a = s.action || { out: [], final: s.bodies };
      const before = s.alive.slice();
      const out = a.out.filter(pid => before.includes(pid));
      s.tiebreak = false;
      if (before.length && out.length === before.length) {
        // Todos os que restavam saíram juntos: ninguém venceu. Desempate só entre eles.
        s.tie++;
        s.result = { out, tie: true, none: false };
        if (s.tie >= MAX_TIES) return finish(before, `🤝 Empate! ${before.map(nameOf).join(', ')} dividem a vitória.`);
        s.tiebreak = true;
        api.setEvent(`😱 Todo mundo saiu junto! Desempate: ${before.map(nameOf).join(', ')}.`);
      } else {
        s.tie = 0;
        s.alive = before.filter(pid => !out.includes(pid));
        for (const pid of out) s.outList.push({ pid, round: s.round });
        s.bodies = a.final.filter(b => s.alive.includes(b.pid)).map(b => ({ pid: b.pid, x: b.x, y: b.y, face: b.face }));
        s.result = { out, tie: false, none: !out.length };
        if (out.length) api.setEvent(`${s.variant === 'penguins' ? '💦' : '💥'} Rodada ${s.round}: ${out.map(nameOf).join(', ')} ${out.length === 1 ? 'saiu' : 'saíram'}.`);
        else api.setEvent(`Rodada ${s.round}: ${s.variant === 'penguins' ? 'ninguém caiu!' : 'todo mundo errou!'}`);
      }
      if (s.alive.length <= 1) return finish(s.alive.slice(), null);
      if (s.round >= MAX_ROUNDS) return finish(s.alive.slice(), `🤝 Rodadas demais! ${s.alive.map(nameOf).join(', ')} dividem a vitória.`);
      go('result', 'result');
    }
    function finish(winners, text) {
      s.winners = winners;
      s.tiebreak = false;
      if (!s.result) s.result = { out: [], tie: false, none: true };
      // mostra o que aconteceu antes do pódio: a fase result continua, com o vencedor já decidido
      s.phase = 'result'; s.phaseMs = ms('resultEnd'); api.armTimer(s.phaseMs);
      s.ending = true;
      if (text) api.setEvent(text);
      else if (winners.length === 1) api.setEvent(`🏆 ${nameOf(winners[0])} é o último de pé!`, colorKey(winners[0]));
      else api.setEvent('Ninguém sobrou.');
    }
    function end() { s.phase = 'end'; s.ending = false; s.phaseMs = 0; api.clearTimer(); }
    // Alguém saiu da sala no meio da partida (não é só tela bloqueada: saiu mesmo).
    function dropPid(pid) {
      s.alive = s.alive.filter(x => x !== pid);
      s.bodies = s.bodies.filter(b => b.pid !== pid);
      delete s.aims[pid]; delete s.powers[pid]; delete s.moves[pid];
      if (!IN_ROUND.includes(s.phase) || s.ending) return;
      if (s.phase === 'action' || s.phase === 'result') return;   // settle() e o fim do resultado conferem
      if (s.alive.length <= 1) finish(s.alive.slice(), s.alive.length ? null : 'Todo mundo saiu da partida.');
    }

    // ---------- o que cada tela vê ----------
    function view(me, type) {
      syncNames();
      // escondido: mira, 3-2-1 e fechamento; com a opção desligada, também a abertura de cada rodada
      // (reveal). O intro da partida mostra todo mundo sempre: sem ele a 1ª rodada seria sorte pura.
      const hidden = HIDDEN.includes(s.phase) || (!s.showOthers && s.phase === 'reveal' && !s.tiebreak);
      const mineAlive = !!me && s.alive.includes(me.pid);
      const own = mineAlive ? s.bodies.find(b => b.pid === me.pid) : null;
      const inRound = IN_ROUND.includes(s.phase) || s.phase === 'end';
      const V0 = V();
      return {
        variant: s.variant, phase: s.phase, matchId: s.matchId, round: s.round,
        hostPid: hostPid(), phaseMs: s.phaseMs, showOthers: s.showOthers, blind: hidden, tiebreak: s.tiebreak, tie: s.tie, shrunk: s.shrunk, ending: !!s.ending,
        roster: s.roster.map(p => ({ pid: p.pid, name: p.name, color: p.color, alive: s.alive.includes(p.pid), gone: !api.byPid(p.pid) })),
        alive: s.alive.slice(),
        radius: s.radius, R0: s.base || V0.R0, zoom: (s.base || V0.R0) / V0.R0, body: V0.BODY, reach: V0.reach || null,
        canMove: !!V0.move, moveMax: V0.MOVE || null,
        power: !!V0.power, powerMin: V0.POWER_MIN || null, reachTable: V0.reachTable || null,
        // posições: todas quando dá para ver; nas fases escondidas, só a sua (e nada para a TV)
        bodies: !inRound ? [] : hidden ? (own ? [Object.assign({}, own)] : []) : s.bodies.map(b => Object.assign({}, b)),
        // a sua mira volta para você (recarregou a página no meio da rodada); a dos outros, nunca
        you: me && type !== 'tv' ? { pid: me.pid, playing: s.roster.some(p => p.pid === me.pid), alive: mineAlive, aim: mineAlive && Number.isFinite(s.aims[me.pid]) ? s.aims[me.pid] : null, power: mineAlive && Number.isFinite(s.powers[me.pid]) ? s.powers[me.pid] : null, move: mineAlive && s.moves[me.pid] ? Object.assign({}, s.moves[me.pid]) : null } : null,
        action: (s.phase === 'action' || s.phase === 'result') && s.action ? { replay: s.action.replay, out: s.action.out } : null,
        result: s.phase === 'result' || s.phase === 'end' ? s.result : null,
        outList: s.outList.slice(),
        winners: s.phase === 'end' || s.ending ? s.winners.slice() : [],
        players: api.players.length,
      };
    }

    return {
      start() { api.setEvent('Último de Pé! O primeiro jogador escolhe a variante e começa.'); },
      action(player, msg) {
        const host = player.pid === hostPid();
        if (msg.t === 'udp-variant' && host && (s.phase === 'setup' || s.phase === 'end') && VARIANTS[msg.variant]) {
          s = fresh(msg.variant, s.showOthers);
          return;
        }
        if (msg.t === 'udp-show' && host && (s.phase === 'setup' || s.phase === 'end')) { s.showOthers = msg.on !== false; return; }
        if (msg.t === 'udp-start' && host && (s.phase === 'setup' || s.phase === 'end')) {
          if (api.players.length < 2) return;
          begin();
          return;
        }
        // Jogar de novo: outra partida na hora, mesma variante e mesma opção. Não volta para o menu.
        if (msg.t === 'udp-again' && host && s.phase === 'end') {
          if (api.players.length >= 2) begin();
          else s = fresh(s.variant, s.showOthers);   // sobrou um só: volta para a preparação e espera
          return;
        }
      },
      // Só um ângulo, e só nas fases de mira. Posição, colisão e acerto são do servidor.
      input(player, msg) {
        if (!AIMING.includes(s.phase) || msg.matchId !== s.matchId || msg.round !== s.round || !s.alive.includes(player.pid)) return;
        const a = Number(msg.aim);
        if (!Number.isFinite(a) || Math.abs(a) > 1e4) return;
        s.aims[player.pid] = norm(a);
        if (V().move && msg.mx !== undefined && msg.my !== undefined) {
          const b = s.bodies.find(x => x.pid === player.pid);
          const m = b ? V().clampMove(b, { x: msg.mx, y: msg.my }, s.radius) : null;
          if (m) s.moves[player.pid] = m;
        }
        if (V().power && msg.power !== undefined && Number.isFinite(Number(msg.power))) s.powers[player.pid] = V().clampPower(Number(msg.power));
      },
      onTimeUp() {
        if (disposed) return;
        switch (s.phase) {
          case 'intro': return startRound();
          case 'reveal': return go('aim', 'aim');
          case 'aim': return go('ready', 'ready');
          case 'ready': return go('lock', 'lock');
          case 'lock': return resolve();
          case 'action': return settle();
          case 'result':
            if (s.ending) return end();
            // alguém saiu da sala enquanto o resultado estava na tela: talvez já tenha vencedor
            if (s.alive.length <= 1) return finish(s.alive.slice(), s.alive.length ? null : 'Todo mundo saiu da partida.');
            return startRound();
        }
      },
      view,
      onPlayerLeave(pid) {
        if (api.byPid(pid)) return;   // fusão de vagas do núcleo: a pessoa continua aqui com o mesmo pid
        dropPid(pid);
      },
      rekey(oldPid, newPid) {
        const swap = x => (x === oldPid ? newPid : x);
        // Quem some é a vaga ANTIGA. Se ela não estava na disputa (torcida), nada da partida muda.
        if (!s.roster.some(p => p.pid === oldPid) || oldPid === newPid) return;
        s.roster = s.roster.filter(p => p.pid !== newPid);
        for (const p of s.roster) p.pid = swap(p.pid);
        s.alive = s.alive.filter(x => x !== newPid).map(swap);
        s.bodies = s.bodies.filter(b => b.pid !== newPid).map(b => Object.assign(b, { pid: swap(b.pid) }));
        for (const m of [s.aims, s.powers, s.moves]) if (m && Object.prototype.hasOwnProperty.call(m, oldPid)) { m[newPid] = m[oldPid]; delete m[oldPid]; }
        for (const o of s.outList) o.pid = swap(o.pid);
        s.winners = s.winners.map(swap);
        if (s.result) s.result.out = s.result.out.map(swap);
        if (s.action) {
          s.action.out = s.action.out.map(swap);
          for (const b of s.action.final) b.pid = swap(b.pid);
          const r = s.action.replay;
          if (r.order) r.order = r.order.map(swap);
          for (const k of ['fall', 'hitAt', 'moves']) if (r[k] && Object.prototype.hasOwnProperty.call(r[k], oldPid)) { r[k][newPid] = r[k][oldPid]; delete r[k][oldPid]; }
          for (const h of r.hits || []) { h.a = swap(h.a); h.b = swap(h.b); }
          for (const sh of r.shots || []) { sh.pid = swap(sh.pid); sh.hit = sh.hit && swap(sh.hit); }
        }
      },
      // A execução em andamento não é salva: se o servidor reiniciar no meio, a rodada recomeça
      // do MEMORIZE com as mesmas posições (ninguém perde nada, ninguém ganha nada).
      serialize() { return Object.assign({}, s, { action: null, version: 1 }); },
      restore(d) {
        if (!d || d.version !== 1 || !VARIANTS[d.variant]) return;
        s = Object.assign(fresh(d.variant, d.showOthers), d);
        s.powers = s.powers || {}; s.moves = s.moves || {};
        s.base = s.base || VARIANTS[d.variant].R0;
        delete s.version;
        s.roster = s.roster.filter(p => api.byPid(p.pid));
        s.alive = s.alive.filter(pid => api.byPid(pid));
        s.bodies = s.bodies.filter(b => s.alive.includes(b.pid));
        if (s.phase === 'intro' && !s.round) {
          s.phaseMs = 8000;                      // o núcleo rearma o relógio; no fim dele começa a rodada 1
        } else if (['intro', 'reveal', 'aim', 'ready', 'lock', 'action'].includes(s.phase)) {
          // mesma rodada, mesmas posições, mesmo gelo: volta para o MEMORIZE
          resetAims();
          s.phase = 'reveal'; s.phaseMs = 8000;
        } else if (s.phase === 'result') {
          s.result = s.result || { out: [], tie: false, none: true };
          s.phaseMs = 8000;
        }
        // O núcleo rearma o relógio com o que sobrava da fase salva; armando aqui, ele usa o nosso tempo inteiro.
        if (IN_ROUND.includes(s.phase)) api.armTimer(s.phaseMs);
        if (IN_ROUND.includes(s.phase) && s.alive.length < 2 && !s.ending) {
          s.winners = s.alive.slice(); s.phase = 'end';
        }
      },
      destroy() { disposed = true; },
    };
  },
};
