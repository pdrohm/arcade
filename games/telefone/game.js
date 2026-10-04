// Telefone sem fio de desenho (estilo Gartic Phone).
// Cada um escreve uma frase. A frase vai para o vizinho, que desenha. O desenho vai para o
// próximo, que descreve. E assim por diante, até dar a volta. No fim, a TV mostra cada corrente.
const WRITE_MS = Number(process.env.TSF_WRITE_MS) || 60 * 1000;
const DRAW_MS = Number(process.env.TSF_DRAW_MS) || 100 * 1000;
const DESCRIBE_MS = Number(process.env.TSF_DESCRIBE_MS) || 60 * 1000;
const GRACE_MS = 4000;          // depois do tempo, espera os desenhos chegarem

const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Plano sorteado de quem pega cada corrente em cada rodada: plan[rodada][corrente] = pid.
// Regras: cada corrente passa uma vez por cada pessoa; cada rodada todo mundo pega uma corrente.
// Entre os sorteios, fica o que menos repete "de quem eu recebo" (assim muda a cada rodada).
function makePlan(pids) {
  const n = pids.length;
  if (n % 2 === 0) {
    // número par: sequência 0, 1, n-1, 2, n-2… dá saltos todos diferentes, então
    // ninguém recebe duas vezes da mesma pessoa. A ordem das pessoas e o salto são sorteados.
    const gente = shuffle(pids);
    const units = [...Array(n).keys()].filter(u => { let a = u, b = n; while (b) [a, b] = [b, a % b]; return a === 1; });
    const u = units[Math.floor(Math.random() * units.length)];
    const seq = [0]; for (let i = 1; seq.length < n; i++) { seq.push(i); if (seq.length < n) seq.push(n - i); }
    return seq.map(r => [...Array(n).keys()].map(ci => gente[((r * u + ci) % n + n) % n]));
  }
  let best = null, bestScore = Infinity;
  for (let tent = 0; tent < 400 && bestScore > 0; tent++) {
    const plan = [shuffle(pids)];
    const pares = {};
    let score = 0, ok = true;
    for (let k = 1; k < n && ok; k++) {
      const row = new Array(n), usado = new Set();
      // monta a rodada corrente por corrente (aleatório, com volta atrás se travar)
      const ordemCh = shuffle([...Array(n).keys()]);
      const tenta = j => {
        if (j === n) return true;
        const ci = ordemCh[j];
        const jaPegou = new Set(plan.map(r => r[ci]));
        const cands = shuffle(pids.filter(pid => !usado.has(pid) && !jaPegou.has(pid)))
          .sort((a, b) => (pares[plan[k - 1][ci] + '>' + a] || 0) - (pares[plan[k - 1][ci] + '>' + b] || 0));
        for (const pid of cands) { row[ci] = pid; usado.add(pid); if (tenta(j + 1)) return true; usado.delete(pid); }
        return false;
      };
      if (!tenta(0)) { ok = false; break; }
      for (let ci = 0; ci < n; ci++) { const kp = plan[k - 1][ci] + '>' + row[ci]; if (pares[kp]) score++; pares[kp] = (pares[kp] || 0) + 1; }
      plan.push(row);
    }
    if (ok && score < bestScore) { best = plan; bestScore = score; }
  }
  return best || [...Array(n).keys()].map(k => pids.map((_, ci) => pids[(ci + k) % n]));
}

const SUGESTOES = [
  'Um jacaré tomando café na padaria', 'Cachorro dirigindo um fusca', 'Vovó jogando videogame', 'Pinguim no carnaval',
  'Gato astronauta comendo pizza', 'Dinossauro de patins', 'Elefante numa banheira', 'Palhaço triste no dentista',
  'Polvo tocando bateria', 'Pedro Álvares Cabral de chinelo', 'Galinha campeã de surfe', 'Robô plantando feijão',
  'Sereia presa no trânsito', 'Vampiro no churrasco', 'Tartaruga entregadora de pizza', 'Girafa de boné no ônibus',
];

module.exports = {
  meta: {
    id: 'telefone',
    name: 'Telefone Sem Fio',
    emoji: '✏️',
    tagline: 'Escreva, desenhe, descreva. No fim, ninguém sabe o que virou.',
    art: 'linear-gradient(135deg,#22d3ee 0%,#0e7490 55%,#083344 100%)',
    minPlayers: 3, maxPlayers: 8,
    howTo: [
      'Cada um escreve uma frase maluca.',
      'Sua frase vai para o vizinho, que desenha. O desenho vai para o próximo, que descreve.',
      'Vai passando até dar a volta em todo mundo.',
      'No fim, a TV mostra cada corrente, passo a passo.',
    ],
  },

  create(api) {
    let s = {
      phase: 'write',        // write | draw | describe | reveal | end
      step: 0,               // 0 = escrever; depois alterna desenhar / descrever
      order: [],             // pids, congelado no começo
      chains: [],            // [{ owner, items: [{ type:'text'|'draw', by, content }] }]
      done: [],              // pids que já entregaram nesta rodada
      reveal: { chain: 0, upto: 0 },
      sug: {},               // pid -> sugestão de frase
      plan: [],              // plan[rodada][corrente] = pid (sorteado no começo)
      drafts: {},            // pid -> último rascunho desta rodada (o celular manda enquanto a pessoa faz)
    };
    let graceHandle = null;
    const n = () => s.order.length;
    const idx = pid => s.order.indexOf(pid);
    // Na rodada k, cada jogador cuida da corrente que o plano sorteado mandou.
    const chainFor = pid => { const row = s.plan[s.step]; return row ? row.indexOf(pid) : -1; };
    const stepKind = k => (k === 0 ? 'write' : (k % 2 === 1 ? 'draw' : 'describe'));
    const stepMs = k => (k === 0 ? WRITE_MS : (k % 2 === 1 ? DRAW_MS : DESCRIBE_MS));
    const nameOf = pid => { const p = api.byPid(pid); return p ? p.name : 'Alguém'; };

    function beginStep(k) {
      clearTimeout(graceHandle); graceHandle = null;
      s.step = k; s.done = []; s.drafts = {};
      s.phase = stepKind(k);
      api.armTimer(stepMs(k));
      api.setEvent(k === 0 ? 'Todo mundo escreve uma frase maluca!' : s.phase === 'draw' ? `Rodada ${k}: desenhem o que receberam!` : `Rodada ${k}: descrevam o desenho que receberam!`, null);
    }
    function everyoneDone() { return s.order.every(pid => !api.byPid(pid) || s.done.includes(pid)); }
    function finishStep() {
      clearTimeout(graceHandle); graceHandle = null;
      api.clearTimer();
      // quem não tocou em Enviar entrega o último rascunho, do jeito que estava.
      // Só se não fez nada mesmo entra um item vazio, para a corrente não quebrar.
      for (const pid of s.order) {
        if (s.done.includes(pid)) continue;
        const ci = chainFor(pid);
        if (ci < 0) continue;
        const d = s.drafts[pid] && s.drafts[pid].step === s.step ? s.drafts[pid].content : '';
        const content = d || (s.phase === 'draw' ? '' : s.phase === 'write' ? (s.sug[pid] || SUGESTOES[Math.floor(Math.random() * SUGESTOES.length)]) : '(não deu tempo)');
        s.chains[ci].items.push({ type: s.phase === 'draw' ? 'draw' : 'text', by: pid, content });
      }
      s.drafts = {};
      if (s.step + 1 >= n()) {
        s.phase = 'reveal'; s.reveal = { chain: 0, upto: 1 };
        api.setEvent('Acabou! Vamos ver o que cada frase virou. Toque em "Próximo" no celular.', null);
      } else beginStep(s.step + 1);
    }

    const inst = {
      start() {
        s.order = api.players.map(p => p.pid);
        s.plan = makePlan(s.order);
        s.chains = s.plan[0].map(pid => ({ owner: pid, items: [] }));
        s.sug = {};
        for (const pid of s.order) s.sug[pid] = SUGESTOES[Math.floor(Math.random() * SUGESTOES.length)];
        beginStep(0);
      },
      onTimeUp() {
        if (!['write', 'draw', 'describe'].includes(s.phase)) return;
        // dá alguns segundos para os celulares mandarem o que têm
        api.setEvent('⏰ Tempo! Recebendo as respostas…', null);
        graceHandle = setTimeout(() => { finishStep(); api.broadcast(); }, GRACE_MS);
      },
      action(p, msg) {
        const me = p.pid;
        switch (msg.t) {
          case 'submit': {
            if (!['write', 'draw', 'describe'].includes(s.phase)) return;
            if (idx(me) < 0 || s.done.includes(me)) return;
            const ci = chainFor(me);
            if (ci < 0) return;
            let content = '';
            if (s.phase === 'draw') {
              content = String(msg.image || '');
              if (!/^data:image\/(png|jpeg|webp);base64,/.test(content) || content.length > 900000) content = '';
            } else {
              content = String(msg.text || '').trim().slice(0, 120);
              if (!content) content = s.phase === 'write' ? (s.sug[me] || SUGESTOES[0]) : '(sem descrição)';
            }
            s.chains[ci].items.push({ type: s.phase === 'draw' ? 'draw' : 'text', by: me, content });
            s.done.push(me);
            if (everyoneDone()) finishStep();
            else api.setEvent(`${p.name} entregou. Faltam ${s.order.filter(x => api.byPid(x) && !s.done.includes(x)).length}.`, p.color);
            return;
          }
          case 'next': {
            if (s.phase !== 'reveal') return;
            const ch = s.chains[s.reveal.chain];
            if (!ch) return;
            if (s.reveal.upto < ch.items.length) s.reveal.upto++;
            else if (s.reveal.chain + 1 < s.chains.length) s.reveal = { chain: s.reveal.chain + 1, upto: 1 };
            else { s.phase = 'end'; api.setEvent('Fim do álbum! Jogar de novo?', null); }
            return;
          }
          case 'prev': {
            if (s.phase !== 'reveal') return;
            if (s.reveal.upto > 1) s.reveal.upto--;
            else if (s.reveal.chain > 0) { s.reveal.chain--; s.reveal.upto = s.chains[s.reveal.chain].items.length; }
            return;
          }
          case 'again':
            if (s.phase !== 'end' && s.phase !== 'reveal') return;
            inst.start(); return;
        }
      },
      // rascunho automático (chega por 'input', que não redesenha a sala; não conta como entregue)
      input(p, msg) {
        if (msg.kind !== 'draft') return;
        const me = p.pid;
        if (!['write', 'draw', 'describe'].includes(s.phase)) return;
        if (idx(me) < 0 || s.done.includes(me)) return;
        let content = '';
        if (s.phase === 'draw') {
          content = String(msg.image || '');
          if (!/^data:image\/(png|jpeg|webp);base64,/.test(content) || content.length > 900000) return;
        } else content = String(msg.text || '').trim().slice(0, 120);
        s.drafts[me] = { step: s.step, content };
      },
      rekey(o, nw) {
        s.order = s.order.map(x => (x === o ? nw : x));
        s.plan = s.plan.map(row => row.map(x => (x === o ? nw : x)));
        s.done = s.done.map(x => (x === o ? nw : x));
        for (const ch of s.chains) { if (ch.owner === o) ch.owner = nw; for (const it of ch.items) if (it.by === o) it.by = nw; }
        if (s.sug[o]) { s.sug[nw] = s.sug[o]; delete s.sug[o]; }
        if (s.drafts[o]) { s.drafts[nw] = s.drafts[o]; delete s.drafts[o]; }
      },
      onPlayerLeave(pid) {
        // quem sai continua na ordem (as correntes precisam dele), só não trava mais o jogo
        if (['write', 'draw', 'describe'].includes(s.phase) && everyoneDone()) finishStep();
      },
      view(me) {
        const out = { phase: s.phase, step: s.step, total: n(), order: s.order, done: s.done, turnMs: stepMs(s.step), reveal: s.reveal, chainsCount: s.chains.length };
        if (me && ['write', 'draw', 'describe'].includes(s.phase)) {
          const ci = chainFor(me.pid);
          const ch = ci >= 0 ? s.chains[ci] : null;
          const prev = ch && ch.items.length ? ch.items[ch.items.length - 1] : null;
          const dr = s.drafts[me.pid] && s.drafts[me.pid].step === s.step ? s.drafts[me.pid].content : '';
          out.me = { chain: ci, submitted: s.done.includes(me.pid), prev: prev ? { type: prev.type, content: prev.content, by: prev.by } : null, sug: s.sug[me.pid] || '', ownerName: ch ? nameOf(ch.owner) : '', draft: dr };
        }
        if (s.phase === 'reveal' || s.phase === 'end') {
          const ch = s.chains[s.reveal.chain];
          out.album = ch ? { chain: s.reveal.chain, owner: ch.owner, items: ch.items.slice(0, s.phase === 'end' ? ch.items.length : s.reveal.upto), totalItems: ch.items.length } : null;
        }
        return out;
      },
      serialize: () => ({ s }),
      restore(d) {
        if (!d || !d.s) return;
        s = { ...s, ...d.s };
        s.drafts = s.drafts && typeof s.drafts === 'object' ? s.drafts : {};
        // partida salva antes do plano sorteado: refaz o rodízio antigo (corrente i na rodada k = jogador i + k)
        if (!Array.isArray(s.plan) || s.plan.length !== s.order.length) s.plan = s.order.map((_, k) => s.order.map((__, ci) => s.order[(ci + k) % s.order.length]));
        if (['write', 'draw', 'describe'].includes(s.phase) && !api.timerEnd) api.armTimer(stepMs(s.step));
      },
    };
    return inst;
  },
};
