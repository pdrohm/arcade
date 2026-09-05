// Stop (Adedonha). Uma letra, várias categorias, todo mundo escreve no celular.
// Quem terminar aperta STOP: os outros têm 10 segundos. Depois a TV confere categoria por categoria.
const STOP_MS = Number(process.env.STOP_STOP_MS) || 1200;   // após o STOP: só o tempo de os celulares enviarem o que já estava digitado
const SPIN_MS = Number(process.env.STOP_SPIN_MS) || 4000;      // roleta de letras
const ALL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const DEFAULT_LETTERS = ALL_LETTERS.filter(l => !'KWY'.includes(l));
const DEFAULT_CATS = ['Nome', 'Animal', 'Cor', 'Fruta ou comida', 'Objeto', 'Cidade ou país', 'Filme ou série', 'Marca', 'Profissão', 'Parte do corpo', 'Música ou cantor', 'Time de futebol', 'Coisa de cozinha', 'Personagem'];
// configuração padrão; o menu antes do jogo permite mudar tudo
const DEFAULT_CFG = { rounds: 3, fillMs: Number(process.env.STOP_FILL_MS) || 90 * 1000, catsPerRound: 6, cats: DEFAULT_CATS.slice(), letters: DEFAULT_LETTERS.slice() };

const norm = s => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');
const MIN_LEN = 2;                                     // uma letra sozinha não é resposta
const preenchida = v => norm(v).length >= MIN_LEN;     // vale como "preenchido" para o STOP e para o progresso
const pick = (arr, n) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };

module.exports = {
  meta: {
    id: 'stop', name: 'Stop', emoji: '🛑',
    tagline: 'Uma letra, seis categorias, e o primeiro que terminar grita STOP.',
    art: 'linear-gradient(135deg,#ef4444 0%,#991b1b 55%,#450a0a 100%)',
    minPlayers: 2, maxPlayers: 8,
    howTo: ['Sai uma letra. Preencha as categorias no celular.', 'Terminou tudo? Aperte STOP. O tempo para e começa a conferência.', 'Resposta certa vale 10. Igual à de outra pessoa vale 5. Errada, vazia ou de uma letra só, zero.', 'Na conferência, se a maioria marcar ❌ numa resposta, ela não vale.', '3 rodadas. Quem somar mais pontos vence.'],
  },
  create(api) {
    let s = { phase: 'setup', cfg: JSON.parse(JSON.stringify(DEFAULT_CFG)), round: 0, letter: 'A', cats: [], answers: {}, done: [], stopBy: null, review: 0, flags: {}, scores: {}, roundScores: {}, lastLetters: [], spinEnd: null };
    let grace = null, spin = null;
    const FILL = () => s.cfg.fillMs, ROUNDS = () => s.cfg.rounds;
    const players = () => api.players.map(p => p.pid);
    function newRound() {
      clearTimeout(grace); grace = null; clearTimeout(spin); spin = null;
      s.round++;
      const pool = s.cfg.letters.length ? s.cfg.letters : DEFAULT_LETTERS;
      const fresh = pool.filter(l => !s.lastLetters.includes(l));
      const L = (fresh.length ? fresh : pool)[Math.floor(Math.random() * (fresh.length ? fresh : pool).length)];
      s.lastLetters = [...s.lastLetters.slice(-4), L];
      s.letter = L; s.cats = pick(s.cfg.cats, Math.min(s.cfg.catsPerRound, s.cfg.cats.length));
      s.answers = {}; s.done = []; s.stopBy = null; s.review = 0; s.flags = {}; s.roundScores = {};
      // roleta: a TV e os celulares giram as letras e param na sorteada; só depois o tempo começa
      s.phase = 'spin'; s.spinEnd = Date.now() + SPIN_MS;
      api.clearTimer();
      api.setEvent(`Rodada ${s.round}: girando a roleta…`, null);
      spin = setTimeout(() => { startFill(); api.broadcast(); }, SPIN_MS);
    }
    function startFill() {
      clearTimeout(spin); spin = null; s.spinEnd = null;
      s.phase = 'fill';
      api.armTimer(FILL());
      api.setEvent(`Letra ${s.letter}! Preencham as ${s.cats.length} categorias.`, null);
    }
    function closeRound() {
      clearTimeout(grace); grace = null;
      api.clearTimer();
      for (const pid of players()) if (!s.answers[pid]) s.answers[pid] = {};
      s.phase = 'review'; s.review = 0;
      api.setEvent(`Conferindo: ${s.cats[0]}. Marque ❌ nas respostas que não valem.`, null);
    }
    function scoreFor(cat, pid) {
      const a = norm((s.answers[pid] || {})[cat]);
      if (a.length < MIN_LEN || a[0] !== s.letter.toLowerCase()) return 0;   // vazia ou uma letra só: zero
      const flagged = (s.flags[cat] || {})[pid] || [];
      const others = players().filter(x => x !== pid).length;
      if (others > 0 && flagged.length > others / 2) return 0;
      const same = players().filter(x => x !== pid && norm((s.answers[x] || {})[cat]) === a).length;
      return same ? 5 : 10;
    }
    function tally() {
      s.roundScores = {};
      for (const pid of players()) { s.roundScores[pid] = s.cats.reduce((t, c) => t + scoreFor(c, pid), 0); s.scores[pid] = (s.scores[pid] || 0) + s.roundScores[pid]; }
      s.phase = s.round >= ROUNDS() ? 'end' : 'scores';
      const lider = players().sort((a, b) => (s.scores[b] || 0) - (s.scores[a] || 0))[0];
      api.setEvent(s.phase === 'end' ? `Fim de jogo! ${api.byPid(lider) ? api.byPid(lider).name : ''} venceu!` : `Rodada ${s.round} fechada. Toque em "Próxima rodada".`, null);
    }
    const inst = {
      start() { s.scores = {}; s.round = 0; s.lastLetters = []; s.phase = 'setup'; api.setEvent('Ajustem as regras no celular e toquem em "Começar".', null); },
      onTimeUp() {
        if (s.phase !== 'fill') return;
        api.setEvent('⏰ Tempo! Recebendo as respostas…', null);
        grace = setTimeout(() => { closeRound(); api.broadcast(); }, 2500);
      },
      action(p, msg) {
        const me = p.pid;
        switch (msg.t) {
          case 'config': {   // qualquer jogador pode ajustar as regras antes de começar
            if (s.phase !== 'setup') return;
            const c = msg.cfg || {};
            if (c.rounds !== undefined) s.cfg.rounds = Math.max(1, Math.min(10, Number(c.rounds) || 3));
            if (c.fillSec !== undefined) s.cfg.fillMs = Math.max(20, Math.min(300, Number(c.fillSec) || 90)) * 1000;
            if (c.catsPerRound !== undefined) s.cfg.catsPerRound = Math.max(2, Math.min(10, Number(c.catsPerRound) || 6));
            if (Array.isArray(c.cats)) s.cfg.cats = [...new Set(c.cats.map(x => String(x).trim().slice(0, 30)).filter(Boolean))].slice(0, 30);
            if (Array.isArray(c.letters)) s.cfg.letters = ALL_LETTERS.filter(l => c.letters.includes(l));
            if (c.reset) s.cfg = JSON.parse(JSON.stringify(DEFAULT_CFG));
            api.setEvent(`${p.name} mudou as regras.`, p.color);
            return;
          }
          case 'begin': {
            if (s.phase !== 'setup') return;
            if (s.cfg.cats.length < 2 || s.cfg.letters.length < 1) return;
            s.scores = {}; s.round = 0; s.lastLetters = [];
            newRound();
            return;
          }
          case 'save': {   // o celular manda as respostas atuais (a cada mudança e no fim)
            if (s.phase !== 'fill') return;
            const a = {}; for (const c of s.cats) a[c] = String((msg.answers || {})[c] || '').trim().slice(0, 40);
            s.answers[me] = a;
            return;
          }
          case 'stop': {
            if (s.phase !== 'fill' || s.stopBy) return;
            const a = s.answers[me] || {};
            if (!s.cats.every(c => preenchida(a[c]))) return;
            s.stopBy = me;
            api.clearTimer();                 // o tempo para na hora
            api.setEvent(`🛑 ${p.name} gritou STOP! Conferindo…`, p.color);
            grace = setTimeout(() => { closeRound(); api.broadcast(); }, STOP_MS);
            return;
          }
          case 'flag': {   // marcar/desmarcar uma resposta como inválida
            if (s.phase !== 'review') return;
            const cat = s.cats[s.review], alvo = String(msg.pid || '');
            if (!cat || alvo === me || !api.byPid(alvo)) return;
            s.flags[cat] = s.flags[cat] || {}; s.flags[cat][alvo] = s.flags[cat][alvo] || [];
            const i = s.flags[cat][alvo].indexOf(me);
            if (i >= 0) s.flags[cat][alvo].splice(i, 1); else s.flags[cat][alvo].push(me);
            return;
          }
          case 'next': {
            if (s.phase === 'review') {
              if (s.review + 1 < s.cats.length) { s.review++; api.setEvent(`Conferindo: ${s.cats[s.review]}.`, null); }
              else tally();
            } else if (s.phase === 'scores') newRound();
            else if (s.phase === 'spin') startFill();   // pular a roleta
            return;
          }
          case 'again': if (s.phase === 'end') inst.start(); return;
        }
      },
      rekey(o, n) { if (s.answers[o]) { s.answers[n] = s.answers[o]; delete s.answers[o]; } if (s.scores[o] !== undefined) { s.scores[n] = s.scores[o]; delete s.scores[o]; } if (s.stopBy === o) s.stopBy = n; },
      onPlayerLeave() {},
      view(me) {
        const pts = {}; if (s.phase === 'review' || s.phase === 'scores' || s.phase === 'end') for (const c of s.cats) { pts[c] = {}; for (const pid of players()) pts[c][pid] = scoreFor(c, pid); }
        return {
          phase: s.phase, round: s.round, rounds: ROUNDS(), letter: s.phase === 'setup' ? null : s.letter, cats: s.cats, stopBy: s.stopBy, review: s.review,
          cfg: { ...s.cfg, fillSec: Math.round(s.cfg.fillMs / 1000) }, allLetters: ALL_LETTERS, defaultCats: DEFAULT_CATS, spinEnd: s.spinEnd, spinMs: SPIN_MS,
          turnMs: s.stopBy ? STOP_MS : FILL(), scores: s.scores, roundScores: s.roundScores, flags: s.flags, points: pts,
          answers: s.phase === 'fill' ? (me ? { [me.pid]: s.answers[me.pid] || {} } : {}) : s.answers,
          filled: players().map(pid => ({ pid, n: s.cats.filter(c => preenchida((s.answers[pid] || {})[c])).length })),
        };
      },
      serialize: () => ({ s }),
      restore(d) { if (d && d.s) { s = { ...s, ...d.s }; s.cfg = { ...JSON.parse(JSON.stringify(DEFAULT_CFG)), ...(s.cfg || {}) }; if (s.phase === 'spin') startFill(); else if (s.phase === 'fill' && !api.timerEnd) api.armTimer(FILL()); } },
    };
    return inst;
  },
};
