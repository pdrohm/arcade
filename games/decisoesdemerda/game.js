// Decisões de Merda (Buró). Na sua vez, você vira uma carta com duas opções ruins e lê em voz alta.
// Cada um escolhe em segredo a opção que prefere (1 ou 2) e aposta qual delas a maioria vai escolher.
// Revela: quem acertou a escolha da maioria ganha 1 ponto. Quem chegar à meta (3) primeiro vence.
// Empate entre as opções: ninguém pontua (regra da casa: o manual não diz). Sem regras de bebida.
const { NORMAIS, SACANA } = require('./cards');

const DEFAULT_CFG = { goal: 3, voteSec: 40, sacana: false };
const GOALS = [3, 5, 7];
const VOTE_SECS = [30, 40, 60];

const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ok12 = v => v === 1 || v === 2;

module.exports = {
  meta: {
    id: 'decisoesdemerda', name: 'Decisões de Merda', category: 'festa', glyph: '1|2', emoji: '🤢',
    tagline: 'Duas opções ruins. Escolha a sua e aposte na da maioria.',
    art: 'linear-gradient(135deg,#65a30d 0%,#3f6212 55%,#1a2e05 100%)',
    minPlayers: 3, maxPlayers: 10,
    howTo: [
      'Na sua vez, vire uma carta: duas opções ruins aparecem na TV.',
      'No celular, escolha em segredo qual você prefere.',
      'E aposte qual opção a MAIORIA vai escolher.',
      'Acertou a escolha da maioria? Ganha 1 ponto. Empate: ninguém pontua.',
      'Quem chegar a 3 pontos primeiro vence.',
    ],
  },
  create(api) {
    let s = {
      phase: 'setup', cfg: { ...DEFAULT_CFG }, order: [], reader: null, round: 0,
      deck: [], card: null, picks: {}, bets: {}, result: null, scores: {}, champs: [],
    };
    let grace = null;

    const pids = () => api.players.map(p => p.pid);
    const here = pid => !!api.byPid(pid);
    const online = pid => { const p = api.byPid(pid); return !!p && p.on !== false; };
    const nameOf = pid => { const p = api.byPid(pid); return p ? p.name : 'Alguém'; };
    const ms = () => (Number(s.cfg.voteSec) || 40) * 1000;
    const pronto = pid => ok12(s.picks[pid]) && ok12(s.bets[pid]);
    const newDeck = () => shuffle(s.cfg.sacana ? NORMAIS.concat(SACANA) : NORMAIS);

    function syncOrder() {   // quem saiu sai da roda; quem entrou no meio vai para o fim
      const ps = pids();
      s.order = s.order.filter(x => ps.includes(x));
      for (const x of ps) if (!s.order.includes(x)) s.order.push(x);
    }
    function nextTurn(first) {
      clearTimeout(grace); grace = null;
      api.clearTimer();
      syncOrder();
      if (!s.order.length) return;
      const i = s.order.indexOf(s.reader);
      s.reader = first ? s.order[0] : s.order[i < 0 ? 0 : (i + 1) % s.order.length];
      s.phase = 'draw'; s.card = null; s.picks = {}; s.bets = {}; s.result = null;
      api.setEvent(`Vez de ${nameOf(s.reader)}: vire uma carta.`, null);
    }
    function draw() {
      if (!s.deck.length) s.deck = newDeck();
      s.card = s.deck.shift();
      s.round++;
      s.phase = 'vote'; s.picks = {}; s.bets = {};
      api.armTimer(ms());
      api.setEvent(`${nameOf(s.reader)} virou a carta. Escolham e apostem!`, null);
    }
    function maybeClose() {
      if (s.phase !== 'vote') return;
      const falta = pids().filter(x => online(x) && !pronto(x));
      if (!falta.length && !grace) grace = setTimeout(() => { grace = null; if (s.phase === 'vote') { reveal(); api.broadcast(); } }, 1200);
    }
    function reveal() {
      clearTimeout(grace); grace = null;
      api.clearTimer();
      const n = { 1: 0, 2: 0 };
      for (const pid of Object.keys(s.picks)) if (here(pid) && ok12(s.picks[pid])) n[s.picks[pid]]++;
      const maj = n[1] > n[2] ? 1 : n[2] > n[1] ? 2 : 0;
      const hit = maj ? Object.keys(s.bets).filter(pid => here(pid) && s.bets[pid] === maj) : [];
      for (const pid of hit) s.scores[pid] = (s.scores[pid] || 0) + 1;
      s.result = { n, maj, hit, picks: { ...s.picks }, bets: { ...s.bets } };
      const top = Math.max(0, ...pids().map(pid => s.scores[pid] || 0));
      if (top >= s.cfg.goal) {
        s.phase = 'end';
        s.champs = pids().filter(pid => (s.scores[pid] || 0) === top);
        api.setEvent(s.champs.length > 1 ? `Empate no fim! ${s.champs.map(nameOf).join(' e ')} venceram com ${top} pontos.` : `${nameOf(s.champs[0])} chegou a ${top} pontos e venceu!`, null);
        return;
      }
      s.phase = 'result';
      if (!n[1] && !n[2]) api.setEvent('Ninguém escolheu. Carta perdida.', null);
      else if (!maj) api.setEvent(`Empate: ${n[1]} a ${n[2]}. Ninguém pontua.`, null);
      else api.setEvent(`A maioria escolheu a opção ${maj} (${n[maj]} a ${n[3 - maj]}). ${hit.length ? `${hit.map(nameOf).join(', ')} acert${hit.length > 1 ? 'aram' : 'ou'}!` : 'Ninguém acertou.'}`, null);
    }

    const inst = {
      start() { clearTimeout(grace); grace = null; api.clearTimer(); s.phase = 'setup'; s.champs = []; api.setEvent('Ajustem as regras e toquem em Começar.', null); },
      onTimeUp() { if (s.phase === 'vote') reveal(); },
      action(p, msg) {
        switch (msg.t) {
          case 'config': {
            if (s.phase !== 'setup') return;
            const c = msg.cfg || {};
            if (c.reset) { s.cfg = { ...DEFAULT_CFG }; return; }
            if (GOALS.includes(Number(c.goal))) s.cfg.goal = Number(c.goal);
            if (VOTE_SECS.includes(Number(c.voteSec))) s.cfg.voteSec = Number(c.voteSec);
            if (typeof c.sacana === 'boolean') s.cfg.sacana = c.sacana;
            return;
          }
          case 'begin': {
            if (s.phase !== 'setup' || api.players.length < 3) return;
            s.order = shuffle(pids()); s.scores = {}; s.round = 0; s.champs = []; s.reader = null;
            s.deck = newDeck();
            nextTurn(true);
            api.setEvent(`Sorteio: ${nameOf(s.reader)} começa. Vire uma carta!`, null);
            return;
          }
          case 'draw': {
            if (s.phase !== 'draw') return;
            if (p.pid !== s.reader && online(s.reader)) return;   // fora do ar? qualquer um vira por ele
            draw(); return;
          }
          case 'skip': if (s.phase === 'draw' && !online(s.reader)) nextTurn(); return;
          case 'pick': {
            const v = Number(msg.v);
            if (s.phase !== 'vote' || !ok12(v)) return;
            s.picks[p.pid] = v; maybeClose(); return;
          }
          case 'bet': {
            const v = Number(msg.v);
            if (s.phase !== 'vote' || !ok12(v)) return;
            s.bets[p.pid] = v; maybeClose(); return;
          }
          case 'next': if (s.phase === 'result') nextTurn(); return;
          case 'again': if (s.phase === 'end') inst.start(); return;
        }
      },
      rekey(o, n) {
        const sw = x => x === o ? n : x;
        const mv = obj => { if (obj && obj[o] != null) { obj[n] = obj[o]; delete obj[o]; } };
        s.order = s.order.map(sw); s.reader = sw(s.reader); s.champs = s.champs.map(sw);
        mv(s.picks); mv(s.bets); mv(s.scores);
        if (s.result) { mv(s.result.picks); mv(s.result.bets); s.result.hit = s.result.hit.map(sw); }
      },
      onPlayerLeave(pid) {
        delete s.picks[pid]; delete s.bets[pid];
        if (s.phase === 'draw' && s.reader === pid) { nextTurn(); return; }
        maybeClose();
      },
      view(me) {
        const aberto = s.phase === 'result' || s.phase === 'end';
        return {
          phase: s.phase, cfg: s.cfg, goals: GOALS, voteSecs: VOTE_SECS, round: s.round,
          order: s.order, reader: s.reader, card: s.phase === 'setup' || s.phase === 'draw' ? null : s.card,
          turnMs: ms(),
          ready: pids().filter(pronto),
          myPick: me ? s.picks[me.pid] || null : null, myBet: me ? s.bets[me.pid] || null : null,
          result: aberto ? s.result : null, scores: s.scores, champs: s.champs,
        };
      },
      serialize: () => ({ s }),
      restore(d) {
        if (!d || !d.s) return;
        s = { ...s, ...d.s };
        if (s.phase === 'vote' && !api.timerEnd) api.armTimer(ms());
      },
      destroy() { clearTimeout(grace); grace = null; },
    };
    return inst;
  },
};
