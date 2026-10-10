// Pife / Cacheta. The server keeps each hand private and checks every win.
'use strict';

const SUITS = ['D', 'S', 'H', 'C'];
const TARGET = 3;

function shuffle(cards) {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function deck(jokers = false) {
  const cards = [];
  for (let copy = 0; copy < 2; copy++) {
    for (const s of SUITS) for (let n = 1; n <= 13; n++) {
      cards.push({ id: cards.length, n, s, joker: false });
    }
  }
  if (jokers) for (let i = 0; i < 4; i++) cards.push({ id: cards.length, n: 0, s: null, joker: true });
  return shuffle(cards);
}

function isRun(cards) {
  const natural = cards.filter(c => !c.joker);
  if (!natural.length || !natural.every(c => c.s === natural[0].s)) return false;
  // Ace can be low or high. A-2-3 and Q-K-A work; K-A-2 does not.
  for (const aceHigh of [false, true]) {
    const nums = natural.map(c => c.n === 1 && aceHigh ? 14 : c.n);
    if (new Set(nums).size !== nums.length) continue;
    const low = Math.min(...nums);
    for (let start = low - (3 - nums.length); start <= low; start++) {
      if (start < 1 || start + 2 > 14) continue;
      if (nums.every(n => n >= start && n <= start + 2)) return true;
    }
  }
  return false;
}

function isSet(cards) {
  const natural = cards.filter(c => !c.joker);
  return natural.length >= 2 && natural.every(c => c.n === natural[0].n) &&
    new Set(natural.map(c => c.s)).size === natural.length;
}

function validMeld(cards, jokers) {
  if (!Array.isArray(cards) || cards.length !== 3) return false;
  const count = cards.filter(c => c.joker).length;
  if (count > 1 || (count && !jokers)) return false;
  return isSet(cards) || isRun(cards);
}

function validWin(hand, discardId, groups, jokers) {
  if (!Array.isArray(hand) || hand.length !== 10 || !Number.isInteger(discardId) ||
      !hand.some(c => c.id === discardId) || !Array.isArray(groups) || groups.length !== 3) return false;
  const ids = groups.flat();
  if (ids.length !== 9 || ids.some(id => !Number.isInteger(id)) || new Set(ids).size !== 9 || ids.includes(discardId)) return false;
  const byId = new Map(hand.map(c => [c.id, c]));
  if (byId.size !== 10 || ids.some(id => !byId.has(id))) return false;
  return groups.every(group => Array.isArray(group) && group.length === 3 &&
    validMeld(group.map(id => byId.get(id)), jokers));
}

module.exports = {
  meta: {
    id: 'pife', name: 'PIFE', emoji: '🃏',
    tagline: 'Monte três jogos de três cartas e bata primeiro.',
    art: 'linear-gradient(135deg,#123b35 0%,#195b4b 55%,#d9aa58 100%)',
    minPlayers: 2, maxPlayers: 10,
    howTo: [
      'Joguem de 2 a 10 pessoas. Cada uma recebe 9 cartas no celular.',
      'Na sua vez, compre do monte ou pegue a última carta descartada. Depois descarte uma carta.',
      'Para bater, forme 3 jogos de 3 cartas: trincas de mesmo valor e naipes diferentes, ou sequências do mesmo naipe.',
      'O Ás pode ser baixo (A-2-3) ou alto (Q-K-A). Não vale K-A-2.',
      'Com coringas, entram 4 cartas extras. Cada jogo aceita no máximo 1 coringa.',
      'Quem bater ganha a rodada. Três rodadas ganhas vencem a partida.',
    ],
  },

  create(api) {
    let s = {
      phase: 'setup', cfg: { jokers: false }, order: [], hands: {}, deck: [], discard: [],
      turn: null, step: null, round: 0, scores: {}, roundWinner: null, winner: null,
      lastAction: null, lastDraw: null,
    };
    const name = pid => (api.byPid(pid) || {}).name || 'Alguém';
    const color = pid => (api.byPid(pid) || {}).color || null;
    const top = () => s.discard[s.discard.length - 1] || null;
    const hand = pid => s.hands[pid] || [];

    function advance() {
      const at = s.order.indexOf(s.turn);
      s.turn = s.order[(at + 1) % s.order.length];
      s.step = 'draw';
      s.lastDraw = null;
    }

    function refill() {
      if (s.deck.length || s.discard.length <= 1) return;
      const keep = s.discard.pop();
      s.deck = shuffle(s.discard);
      s.discard = [keep];
    }

    function newRound() {
      s.order = api.players.map(p => p.pid);
      if (s.order.length < 2 || s.order.length > 10) {
        s.phase = 'setup';
        api.setEvent('Pife precisa de 2 a 10 pessoas.', null);
        return;
      }
      s.round++;
      s.deck = deck(s.cfg.jokers);
      s.discard = [];
      s.hands = Object.fromEntries(s.order.map(pid => [pid, []]));
      for (let i = 0; i < 9; i++) for (const pid of s.order) s.hands[pid].push(s.deck.pop());
      s.discard.push(s.deck.pop());
      const previous = s.roundWinner;
      s.turn = s.order.includes(previous) ? previous : s.order[0];
      s.step = 'draw';
      s.phase = 'play';
      s.roundWinner = null;
      s.lastAction = null;
      s.lastDraw = null;
      api.setEvent(`Rodada ${s.round}! ${name(s.turn)} começa.`, color(s.turn));
    }

    const inst = {
      start() {
        s = { ...s, phase: 'setup', order: [], hands: {}, deck: [], discard: [], turn: null,
          step: null, round: 0, scores: {}, roundWinner: null, winner: null, lastAction: null, lastDraw: null };
        api.clearTimer();
        api.setEvent('Escolham jogar com ou sem coringas e comecem.', null);
      },
      action(p, msg) {
        if (msg.t === 'config' && s.phase === 'setup') {
          const cfg = msg.cfg || {};
          if (typeof cfg.jokers !== 'boolean') return;
          s.cfg.jokers = cfg.jokers;
          api.setEvent(`${p.name} escolheu jogar ${cfg.jokers ? 'com' : 'sem'} coringas.`, p.color);
          return;
        }
        if (msg.t === 'begin' && s.phase === 'setup') {
          s.round = 0; s.scores = {}; s.winner = null; s.roundWinner = null;
          newRound();
          return;
        }
        if (msg.t === 'next' && s.phase === 'round') { newRound(); return; }
        if (msg.t === 'again' && s.phase === 'end') { inst.start(); return; }
        if (s.phase !== 'play' || s.turn !== p.pid) return;
        if (msg.t === 'draw' && s.step === 'draw') {
          const from = msg.from;
          if (from !== 'stock' && from !== 'discard') return;
          if (from === 'stock') refill();
          const card = from === 'discard' ? s.discard.pop() : s.deck.pop();
          if (!card) return;
          s.hands[p.pid].push(card);
          s.step = 'discard';
          s.lastDraw = { pid: p.pid, from, id: card.id };
          s.lastAction = { pid: p.pid, type: 'draw', from, card: from === 'discard' ? card : null, at: Date.now() };
          api.setEvent(`${p.name} comprou ${from === 'discard' ? 'do descarte' : 'do monte'}.`, p.color);
          return;
        }
        if (s.step !== 'discard') return;
        if (msg.t === 'discard') {
          const id = Number(msg.id);
          if (!Number.isInteger(id)) return;
          const cards = hand(p.pid), index = cards.findIndex(c => c.id === id);
          if (index < 0 || cards.length !== 10) return;
          const [card] = cards.splice(index, 1);
          s.discard.push(card);
          s.lastAction = { pid: p.pid, type: 'discard', card, at: Date.now() };
          api.setEvent(`${p.name} descartou uma carta.`, p.color);
          advance();
          return;
        }
        if (msg.t === 'knock') {
          const discardId = Number(msg.discardId);
          if (!validWin(hand(p.pid), discardId, msg.groups, s.cfg.jokers)) return;
          const cards = hand(p.pid);
          const [discarded] = cards.splice(cards.findIndex(c => c.id === discardId), 1);
          s.discard.push(discarded);
          s.roundWinner = p.pid;
          s.scores[p.pid] = (s.scores[p.pid] || 0) + 1;
          s.winner = s.scores[p.pid] >= TARGET ? p.pid : null;
          s.phase = s.winner ? 'end' : 'round';
          s.step = null;
          s.turn = null;
          s.lastDraw = null;
          s.lastAction = { pid: p.pid, type: 'knock', card: discarded, groups: msg.groups, at: Date.now() };
          api.setEvent(s.winner ? `🏆 ${p.name} venceu o Pife!` : `${p.name} bateu! Rodada ${s.round} vencida.`, p.color);
        }
      },
      view(me) {
        const pid = me && me.pid;
        return {
          phase: s.phase, cfg: { ...s.cfg }, order: s.order.map(id => ({ pid: id, n: hand(id).length })),
          turn: s.turn, step: s.step, deckN: s.deck.length, discardTop: top(), discardN: s.discard.length,
          hand: pid ? hand(pid).map(c => ({ ...c })) : [], round: s.round,
          scores: { ...s.scores }, roundWinner: s.roundWinner, winner: s.winner,
          lastAction: s.lastAction, canKnock: !!pid && s.phase === 'play' && s.turn === pid && s.step === 'discard',
          target: TARGET,
        };
      },
      serialize: () => ({ s }),
      restore(data) {
        if (!data || !data.s) return;
        s = { ...s, ...data.s, cfg: { jokers: false, ...(data.s.cfg || {}) } };
      },
      rekey(oldPid, newPid) {
        if (s.hands[oldPid]) { s.hands[newPid] = s.hands[oldPid]; delete s.hands[oldPid]; }
        if (s.scores[oldPid] !== undefined) { s.scores[newPid] = s.scores[oldPid]; delete s.scores[oldPid]; }
        s.order = s.order.map(pid => pid === oldPid ? newPid : pid);
        for (const key of ['turn', 'roundWinner', 'winner']) if (s[key] === oldPid) s[key] = newPid;
        for (const key of ['lastAction', 'lastDraw']) if (s[key] && s[key].pid === oldPid) s[key].pid = newPid;
      },
      onPlayerLeave(pid) {
        if (!s.order.includes(pid)) return;
        s.phase = 'setup'; s.order = []; s.hands = {}; s.deck = []; s.discard = [];
        s.turn = null; s.step = null; s.roundWinner = null; s.winner = null; s.lastAction = null; s.lastDraw = null;
        api.setEvent(`${name(pid)} saiu. Comecem outra partida.`, null);
      },
    };
    return inst;
  },
};

module.exports.rules = { deck, validMeld, validWin, isRun, isSet, TARGET };
