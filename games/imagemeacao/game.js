// Imagem e Ação — regras do tabuleiro clássico, adaptadas para TV + celulares.
// O núcleo do arcade cuida dos jogadores, do tempo e do salvamento.
const { CATEGORIES, WORDS } = require('./cards');

const BOARD_SIZE = 52, LAST = BOARD_SIZE - 1;
const ROUND_MS = Number(process.env.IEA_ROUND_MS) || 60 * 1000;
const DICE_MS = 1100;
const CAT_SEQ = ['P', 'O', 'A', 'D', 'L'];
const TEAMS = [
  { key: 'roxo', name: 'Roxo', hex: '#a855f7' },
  { key: 'rosa', name: 'Rosa', hex: '#ec4899' },
  { key: 'ciano', name: 'Ciano', hex: '#22d3ee' },
  { key: 'verde', name: 'Verde', hex: '#22c55e' },
];
function makeBoard() {
  const b = [{ i: 0, cat: null, start: true, allPlay: false }];
  for (let i = 1; i < BOARD_SIZE; i++) b.push({ i, cat: CAT_SEQ[(i - 1) % CAT_SEQ.length], allPlay: i % 4 === 0 && i < LAST });
  b[LAST].cat = 'L'; b[LAST].finish = true; b[LAST].allPlay = false;
  return b;
}
const BOARD = makeBoard();

const used = { P: new Set(), O: new Set(), A: new Set(), D: new Set(), L: new Set() };
function drawCard(cat) {
  const pool = WORDS[cat];
  if (used[cat].size >= pool.length) used[cat].clear();
  let word; do { word = pool[Math.floor(Math.random() * pool.length)]; } while (used[cat].has(word));
  used[cat].add(word);
  return { cat, word };
}

module.exports = {
  meta: {
    id: 'imagemeacao',
    name: 'Imagem e Ação',
    emoji: '🎨',
    tagline: 'Desenhe, adivinhe e avance. Em equipes, com dado e cronômetro.',
    art: 'linear-gradient(135deg,#a855f7 0%,#7e22ce 50%,#1e1b4b 100%)',
    minPlayers: 2, maxPlayers: 8,
    howTo: [
      'Cada um escolhe uma equipe. Dentro da equipe, a ordem de desenhar é a ordem de entrada.',
      'Na vez da equipe, o desenhista joga o dado e vê a palavra. Só ele.',
      'A TV mostra a casa alvo. O peão só anda se a equipe acertar.',
      'Acertou ou errou, a vez passa para a próxima equipe. Ninguém joga duas vezes seguidas.',
      'Casa ⚡: todas as equipes desenham a mesma palavra. Quem acertar primeiro anda.',
    ],
  },

  create(api) {
    let s = {
      phase: 'setup',        // setup | roll | rolling | draw | allplay | judge | win
      teams: [],             // { key, pos, players:[pid], lastDrawer }
      turn: 0, round: 0,
      dice: null, target: null, card: null,
      drawers: {},           // key -> pid de quem desenha nesta vez
      timeUp: false, winner: null,
    };

    const team = k => s.teams.find(t => t.key === k) || null;
    const cur = () => s.teams[s.turn] || null;
    const info = k => TEAMS.find(t => t.key === k);
    const teamOf = pid => s.teams.find(t => t.players.includes(pid)) || null;
    const online = t => { const on = api.onlinePids(); return t.players.filter(pid => on.has(pid)); };
    const nameOf = pid => { const p = api.byPid(pid); return p ? p.name : 'Alguém'; };

    // A ordem dentro da equipe é fixa. Não pula ninguém: quem desenhou não repete.
    function pickDrawer(t) {
      const ps = t.players.filter(pid => api.byPid(pid));
      if (!ps.length) return null;
      let i = 0;
      const li = ps.indexOf(t.lastDrawer);
      if (li >= 0) i = (li + 1) % ps.length;
      t.lastDrawer = ps[i];
      return ps[i];
    }
    function assignDrawer(t) {
      if (!t) return;
      s.drawers = { [t.key]: pickDrawer(t) };
      const n = s.drawers[t.key] && nameOf(s.drawers[t.key]);
      if (n) api.addEvent(`${n} desenha.`);
    }
    const isDrawer = (pid, t) => !!(t && s.drawers[t.key] && s.drawers[t.key] === pid);

    function nextTurn(reason) {
      api.clearTimer();
      s.card = null; s.target = null; s.timeUp = false;
      if (s.teams.length) s.turn = (s.turn + 1) % s.teams.length;
      s.phase = 'roll'; s.round++;
      const t = cur();
      if (reason) api.setEvent(reason, null);
      if (t) api.addEvent(`Vez da equipe ${info(t.key).name}.`);
      assignDrawer(t);
    }
    function finishIfWon(t) {
      if (t.pos < LAST) return false;
      api.clearTimer();
      s.card = null; s.target = null; s.timeUp = false;
      s.phase = 'win'; s.winner = t.key;
      api.setEvent(`A equipe ${info(t.key).name} venceu!`, null);
      return true;
    }

    const inst = {
      start() {
        s.phase = 'setup'; s.teams = []; s.turn = 0; s.round = 0;
        s.dice = null; s.target = null; s.card = null; s.drawers = {}; s.winner = null;
        api.setEvent('Escolham as equipes no celular. Precisa de 2 equipes ou mais.', null);
      },

      onTimeUp() {
        s.timeUp = true;
        if (s.phase === 'draw') { s.phase = 'judge'; api.setEvent('⏰ Tempo esgotado! Acertou ou errou?', null); }
        else if (s.phase === 'allplay') nextTurn('⏰ Ninguém acertou a tempo.');
      },

      action(p, msg) {
        const me = p.pid;
        const mine = teamOf(me);
        switch (msg.t) {
          case 'team': {                                   // entrar numa equipe (só na preparação)
            if (s.phase !== 'setup') return;
            const k = String(msg.key || '');
            if (!TEAMS.some(t => t.key === k)) return;
            for (const t of s.teams) t.players = t.players.filter(x => x !== me);
            s.teams = s.teams.filter(t => t.players.length);
            let t = team(k);
            if (!t) { t = { key: k, pos: 0, players: [], lastDrawer: null }; s.teams.push(t); }
            t.players.push(me);
            s.teams.sort((a, b) => TEAMS.findIndex(x => x.key === a.key) - TEAMS.findIndex(x => x.key === b.key));
            api.setEvent(`${p.name} entrou na equipe ${info(k).name}.`, p.color);
            return;
          }
          case 'begin': {
            if (s.phase !== 'setup') return;
            if (s.teams.length < 2) return;
            for (const t of s.teams) { t.pos = 0; t.lastDrawer = null; }
            s.turn = 0; s.round = 1; s.phase = 'roll';
            api.setEvent(`Começou! Vez da equipe ${info(cur().key).name}.`, null);
            assignDrawer(cur());
            return;
          }
          case 'roll': {
            const t = cur();
            if (s.phase !== 'roll' || !isDrawer(me, t)) return;
            s.phase = 'rolling'; s.dice = null;
            api.broadcast();
            const round = s.round;
            setTimeout(() => {
              if (s.round !== round || s.phase !== 'rolling') return;
              const d = 1 + Math.floor(Math.random() * 6);
              s.dice = d;
              s.target = Math.min(t.pos + d, LAST);      // o peão só anda se acertar
              const sq = BOARD[s.target];
              s.card = drawCard(sq.cat);
              s.timeUp = false;
              if (sq.allPlay) {
                s.phase = 'allplay';
                for (const o of s.teams) if (o !== t) s.drawers[o.key] = pickDrawer(o);
                api.setEvent(`Tirou ${d}. Casa ⚡ TODOS JOGAM! Cada equipe desenha a mesma palavra.`, null);
              } else {
                s.phase = 'draw';
                api.setEvent(`Tirou ${d}. Categoria: ${CATEGORIES[sq.cat].name}. Acertando, anda até a casa ${s.target}.`, null);
              }
              api.broadcast();
            }, DICE_MS);
            return;
          }
          case 'swap': {
            const t = cur();
            if (!['draw', 'allplay'].includes(s.phase) || api.timerEnd || !isDrawer(me, t)) return;
            s.card = drawCard(s.card.cat);
            return;
          }
          case 'timer': {
            const t = cur();
            if (!['draw', 'allplay'].includes(s.phase) || api.timerEnd || !isDrawer(me, t)) return;
            s.timeUp = false;
            api.armTimer(ROUND_MS);
            api.setEvent('Desenhando! Tempo correndo.', null);
            return;
          }
          case 'result': {
            const t = cur();
            if (!['draw', 'judge'].includes(s.phase) || !isDrawer(me, t)) return;
            const name = info(t.key).name;
            if (msg.ok) {
              if (s.target !== null) t.pos = s.target;
              if (!finishIfWon(t)) nextTurn(`Equipe ${name} acertou e andou até a casa ${t.pos}!`);
            } else nextTurn(`Equipe ${name} não acertou. O peão fica na casa ${t.pos}.`);
            return;
          }
          case 'allwin': {
            if (s.phase !== 'allplay' || !mine) return;
            const t = cur();
            mine.pos = mine === t && s.target !== null ? s.target : Math.min(mine.pos + (s.dice || 0), LAST);
            if (!finishIfWon(mine)) nextTurn(`Equipe ${info(mine.key).name} acertou primeiro e andou até a casa ${mine.pos}!`);
            return;
          }
          case 'allnone':
            if (s.phase !== 'allplay') return;
            nextTurn('Ninguém acertou.');
            return;
          case 'again':
            if (s.phase !== 'win') return;
            inst.start(); return;
        }
      },

      rekey(oldPid, newPid) {
        for (const t of s.teams) {
          t.players = t.players.map(x => (x === oldPid ? newPid : x));
          if (t.lastDrawer === oldPid) t.lastDrawer = newPid;
          if (s.drawers[t.key] === oldPid) s.drawers[t.key] = newPid;
        }
      },
      onPlayerLeave(pid) {
        for (const t of s.teams) {
          const i = t.players.indexOf(pid);
          if (i < 0) continue;
          if (t.lastDrawer === pid) t.lastDrawer = t.players.length > 1 ? t.players[(i - 1 + t.players.length) % t.players.length] : null;
          t.players.splice(i, 1);
          if (s.drawers[t.key] === pid) { s.drawers[t.key] = pickDrawer(t); api.addEvent(s.drawers[t.key] ? `${nameOf(s.drawers[t.key])} desenha agora.` : ''); }
        }
        const antes = s.teams.length;
        s.teams = s.teams.filter(t => t.players.length);
        if (s.teams.length !== antes) { s.turn = s.turn % Math.max(1, s.teams.length); if (s.phase !== 'setup' && s.teams.length < 2) { s.phase = 'setup'; api.setEvent('Ficou só uma equipe. Escolham as equipes de novo.', null); } }
      },

      view(me, type) {
        const t = cur();
        const mine = me ? teamOf(me.pid) : null;
        let canSee = false;
        if (me && s.card) {
          if (['draw', 'judge'].includes(s.phase)) canSee = isDrawer(me.pid, t);
          else if (s.phase === 'allplay') canSee = isDrawer(me.pid, mine);
        }
        return {
          phase: s.phase, round: s.round, turn: s.turn, dice: s.dice, target: s.target,
          timeUp: s.timeUp, winner: s.winner, drawers: s.drawers, roundMs: ROUND_MS, turnMs: ROUND_MS,
          board: BOARD, categories: CATEGORIES, teamList: TEAMS,
          teams: s.teams.map(x => ({ key: x.key, pos: x.pos, players: x.players, lastDrawer: x.lastDrawer })),
          myTeam: mine ? mine.key : null,
          amDrawer: !!(me && isDrawer(me.pid, s.phase === 'allplay' ? mine : t)),
          card: s.card ? { cat: s.card.cat, word: canSee ? s.card.word : null } : null,
        };
      },

      serialize: () => ({ s, used: Object.fromEntries(Object.entries(used).map(([k, v]) => [k, [...v]])) }),
      restore(data) {
        if (!data || !data.s) return;
        s = { ...s, ...data.s };
        if (s.phase === 'rolling') { s.phase = 'roll'; s.dice = null; s.target = null; s.card = null; }
        for (const [k, v] of Object.entries(data.used || {})) if (used[k]) used[k] = new Set(v);
      },
    };
    return inst;
  },
};
