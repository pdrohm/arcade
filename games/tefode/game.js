// Te Fode (Fodinha): bids, tricks, and penalties live on the server.
'use strict';

const FACES = [4, 5, 6, 7, 10, 11, 12, 1, 2, 3];
const SUITS = ['D', 'S', 'H', 'C'];
const RANK = { 4: 1, 5: 2, 6: 3, 7: 4, 10: 5, 11: 6, 12: 7, 1: 8, 2: 9, 3: 10 };
const MAX_CARDS = { 3: 3, 4: 5, 5: 6, 6: 5, 7: 4 };
const TRICK_REVEAL_MS = 3800;
const MAX_PENALTIES = 5;

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function deck() {
  let id = 0;
  return shuffle(SUITS.flatMap(s => FACES.map(n => ({ id: id++, n, s }))));
}
function power(c, vira) {
  const manilha = FACES[(FACES.indexOf(vira.n) + 1) % FACES.length];
  return c.n === manilha ? 20 + { D: 1, S: 2, H: 3, C: 4 }[c.s] : RANK[c.n];
}

// Equal non-manilhas cancel one another. The strongest card left wins the trick.
function trickWinner(table, vira) {
  const groups = {};
  for (const play of table) {
    const p = power(play.card, vira);
    (groups[p] = groups[p] || []).push(play);
  }
  const surviving = Object.keys(groups).map(Number).filter(p => groups[p].length === 1).sort((a, b) => b - a);
  return surviving.length ? groups[surviving[0]][0].pid : null;
}

// Quem jogou carta de força repetida na vaza (as cartas que se anularam).
function cancelledPids(table, vira) {
  const count = {};
  for (const play of table) { const p = power(play.card, vira); count[p] = (count[p] || 0) + 1; }
  return table.filter(play => count[power(play.card, vira)] > 1).map(play => play.pid);
}
const manilhaOf = vira => vira ? FACES[(FACES.indexOf(vira.n) + 1) % FACES.length] : null;

module.exports = {
  meta: {
    id: 'tefode', name: 'TE F0D3 (f*dinha)', category: 'cartas', glyph: 'A♥', emoji: '🂠',
    tagline: 'Aposte quantas vazas vai ganhar. Errou, perde pontos de vida.',
    art: 'linear-gradient(135deg,#622f33,#321d29 55%,#ca9360)',
    minPlayers: 4, maxPlayers: 7,
    howTo: [
      'Para 4 a 7 pessoas. Cada rodada começa com 1 carta e sobe até o limite do grupo.',
      'Antes de jogar, diga quantas vazas acha que vai ganhar. A soma das apostas não pode ser igual ao número de cartas.',
      'Com 1 carta, você vê as cartas dos outros, mas não a sua.',
      'A vira define a manilha. Cartas de mesma força se anulam na vaza.',
      'No fim, cada erro soma uma penalidade. Com 5 penalidades, você sai. As 2 últimas pessoas vencem.',
    ],
  },

  create(api) {
    let s = {
      phase: 'setup', order: [], active: [], round: 0, handSize: 0, dealer: -1, lead: null,
      turn: null, deck: [], hands: {}, vira: null, bids: {}, wins: {}, penalties: {},
      table: [], trick: 0, trickWinner: null, lastTrick: [], winners: [], reveal: null, roundResults: [],
      lastPlay: null,
    };
    const next = (pid, list = s.active) => list[(list.indexOf(pid) + 1) % list.length];
    const nextActiveAfter = pid => {
      const start = s.order.indexOf(pid);
      for (let offset = 1; offset <= s.order.length; offset++) {
        const candidate = s.order[(start + offset) % s.order.length];
        if (s.active.includes(candidate)) return candidate;
      }
      return s.active[0];
    };
    const name = pid => (api.byPid(pid) || {}).name || 'Alguém';
    const color = pid => (api.byPid(pid) || {}).color || null;
    const maxCards = () => MAX_CARDS[s.active.length] || 1;
    const bidOrder = () => {
      const first = next(s.dealer);
      const i = s.active.indexOf(first);
      return s.active.slice(i).concat(s.active.slice(0, i));
    };
    const bidTotal = () => Object.values(s.bids).reduce((a, b) => a + b, 0);
    // Ordem de quem joga esta vaza, a partir de quem abre.
    const playOrder = () => {
      const i = s.active.indexOf(s.lead);
      return i < 0 ? [...s.active] : s.active.slice(i).concat(s.active.slice(0, i));
    };
    // Palpite que a última pessoa não pode dar (a soma ficaria igual ao número de cartas).
    const forbiddenBid = () => {
      if (s.phase !== 'bid' || Object.keys(s.bids).length !== s.active.length - 1) return null;
      const n = s.handSize - bidTotal();
      return n >= 0 && n <= s.handSize ? n : null;
    };

    function startHand() {
      if (s.active.length <= 2) return endGame();
      s.round++;
      s.handSize = s.handSize >= maxCards() ? 1 : s.handSize + 1;
      const oldDealer = s.dealer;
      s.dealer = oldDealer === -1 ? s.active[s.active.length - 1] : nextActiveAfter(oldDealer);
      s.lead = next(s.dealer);
      s.turn = s.lead;
      s.deck = deck(); s.hands = Object.fromEntries(s.active.map(pid => [pid, []]));
      for (let i = 0; i < s.handSize; i++) for (const pid of bidOrder()) s.hands[pid].push(s.deck.pop());
      s.vira = s.deck.pop();
      s.bids = {}; s.wins = Object.fromEntries(s.active.map(pid => [pid, 0]));
      s.table = []; s.trick = 0; s.trickWinner = null; s.lastTrick = []; s.reveal = null; s.roundResults = [];
      s.lastPlay = null;
      s.phase = 'bid';
      api.setEvent(`Rodada ${s.round}: ${s.handSize} carta${s.handSize === 1 ? '' : 's'} por pessoa. ${name(s.turn)} aposta primeiro.`, color(s.turn));
    }

    function endGame() {
      s.phase = 'end'; s.turn = null;
      s.winners = [...s.active].sort((a, b) => (s.penalties[a] || 0) - (s.penalties[b] || 0)).slice(0, 2);
      api.setEvent(`${s.winners.map(name).join(' e ')} venceram o Te F0d3!`, null);
    }

    function finishHand() {
      s.roundResults = s.active.map(pid => ({ pid, bid: s.bids[pid], won: s.wins[pid],
        added: Math.abs(s.wins[pid] - s.bids[pid]) }));
      for (const row of s.roundResults) s.penalties[row.pid] = (s.penalties[row.pid] || 0) + row.added;
      const before = [...s.active];
      s.active = before.filter(pid => s.penalties[pid] < MAX_PENALTIES);
      if (s.active.length < 2) {
        // Simultaneous eliminations: keep the two lowest penalty totals.
        s.active = before.sort((a, b) => s.penalties[a] - s.penalties[b]).slice(0, 2);
      }
      for (const row of s.roundResults) row.out = !s.active.includes(row.pid);
      if (s.active.length === 2) { endGame(); return; }
      s.phase = 'result'; s.turn = null;
      api.setEvent(`Rodada ${s.round} terminou. Veja as apostas e as penalidades.`, null);
    }

    function finishTrick() {
      const winner = trickWinner(s.table, s.vira);
      s.trickWinner = winner;
      s.lastTrick = s.table.map(p => ({ ...p }));
      if (winner) s.wins[winner]++;
      s.reveal = { winner, trick: s.trick + 1, cancelled: cancelledPids(s.table, s.vira), endsAt: Date.now() + TRICK_REVEAL_MS };
      s.phase = 'reveal'; s.turn = null;
      api.armTimer(TRICK_REVEAL_MS);
      api.setEvent(winner ? `${name(winner)} ganhou a vaza.` : 'As cartas mais fortes se anularam. Ninguém ganhou a vaza.', winner ? color(winner) : null);
    }

    function advanceTrick() {
      if (s.phase !== 'reveal') return;
      const winner = s.reveal && s.reveal.winner;
      s.reveal = null;
      s.trick++;
      s.table = [];
      if (s.trick >= s.handSize) { finishHand(); return; }
      if (winner) s.lead = winner;
      s.turn = s.lead;
      s.phase = 'play';
      api.setEvent(`Vaza ${s.trick + 1}. ${name(s.turn)} joga agora.`, color(s.turn));
    }

    const inst = {
      start() {
        s = { ...s, phase: 'setup', order: [], active: [], round: 0, handSize: 0, dealer: -1,
          turn: null, deck: [], hands: {}, vira: null, bids: {}, wins: {}, penalties: {},
          table: [], trick: 0, trickWinner: null, lastTrick: [], winners: [], reveal: null, roundResults: [], lastPlay: null };
        api.clearTimer();
        api.setEvent('Entrem com 4 a 7 pessoas e comecem o Te F0d3.', null);
      },
      action(p, msg) {
        const pid = p.pid;
        if (msg.t === 'begin' && s.phase === 'setup' && api.players.length >= 4 && api.players.length <= 7) {
          s.order = api.players.map(x => x.pid); s.active = [...s.order];
          s.penalties = Object.fromEntries(s.order.map(id => [id, 0]));
          s.round = 0; s.handSize = 0; s.dealer = -1;
          startHand(); return;
        }
        if (msg.t === 'next' && s.phase === 'result') { startHand(); return; }
        if (msg.t === 'again' && s.phase === 'end') { inst.start(); return; }
        if (!s.active.includes(pid) || s.turn !== pid) return;
        if (msg.t === 'bid' && s.phase === 'bid') {
          const n = Number(msg.n);
          if (!Number.isInteger(n) || n < 0 || n > s.handSize || s.bids[pid] !== undefined) return;
          const order = bidOrder();
          const isLast = Object.keys(s.bids).length === order.length - 1;
          if (isLast && bidTotal() + n === s.handSize) return;
          s.bids[pid] = n;
          if (isLast) { s.phase = 'play'; s.turn = s.lead; api.setEvent('Apostas feitas. Joguem a primeira carta.', null); }
          else { s.turn = next(pid); api.setEvent(`${p.name} apostou ${n}. ${name(s.turn)} aposta agora.`, p.color); }
          return;
        }
        if (msg.t === 'card' && s.phase === 'play') {
          const hand = s.hands[pid];
          const i = s.handSize === 1 ? 0 : hand.findIndex(c => c.id === Number(msg.id));
          if (i < 0 || !hand[i]) return;
          const [card] = hand.splice(i, 1);
          s.table.push({ pid, card });
          s.lastPlay = { pid, card: { ...card }, at: Date.now() };
          if (s.table.length === s.active.length) finishTrick();
          else { s.turn = next(pid); api.setEvent(`${p.name} jogou uma carta.`, p.color); }
        }
      },
      onTimeUp: advanceTrick,
      view(me) {
        const pid = me && me.pid;
        const forehead = s.handSize === 1 && (s.phase === 'bid' || s.phase === 'play');
        return {
          phase: s.phase, round: s.round, handSize: s.handSize, maxCards: maxCards(),
          dealer: s.dealer === -1 ? null : s.dealer, lead: s.lead, turn: s.turn,
          order: [...s.order], active: [...s.active], penalties: { ...s.penalties },
          bids: { ...s.bids }, wins: { ...s.wins }, bidTotal: bidTotal(),
          availableBids: pid && s.phase === 'bid' && s.turn === pid
            ? Array.from({ length: s.handSize + 1 }, (_, n) => n).filter(n =>
              Object.keys(s.bids).length !== s.active.length - 1 || bidTotal() + n !== s.handSize)
            : [],
          hand: pid && !forehead ? (s.hands[pid] || []).map(c => ({ ...c, ok: s.phase === 'play' && s.turn === pid })) : [],
          visibleOthers: pid && forehead && s.active.includes(pid) ? s.active.filter(id => id !== pid && s.hands[id] && s.hands[id].length)
            .map(id => ({ pid: id, card: { ...s.hands[id][0] } })) : [],
          ownHidden: !!(pid && forehead && s.active.includes(pid) && (s.hands[pid] || []).length),
          table: s.table.map(x => ({ ...x })), trick: s.trick, trickWinner: s.trickWinner,
          reveal: s.reveal && { ...s.reveal }, roundResults: (s.roundResults || []).map(x => ({ ...x })),
          lastTrick: s.lastTrick.map(x => ({ ...x })), vira: s.vira, manilha: manilhaOf(s.vira),
          lastPlay: s.lastPlay && { ...s.lastPlay }, maxPenalties: MAX_PENALTIES,
          seq: s.phase === 'bid' ? bidOrder() : s.phase === 'play' || s.phase === 'reveal' ? playOrder() : [],
          forbiddenBid: forbiddenBid(),
          counts: Object.fromEntries(s.active.map(id => [id, (s.hands[id] || []).length])),
          winners: [...s.winners],
          rules: 'Baralho de Truco com vira. Acerte sua aposta. 5 erros tiram você do jogo. As 2 últimas pessoas vencem.',
        };
      },
      serialize: () => ({ s }),
      restore(d) { if (d && d.s) s = { ...s, ...d.s }; },
      rekey(oldPid, newPid) {
        if (s.hands[oldPid]) { s.hands[newPid] = s.hands[oldPid]; delete s.hands[oldPid]; }
        for (const key of ['penalties', 'bids', 'wins']) {
          if (s[key][oldPid] !== undefined) { s[key][newPid] = s[key][oldPid]; delete s[key][oldPid]; }
        }
        s.order = s.order.map(id => id === oldPid ? newPid : id);
        s.active = s.active.map(id => id === oldPid ? newPid : id);
        for (const key of ['dealer', 'lead', 'turn', 'trickWinner']) if (s[key] === oldPid) s[key] = newPid;
        s.winners = s.winners.map(id => id === oldPid ? newPid : id);
        for (const play of s.table.concat(s.lastTrick)) if (play.pid === oldPid) play.pid = newPid;
        if (s.lastPlay && s.lastPlay.pid === oldPid) s.lastPlay.pid = newPid;
      },
      onPlayerLeave(pid) {
        if (!s.order.includes(pid)) return;
        const wasActive = s.active.includes(pid);
        if (wasActive) { api.clearTimer(); s.reveal = null; }
        if (s.dealer === pid && s.active.length > 1) {
          const oldIndex = s.order.indexOf(pid);
          for (let offset = 1; offset < s.order.length; offset++) {
            const candidate = s.order[(oldIndex - offset + s.order.length) % s.order.length];
            if (s.active.includes(candidate)) { s.dealer = candidate; break; }
          }
        }
        s.order = s.order.filter(id => id !== pid);
        s.active = s.active.filter(id => id !== pid);
        delete s.hands[pid]; delete s.bids[pid]; delete s.wins[pid]; delete s.penalties[pid];
        if (!wasActive) return;
        if (s.active.length <= 2) { endGame(); return; }
        s.phase = 'result'; s.turn = null;
        api.setEvent(`${name(pid)} saiu. Comecem a próxima rodada.`, null);
      },
    };
    return inst;
  },
};

module.exports.rules = { deck, power, trickWinner, cancelledPids, manilhaOf, MAX_CARDS };
