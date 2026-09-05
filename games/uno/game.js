// UNO — combine cor, número ou símbolo com a carta do topo. Quem ficar sem cartas vence a rodada.
// Baralho de 108 cartas. As mãos são privadas: view() só devolve a mão de quem pediu.
const CORES = ['r', 'y', 'g', 'b'];
const NOME_COR = { r: 'Vermelho', y: 'Amarelo', g: 'Verde', b: 'Azul' };
const DEFAULT_CFG = { stack: false, sevenzero: false, target: 0, turnSec: 0 };   // target 0 = uma rodada só
const ALVOS = [0, 200, 300, 500];
const TEMPOS = [0, 15, 30];

const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const coringa = c => c.c === 'w';
const valor = c => (c.v === 'wild' || c.v === '+4') ? 50 : (c.v === '+2' || c.v === 'rev' || c.v === 'skip') ? 20 : Number(c.v);

function novoBaralho() {
  const d = []; let i = 0;
  for (const c of CORES) {
    d.push({ i: i++, c, v: '0' });                                   // um zero por cor
    for (const v of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '+2', 'rev', 'skip']) { d.push({ i: i++, c, v }); d.push({ i: i++, c, v }); }
  }
  for (let k = 0; k < 4; k++) { d.push({ i: i++, c: 'w', v: 'wild' }); d.push({ i: i++, c: 'w', v: '+4' }); }
  return shuffle(d);
}

module.exports = {
  meta: {
    id: 'uno', name: 'UNO', emoji: '🃏',
    tagline: 'Combine cor ou número, grite UNO e não esqueça o +4.',
    art: 'linear-gradient(135deg,#ef4444 0%,#facc15 40%,#22c55e 70%,#3b82f6 100%)',
    minPlayers: 2, maxPlayers: 8,
    howTo: [
      'Cada um começa com 7 cartas. A mão só aparece no seu celular.',
      'Na sua vez, jogue uma carta da mesma cor, do mesmo número ou do mesmo símbolo.',
      'Não tem nada? Compre uma. Se ela servir, dá para jogar na hora.',
      'Coringa troca a cor. +2 e +4 fazem o próximo comprar e perder a vez.',
      'Ficou com 1 carta? Aperte UNO! Se esquecer, alguém aperta "Pegou!" e você compra 2.',
    ],
  },

  create(api) {
    let s = {
      phase: 'setup', cfg: { ...DEFAULT_CFG },
      deck: [], pile: [], hands: {}, order: [], turn: 0, dir: 1, color: null,
      pending: 0, pendingType: null, drawn: null, said: {}, risk: null,
      scores: {}, roundScores: {}, roundWinner: null, starter: null,
      wildBy: null, swapBy: null, lastPlay: null, round: 0,
    };

    const nome = pid => { const p = api.byPid(pid); return p ? p.name : 'Alguém'; };
    const cor = pid => { const p = api.byPid(pid); return p ? p.color : null; };
    const mao = pid => (s.hands[pid] = s.hands[pid] || []);
    const topo = () => s.pile[s.pile.length - 1] || null;
    const atual = () => s.order[s.turn] || null;
    const passo = (n = 1) => { if (s.order.length) s.turn = ((s.turn + n * s.dir) % s.order.length + s.order.length) % s.order.length; };

    // Baralho acabou: embaralha o descarte de volta (o topo fica na mesa, coringas voltam sem cor).
    function reembaralhar() {
      if (s.deck.length || s.pile.length < 2) return;
      const t = s.pile.pop();
      s.deck = shuffle(s.pile.map(c => (c.v === 'wild' || c.v === '+4') ? { ...c, c: 'w' } : c));
      s.pile = [t];
    }
    function comprar(pid, n) {
      const out = [];
      for (let k = 0; k < n; k++) { if (!s.deck.length) reembaralhar(); if (!s.deck.length) break; const c = s.deck.pop(); mao(pid).push(c); out.push(c); }
      if (mao(pid).length !== 1) { s.said[pid] = false; if (s.risk === pid) s.risk = null; }
      return out;
    }
    // A janela do "Pegou!" fecha quando outra pessoa joga ou compra.
    const fecharRisco = quem => { if (s.risk && s.risk !== quem) s.risk = null; };

    function podeJogar(card) {
      const t = topo(); if (!t) return false;
      if (s.pending > 0) {                                    // acumulando: só responde com outro +
        if (!s.cfg.stack) return false;
        return s.pendingType === '+4' ? card.v === '+4' : (card.v === '+2' || card.v === '+4');
      }
      if (coringa(card)) return true;
      return card.c === s.color || card.v === t.v;
    }
    function armar() {
      s.drawn = null;
      if (s.cfg.turnSec) api.armTimer(s.cfg.turnSec * 1000); else api.clearTimer();
    }

    function girarMaos() {                                     // "7 e 0": o 0 gira as mãos no sentido do jogo
      const hs = s.order.map(pid => mao(pid)), n = s.order.length;
      for (let k = 0; k < n; k++) s.hands[s.order[((k + s.dir) % n + n) % n]] = hs[k];
      s.said = {}; s.risk = null;
    }

    function efeito(card, pid) {
      const n = s.order.length;
      if (card.v === '+2' || card.v === '+4') {
        const q = card.v === '+2' ? 2 : 4;
        if (s.cfg.stack) { s.pending += q; s.pendingType = card.v; passo(1); }
        else { passo(1); const v = atual(); comprar(v, q); api.addEvent(`${nome(v)} comprou ${q} e perdeu a vez.`); passo(1); }
      } else if (card.v === 'skip') passo(2);
      else if (card.v === 'rev') { if (n === 2) passo(2); else { s.dir *= -1; passo(1); } }   // com 2 jogadores, inverter = pular
      else if (card.v === '7' && s.cfg.sevenzero) { s.phase = 'swap'; s.swapBy = pid; api.clearTimer(); api.addEvent('Trocando de mão…'); return; }
      else if (card.v === '0' && s.cfg.sevenzero) { girarMaos(); api.addEvent('Todas as mãos giraram!'); passo(1); }
      else passo(1);
      armar();
    }

    function fecharRodada(pid) {
      api.clearTimer();
      let soma = 0;
      for (const q of s.order) if (q !== pid) soma += mao(q).reduce((t, c) => t + valor(c), 0);
      s.roundScores = { [pid]: soma };
      s.scores[pid] = (s.scores[pid] || 0) + soma;
      s.roundWinner = pid; s.starter = pid; s.risk = null; s.drawn = null; s.pending = 0; s.pendingType = null;
      const melhor = Math.max(0, ...s.order.map(q => s.scores[q] || 0));
      const acabou = s.cfg.target === 0 || melhor >= s.cfg.target;
      s.phase = acabou ? 'end' : 'round';
      api.setEvent(acabou ? `🏆 ${nome(pid)} venceu!` : `${nome(pid)} bateu a rodada e ganhou ${soma} pontos.`, cor(pid));
    }

    function novaRodada() {
      s.order = api.players.map(p => p.pid);
      if (s.order.length < 2) { s.phase = 'setup'; api.clearTimer(); return; }
      s.round++;
      s.deck = novoBaralho(); s.pile = []; s.hands = {}; s.said = {}; s.risk = null;
      s.pending = 0; s.pendingType = null; s.drawn = null; s.roundScores = {}; s.roundWinner = null;
      s.wildBy = null; s.swapBy = null; s.lastPlay = null; s.dir = 1;
      for (const pid of s.order) s.hands[pid] = [];
      for (let k = 0; k < 7; k++) for (const pid of s.order) comprar(pid, 1);
      let first = null;                                         // a primeira carta da mesa nunca é +4
      while (!first) { const c = s.deck.pop(); if (c.v === '+4') { s.deck.unshift(c); shuffle(s.deck); } else first = c; }
      s.pile = [first];
      const i = s.order.indexOf(s.starter);
      s.turn = i >= 0 ? i : 0;
      s.phase = 'play';
      s.color = coringa(first) ? CORES[Math.floor(Math.random() * 4)] : first.c;
      api.setEvent(`Rodada ${s.round}! Mesa: ${desc(first)}${coringa(first) ? ` (cor ${NOME_COR[s.color]})` : ''}.`, null);
      if (first.v === 'skip') { api.addEvent(`${nome(atual())} perdeu a vez.`); passo(1); }
      else if (first.v === 'rev') { if (s.order.length === 2) passo(1); else { s.dir = -1; passo(1); } }
      else if (first.v === '+2') { const v = atual(); comprar(v, 2); api.addEvent(`${nome(v)} comprou 2 e perdeu a vez.`); passo(1); }
      armar();
    }
    const desc = c => c.v === 'wild' ? 'Coringa' : c.v === '+4' ? 'Coringa +4' : c.v === 'rev' ? `Inverter ${NOME_COR[c.c]}` : c.v === 'skip' ? `Pular ${NOME_COR[c.c]}` : `${c.v} ${NOME_COR[c.c] || ''}`.trim();

    // joga a carta que já foi validada
    function jogar(pid, k) {
      const h = mao(pid), card = h[k];
      fecharRisco(pid);
      h.splice(k, 1);
      s.pile.push(card);
      s.lastPlay = { pid, card, at: Date.now() };
      s.drawn = null;
      if (h.length === 0) return fecharRodada(pid);
      if (h.length === 1 && !s.said[pid]) s.risk = pid;
      if (h.length > 1) s.said[pid] = false;
      api.setEvent(`${nome(pid)} jogou ${desc(card)}.`, cor(pid));
      if (coringa(card)) { s.phase = 'color'; s.wildBy = pid; api.clearTimer(); api.addEvent('Escolhendo a cor…'); return; }
      s.color = card.c;
      efeito(card, pid);
    }

    const inst = {
      start() {
        s.phase = 'setup'; s.scores = {}; s.round = 0; s.starter = null; s.hands = {}; s.order = [];
        api.clearTimer();
        api.setEvent('Ajustem as regras no celular e toquem em "Começar".', null);
      },

      onTimeUp() {
        if (s.phase !== 'play' || !atual()) return;
        const pid = atual();
        if (s.pending > 0) { comprar(pid, s.pending); api.setEvent(`⏰ Tempo! ${nome(pid)} comprou ${s.pending} cartas.`, cor(pid)); s.pending = 0; s.pendingType = null; }
        else { comprar(pid, 1); api.setEvent(`⏰ Tempo! ${nome(pid)} comprou 1 carta e passou.`, cor(pid)); }
        passo(1); armar();
      },

      action(p, msg) {
        const me = p.pid;
        switch (msg.t) {
          case 'config': {                                    // qualquer um muda as regras antes de começar
            if (s.phase !== 'setup') return;
            const c = msg.cfg || {};
            if (c.stack !== undefined) s.cfg.stack = !!c.stack;
            if (c.sevenzero !== undefined) s.cfg.sevenzero = !!c.sevenzero;
            if (c.target !== undefined && ALVOS.includes(Number(c.target))) s.cfg.target = Number(c.target);
            if (c.turnSec !== undefined && TEMPOS.includes(Number(c.turnSec))) s.cfg.turnSec = Number(c.turnSec);
            api.setEvent(`${p.name} mudou as regras.`, p.color);
            return;
          }
          case 'begin': {
            if (s.phase !== 'setup' || api.players.length < 2) return;
            s.scores = {}; s.round = 0; s.starter = api.players[0].pid;
            novaRodada();
            return;
          }
          case 'card': {
            if (s.phase !== 'play' || atual() !== me) return;
            const h = mao(me), k = h.findIndex(c => c.i === Number(msg.i));
            if (k < 0 || !podeJogar(h[k])) return;
            if (s.drawn && s.drawn.i !== h[k].i) return;        // comprou: ou joga a comprada ou passa
            jogar(me, k);
            return;
          }
          case 'color': {
            if (s.phase !== 'color' || s.wildBy !== me) return;
            const c = String(msg.c || '');
            if (!CORES.includes(c)) return;
            s.color = c; s.phase = 'play'; s.wildBy = null;
            api.setEvent(`${p.name} escolheu ${NOME_COR[c]}.`, p.color);
            efeito(topo(), me);
            return;
          }
          case 'swap': {                                       // regra "7 e 0": troca a mão com alguém
            if (s.phase !== 'swap' || s.swapBy !== me) return;
            const alvo = String(msg.pid || '');
            if (alvo === me || !s.order.includes(alvo)) return;
            const t = s.hands[me]; s.hands[me] = s.hands[alvo]; s.hands[alvo] = t;
            s.said = {}; s.risk = null;
            s.phase = 'play'; s.swapBy = null;
            api.setEvent(`${p.name} trocou de mão com ${nome(alvo)}.`, p.color);
            passo(1); armar();
            return;
          }
          case 'draw': {
            if (s.phase !== 'play' || atual() !== me || s.drawn) return;
            fecharRisco(me);
            if (s.pending > 0) {
              const n = s.pending;
              comprar(me, n); s.pending = 0; s.pendingType = null;
              api.setEvent(`${p.name} comprou ${n} cartas e perdeu a vez.`, p.color);
              passo(1); armar(); return;
            }
            const [c] = comprar(me, 1);
            if (!c) { passo(1); armar(); return; }
            if (podeJogar(c)) { s.drawn = { pid: me, i: c.i }; api.setEvent(`${p.name} comprou uma carta.`, p.color); }
            else { api.setEvent(`${p.name} comprou e passou a vez.`, p.color); passo(1); armar(); }
            return;
          }
          case 'pass': {
            if (s.phase !== 'play' || atual() !== me || !s.drawn || s.drawn.pid !== me) return;
            api.setEvent(`${p.name} passou a vez.`, p.color);
            passo(1); armar();
            return;
          }
          case 'uno': {
            if (mao(me).length > 2 || !s.order.includes(me)) return;
            s.said[me] = true;
            if (s.risk === me) s.risk = null;
            api.setEvent(`${p.name} gritou UNO!`, p.color);
            return;
          }
          case 'catch': {
            if (!s.risk || s.risk === me || !s.order.includes(me)) return;
            const v = s.risk;
            s.risk = null;
            comprar(v, 2);
            api.setEvent(`${p.name} pegou ${nome(v)} sem UNO! +2 cartas.`, p.color);
            return;
          }
          case 'next': if (s.phase === 'round') novaRodada(); return;
          case 'again': if (s.phase === 'end') inst.start(); return;
        }
      },

      rekey(o, n) {
        if (s.hands[o]) { s.hands[n] = s.hands[o]; delete s.hands[o]; }
        if (s.said[o] !== undefined) { s.said[n] = s.said[o]; delete s.said[o]; }
        if (s.scores[o] !== undefined) { s.scores[n] = s.scores[o]; delete s.scores[o]; }
        if (s.roundScores[o] !== undefined) { s.roundScores[n] = s.roundScores[o]; delete s.roundScores[o]; }
        const i = s.order.indexOf(o); if (i >= 0) s.order[i] = n;
        for (const k of ['risk', 'starter', 'roundWinner', 'wildBy', 'swapBy']) if (s[k] === o) s[k] = n;
        if (s.drawn && s.drawn.pid === o) s.drawn.pid = n;
        if (s.lastPlay && s.lastPlay.pid === o) s.lastPlay.pid = n;
      },

      onPlayerLeave(pid) {
        const i = s.order.indexOf(pid);
        if (i < 0) return;
        s.deck = shuffle(s.deck.concat((s.hands[pid] || []).map(c => (c.v === 'wild' || c.v === '+4') ? { ...c, c: 'w' } : c)));
        delete s.hands[pid]; delete s.said[pid];
        s.order.splice(i, 1);
        if (s.risk === pid) s.risk = null;
        if (s.drawn && s.drawn.pid === pid) s.drawn = null;
        if (s.order.length < 2) { s.phase = 'setup'; api.clearTimer(); api.setEvent('Poucos jogadores: ajustem as regras e comecem de novo.', null); return; }
        if (i < s.turn) s.turn--;
        if (s.turn >= s.order.length) s.turn = 0;
        if (s.phase === 'color' && s.wildBy === pid) { s.wildBy = null; s.phase = 'play'; s.color = CORES[Math.floor(Math.random() * 4)]; passo(1); armar(); }
        if (s.phase === 'swap' && s.swapBy === pid) { s.swapBy = null; s.phase = 'play'; passo(1); armar(); }
      },

      // A mão é privada: só vai para o dono dela. A TV (me = null) nunca recebe carta nenhuma.
      view(me) {
        const minha = me && s.hands[me.pid] ? s.hands[me.pid] : [];
        const daVez = atual();
        return {
          phase: s.phase, cfg: s.cfg, alvos: ALVOS, tempos: TEMPOS,
          color: s.color, top: topo(), dir: s.dir, round: s.round,
          deckN: s.deck.length, pileN: s.pile.length,
          turn: daVez, order: s.order.map(pid => ({ pid, n: (s.hands[pid] || []).length, said: !!s.said[pid] })),
          hand: minha.map(c => ({ ...c, ok: s.phase === 'play' && daVez === (me && me.pid) && podeJogar(c) && (!s.drawn || s.drawn.i === c.i) })),
          drawn: me && s.drawn && s.drawn.pid === me.pid ? s.drawn.i : null,
          pending: s.pending, pendingType: s.pendingType, risk: s.risk,
          wildBy: s.wildBy, swapBy: s.swapBy, lastPlay: s.lastPlay,
          scores: s.scores, roundScores: s.roundScores, roundWinner: s.roundWinner,
          winner: s.phase === 'end' ? [...s.order].sort((a, b) => (s.scores[b] || 0) - (s.scores[a] || 0))[0] : null,
          turnMs: s.cfg.turnSec * 1000 || null,
          canUno: !!me && minha.length <= 2 && minha.length > 0 && !s.said[me.pid],
        };
      },

      serialize: () => ({ s }),
      restore(d) {
        if (!d || !d.s) return;
        s = { ...s, ...d.s };
        s.cfg = { ...DEFAULT_CFG, ...(s.cfg || {}) };
        if (s.phase === 'play' && s.cfg.turnSec && !api.timerEnd) api.armTimer(s.cfg.turnSec * 1000);
      },
    };
    return inst;
  },
};
