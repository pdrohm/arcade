// Palavra Secreta (o jogo do impostor). Todo mundo recebe a mesma palavra no celular,
// menos o(s) impostor(es). Uma dica por vez, discussão, votação e revelação na TV.
// A palavra só aparece na TV na hora do resultado.
const { CATEGORIES, WORDS, PAIRS } = require('./words');

const TIE_MS = 30 * 1000;                       // discussão curta depois de um empate
const CLUE_MAX = 20;
const DEFAULT_CFG = { impostors: 1, hint: true, white: false, discussSec: 90, rounds: 5, laps: 1, cats: CATEGORIES.map(c => c.id) };

const norm = s => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '');
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const catName = id => (CATEGORIES.find(c => c.id === id) || {}).name || '';

module.exports = {
  meta: {
    id: 'palavrasecreta', name: 'Palavra Secreta', emoji: '🕵️‍♂️',
    tagline: 'Todo mundo sabe a palavra. Menos o impostor. Descubra quem é.',
    art: 'linear-gradient(135deg,#0ea5e9 0%,#1e3a8a 60%,#020617 100%)',
    minPlayers: 3, maxPlayers: 8,
    howTo: [
      'Todos recebem a mesma palavra no celular. O impostor, não.',
      'Cada um fala UMA palavra de dica, na ordem da TV.',
      'Discutam e votem em quem parece o impostor.',
      'Acertou o impostor? Os inocentes pontuam.',
      'O impostor eliminado ainda pode adivinhar a palavra.',
    ],
  },
  create(api) {
    let s = {
      phase: 'setup', cfg: JSON.parse(JSON.stringify(DEFAULT_CFG)), round: 0,
      cat: null, word: '', white: '', impostors: [], seen: [],
      order: [], clues: {}, turn: 0, discussMs: 90000,
      endVotes: [], votes: {}, revote: 0, out: [], result: null, guess: null,
      scores: {}, used: [],
    };

    const pids = () => api.players.map(p => p.pid);
    const alive = () => pids().filter(x => !s.out.includes(x));
    const online = pid => { const p = api.byPid(pid); return !!p && p.on !== false; };
    const isImp = pid => s.impostors.includes(pid);
    const impAlive = () => alive().filter(isImp);
    const innAlive = () => alive().filter(x => !isImp(x));
    const nameOf = pid => { const p = api.byPid(pid); return p ? p.name : 'Alguém'; };
    const nImp = () => (s.cfg.impostors === 2 && api.players.length >= 6) ? 2 : 1;
    const revealed = () => ['guess', 'scores', 'end'].includes(s.phase) || (s.phase === 'result' && !!s.result && !!s.result.over);   // a palavra só sai quando a rodada acaba
    const maioria = n => Math.floor(n / 2) + 1;

    // ---------- rodada ----------
    function newRound() {
      s.round++;
      const cats = s.cfg.cats.filter(id => (WORDS[id] || []).length);
      const cid = cats.length ? cats[Math.floor(Math.random() * cats.length)] : CATEGORIES[0].id;
      s.cat = cid;
      if (s.cfg.white) {                                  // Mister White: o impostor recebe uma palavra parecida
        let pool = (PAIRS[cid] || []).filter(p => !s.used.includes(p[0]));
        if (!pool.length) { s.used = []; pool = PAIRS[cid] || []; }
        const pr = pool[Math.floor(Math.random() * pool.length)] || [WORDS[cid][0], WORDS[cid][1]];
        s.word = pr[0]; s.white = pr[1];
      } else {
        let pool = (WORDS[cid] || []).filter(w => !s.used.includes(w));
        if (!pool.length) { s.used = []; pool = WORDS[cid] || []; }
        s.word = pool[Math.floor(Math.random() * pool.length)] || 'Pizza'; s.white = '';
      }
      s.used.push(s.word); if (s.used.length > 300) s.used.shift();
      s.impostors = shuffle(pids()).slice(0, Math.min(nImp(), Math.max(1, api.players.length - 2)));
      const ord = shuffle(pids());                        // a ordem é sorteada, mas quem fala primeiro é inocente
      const i = ord.findIndex(x => !isImp(x));
      if (i > 0) { const t = ord[0]; ord[0] = ord[i]; ord[i] = t; }
      s.order = ord; s.clues = {}; s.turn = 0; s.seen = [];
      s.votes = {}; s.endVotes = []; s.revote = 0; s.out = []; s.result = null; s.guess = null; s.gain = {}; s.needGuess = false;
      s.phase = 'reveal';
      api.clearTimer();
      api.setEvent(`Rodada ${s.round} de ${s.cfg.rounds}. Cada um vê a própria palavra no celular.`);
    }
    function startClues() {
      s.phase = 'clues'; s.turn = 0;
      api.clearTimer();
      api.setEvent(`Ordem sorteada! ${nameOf(s.order[0])} começa: uma palavra de dica.`, (api.byPid(s.order[0]) || {}).color);
    }
    const totalTurns = () => s.order.length * Math.max(1, s.cfg.laps);
    const speaker = () => (s.phase === 'clues' && s.turn < totalTurns()) ? s.order[s.turn % s.order.length] : null;
    function nextTurn() {
      s.turn++;
      if (s.turn >= totalTurns()) return startDiscuss(s.cfg.discussSec * 1000);
      api.setEvent(`Vez de ${nameOf(speaker())}: uma palavra de dica.`, (api.byPid(speaker()) || {}).color);
    }
    function startDiscuss(ms) {
      s.phase = 'discuss'; s.endVotes = []; s.votes = {}; s.discussMs = ms;
      api.armTimer(ms);
      api.setEvent(s.revote ? 'Empate! Mais 30 segundos e votem de novo.' : 'Discutam! Quem é o impostor?');
    }
    function startVote() {
      s.phase = 'vote'; s.votes = {};
      api.clearTimer();
      api.setEvent('Votação! Cada um aponta um suspeito no celular.');
    }
    function tally() {
      const cnt = {};
      for (const [who, alvo] of Object.entries(s.votes)) if (alive().includes(who) && alive().includes(alvo)) cnt[alvo] = (cnt[alvo] || 0) + 1;
      const max = Math.max(0, ...Object.values(cnt));
      const tops = Object.keys(cnt).filter(k => cnt[k] === max);
      api.clearTimer();
      s.phase = 'result';
      if (!max || tops.length !== 1) {                    // ninguém votou ou deu empate
        s.result = { tie: true, tops, count: cnt, out: null, wasImp: false, over: s.revote >= 1, winner: s.revote >= 1 ? 'impostores' : null };
        api.setEvent(s.revote >= 1 ? 'Empate de novo! O impostor escapou.' : 'Empate! Ninguém foi eliminado.');
        if (s.result.over) return finish('impostores');
        return;
      }
      const alvo = tops[0];
      s.out.push(alvo);
      const wasImp = isImp(alvo);
      const fim = wasImp ? !impAlive().length : (s.impostors.length === 1 || impAlive().length >= innAlive().length);
      s.result = { tie: false, tops, count: cnt, out: alvo, wasImp, over: fim, winner: fim ? (wasImp ? 'inocentes' : 'impostores') : null };
      api.setEvent(`${nameOf(alvo)} foi eliminado… e ${wasImp ? 'ERA o impostor!' : 'não era o impostor.'}`, (api.byPid(alvo) || {}).color);
      if (fim) finish(wasImp ? 'inocentes' : 'impostores');
    }
    function finish(winner) {                             // pontos da rodada
      s.result = { ...(s.result || {}), over: true, winner };
      const gain = {};
      if (winner === 'inocentes') for (const pid of pids()) { if (!isImp(pid)) gain[pid] = 1; }
      else for (const pid of s.impostors) gain[pid] = 2;
      for (const [pid, g] of Object.entries(gain)) s.scores[pid] = (s.scores[pid] || 0) + g;
      s.gain = gain;
      // se os inocentes pegaram o impostor, ele ainda tenta adivinhar a palavra
      s.needGuess = winner === 'inocentes' && s.impostors.some(p => api.byPid(p));
    }
    function toScores() {
      s.phase = s.round >= s.cfg.rounds ? 'end' : 'scores';
      const top = pids().sort((a, b) => (s.scores[b] || 0) - (s.scores[a] || 0))[0];
      api.clearTimer();
      api.setEvent(s.phase === 'end' ? `Fim de jogo! ${nameOf(top)} venceu com ${s.scores[top] || 0} pontos.` : 'Toque em "Próxima palavra" para continuar.');
    }
    function abortRound(why) {                            // o impostor saiu no meio: revela e segue
      if (!['reveal', 'clues', 'discuss', 'vote'].includes(s.phase)) return;
      api.clearTimer();
      s.phase = 'result';
      s.result = { tie: false, tops: [], count: {}, out: null, wasImp: false, over: true, winner: null, aborted: true };
      s.gain = {}; s.needGuess = false;
      api.setEvent(why || 'A rodada acabou sem vencedor.');
    }

    const inst = {
      start() {
        s.scores = {}; s.round = 0; s.used = []; s.phase = 'setup'; s.result = null;
        api.clearTimer();
        api.setEvent('Ajustem as regras no celular e toquem em "Começar".');
      },
      onTimeUp() {
        if (s.phase === 'discuss') { startVote(); }
      },
      action(p, msg) {
        const me = p.pid;
        switch (msg.t) {
          case 'config': {                                // qualquer jogador muda as regras antes de começar
            if (s.phase !== 'setup') return;
            const c = msg.cfg || {};
            if (c.impostors !== undefined) s.cfg.impostors = Number(c.impostors) === 2 ? 2 : 1;
            if (c.hint !== undefined) s.cfg.hint = !!c.hint;
            if (c.white !== undefined) s.cfg.white = !!c.white;
            if (c.discussSec !== undefined) s.cfg.discussSec = [60, 90, 120, 180].includes(Number(c.discussSec)) ? Number(c.discussSec) : 90;
            if (c.rounds !== undefined) s.cfg.rounds = [3, 5, 8, 10].includes(Number(c.rounds)) ? Number(c.rounds) : 5;
            if (c.laps !== undefined) s.cfg.laps = Number(c.laps) === 2 ? 2 : 1;
            if (Array.isArray(c.cats)) { const ok = CATEGORIES.map(x => x.id).filter(id => c.cats.includes(id)); if (ok.length) s.cfg.cats = ok; }
            if (c.reset) s.cfg = JSON.parse(JSON.stringify(DEFAULT_CFG));
            api.setEvent(`${p.name} mudou as regras.`, p.color);
            return;
          }
          case 'begin': {
            if (s.phase !== 'setup') return;
            if (api.players.length < 3) return;
            s.scores = {}; s.round = 0; s.used = [];
            newRound();
            return;
          }
          case 'seen': {                                  // "já vi minha palavra"
            if (s.phase !== 'reveal') return;
            if (!s.seen.includes(me)) s.seen.push(me);
            const faltam = pids().filter(x => !s.seen.includes(x) && online(x));
            if (!faltam.length) startClues();
            return;
          }
          case 'clue': {
            if (s.phase !== 'clues' || speaker() !== me) return;
            const txt = String(msg.text || '').trim().replace(/\s+/g, ' ').slice(0, CLUE_MAX);
            if (!txt || /\s/.test(txt)) return api.setEvent('A dica é UMA palavra só, sem espaço.', p.color);
            if (norm(txt) === norm(s.word) || (s.white && norm(txt) === norm(s.white))) return api.setEvent(`${p.name} tentou uma dica que não vale. Escolha outra palavra!`, p.color);
            const ditas = Object.values(s.clues).flat().map(norm);
            if (ditas.includes(norm(txt))) return api.setEvent('Essa dica já foi dita. Escolha outra!', p.color);
            (s.clues[me] = s.clues[me] || []).push(txt);
            nextTurn();
            return;
          }
          case 'skip': {                                  // pular quem está offline
            if (s.phase !== 'clues') return;
            const sp = speaker();
            if (!sp || online(sp)) return;
            (s.clues[sp] = s.clues[sp] || []).push('—');
            api.setEvent(`${nameOf(sp)} está sem conexão: vez pulada.`);
            nextTurn();
            return;
          }
          case 'endnow': {                                // "votar agora": metade + 1 encerra a discussão
            if (s.phase !== 'discuss') return;
            const i = s.endVotes.indexOf(me);
            if (i >= 0) s.endVotes.splice(i, 1); else s.endVotes.push(me);
            if (s.endVotes.filter(x => alive().includes(x)).length >= maioria(alive().length)) startVote();
            return;
          }
          case 'vote': {
            if (s.phase !== 'vote' || s.out.includes(me)) return;
            const alvo = String(msg.pid || '');
            if (alvo === me || !alive().includes(alvo)) return;
            s.votes[me] = alvo;
            const faltam = alive().filter(x => !s.votes[x] && online(x));
            if (!faltam.length) tally();
            return;
          }
          case 'closevote': {                             // fecha com a maioria já votada (ninguém trava a sala)
            if (s.phase !== 'vote') return;
            if (Object.keys(s.votes).filter(x => alive().includes(x)).length < maioria(alive().length)) return;
            tally();
            return;
          }
          case 'guess': {                                 // chance final do impostor
            if (s.phase !== 'guess' || !isImp(me) || s.guess) return;
            const txt = String(msg.text || '').trim().slice(0, 40);
            if (!txt) return;
            const ok = norm(txt) === norm(s.word);
            s.guess = { pid: me, text: txt, ok };
            if (ok) s.scores[me] = (s.scores[me] || 0) + 1;
            api.setEvent(ok ? `${p.name} adivinhou a palavra: ${s.word}! +1 ponto.` : `${p.name} chutou "${txt}" e errou. A palavra era ${s.word}.`, p.color);
            toScores();
            return;
          }
          case 'next': {
            if (s.phase === 'result') {
              if (s.result && s.result.aborted) { toScores(); return; }
              if (s.result && !s.result.over) {           // empate sem eliminar, ou ainda sobrou impostor
                if (s.result.tie) { s.revote = 1; return startDiscuss(TIE_MS); }
                s.revote = 0; return startDiscuss(Math.max(30, Math.round(s.cfg.discussSec / 2)) * 1000);
              }
              if (s.needGuess) { s.phase = 'guess'; api.clearTimer(); api.setEvent('O impostor foi pego! Ele ainda pode adivinhar a palavra.'); return; }
              return toScores();
            }
            if (s.phase === 'guess') { s.guess = s.guess || { pid: null, text: '', ok: false }; return toScores(); }
            if (s.phase === 'scores') return newRound();
            return;
          }
          case 'again': if (s.phase === 'end') inst.start(); return;
        }
      },
      rekey(o, n) {
        const sw = obj => { if (obj[o] !== undefined) { obj[n] = obj[o]; delete obj[o]; } };
        sw(s.clues); sw(s.scores); sw(s.votes);
        for (const k of Object.keys(s.votes)) if (s.votes[k] === o) s.votes[k] = n;
        const rep = arr => arr.map(x => x === o ? n : x);
        s.impostors = rep(s.impostors); s.seen = rep(s.seen); s.order = rep(s.order);
        s.endVotes = rep(s.endVotes); s.out = rep(s.out);
        if (s.result) { if (s.result.out === o) s.result.out = n; if (s.result.tops) s.result.tops = rep(s.result.tops); }
        if (s.guess && s.guess.pid === o) s.guess.pid = n;
      },
      onPlayerLeave(pid) {
        const era = isImp(pid);
        s.impostors = s.impostors.filter(x => x !== pid);
        s.seen = s.seen.filter(x => x !== pid);
        s.order = s.order.filter(x => x !== pid);
        s.endVotes = s.endVotes.filter(x => x !== pid);
        s.out = s.out.filter(x => x !== pid);
        delete s.clues[pid]; delete s.votes[pid];
        for (const k of Object.keys(s.votes)) if (s.votes[k] === pid) delete s.votes[k];
        if (api.players.length < 3) {                     // sem gente suficiente: volta para o menu
          if (s.phase !== 'setup') { api.clearTimer(); s.phase = 'setup'; api.setEvent('Ficamos com menos de 3 jogadores. Ajustem as regras e comecem de novo.'); }
          return;
        }
        if (era) return abortRound('O impostor saiu da sala! Rodada encerrada.');
        if (s.turn >= totalTurns() && s.phase === 'clues') startDiscuss(s.cfg.discussSec * 1000);
      },
      view(me) {
        const rev = revealed();
        const out = {
          phase: s.phase, round: s.round, rounds: s.cfg.rounds,
          cfg: { ...s.cfg, impostorsReal: nImp() },
          cats: CATEGORIES,
          cat: (s.cfg.hint || rev) && s.phase !== 'setup' ? { id: s.cat, name: catName(s.cat), emoji: (CATEGORIES.find(c => c.id === s.cat) || {}).emoji } : null,
          seen: s.seen, order: s.order, clues: s.clues, turn: s.turn, laps: s.cfg.laps,
          speaker: speaker(), totalTurns: totalTurns(),
          endVotes: s.endVotes, voted: Object.keys(s.votes).filter(x => alive().includes(x)),
          out: s.out, revote: s.revote, result: s.result, guess: s.guess,
          needGuess: !!s.needGuess, gain: s.gain || {}, scores: s.scores,
          turnMs: s.discussMs, alive: alive(),
          word: rev ? s.word : null,                       // a TV só vê a palavra no resultado
          whiteWord: rev && s.cfg.white ? s.white : null,
          impostors: rev ? s.impostors : null,
          nAlive: alive().length, need: maioria(alive().length),
        };
        if (me) {                                          // parte privada: só o dono vê
          const imp = isImp(me.pid);
          out.mine = s.phase === 'setup' ? null : {
            impostor: imp && !s.cfg.white,
            word: imp ? (s.cfg.white ? s.white : '') : s.word,
            hint: imp && !s.cfg.white && s.cfg.hint ? catName(s.cat) : '',
            seen: s.seen.includes(me.pid), out: s.out.includes(me.pid),
            myClue: (s.clues[me.pid] || []).length, myVote: s.votes[me.pid] || null,
            endVoted: s.endVotes.includes(me.pid), canGuess: s.phase === 'guess' && imp && !s.guess,
          };
        }
        return out;
      },
      serialize: () => ({ s }),
      restore(d) {
        if (!d || !d.s) return;
        s = { ...s, ...d.s };
        s.cfg = { ...JSON.parse(JSON.stringify(DEFAULT_CFG)), ...(s.cfg || {}) };
        if (s.phase === 'discuss' && !api.timerEnd) api.armTimer(s.discussMs || 60000);
      },
    };
    return inst;
  },
};
