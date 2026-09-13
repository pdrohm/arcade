// Top 10. A tela mostra só o título de um ranking de dez ("Os 10 países mais populosos").
// Ninguém vê a lista. Na sua vez você fala em voz alta um item que acha que está lá e aperta FALEI.
// Achou que a resposta anterior é furada? Aperte DUVIDO: a lista se revela, a turma vota se valia
// e alguém perde uma vida — quem falou, se não valia; quem duvidou, se valia.
// A carta não acaba nos 10: enquanto ninguém duvidar, o povo continua falando (e blefando).
//
// Dois modos, escolhidos no menu de regras:
//   celulares — um celular por pessoa, cada um aperta o que é seu (o padrão).
//   mediador  — um celular só. O mediador digita os nomes de quem está na mesa e toca tudo:
//               FALEI por quem respondeu, DUVIDO dizendo quem duvidou, e ✅/❌ no fim.
//               Os participantes são "locais": existem só aqui, com id '#0', '#1'… e não
//               precisam de vaga na sala. O mediador pode jogar também — em Top 10 ele não
//               vê nada antes da revelação, então não leva vantagem nenhuma.
const { CATEGORIES, CARDS } = require('./cards');

const VOTE_MS = Number(process.env.T10_VOTE_MS) || 25 * 1000;   // tempo da votação depois do DUVIDO
const TURN_SECS = [0, 10, 15, 20, 30];                          // 0 = sem tempo
const LIVES_OPTS = [2, 3, 4, 5];
const MAX_NAMES = 8, NAME_MAX = 20;
const CAT_IDS = CATEGORIES.map(c => c.id);
const DEFAULT_CFG = { lives: 4, turnSec: 20, cats: CAT_IDS.slice(), solo: false, names: [] };
const clone = o => JSON.parse(JSON.stringify(o));
const catInfo = id => CATEGORIES.find(c => c.id === id) || { id, name: '', emoji: '🔟' };
const isLocal = pid => typeof pid === 'string' && pid.charAt(0) === '#';

module.exports = {
  meta: {
    id: 'top10', name: 'Top 10', emoji: '🔟',
    tagline: 'Um ranking de dez que ninguém vê. Fale um item — ou duvide de quem falou.',
    art: 'linear-gradient(135deg,#facc15 0%,#f97316 45%,#7c2d12 100%)',
    // 1 jogador basta no modo mediador: um celular só conduz a mesa inteira.
    minPlayers: 1, maxPlayers: 8,
    howTo: [
      'A tela mostra só o título de um Top 10. A lista fica escondida.',
      'Na sua vez, fale em voz alta um item que você acha que está na lista e aperte FALEI.',
      'Não precisa parar nos dez: enquanto ninguém duvidar, o jogo continua.',
      'Achou a resposta anterior furada? Aperte DUVIDO: a lista se revela e a turma vota.',
      'Valia? Quem duvidou perde uma vida. Não valia? Quem falou perde.',
      'Em dupla os dois votam, com a lista à vista: se discordarem, a resposta vale.',
      'Só tem um celular? Use o modo mediador: você digita os nomes da mesa e toca tudo.',
      'São 4 vidas. Sem vidas, você está fora. Sobrou um, venceu.',
    ],
  },

  create(api) {
    let s = {
      phase: 'setup',                 // setup | play | reveal | result | end
      cfg: clone(DEFAULT_CFG),
      solo: false,                    // a partida em andamento é do modo mediador?
      locals: [],                     // [{ pid:'#0', name, color }] — só no modo mediador
      order: [], ti: 0,               // ordem de jogo (pids) e índice da vez
      lives: {}, out: [],             // vidas por pid e eliminados (na ordem em que caíram)
      card: null, usedCards: [], round: 0,
      said: [],                       // pids na ordem em que falaram nesta carta
      last: null,                     // { pid } último a falar: é dele que dá para duvidar
      doubt: null,                    // { by, target, votes: { pid: bool } }
      result: null,                   // { by, target, valid, loser, sim, nao, timeout }
      winner: null,
      fx: null, fxId: 0,              // último efeito, para as telas animarem
    };

    // ---------- participantes: celular conectado ou nome digitado pelo mediador ----------
    const localOf = pid => s.locals.find(x => x.pid === pid) || null;
    const partOf = pid => (isLocal(pid) ? localOf(pid) : api.byPid(pid));
    const exists = pid => !!partOf(pid);
    const alive = pid => exists(pid) && (s.lives[pid] || 0) > 0;
    const alives = () => s.order.filter(alive);
    const cur = () => s.order[s.ti] || null;
    const nameOf = pid => { const p = partOf(pid); return p ? p.name : 'Alguém'; };
    const colorOf = pid => { const p = partOf(pid); return p ? p.color : null; };
    const fx = (k, extra) => { s.fx = { id: ++s.fxId, k, ...(extra || {}) }; };
    const revealed = () => ['reveal', 'result', 'end'].includes(s.phase);

    function advance() {                                   // passa a vez para o próximo vivo
      for (let i = 1; i <= s.order.length; i++) {
        const j = (s.ti + i) % s.order.length;
        if (alive(s.order[j])) { s.ti = j; return true; }
      }
      return alive(cur());
    }
    function drawCard() {                                  // carta nova, sem repetir enquanto houver outras
      const pool = [];
      for (const id of s.cfg.cats) (CARDS[id] || []).forEach((c, i) => pool.push({ cat: id, i }));
      if (!pool.length) return null;
      let left = pool.filter(x => !s.usedCards.includes(x.cat + ':' + x.i));
      if (!left.length) { s.usedCards = []; left = pool; }
      const pick = left[Math.floor(Math.random() * left.length)];
      s.usedCards.push(pick.cat + ':' + pick.i);
      const c = CARDS[pick.cat][pick.i];
      return { cat: pick.cat, t: c.t, src: c.s || '', items: c.items.slice() };
    }
    function newCard() {
      s.card = drawCard();
      s.said = []; s.last = null; s.doubt = null; s.result = null;
      s.round++;
      fx('newcard', { round: s.round });
    }
    function finish(pid) {
      api.clearTimer();
      s.phase = 'end'; s.winner = pid || null; s.doubt = null; s.last = null;
      fx('win', { pid: pid || null });
      api.setEvent(pid ? `🏆 ${nameOf(pid)} venceu o Top 10!` : 'Fim de jogo.', pid ? colorOf(pid) : null);
    }
    function startTurn() {                                 // arma o relógio da vez (ou termina o jogo)
      const list = alives();
      if (!list.length) { api.clearTimer(); s.phase = 'setup'; s.doubt = null; s.last = null; return; }
      if (list.length === 1) return finish(list[0]);
      if (!alive(cur())) advance();
      s.phase = 'play';
      if (s.cfg.turnSec) api.armTimer(s.cfg.turnSec * 1000); else api.clearTimer();
    }
    function loseLife(pid, why) {
      if (!alive(pid)) return;
      s.lives[pid] = Math.max(0, (s.lives[pid] || 0) - 1);
      if (s.lives[pid] <= 0) {
        if (!s.out.includes(pid)) s.out.push(pid);
        fx('out', { pid, why });
        api.addEvent(`💀 ${nameOf(pid)} está fora!`);
      } else {
        fx('life', { pid, why });
        api.addEvent(`💔 ${s.lives[pid]} vida${s.lives[pid] > 1 ? 's' : ''}.`);
      }
    }
    // Quem julga: todo mundo da sala menos os dois envolvidos (eliminado também vota).
    // Na dupla não sobra júri: aí os próprios dois votam. Se discordarem, dá empate — e
    // empate vale para quem falou, ou seja, a dúvida é que tem que se provar.
    // No modo mediador não há votação: quem aperta ✅/❌ é o celular que conduz.
    function voters() {
      if (!s.doubt || s.solo) return [];
      const juri = api.players.filter(p => p.pid !== s.doubt.by && p.pid !== s.doubt.target).map(p => p.pid);
      if (juri.length) return juri;
      return api.players.filter(p => p.pid === s.doubt.by || p.pid === s.doubt.target).map(p => p.pid);
    }
    function checkVote() {
      if (!s.doubt || s.solo) return;
      if (voters().every(pid => s.doubt.votes[pid] !== undefined)) resolveDoubt();
    }
    function resolveDoubt() {
      if (!s.doubt) return;
      const vals = voters().map(pid => s.doubt.votes[pid]).filter(x => x !== undefined);
      const sim = vals.filter(x => x === true).length, nao = vals.filter(x => x === false).length;
      settleDoubt(!(nao > sim), sim, nao);                 // empate (e ninguém votando) = vale
    }
    function settleDoubt(valid, sim, nao) {
      const d = s.doubt;
      if (!d) return;
      api.clearTimer();
      const loser = valid ? d.by : d.target;
      s.doubt = null; s.last = null; s.phase = 'result';
      s.result = { by: d.by, target: d.target, valid, loser, sim: sim || 0, nao: nao || 0, timeout: false };
      api.setEvent(valid
        ? `✅ Valia! A resposta de ${nameOf(d.target)} estava na lista — ${nameOf(d.by)} duvidou à toa.`
        : `❌ Não valia! ${nameOf(d.target)} chutou e ${nameOf(d.by)} pegou.`, colorOf(loser));
      loseLife(loser, 'doubt');
      fx('result', { loser, valid });
      if (alives().length <= 1) finish(alives()[0] || null);
    }
    function openDoubt(byPid) {
      api.clearTimer();
      s.doubt = { by: byPid, target: s.last.pid, votes: {} };
      s.phase = 'reveal';
      if (!s.solo) api.armTimer(VOTE_MS);                  // no modo mediador não há relógio de votação
      fx('doubt', { by: byPid, target: s.doubt.target });
      api.setEvent(`🚨 ${nameOf(byPid)} duvidou de ${nameOf(s.doubt.target)}! A resposta estava na lista?`, colorOf(byPid));
      checkVote();
    }
    function endByTime() {                                 // acabou o tempo da vez: perde vida e revela a lista
      const pid = cur();
      api.clearTimer();
      s.phase = 'result';
      s.result = { by: null, target: pid, valid: false, loser: pid, sim: 0, nao: 0, timeout: true };
      api.setEvent(`⏰ Tempo! ${nameOf(pid)} não respondeu.`, colorOf(pid));
      loseLife(pid, 'time');
      fx('result', { loser: pid, valid: false });
      if (alives().length <= 1) finish(alives()[0] || null);
    }
    function nextCard() {
      if (s.phase === 'end') return;
      advance();                                           // segue a ordem: começa o próximo da roda
      newCard();
      startTurn();
      if (s.phase === 'play') api.setEvent(`${s.card.t}. Começa ${nameOf(cur())}.`, colorOf(cur()));
    }
    const limpaNome = x => String(x || '').trim().replace(/\s+/g, ' ').slice(0, NAME_MAX);

    const inst = {
      start() {
        s.phase = 'setup'; s.order = []; s.out = []; s.lives = {}; s.ti = 0;
        s.card = null; s.usedCards = []; s.round = 0;
        s.said = []; s.last = null; s.doubt = null; s.result = null; s.winner = null;
        s.solo = false; s.locals = [];
        api.clearTimer();
        api.setEvent('Ajustem as regras no celular e toquem em "Começar".', null);
      },

      onTimeUp() {
        if (s.phase === 'reveal') return resolveDoubt();    // no modo mediador não há relógio aqui
        if (s.phase === 'play') return endByTime();
      },

      action(p, msg) {
        switch (msg.t) {
          case 'config': {                                 // qualquer um ajusta as regras antes de começar
            if (s.phase !== 'setup') return;
            const c = msg.cfg || {};
            if (c.lives !== undefined) s.cfg.lives = LIVES_OPTS.includes(Number(c.lives)) ? Number(c.lives) : s.cfg.lives;
            if (c.turnSec !== undefined) s.cfg.turnSec = TURN_SECS.includes(Number(c.turnSec)) ? Number(c.turnSec) : s.cfg.turnSec;
            if (c.solo !== undefined) s.cfg.solo = !!c.solo;
            if (Array.isArray(c.names)) {
              const vistos = [];
              for (const x of c.names) {
                const n = limpaNome(x);
                if (n && !vistos.some(v => v.toLowerCase() === n.toLowerCase())) vistos.push(n);
                if (vistos.length >= MAX_NAMES) break;
              }
              s.cfg.names = vistos;
            }
            if (Array.isArray(c.cats)) {
              const list = CAT_IDS.filter(id => c.cats.includes(id));
              if (list.length) s.cfg.cats = list;
            }
            if (c.reset) s.cfg = clone(DEFAULT_CFG);
            api.setEvent(`${p.name} mudou as regras.`, p.color);
            return;
          }

          case 'begin': {
            if (s.phase !== 'setup') return;
            if (!s.cfg.cats.length) return;
            s.solo = !!s.cfg.solo;
            if (s.solo) {                                  // a roda são os nomes digitados
              const cores = api.colors || [];
              s.locals = s.cfg.names.map((n, i) => ({
                pid: '#' + i, name: n,
                color: cores.length ? cores[i % cores.length].key : null,
              }));
              s.order = s.locals.map(x => x.pid);
            } else {
              s.locals = [];
              s.order = api.players.map(x => x.pid);
            }
            if (s.order.length < 2) return;
            s.lives = {}; for (const pid of s.order) s.lives[pid] = s.cfg.lives;
            s.out = []; s.usedCards = []; s.round = 0; s.ti = 0; s.winner = null;
            newCard();
            startTurn();
            api.setEvent(`${s.card.t}. Começa ${nameOf(cur())}.`, colorOf(cur()));
            return;
          }

          // "falei". Com um celular por pessoa, só o jogador da vez aperta.
          // No modo mediador, quem aperta é o celular que conduz, pelo jogador da vez.
          case 'said': {
            if (s.phase !== 'play') return;
            if (!s.solo && p.pid !== cur()) return;
            const quem = cur();
            if (!quem) return;
            s.said.push(quem);
            s.last = { pid: quem };
            fx('said', { pid: quem, n: s.said.length });
            advance();
            startTurn();
            if (s.phase === 'play') api.setEvent(`${nameOf(quem)} respondeu. Vez de ${nameOf(cur())}.`, colorOf(quem));
            return;
          }

          // DUVIDO. Com celulares, quem duvida é quem apertou. No modo mediador o celular
          // diz de quem foi a dúvida (msg.by), porque quem gritou não tem tela.
          case 'doubt': {
            if (s.phase !== 'play' || !s.last) return;
            const by = s.solo ? String(msg.by || '') : p.pid;
            if (!alive(by) || by === s.last.pid) return;
            return openDoubt(by);
          }

          case 'vote': {                                   // os dois envolvidos não votam (a não ser na dupla)
            if (s.phase !== 'reveal' || !s.doubt || s.solo) return;
            if (!voters().includes(p.pid)) return;
            s.doubt.votes[p.pid] = !!msg.ok;
            checkVote();
            return;
          }

          case 'judge': {                                  // modo mediador: o celular que conduz decide
            if (s.phase !== 'reveal' || !s.doubt || !s.solo) return;
            return settleDoubt(!!msg.ok, 0, 0);
          }

          case 'next': if (s.phase === 'result') nextCard(); return;
          case 'again': if (s.phase === 'end') inst.start(); return;
        }
      },

      rekey(o, n) {
        if (s.solo) return;                                // nome digitado não troca de celular
        s.order = s.order.map(x => (x === o ? n : x));
        s.out = s.out.map(x => (x === o ? n : x));
        s.said = s.said.map(x => (x === o ? n : x));
        if (s.lives[o] !== undefined) { s.lives[n] = s.lives[o]; delete s.lives[o]; }
        if (s.last && s.last.pid === o) s.last.pid = n;
        if (s.winner === o) s.winner = n;
        if (s.fx) { if (s.fx.pid === o) s.fx.pid = n; if (s.fx.by === o) s.fx.by = n; if (s.fx.target === o) s.fx.target = n; if (s.fx.loser === o) s.fx.loser = n; }
        if (s.result) {
          if (s.result.by === o) s.result.by = n;
          if (s.result.target === o) s.result.target = n;
          if (s.result.loser === o) s.result.loser = n;
        }
        if (s.doubt) {
          if (s.doubt.by === o) s.doubt.by = n;
          if (s.doubt.target === o) s.doubt.target = n;
          if (s.doubt.votes[o] !== undefined) { s.doubt.votes[n] = s.doubt.votes[o]; delete s.doubt.votes[o]; }
        }
      },

      onPlayerLeave(pid) {
        if (s.solo) return;                                // a mesa é de nomes digitados: sair não mexe na partida
        s.said = s.said.filter(x => x !== pid);
        if (s.phase === 'setup' || s.phase === 'end') { s.order = s.order.filter(x => x !== pid); return; }
        if (s.doubt) {
          delete s.doubt.votes[pid];
          // saiu um dos dois envolvidos: a duvidada morre com ele e a carta recomeça
          if (s.doubt.by === pid || s.doubt.target === pid) {
            s.doubt = null; s.last = null;
            api.setEvent('A duvidada caiu com quem saiu. Carta nova.', null);
            newCard();
            return startTurn();
          }
          return checkVote();
        }
        if (s.last && s.last.pid === pid) s.last = null;   // não dá para duvidar de quem saiu
        if (alives().length <= 1) return startTurn();      // vira vitória (ou volta ao setup se ninguém sobrou)
        if (cur() === pid) { advance(); startTurn(); }
      },

      view(me) {
        const ver = revealed();
        const ordem = s.order.filter(exists);
        const out = {
          phase: s.phase, round: s.round, solo: s.solo,
          cfg: { ...s.cfg }, cats: CATEGORIES, catIds: CAT_IDS, turnSecs: TURN_SECS, livesOpts: LIVES_OPTS,
          maxNames: MAX_NAMES,
          order: ordem,
          // a mesa inteira num lugar só: serve para nome digitado e para celular conectado
          roster: ordem.map(pid => {
            const part = partOf(pid);
            return {
              pid, name: part ? part.name : '?', color: part ? part.color : null,
              lives: s.lives[pid] || 0, out: s.out.includes(pid),
              on: isLocal(pid) ? true : !!(part && part.on !== false),
              local: isLocal(pid),
            };
          }),
          cur: s.phase === 'play' ? cur() : null,
          lives: s.lives, out: s.out, maxLives: s.cfg.lives,
          said: s.said, saidCount: s.said.length,
          last: s.last ? s.last.pid : null,
          // a lista SÓ sai do servidor depois do DUVIDO (nem a TV recebe antes)
          card: s.card ? {
            t: s.card.t, src: s.card.src, cat: s.card.cat,
            catName: catInfo(s.card.cat).name, catEmoji: catInfo(s.card.cat).emoji,
            items: ver ? s.card.items : null, n: s.card.items.length,
          } : null,
          doubt: s.doubt ? { by: s.doubt.by, target: s.doubt.target, votes: s.doubt.votes, voters: voters() } : null,
          result: s.result, winner: s.winner, fx: s.fx,
          turnMs: s.phase === 'reveal' && !s.solo ? VOTE_MS : s.cfg.turnSec * 1000,
          turnSec: s.cfg.turnSec,
        };
        if (me) out.mine = s.solo ? {
          // no modo mediador quem conduz é qualquer celular da sala: todos os botões ficam aqui
          inGame: false, alive: false, mediator: true,
          myTurn: s.phase === 'play', canDoubt: s.phase === 'play' && !!s.last,
          canVote: false, canJudge: s.phase === 'reveal' && !!s.doubt, myVote: null,
        } : {
          inGame: s.order.includes(me.pid),
          alive: alive(me.pid),
          mediator: false,
          myTurn: s.phase === 'play' && cur() === me.pid,
          canDoubt: s.phase === 'play' && !!s.last && s.last.pid !== me.pid && alive(me.pid),
          canVote: s.phase === 'reveal' && !!s.doubt && voters().includes(me.pid),
          canJudge: false,
          myVote: s.doubt && s.doubt.votes[me.pid] !== undefined ? s.doubt.votes[me.pid] : null,
        };
        return out;
      },

      serialize: () => ({ s }),
      restore(d) {
        if (!d || !d.s) return;
        s = { ...s, ...d.s };
        s.cfg = { ...clone(DEFAULT_CFG), ...(s.cfg || {}) };
        s.locals = Array.isArray(s.locals) ? s.locals : [];
        // voltou no meio de uma vez (ou de uma votação): o relógio precisa andar de novo
        if (s.phase === 'reveal' && !s.solo && !api.timerEnd) api.armTimer(VOTE_MS);
        else if (s.phase === 'play' && s.cfg.turnSec && !api.timerEnd) api.armTimer(s.cfg.turnSec * 1000);
      },
    };
    return inst;
  },
};
