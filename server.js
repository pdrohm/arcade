// Arcade da casa — um servidor, uma porta, vários jogos, várias salas.
// O núcleo cuida de: salas, jogadores, conexão, tempo, salvamento e a tela inicial (biblioteca).
// Cada jogo vive em games/<id>/ e só cuida das próprias regras. O jogo nem sabe que existem salas.
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { WebSocketServer } = require('ws');
const QRCode = require('qrcode');

const PORT = Number(process.env.PORT) || 3000;
const GRACE_MS = 2 * 60 * 1000;                 // tela bloqueada não é "sem conexão"
const ROOM_TTL_MS = 3 * 60 * 60 * 1000;         // sala sem ninguém conectado por 3h some sozinha
const SAVE_FILE = process.env.STATE_FILE || path.join(__dirname, 'state.json');

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
  if (!r && create) { r = makeRoom(code); rooms.set(code, r); console.log(`  🚪 sala ${code} aberta`); }
  return r || null;
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
      exit(reason) { endGame(reason); },
    };
  }

  function startGame(id, byPlayer) {
    const mod = games.get(id);
    if (!mod) return;
    clearTimer();
    core.gameId = id;
    core.screen = 'game';
    core.event = null;
    game = mod.create(makeApi());
    if (typeof game.start === 'function') game.start();
    if (!core.event) core.event = { text: `${mod.meta.name} começou!`, color: byPlayer ? byPlayer.color : null, at: Date.now() };
  }
  function endGame(reason) {
    clearTimer();
    game = null;
    core.gameId = null;
    core.screen = 'library';
    core.event = { text: reason || 'Voltamos para a biblioteca.', color: null, at: Date.now() };
  }

  // ---------- ações do núcleo ----------
  const coreActions = {
    join(ws, msg) {
      const c = clients.get(ws);
      const info = colorInfo(msg.color);
      if (!info) return send(ws, { t: 'error', text: 'Cor inválida.' });
      c.type = 'phone';
      c.pid = String(msg.pid || '').slice(0, 40) || ('p' + Math.random().toString(36).slice(2, 10));
      seen(c.pid);
      const name = String(msg.name || '').trim().slice(0, 20) || `Jogador ${core.players.length + 1}`;
      let i = byPid(c.pid);
      if (i < 0) {
        // id novo (outro navegador, aba anônima): acha a vaga desta pessoa pelo nome atual ou antigo
        const on = onlinePids();
        const ghost = n => { const q = String(n || '').trim().toLowerCase(); return q ? core.players.findIndex(p => p.name.trim().toLowerCase() === q && !on.has(p.pid)) : -1; };
        i = ghost(name); if (i < 0) i = ghost(msg.prevName);
        if (i >= 0) { if (game && game.rekey) game.rekey(core.players[i].pid, c.pid); core.players[i].pid = c.pid; core.players[i].name = name; }
      }
      if (i < 0) {
        if (core.players.some(p => p.color === msg.color)) return send(ws, { t: 'error', text: 'Essa cor já tem dono. Escolha outra.' });
        core.players.push({ pid: c.pid, name, color: msg.color, on: true });
        core.event = { text: `${name} entrou na sala.`, color: msg.color, at: Date.now() };
        if (game && game.onPlayerJoin) game.onPlayerJoin(core.players[core.players.length - 1]);
      } else {
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
    const out = {
      t: 'state',
      now: Date.now(),
      room: code,
      you: me ? { pid: me.pid, name: me.name, color: me.color, i: byPid(me.pid) } : null,
      core: { screen: core.screen, gameId: core.gameId, players: core.players, event: core.event, timerEnd: core.timerEnd },
      game: null,
    };
    if (game && typeof game.view === 'function') out.game = game.view(me, c ? c.type : 'unknown');
    return out;
  }
  function broadcast() { markOnline(); saveState(); for (const [ws, c] of clients) send(ws, viewFor(c)); }

  // ---------- o que o servidor usa de fora ----------
  room.touch = () => { room.lastActive = Date.now(); };
  room.attach = (ws, c) => { clients.set(ws, c); room.touch(); };
  room.detach = (ws) => { const c = clients.get(ws); if (!c) return; seen(c.pid); clients.delete(ws); room.touch(); broadcast(); };
  room.sendState = ws => send(ws, viewFor(clients.get(ws)));
  room.message = (ws, msg) => {
    const c = clients.get(ws);
    if (!c) return;
    seen(c.pid);
    room.touch();
    if (msg.t === 'ping') return;
    if (coreActions[msg.t]) return coreActions[msg.t](ws, msg);
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
  room.stop = () => clearTimeout(timerHandle);
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
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json' };
function serve(res, fp) {
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(fp).pipe(res);
}
const TV_UA = /smart-?tv|tizen|web0s|webos|bravia|android tv|googletv|crkey|aft[a-z]|hbbtv|netcast|viera|roku|philipstv|vidaa/i;
const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  // navegador de TV (Samsung/LG/Sony/Android TV/Fire TV/Chromecast/Roku…) abrindo a raiz -> vai direto para /tv
  if (url === '/' && TV_UA.test(req.headers['user-agent'] || '')) { res.writeHead(302, { Location: '/tv' }); return res.end(); }
  // arquivos de tela dos jogos: /games/<id>/(tv|phone).js
  const gm = url.match(/^\/games\/([a-z0-9_-]+)\/(tv|phone)\.js$/i);
  if (gm) {
    const fp = path.join(GAMES_DIR, gm[1], `${gm[2]}.js`);
    if (games.has(gm[1]) && fs.existsSync(fp)) return serve(res, fp);
    res.writeHead(404); return res.end('404');
  }
  // /ABCD -> celular na sala ABCD ; /tv/ABCD -> TV da sala ABCD
  const routes = { '/': 'index.html', '/index.html': 'index.html', '/tv': 'tv.html', '/tv.html': 'tv.html' };
  let rel = routes[url];
  if (!rel && /^\/(tv\/)?[a-z0-9]{4}\/?$/i.test(url)) rel = /^\/tv\//i.test(url) ? 'tv.html' : 'index.html';
  rel = rel || url.slice(1);
  const base = url.startsWith('/shared/') ? __dirname : PUBLIC;
  const fp = path.join(base, path.normalize(rel));
  if (!fp.startsWith(base) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('404'); }
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
const wss = new WebSocketServer({ server });
wss.on('connection', (ws) => {
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
    let msg; try { msg = JSON.parse(raw); } catch { return; }
    if (msg.t === 'create') {                            // celular sem TV: abre uma sala e recebe o código
      const r = getRoom(newCode(), true);
      return send(ws, { t: 'room', code: r.code });
    }
    if (msg.t === 'tv') {                                // a TV abre (ou reabre) a sala do código dela
      let code = normCode(msg.room);
      if (!CODE_RE.test(code)) code = newCode();
      const r = getRoom(code, true);
      await enter(r, 'tv');
      c.type = 'tv';
      if (code !== normCode(msg.room)) send(ws, { t: 'room', code });
      return r.sendState(ws);
    }
    if (msg.t === 'join' || msg.t === 'watch') {         // celular só entra (ou olha) sala que já existe
      const code = normCode(msg.room);
      const r = rooms.get(code);
      if (!r) return send(ws, { t: 'noroom', code });
      await enter(r, 'phone');
      return msg.t === 'join' ? r.message(ws, msg) : r.sendState(ws);
    }
    if (room) room.message(ws, msg);
  });
  ws.on('close', () => { if (room) room.detach(ws); });
  ws.on('error', () => {});
});
setInterval(() => { for (const ws of wss.clients) { if (ws.isAlive === false) { ws.terminate(); continue; } ws.isAlive = false; ws.ping(); } }, 30000);
setInterval(() => { for (const r of rooms.values()) r.tick(); }, 15000);
setInterval(() => {
  const now = Date.now();
  for (const [code, r] of rooms) if (r.isEmpty() && now - r.lastActive > ROOM_TTL_MS) closeRoom(code);
  saveState();
}, 60000);

loadGames();
loadState();
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
});
