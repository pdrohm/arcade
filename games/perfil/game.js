// Perfil — regras iguais ao jogo de tabuleiro da Grow.
// O núcleo do arcade cuida dos jogadores, do tempo e do salvamento. Aqui só ficam as regras.
const { CATEGORIES, CARDS } = require('./cards');

const BOARD_SIZE = 130, LAST = BOARD_SIZE - 1;
const CLUES = 20;
const TURN_MS = Number(process.env.PERFIL_TURN_MS) || 2 * 60 * 1000;
const BONUS_TABLE = [10, 8, 6, 4, 2];
const SPECIALS_PER_CARD = [2, 3, 3, 4];
const BONUS_SQUARES = new Set([7, 15, 23, 31, 39, 47, 55, 63, 71, 79, 87, 95, 103, 111, 119]);
const BOARD = Array.from({ length: BOARD_SIZE }, (_, i) => ({ i, start: i === 0, finish: i === LAST, bonus: BONUS_SQUARES.has(i) }));

const SPECIALS = [
  { type: 'avance', x: 1 }, { type: 'avance', x: 2 }, { type: 'avance', x: 3 },
  { type: 'volte', x: 1 }, { type: 'volte', x: 2 }, { type: 'volte', x: 3 },
  { type: 'escolhaAvance', x: 2 }, { type: 'escolhaAvance', x: 3 },
  { type: 'escolhaVolte', x: 2 }, { type: 'escolhaVolte', x: 3 },
  { type: 'percaVez' }, { type: 'percaVez' }, { type: 'ficha' },
];
const specialText = sp => ({
  avance: `Avance ${sp.x} casa${sp.x > 1 ? 's' : ''}`,
  volte: `Volte ${sp.x} casa${sp.x > 1 ? 's' : ''}`,
  escolhaAvance: `Escolha um jogador para avançar ${sp.x} casas`,
  escolhaVolte: `Escolha um jogador para voltar ${sp.x} casas`,
  percaVez: 'Perca a vez',
  ficha: 'Um palpite a qualquer hora (ficha azul)',
}[sp.type]);

const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const used = {};
for (const k of Object.keys(CATEGORIES)) used[k] = new Set();
function drawCard(withSpecials) {
  const cats = Object.keys(CATEGORIES).filter(k => CARDS[k] && CARDS[k].length);
  const cat = pick(cats), pool = CARDS[cat];
  if (used[cat].size >= pool.length) used[cat].clear();
  let idx; do { idx = rnd(pool.length); } while (used[cat].has(idx));
  used[cat].add(idx);
  const c = pool[idx];
  const slots = c.clues.slice(0, CLUES).map((text, i) => ({ n: i + 1, type: 'clue', text, used: false }));
  if (withSpecials) {
    const chosen = new Set();
    while (chosen.size < pick(SPECIALS_PER_CARD)) chosen.add(rnd(CLUES));
    for (const i of chosen) { const sp = pick(SPECIALS); slots[i] = { n: i + 1, type: sp.type, x: sp.x || 0, text: specialText(sp), used: false }; }
  }
  return { cat, answer: c.answer, slots };
}

module.exports = {
  meta: {
    id: 'perfil',
    name: 'Perfil',
    emoji: '🕵️',
    tagline: '20 dicas, 1 palpite. Quem descobrir primeiro anda mais.',
    art: 'linear-gradient(135deg,#f59e0b 0%,#b45309 55%,#3b1e00 100%)',
    minPlayers: 2, maxPlayers: 8,
    howTo: [
      'Cada rodada tem um mediador. Só ele vê a carta e lê as dicas em voz alta.',
      'Na sua vez, escolha um número de 1 a 20 e dê 1 palpite.',
      'Acertou: anda 1 casa por dica que sobrou. O mediador anda 1 por dica usada.',
      'Instruções (avance, volte, perca a vez) valem como a sua vez: sem palpite.',
      'Casa "?": carta bônus. Até 5 dicas e 1 palpite, valendo de 10 a 2 casas.',
    ],
  },

  create(api) {
    // estado só deste jogo
    let s = {
      phase: 'pick',        // pick | guess | choose | chip | bonus | bonusguess | win
      pos: {},              // pid -> casa
      chips: {},            // pid -> fichas azuis
      order: [],            // pids na ordem de jogo (congelada no começo)
      mediator: 0, turn: 0, round: 0,
      card: null, usedCount: 0, revealed: [], last: null,
      choose: null, chip: null, bonusQueue: [], bonus: null, winner: null,
    };

    // ----- ajudantes -----
    const alive = () => s.order.filter(pid => api.byPid(pid));
    const P = i => api.byPid(s.order[i]);
    const idx = pid => s.order.indexOf(pid);
    const cur = () => P(s.turn);
    const med = () => P(s.mediator);
    const pos = pid => s.pos[pid] || 0;
    const nextIdx = (i, skipMed = true) => {
      const n = s.order.length; if (!n) return 0;
      let j = i;
      for (let k = 0; k < n; k++) { j = (j + 1) % n; if (!api.byPid(s.order[j])) continue; if (!skipMed || j !== s.mediator) return j; }
      return (i + 1) % n;
    };

    function move(pid, delta) {
      const before = pos(pid);
      s.pos[pid] = Math.max(0, Math.min(LAST, before + delta));
      const p = api.byPid(pid);
      if (s.pos[pid] >= LAST) { api.clearTimer(); s.phase = 'win'; s.winner = pid; api.setEvent(`${p ? p.name : 'Alguém'} chegou ao FIM e venceu!`, p && p.color); return; }
      if (s.pos[pid] !== before && BOARD[s.pos[pid]].bonus && !s.bonusQueue.includes(pid)) s.bonusQueue.push(pid);
    }
    // depois de qualquer movimento: primeiro as cartas bônus pendentes, depois o destino
    function resume(after) {
      if (s.phase === 'win') return;
      if (s.bonusQueue.length) return startBonus(s.bonusQueue.shift(), after);
      if (after === 'end') return endRound();
      if (after === 'next') return nextGuesser();
      s.phase = after;
      if (!api.timerEnd) api.armTimer(TURN_MS);
    }
    function startBonus(pid, after) {
      const i = idx(pid);
      const judge = i === s.mediator ? nextIdx(i, false) : s.mediator;
      s.bonus = { player: pid, judge: s.order[judge], card: drawCard(false), picks: [], after };
      s.phase = 'bonus';
      api.armTimer(TURN_MS);
      const p = api.byPid(pid), j = api.byPid(s.order[judge]);
      api.setEvent(`${p.name} caiu na casa "?"! Carta bônus: até 5 dicas e 1 palpite. ${j ? j.name : 'O mediador'} julga.`, p.color);
    }
    function newRound() {
      s.round++;
      s.card = drawCard(true); s.usedCount = 0; s.revealed = []; s.last = null; s.choose = null; s.chip = null;
      s.turn = nextIdx(s.mediator);
      s.phase = 'pick';
      api.armTimer(TURN_MS);
      api.setEvent(`Rodada ${s.round}. ${med().name} é o mediador. Categoria: ${CATEGORIES[s.card.cat].name}. ${cur().name} escolhe a primeira dica.`, cur().color);
    }
    function endRound() { s.mediator = nextIdx(s.mediator, false); newRound(); }
    function score(pid) {
      const p = api.byPid(pid), m = med();
      const gain = CLUES - s.usedCount;
      api.setEvent(`${p.name} ACERTOU! Era "${s.card.answer}". ${p.name} anda ${gain} casa${gain !== 1 ? 's' : ''}; o mediador ${m.name} anda ${s.usedCount}.`, p.color);
      move(pid, gain);
      if (s.phase !== 'win') move(m.pid, s.usedCount);
      resume('end');
    }
    function nextGuesser() {
      if (s.usedCount >= CLUES) {
        const m = med();
        api.setEvent(`Ninguém acertou. Era "${s.card.answer}". O mediador ${m.name} anda ${CLUES} casas.`, m.color);
        move(m.pid, CLUES);
        return resume('end');
      }
      s.turn = nextIdx(s.turn);
      s.phase = 'pick';
      api.armTimer(TURN_MS);
      api.addEvent(`Vez de ${cur().name} escolher uma dica.`);
    }

    const inst = {
      start() {
        s.order = api.players.map(p => p.pid);
        for (const pid of s.order) { s.pos[pid] = 0; s.chips[pid] = 0; }
        s.mediator = 0; s.round = 0; s.bonusQueue = []; s.bonus = null; s.winner = null;
        newRound();
      },

      onTimeUp() {
        if (['pick', 'guess', 'choose'].includes(s.phase)) {
          const g = cur(); s.choose = null;
          api.setEvent(`⏰ Tempo esgotado! ${g ? g.name : 'Jogador'} perdeu a vez.`, g && g.color);
          nextGuesser();
        } else if (s.phase === 'bonus' || s.phase === 'bonusguess') {
          if (!s.bonus) return;
          const b = s.bonus, p = api.byPid(b.player);
          s.bonus = null;
          api.setEvent(`⏰ Tempo esgotado na carta bônus! ${p ? p.name : 'Jogador'} não ganhou casas. Era "${b.card.answer}".`, p && p.color);
          resume(b.after);
        }
      },

      action(p, msg) {
        const me = p.pid;
        const isMed = med() && med().pid === me;
        const isTurn = cur() && cur().pid === me;
        switch (msg.t) {
          case 'pick': {
            if (s.phase !== 'pick' || !isTurn) return;
            const slot = s.card.slots[Number(msg.n) - 1];
            if (!slot || slot.used) return;
            slot.used = true; s.usedCount++;
            s.last = { n: slot.n, text: slot.text, type: slot.type, by: p.name, color: p.color };
            s.revealed.push({ n: slot.n, text: slot.text, type: slot.type, by: p.name });
            switch (slot.type) {
              case 'clue':
                s.phase = 'guess';
                api.setEvent(`${p.name} pediu a dica ${slot.n}. Agora pode dar 1 palpite (ou passar).`, p.color);
                break;
              // toda instrução vale como a vez: sem palpite, passa para o próximo
              case 'avance':
                api.setEvent(`Dica ${slot.n}: AVANCE ${slot.x}! ${p.name} anda ${slot.x}. Sem palpite: a vez passa.`, p.color);
                move(me, slot.x); resume('next'); break;
              case 'volte':
                api.setEvent(`Dica ${slot.n}: VOLTE ${slot.x}! ${p.name} volta ${slot.x}. Sem palpite: a vez passa.`, p.color);
                move(me, -slot.x); resume('next'); break;
              case 'escolhaAvance': case 'escolhaVolte':
                s.choose = { type: slot.type, x: slot.x };
                s.phase = 'choose';
                api.setEvent(`Dica ${slot.n}: ${p.name} escolhe um jogador para ${slot.type === 'escolhaAvance' ? 'AVANÇAR' : 'VOLTAR'} ${slot.x} casas.`, p.color);
                break;
              case 'percaVez':
                api.setEvent(`Dica ${slot.n}: PERCA A VEZ! ${p.name} não dá palpite.`, p.color);
                nextGuesser(); break;
              case 'ficha':
                s.chips[me] = (s.chips[me] || 0) + 1;
                api.setEvent(`Dica ${slot.n}: ${p.name} ganhou uma FICHA AZUL (palpite a qualquer hora). Sem palpite agora: a vez passa.`, p.color);
                nextGuesser(); break;
            }
            return;
          }
          case 'choose': {
            if (s.phase !== 'choose' || !isTurn || !s.choose) return;
            const alvo = api.byPid(String(msg.pid || ''));
            if (!alvo || idx(alvo.pid) < 0) return;
            const ch = s.choose; s.choose = null;
            api.setEvent(`${p.name} escolheu ${alvo.name} para ${ch.type === 'escolhaAvance' ? 'avançar' : 'voltar'} ${ch.x} casas. Sem palpite: a vez passa.`, p.color);
            move(alvo.pid, ch.type === 'escolhaAvance' ? ch.x : -ch.x);
            resume('next');
            return;
          }
          case 'pass':
            if (s.phase !== 'guess' || !isTurn) return;
            api.setEvent(`${p.name} passou.`, p.color);
            nextGuesser(); return;
          case 'judge': {
            if (!isMed) return;
            if (s.phase === 'guess') {
              if (msg.ok) score(cur().pid);
              else { api.setEvent(`${cur().name} errou.`, cur().color); nextGuesser(); }
            } else if (s.phase === 'chip' && s.chip) {
              const who = s.chip.player, back = s.chip.back;
              s.chip = null;
              if (msg.ok) score(who);
              else {
                const q = api.byPid(who);
                api.setEvent(`${q ? q.name : 'Jogador'} errou o palpite da ficha azul. A ficha foi gasta.`, q && q.color);
                s.phase = back;
              }
            }
            return;
          }
          case 'chip': {
            if (isMed || (s.chips[me] || 0) < 1 || idx(me) < 0) return;
            if (!['pick', 'guess', 'choose'].includes(s.phase)) return;
            s.chips[me]--;
            s.chip = { player: me, back: s.phase };
            s.phase = 'chip';
            api.setEvent(`${p.name} usou a FICHA AZUL e vai dar um palpite agora! ${med().name} julga.`, p.color);
            return;
          }
          case 'bonusPick': {
            const b = s.bonus;
            if (s.phase !== 'bonus' || !b || b.player !== me || b.picks.length >= 5) return;
            const slot = b.card.slots[Number(msg.n) - 1];
            if (!slot || slot.used) return;
            slot.used = true; b.picks.push({ n: slot.n, text: slot.text });
            return;
          }
          case 'bonusGuess': {
            const b = s.bonus;
            if (s.phase !== 'bonus' || !b || b.player !== me || !b.picks.length) return;
            s.phase = 'bonusguess';
            const j = api.byPid(b.judge);
            api.setEvent(`${p.name} vai dar o palpite da carta bônus. ${j ? j.name : 'O juiz'} julga.`, p.color);
            return;
          }
          case 'bonusJudge': {
            const b = s.bonus;
            if (s.phase !== 'bonusguess' || !b || b.judge !== me) return;
            const dono = api.byPid(b.player), after = b.after, gain = BONUS_TABLE[b.picks.length - 1];
            s.bonus = null; api.clearTimer();
            if (msg.ok) {
              api.setEvent(`${dono ? dono.name : 'Jogador'} ACERTOU a carta bônus com ${b.picks.length} dica${b.picks.length > 1 ? 's' : ''}! Era "${b.card.answer}". Anda ${gain} casas.`, dono && dono.color);
              s.pos[b.player] = Math.min(LAST, pos(b.player) + gain);
              if (s.pos[b.player] >= LAST) { s.phase = 'win'; s.winner = b.player; api.setEvent(`${dono.name} chegou ao FIM e venceu!`, dono.color); }
            } else api.setEvent(`${dono ? dono.name : 'Jogador'} errou a carta bônus. Era "${b.card.answer}".`, dono && dono.color);
            if (s.phase !== 'win') resume(after);
            return;
          }
          case 'again':
            if (s.phase !== 'win') return;
            inst.start(); return;
        }
      },

      // quem trocou de celular mantém posição, fichas e lugar na ordem
      rekey(oldPid, newPid) {
        if (oldPid === newPid) return;
        s.order = s.order.map(x => (x === oldPid ? newPid : x));
        if (s.pos[oldPid] !== undefined) { s.pos[newPid] = s.pos[oldPid]; delete s.pos[oldPid]; }
        if (s.chips[oldPid] !== undefined) { s.chips[newPid] = s.chips[oldPid]; delete s.chips[oldPid]; }
        s.bonusQueue = s.bonusQueue.map(x => (x === oldPid ? newPid : x));
        if (s.bonus) { if (s.bonus.player === oldPid) s.bonus.player = newPid; if (s.bonus.judge === oldPid) s.bonus.judge = newPid; }
        if (s.chip && s.chip.player === oldPid) s.chip.player = newPid;
        if (s.winner === oldPid) s.winner = newPid;
      },
      onPlayerLeave(pid) {
        const i = idx(pid);
        if (i < 0) return;
        s.order.splice(i, 1);
        delete s.pos[pid]; delete s.chips[pid];
        s.bonusQueue = s.bonusQueue.filter(x => x !== pid);
        const fix = v => (v > i ? v - 1 : v);
        s.mediator = s.order.length ? fix(s.mediator) % s.order.length : 0;
        s.turn = s.order.length ? fix(s.turn) % s.order.length : 0;
        if (s.bonus && (s.bonus.player === pid || s.bonus.judge === pid)) { const after = s.bonus.after; s.bonus = null; resume(after); }
        else if (s.order.length > 1 && s.turn === s.mediator && s.phase !== 'win') s.turn = nextIdx(s.mediator);
      },

      view(me, type) {
        const isMed = me && med() && med().pid === me.pid;
        const isJudge = me && s.bonus && s.bonus.judge === me.pid;
        // só o mediador lê o texto das dicas; instruções todos veem (mexem no tabuleiro)
        const canRead = x => isMed || (x.used && x.type && x.type !== 'clue');
        const out = {
          phase: s.phase, round: s.round, usedCount: s.usedCount, clues: CLUES, turnMs: TURN_MS,
          board: BOARD, categories: CATEGORIES, bonusTable: BONUS_TABLE,
          order: s.order, mediator: s.mediator, turn: s.turn,
          pos: s.pos, chips: s.chips, winner: s.winner, choose: s.choose,
          chip: s.chip, last: null, revealed: [], card: null, bonus: null,
        };
        if (s.card) out.card = { cat: s.card.cat, answer: isMed ? s.card.answer : null, slots: s.card.slots.map(x => ({ n: x.n, used: x.used, type: isMed || x.used ? x.type : 'clue', text: canRead(x) ? x.text : null })) };
        if (s.last) out.last = { ...s.last, text: canRead({ used: true, type: s.last.type }) ? s.last.text : null };
        out.revealed = s.revealed.map(r => ({ ...r, text: canRead({ used: true, type: r.type }) ? r.text : null }));
        if (s.bonus) out.bonus = {
          player: s.bonus.player, judge: s.bonus.judge, after: s.bonus.after,
          picks: s.bonus.picks.map(x => ({ n: x.n, text: isJudge ? x.text : null })),
          card: { cat: s.bonus.card.cat, answer: isJudge ? s.bonus.card.answer : null, slots: s.bonus.card.slots.map(x => ({ n: x.n, used: x.used })) },
        };
        return out;
      },

      serialize: () => ({ s, used: Object.fromEntries(Object.entries(used).map(([k, v]) => [k, [...v]])) }),
      restore(data) {
        if (!data || !data.s) return;
        s = { ...s, ...data.s };
        for (const [k, v] of Object.entries(data.used || {})) if (used[k]) used[k] = new Set(v);
      },
    };
    return inst;
  },
};
