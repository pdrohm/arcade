// Imagem e Ação - servidor local (TV + celulares)
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { WebSocketServer } = require('ws');
const QRCode = require('qrcode');
const { CATEGORIES, WORDS } = require('./cards');

const PORT = Number(process.env.PORT) || 3000;
const ROUND_SECONDS = 60;
const DICE_MS = 1100;          // tempo da animação do dado
const BOARD_SIZE = 52;         // casas 0..51 em espiral (0 = início, 51 = chegada)
const CAT_SEQ = ['P', 'O', 'A', 'D', 'L'];

const TEAM_COLORS = [
  { key: 'roxo',   name: 'Roxo',   hex: '#a855f7' },
  { key: 'rosa',   name: 'Rosa',   hex: '#ec4899' },
  { key: 'ciano',  name: 'Ciano',  hex: '#22d3ee' },
  { key: 'branco', name: 'Branco', hex: '#f8fafc' },
];

// ---------- tabuleiro ----------
function makeBoard() {
  const b = [{ i: 0, cat: null, start: true, allPlay: false }];
  for (let i = 1; i < BOARD_SIZE; i++) {
    b.push({ i, cat: CAT_SEQ[(i - 1) % CAT_SEQ.length], allPlay: i % 4 === 0 && i < BOARD_SIZE - 1 });
  }
  const last = b[BOARD_SIZE - 1];
  last.cat = 'L';
  last.finish = true;
  last.allPlay = false;
  return b;
}
const BOARD = makeBoard();

// ---------- cartas ----------
const used = { P: new Set(), O: new Set(), A: new Set(), D: new Set(), L: new Set() };
function drawCard(cat) {
  const pool = WORDS[cat];
  if (used[cat].size >= pool.length) used[cat].clear();
  let word;
  do { word = pool[Math.floor(Math.random() * pool.length)]; } while (used[cat].has(word));
  used[cat].add(word);
  return { cat, word };
}

// ---------- estado ----------
function freshState() {
  return {
    phase: 'lobby',        // lobby | roll | rolling | draw | allplay | judge | win
    teams: [],             // { color, name, pos, members, players: [{pid,name}], drawerIdx }
    turn: 0,
    dice: null,
    target: null,          // casa para onde o peão vai SE acertar
    drawers: {},           // cor -> pid do jogador que desenha nesta vez
    card: null,            // { cat, word }
    timerEnd: null,
    timeUp: false,
    winner: null,
    event: null,           // { text, color } última coisa que aconteceu
    round: 0,
  };
}
let state = freshState();
let timerHandle = null;

// ---------- salvar / restaurar (se o servidor cair, o jogo volta de onde parou) ----------
const SAVE_FILE = process.env.STATE_FILE || path.join(__dirname, 'state.json');
let saveT = null;
function saveState() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    try { fs.writeFileSync(SAVE_FILE, JSON.stringify({ state, used: Object.fromEntries(Object.entries(used).map(([k, v]) => [k, [...v]])) })); } catch {}
  }, 100);
}
function loadState() {
  try {
    if (!fs.existsSync(SAVE_FILE)) return;
    const data = JSON.parse(fs.readFileSync(SAVE_FILE, 'utf8'));
    if (!data || !data.state || !Array.isArray(data.state.teams)) return;
    state = { ...freshState(), ...data.state };
    for (const t of state.teams) { t.members = 0; t.players = t.players || []; t.drawerIdx = t.drawerIdx || 0; t.lastDrawer = t.lastDrawer || (data.state.drawers && data.state.drawers[t.color]) || null; }  // celulares vão reconectar sozinhos
    state.drawers = state.drawers || {};
    for (const t of state.teams) for (const p of t.players) seen(p.pid);   // tolerância para todos reconectarem
    for (const [k, v] of Object.entries(data.used || {})) if (used[k]) used[k] = new Set(v);
    if (state.phase === 'rolling') { state.phase = 'roll'; state.dice = null; state.target = null; state.card = null; }
    if (state.timerEnd) {
      const left = state.timerEnd - Date.now();
      state.timerEnd = null;
      if (left > 0) startTimer(left);
      else if (state.phase === 'draw') { state.timeUp = true; state.phase = 'judge'; }
      else if (state.phase === 'allplay') nextTurn('Ninguém acertou a tempo.');
    }
    console.log(`  Jogo restaurado (${state.teams.length} equipes, rodada ${state.round}).`);
  } catch (e) { console.log('  Não foi possível restaurar o jogo:', e.message); }
}

const clients = new Map(); // ws -> { type: 'tv' | 'phone', color, name }
const teamMembers = new Map(); // color -> Set(ws)

function currentTeam() { return state.teams[state.turn] || null; }
function teamByColor(c) { return state.teams.find(t => t.color === c) || null; }
function colorInfo(c) { return TEAM_COLORS.find(x => x.key === c); }

// Tela bloqueada fecha a conexão do celular. Isso NÃO é "sem conexão": só depois de GRACE_MS sem sinal.
const GRACE_MS = 2 * 60 * 1000;
const lastSeen = new Map(); // pid -> última vez que o celular falou com o servidor
function seen(pid) { if (pid) lastSeen.set(pid, Date.now()); }
function onlinePids(color) {
  const s = new Set();
  for (const c of clients.values()) if (c.color === color && c.pid) s.add(c.pid);
  const team = teamByColor(color);
  const now = Date.now();
  for (const p of (team && team.players) || []) if (now - (lastSeen.get(p.pid) || 0) < GRACE_MS) s.add(p.pid);
  return s;
}
// Escolhe quem desenha pela equipe, SEMPRE o seguinte na ordem de entrada.
// Não pula ninguém (nem quem está offline). Quem desenhou por último NUNCA repete
// enquanto a equipe tiver mais de 1 jogador.
function pickDrawer(team) {
  const ps = team.players || [];
  if (!ps.length) return null;
  let idx = 0;
  const li = ps.findIndex(p => p.pid === team.lastDrawer);
  if (li >= 0) idx = (li + 1) % ps.length;
  else if (team.lastDrawer && ps.length > 1 && ps[0].pid === team.lastDrawer) idx = 1;
  team.lastDrawer = ps[idx].pid;
  team.drawerIdx = (idx + 1) % ps.length;
  return ps[idx].pid;
}
function drawerName(team) {
  const pid = state.drawers && state.drawers[team.color];
  const p = (team.players || []).find(x => x.pid === pid);
  return p ? p.name : null;
}
// É o desenhista da vez desta equipe? Só ele. Ninguém assume no lugar dele.
function isDrawer(c, team) {
  if (!c || !team || c.color !== team.color) return false;
  const d = state.drawers && state.drawers[team.color];
  return !!d && c.pid === d;
}
// marca quem está online (para o celular mostrar "fulano sem conexão")
function markOnline() {
  let changed = false;
  for (const t of state.teams) {
    const on = onlinePids(t.color);
    for (const p of (t.players || [])) { const v = on.has(p.pid); if (p.on !== v) changed = true; p.on = v; }
  }
  return changed;
}
// de tempos em tempos, avisa as telas se alguém passou do tempo de tolerância
setInterval(() => { if (markOnline()) broadcast(); }, 15000);
// Este celular assume a vaga de um jogador offline (mesma pessoa, id novo). A posição na ordem é a da vaga.
function takeOver(team, ghost, c, name) {
  if (team.lastDrawer === ghost.pid) team.lastDrawer = c.pid;
  if (state.drawers && state.drawers[team.color] === ghost.pid) state.drawers[team.color] = c.pid;
  ghost.pid = c.pid;
  ghost.name = name;
  return ghost;
}
function findOfflineByName(team, name, exceptPid) {
  if (!name) return null;
  const online = onlinePids(team.color);
  const n = name.trim().toLowerCase();
  return (team.players || []).find(p => p.pid !== exceptPid && p.name.trim().toLowerCase() === n && !online.has(p.pid)) || null;
}

function assignDrawer(team) {
  if (!team) return;
  state.drawers = { [team.color]: pickDrawer(team) };
  const n = drawerName(team);
  if (n) setEvent((state.event ? state.event.text + ' ' : '') + `${n} desenha.`, team.color);
}

function setEvent(text, color) { state.event = { text, color: color || null, at: Date.now() }; }

function clearTimer() {
  if (timerHandle) clearTimeout(timerHandle);
  timerHandle = null;
  state.timerEnd = null;
}

function nextTurn(reason) {
  clearTimer();
  state.card = null;
  state.target = null;
  state.timeUp = false;
  if (state.teams.length) state.turn = (state.turn + 1) % state.teams.length;
  state.phase = 'roll';
  state.round++;
  const t = currentTeam();
  if (reason) setEvent(reason, null);
  if (t) setEvent((state.event ? state.event.text + ' ' : '') + `Vez da equipe ${colorInfo(t.color).name}.`, t.color);
  assignDrawer(t);
}

function finishIfWon(t) {
  if (t.pos < BOARD_SIZE - 1) return false;
  clearTimer();
  state.card = null;
  state.target = null;
  state.timeUp = false;
  state.phase = 'win';
  state.winner = t.color;
  setEvent(`A equipe ${colorInfo(t.color).name} venceu!`, t.color);
  return true;
}

function startTimer(ms = ROUND_SECONDS * 1000) {
  clearTimer();
  state.timeUp = false;
  state.timerEnd = Date.now() + ms;
  const round = state.round;
  const phaseAtStart = state.phase;
  timerHandle = setTimeout(() => {
    if (state.round !== round) return;
    state.timerEnd = null;
    state.timeUp = true;
    if (phaseAtStart === 'draw') {
      state.phase = 'judge';
      setEvent('Tempo esgotado! Acertou ou errou?', currentTeam() && currentTeam().color);
    } else if (phaseAtStart === 'allplay') {
      nextTurn('Ninguém acertou a tempo.');
    }
    broadcast();
  }, ms);
}

// ---------- ações ----------
const actions = {
  join(ws, msg) {
    const info = colorInfo(msg.color);
    if (!info) return send(ws, { t: 'error', text: 'Cor inválida.' });
    const c = clients.get(ws);
    if (c.color && c.color !== msg.color) leaveTeam(ws, true);
    let team = teamByColor(msg.color);
    if (!team) {
      if (state.phase !== 'lobby') return send(ws, { t: 'error', text: 'O jogo já começou. Entre em uma equipe que já existe.' });
      team = { color: msg.color, name: info.name, pos: 0, members: 0 };
      state.teams.push(team);
    }
    c.type = 'phone';
    c.color = msg.color;
    c.pid = String(msg.pid || '').slice(0, 40) || ('p' + Math.random().toString(36).slice(2, 10));
    seen(c.pid);
    team.players = team.players || [];
    let player = team.players.find(p => p.pid === c.pid);
    const name = String(msg.name || '').trim().slice(0, 20) || (player && player.name) || `Jogador ${team.players.length + 1}`;
    if (!player) {
      // id novo (trocou de navegador, aba privada…): procura a vaga desta pessoa pelo nome
      // atual OU pelo nome antigo que o celular lembra. Não cria outra pessoa.
      const ghost = findOfflineByName(team, name, c.pid) || findOfflineByName(team, String(msg.prevName || ''), c.pid);
      if (ghost) player = takeOver(team, ghost, c, name);
      else { player = { pid: c.pid, name }; team.players.push(player); }
    } else {
      player.name = name;
      // mudou para um nome que já existe offline: junta os dois (fica a vaga original na ordem)
      const ghost = findOfflineByName(team, name, c.pid);
      if (ghost) { team.players = team.players.filter(p => p !== player); player = takeOver(team, ghost, c, name); }
    }
    c.name = name;
    if (!teamMembers.has(msg.color)) teamMembers.set(msg.color, new Set());
    teamMembers.get(msg.color).add(ws);
    team.members = teamMembers.get(msg.color).size;
    if (state.phase === 'lobby') setEvent(`${c.name || 'Alguém'} entrou na equipe ${info.name}.`, msg.color);
    broadcast();
  },
  leave(ws) { leaveTeam(ws, true); broadcast(); },
  // remove da ordem um jogador SEM CONEXÃO (fantasma de celular antigo). Só alguém do mesmo time pode.
  kick(ws, msg) {
    const c = clients.get(ws);
    if (!c || !c.color) return;
    const team = teamByColor(c.color);
    const pid = String(msg.pid || '');
    if (!team || !pid || pid === c.pid || onlinePids(c.color).has(pid)) return;
    const ps = team.players || [];
    const i = ps.findIndex(p => p.pid === pid);
    if (i < 0) return;
    const gone = ps[i];
    if (team.lastDrawer === pid) team.lastDrawer = ps.length > 1 ? ps[(i - 1 + ps.length) % ps.length].pid : null;
    ps.splice(i, 1);
    team.drawerIdx = ps.length ? (team.drawerIdx || 0) % ps.length : 0;
    if (state.drawers && state.drawers[c.color] === pid) {   // era o desenhista da vez: passa para o seguinte
      state.drawers[c.color] = pickDrawer(team);
      const n = drawerName(team);
      setEvent(`${gone.name} foi removido.${n ? ` ${n} desenha.` : ''}`, c.color);
    } else setEvent(`${gone.name} foi removido da equipe ${colorInfo(c.color).name}.`, c.color);
    broadcast();
  },
  rename(ws, msg) {
    const c = clients.get(ws);
    const name = String(msg.name || '').trim().slice(0, 20);
    if (!c || !c.color || !name) return;
    const team = teamByColor(c.color);
    const p = team && (team.players || []).find(p => p.pid === c.pid);
    const old = c.name;
    c.name = name;
    if (p) {
      p.name = name;
      const ghost = findOfflineByName(team, name, c.pid);
      if (ghost) { team.players = team.players.filter(x => x !== p); takeOver(team, ghost, c, name); }
    }
    setEvent(`${old || 'Alguém'} agora se chama ${name}.`, c.color);
    broadcast();
  },
  start(ws) {
    if (state.phase !== 'lobby') return;
    if (state.teams.length < 2) return send(ws, { t: 'error', text: 'Precisa de pelo menos 2 equipes.' });
    state.phase = 'roll';
    state.turn = 0;
    state.round = 1;
    for (const t of state.teams) { t.drawerIdx = 0; t.lastDrawer = null; }
    setEvent(`Começou! Vez da equipe ${colorInfo(currentTeam().color).name}.`, currentTeam().color);
    assignDrawer(currentTeam());
    broadcast();
  },
  roll(ws) {
    const c = clients.get(ws);
    const t = currentTeam();
    if (state.phase !== 'roll' || !isDrawer(c, t)) return;
    state.phase = 'rolling';
    state.dice = null;
    broadcast();
    const round = state.round;
    setTimeout(() => {
      if (state.round !== round || state.phase !== 'rolling') return;
      const d = 1 + Math.floor(Math.random() * 6);
      state.dice = d;
      // o peão NÃO anda agora: só anda se acertar o desenho
      state.target = Math.min(t.pos + d, BOARD_SIZE - 1);
      const sq = BOARD[state.target];
      state.card = drawCard(sq.cat);
      state.timeUp = false;
      if (sq.allPlay) {
        state.phase = 'allplay';
        for (const o of state.teams) if (o !== t) state.drawers[o.color] = pickDrawer(o);
        setEvent(`Tirou ${d}. Casa TODOS JOGAM! Todas as equipes desenham a mesma palavra.`, t.color);
      } else {
        state.phase = 'draw';
        setEvent(`Tirou ${d}. Categoria: ${CATEGORIES[sq.cat].name}. Acertou, anda até a casa ${state.target}.`, t.color);
      }
      broadcast();
    }, DICE_MS);
  },
  swap(ws) {
    const c = clients.get(ws);
    const t = currentTeam();
    if (!['draw', 'allplay'].includes(state.phase) || state.timerEnd || !isDrawer(c, t)) return;
    state.card = drawCard(state.card.cat);
    broadcast();
  },
  timer(ws) {
    const c = clients.get(ws);
    const t = currentTeam();
    if (!['draw', 'allplay'].includes(state.phase) || state.timerEnd) return;
    if (!isDrawer(c, t)) return;
    startTimer();
    setEvent('Desenhando! Tempo correndo.', t.color);
    broadcast();
  },
  result(ws, msg) {
    const c = clients.get(ws);
    const t = currentTeam();
    if (!['draw', 'judge'].includes(state.phase) || !isDrawer(c, t)) return;
    const name = colorInfo(t.color).name;
    if (msg.ok) {
      if (state.target !== null) t.pos = state.target;   // anda só agora
      if (!finishIfWon(t)) nextTurn(`Equipe ${name} acertou e andou até a casa ${t.pos}!`);
    } else {
      nextTurn(`Equipe ${name} não acertou. O peão fica na casa ${t.pos}.`);
    }
    broadcast();
  },
  allplayWin(ws) {
    const c = clients.get(ws);
    if (state.phase !== 'allplay') return;
    const w = teamByColor(c.color);
    if (!w) return;
    const t = currentTeam();
    // quem acertou primeiro anda o valor do dado; a vez segue a ordem normal
    w.pos = w === t && state.target !== null ? state.target : Math.min(w.pos + (state.dice || 0), BOARD_SIZE - 1);
    if (!finishIfWon(w)) nextTurn(`Equipe ${colorInfo(w.color).name} acertou primeiro e andou até a casa ${w.pos}!`);
    broadcast();
  },
  allplayNone(ws) {
    if (state.phase !== 'allplay') return;
    nextTurn('Ninguém acertou.');
    broadcast();
  },
  reset() {
    clearTimer();
    const teams = state.teams.map(t => ({ ...t, pos: 0 }));
    state = freshState();
    state.teams = teams;
    setEvent('Jogo reiniciado.', null);
    broadcast();
  },
};

function leaveTeam(ws, explicit) {
  const c = clients.get(ws);
  if (!c || !c.color) return;
  const set = teamMembers.get(c.color);
  if (set) set.delete(ws);
  const team = teamByColor(c.color);
  if (team) {
    team.members = set ? set.size : 0;
    if (explicit && team.players) {   // saiu de propósito: sai da ordem. Caiu: fica na ordem e volta depois.
      const i = team.players.findIndex(p => p.pid === c.pid);
      if (i >= 0) {
        // se quem saiu era o último a desenhar, o "último" passa a ser o anterior dele.
        // Assim o próximo continua sendo quem vinha depois dele na ordem.
        if (team.lastDrawer === c.pid) team.lastDrawer = team.players.length > 1 ? team.players[(i - 1 + team.players.length) % team.players.length].pid : null;
        team.players.splice(i, 1);
      }
      team.drawerIdx = team.players.length ? (team.drawerIdx || 0) % team.players.length : 0;
    }
    if (team.members === 0 && state.phase === 'lobby') {
      state.teams = state.teams.filter(t => t !== team);
    }
  }
  c.color = null;
}

// ---------- envio ----------
function viewFor(c) {
  const t = currentTeam();
  let canSee = false;
  if (c && c.type === 'phone' && c.color && state.card) {
    if (['draw', 'judge'].includes(state.phase)) canSee = isDrawer(c, t);
    else if (state.phase === 'allplay') canSee = isDrawer(c, teamByColor(c.color));
  }
  return {
    t: 'state',
    now: Date.now(),
    you: c && c.color ? { color: c.color, name: c.name, pid: c.pid, drawer: isDrawer(c, teamByColor(c.color)) } : null,
    state: {
      ...state,
      card: state.card ? { cat: state.card.cat, word: canSee ? state.card.word : null } : null,
    },
  };
}
function send(ws, obj) { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); }
function broadcast() { markOnline(); saveState(); for (const [ws, c] of clients) send(ws, viewFor(c)); }

// ---------- HTTP ----------
const PUBLIC = path.join(__dirname, 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const routes = { '/': 'index.html', '/index.html': 'index.html', '/tv': 'tv.html', '/tv.html': 'tv.html' };

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const file = routes[url] || (url.startsWith('/') ? url.slice(1) : url);
  const fp = path.join(PUBLIC, path.normalize(file));
  if (!fp.startsWith(PUBLIC) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('404');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(fp).pipe(res);
});

const wss = new WebSocketServer({ server });
wss.on('connection', (ws) => {
  clients.set(ws, { type: 'unknown', color: null, name: '', pid: null });
  send(ws, { t: 'init', board: BOARD, categories: CATEGORIES, colors: TEAM_COLORS, roundSeconds: ROUND_SECONDS, joinUrl, qrSvg });
  send(ws, viewFor(clients.get(ws)));
  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (msg.t === 'tv') { clients.get(ws).type = 'tv'; return send(ws, viewFor(clients.get(ws))); }
    seen(clients.get(ws).pid);
    if (msg.t === 'ping') return;   // celular avisando que está vivo
    const fn = actions[msg.t];
    if (fn) fn(ws, msg);
  });
  ws.on('close', () => { const c = clients.get(ws); if (c) seen(c.pid); leaveTeam(ws); clients.delete(ws); broadcast(); });
  ws.on('error', () => {});
});

// heartbeat para derrubar conexões mortas
setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);
wss.on('connection', ws => { ws.isAlive = true; ws.on('pong', () => { ws.isAlive = true; }); });

// IP da rede local (para o QR code e para mostrar na TV)
function lanIps() {
  const ips = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const n of list) if (n.family === 'IPv4' && !n.internal) ips.push(n.address);
  }
  // prefere redes caseiras (192.168.x.x / 10.x.x.x)
  ips.sort((a, b) => (b.startsWith('192.168.') || b.startsWith('10.')) - (a.startsWith('192.168.') || a.startsWith('10.')));
  return ips;
}
let joinUrl = `http://localhost:${PORT}/`;
let qrSvg = '';
async function refreshJoinInfo() {
  const ip = lanIps()[0] || 'localhost';
  const url = `http://${ip}:${PORT}/`;
  if (url === joinUrl && qrSvg) return;
  joinUrl = url;
  try { qrSvg = await QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#111111', light: '#ffffff' } }); } catch { qrSvg = ''; }
}
setInterval(refreshJoinInfo, 15000);

loadState();
server.listen(PORT, '0.0.0.0', async () => {
  await refreshJoinInfo();
  const ips = lanIps();
  console.log('\n🎨  IMAGEM E AÇÃO rodando!\n');
  for (const ip of ips.length ? ips : ['localhost']) {
    console.log(`  TV (tabuleiro):  http://${ip}:${PORT}/tv`);
    console.log(`  Celulares:       http://${ip}:${PORT}/\n`);
  }
});
