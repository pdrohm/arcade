// Amigos de Merda (Buró). Na sua vez, você compra uma carta e lê a pergunta. Todo mundo aponta ao
// mesmo tempo para quem mais "merece" (nunca para si mesmo). O mais apontado fica com a carta.
// Empate: quem não votou em nenhum dos empatados pode trocar o voto para um deles; se continuar
// empatado, o voto de quem leu a carta desempata. Quem juntar as cartas da meta (5) é coroado o
// AMIGO DE MERDA. Regras: manual da Buró (2024). Sem regras de bebida (como no Te F0d3).
const { NORMAIS, SACANA } = require('./cards');

const TIE_MS = 20 * 1000;
const DECIDE_MS = 20 * 1000;
const DEFAULT_CFG = { goal: 5, voteSec: 30, sacana: false };
const GOALS = [3, 5, 7];
const VOTE_SECS = [20, 30, 45];

const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

module.exports = {
  meta: {
    id: 'amigosdemerda', name: 'Amigos de Merda', category: 'festa', glyph: '☝', emoji: '💩',
    tagline: 'Leia a carta, todo mundo aponta. O mais apontado fica com ela.',
    art: 'linear-gradient(135deg,#b45309 0%,#713f12 55%,#1c1917 100%)',
    minPlayers: 3, maxPlayers: 10,
    howTo: [
      'Na sua vez, compre uma carta: a pergunta aparece na TV.',
      'Todo mundo aponta no celular ao mesmo tempo. Não vale votar em si mesmo.',
      'O mais apontado fica com a carta.',
      'Empate: quem não votou nos empatados pode trocar o voto. Se continuar, quem leu a carta desempata.',
      'Quem juntar 5 cartas é coroado o AMIGO DE MERDA.',
    ],
  },
  create(api) {
    let s = {
      phase: 'setup', cfg: { ...DEFAULT_CFG }, order: [], turn: 0, reader: null, round: 0,
      deck: [], q: '', votes: {}, tops: [], tieElig: [], tieDone: [], result: null, cards: {}, champ: null,
    };
    let grace = null;

    const pids = () => api.players.map(p => p.pid);
    const here = pid => !!api.byPid(pid);
    const online = pid => { const p = api.byPid(pid); return !!p && p.on !== false; };
    const nameOf = pid => { const p = api.byPid(pid); return p ? p.name : 'Alguém'; };
    const ms = () => (Number(s.cfg.voteSec) || 30) * 1000;
    const nCards = pid => (s.cards[pid] || []).length;

    function tally() {
      const count = {};
      for (const [v, alvo] of Object.entries(s.votes)) if (here(v) && here(alvo)) count[alvo] = (count[alvo] || 0) + 1;
      const max = Math.max(0, ...Object.values(count));
      return { count, max, tops: max ? Object.keys(count).filter(k => count[k] === max) : [] };
    }

    // ---------- turnos ----------
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
      if (first) s.turn = 0;
      else {
        const i = s.order.indexOf(s.reader);
        s.turn = i < 0 ? s.turn % s.order.length : (i + 1) % s.order.length;
      }
      s.reader = s.order[s.turn];
      s.phase = 'draw'; s.q = ''; s.votes = {}; s.tops = []; s.tieElig = []; s.tieDone = []; s.result = null;
      api.setEvent(`Vez de ${nameOf(s.reader)}: compre uma carta.`, null);
    }
    function draw() {
      if (!s.deck.length) s.deck = shuffle(s.cfg.sacana ? NORMAIS.concat(SACANA) : NORMAIS);
      s.q = s.deck.shift();
      s.round++;
      s.phase = 'vote'; s.votes = {};
      api.armTimer(ms());
      api.setEvent(`${nameOf(s.reader)} leu a carta. Todo mundo aponta!`, null);
    }

    // ---------- votação ----------
    function maybeClose() {
      if (s.phase === 'vote') {
        const falta = pids().filter(x => online(x) && !s.votes[x]);
        if (!falta.length && !grace) grace = setTimeout(() => { grace = null; if (s.phase === 'vote') { closeVote(); api.broadcast(); } }, 1200);
      } else if (s.phase === 'tie') {
        const falta = s.tieElig.filter(x => online(x) && !s.tieDone.includes(x));
        if (!falta.length) closeTie();
      }
    }
    function closeVote() {
      clearTimeout(grace); grace = null;
      api.clearTimer();
      const t = tally();
      if (!t.tops.length) return finish(null, 'ninguem');
      if (t.tops.length === 1) return finish(t.tops[0], Object.keys(s.votes).length > 1 && t.max === Object.keys(s.votes).filter(here).length ? 'unanime' : 'maioria');
      // empate: quem não votou em nenhum dos empatados pode trocar
      s.tops = t.tops;
      s.tieElig = Object.keys(s.votes).filter(v => here(v) && !t.tops.includes(s.votes[v]));
      s.tieDone = [];
      if (!s.tieElig.length) return readerBreaks();
      s.phase = 'tie';
      api.armTimer(TIE_MS);
      api.setEvent(`Empate! Quem não votou em ${s.tops.map(nameOf).join(' nem ')} pode trocar o voto.`, null);
    }
    function closeTie() {
      api.clearTimer();
      const t = tally();
      if (t.tops.length === 1) return finish(t.tops[0], 'troca');
      s.tops = t.tops;
      readerBreaks();
    }
    function readerBreaks() {   // o voto de quem leu a carta desempata
      const rv = s.votes[s.reader];
      if (rv && s.tops.includes(rv)) return finish(rv, 'leitor');
      const cand = s.tops.filter(x => x !== s.reader);
      if (cand.length === 1) return finish(cand[0], 'leitor');
      if (!online(s.reader)) return finish(cand[Math.floor(Math.random() * cand.length)], 'sorteio');
      s.phase = 'decide';
      api.armTimer(DECIDE_MS);
      api.setEvent(`Continua empatado. ${nameOf(s.reader)} leu a carta e desempata.`, null);
    }
    function finish(win, how) {
      clearTimeout(grace); grace = null;
      api.clearTimer();
      const t = tally();
      s.result = { win, how, count: t.count, votes: { ...s.votes }, tops: s.tops.slice() };
      if (win) (s.cards[win] = s.cards[win] || []).push(s.q);
      if (win && nCards(win) >= s.cfg.goal) {
        s.phase = 'end'; s.champ = win;
        api.setEvent(`${nameOf(win)} juntou ${s.cfg.goal} cartas e é o AMIGO DE MERDA!`, null);
        return;
      }
      s.phase = 'result';
      const txt = {
        ninguem: 'Ninguém votou. A carta vai para o lixo.',
        unanime: `Unanimidade! ${nameOf(win)} fica com a carta.`,
        maioria: `${nameOf(win)} foi o mais apontado e fica com a carta.`,
        troca: `Trocaram os votos: ${nameOf(win)} fica com a carta.`,
        leitor: `${nameOf(s.reader)} desempatou: ${nameOf(win)} fica com a carta.`,
        sorteio: `Empate sem desempate: o sorteio deu ${nameOf(win)}, que fica com a carta.`,
      }[how];
      api.setEvent(txt, null);
    }

    const inst = {
      start() { clearTimeout(grace); grace = null; api.clearTimer(); s.phase = 'setup'; s.champ = null; api.setEvent('Ajustem as regras e toquem em Começar.', null); },
      onTimeUp() {
        if (s.phase === 'vote') { closeVote(); return; }
        if (s.phase === 'tie') { closeTie(); return; }
        if (s.phase === 'decide') {
          const cand = s.tops.filter(x => x !== s.reader && here(x));
          const pool = cand.length ? cand : s.tops;
          finish(pool[Math.floor(Math.random() * pool.length)], 'sorteio');
        }
      },
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
            s.order = shuffle(pids()); s.cards = {}; s.round = 0; s.champ = null;
            s.deck = shuffle(s.cfg.sacana ? NORMAIS.concat(SACANA) : NORMAIS);
            nextTurn(true);
            api.setEvent(`Sorteio: ${nameOf(s.reader)} começa. Compre uma carta!`, null);
            return;
          }
          case 'draw': {
            if (s.phase !== 'draw') return;
            if (p.pid !== s.reader && online(s.reader)) return;   // fora do ar? qualquer um compra por ele
            draw();
            return;
          }
          case 'skip': {   // pula a vez de quem está sem conexão
            if (s.phase !== 'draw' || online(s.reader)) return;
            nextTurn();
            return;
          }
          case 'vote': {
            const alvo = String(msg.pid || '');
            if (!here(alvo) || alvo === p.pid) return;
            if (s.phase === 'vote') { s.votes[p.pid] = alvo; maybeClose(); return; }
            if (s.phase === 'tie') {
              if (!s.tieElig.includes(p.pid) || s.tieDone.includes(p.pid) || !s.tops.includes(alvo)) return;
              s.votes[p.pid] = alvo; s.tieDone.push(p.pid); maybeClose(); return;
            }
            if (s.phase === 'decide') {
              if (p.pid !== s.reader || !s.tops.includes(alvo)) return;
              s.votes[p.pid] = alvo; finish(alvo, 'leitor'); return;
            }
            return;
          }
          case 'keep': {   // empate: fica com o voto que já deu
            if (s.phase !== 'tie' || !s.tieElig.includes(p.pid) || s.tieDone.includes(p.pid)) return;
            s.tieDone.push(p.pid); maybeClose(); return;
          }
          case 'next': if (s.phase === 'result') nextTurn(); return;
          case 'again': if (s.phase === 'end') inst.start(); return;
        }
      },
      rekey(o, n) {
        const sw = x => x === o ? n : x;
        s.order = s.order.map(sw); s.reader = sw(s.reader); s.champ = sw(s.champ);
        s.tops = s.tops.map(sw); s.tieElig = s.tieElig.map(sw); s.tieDone = s.tieDone.map(sw);
        const nv = {}; for (const [k, v] of Object.entries(s.votes)) nv[sw(k)] = sw(v); s.votes = nv;
        if (s.cards[o]) { s.cards[n] = s.cards[o]; delete s.cards[o]; }
        if (s.result) {
          s.result.win = sw(s.result.win); s.result.tops = s.result.tops.map(sw);
          const rv = {}; for (const [k, v] of Object.entries(s.result.votes)) rv[sw(k)] = sw(v); s.result.votes = rv;
          if (s.result.count[o] != null) { s.result.count[n] = s.result.count[o]; delete s.result.count[o]; }
        }
      },
      onPlayerLeave(pid) {
        delete s.votes[pid];
        for (const k of Object.keys(s.votes)) if (s.votes[k] === pid) delete s.votes[k];
        s.tieElig = s.tieElig.filter(x => x !== pid);
        if (s.phase === 'setup' || s.phase === 'end' || s.phase === 'result') return;
        if (s.phase === 'draw' && s.reader === pid) { nextTurn(); return; }
        if ((s.phase === 'tie' || s.phase === 'decide') && (s.tops.includes(pid) || s.reader === pid)) {   // a contagem mudou: refaz o empate
          s.tops = tally().tops;
          if (s.tops.length < 2) return finish(s.tops[0] || null, s.tops.length ? 'maioria' : 'ninguem');
          if (s.phase === 'decide') {
            const cand = s.tops.filter(x => x !== s.reader);
            if (!here(s.reader) || cand.length === 1) return finish(cand[Math.floor(Math.random() * cand.length)], 'leitor');
          }
        }
        maybeClose();
      },
      view(me) {
        const aberto = !['vote', 'draw', 'setup'].includes(s.phase);
        const t = tally();
        const cards = {}; for (const pid of Object.keys(s.cards)) cards[pid] = s.cards[pid].length;
        return {
          phase: s.phase, cfg: s.cfg, goals: GOALS, voteSecs: VOTE_SECS, round: s.round,
          order: s.order, reader: s.reader, q: s.phase === 'draw' || s.phase === 'setup' ? '' : s.q,
          turnMs: s.phase === 'tie' ? TIE_MS : s.phase === 'decide' ? DECIDE_MS : ms(),
          voted: Object.keys(s.votes),
          myVote: me ? s.votes[me.pid] || null : null,
          votes: aberto ? s.votes : null, count: aberto ? t.count : null,
          tops: s.tops, tieElig: s.tieElig, tieDone: s.tieDone,
          result: s.result, cards, champ: s.champ,
          won: s.phase === 'end' ? s.cards : null,   // no fim, todas as cartas de todo mundo
        };
      },
      serialize: () => ({ s }),
      restore(d) {
        if (!d || !d.s) return;
        s = { ...s, ...d.s };
        if (s.phase === 'vote' && !api.timerEnd) api.armTimer(ms());
        if (s.phase === 'tie' && !api.timerEnd) api.armTimer(TIE_MS);
        if (s.phase === 'decide' && !api.timerEnd) api.armTimer(DECIDE_MS);
      },
      destroy() { clearTimeout(grace); grace = null; },
    };
    return inst;
  },
};
