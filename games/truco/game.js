// Truco: the server owns the deck, bids, scores and each private hand.
'use strict';

const FRENCH = ['D', 'S', 'H', 'C'];
const SPANISH = ['E', 'B', 'O', 'C'];
const FACES = [4, 5, 6, 7, 10, 11, 12, 1, 2, 3];
const STAKES = { paulista: [1, 3, 6, 9, 12], mineiro: [2, 4, 6, 10, 12], gaucho: [1, 2, 3, 4] };
const TARGET = { paulista: 12, mineiro: 12, gaucho: 12 };
const GAUCHO_TARGETS = [12, 24];
const RANK = { 4: 1, 5: 2, 6: 3, 7: 4, 10: 5, 11: 6, 12: 7, 1: 8, 2: 9, 3: 10 };
const GAUCHO_TOP = { '1E': 14, '1B': 13, '7E': 12, '7O': 11 };
const GAUCHO_RANK = { 3: 10, 2: 9, 1: 8, 12: 7, 11: 6, 10: 5, 7: 4, 6: 3, 5: 2, 4: 1 };
const MINEIRO_TOP = { '4C': 4, '7H': 3, '1S': 2, '7D': 1 };
const VARIANTS = ['paulista', 'mineiro', 'gaucho'];
const TRICK_REVEAL_MS = 3200;
const HAND_REVEAL_MS = 4500;

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function deck(variant) {
  let id = 0;
  return shuffle((variant === 'gaucho' ? SPANISH : FRENCH).flatMap(s =>
    FACES.map(n => ({ id: id++, n, s }))));
}

function strength(c, variant, vira) {
  if (variant === 'gaucho') return GAUCHO_TOP[`${c.n}${c.s}`] || GAUCHO_RANK[c.n];
  if (variant === 'mineiro') return MINEIRO_TOP[`${c.n}${c.s}`] ? 20 + MINEIRO_TOP[`${c.n}${c.s}`] : RANK[c.n];
  const next = FACES[(FACES.indexOf(vira.n) + 1) % FACES.length];
  if (c.n === next) return 20 + { D: 1, S: 2, H: 3, C: 4 }[c.s];
  return RANK[c.n];
}

function envidoValue(hand) {
  let best = 0;
  for (const c of hand) best = Math.max(best, c.n <= 7 ? c.n : 0);
  for (let i = 0; i < hand.length; i++) for (let j = i + 1; j < hand.length; j++) {
    if (hand[i].s === hand[j].s) best = Math.max(best, 20 + (hand[i].n <= 7 ? hand[i].n : 0) + (hand[j].n <= 7 ? hand[j].n : 0));
  }
  return best;
}

function florValue(hand) {
  return hand.length === 3 && hand.every(c => c.s === hand[0].s)
    ? 20 + hand.reduce((n, c) => n + (c.n <= 7 ? c.n : 0), 0) : null;
}

module.exports = {
  meta: {
    id: 'truco', name: 'TRUCO', category: 'cartas', glyph: '4♣', emoji: '🂡',
    tagline: 'Paulista, Mineiro ou Gaudério. Sua mão no celular, a mesa na TV.',
    art: 'linear-gradient(135deg,#153f2b,#0b2119 58%,#bb8347)',
    minPlayers: 2, maxPlayers: 4,
    howTo: [
      'Joguem em 2 pessoas ou 4 em duplas. Com 4, quem senta em lados opostos forma dupla.',
      'Cada pessoa recebe 3 cartas no celular. A TV mostra só as cartas jogadas.',
      'Vence a mão quem ganhar 2 das 3 vazas. Peça truco para aumentar os pontos.',
      'Paulista usa vira e manilhas móveis. Mineiro usa manilhas fixas.',
      'Gaudério usa baralho espanhol de 40 cartas, com Sota, Cavalo e Rei; também tem envido e flor. Joga até 12 ou até 24 pontos.',
    ],
  },

  create(api) {
    let s = {
      phase: 'setup', cfg: { variant: 'paulista', target: 12 }, seating: [], round: 0, order: [], teams: {}, scores: [0, 0],
      dealer: -1, mano: 0, turn: null, deck: [], hands: {}, dealHands: {}, table: [], tricks: [], trick: 0,
      vira: null, stake: 1, bid: null, envidoDone: false, florDone: false,
      lastTrickWinner: null, roundWinner: null, winner: null, lastPlay: null,
      special: null, iron: false, reveal: null, history: [], trickLead: null, lastCall: null, lastAnswer: null,
    };
    const variant = () => s.cfg.variant;
    const target = () => variant() === 'gaucho' && GAUCHO_TARGETS.includes(s.cfg.target) ? s.cfg.target : TARGET[variant()];
    const team = pid => s.teams[pid];
    const name = pid => (api.byPid(pid) || {}).name || 'Alguém';
    const color = pid => (api.byPid(pid) || {}).color || null;
    const playerAt = i => s.order[(i + s.order.length) % s.order.length];
    const teamPids = t => s.order.filter(pid => team(pid) === t);
    const hasFlor = pid => florValue(s.dealHands[pid] || []) !== null;
    const incomplete = () => s.table.length < s.order.length;
    const currentTeam = () => team(s.turn);

    function bestTeam(valueFn) {
      let winner = null, best = -1;
      for (let offset = 0; offset < s.order.length; offset++) {
        const pid = playerAt(s.mano + offset);
        const v = valueFn(s.dealHands[pid] || []);
        if (v !== null && v > best) { best = v; winner = team(pid); }
      }
      return winner;
    }

    function finishMatchIfNeeded() {
      if (s.scores[0] < target() && s.scores[1] < target()) return false;
      s.winner = s.scores[0] >= target() ? 0 : 1;
      s.phase = 'end';
      s.bid = null;
      api.setEvent(`Dupla ${s.winner + 1} venceu o Truco!`, null);
      return true;
    }

    function award(t, points, why) {
      s.scores[t] += points;
      api.setEvent(`Dupla ${t + 1} ganhou ${points} ponto${points === 1 ? '' : 's'}${why ? `: ${why}` : ''}.`, null);
      return finishMatchIfNeeded();
    }

    function closeHand(winner, why) {
      s.roundWinner = winner;
      s.turn = null;
      s.bid = null;
      const points = s.stake;
      const matchEnded = award(winner, points, why || 'mão');
      s.phase = 'reveal';
      api.armTimer(HAND_REVEAL_MS);
      s.reveal = { kind: matchEnded ? 'match' : 'hand', winner, reason: why || 'mão',
        points, trick: s.trick + 1, endsAt: api.timerEnd || Date.now() + HAND_REVEAL_MS };
    }

    function handWinner() {
      const a = s.tricks;
      if (a.length >= 2) {
        if (a[0] !== null && (a[0] === a[1] || a[1] === null)) return a[0];
        if (a[0] === null && a[1] !== null) return a[1];
      }
      if (a.length < 3) return null;
      if (a[2] !== null) return a[2];
      return a[0] !== null ? a[0] : a[1] !== null ? a[1] : team(playerAt(s.mano));
    }

    function finishTrick() {
      let best = -1, winning = [];
      for (const play of s.table) {
        const power = strength(play.card, variant(), s.vira);
        if (power > best) { best = power; winning = [play]; }
        else if (power === best) winning.push(play);
      }
      const winner = winning.every(p => team(p.pid) === team(winning[0].pid)) ? team(winning[0].pid) : null;
      s.tricks.push(winner);
      const bestPids = winning.map(p => p.pid);
      s.history.push({ plays: s.table.map(x => ({ pid: x.pid, card: { ...x.card } })), winner, best: bestPids });
      s.lastTrickWinner = winner;
      const complete = handWinner();
      if (complete !== null) { closeHand(complete, 'vazas'); s.reveal.best = bestPids; return; }
      const nextTurn = winner === null ? playerAt(s.mano) : winning.find(p => team(p.pid) === winner).pid;
      s.phase = 'reveal';
      s.turn = null;
      api.armTimer(TRICK_REVEAL_MS);
      s.reveal = { kind: 'trick', winner, reason: winner === null ? 'empate' : 'vaza', best: bestPids,
        points: 0, trick: s.trick + 1, nextTurn, endsAt: api.timerEnd || Date.now() + TRICK_REVEAL_MS };
      api.setEvent(winner === null ? 'Vaza empatada.' : `Dupla ${winner + 1} ganhou a vaza.`, null);
    }

    function startHand() {
      if (s.order.length !== 2 && s.order.length !== 4) return;
      s.round++;
      s.dealer = (s.dealer + 1) % s.order.length;
      s.mano = (s.dealer + 1) % s.order.length;
      s.turn = playerAt(s.mano);
      s.deck = deck(variant());
      s.hands = Object.fromEntries(s.order.map(pid => [pid, []]));
      for (let i = 0; i < 3; i++) for (let offset = 0; offset < s.order.length; offset++) {
        s.hands[playerAt(s.mano + offset)].push(s.deck.pop());
      }
      s.dealHands = Object.fromEntries(s.order.map(pid => [pid, s.hands[pid].map(c => ({ ...c }))]));
      s.vira = variant() === 'paulista' ? s.deck.pop() : null;
      s.stake = STAKES[variant()][0];
      s.table = []; s.tricks = []; s.trick = 0; s.bid = null;
      s.envidoDone = false; s.florDone = false; s.lastTrickWinner = null;
      s.roundWinner = null; s.lastPlay = null; s.phase = 'play'; s.lastRaiseTeam = undefined;
      s.special = null; s.iron = false; s.reveal = null;
      s.history = []; s.trickLead = s.turn; s.lastCall = null; s.lastAnswer = null;
      const threshold = variant() === 'paulista' ? 11 : variant() === 'mineiro' ? 10 : null;
      if (threshold !== null) {
        const atThreshold = [0, 1].filter(t => s.scores[t] === threshold);
        if (atThreshold.length === 2) {
          s.iron = true;
          s.stake = variant() === 'paulista' ? 3 : 4;
          api.setEvent(`Mão de ferro! Cartas ocultas. ${name(s.turn)} começa.`, null);
          return;
        }
        if (atThreshold.length === 1) {
          s.special = { team: atThreshold[0], threshold,
            stake: variant() === 'paulista' ? 3 : 4, runPoints: variant() === 'paulista' ? 1 : 2 };
          s.phase = 'eleven';
          api.setEvent(`Dupla ${atThreshold[0] + 1}: vejam as cartas do parceiro e decidam se jogam.`, null);
          return;
        }
      }
      api.setEvent(`Mão ${s.round}. ${name(s.turn)} começa.`, color(s.turn));
    }

    // Ordem dos lugares na mesa: a do sorteio, e quem entrou depois fica no fim.
    function seatOrder() {
      const pids = api.players.map(x => x.pid);
      const kept = (s.seating || []).filter(pid => pids.includes(pid));
      return kept.concat(pids.filter(pid => !kept.includes(pid)));
    }

    function bidOptions() {
      if (!s.bid) return [];
      if (s.bid.kind === 'truco') {
        const next = STAKES[variant()].find(n => n > s.bid.points);
        return next ? [String(next)] : [];
      }
      if (s.bid.kind === 'envido') {
        if (s.bid.level === 'envido') return ['real_envido', 'falta_envido'];
        if (s.bid.level === 'real_envido') return ['falta_envido'];
      }
      if (s.bid.kind === 'flor' && s.bid.level === 'flor') return ['contra_flor', 'contra_flor_resto'];
      if (s.bid.kind === 'flor' && s.bid.level === 'contra_flor') return ['contra_flor_resto'];
      return [];
    }

    function faltaPoints() { return Math.max(1, target() - Math.max(...s.scores)); }
    function raiseValue(kind, previous) {
      if (kind === 'envido') return previous ? previous + 2 : 2;
      if (kind === 'real_envido') return previous ? previous + 3 : 3;
      if (kind === 'falta_envido' || kind === 'contra_flor_resto') return faltaPoints();
      if (kind === 'flor') return 3;
      if (kind === 'contra_flor') return 6;
      return 0;
    }

    function canCall(pid) {
      if (s.phase !== 'play' || s.bid || s.turn !== pid) return [];
      const calls = [];
      const steps = STAKES[variant()];
      const i = steps.indexOf(s.stake);
      if (i >= 0 && i < steps.length - 1 && !s.special && !s.iron && (s.lastRaiseTeam === undefined || s.lastRaiseTeam !== team(pid))) calls.push('truco');
      if (variant() === 'gaucho' && s.trick === 0 && !s.table.some(x => x.pid === pid)) {
        if (hasFlor(pid) && !s.florDone) calls.push('flor');
        else if (!s.envidoDone && !s.florDone) calls.push('envido', 'real_envido', 'falta_envido');
      }
      return calls;
    }

    function startBid(pid, kind) {
      if (!canCall(pid).includes(kind)) return;
      if (kind !== 'truco' && kind !== 'flor') {
        const florTeams = [0, 1].filter(t => teamPids(t).some(hasFlor));
        if (florTeams.length) {
          s.florDone = true; s.envidoDone = true;
          award(florTeams.length === 1 ? florTeams[0] : bestTeam(florValue), florTeams.length === 1 ? 3 : 6, 'flor');
          return;
        }
      }
      if (kind === 'truco') {
        const steps = STAKES[variant()];
        s.bid = { kind, level: 'truco', byTeam: team(pid), toTeam: 1 - team(pid), points: steps[steps.indexOf(s.stake) + 1], previous: s.stake };
      } else {
        s.bid = { kind: kind === 'flor' ? 'flor' : 'envido', level: kind, byTeam: team(pid), toTeam: 1 - team(pid), points: raiseValue(kind, 0), previous: kind === 'flor' ? 3 : 1 };
        if (kind === 'flor' && !teamPids(1 - team(pid)).some(hasFlor)) {
          s.bid = null; s.florDone = true;
          award(team(pid), 3, 'flor');
          return;
        }
      }
      s.lastCall = { pid, kind, points: s.bid.points, at: Date.now() };
      api.setEvent(`${name(pid)} pediu ${kind.replaceAll('_', ' ')}.`, color(pid));
    }

    function resolveBid(accept, pid) {
      const b = s.bid;
      if (!b) return;
      s.bid = null;
      s.lastAnswer = { pid, team: b.toTeam, accept, kind: b.kind, at: Date.now() };
      if (b.kind === 'truco') {
        if (accept) {
          s.stake = b.points;
          s.lastRaiseTeam = b.byTeam;
          api.setEvent(`Truco aceito. Mão vale ${s.stake}.`, null);
        } else closeHand(b.byTeam, 'pedido recusado');
        return;
      }
      if (b.kind === 'flor') s.florDone = true;
      else s.envidoDone = true;
      const winner = accept ? bestTeam(b.kind === 'flor' ? florValue : envidoValue) : b.byTeam;
      award(winner, accept ? b.points : b.previous, accept ? b.kind : 'pedido recusado');
    }

    // Manilha (Paulista: a carta depois da vira) e as cartas mais fortes das outras variantes.
    function manilha() {
      if (variant() === 'paulista') return s.vira ? FACES[(FACES.indexOf(s.vira.n) + 1) % FACES.length] : null;
      return null;
    }
    function isTop(c) {
      if (variant() === 'gaucho') return !!GAUCHO_TOP[`${c.n}${c.s}`];
      if (variant() === 'mineiro') return !!MINEIRO_TOP[`${c.n}${c.s}`];
      return c.n === manilha();
    }

    const inst = {
      start() {
        s = { ...s, phase: 'setup', round: 0, order: [], teams: {}, scores: [0, 0], dealer: -1,
          hands: {}, dealHands: {}, deck: [], table: [], tricks: [], bid: null, winner: null,
          special: null, iron: false, reveal: null, lastRaiseTeam: undefined,
          history: [], trickLead: null, lastCall: null, lastAnswer: null };
        api.clearTimer();
        api.setEvent('Escolham a variante e comecem com 2 ou 4 pessoas.', null);
      },
      action(p, msg) {
        const pid = p.pid;
        if (msg.t === 'config' && s.phase === 'setup') {
          if (VARIANTS.includes(msg.variant)) {
            s.cfg.variant = msg.variant;
            api.setEvent(`${p.name} escolheu Truco ${s.cfg.variant}.`, p.color);
          }
          if (GAUCHO_TARGETS.includes(Number(msg.target))) {
            s.cfg.target = Number(msg.target);
            api.setEvent(`${p.name} escolheu jogar até ${s.cfg.target} pontos.`, p.color);
          }
          return;
        }
        if (msg.t === 'shuffle' && s.phase === 'setup') {
          s.seating = shuffle(api.players.map(x => x.pid));
          api.setEvent(`${p.name} sorteou os lugares.`, p.color);
          return;
        }
        if (msg.t === 'begin' && s.phase === 'setup' && [2, 4].includes(api.players.length)) {
          s.order = seatOrder();
          s.teams = Object.fromEntries(s.order.map((id, i) => [id, i % 2]));
          s.scores = [0, 0]; s.dealer = -1; s.round = 0; s.winner = null;
          startHand(); return;
        }
        if (msg.t === 'next' && s.phase === 'round') { startHand(); return; }
        if (msg.t === 'again' && s.phase === 'end') { inst.start(); return; }
        if (s.phase === 'eleven' && s.special && team(pid) === s.special.team) {
          if (msg.t === 'eleven_run') {
            const other = 1 - s.special.team;
            s.roundWinner = other; s.turn = null;
            const points = s.special.runPoints;
            const matchEnded = award(other, points, 'mão especial recusada');
            s.phase = 'reveal';
            api.armTimer(HAND_REVEAL_MS);
            s.reveal = { kind: matchEnded ? 'match' : 'hand', winner: other,
              reason: 'mão especial recusada', points, trick: 0,
              endsAt: api.timerEnd || Date.now() + HAND_REVEAL_MS };
            return;
          }
          if (msg.t === 'eleven_play') {
            s.stake = s.special.stake; s.phase = 'play';
            api.setEvent(`Dupla ${s.special.team + 1} vai jogar. A mão vale ${s.stake}.`, null);
            return;
          }
        }
        if (s.phase !== 'play' || !s.order.includes(pid)) return;
        if (msg.t === 'call') { startBid(pid, String(msg.kind || '')); return; }
        if (s.bid) {
          if (team(pid) !== s.bid.toTeam) return;
          if (msg.t === 'accept') { resolveBid(true, pid); return; }
          if (msg.t === 'reject') { resolveBid(false, pid); return; }
          if (msg.t === 'raise') {
            const level = String(msg.level || '');
            if (!bidOptions().includes(level)) return;
            const prior = s.bid;
            if (prior.kind === 'truco') {
              s.stake = prior.points;
              s.bid = { ...prior, byTeam: team(pid), toTeam: prior.byTeam, points: Number(level), previous: prior.points };
            } else {
              s.bid = { ...prior, level, byTeam: team(pid), toTeam: prior.byTeam,
                points: raiseValue(level, prior.points), previous: prior.points };
            }
            s.lastCall = { pid, kind: level, points: s.bid.points, at: Date.now() };
            api.setEvent(`${p.name} aumentou o pedido.`, p.color);
          }
          return;
        }
        if (msg.t === 'card' && s.turn === pid) {
          const hand = s.hands[pid] || [];
          const i = s.iron ? 0 : hand.findIndex(c => c.id === Number(msg.id));
          if (i < 0) return;
          const [card] = hand.splice(i, 1);
          s.table.push({ pid, card });
          s.lastPlay = { pid, card, at: Date.now() };
          if (incomplete()) s.turn = playerAt(s.order.indexOf(pid) + 1);
          else finishTrick();
          if (s.phase === 'play' && s.table.length) api.setEvent(`${p.name} jogou uma carta.`, p.color);
        }
      },
      onTimeUp() {
        if (s.phase !== 'reveal' || !s.reveal) return;
        const result = s.reveal;
        s.reveal = null;
        s.table = [];
        if (result.kind === 'trick') {
          s.trick++;
          s.turn = result.nextTurn;
          s.trickLead = s.turn;
          s.phase = 'play';
          api.setEvent(`Vaza ${s.trick + 1}. ${name(s.turn)} começa.`, color(s.turn));
        } else {
          s.phase = result.kind === 'match' ? 'end' : 'round';
        }
      },
      view(me) {
        const pid = me && me.pid;
        const hand = pid ? s.hands[pid] || [] : [];
        const bid = s.bid ? { ...s.bid, options: bidOptions() } : null;
        const own = pid && s.dealHands[pid] && variant() === 'gaucho' && !s.iron ? s.dealHands[pid] : null;
        return {
          phase: s.phase, cfg: { ...s.cfg }, variant: variant(), target: target(), round: s.round,
          order: [...s.order], teams: { ...s.teams }, scores: [...s.scores], dealer: playerAt(s.dealer),
          mano: playerAt(s.mano), turn: s.turn, table: s.table.map(x => ({ ...x })),
          tricks: [...s.tricks], trick: s.trick, counts: Object.fromEntries(s.order.map(id => [id, (s.hands[id] || []).length])),
          hand: s.iron ? [] : hand.map(c => ({ ...c, ok: s.phase === 'play' && !s.bid && s.turn === pid, top: isTop(c) })),
          seats: s.phase === 'setup' ? seatOrder() : [...s.order],
          trickLead: s.trickLead, history: s.history.map(h => ({ ...h, plays: h.plays.map(x => ({ ...x })) })),
          lastCall: s.lastCall, lastAnswer: s.lastAnswer, manilha: manilha(),
          myEnvido: own ? envidoValue(own) : null, myFlor: own ? florValue(own) : null,
          ownHidden: !!(s.iron && pid && s.order.includes(pid)),
          partnerHand: s.phase === 'eleven' && pid && s.special && team(pid) === s.special.team
            ? s.order.filter(id => id !== pid && team(id) === team(pid)).flatMap(id => s.hands[id] || []) : [],
          vira: s.vira, stake: s.stake, bid, availableCalls: pid ? canCall(pid) : [],
          envidoDone: s.envidoDone, florDone: s.florDone, lastTrickWinner: s.lastTrickWinner,
          roundWinner: s.roundWinner, winner: s.winner, lastPlay: s.lastPlay,
          special: s.special, iron: s.iron, reveal: s.reveal ? { ...s.reveal } : null,
          rules: variant() === 'paulista' ? 'Vira e manilha móvel. 12 pontos.'
            : variant() === 'mineiro' ? 'Manilhas fixas: 4♣, 7♥, A♠, 7♦. Mão vale 2. 12 pontos.'
              : `Baralho espanhol. Truco, envido e flor. ${target()} pontos.`,
        };
      },
      serialize: () => ({ s }),
      restore(d) {
        if (!d || !d.s) return;
        s = { ...s, ...d.s, cfg: { variant: 'paulista', target: 12, ...(d.s.cfg || {}) } };
        if (!Array.isArray(s.history)) s.history = [];
      },
      rekey(oldPid, newPid) {
        if (s.hands[oldPid]) { s.hands[newPid] = s.hands[oldPid]; delete s.hands[oldPid]; }
        if (s.dealHands[oldPid]) { s.dealHands[newPid] = s.dealHands[oldPid]; delete s.dealHands[oldPid]; }
        if (s.teams[oldPid] !== undefined) { s.teams[newPid] = s.teams[oldPid]; delete s.teams[oldPid]; }
        s.order = s.order.map(pid => pid === oldPid ? newPid : pid);
        if (s.turn === oldPid) s.turn = newPid;
        for (const play of s.table) if (play.pid === oldPid) play.pid = newPid;
        if (s.lastPlay && s.lastPlay.pid === oldPid) s.lastPlay.pid = newPid;
        s.seating = (s.seating || []).map(pid => pid === oldPid ? newPid : pid);
        if (s.trickLead === oldPid) s.trickLead = newPid;
        for (const key of ['lastCall', 'lastAnswer']) if (s[key] && s[key].pid === oldPid) s[key].pid = newPid;
        for (const h of s.history || []) {
          for (const play of h.plays) if (play.pid === oldPid) play.pid = newPid;
          h.best = (h.best || []).map(pid => pid === oldPid ? newPid : pid);
        }
        if (s.reveal && s.reveal.best) s.reveal.best = s.reveal.best.map(pid => pid === oldPid ? newPid : pid);
        if (s.reveal && s.reveal.nextTurn === oldPid) s.reveal.nextTurn = newPid;
      },
      onPlayerLeave(pid) {
        if (!s.order.includes(pid)) return;
        api.clearTimer();
        s.phase = 'setup'; s.order = []; s.hands = {}; s.table = []; s.bid = null;
        s.reveal = null;
        api.setEvent('Alguém saiu. Escolham as duplas e comecem outra partida.', null);
      },
    };
    return inst;
  },
};

module.exports.rules = { deck, strength, envidoValue, florValue, STAKES, TARGET, GAUCHO_TARGETS };
