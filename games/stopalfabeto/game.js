// Stop Alfabeto. Uma categoria, o alfabeto na TV e pouco tempo para pensar.
// Cada um fala em voz alta uma palavra da categoria e aperta a letra dela no celular.
// Quem não responde a tempo perde uma vida. Sem vidas, está fora. Sobrou um, venceu.
const ALL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const DEFAULT_LETTERS = ALL_LETTERS.filter(l => !'KWY'.includes(l));
const DEFAULT_CATS = [
  'Animal', 'Comida', 'Cidade', 'Filme', 'Objeto', 'Profissão', 'Marca', 'Personagem',
  'Coisa de cozinha', 'Time de futebol', 'Cantor ou banda', 'Nome de pessoa', 'Fruta',
  'País', 'Série', 'Youtuber', 'Parte do corpo', 'Cor',
];
const CONTEST_MS = Number(process.env.SA_CONTEST_MS) || 8000;   // janela para contestar a última letra
const VOTE_MS = Number(process.env.SA_VOTE_MS) || 15000;        // tempo da votação
const TURN_SECS = [3, 5, 8, 10, 15];
const LIVES_OPTS = [1, 2, 3, 5];
const DEFAULT_CFG = { turnSec: 5, lives: 3, cats: DEFAULT_CATS.slice(), letters: DEFAULT_LETTERS.slice() };
const clone = o => JSON.parse(JSON.stringify(o));

module.exports = {
  meta: {
    id: 'stopalfabeto', name: 'Stop Alfabeto', emoji: '🔤',
    tagline: 'Uma categoria, o alfabeto inteiro e 5 segundos para pensar.',
    art: 'linear-gradient(135deg,#f59e0b 0%,#d946ef 55%,#312e81 100%)',
    minPlayers: 2, maxPlayers: 8,
    howTo: [
      'A TV mostra uma categoria e todas as letras livres.',
      'Na sua vez, fale uma palavra da categoria e aperte a letra dela.',
      'Demorou? Perde uma vida. Sem vidas, você está fora.',
      'Achou que a palavra não vale? Aperte Contestar e todo mundo vota.',
      'Acabaram as letras, entra uma categoria nova. Sobrou um, venceu.',
    ],
  },
  create(api) {
    let s = {
      phase: 'setup',                 // setup | play | vote | end
      cfg: clone(DEFAULT_CFG),
      order: [], ti: 0,               // ordem de jogo (pids) e índice da vez
      lives: {}, out: [],             // vidas por pid e eliminados (na ordem em que caíram)
      cat: null, usedCats: [], round: 0,
      used: {},                       // letra -> pid de quem usou nesta categoria
      last: null,                     // { pid, letter, at } — jogada que ainda dá para contestar
      vote: null,                     // { target, by, letter, votes:{pid:bool} }
      winner: null,
      fx: null, fxId: 0,              // último efeito para as telas animarem
    };
    const turnMs = () => s.cfg.turnSec * 1000;
    const alive = pid => !!api.byPid(pid) && (s.lives[pid] || 0) > 0;
    const alives = () => s.order.filter(alive);
    const cur = () => s.order[s.ti] || null;
    const lettersLeft = () => s.cfg.letters.filter(l => !s.used[l]);
    const fx = (k, extra) => { s.fx = { id: ++s.fxId, k, ...(extra || {}) }; };
    const nameOf = pid => { const p = api.byPid(pid); return p ? p.name : 'Alguém'; };
    const colorOf = pid => { const p = api.byPid(pid); return p ? p.color : null; };

    function advance() {                                   // passa a vez para o próximo vivo
      for (let i = 1; i <= s.order.length; i++) {
        const j = (s.ti + i) % s.order.length;
        if (alive(s.order[j])) { s.ti = j; return true; }
      }
      return alive(cur());
    }
    function newCat() {                                    // categoria nova, alfabeto liberado
      const left = s.cfg.cats.filter(c => !s.usedCats.includes(c));
      const pool = left.length ? left : s.cfg.cats;
      if (!left.length) s.usedCats = [];
      s.cat = pool[Math.floor(Math.random() * pool.length)];
      s.usedCats.push(s.cat);
      s.used = {}; s.last = null; s.round++;
      fx('newcat', { cat: s.cat });
    }
    function finish(pid) {
      api.clearTimer();
      s.phase = 'end'; s.winner = pid || null; s.vote = null; s.last = null;
      fx('win', { pid: pid || null });
      api.setEvent(pid ? `🏆 ${nameOf(pid)} venceu o Stop Alfabeto!` : 'Fim de jogo.', pid ? colorOf(pid) : null);
    }
    function startTurn() {                                 // arma o relógio da vez (ou termina o jogo)
      const list = alives();
      if (list.length === 0) { api.clearTimer(); s.phase = 'setup'; s.vote = null; s.last = null; return; }
      if (list.length === 1) return finish(list[0]);
      if (!alive(cur())) advance();
      if (!lettersLeft().length) newCat();
      s.phase = 'play';
      api.armTimer(turnMs());
    }
    function loseLife(pid, why) {
      if (!alive(pid)) return;
      s.lives[pid] = Math.max(0, (s.lives[pid] || 0) - 1);
      if (s.lives[pid] <= 0) {
        if (!s.out.includes(pid)) s.out.push(pid);
        fx('out', { pid, why });
        api.setEvent(`💀 ${nameOf(pid)} está fora!`, colorOf(pid));
      } else {
        fx('life', { pid, why });
        api.addEvent(`💔 ${s.lives[pid]} vida${s.lives[pid] > 1 ? 's' : ''}.`);
      }
    }
    function voters() { return api.players.filter(p => !s.vote || p.pid !== s.vote.target).map(p => p.pid); }
    function checkVote() {
      if (!s.vote) return;
      const vs = voters();
      if (vs.length && vs.every(pid => s.vote.votes[pid] !== undefined)) resolveVote();
    }
    function resolveVote() {
      const v = s.vote; if (!v) return;
      api.clearTimer();
      const vals = voters().map(pid => v.votes[pid]).filter(x => x !== undefined);
      const nao = vals.filter(x => x === false).length, sim = vals.filter(x => x === true).length;
      s.vote = null; s.last = null; s.phase = 'play';
      if (nao > sim) {                                     // empate = vale; maioria "não vale" derruba
        delete s.used[v.letter];
        api.setEvent(`❌ Não valeu! O ${v.letter} voltou e ${nameOf(v.target)} perdeu uma vida.`, colorOf(v.target));
        loseLife(v.target, 'contest');
      } else {
        fx('valid', { letter: v.letter, pid: v.target });
        api.setEvent(`✅ Valeu! O ${v.letter} de ${nameOf(v.target)} continua de pé.`, colorOf(v.target));
      }
      startTurn();
    }

    const inst = {
      start() {
        s.phase = 'setup'; s.order = []; s.out = []; s.lives = {}; s.used = {}; s.usedCats = [];
        s.cat = null; s.round = 0; s.last = null; s.vote = null; s.winner = null; s.ti = 0;
        api.clearTimer();
        api.setEvent('Ajustem as regras no celular e toquem em "Começar".', null);
      },
      onTimeUp() {
        if (s.phase === 'vote') return resolveVote();
        if (s.phase !== 'play') return;
        const pid = cur();
        s.last = null;                                     // fechou a janela de contestação
        api.setEvent(`⏰ Tempo! ${nameOf(pid)} não respondeu.`, colorOf(pid));
        loseLife(pid, 'time');
        advance();
        startTurn();
      },
      action(p, msg) {
        switch (msg.t) {
          case 'config': {                                 // qualquer um ajusta as regras antes de começar
            if (s.phase !== 'setup') return;
            const c = msg.cfg || {};
            if (c.turnSec !== undefined) s.cfg.turnSec = TURN_SECS.includes(Number(c.turnSec)) ? Number(c.turnSec) : s.cfg.turnSec;
            if (c.lives !== undefined) s.cfg.lives = LIVES_OPTS.includes(Number(c.lives)) ? Number(c.lives) : s.cfg.lives;
            if (Array.isArray(c.cats)) s.cfg.cats = [...new Set(c.cats.map(x => String(x).trim().slice(0, 30)).filter(Boolean))].slice(0, 40);
            if (Array.isArray(c.letters)) s.cfg.letters = ALL_LETTERS.filter(l => c.letters.includes(l));
            if (c.reset) s.cfg = clone(DEFAULT_CFG);
            api.setEvent(`${p.name} mudou as regras.`, p.color);
            return;
          }
          case 'begin': {
            if (s.phase !== 'setup') return;
            if (s.cfg.cats.length < 1 || s.cfg.letters.length < 2) return;
            s.order = api.players.map(x => x.pid);
            if (s.order.length < 2) return;
            s.lives = {}; for (const pid of s.order) s.lives[pid] = s.cfg.lives;
            s.out = []; s.usedCats = []; s.used = {}; s.round = 0; s.ti = 0;
            s.last = null; s.vote = null; s.winner = null;
            newCat();
            startTurn();
            api.setEvent(`${s.cat}! Vez de ${nameOf(cur())}.`, colorOf(cur()));
            return;
          }
          case 'letter': {                                 // só o jogador da vez, só letra livre
            if (s.phase !== 'play' || p.pid !== cur()) return;
            const L = String(msg.l || '').toUpperCase();
            if (!s.cfg.letters.includes(L) || s.used[L]) return;
            s.used[L] = p.pid;
            s.last = { pid: p.pid, letter: L, at: Date.now() };
            fx('letter', { pid: p.pid, letter: L });
            api.setEvent(`${p.name} usou o ${L}.`, p.color);
            advance();
            startTurn();
            return;
          }
          case 'contest': {
            if (s.phase !== 'play' || !s.last) return;
            if (p.pid === s.last.pid || Date.now() - s.last.at > CONTEST_MS) return;
            s.vote = { target: s.last.pid, by: p.pid, letter: s.last.letter, votes: { [p.pid]: false } };
            s.phase = 'vote';
            api.clearTimer(); api.armTimer(VOTE_MS);
            fx('contest', { pid: p.pid, letter: s.vote.letter });
            api.setEvent(`🚨 ${p.name} contestou o ${s.vote.letter} de ${nameOf(s.vote.target)}. Vale ou não vale?`, p.color);
            checkVote();
            return;
          }
          case 'vote': {
            if (s.phase !== 'vote' || !s.vote || p.pid === s.vote.target) return;
            s.vote.votes[p.pid] = !!msg.ok;
            checkVote();
            return;
          }
          case 'again': if (s.phase === 'end') inst.start(); return;
        }
      },
      rekey(o, n) {
        s.order = s.order.map(x => (x === o ? n : x));
        s.out = s.out.map(x => (x === o ? n : x));
        if (s.lives[o] !== undefined) { s.lives[n] = s.lives[o]; delete s.lives[o]; }
        for (const L of Object.keys(s.used)) if (s.used[L] === o) s.used[L] = n;
        if (s.last && s.last.pid === o) s.last.pid = n;
        if (s.winner === o) s.winner = n;
        if (s.fx && s.fx.pid === o) s.fx.pid = n;
        if (s.vote) {
          if (s.vote.target === o) s.vote.target = n;
          if (s.vote.by === o) s.vote.by = n;
          if (s.vote.votes[o] !== undefined) { s.vote.votes[n] = s.vote.votes[o]; delete s.vote.votes[o]; }
        }
      },
      onPlayerLeave(pid) {
        if (s.phase === 'setup' || s.phase === 'end') { s.order = s.order.filter(x => x !== pid); return; }
        if (s.vote) {
          delete s.vote.votes[pid];
          if (s.vote.target === pid) { s.vote = null; s.last = null; s.phase = 'play'; return startTurn(); }
        }
        const wasCur = cur() === pid;
        if (alives().length <= 1) return startTurn();      // vira vitória (ou volta ao setup se ninguém sobrou)
        if (wasCur) { advance(); startTurn(); }
        else if (s.vote) checkVote();
      },
      view() {
        const now = Date.now();
        return {
          phase: s.phase, cat: s.cat, round: s.round,
          cfg: { ...s.cfg }, allLetters: ALL_LETTERS, defaultCats: DEFAULT_CATS,
          turnSecs: TURN_SECS, livesOpts: LIVES_OPTS,
          order: s.order.filter(pid => !!api.byPid(pid)),
          cur: s.phase === 'play' || s.phase === 'vote' ? cur() : null,
          next: (() => { for (let i = 1; i <= s.order.length; i++) { const j = (s.ti + i) % s.order.length; if (alive(s.order[j]) && s.order[j] !== cur()) return s.order[j]; } return null; })(),
          lives: s.lives, out: s.out, maxLives: s.cfg.lives,
          used: s.used, letters: s.cfg.letters, left: lettersLeft().length,
          last: s.last ? { pid: s.last.pid, letter: s.last.letter } : null,
          contestUntil: s.last ? s.last.at + CONTEST_MS : null,
          vote: s.vote ? { target: s.vote.target, by: s.vote.by, letter: s.vote.letter, votes: s.vote.votes, voters: voters() } : null,
          winner: s.winner, fx: s.fx, turnMs: s.phase === 'vote' ? VOTE_MS : turnMs(), now,
          catsLeft: s.cfg.cats.filter(c => !s.usedCats.includes(c)).length,
        };
      },
      serialize: () => ({ s }),
      restore(d) {
        if (!d || !d.s) return;
        s = { ...s, ...d.s };
        s.cfg = { ...clone(DEFAULT_CFG), ...(s.cfg || {}) };
        // voltou no meio de uma vez (ou de uma votação): o relógio precisa andar de novo
        if ((s.phase === 'play' || s.phase === 'vote') && !api.timerEnd) api.armTimer(s.phase === 'vote' ? VOTE_MS : turnMs());
      },
    };
    return inst;
  },
};
