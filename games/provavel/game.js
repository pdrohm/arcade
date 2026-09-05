// Quem é mais provável? Uma pergunta na TV, todo mundo vota num jogador. A TV revela os votos.
const VOTE_MS = Number(process.env.QMP_VOTE_MS) || 30 * 1000;
const ROUNDS = 10;
const PERGUNTAS = [
  'Quem é mais provável de dormir no cinema?', 'Quem é mais provável de virar famoso?', 'Quem é mais provável de esquecer o próprio aniversário?',
  'Quem é mais provável de chorar num comercial?', 'Quem é mais provável de ficar rico?', 'Quem é mais provável de se perder na própria cidade?',
  'Quem é mais provável de comer a última fatia de pizza sem perguntar?', 'Quem é mais provável de virar prefeito?', 'Quem é mais provável de brigar com um robô?',
  'Quem é mais provável de ser preso por algo bobo?', 'Quem é mais provável de sobreviver a um apocalipse zumbi?', 'Quem é mais provável de mandar mensagem para o ex?',
  'Quem é mais provável de ganhar na loteria e continuar trabalhando?', 'Quem é mais provável de acordar às 5 da manhã por vontade própria?', 'Quem é mais provável de ter 30 abas abertas no celular?',
  'Quem é mais provável de virar influencer?', 'Quem é mais provável de esquecer o nome de alguém na hora do abraço?', 'Quem é mais provável de chegar atrasado no próprio casamento?',
  'Quem é mais provável de fazer amizade com um estranho no ônibus?', 'Quem é mais provável de comer algo que caiu no chão?', 'Quem é mais provável de ir a um show sozinho?',
  'Quem é mais provável de trocar de emprego por impulso?', 'Quem é mais provável de discutir com o GPS?', 'Quem é mais provável de adotar cinco gatos?',
  'Quem é mais provável de virar chef de cozinha?', 'Quem é mais provável de tirar foto da comida antes de comer?', 'Quem é mais provável de dançar sozinho em casa?',
  'Quem é mais provável de esquecer a panela no fogo?', 'Quem é mais provável de contar um segredo sem querer?', 'Quem é mais provável de morar em outro país?',
  'Quem é mais provável de comprar algo inútil de madrugada?', 'Quem é mais provável de virar personagem de novela?', 'Quem é mais provável de chorar assistindo pet na internet?',
  'Quem é mais provável de fazer o pior karaokê?', 'Quem é mais provável de dar um pulo de paraquedas?', 'Quem é mais provável de esquecer onde estacionou?',
  'Quem é mais provável de ganhar uma discussão sem ter razão?', 'Quem é mais provável de dormir com a luz acesa?', 'Quem é mais provável de ser pego dormindo na reunião?',
  'Quem é mais provável de fazer um tour gastronômico de um dia só?', 'Quem é mais provável de virar dono de bar?', 'Quem é mais provável de ficar amigo da sogra?',
  'Quem é mais provável de fingir que entendeu a piada?', 'Quem é mais provável de perder o celular na balada?', 'Quem é mais provável de ficar rico com uma ideia maluca?',
  'Quem é mais provável de participar de um reality show?', 'Quem é mais provável de não desligar o alarme?', 'Quem é mais provável de tomar café às 11 da noite?',
  'Quem é mais provável de ficar sem bateria no meio de algo importante?', 'Quem é mais provável de fazer amigos num velório?', 'Quem é mais provável de usar pijama o dia inteiro?',
  'Quem é mais provável de virar professor?', 'Quem é mais provável de apostar tudo num lance?', 'Quem é mais provável de comprar um carro de cor esquisita?',
  'Quem é mais provável de virar mestre em churrasco?', 'Quem é mais provável de esquecer a carteira em casa?', 'Quem é mais provável de fazer as pazes primeiro?',
  'Quem é mais provável de ficar bravo com o Wi-Fi?', 'Quem é mais provável de ir a um restaurante e pedir o de sempre?', 'Quem é mais provável de virar dublê?',
];

module.exports = {
  meta: {
    id: 'provavel', name: 'Quem é mais provável?', emoji: '👉',
    tagline: 'Uma pergunta, todos apontam para alguém. A TV revela.',
    art: 'linear-gradient(135deg,#ec4899 0%,#9d174d 55%,#4a044e 100%)',
    minPlayers: 3, maxPlayers: 8,
    howTo: ['A TV mostra uma pergunta.', 'Cada um vota num jogador no celular (pode ser em você).', 'A TV revela os votos. O mais votado leva o ponto da rodada.', '10 perguntas. Quem for mais apontado é o "mais provável" da noite.'],
  },
  create(api) {
    let s = { phase: 'vote', round: 0, q: '', votes: {}, used: [], wins: {}, history: [] };
    let grace = null;
    const players = () => api.players.map(p => p.pid);
    function newRound() {
      clearTimeout(grace); grace = null;
      s.round++;
      let q; let tries = 0;
      do { q = PERGUNTAS[Math.floor(Math.random() * PERGUNTAS.length)]; tries++; } while (s.used.includes(q) && tries < 200);
      s.used.push(q); if (s.used.length > 40) s.used.shift();
      s.q = q; s.votes = {}; s.phase = 'vote';
      api.armTimer(VOTE_MS);
      api.setEvent(`Pergunta ${s.round} de ${ROUNDS}. Votem!`, null);
    }
    function reveal() {
      clearTimeout(grace); grace = null;
      api.clearTimer();
      const count = {}; for (const v of Object.values(s.votes)) count[v] = (count[v] || 0) + 1;
      const max = Math.max(0, ...Object.values(count));
      const tops = Object.keys(count).filter(k => count[k] === max);
      for (const t of tops) s.wins[t] = (s.wins[t] || 0) + 1;
      s.history.push({ q: s.q, tops, count });
      s.phase = s.round >= ROUNDS ? 'end' : 'reveal';
      const nomes = tops.map(t => (api.byPid(t) || {}).name).filter(Boolean).join(' e ');
      api.setEvent(max ? `${nomes} ${tops.length > 1 ? 'empataram' : 'foi o mais votado'} com ${max} voto${max > 1 ? 's' : ''}!` : 'Ninguém votou!', null);
    }
    const inst = {
      start() { s.wins = {}; s.round = 0; s.history = []; newRound(); },
      onTimeUp() { if (s.phase === 'vote') reveal(); },
      action(p, msg) {
        switch (msg.t) {
          case 'vote': {
            if (s.phase !== 'vote') return;
            const alvo = String(msg.pid || '');
            if (!api.byPid(alvo)) return;
            s.votes[p.pid] = alvo;
            if (players().every(pid => !api.byPid(pid) || s.votes[pid] || api.byPid(pid).on === false)) { grace = setTimeout(() => { if (s.phase === 'vote') { reveal(); api.broadcast(); } }, 1200); }
            return;
          }
          case 'next': if (s.phase === 'reveal') newRound(); return;
          case 'again': if (s.phase === 'end') inst.start(); return;
        }
      },
      rekey(o, n) { if (s.votes[o]) { s.votes[n] = s.votes[o]; delete s.votes[o]; } for (const k of Object.keys(s.votes)) if (s.votes[k] === o) s.votes[k] = n; if (s.wins[o]) { s.wins[n] = s.wins[o]; delete s.wins[o]; } },
      onPlayerLeave() {},
      view(me) {
        const count = {}; for (const v of Object.values(s.votes)) count[v] = (count[v] || 0) + 1;
        return {
          phase: s.phase, round: s.round, rounds: ROUNDS, q: s.q, turnMs: VOTE_MS, wins: s.wins,
          voted: Object.keys(s.votes), myVote: me ? s.votes[me.pid] || null : null,
          votes: s.phase === 'vote' ? null : s.votes, count: s.phase === 'vote' ? null : count,
          last: s.history[s.history.length - 1] || null,
        };
      },
      serialize: () => ({ s }),
      restore(d) { if (d && d.s) { s = { ...s, ...d.s }; if (s.phase === 'vote' && !api.timerEnd) api.armTimer(VOTE_MS); } },
    };
    return inst;
  },
};
