// Arcade da casa — um servidor, uma porta, vários jogos, várias salas.
// O núcleo cuida de: salas, jogadores, conexão, tempo, salvamento e a tela inicial (biblioteca).
// Cada jogo vive em games/<id>/ e só cuida das próprias regras. O jogo nem sabe que existem salas.
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const QRCode = require('qrcode');

const PORT = Number(process.env.PORT) || 3000;
const GRACE_MS = 2 * 60 * 1000;                 // tela bloqueada não é "sem conexão"
const ROOM_TTL_MS = 3 * 60 * 60 * 1000;         // sala sem ninguém conectado por 3h some sozinha
const EMPTY_TTL_MS = 2 * 60 * 1000;             // sala criada e nunca aberta (código pedido e abandonado) some rápido
const SAVE_FILE = process.env.STATE_FILE || path.join(__dirname, 'state.json');

// ---------- limites contra abuso (o link é público) ----------
const MAX_ROOMS = Number(process.env.MAX_ROOMS) || 2000;          // teto de salas ao mesmo tempo
const MAX_PLAYERS_PER_ROOM = Number(process.env.MAX_PLAYERS) || 12; // os jogos vão até 8; sobra folga
const MAX_SOCKETS = Number(process.env.MAX_SOCKETS) || 3000;      // teto de conexões no processo
const MAX_SOCKETS_PER_IP = Number(process.env.MAX_IP) || 40;      // uma casa (NAT) tem TV + vários celulares
const MSG_RATE = Number(process.env.MSG_RATE) || 20;             // mensagens por segundo por conexão…
const MSG_BURST = Number(process.env.MSG_BURST) || 40;           // …com uma folga para rajadas curtas
const MAX_PAYLOAD = Number(process.env.MAX_PAYLOAD) || 1024 * 1024; // 1 MB (o maior é o desenho, ~900 KB)
const mkSecret = () => crypto.randomBytes(16).toString('hex');   // prova de dono da vaga (não é o pid público)

// Paleta única da casa: cada pessoa escolhe uma cor e ela vale em todos os jogos.
const COLORS = [
  { key: 'roxo',     name: 'Roxo',     hex: '#a855f7', dark: true },
  { key: 'rosa',     name: 'Rosa',     hex: '#ec4899', dark: true },
  { key: 'ciano',    name: 'Ciano',    hex: '#22d3ee', dark: false },
  { key: 'amarelo',  name: 'Amarelo',  hex: '#facc15', dark: false },
  { key: 'verde',    name: 'Verde',    hex: '#22c55e', dark: false },
  { key: 'vermelho', name: 'Vermelho', hex: '#ef4444', dark: true },
  { key: 'azul',     name: 'Azul',     hex: '#3b82f6', dark: true },
  { key: 'branco',   name: 'Branco',   hex: '#f8fafc', dark: false },
];
const colorInfo = c => COLORS.find(x => x.key === c);

// ---------- catálogo de jogos ----------
const GAMES_DIR = path.join(__dirname, 'games');
const games = new Map();
function loadGames() {
  for (const dir of fs.readdirSync(GAMES_DIR).sort()) {
    const file = path.join(GAMES_DIR, dir, 'game.js');
    if (!fs.existsSync(file)) continue;
    try {
      const mod = require(file);
      if (!mod || !mod.meta || typeof mod.create !== 'function') throw new Error('game.js sem meta ou create()');
      mod.meta.id = mod.meta.id || dir;
      mod.dir = dir;
      games.set(mod.meta.id, mod);
    } catch (e) {
      console.log(`  ⚠️  jogo "${dir}" não carregou: ${e.message}`);
    }
  }
}
const catalog = () => [...games.values()].map(g => ({ ...g.meta, hasTv: fs.existsSync(path.join(GAMES_DIR, g.dir, 'tv.js')) }));

// ---------- salas ----------
// Cada sala tem um código de 4 letras (sem 0/O/1/I para não confundir na TV).
// Cada sala tem seus próprios jogadores, seu próprio jogo e seu próprio cronômetro.
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_RE = /^[A-Z0-9]{4}$/;
const rooms = new Map();    // código -> sala
const normCode = c => String(c || '').trim().toUpperCase();
function newCode() {
  let c;
  do { c = ''; for (let i = 0; i < 4; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]; } while (rooms.has(c));
  return c;
}
function getRoom(code, create) {
  let r = rooms.get(code);
  if (!r && create) {
    if (rooms.size >= MAX_ROOMS) return null;   // teto de salas: barra enxurrada de "criar sala"
    r = makeRoom(code); rooms.set(code, r); stats.totalRooms++; console.log(`  🚪 sala ${code} aberta`);
  }
  return r || null;
}

// ---------- métricas de uso (quantos estão jogando e se estamos perto dos tetos) ----------
// Login do painel /stats: caixinha de usuário e senha do próprio navegador (HTTP Basic, sobre HTTPS).
// Por que não `?key=` na URL: a URL cai no log do proxy, no histórico do navegador e no cabeçalho
// Referer. O cabeçalho Authorization não vaza por esses caminhos.
// O usuário/senha ficam estáveis entre deploys (guardados no volume /data, fora do git).
const STATS_AUTH = (() => {
  const f = path.join(path.dirname(SAVE_FILE), '.stats_auth.json');
  const env = { user: process.env.STATS_USER, pass: process.env.STATS_PASS };
  if (env.user && env.pass) return env;
  try { const d = JSON.parse(fs.readFileSync(f, 'utf8')); if (d && d.user && d.pass) return d; } catch {}
  // primeira vez: reaproveita o segredo antigo do ?key= como senha, se ele existir
  let pass = '';
  try { pass = fs.readFileSync(path.join(path.dirname(SAVE_FILE), '.stats_key'), 'utf8').trim(); } catch {}
  const a = { user: env.user || 'pedro', pass: env.pass || pass || crypto.randomBytes(8).toString('hex') };
  try { fs.writeFileSync(f, JSON.stringify(a), { mode: 0o600 }); } catch {}   // só o dono lê o arquivo
  return a;
})();
// Comparação em tempo constante. Comparamos o resumo (SHA-256) e não o texto: assim textos de
// tamanhos diferentes também são comparados sem vazar o tamanho da senha pelo tempo de resposta.
function sameSecret(a, b) {
  const h = s => crypto.createHash('sha256').update(String(s), 'utf8').digest();
  return crypto.timingSafeEqual(h(a), h(b));
}
// Trava contra tentativa e erro (força bruta): 10 erros por IP a cada 10 minutos.
const AUTH_FAILS = new Map();   // ip -> { n, until }
const AUTH_MAX_FAILS = 10, AUTH_WINDOW_MS = 10 * 60 * 1000;
function authBlocked(ip) {
  const e = AUTH_FAILS.get(ip);
  if (!e) return false;
  if (Date.now() > e.until) { AUTH_FAILS.delete(ip); return false; }
  return e.n >= AUTH_MAX_FAILS;
}
function authFailed(ip) {
  const e = AUTH_FAILS.get(ip);
  if (!e || Date.now() > e.until) AUTH_FAILS.set(ip, { n: 1, until: Date.now() + AUTH_WINDOW_MS });
  else e.n++;
  if (AUTH_FAILS.size > 5000) AUTH_FAILS.clear();   // não deixa a trava virar vazamento de memória
}
// Lê o cabeçalho "Authorization: Basic <base64 de usuario:senha>" que o navegador manda.
function statsAuthOk(req) {
  const h = String(req.headers['authorization'] || '');
  const m = h.match(/^Basic\s+([A-Za-z0-9+/=]+)$/i);
  if (!m) return false;
  let txt = '';
  try { txt = Buffer.from(m[1], 'base64').toString('utf8'); } catch { return false; }
  const i = txt.indexOf(':');
  if (i < 0) return false;
  const user = txt.slice(0, i), pass = txt.slice(i + 1);
  // as duas comparações sempre rodam: nada de "&&" curto-circuitando e vazando qual campo errou
  const okU = sameSecret(user, STATS_AUTH.user), okP = sameSecret(pass, STATS_AUTH.pass);
  return okU && okP;
}
// Métricas ANÔNIMAS e agregadas (nunca guardam nome de ninguém):
//   byGame  jogo -> quantas partidas começaram (qual jogo bomba)
//   byDay   AAAA-MM-DD -> partidas no dia (últimos 30 dias)
//   byHour  0..23 -> partidas por horário (fuso de São Paulo) — descobre o horário de pico
const STATS_FILE = path.join(path.dirname(SAVE_FILE), '.stats.json');
const stats = { peakRooms: 0, peakPlayers: 0, peakSockets: 0, totalRooms: 0, totalGames: 0, since: Date.now(), byGame: {}, byDay: {}, byHour: Array(24).fill(0) };
// data/hora no fuso de São Paulo (o servidor roda em UTC)
function nowBR() {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false }).formatToParts(new Date());
  const g = t => (p.find(x => x.type === t) || {}).value;
  return { day: `${g('year')}-${g('month')}-${g('day')}`, hour: (Number(g('hour')) % 24) || 0 };
}
function countGame(id) {
  stats.totalGames++;
  stats.byGame[id] = (stats.byGame[id] || 0) + 1;
  const { day, hour } = nowBR();
  stats.byDay[day] = (stats.byDay[day] || 0) + 1;
  stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
  // guarda só os últimos 30 dias
  const dias = Object.keys(stats.byDay).sort();
  while (dias.length > 30) delete stats.byDay[dias.shift()];
  saveStats();
}
let statsSaveT = null;
function saveStats() {
  clearTimeout(statsSaveT);
  statsSaveT = setTimeout(() => {
    try { fs.writeFileSync(STATS_FILE, JSON.stringify({ peakRooms: stats.peakRooms, peakPlayers: stats.peakPlayers, peakSockets: stats.peakSockets, totalRooms: stats.totalRooms, totalGames: stats.totalGames, byGame: stats.byGame, byDay: stats.byDay, byHour: stats.byHour, since: stats.since }), { mode: 0o600 }); } catch {}
  }, 500);
}
function loadStats() {
  try {
    const d = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
    if (d && typeof d === 'object') {
      Object.assign(stats, { peakRooms: d.peakRooms || 0, peakPlayers: d.peakPlayers || 0, peakSockets: d.peakSockets || 0, totalRooms: d.totalRooms || 0, totalGames: d.totalGames || 0, byGame: d.byGame || {}, byDay: d.byDay || {}, since: d.since || Date.now() });
      if (Array.isArray(d.byHour) && d.byHour.length === 24) stats.byHour = d.byHour.map(n => Number(n) || 0);
    }
  } catch {}
}
function snapshot() {
  let players = 0, playing = 0;
  for (const r of rooms.values()) { players += r.numPlayers ? r.numPlayers() : 0; if (r.playingNow && r.playingNow()) playing++; }
  const sockets = (typeof wss !== 'undefined' && wss) ? wss.clients.size : 0;
  const roomsN = rooms.size;
  stats.peakRooms = Math.max(stats.peakRooms, roomsN);
  stats.peakPlayers = Math.max(stats.peakPlayers, players);
  stats.peakSockets = Math.max(stats.peakSockets, sockets);
  return { rooms: roomsN, playing, players, sockets };
}
// nomes de quem está online AGORA — só o que está na memória, nunca é gravado em lugar nenhum
function onlineNow() {
  const names = [];
  for (const r of rooms.values()) if (r.onlineNames) for (const n of r.onlineNames()) names.push(n);
  return names;
}
function closeRoom(code) {
  const r = rooms.get(code);
  if (!r) return;
  r.stop();
  rooms.delete(code);
  console.log(`  🚪 sala ${code} fechada (vazia há muito tempo)`);
}

function freshCore() {
  return {
    screen: 'library',      // library | game
    gameId: null,
    players: [],            // { pid, name, color, on }  ordem = ordem de entrada
    event: null,            // { text, color, at }
    startedBy: null,        // pid de quem escolheu o jogo atual (a TV mostra "Fulano escolheu…")
    timerEnd: null,         // cronômetro do jogo atual (o núcleo dispara onTimeUp)
  };
}

function makeRoom(code) {
  let core = freshCore();
  let game = null;                // instância do jogo em andamento
  const clients = new Map();      // ws -> { type:'tv'|'phone', pid, name }
  const lastSeen = new Map();     // pid -> última vez que o celular deu sinal
  let timerHandle = null;
  const room = { code, clients, lastActive: Date.now() };

  const seen = pid => { if (pid) lastSeen.set(pid, Date.now()); };
  function onlinePids() {
    const s = new Set();
    for (const c of clients.values()) if (c.pid) s.add(c.pid);
    const now = Date.now();
    for (const p of core.players) if (now - (lastSeen.get(p.pid) || 0) < GRACE_MS) s.add(p.pid);
    return s;
  }
  function markOnline() {
    const on = onlinePids();
    let changed = false;
    for (const p of core.players) { const v = on.has(p.pid); if (p.on !== v) changed = true; p.on = v; }
    return changed;
  }
  const byPid = pid => core.players.findIndex(p => p.pid === pid);
  const playerOf = ws => { const c = clients.get(ws); const i = c && c.pid ? byPid(c.pid) : -1; return i < 0 ? null : core.players[i]; };

  // ---------- cronômetro (serve para qualquer jogo) ----------
  function armTimer(ms) {
    clearTimeout(timerHandle);
    core.timerEnd = Date.now() + ms;
    const end = core.timerEnd;
    timerHandle = setTimeout(() => {
      if (core.timerEnd !== end) return;
      core.timerEnd = null;
      if (game && typeof game.onTimeUp === 'function') { game.onTimeUp(); broadcast(); }
    }, ms + 50);
  }
  function clearTimer() { clearTimeout(timerHandle); timerHandle = null; core.timerEnd = null; }

  // ---------- api entregue a cada jogo ----------
  function makeApi() {
    return {
      get players() { return core.players; },
      colors: COLORS,
      colorInfo,
      byPid: pid => core.players.find(p => p.pid === pid) || null,
      indexOf: pid => byPid(pid),
      onlinePids,
      setEvent(text, color) { core.event = { text, color: color || null, at: Date.now() }; },
      addEvent(text) { core.event = { text: (core.event ? core.event.text + ' ' : '') + text, color: core.event && core.event.color, at: Date.now() }; },
      get event() { return core.event; },
      armTimer, clearTimer,
      get timerEnd() { return core.timerEnd; },
      broadcast,
      // Fast state has no room payload or disk write; slow clients skip obsolete frames.
      stream() {
        for (const [ws, c] of clients) {
          if (ws.readyState !== 1 || ws.bufferedAmount > 65536) continue;
          const p = playerOf(ws);
          const me = p ? { pid: p.pid, name: p.name, color: p.color, on: p.on } : null;
          send(ws, { t: 'game-frame', gameId: core.gameId, game: game.view(me, c.type) });
        }
      },
      exit(reason) { endGame(reason); },
    };
  }

  function startGame(id, byPlayer) {
    const mod = games.get(id);
    if (!mod) return;
    countGame(id);   // métrica anônima: +1 partida deste jogo (por dia e por horário)
    if (game && game.destroy) game.destroy();
    clearTimer();
    core.gameId = id;
    core.screen = 'game';
    core.event = null;
    core.startedBy = byPlayer ? byPlayer.pid : null;
    game = mod.create(makeApi());
    if (typeof game.start === 'function') game.start();
    if (!core.event) core.event = { text: `${mod.meta.name} começou!`, color: byPlayer ? byPlayer.color : null, at: Date.now() };
  }
  function endGame(reason) {
    if (game && game.destroy) game.destroy();
    clearTimer();
    game = null;
    core.gameId = null;
    core.screen = 'library';
    core.startedBy = null;
    core.event = { text: reason || 'Voltamos para a biblioteca.', color: null, at: Date.now() };
  }

  // ---------- ações do núcleo ----------
  const coreActions = {
    join(ws, msg) {
      const c = clients.get(ws);
      const info = colorInfo(msg.color);
      if (!info) return send(ws, { t: 'error', text: 'Cor inválida.' });
      c.type = 'phone';
      const claimPid = String(msg.pid || '').slice(0, 40);
      const claimSid = String(msg.sid || '').slice(0, 64);
      const name = String(msg.name || '').trim().slice(0, 20) || `Jogador ${core.players.length + 1}`;
      // Segurança: o pid é PÚBLICO (todos o veem para votar/escolher). Reassumir uma vaga que já
      // tem dono exige o segredo daquela vaga (sid). Sem o segredo, o pid pedido não vale e a pessoa
      // ganha um id novo — ninguém controla a vaga (nem a mão/palavra) de outro só sabendo o pid.
      let i = claimPid ? byPid(claimPid) : -1;
      if (i >= 0 && core.players[i].k && core.players[i].k !== claimSid) i = -1;   // pid de outro, sem o segredo
      // pid efetivo: o dono legítimo mantém o seu; recusado ou vazio recebe um id aleatório.
      c.pid = (i >= 0) ? claimPid : (claimPid && byPid(claimPid) < 0 ? claimPid : 'p' + crypto.randomBytes(6).toString('hex'));
      seen(c.pid);
      if (i < 0) {
        // id novo (outro navegador, aba anônima): acha a vaga desta pessoa pelo nome atual ou antigo — só vagas OFFLINE
        const on = onlinePids();
        const ghost = n => { const q = String(n || '').trim().toLowerCase(); return q ? core.players.findIndex(p => p.name.trim().toLowerCase() === q && !on.has(p.pid)) : -1; };
        i = ghost(name); if (i < 0) i = ghost(msg.prevName);
        if (i >= 0) { if (game && game.rekey) game.rekey(core.players[i].pid, c.pid); core.players[i].pid = c.pid; core.players[i].name = name; core.players[i].k = mkSecret(); }
      }
      if (i < 0) {
        if (core.players.length >= MAX_PLAYERS_PER_ROOM) return send(ws, { t: 'error', text: 'A sala está cheia.' });
        if (core.players.some(p => p.color === msg.color)) return send(ws, { t: 'error', text: 'Essa cor já tem dono. Escolha outra.' });
        core.players.push({ pid: c.pid, name, color: msg.color, on: true, k: mkSecret() });
        core.event = { text: `${name} entrou na sala.`, color: msg.color, at: Date.now() };
        if (game && game.onPlayerJoin) game.onPlayerJoin(core.players[core.players.length - 1]);
      } else {
        if (!core.players[i].k) core.players[i].k = claimSid || mkSecret();   // vaga restaurada/antiga sem dono: fixa o segredo agora
        core.players[i].name = name;
        if (core.screen === 'library' && !core.players.some((q, j) => j !== i && q.color === msg.color)) core.players[i].color = msg.color;
      }
      c.name = name;
      broadcast();
    },
    leave(ws) {
      const c = clients.get(ws);
      if (!c || !c.pid || core.screen !== 'library') return;
      removePid(c.pid);
      c.pid = null;
      broadcast();
    },
    rename(ws, msg) {
      const c = clients.get(ws);
      const name = String(msg.name || '').trim().slice(0, 20);
      const i = c && c.pid ? byPid(c.pid) : -1;
      if (i < 0 || !name) return;
      const old = core.players[i].name;
      const on = onlinePids();
      const g = core.players.findIndex((p, j) => j !== i && p.name.trim().toLowerCase() === name.toLowerCase() && !on.has(p.pid));
      if (g >= 0) {                                  // juntou com um fantasma de mesmo nome
        if (game && game.rekey) game.rekey(core.players[g].pid, c.pid);
        core.players[g].pid = c.pid; core.players[g].name = name;
        removeIndex(i > g ? i : i, true);
      } else core.players[i].name = name;
      c.name = name;
      core.event = { text: `${old} agora se chama ${name}.`, color: (core.players[byPid(c.pid)] || {}).color, at: Date.now() };
      broadcast();
    },
    kick(ws, msg) {                                  // tira da sala quem está sem conexão
      const c = clients.get(ws);
      const i = byPid(String(msg.pid || ''));
      if (!c || !c.pid || i < 0 || core.players[i].pid === c.pid || onlinePids().has(core.players[i].pid)) return;
      const gone = core.players[i].name;
      removeIndex(i);
      core.event = { text: `${gone} saiu do jogo.`, color: null, at: Date.now() };
      broadcast();
    },
    play(ws, msg) {                                  // escolher um jogo na biblioteca
      if (core.screen !== 'library') return;
      const mod = games.get(String(msg.id || ''));
      const p = playerOf(ws);
      if (!mod || !p) return;
      if (core.players.length < (mod.meta.minPlayers || 2)) return send(ws, { t: 'error', text: `Precisa de pelo menos ${mod.meta.minPlayers || 2} jogadores.` });
      startGame(mod.meta.id, p);
      broadcast();
    },
    quit(ws) {                                       // sair do jogo e voltar para a biblioteca
      if (core.screen !== 'game') return;
      const p = playerOf(ws);
      endGame(`${p ? p.name : 'Alguém'} encerrou o jogo.`);
      broadcast();
    },
  };
  function removeIndex(i) {
    const pid = core.players[i] && core.players[i].pid;
    core.players.splice(i, 1);
    if (game && game.onPlayerLeave) game.onPlayerLeave(pid, i);
    if (core.screen === 'game' && game && core.players.length < ((games.get(core.gameId) || { meta: {} }).meta.minPlayers || 2)) endGame('Poucos jogadores: voltamos para a biblioteca.');
  }
  function removePid(pid) { const i = byPid(pid); if (i >= 0) removeIndex(i); }

  // ---------- envio ----------
  function viewFor(c) {
    const me = c && c.pid ? core.players.find(p => p.pid === c.pid) : null;
    // o segredo (k) da vaga NUNCA sai para os outros: a lista pública leva só pid/nome/cor/on.
    const publicPlayers = core.players.map(p => ({ pid: p.pid, name: p.name, color: p.color, on: p.on }));
    // uma cópia sem segredo é o que o jogo recebe como "me" (evita vazar k por engano numa view)
    const mePub = me ? { pid: me.pid, name: me.name, color: me.color, on: me.on } : null;
    const out = {
      t: 'state',
      now: Date.now(),
      room: code,
      // só o próprio dono recebe o seu sid (para reconectar), e só no seu próprio "you".
      you: me ? { pid: me.pid, name: me.name, color: me.color, i: byPid(me.pid), sid: me.k } : null,
      core: { screen: core.screen, gameId: core.gameId, players: publicPlayers, event: core.event, timerEnd: core.timerEnd, startedBy: core.startedBy || null },
      game: null,
    };
    if (game && typeof game.view === 'function') out.game = game.view(mePub, c ? c.type : 'unknown');
    return out;
  }
  function broadcast() { markOnline(); saveState(); for (const [ws, c] of clients) send(ws, viewFor(c)); }

  // ---------- o que o servidor usa de fora ----------
  room.touch = () => { room.lastActive = Date.now(); };
  room.attach = (ws, c) => { clients.set(ws, c); room.everAttached = true; room.touch(); };
  room.detach = (ws) => { const c = clients.get(ws); if (!c) return; seen(c.pid); clients.delete(ws); room.touch(); broadcast(); };
  room.sendState = ws => send(ws, viewFor(clients.get(ws)));
  room.message = (ws, msg) => {
    const c = clients.get(ws);
    if (!c) return;
    seen(c.pid);
    room.touch();
    if (msg.t === 'ping') return;
    if (Object.prototype.hasOwnProperty.call(coreActions, msg.t)) return coreActions[msg.t](ws, msg);
    if (game && c.type === 'tv' && typeof game.tvAction === 'function') {
      if (game.tvAction(msg) !== false) broadcast();
      return;
    }
    if (msg.t === 'input' && game && typeof game.input === 'function') {
      const p = playerOf(ws);
      if (p) game.input(p, msg);
      return;
    }
    // qualquer outra mensagem vai para o jogo em andamento
    if (game && typeof game.action === 'function') {
      const p = playerOf(ws);
      if (!p) return;
      game.action(p, msg, ws);
      broadcast();
    }
  };
  room.tick = () => { if (markOnline()) broadcast(); };
  room.isEmpty = () => clients.size === 0;
  room.numPlayers = () => core.players.length;
  room.playingNow = () => core.screen === 'game';
  // nomes de quem está conectado agora (para o painel ao vivo; nunca é gravado)
  room.onlineNames = () => core.players.filter(p => p.on !== false).map(p => p.name);
  room.stop = () => { clearTimeout(timerHandle); if (game && game.destroy) game.destroy(); };
  room.serialize = () => ({ core, gameId: core.gameId, gameState: game && typeof game.serialize === 'function' ? game.serialize() : null, lastActive: room.lastActive });
  room.restore = data => {
    if (!data || !data.core || !Array.isArray(data.core.players)) return;
    core = { ...freshCore(), ...data.core };
    room.lastActive = data.lastActive || Date.now();
    for (const p of core.players) seen(p.pid);
    if (core.gameId && games.has(core.gameId) && data.gameState) {
      game = games.get(core.gameId).create(makeApi());
      if (typeof game.restore === 'function') game.restore(data.gameState);
      core.screen = 'game';
      if (core.timerEnd) {
        const left = core.timerEnd - Date.now();
        core.timerEnd = null;
        armTimer(left > 0 ? left : 8000);      // um respiro para todos voltarem
      }
      console.log(`  Sala ${code}: partida restaurada — ${games.get(core.gameId).meta.name} (${core.players.length} jogadores).`);
    } else {
      core.screen = 'library'; core.gameId = null; core.timerEnd = null;
      console.log(`  Sala ${code} restaurada com ${core.players.length} jogadores.`);
    }
  };
  return room;
}

function send(ws, obj) { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); }

// ---------- salvar / restaurar (todas as salas num arquivo só) ----------
let saveT = null;
function saveState() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    try {
      const data = { rooms: {} };
      for (const [code, r] of rooms) data.rooms[code] = r.serialize();
      fs.writeFileSync(SAVE_FILE, JSON.stringify(data));
    } catch {}
  }, 120);
}
function loadState() {
  try {
    if (!fs.existsSync(SAVE_FILE)) return;
    const data = JSON.parse(fs.readFileSync(SAVE_FILE, 'utf8'));
    if (!data || !data.rooms) { if (data && data.core) console.log('  state.json antigo (sem salas): ignorado.'); return; }
    for (const [code, d] of Object.entries(data.rooms)) {
      if (!CODE_RE.test(code)) continue;
      if (d && d.lastActive && Date.now() - d.lastActive > ROOM_TTL_MS) continue;   // já venceu
      const r = makeRoom(code);
      r.restore(d);
      rooms.set(code, r);
    }
  } catch (e) { console.log('  Não foi possível restaurar:', e.message); }
}

// ---------- HTTP ----------
const PUBLIC = path.join(__dirname, 'public');
const SHARED = path.join(__dirname, 'shared');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json' };
// Cabeçalhos de segurança em toda resposta. A CSP só libera a própria origem;
// 'unsafe-inline' porque o index/tv têm <script> e <style> embutidos (nomes etc. já saem escapados).
const CSP = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws: wss:; font-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'";
function secHeaders(extra) {
  return Object.assign({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': CSP,
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), interest-cohort=()',
  }, extra || {});
}
function serve(res, fp) {
  res.writeHead(200, secHeaders({ 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }));
  fs.createReadStream(fp).pipe(res);
}
function notFound(res) { res.writeHead(404, secHeaders({ 'Content-Type': 'text/plain' })); res.end('404'); }
// página /stats (protegida por senha na URL): números de uso para ver do celular.
function statsHtml() {
  const s = snapshot();
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const upMin = Math.round((Date.now() - stats.since) / 60000);
  const up = upMin < 60 ? `${upMin} min` : `${Math.floor(upMin / 60)}h ${upMin % 60}min`;
  const pct = (n, max) => Math.min(100, Math.round(n / (max || 1) * 100));
  const bar = (label, n, max) => `<div class="row"><span>${label}</span><b>${n} <small>/ ${max}</small></b></div><div class="bar"><i style="width:${pct(n, max)}%;background:${pct(n, max) > 80 ? '#ef4444' : pct(n, max) > 50 ? '#facc15' : '#22c55e'}"></i></div>`;
  const big = (n, label) => `<div class="card"><div class="n">${n}</div><div class="l">${label}</div></div>`;
  const gname = id => { const g = games.get(id); return g ? `${g.meta.emoji} ${g.meta.name}` : id; };

  // online agora (nomes só da memória, nunca gravados)
  const nomes = onlineNow();
  const onlineBox = `<div class="box"><div class="sub" style="margin:0 0 8px">🟢 Online agora — ${nomes.length} ${nomes.length === 1 ? 'pessoa' : 'pessoas'}</div>${nomes.length ? `<div class="chips">${nomes.slice(0, 100).map(n => `<span class="chip">${esc(n)}</span>`).join('')}</div>${nomes.length > 100 ? `<div class="sub" style="margin:8px 0 0">…e mais ${nomes.length - 100}</div>` : ''}` : '<div class="sub" style="margin:0">Ninguém jogando neste momento.</div>'}</div>`;

  // jogos mais jogados (histórico anônimo)
  const jogos = Object.entries(stats.byGame).sort((a, b) => b[1] - a[1]);
  const maxJogo = Math.max(1, ...jogos.map(x => x[1]));
  const jogosBox = `<div class="box"><div class="sub" style="margin:0 0 8px">🏆 Jogos mais jogados (sempre)</div>${jogos.length ? jogos.map(([id, n]) => `<div class="hb"><span class="lab">${esc(gname(id))}</span><span class="t"><i style="width:${pct(n, maxJogo)}%"></i></span><span class="v">${n}</span></div>`).join('') : '<div class="sub" style="margin:0">Ainda sem partidas.</div>'}</div>`;

  // partidas por dia (últimos 10)
  const dias = Object.keys(stats.byDay).sort().slice(-10);
  const maxDia = Math.max(1, ...dias.map(d => stats.byDay[d]));
  const diasBox = `<div class="box"><div class="sub" style="margin:0 0 8px">📅 Partidas por dia</div>${dias.length ? dias.map(d => { const [, mm, dd] = d.split('-'); const n = stats.byDay[d]; return `<div class="hb"><span class="lab">${dd}/${mm}</span><span class="t"><i style="width:${pct(n, maxDia)}%;background:#22c55e"></i></span><span class="v">${n}</span></div>`; }).join('') : '<div class="sub" style="margin:0">Ainda sem partidas.</div>'}</div>`;

  // por horário (fuso de São Paulo)
  const maxH = Math.max(1, ...stats.byHour);
  const horasBox = `<div class="box"><div class="sub" style="margin:0 0 8px">🕒 Horário de pico (partidas · BRT)</div><div class="hours">${stats.byHour.map((n, h) => `<div class="h" title="${h}h: ${n}"><i style="height:${pct(n, maxH)}%"></i></div>`).join('')}</div><div class="hlabels"><span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span></div></div>`;

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="5"><title>Arcade · uso</title>
<style>*{box-sizing:border-box}body{margin:0;background:#0b0e17;color:#e5e7eb;font:15px/1.5 system-ui,-apple-system,sans-serif;padding:18px;max-width:640px;margin:0 auto}h1{font-size:20px;margin:0 0 2px}.sub{color:#94a3b8;font-size:13px;margin-bottom:18px}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:12px}.card{background:#161b2c;border:1px solid #232a42;border-radius:14px;padding:16px;text-align:center}.n{font-size:34px;font-weight:900}.l{color:#94a3b8;font-size:13px;margin-top:2px}.box{background:#161b2c;border:1px solid #232a42;border-radius:14px;padding:16px;margin-bottom:12px}.row{display:flex;justify-content:space-between;margin:10px 0 4px}small{color:#64748b}.bar{height:8px;background:#0b0e17;border-radius:6px;overflow:hidden}.bar i{display:block;height:100%}.chips{display:flex;flex-wrap:wrap;gap:6px}.chip{background:#0b0e17;border:1px solid #232a42;border-radius:999px;padding:4px 11px;font-size:13px}.hb{display:flex;align-items:center;gap:8px;margin:7px 0}.hb .lab{width:130px;font-size:13px;color:#cbd5e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hb .t{flex:1;height:10px;background:#0b0e17;border-radius:6px;overflow:hidden}.hb .t i{display:block;height:100%;background:#22d3ee}.hb .v{width:34px;text-align:right;font-weight:800;font-size:13px}.hours{display:flex;align-items:flex-end;gap:3px;height:70px}.hours .h{flex:1;background:#0b0e17;border-radius:3px 3px 0 0;position:relative;min-height:2px}.hours .h i{position:absolute;bottom:0;left:0;right:0;background:#a855f7;border-radius:3px 3px 0 0}.hlabels{display:flex;justify-content:space-between;color:#64748b;font-size:11px;margin-top:4px}.foot{color:#64748b;font-size:12px;text-align:center;margin-top:14px}</style></head>
<body><h1>🕹️ Arcade — uso</h1><div class="sub">atualiza sozinho a cada 5s · no ar há ${up}</div>
<div class="grid">${big(s.playing, 'jogos rolando')}${big(s.players, 'jogadores')}${big(s.rooms, 'salas abertas')}${big(s.sockets, 'conexões')}</div>
${onlineBox}
<div class="box"><div class="sub" style="margin:0 0 4px">Perto dos limites?</div>${bar('Salas', s.rooms, MAX_ROOMS)}${bar('Conexões', s.sockets, MAX_SOCKETS)}</div>
${jogosBox}${diasBox}${horasBox}
<div class="box"><div class="row"><span>Pico de jogadores</span><b>${stats.peakPlayers}</b></div><div class="row"><span>Pico de conexões</span><b>${stats.peakSockets}</b></div><div class="row"><span>Salas abertas (total)</span><b>${stats.totalRooms}</b></div><div class="row"><span>Partidas (total)</span><b>${stats.totalGames}</b></div></div>
<div class="foot">nomes de "online agora" não são gravados — some quando a pessoa sai</div></body></html>`;
}
const TV_UA = /smart-?tv|tizen|web0s|webos|bravia|android tv|googletv|crkey|aft[a-z]|hbbtv|netcast|viera|roku|philipstv|vidaa/i;
const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  // navegador de TV (Samsung/LG/Sony/Android TV/Fire TV/Chromecast/Roku…) abrindo a raiz -> vai direto para /tv
  if (url === '/' && TV_UA.test(req.headers['user-agent'] || '')) { res.writeHead(302, secHeaders({ Location: '/tv' })); return res.end(); }
  // painel de uso, protegido por usuário e senha (o navegador mostra a caixinha).  JSON: /stats?fmt=json
  if (url === '/stats') {
    const ip = ipOf(req);
    if (authBlocked(ip)) {   // muitas tentativas erradas: descansa 10 minutos
      res.writeHead(429, secHeaders({ 'Content-Type': 'text/plain', 'Retry-After': '600' })); return res.end('429');
    }
    if (!statsAuthOk(req)) {
      authFailed(ip);
      // este cabeçalho é o que faz o navegador abrir a caixinha de usuário e senha
      res.writeHead(401, secHeaders({ 'WWW-Authenticate': 'Basic realm="Arcade", charset="UTF-8"', 'Content-Type': 'text/plain' }));
      return res.end('401');
    }
    AUTH_FAILS.delete(ip);   // acertou: zera o contador de erros deste IP
    if (/(?:^|&)fmt=json(?:&|$)/.test(req.url.split('?')[1] || '')) {
      const body = JSON.stringify({ ...snapshot(), onlineNow: onlineNow(), byGame: stats.byGame, byDay: stats.byDay, byHour: stats.byHour, peak: { players: stats.peakPlayers, sockets: stats.peakSockets, rooms: stats.peakRooms }, total: { rooms: stats.totalRooms, games: stats.totalGames }, limits: { rooms: MAX_ROOMS, sockets: MAX_SOCKETS }, uptimeMin: Math.round((Date.now() - stats.since) / 60000) });
      res.writeHead(200, secHeaders({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })); return res.end(body);
    }
    res.writeHead(200, secHeaders({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })); return res.end(statsHtml());
  }
  // Expose only the two browser modules, never the node_modules tree.
  const vendor = { '/vendor/three/three.module.js': 'three.module.js', '/vendor/three/three.core.js': 'three.core.js' };
  if (Object.prototype.hasOwnProperty.call(vendor, url)) {
    const fp = path.join(__dirname, 'node_modules', 'three', 'build', vendor[url]);
    return fs.existsSync(fp) ? serve(res, fp) : notFound(res);
  }
  // arquivos de tela dos jogos: /games/<id>/(tv|phone).js
  const gm = url.match(/^\/games\/([a-z0-9_-]+)\/(tv|phone)\.js$/i);
  if (gm) {
    const fp = path.join(GAMES_DIR, gm[1], `${gm[2]}.js`);
    if (games.has(gm[1]) && fs.existsSync(fp)) return serve(res, fp);
    return notFound(res);
  }
  // /ABCD -> celular na sala ABCD ; /tv/ABCD -> TV da sala ABCD
  const routes = { '/': 'index.html', '/index.html': 'index.html', '/tv': 'tv.html', '/tv.html': 'tv.html' };
  let rel = routes[url];
  if (!rel && /^\/(tv\/)?[a-z0-9]{4}\/?$/i.test(url)) rel = /^\/tv\//i.test(url) ? 'tv.html' : 'index.html';
  // /shared/* vem SÓ da pasta shared (nada de subir com ../ para o resto do projeto);
  // o resto vem de public. path.normalize corta os ".." e o startsWith confirma que não escapou.
  let base, relPath;
  if (url.startsWith('/shared/')) { base = SHARED; relPath = url.slice('/shared/'.length); }
  else { base = PUBLIC; relPath = rel || url.slice(1); }
  const fp = path.join(base, path.normalize('/' + relPath));
  if (!(fp === base || fp.startsWith(base + path.sep)) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) return notFound(res);
  serve(res, fp);
});

// ---------- endereço na rede ----------
function lanIps() {
  const ips = [];
  for (const list of Object.values(os.networkInterfaces())) for (const n of list) if (n.family === 'IPv4' && !n.internal) ips.push(n.address);
  ips.sort((a, b) => (b.startsWith('192.168.') || b.startsWith('10.')) - (a.startsWith('192.168.') || a.startsWith('10.')));
  return ips;
}
// Dois caminhos até a mesma sala:
//   Wi-Fi daqui  — rápido (não sai de casa), só serve para quem está na mesma rede.
//   Internet     — funciona de qualquer lugar, mas dá a volta pelo túnel (PUBLIC_URL).
// A TV mostra um QR de cada, para cada pessoa escanear o que serve para ela.
// NO_LAN=1 quando o servidor não está na casa de ninguém (VPS): lá o "IP da rede" é o
// IP interno do Docker, que não serve para nenhum celular. Aí só sobra o caminho da internet.
const lanBase = () => (process.env.NO_LAN === '1' ? '' : `http://${lanIps()[0] || 'localhost'}:${PORT}/`);
const webBase = () => { const u = process.env.PUBLIC_URL; return u ? u.replace(/\/?$/, '/') : ''; };
const baseUrl = () => webBase() || lanBase();

const qrCache = new Map();   // url -> svg
async function qrFor(url) {
  if (qrCache.has(url)) return qrCache.get(url);
  let svg = '';
  try { svg = await QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#111111', light: '#ffffff' } }); } catch {}
  qrCache.set(url, svg);
  return svg;
}
async function netsFor(code) {
  const out = [];
  for (const [kind, label, base] of [['lan', '📶 Aqui no Wi-Fi', lanBase()], ['web', '🌍 De qualquer lugar', webBase()]]) {
    if (!base) continue;
    const url = base + (code || '');
    out.push({ kind, label, url, qr: code ? await qrFor(url) : '' });
  }
  return out;
}
async function sendInit(ws, room) {
  const code = room ? room.code : null;
  const nets = await netsFor(code);
  send(ws, {
    t: 'init', colors: COLORS, games: catalog(), graceMs: GRACE_MS, room: code,
    nets, joinUrl: (nets.find(n => n.kind === 'web') || nets[0] || {}).url || baseUrl(),
  });
}
// Se o IP mudar (trocou de Wi-Fi), o QR de todas as TVs é refeito.
let lastBase = '';
setInterval(() => {
  const b = lanBase() + '|' + webBase();
  if (b === lastBase) return;
  lastBase = b; qrCache.clear();
  for (const r of rooms.values()) for (const ws of r.clients.keys()) sendInit(ws, r);
}, 15000);

// ---------- WebSocket ----------
const wss = new WebSocketServer({ server, maxPayload: MAX_PAYLOAD });   // rejeita frames gigantes
const ipCount = new Map();   // ip -> conexões abertas agora (defesa contra flood de um só lugar)
const ipOf = req => (String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || (req.socket && req.socket.remoteAddress) || '?';
// balde de fichas por conexão: gasta 1 por mensagem, recarrega MSG_RATE por segundo, guarda até MSG_BURST.
// Controles em tempo real (t:'input', ex.: o volante do KART) têm um balde próprio e mais largo:
// o celular manda a direção a até 30 Hz e cada toque de botão sai na hora, sem esperar o próximo tique.
const INPUT_RATE = Number(process.env.INPUT_RATE) || 45, INPUT_BURST = Number(process.env.INPUT_BURST) || 60;
function allow(ws, isInput) {
  const now = Date.now();
  const rate = isInput ? INPUT_RATE : MSG_RATE, burst = isInput ? INPUT_BURST : MSG_BURST, tok = isInput ? '_itok' : '_tok', ts = isInput ? '_its' : '_ts';
  if (ws[tok] === undefined) { ws[tok] = burst; ws[ts] = now; }
  ws[tok] = Math.min(burst, ws[tok] + (now - ws[ts]) / 1000 * rate);
  ws[ts] = now;
  if (ws[tok] < 1) return false;
  ws[tok] -= 1;
  return true;
}
wss.on('connection', (ws, req) => {
  const ip = ipOf(req);
  if (wss.clients.size > MAX_SOCKETS || (ipCount.get(ip) || 0) >= MAX_SOCKETS_PER_IP) { try { ws.close(1013, 'busy'); } catch {} return; }
  ipCount.set(ip, (ipCount.get(ip) || 0) + 1);
  let room = null;
  const c = { type: 'unknown', pid: null, name: '' };
  ws.isAlive = true; ws.on('pong', () => { ws.isAlive = true; });
  sendInit(ws, null);

  const enter = async (r, type) => {
    if (room === r) return;
    if (room) room.detach(ws);
    room = r;
    c.type = type; c.pid = null; c.name = '';
    r.attach(ws, c);
    await sendInit(ws, r);
  };

  ws.on('message', async (raw) => {
    // o prefixo é olhado antes de interpretar o JSON: barato e não abre exceção para mensagens grandes
    if (!allow(ws, raw.length < 400 && String(raw).startsWith('{"t":"input"'))) return;   // acima do ritmo: descarta a mensagem
    let msg; try { msg = JSON.parse(raw); } catch { return; }
    if (!msg || typeof msg !== 'object' || typeof msg.t !== 'string') return;
    if (msg.t === 'create') {                            // celular sem TV: abre uma sala e recebe o código
      const r = getRoom(newCode(), true);
      if (!r) return send(ws, { t: 'error', text: 'O arcade está cheio agora. Tente daqui a pouco.' });
      return send(ws, { t: 'room', code: r.code });
    }
    if (msg.t === 'tv') {                                // a TV abre (ou reabre) a sala do código dela
      let code = normCode(msg.room);
      if (!CODE_RE.test(code)) code = newCode();
      const r = getRoom(code, true);
      if (!r) return send(ws, { t: 'error', text: 'O arcade está cheio agora. Tente daqui a pouco.' });
      await enter(r, 'tv');
      c.type = 'tv';
      if (code !== normCode(msg.room)) send(ws, { t: 'room', code });
      return r.sendState(ws);
    }
    if (msg.t === 'join' || msg.t === 'watch') {         // celular só entra (ou olha) sala que já existe
      const code = normCode(msg.room);
      const r = CODE_RE.test(code) ? rooms.get(code) : null;
      if (!r) return send(ws, { t: 'noroom', code });
      await enter(r, 'phone');
      return msg.t === 'join' ? r.message(ws, msg) : r.sendState(ws);
    }
    if (room) room.message(ws, msg);
  });
  ws.on('close', () => { if (room) room.detach(ws); const n = (ipCount.get(ip) || 1) - 1; if (n <= 0) ipCount.delete(ip); else ipCount.set(ip, n); });
  ws.on('error', () => {});
});
setInterval(() => { for (const ws of wss.clients) { if (ws.isAlive === false) { ws.terminate(); continue; } ws.isAlive = false; ws.ping(); } }, 30000);
setInterval(() => { for (const r of rooms.values()) r.tick(); snapshot(); }, 15000);   // snapshot() também amostra o pico
setInterval(() => {
  const now = Date.now();
  for (const [code, r] of rooms) {
    const idle = now - r.lastActive;
    // sala aberta e usada: 3h de tolerância. Sala só "criada" e nunca aberta (código pedido e largado): 2 min.
    if (r.isEmpty() && idle > (r.everAttached ? ROOM_TTL_MS : EMPTY_TTL_MS)) closeRoom(code);
  }
  saveState();
}, 60000);
// linha de uso nos logs, 1x por minuto (só quando tem gente, para não poluir)
setInterval(() => {
  const s = snapshot();
  if (!s.sockets && !s.rooms) return;
  console.log(`  📊 agora: ${s.rooms} salas (${s.playing} jogando) · ${s.players} jogadores · ${s.sockets} conexões  |  pico: ${stats.peakRooms} salas / ${stats.peakPlayers} jogadores / ${stats.peakSockets} conexões  |  tetos: salas ${s.rooms}/${MAX_ROOMS}, conexões ${s.sockets}/${MAX_SOCKETS}`);
}, 60000);

loadGames();
loadState();
loadStats();
server.listen(PORT, '0.0.0.0', () => {
  lastBase = lanBase() + '|' + webBase();
  console.log('\n🕹️   ARCADE DA CASA\n');
  console.log(`  Jogos: ${[...games.values()].map(g => g.meta.emoji + ' ' + g.meta.name).join('  ·  ') || 'nenhum'}\n`);
  if (process.env.PUBLIC_URL) {
    const base = process.env.PUBLIC_URL.replace(/\/$/, '');
    console.log(`  TV:        ${base}/tv`);
    console.log(`  Celulares: ${base}/\n`);
  }
  if (process.env.NO_LAN !== '1') for (const ip of lanIps().length ? lanIps() : ['localhost']) {
    console.log(`  TV:        http://${ip}:${PORT}/tv`);
    console.log(`  Celulares: http://${ip}:${PORT}/\n`);
  }
  console.log('  A TV abre uma sala e mostra o código. Cada TV = uma sala. Cada sala = um jogo.\n');
  const statsUrl = process.env.PUBLIC_URL ? process.env.PUBLIC_URL.replace(/\/$/, '') : `http://localhost:${PORT}`;
  console.log(`  📊 Uso ao vivo: ${statsUrl}/stats   (usuário: ${STATS_AUTH.user} · senha: ${STATS_AUTH.pass})\n`);
});
