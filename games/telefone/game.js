// Telefone sem fio de desenho (estilo Gartic Phone).
// Cada um escreve uma frase. A frase vai para o vizinho, que desenha. O desenho vai para o
// próximo, que descreve. E assim por diante, até dar a volta. No fim, a TV mostra cada corrente.
const WRITE_MS = Number(process.env.TSF_WRITE_MS) || 60 * 1000;
const DRAW_MS = Number(process.env.TSF_DRAW_MS) || 100 * 1000;
const DESCRIBE_MS = Number(process.env.TSF_DESCRIBE_MS) || 60 * 1000;
const GRACE_MS = 4000;          // depois do tempo, espera os desenhos chegarem

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
    };
    let graceHandle = null;
    const n = () => s.order.length;
    const idx = pid => s.order.indexOf(pid);
    // Na rodada k, o jogador i cuida da corrente (i - k) mod n.
    const chainFor = pid => { const i = idx(pid); return i < 0 ? -1 : ((i - s.step) % n() + n()) % n(); };
    const stepKind = k => (k === 0 ? 'write' : (k % 2 === 1 ? 'draw' : 'describe'));
    const stepMs = k => (k === 0 ? WRITE_MS : (k % 2 === 1 ? DRAW_MS : DESCRIBE_MS));
    const nameOf = pid => { const p = api.byPid(pid); return p ? p.name : 'Alguém'; };

    function beginStep(k) {
      clearTimeout(graceHandle); graceHandle = null;
      s.step = k; s.done = [];
      s.phase = stepKind(k);
      api.armTimer(stepMs(k));
      api.setEvent(k === 0 ? 'Todo mundo escreve uma frase maluca!' : s.phase === 'draw' ? `Rodada ${k}: desenhem o que receberam!` : `Rodada ${k}: descrevam o desenho que receberam!`, null);
    }
    function everyoneDone() { return s.order.every(pid => !api.byPid(pid) || s.done.includes(pid)); }
    function finishStep() {
      clearTimeout(graceHandle); graceHandle = null;
      api.clearTimer();
      // quem não entregou recebe um item vazio, para a corrente não quebrar
      for (const pid of s.order) {
        if (s.done.includes(pid)) continue;
        const ci = chainFor(pid);
        if (ci < 0) continue;
        s.chains[ci].items.push({ type: s.phase === 'draw' ? 'draw' : 'text', by: pid, content: s.phase === 'draw' ? '' : (s.phase === 'write' ? SUGESTOES[Math.floor(Math.random() * SUGESTOES.length)] : '(não deu tempo)') });
      }
      if (s.step + 1 >= n()) {
        s.phase = 'reveal'; s.reveal = { chain: 0, upto: 1 };
        api.setEvent('Acabou! Vamos ver o que cada frase virou. Toque em "Próximo" no celular.', null);
      } else beginStep(s.step + 1);
    }

    const inst = {
      start() {
        s.order = api.players.map(p => p.pid);
        s.chains = s.order.map(pid => ({ owner: pid, items: [] }));
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
      rekey(o, nw) {
        s.order = s.order.map(x => (x === o ? nw : x));
        s.done = s.done.map(x => (x === o ? nw : x));
        for (const ch of s.chains) { if (ch.owner === o) ch.owner = nw; for (const it of ch.items) if (it.by === o) it.by = nw; }
        if (s.sug[o]) { s.sug[nw] = s.sug[o]; delete s.sug[o]; }
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
          out.me = { chain: ci, submitted: s.done.includes(me.pid), prev: prev ? { type: prev.type, content: prev.content, by: prev.by } : null, sug: s.sug[me.pid] || '', ownerName: ch ? nameOf(ch.owner) : '' };
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
        if (['write', 'draw', 'describe'].includes(s.phase) && !api.timerEnd) api.armTimer(stepMs(s.step));
      },
    };
    return inst;
  },
};
