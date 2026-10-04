// Palavra Secreta (estilo Mega Senha) — em times: um vê a palavra e dá dicas em voz alta,
// o colega adivinha em voz alta. Acerto vale 1.
// Os outros celulares também veem a palavra; quem adivinha e a TV nunca recebem.
const { CATS, WORDS } = require('./words');

const KIND = 'megasenha';                       // marcador do estado salvo (ignora estado de outro jogo)
const RESULT_MS = Number(process.env.PS_RESULT_MS) || 6000;   // tela de fim de vez antes do próximo time
const TEAM_COLORS = ['#22d3ee', '#f472b6', '#facc15', '#a3e635'];
const TEAM_OPTS = [2, 3, 4];
const MODES = [{ id: 'times', name: '👥 Times' }, { id: 'todos', name: '🙌 Todos com todos' }];
const ROUND_OPTS = [3, 5, 8, 10];
const TIME_OPTS = process.env.PS_TIME_OPTS ? process.env.PS_TIME_OPTS.split(',').map(Number) : [30, 45, 60, 90, 120];
const DIFFS = [
  { id: 'facil', name: 'Fácil', ds: [1] },
  { id: 'medio', name: 'Médio', ds: [2] },
  { id: 'dificil', name: 'Difícil', ds: [3] },
  { id: 'misto', name: 'Misto', ds: [1, 2, 3] },
];
const CAT_IDS = CATS.filter(c => c.id !== 'aleatorio').map(c => c.id);
const defCfg = () => ({ mode: 'times', teams: 2, auto: true, rounds: 5, turnSec: 60, diff: 'misto', cats: CAT_IDS.slice(), pass: true });
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

module.exports = {
  meta: {
    id: 'palavrasecreta', name: 'Palavra Secreta', emoji: '🗝️',
    tagline: 'Dê dicas e faça seu time descobrir o máximo de palavras.',
    art: 'linear-gradient(135deg,#14b8a6 0%,#0f766e 55%,#042f2e 100%)',
    minPlayers: 4, maxPlayers: 8,
    howTo: [
      'Formem times de 2 ou mais. Cada time joga uma vez por rodada.',
      'Um jogador vê a palavra no celular e dá dicas falando. Não pode dizer a palavra.',
      'Todo mundo vê a palavra no celular, menos quem adivinha. Quem não está dando dicas fica quieto!',
      'O colega da vez adivinha em voz alta. Acertou? Toque em ACERTOU e vem outra palavra.',
      'Travou? Toque em PASSAR (se estiver liberado). Passar não tira ponto.',
      'Cada acerto vale 1. Quem somar mais pontos no fim das rodadas vence.',
      'Modo Todos com todos: sem times. Na sua vez você dá dicas para todo mundo; quem acertar primeiro ganha 1 ponto e você também.',
    ],
  },

  create(api) {
    let s = {
      kind: KIND,
      phase: 'setup',            // setup | ready | play | result | end
      cfg: defCfg(),
      teams: [],                 // [{ players:[pid], score }]
      order: [], scores: {},     // modo 'todos': ordem de quem dá as dicas e pontos de cada um
      round: 1, turn: 0,
      clue: null, guess: null,   // pid de quem dá as dicas / de quem adivinha
      clueN: {}, guessN: {},     // quantas vezes cada pid já fez cada papel
      word: null,                // { w, cat, d } — só vai para o celular de quem dá as dicas
      used: [],                  // palavras já usadas na partida
      turnWords: [], hits: 0,
      last: null,                // { team, hits, words } da última vez
    };
    let resT = null;

    const nameOf = pid => { const p = api.byPid(pid); return p ? p.name : 'Alguém'; };
    const teamOf = pid => s.teams.findIndex(t => t.players.includes(pid));
    const cur = () => s.teams[s.turn] || null;
    const clearRes = () => { clearTimeout(resT); resT = null; };
    const alive = t => t.players.filter(pid => api.byPid(pid));
    const todos = () => s.cfg.mode === 'todos';
    const ranking = () => {
      const pids = [...new Set([...s.order, ...Object.keys(s.scores)])].filter(pid => api.byPid(pid));
      return pids.map(pid => ({ pid, score: s.scores[pid] || 0 })).sort((a, b) => b.score - a.score);
    };

    function ensureTeams(n) {
      s.teams = Array.from({ length: n }, (_, i) => s.teams[i] || { players: [], score: 0 });
      s.teams.length = n;
      for (const t of s.teams) t.players = t.players.filter(pid => api.byPid(pid));
    }
    function autoTeams() {   // sorteio equilibrado: embaralha e distribui em zigue-zague
      const n = s.cfg.teams;
      s.teams = Array.from({ length: n }, () => ({ players: [], score: 0 }));
      shuffle(api.players.map(p => p.pid)).forEach((pid, i) => s.teams[i % n].players.push(pid));
    }
    function canBegin() {
      if (todos()) return api.players.length >= 3;
      if (s.cfg.auto) return api.players.length >= 2 * s.cfg.teams;
      const inTeam = s.teams.reduce((a, t) => a + t.players.length, 0);
      return s.teams.length >= 2 && inTeam === api.players.length && s.teams.every(t => t.players.length >= 2);
    }

    // ---------- sorteio de palavras ----------
    function pool() {
      const ds = (DIFFS.find(d => d.id === s.cfg.diff) || DIFFS[3]).ds;
      const cats = s.cfg.cats.length ? s.cfg.cats : CAT_IDS;
      return WORDS.filter(w => ds.includes(w.d) && cats.includes(w.cat));
    }
    function drawWord() {
      const p = pool();
      if (!p.length) { s.word = null; return; }
      let fresh = p.filter(w => !s.used.includes(w.w));
      if (!fresh.length) { s.used = []; fresh = p; }                    // acabou o pool: libera tudo
      s.word = fresh[Math.floor(Math.random() * fresh.length)];
      s.used.push(s.word.w);
    }

    // ---------- papéis (rodam para todo mundo jogar o mesmo tanto) ----------
    // menos vezes neste papel ganha; empate vai para quem menos jogou no total (assim os papéis giram)
    function pickRole(cands, counts) {
      const on = api.onlinePids();
      const ok = cands.filter(pid => on.has(pid));
      const list = ok.length ? ok : cands;
      const peso = pid => (counts[pid] || 0) * 1000 + (s.clueN[pid] || 0) + (s.guessN[pid] || 0);
      return list.reduce((best, pid) => (peso(pid) < peso(best) ? pid : best), list[0]);
    }
    function assignRoles(t) {
      const ps = alive(t);
      s.clue = ps.length ? pickRole(ps, s.clueN) : null;
      const rest = ps.filter(pid => pid !== s.clue);
      s.guess = rest.length ? pickRole(rest, s.guessN) : null;
      if (s.clue) s.clueN[s.clue] = (s.clueN[s.clue] || 0) + 1;
      if (s.guess) s.guessN[s.guess] = (s.guessN[s.guess] || 0) + 1;
    }

    // ---------- fases ----------
    function startTurn() {
      clearRes(); api.clearTimer();
      s.phase = 'ready'; s.word = null; s.turnWords = []; s.hits = 0;
      if (todos()) {
        s.clue = s.order[s.turn] || null; s.guess = null;
        if (s.clue) s.clueN[s.clue] = (s.clueN[s.clue] || 0) + 1;
        api.setEvent(`Rodada ${s.round} de ${s.cfg.rounds} · ${s.clue ? nameOf(s.clue) : 'Alguém'} dá as dicas para todos!`, null);
        return;
      }
      const t = cur();
      if (!t) return;
      assignRoles(t);
      api.setEvent(`Rodada ${s.round} de ${s.cfg.rounds} · Vez do Time ${s.turn + 1}. ${s.clue ? nameOf(s.clue) + ' dá as dicas' : ''}${s.guess ? ' e ' + nameOf(s.guess) + ' adivinha' : ''}.`, null);
    }
    function endTurn(why) {
      clearRes(); api.clearTimer();
      s.phase = 'result';
      s.word = null;                                    // a palavra da vez que sobrou não conta
      s.last = { team: s.turn, hits: s.hits, words: s.turnWords.slice(), clue: s.clue, guess: s.guess };
      if (todos()) api.setEvent(why || `⏰ Tempo! ${nameOf(s.clue)} fez ${s.hits} ${s.hits === 1 ? 'acerto' : 'acertos'}.`, null);
      else api.setEvent(why || `⏰ Tempo! Time ${s.turn + 1} fez ${s.hits} ${s.hits === 1 ? 'acerto' : 'acertos'}.`, null);
      resT = setTimeout(() => { resT = null; advance(); api.broadcast(); }, RESULT_MS);
    }
    function advance() {
      clearRes();
      s.turn++;
      if (todos()) {
        s.order = s.order.filter(pid => api.byPid(pid));
        for (const p of api.players) if (!s.order.includes(p.pid)) s.order.push(p.pid);   // quem chegou depois entra na fila
      }
      if (s.turn >= (todos() ? s.order.length : s.teams.length)) { s.turn = 0; s.round++; }
      if (s.round > s.cfg.rounds) return finish();
      startTurn();
    }
    function finish() {
      clearRes(); api.clearTimer();
      s.phase = 'end'; s.word = null;
      if (todos()) {
        const r = ranking(), top = r.length ? r[0].score : 0;
        const win = r.filter(x => x.score === top).map(x => nameOf(x.pid));
        api.setEvent(win.length > 1 ? `Empate entre ${win.join(' e ')} com ${top} pontos!` : `🏆 ${win[0] || 'Ninguém'} venceu com ${top} pontos!`, null);
        return;
      }
      const best = Math.max(...s.teams.map(t => t.score));
      const win = s.teams.map((t, i) => i).filter(i => s.teams[i].score === best);
      api.setEvent(win.length > 1 ? `Empate entre ${win.map(i => 'Time ' + (i + 1)).join(' e ')} com ${best} pontos!` : `🏆 Time ${win[0] + 1} venceu com ${best} pontos!`, null);
    }

    const inst = {
      start() {
        s.phase = 'setup'; s.cfg = defCfg(); s.round = 1; s.turn = 0; s.used = []; s.order = []; s.scores = {};
        s.clue = null; s.guess = null; s.clueN = {}; s.guessN = {}; s.word = null; s.turnWords = []; s.hits = 0; s.last = null;
        ensureTeams(s.cfg.teams);
        api.clearTimer(); clearRes();
        api.setEvent('Ajustem as regras no celular e toquem em "Começar".', null);
      },

      onTimeUp() { if (s.phase === 'play') endTurn(); },

      action(p, msg) {
        const me = p.pid;
        switch (msg.t) {
          case 'config': {                                     // qualquer jogador muda as regras
            if (s.phase !== 'setup') return;
            const c = msg.cfg || {};
            if (c.mode !== undefined && MODES.some(m => m.id === c.mode)) s.cfg.mode = c.mode;
            if (c.teams !== undefined) { const n = Number(c.teams); if (TEAM_OPTS.includes(n) && api.players.length >= 2 * n) { s.cfg.teams = n; ensureTeams(n); } }
            if (c.auto !== undefined) s.cfg.auto = !!c.auto;
            if (c.rounds !== undefined && ROUND_OPTS.includes(Number(c.rounds))) s.cfg.rounds = Number(c.rounds);
            if (c.turnSec !== undefined && TIME_OPTS.includes(Number(c.turnSec))) s.cfg.turnSec = Number(c.turnSec);
            if (c.diff !== undefined && DIFFS.some(d => d.id === c.diff)) s.cfg.diff = c.diff;
            if (c.pass !== undefined) s.cfg.pass = !!c.pass;
            if (Array.isArray(c.cats)) { const list = CAT_IDS.filter(id => c.cats.includes(id)); s.cfg.cats = list.length ? list : CAT_IDS.slice(); }
            api.setEvent(`${p.name} mudou as regras.`, p.color);
            return;
          }
          case 'team': {                                       // times manuais: entrar num time
            if (s.phase !== 'setup' || s.cfg.auto || todos()) return;
            const i = Number(msg.i);
            if (!(i >= 0 && i < s.teams.length)) return;
            for (const t of s.teams) t.players = t.players.filter(x => x !== me);
            s.teams[i].players.push(me);
            api.setEvent(`${p.name} entrou no Time ${i + 1}.`, p.color);
            return;
          }
          case 'begin': {
            if (s.phase !== 'setup' || !canBegin()) return;
            if (todos()) { s.order = shuffle(api.players.map(x => x.pid)); s.scores = {}; for (const pid of s.order) s.scores[pid] = 0; }
            else if (s.cfg.auto) autoTeams(); else ensureTeams(s.cfg.teams);
            for (const t of s.teams) t.score = 0;
            s.round = 1; s.turn = 0; s.used = []; s.clueN = {}; s.guessN = {}; s.last = null;
            startTurn();
            return;
          }
          case 'go': {                                         // quem dá as dicas começa a vez
            if (s.phase !== 'ready') return;
            if (!s.clue || me !== s.clue) return;
            s.phase = 'play'; s.turnWords = []; s.hits = 0;
            drawWord();
            api.armTimer(s.cfg.turnSec * 1000);
            api.setEvent(`Time ${s.turn + 1} jogando! ${nameOf(s.clue)} dá as dicas.`, p.color);
            return;
          }
          case 'hit':
          case 'pass': {                                       // só quem está dando as dicas marca
            if (s.phase !== 'play' || me !== s.clue || !s.word) return;
            if (msg.t === 'pass' && !s.cfg.pass) return;
            const ok = msg.t === 'hit';
            if (ok && todos()) {                               // modo todos: diz quem acertou; os dois pontuam
              const by = String(msg.by || '');
              if (by === s.clue || !api.byPid(by)) return;
              s.turnWords.push({ w: s.word.w, ok, by });
              s.hits++;
              s.scores[by] = (s.scores[by] || 0) + 1;
              s.scores[s.clue] = (s.scores[s.clue] || 0) + 1;
              api.setEvent(`${nameOf(by)} acertou!`, api.byPid(by).color);
              drawWord();
              return;
            }
            s.turnWords.push({ w: s.word.w, ok });
            if (ok) { s.hits++; const t = cur(); if (t) t.score++; }
            drawWord();
            return;
          }
          case 'skip': {                                       // vez travada (alguém offline)
            if (s.phase !== 'ready') return;
            if (!todos() && teamOf(me) !== s.turn) return;
            api.setEvent(todos() ? `${p.name} pulou a vez de ${s.clue ? nameOf(s.clue) : 'alguém'}.` : `${p.name} pulou a vez do Time ${s.turn + 1}.`, p.color);
            s.last = { team: s.turn, hits: 0, words: [], clue: s.clue, guess: s.guess };
            advance();
            return;
          }
          case 'next': {                                       // "Próximo time" na tela de resultado
            if (s.phase !== 'result') return;
            if (!todos() && s.last && teamOf(me) !== s.last.team) return;
            advance();
            return;
          }
          case 'again': {                                      // volta ao setup mantendo os times
            if (s.phase !== 'end') return;
            clearRes(); api.clearTimer();
            s.phase = 'setup'; s.round = 1; s.turn = 0; s.used = []; s.clueN = {}; s.guessN = {};
            s.word = null; s.turnWords = []; s.hits = 0; s.last = null;
            for (const t of s.teams) t.score = 0;
            for (const pid of Object.keys(s.scores)) s.scores[pid] = 0;
            if (todos()) { api.setEvent('Ajustem as regras e toquem em "Começar".', null); return; }
            s.cfg.teams = s.teams.length;
            api.setEvent('Mesmos times. Ajustem as regras e toquem em "Começar".', null);
            return;
          }
        }
      },

      rekey(o, n) {
        for (const t of s.teams) t.players = t.players.map(x => (x === o ? n : x));
        s.order = s.order.map(x => (x === o ? n : x));
        if (s.scores[o] !== undefined) { s.scores[n] = s.scores[o]; delete s.scores[o]; }
        for (const m of [s.clueN, s.guessN]) if (m[o] !== undefined) { m[n] = m[o]; delete m[o]; }
        if (s.clue === o) s.clue = n;
        if (s.guess === o) s.guess = n;
        if (s.last) { if (s.last.clue === o) s.last.clue = n; if (s.last.guess === o) s.last.guess = n; }
      },

      onPlayerLeave(pid) {
        for (const t of s.teams) t.players = t.players.filter(x => x !== pid);
        delete s.clueN[pid]; delete s.guessN[pid];
        if (s.phase === 'setup') return;
        if (todos()) {
          const idx = s.order.indexOf(pid);
          if (idx >= 0) { s.order.splice(idx, 1); if (idx <= s.turn && s.phase !== 'end') s.turn--; }   // a próxima vez cai em quem vinha depois
          if (s.clue === pid && (s.phase === 'ready' || s.phase === 'play')) endTurn(`Quem dava as dicas saiu. ${s.hits} ${s.hits === 1 ? 'acerto' : 'acertos'} nesta vez.`);
          if (s.phase !== 'end' && api.players.filter(x => x.pid !== pid).length < 3) {
            clearRes(); api.clearTimer();
            s.phase = 'setup'; s.word = null; s.clue = null; s.guess = null; s.turn = 0;
            api.setEvent('Ficaram menos de 3 jogadores. Ajustem as regras e comecem de novo.', null);
          }
          return;
        }
        const era = s.clue === pid || s.guess === pid;
        if (era && (s.phase === 'ready' || s.phase === 'play')) endTurn(`Um jogador saiu no meio da vez. Time ${s.turn + 1}: ${s.hits} ${s.hits === 1 ? 'acerto' : 'acertos'}.`);
        if (s.teams.some(t => t.players.length < 2)) {
          clearRes(); api.clearTimer();
          s.phase = 'setup'; s.word = null; s.clue = null; s.guess = null;
          s.cfg.auto = false; ensureTeams(s.teams.length);
          api.setEvent('Um time ficou com menos de 2 jogadores. Refaçam os times.', null);
        }
      },

      view(me) {
        const eu = me ? me.pid : null;
        // todo celular vê a palavra, menos o de quem adivinha (e a TV, que não tem pid)
        const vePalavra = !!eu && (todos() ? eu === s.clue : eu !== s.guess);   // no modo todos, só quem dá as dicas
        const publico = s.phase === 'result' || s.phase === 'end';
        return {
          phase: s.phase, round: s.round, turn: s.turn, mode: s.cfg.mode, modes: MODES,
          ranking: ranking(), order: s.order,
          cfg: s.cfg, teamOpts: TEAM_OPTS.filter(n => api.players.length >= 2 * n), roundOpts: ROUND_OPTS, timeOpts: TIME_OPTS,
          diffs: DIFFS.map(d => ({ id: d.id, name: d.name })), cats: CATS, catIds: CAT_IDS,
          colors: TEAM_COLORS, canBegin: canBegin(),
          teams: s.teams.map(t => ({ players: t.players, score: t.score })),
          myTeam: eu ? (teamOf(eu) < 0 ? null : teamOf(eu)) : null,
          clue: s.clue, guess: s.guess, hits: s.hits,
          turnMs: s.cfg.turnSec * 1000, turnSec: s.cfg.turnSec, allowPass: s.cfg.pass,
          // PRIVADO: quem adivinha e a TV nunca recebem a palavra
          word: vePalavra && s.phase === 'play' && s.word ? s.word.w : null,
          wordCat: vePalavra && s.phase === 'play' && s.word ? s.word.cat : null,
          // público: a categoria da palavra da vez (a TV mostra; a palavra em si continua escondida)
          curCat: s.phase === 'play' && s.word ? s.word.cat : null,
          turnWords: publico ? s.turnWords : (vePalavra ? s.turnWords : null),
          last: publico ? s.last : null,
          resultMs: RESULT_MS,
        };
      },

      serialize: () => ({ kind: KIND, s }),
      restore(d) {
        // estado salvo de outro jogo (ou de outra versão): ignora com segurança e recomeça na preparação
        if (!d || d.kind !== KIND || !d.s || d.s.kind !== KIND || !Array.isArray(d.s.teams)) { ensureTeams(s.cfg.teams); return; }
        s = { ...s, ...d.s };
        s.cfg = { ...defCfg(), ...(s.cfg || {}) };
        s.order = Array.isArray(s.order) ? s.order : [];
        s.scores = s.scores && typeof s.scores === 'object' ? s.scores : {};
        s.teams = s.teams.map(t => ({ players: Array.isArray(t && t.players) ? t.players : [], score: Number(t && t.score) || 0 }));
        if (s.phase === 'setup') ensureTeams(s.cfg.teams);
        if (s.phase === 'result') { clearRes(); resT = setTimeout(() => { resT = null; advance(); api.broadcast(); }, RESULT_MS); }
        if (s.phase === 'play' && !api.timerEnd) api.armTimer(s.cfg.turnSec * 1000);   // o núcleo já rearma pelo core.timerEnd; isto é só o plano B
      },
    };
    return inst;
  },
};
