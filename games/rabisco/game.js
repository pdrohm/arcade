// Rabisco — desenhe e adivinhe: cada um por si, palpite digitado no chat, pontos por velocidade.
// Serve igual para a sala com TV (todo mundo no sofá) e para quem joga de casa (cada um no seu celular).
// O servidor é a fonte da verdade: a palavra, o tempo, os pontos, os acertos e a ordem saem só daqui.
// Ninguém recebe a palavra antes de acertar; o palpite certo nunca aparece para os outros.
'use strict';
const { CATS, WORDS } = require('./words');
const { MAX_OPS, MAX_BATCH, cleanOp } = require('./ops');
const { norm, tokens, judge, mentions } = require('./guess');

const CHOOSE_MS = Number(process.env.RB_CHOOSE_MS) || 12000;   // tempo para escolher a palavra
const REVEAL_MS = Number(process.env.RB_REVEAL_MS) || 6500;    // palavra revelada + ranking da rodada
const TICK_MS = 500;
const SAY_GAP_MS = process.env.RB_SAY_MS !== undefined ? Number(process.env.RB_SAY_MS) : 350;   // freio: uma mensagem a cada 350 ms por pessoa
const MAX_CHAT = 80, SHOW_CHAT = 50, MAX_FX = 24, MAX_CUSTOM = 200;

const PRESETS = {
  casual:      { name: 'Casual',      emoji: '🛋️', rounds: 3, drawSec: 80, hints: 3, pace: 'normal', chaos: false },
  rapido:      { name: 'Rápido',      emoji: '⚡',  rounds: 2, drawSec: 50, hints: 2, pace: 'cedo',   chaos: false },
  competitivo: { name: 'Competitivo', emoji: '🏆', rounds: 4, drawSec: 70, hints: 1, pace: 'tarde',  chaos: false },
  caos:        { name: 'Caos',        emoji: '🌀', rounds: 3, drawSec: 70, hints: 3, pace: 'normal', chaos: true },
};
const DEFAULT_CATS = ['animais', 'comida', 'objetos', 'lugares', 'profissoes', 'filmes', 'jogos', 'memes', 'aleatorias'];
const PACE = { cedo: [0.2, 0.65], normal: [0.35, 0.8], tarde: [0.55, 0.9] };   // em que parte do tempo as letras aparecem

// Modo Caos: um modificador por vez, sorteado. Os que mexem no traço o servidor também confere.
const MODS = {
  gigante:     { name: 'Pincel gigante',  emoji: '🖌️', desc: 'Só dá para usar o traço mais grosso.' },
  cores:       { name: 'Três cores',      emoji: '🎨', desc: 'Só três cores nesta vez.' },
  espelho:     { name: 'Mundo invertido', emoji: '🙃', desc: 'Quem adivinha vê o desenho de cabeça para baixo.' },
  umtraco:     { name: 'Um traço só',     emoji: '➰', desc: 'Uma linha só. Tirou o dedo, acabou.' },
  semborracha: { name: 'Sem borracha',    emoji: '🚫', desc: 'Nada de apagar ou desfazer.' },
  tremor:      { name: 'Terremoto',       emoji: '📳', desc: 'O quadro treme para quem adivinha.' },
  dificil:     { name: 'Palavra cabeluda', emoji: '🧠', desc: 'Só palavras difíceis.' },
  relampago:   { name: 'Relâmpago',       emoji: '⏱️', desc: 'Metade do tempo para desenhar.' },
};
const MOD_COLORS = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#8b5a2b'];
const BIG_W = 24;

// Frases do sistema: variam para não ficar repetitivo. {d} = quem desenha, {n} = jogador, {w} = palavra.
const FUN = {
  start: ['{d} está criando uma obra de arte 🎨', '{d} pegou o pincel. Silêncio no ateliê 🤫', 'Lá vem arte! {d} começou a desenhar ✏️', '{d} está com a inspiração em dia ✨'],
  mid: ['Será que alguém vai entender? 🤔', '{d} está caprichando nos detalhes 🖌️', 'Arte abstrata? 🖼️', 'O mistério continua… 🕵️'],
  first: ['{n} matou a charada! 🎯', '{n} saiu na frente! 🏁', '{n} foi rapidinho! ⚡'],
  psychic: ['{n} é vidente? 🔮', '{n} leu a mente de {d} 🧠'],
  all: ['Todo mundo acertou! 🎉', 'Unanimidade! {d} mandou bem 👏', 'Desenho de museu: todo mundo acertou 🖼️'],
  fast: ['{d} desenhou rápido demais ⚡', 'Recorde! Todo mundo acertou em segundos 🚀'],
  none: ['Ninguém entendeu essa obra 😭', 'Arte moderna demais para nós 😭', 'Nem o artista entendeu? 😅'],
  noneWord: ['Isso era pra ser {w}? 😅', 'Era {w}! Quem diria… 🤷'],
  lead: ['{n} assumiu a liderança! 👑', 'Temos novo líder: {n} 👑', '{n} passou na frente! 👑'],
};

// 'cachorro: cão, cãozinho' → { w: 'cachorro', near: ['cão', 'cãozinho'] }
function parseEntry(e, cat) {
  const i = e.indexOf(':');
  const w = (i < 0 ? e : e.slice(0, i)).trim();
  const near = i < 0 ? [] : e.slice(i + 1).split(',').map(x => x.trim()).filter(Boolean);
  return { w, near, cat };
}
const BANK = {};
for (const c of CATS) BANK[c.key] = (WORDS[c.key] || []).map(e => parseEntry(e, c.key)).filter(x => x.w);

const clampInt = (v, lo, hi, def) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : def; };
const round10 = n => Math.round(n / 10) * 10;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
const pickOne = a => a[Math.floor(Math.random() * a.length)];
const isLetter = ch => /[0-9a-z]/i.test(ch.normalize('NFD').replace(/[̀-ͯ]/g, ''));
const cleanText = t => String(t == null ? '' : t).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);

function freshCfg() {
  const p = PRESETS.casual;
  return { preset: 'casual', rounds: p.rounds, drawSec: p.drawSec, hints: p.hints, pace: p.pace, chaos: p.chaos, cats: DEFAULT_CATS.slice(), custom: [], onlyCustom: false, place: 'auto' };
}

function create(api) {
  let s = null;
  let tickT = null, streamFrom = null;
  const lastSay = {};               // pid -> hora da última mensagem (freio contra enxurrada)
  const wantFull = new Set();       // quem pediu o quadro inteiro (pid ou 'tv')
  const funLast = {};

  function fresh(cfg) {
    return {
      phase: 'setup',               // setup | choose | draw | reveal | end
      cfg: cfg || freshCfg(),
      matchId: 'm' + Date.now().toString(36),
      order: [], idx: -1, round: 0, turnNo: 0,
      drawer: null, options: null, word: null, mod: null, modColors: null, oneId: null,
      startedAt: 0, drawMs: 0, revealOrder: [], hintAt: [], revealed: 0,
      warned: false, midFun: false,
      guessed: {}, turnPts: {}, closeSaid: {},
      scores: {}, stats: {}, turns: [], used: [],
      leader: null, endReason: null,
      chat: [], msgSeq: 0, fx: [], fxSeq: 0,
      board: [], names: {}, awards: null,
    };
  }

  // ---------- ajudantes ----------
  const player = pid => api.byPid(pid);
  const nameOf = pid => { const p = player(pid); if (p) s.names[pid] = p.name; return (p && p.name) || s.names[pid] || 'Alguém'; };
  const online = pid => { const p = player(pid); return !!p && p.on !== false; };
  const statOf = pid => s.stats[pid] || (s.stats[pid] = { wrong: 0, close: 0, correct: 0, fastest: null, drawPts: 0, bestTurn: 0 });
  const fill = (t, v) => t.replace(/\{(\w)\}/g, (m, k) => (v[k] != null ? v[k] : ''));
  function fun(kind, v) {
    const pool = FUN[kind];
    let i = Math.floor(Math.random() * pool.length);
    if (pool.length > 1 && i === funLast[kind]) i = (i + 1) % pool.length;
    funLast[kind] = i;
    return fill(pool[i], v || {});
  }
  function say(m) {
    m.id = ++s.msgSeq; m.turn = s.turnNo;
    if (m.pid) { const p = player(m.pid); m.name = p ? p.name : nameOf(m.pid); m.color = p ? p.color : m.color; }
    s.chat.push(m);
    if (s.chat.length > MAX_CHAT) s.chat.splice(0, s.chat.length - MAX_CHAT);
    return m;
  }
  const sys = (text, tone) => say({ k: 'sys', text, tone: tone || 'info' });
  function fx(e) { e.id = ++s.fxSeq; e.turn = s.turnNo; s.fx.push(e); if (s.fx.length > MAX_FX) s.fx.splice(0, s.fx.length - MAX_FX); }
  const knows = pid => !!pid && s.phase === 'draw' && (pid === s.drawer || !!s.guessed[pid]);
  // Quem ainda pode acertar nesta vez: está na sala, está conectado e não é quem desenha.
  const waiting = () => api.players.filter(p => p.pid !== s.drawer && p.on !== false && !s.guessed[p.pid]).map(p => p.pid);
  const ensureScore = pid => { if (s.scores[pid] === undefined) s.scores[pid] = 0; };

  function ranking() {
    const ps = api.players.filter(p => s.scores[p.pid] !== undefined || s.phase !== 'setup');
    const list = ps.map(p => ({ pid: p.pid, score: s.scores[p.pid] || 0, i: api.players.indexOf(p) }));
    list.sort((a, b) => b.score - a.score || a.i - b.i);
    let place = 0, prev = null;
    list.forEach((x, k) => { if (x.score !== prev) { place = k + 1; prev = x.score; } x.place = place; delete x.i; });
    return list;
  }
  function checkLeader() {
    const r = ranking();
    if (!r.length || r[0].score <= 0) return;
    const top = r.filter(x => x.score === r[0].score).map(x => x.pid);
    if (s.leader && top.indexOf(s.leader) >= 0) return;   // empate não tira a coroa de quem já tinha
    const was = s.leader;
    s.leader = top[0];
    if (was) { fx({ k: 'lead', pid: s.leader }); sys(fun('lead', { n: nameOf(s.leader) }), 'fun'); }
  }

  // ---------- palavras ----------
  function pool(cat) {
    if (cat === 'turma') return s.cfg.custom.map(w => ({ w, near: [], cat: 'turma' }));
    return BANK[cat] || [];
  }
  function pickOptions(n) {
    const cfg = s.cfg;
    let cats = cfg.cats.filter(k => BANK[k] && BANK[k].length);
    if (cfg.custom.length) cats = cfg.onlyCustom && cfg.custom.length >= n ? ['turma'] : cats.concat('turma');
    if (s.mod === 'dificil') cats = ['dificil'];
    if (!cats.length) cats = DEFAULT_CATS.slice();
    const used = new Set(s.used);
    const out = [];
    const order = shuffle(cats.slice());
    for (let tries = 0; out.length < n && tries < 60; tries++) {
      const cat = order[tries % order.length];
      const list = pool(cat).filter(x => !used.has(norm(x.w)));
      if (!list.length) continue;
      const pick = pickOne(list);
      used.add(norm(pick.w));
      out.push(pick);
    }
    if (out.length < n) {   // todas as palavras já saíram: recomeça o baralho
      s.used = [];
      for (const cat of cats) for (const x of shuffle(pool(cat).slice())) { if (out.length >= n) break; if (!out.some(o => o.w === x.w)) out.push(x); }
    }
    return out;
  }

  // ---------- dicas ----------
  // Posições das letras (sem espaço e hífen) em ordem aleatória; a primeira letra aparece por último.
  function planHints(word) {
    const idx = [];
    for (let i = 0; i < word.length; i++) if (isLetter(word[i])) idx.push(i);
    const letters = idx.length;
    const max = Math.max(0, Math.floor((letters - 1) / 2));
    const n = Math.min(s.cfg.hints, max);
    const order = shuffle(idx.filter(i => i !== idx[0])).concat(idx.length ? [idx[0]] : []);
    const range = PACE[s.cfg.pace] || PACE.normal;
    const at = [];
    for (let k = 0; k < n; k++) at.push(Math.round(s.drawMs * (n === 1 ? (range[0] + range[1]) / 2 : range[0] + (range[1] - range[0]) * k / (n - 1))));
    s.revealOrder = order; s.hintAt = at; s.revealed = 0;
  }
  function hintOf(word, show) {
    const open = new Set(s.revealOrder.slice(0, s.revealed));
    const out = [];
    for (let i = 0; i < word.length; i++) {
      const ch = word[i];
      if (ch === ' ') out.push(' ');
      else if (!isLetter(ch)) out.push(ch);
      else out.push(show || open.has(i) ? ch.toUpperCase() : '_');
    }
    return out;
  }
  const wordLens = word => word.split(/\s+/).map(x => x.split('').filter(isLetter).length).filter(Boolean);

  // ---------- relógio interno da vez (dicas, aviso dos 10 segundos, piada do meio) ----------
  function stopTick() { clearInterval(tickT); tickT = null; }
  function startTick() { stopTick(); tickT = setInterval(tick, TICK_MS); if (tickT.unref) tickT.unref(); }   // unref: não segura o processo (testes)
  function tick() {
    if (!s || s.phase !== 'draw') return stopTick();
    const el = Date.now() - s.startedAt;
    let changed = false;
    let n = 0;
    while (n < s.hintAt.length && s.hintAt[n] <= el) n++;
    if (n > s.revealed) { s.revealed = n; fx({ k: 'hint' }); sys('💡 Nova dica: uma letra apareceu', 'hint'); changed = true; }
    if (!s.midFun && el >= s.drawMs * 0.5 && !Object.keys(s.guessed).length) { s.midFun = true; sys(fun('mid', { d: nameOf(s.drawer) }), 'fun'); changed = true; }
    if (!s.warned && s.drawMs - el <= 10000 && s.drawMs >= 25000) { s.warned = true; fx({ k: 'ten' }); sys('⏳ Faltam 10 segundos', 'warn'); changed = true; }
    if (changed) api.broadcast();
  }

  // ---------- fluxo da partida ----------
  function begin() {
    const cfg = s.cfg;
    s = fresh(cfg);
    s.phase = 'choose';
    s.order = api.players.map(p => p.pid);
    for (const pid of s.order) { ensureScore(pid); statOf(pid); nameOf(pid); }
    s.round = 1; s.idx = -1;
    sys(`🎨 Começou! ${cfg.rounds} ${cfg.rounds === 1 ? 'rodada' : 'rodadas'}, ${cfg.drawSec} s para cada desenho.`, 'info');
    nextTurn();
  }
  function nextTurn() {
    api.clearTimer(); stopTick();
    // próximo da ordem que está na sala e conectado; virou a lista → próxima rodada
    let guard = 0, found = null;
    while (!found && guard++ < 200) {
      s.idx++;
      if (s.idx >= s.order.length) {
        s.idx = 0; s.round++;
        if (s.round > s.cfg.rounds) return endMatch('rounds');
        sys(`🔁 Rodada ${s.round} de ${s.cfg.rounds}`, 'info');
      }
      const pid = s.order[s.idx];
      if (online(pid)) found = pid;
    }
    if (!found) return endMatch('empty');
    s.turnNo++;
    s.phase = 'choose';
    s.drawer = found;
    s.word = null; s.board = []; s.guessed = {}; s.turnPts = {}; s.closeSaid = {}; s.oneId = null;
    s.revealed = 0; s.hintAt = []; s.revealOrder = []; s.warned = false; s.midFun = false; s.endReason = null;
    s.mod = null; s.modColors = null;
    if (s.cfg.chaos && Math.random() < 0.75) {
      const keys = Object.keys(MODS).filter(k => k !== s.lastMod);
      s.mod = pickOne(keys); s.lastMod = s.mod;
      if (s.mod === 'cores') s.modColors = shuffle(MOD_COLORS.slice()).slice(0, 3);
    }
    s.options = pickOptions(3);
    wantFull.clear();
    fx({ k: 'turn', pid: found });
    sys(`✏️ ${nameOf(found)} está escolhendo a palavra…`, 'info');
    if (s.mod) sys(`🌀 Caos: ${MODS[s.mod].emoji} ${MODS[s.mod].name}! ${MODS[s.mod].desc}`, 'fun');
    api.armTimer(CHOOSE_MS);
  }
  function pick(i, auto) {
    if (s.phase !== 'choose' || !s.options || !s.options[i]) return;
    s.word = s.options[i];
    s.options = null;
    s.used.push(norm(s.word.w));
    s.phase = 'draw';
    s.drawMs = s.cfg.drawSec * 1000 * (s.mod === 'relampago' ? 0.5 : 1);
    s.startedAt = Date.now();
    planHints(s.word.w);
    const d = nameOf(s.drawer);
    if (auto) sys(`⏰ ${d} demorou: a palavra foi sorteada.`, 'warn');
    sys(fun('start', { d }), 'fun');
    fx({ k: 'draw', pid: s.drawer });
    api.armTimer(s.drawMs);
    startTick();
  }
  function endTurn(reason) {
    if (s.phase !== 'draw' && s.phase !== 'choose') return;
    api.clearTimer(); stopTick();
    const wasDraw = s.phase === 'draw' && s.word;
    const hits = Object.keys(s.guessed).length;
    const eligible = hits + waiting().length;
    const d = nameOf(s.drawer);
    s.phase = 'reveal'; s.endReason = reason;
    if (wasDraw) {
      const W = s.word.w.toUpperCase();
      if (reason === 'gone') sys(`🚪 ${d} saiu. A palavra era ${W}.`, 'warn');
      else if (!hits) { sys(fun('none'), 'bad'); sys(fun('noneWord', { w: W }), 'fun'); }
      else if (reason === 'all') {
        const slow = Math.max.apply(null, Object.keys(s.guessed).map(k => s.guessed[k].at));
        sys(eligible > 1 && slow < 15000 ? fun('fast', { d }) : fun('all', { d }), 'good');
        sys(`A palavra era ${W}.`, 'info');
      } else sys(`⏰ Tempo! A palavra era ${W}.`, 'info');
      // melhor rodada de cada um e o histórico para os prêmios do fim
      for (const pid of Object.keys(s.turnPts)) { const st = statOf(pid); st.bestTurn = Math.max(st.bestTurn, s.turnPts[pid]); }
      s.turns.push({ drawer: s.drawer, word: s.word.w, hits, eligible });
    } else sys(reason === 'gone' ? `🚪 ${d} saiu antes de escolher. Próximo!` : `⏭️ ${d} pulou a vez.`, 'warn');
    if (wasDraw && reason === 'skip') sys(`⏭️ ${d} desistiu do desenho.`, 'warn');
    fx({ k: 'reveal', hits, eligible });
    checkLeader();
    api.armTimer(REVEAL_MS);
  }
  function endMatch(reason) {
    api.clearTimer(); stopTick();
    s.phase = 'end'; s.drawer = null; s.word = null; s.options = null; s.board = [];
    s.awards = awards();
    const r = ranking();
    if (r.length) sys(`🏆 Fim de jogo! ${nameOf(r[0].pid)} venceu com ${r[0].score} pontos.`, 'good');
    if (reason === 'empty') sys('Ninguém conectado para desenhar. Fim de jogo.', 'warn');
    fx({ k: 'end' });
  }

  // Prêmios engraçados do fim: só entra quem tem número para mostrar.
  function awards() {
    const out = [];
    const pids = api.players.map(p => p.pid).filter(pid => s.stats[pid]);
    const best = (fn, better) => { let w = null, v = null; for (const pid of pids) { const x = fn(s.stats[pid]); if (x == null) continue; if (v === null || better(x, v)) { w = pid; v = x; } } return w ? { pid: w, v } : null; };
    const sec = ms => (ms / 1000).toFixed(1).replace('.', ',') + ' s';
    let a = best(st => (st.drawPts > 0 ? st.drawPts : null), (x, y) => x > y);
    if (a) out.push({ k: 'artist', emoji: '🎨', title: 'Melhor desenhista', pid: a.pid, detail: `${a.v} pontos desenhando` });
    a = best(st => st.fastest, (x, y) => x < y);
    if (a) out.push({ k: 'fast', emoji: '⚡', title: 'Dedo mais rápido', pid: a.pid, detail: `acertou em ${sec(a.v)}` });
    a = best(st => (st.bestTurn > 0 ? st.bestTurn : null), (x, y) => x > y);
    if (a) out.push({ k: 'gold', emoji: '💥', title: 'Rodada de ouro', pid: a.pid, detail: `+${a.v} numa vez só` });
    a = best(st => (st.wrong > 0 ? st.wrong : null), (x, y) => x > y);
    if (a) out.push({ k: 'wrong', emoji: '🙈', title: 'Chutou mais errado', pid: a.pid, detail: `${a.v} ${a.v === 1 ? 'palpite errado' : 'palpites errados'}` });
    a = best(st => (st.close > 0 ? st.close : null), (x, y) => x > y);
    if (a) out.push({ k: 'close', emoji: '👀', title: 'Quase lá', pid: a.pid, detail: `ficou perto ${a.v} ${a.v === 1 ? 'vez' : 'vezes'}` });
    let hard = null;
    for (const t of s.turns) {
      if (!t.eligible || !player(t.drawer)) continue;
      const rate = t.hits / t.eligible;
      if (!hard || rate < hard.rate) hard = { rate, t };
    }
    if (hard && hard.rate < 1) out.push({ k: 'hard', emoji: '🧩', title: 'Obra mais difícil', pid: hard.t.drawer, detail: `${hard.t.word.toUpperCase()}: ${hard.t.hits ? `só ${hard.t.hits} de ${hard.t.eligible} acertou` : 'ninguém acertou'}` });
    return out;
  }

  // ---------- palpite e conversa ----------
  function onSay(p, raw) {
    const text = cleanText(raw);
    if (!text) return false;
    const now = Date.now();
    if (now - (lastSay[p.pid] || 0) < SAY_GAP_MS) return false;
    lastSay[p.pid] = now;
    const me = p.pid;
    if (s.phase === 'draw' && s.word) {
      if (knows(me)) {   // quem já sabe a palavra só conversa com quem também sabe
        say({ k: 'knower', pid: me, text, to: 'knowers' });
        return true;
      }
      const v = judge(text, s.word);
      if (v === 'hit') return hit(p);
      if (v === 'close') {
        statOf(me).close++;
        say({ k: 'close', pid: me, text, to: me });
        fx({ k: 'close', to: me });
        if (!s.closeSaid[me]) { s.closeSaid[me] = true; sys(`👀 ${p.name} está muito perto`, 'close'); }
        return true;
      }
      statOf(me).wrong++;
      say({ k: 'guess', pid: me, text });
      fx({ k: 'miss', to: me });
      return true;
    }
    // escolhendo: quem desenha não pode soprar as opções
    if (s.phase === 'choose' && me === s.drawer && s.options && s.options.some(o => mentions(text, o.w))) {
      say({ k: 'sys', text: '🤫 Psiu! Não entregue a palavra.', tone: 'warn', to: me });
      return true;
    }
    say({ k: 'chat', pid: me, text });
    return true;
  }
  function hit(p) {
    const me = p.pid;
    const el = Date.now() - s.startedAt;
    const frac = Math.max(0, Math.min(1, 1 - el / s.drawMs));
    const order = Object.keys(s.guessed).length + 1;
    const pts = round10(100 + 400 * frac) + (order === 1 ? 50 : 0);
    const eligible = order + waiting().length - 1;   // eu ainda conto em waiting()
    s.guessed[me] = { at: el, pts, order };
    ensureScore(me); ensureScore(s.drawer);
    s.scores[me] += pts; s.turnPts[me] = pts;
    const dpts = round10(pts / Math.max(1, eligible));
    s.scores[s.drawer] += dpts; s.turnPts[s.drawer] = (s.turnPts[s.drawer] || 0) + dpts;
    const st = statOf(me); st.correct++; st.fastest = st.fastest == null ? el : Math.min(st.fastest, el);
    statOf(s.drawer).drawPts += dpts;
    say({ k: 'hit', pid: me, text: `${p.name} acertou!`, pts });
    if (order === 1 && el < 8000) sys(fun('psychic', { n: p.name, d: nameOf(s.drawer) }), 'fun');
    else if (order === 1 && Math.random() < 0.6) sys(fun('first', { n: p.name }), 'fun');
    fx({ k: 'hit', pid: me, pts, first: order === 1, dpid: s.drawer, dpts });
    checkLeader();
    if (!waiting().length) endTurn('all');
    return true;
  }

  // ---------- configuração ----------
  function setCfg(p, c) {
    if (!c || typeof c !== 'object') return;
    const cfg = s.cfg;
    if (c.preset && PRESETS[c.preset]) {
      const pr = PRESETS[c.preset];
      Object.assign(cfg, { preset: c.preset, rounds: pr.rounds, drawSec: pr.drawSec, hints: pr.hints, pace: pr.pace, chaos: pr.chaos });
      api.setEvent(`${p.name} escolheu o modo ${pr.emoji} ${pr.name}.`, p.color);
      return;
    }
    let touched = false;
    if (c.rounds !== undefined) { cfg.rounds = clampInt(c.rounds, 1, 8, cfg.rounds); touched = true; }
    if (c.drawSec !== undefined) { cfg.drawSec = clampInt(c.drawSec, 30, 150, cfg.drawSec); touched = true; }
    if (c.hints !== undefined) { cfg.hints = clampInt(c.hints, 0, 4, cfg.hints); touched = true; }
    if (c.pace !== undefined && PACE[c.pace]) { cfg.pace = c.pace; touched = true; }
    if (c.chaos !== undefined) { cfg.chaos = !!c.chaos; touched = true; }
    if (c.place !== undefined && ['auto', 'presencial', 'remoto'].indexOf(c.place) >= 0) cfg.place = c.place;
    if (c.onlyCustom !== undefined) cfg.onlyCustom = !!c.onlyCustom;
    if (c.cat !== undefined && BANK[c.cat] && c.cat !== 'dificil') {
      const i = cfg.cats.indexOf(c.cat);
      if (i >= 0) { if (cfg.cats.length > 1) cfg.cats.splice(i, 1); } else cfg.cats.push(c.cat);
    }
    if (c.allCats) cfg.cats = DEFAULT_CATS.slice();
    if (touched) {
      const pr = Object.keys(PRESETS).find(k => { const x = PRESETS[k]; return x.rounds === cfg.rounds && x.drawSec === cfg.drawSec && x.hints === cfg.hints && x.pace === cfg.pace && x.chaos === cfg.chaos; });
      cfg.preset = pr || 'custom';
    }
  }
  function addWords(p, text) {
    const parts = String(text || '').split(/[,;\n]+/).map(x => cleanText(x).slice(0, 24)).filter(x => tokens(x).join('').length >= 2);
    const have = new Set(s.cfg.custom.map(norm));
    let n = 0;
    for (const w of parts) {
      if (s.cfg.custom.length >= MAX_CUSTOM) break;
      const k = norm(w);
      if (have.has(k)) continue;
      have.add(k); s.cfg.custom.push(w.toLowerCase()); n++;
    }
    if (n) api.setEvent(`${p.name} adicionou ${n} ${n === 1 ? 'palavra' : 'palavras'} da turma ✍️`, p.color);
  }

  // ---------- quadro ----------
  // Os modificadores que mexem no traço também valem aqui: o celular não decide sozinho.
  function allowed(op) {
    const m = s.mod;
    if (!m) return true;
    if (m === 'gigante' && op.w !== undefined && op.w < BIG_W) op.w = BIG_W;
    if (m === 'cores' && op.c && op.c !== '#ffffff' && s.modColors.indexOf(op.c) < 0) return false;
    if (m === 'semborracha' && (op.t === 'u' || op.t === 'y' || op.t === 'c' || op.c === '#ffffff')) return false;
    if (m === 'umtraco') {
      if (op.t !== 's') return false;
      if (s.oneId === null) s.oneId = op.id;
      else if (op.id !== s.oneId) return false;
    }
    return true;
  }

  const inst = {
    start() { s = fresh(s ? s.cfg : null); stopTick(); api.clearTimer(); api.setEvent('Ajustem e toquem em Começar.', null); },

    onTimeUp() {
      if (s.phase === 'choose') pick(Math.floor(Math.random() * (s.options || [1]).length), true);
      else if (s.phase === 'draw') endTurn('time');
      else if (s.phase === 'reveal') nextTurn();
    },

    action(p, msg) {
      const me = p.pid;
      nameOf(me);
      switch (msg.t) {
        case 'rb-cfg': if (s.phase === 'setup' || s.phase === 'end') setCfg(p, msg.cfg); return;
        case 'rb-words': if (s.phase === 'setup' || s.phase === 'end') addWords(p, msg.text); return;
        case 'rb-clear-words': if (s.phase === 'setup' || s.phase === 'end') { s.cfg.custom = []; s.cfg.onlyCustom = false; } return;
        case 'begin':
          if (s.phase !== 'setup' && s.phase !== 'end') return;
          if (api.players.filter(x => x.on !== false).length < 2) return;
          begin(); return;
        case 'again': if (s.phase === 'end') begin(); return;
        case 'rb-setup': if (s.phase === 'end') { s = fresh(s.cfg); api.setEvent('Ajustem e toquem em Começar.', null); } return;
        case 'pick': if (me === s.drawer) pick(clampInt(msg.i, 0, 2, 0), false); return;
        case 'rb-skip': if (me === s.drawer && (s.phase === 'choose' || s.phase === 'draw')) endTurn('skip'); return;
        case 'say': onSay(p, msg.text); return;
        case 'rb-sync': wantFull.add(me); return;
      }
    },
    tvAction(msg) { if (msg.t === 'rb-sync') { wantFull.add('tv'); return true; } return false; },

    // Traços: chegam pelo canal rápido (sem broadcast) e vão só para quem assiste.
    input(p, msg) {
      if (msg.k !== 'draw' || s.phase !== 'draw' || p.pid !== s.drawer || !Array.isArray(msg.ops)) return;
      const from = s.board.length;
      for (const raw of msg.ops.slice(0, MAX_BATCH)) {
        if (s.board.length >= MAX_OPS) break;
        const op = cleanOp(raw);
        if (op && allowed(op)) s.board.push(op);
      }
      if (s.board.length === from) return;
      streamFrom = from;
      try { api.stream(); } finally { streamFrom = null; }
    },

    onPlayerJoin(p) {
      s.names[p.pid] = p.name;
      if (s.phase === 'setup') return;
      ensureScore(p.pid); statOf(p.pid);
      if (s.order.indexOf(p.pid) < 0) s.order.push(p.pid);
      if (s.phase !== 'end') sys(`👋 ${p.name} entrou na partida`, 'info');
    },
    onPlayerLeave(pid) {
      if (s.phase === 'setup' || s.phase === 'end') return;
      if (pid === s.drawer && (s.phase === 'choose' || s.phase === 'draw')) return endTurn('gone');
      if (s.phase === 'draw' && Object.keys(s.guessed).length && !waiting().length) endTurn('all');
    },
    rekey(oldPid, newPid) {
      const mv = o => { if (o && Object.prototype.hasOwnProperty.call(o, oldPid)) { o[newPid] = o[oldPid]; delete o[oldPid]; } };
      [s.scores, s.stats, s.guessed, s.turnPts, s.closeSaid, s.names].forEach(mv);
      s.order = s.order.map(x => (x === oldPid ? newPid : x));
      if (s.drawer === oldPid) s.drawer = newPid;
      if (s.leader === oldPid) s.leader = newPid;
      for (const m of s.chat) { if (m.pid === oldPid) m.pid = newPid; if (m.to === oldPid) m.to = newPid; }
      for (const e of s.fx) { if (e.pid === oldPid) e.pid = newPid; if (e.to === oldPid) e.to = newPid; if (e.dpid === oldPid) e.dpid = newPid; }
      for (const t of s.turns) if (t.drawer === oldPid) t.drawer = newPid;
    },

    view(me, type) {
      const pid = me ? me.pid : null;
      const isTv = type === 'tv';
      // transmissão de traços: só o pedaço novo do quadro (o resto do estado o celular já tem)
      if (streamFrom !== null) {
        if (pid && pid === s.drawer) return { $merge: true, matchId: s.matchId };
        return { $merge: true, matchId: s.matchId, board: { turn: s.turnNo, seq: s.board.length, from: streamFrom, ops: s.board.slice(streamFrom) } };
      }
      const key = isTv ? 'tv' : pid;
      let board = null;
      if (s.phase === 'draw' || s.phase === 'reveal') {
        const full = key && wantFull.has(key);
        if (full) wantFull.delete(key);
        board = { turn: s.turnNo, seq: s.board.length, from: full ? 0 : s.board.length, ops: full ? s.board : [] };
      }
      const knower = knows(pid);
      const showWord = s.phase === 'reveal' || s.phase === 'end' || knower;
      const visible = m => {
        if (!m.to) return true;
        if (m.to === 'knowers') return knower || m.turn !== s.turnNo || s.phase !== 'draw';
        return m.to === pid;
      };
      const chat = s.chat.filter(visible).slice(-SHOW_CHAT);
      const fxs = s.fx.filter(e => !e.to || e.to === pid);
      const w = s.word ? s.word.w : null;
      const tvs = api.tvCount ? api.tvCount() : 0;
      const phaseMs = s.phase === 'choose' ? CHOOSE_MS : s.phase === 'draw' ? s.drawMs : s.phase === 'reveal' ? REVEAL_MS : 0;
      const catInfo = k => (k === 'turma' ? { key: 'turma', name: 'Palavras da turma', emoji: '✍️' } : CATS.find(c => c.key === k) || null);
      return {
        matchId: s.matchId,
        // a lista de palavras da turma não sai do servidor (senão estragava a surpresa): só a quantidade
        phase: s.phase, cfg: Object.assign({}, s.cfg, { custom: undefined, customN: s.cfg.custom.length }), presets: PRESETS,
        cats: CATS.filter(c => c.key !== 'dificil').map(c => ({ key: c.key, name: c.name, emoji: c.emoji, n: (BANK[c.key] || []).length })),
        round: s.round, rounds: s.cfg.rounds, turnNo: s.turnNo,
        turnIdx: s.idx + 1, turnsInRound: s.order.length,
        drawer: s.drawer, amDrawer: !!pid && pid === s.drawer, knower,
        options: s.phase === 'choose' && pid && pid === s.drawer && s.options ? s.options.map(o => ({ w: o.w, cat: catInfo(o.cat) })) : null,
        word: showWord ? w : null,
        hint: w ? hintOf(w, showWord) : null,
        lens: w ? wordLens(w) : null,
        cat: s.word ? catInfo(s.word.cat) : null,
        revealed: s.revealed, hintsTotal: s.hintAt.length,
        guessed: Object.keys(s.guessed).sort((a, b) => s.guessed[a].order - s.guessed[b].order),
        turnPts: s.turnPts, scores: s.scores, rank: ranking(), leader: s.leader,
        chat, fx: fxs, lastFx: s.fxSeq,
        board,
        mod: s.mod ? Object.assign({ key: s.mod }, MODS[s.mod], s.modColors ? { colors: s.modColors } : {}) : null,
        hasTv: tvs > 0,
        place: s.cfg.place === 'auto' ? (tvs > 0 ? 'presencial' : 'remoto') : s.cfg.place,
        endReason: s.endReason,
        awards: s.phase === 'end' ? s.awards : null,
        turnMs: phaseMs, roundMs: phaseMs,
      };
    },

    serialize: () => ({ s }),
    restore(data) {
      if (!data || !data.s) return;
      s = Object.assign(fresh(), data.s);
      if (s.phase === 'draw') startTick();
    },
    destroy() { stopTick(); },
  };
  s = fresh();
  return inst;
}

module.exports = {
  meta: {
    id: 'rabisco',
    name: 'Rabisco',
    emoji: '✏️',
    tagline: 'Um desenha, todo mundo chuta no chat. Quem acerta primeiro ganha mais. Com TV ou cada um em casa.',
    art: 'linear-gradient(135deg,#f59e0b 0%,#ea580c 45%,#7c2d12 100%)',
    minPlayers: 2, maxPlayers: 12,
    howTo: [
      'Na sua vez, escolha uma de três palavras e desenhe no celular.',
      'Quem adivinha digita o palpite no chat. A resposta certa nunca aparece para os outros: só "Fulano acertou!".',
      'Chegou perto? Só você vê "Tá muito perto 👀". Com o tempo, letras da palavra aparecem como dica.',
      'Quem acerta mais rápido ganha mais pontos. Quem desenha ganha um pouco a cada acerto.',
      'Com TV, o desenho aparece grande na sala. Sem TV, cada um vê o desenho no próprio celular. Mande o link da sala!',
      'No fim: pódio e prêmios (melhor desenhista, dedo mais rápido, quem mais chutou errado…).',
    ],
  },
  create, PRESETS, MODS,
};
