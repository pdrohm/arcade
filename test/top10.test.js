// Regras do Top 10: quem fala, quem duvida, quem perde vida e o que cada tela pode ver.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const top10 = require('../games/top10/game.js');

// Sala de mentira: só o que o jogo usa da api do arcade.
function mesa(n, cfg) {
  const players = [];
  for (let i = 0; i < n; i++) players.push({ pid: 'p' + i, name: 'J' + i, color: 'cor' + i, on: true });
  let timerEnd = null;
  const api = {
    players,
    colors: [{ key: 'roxo' }, { key: 'rosa' }, { key: 'ciano' }, { key: 'amarelo' }],
    byPid: pid => players.find(p => p.pid === pid) || null,
    setEvent() {}, addEvent() {},
    armTimer(ms) { timerEnd = Date.now() + ms; },
    clearTimer() { timerEnd = null; },
    get timerEnd() { return timerEnd; },
    broadcast() {}, stream() {}, exit() {},
  };
  const g = top10.create(api);
  g.start();
  if (cfg) g.action(players[0], { t: 'config', cfg });
  g.action(players[0], { t: 'begin' });
  const V = me => g.view(me === undefined ? players[0] : me);
  const de = pid => players.find(p => p.pid === pid);
  return { g, players, api, V, de, vez: () => de(V().cur) };
}

// Modo mediador: um celular só (o do mediador) e os nomes da mesa digitados nele.
function mesaMediador(nomes, cfg) {
  const m = mesa(1, Object.assign({ solo: true, names: nomes }, cfg || {}));
  m.g.action(m.players[0], { t: 'begin' });   // o begin do mesa() rodou antes dos nomes entrarem
  return m;
}

test('começa com 4 vidas por pessoa e a lista escondida', () => {
  const m = mesa(4);
  const v = m.V();
  assert.equal(v.phase, 'play');
  assert.equal(v.maxLives, 4);
  for (const p of m.players) assert.equal(v.lives[p.pid], 4);
  assert.equal(v.cur, 'p0');
  assert.ok(v.card.t.length > 0);
  assert.equal(v.card.n, 10);
  assert.equal(v.card.items, null, 'a lista não pode sair do servidor antes do DUVIDO');
});

test('nem a TV recebe a lista enquanto o jogo corre', () => {
  const m = mesa(3);
  assert.equal(m.g.view(null, 'tv').card.items, null);
  m.g.action(m.players[0], { t: 'said' });
  m.g.action(m.players[1], { t: 'doubt' });
  assert.equal(m.g.view(null, 'tv').card.items.length, 10, 'depois do DUVIDO a TV vê a lista');
});

test('falar passa a vez e vai contando as respostas', () => {
  const m = mesa(3);
  m.g.action(m.players[0], { t: 'said' });
  assert.equal(m.V().cur, 'p1');
  assert.equal(m.V().saidCount, 1);
  assert.equal(m.V().last, 'p0');
  m.g.action(m.players[1], { t: 'said' });
  m.g.action(m.players[2], { t: 'said' });
  m.g.action(m.players[0], { t: 'said' });
  assert.equal(m.V().saidCount, 4, 'a carta não trava nos dez: continua enquanto ninguém duvidar');
  assert.equal(m.V().cur, 'p1');
});

test('só quem está na vez pode falar', () => {
  const m = mesa(3);
  m.g.action(m.players[1], { t: 'said' });
  assert.equal(m.V().saidCount, 0);
  assert.equal(m.V().cur, 'p0');
});

test('duvidou e não valia: quem falou perde a vida', () => {
  const m = mesa(3);
  m.g.action(m.players[0], { t: 'said' });
  m.g.action(m.players[1], { t: 'doubt' });
  let v = m.V();
  assert.equal(v.phase, 'reveal');
  assert.equal(v.card.items.length, 10, 'a lista se revela no DUVIDO');
  assert.deepEqual(v.doubt.voters, ['p2'], 'os dois envolvidos não votam');
  m.g.action(m.players[2], { t: 'vote', ok: false });
  v = m.V();
  assert.equal(v.phase, 'result');
  assert.equal(v.result.valid, false);
  assert.equal(v.result.loser, 'p0');
  assert.equal(v.lives.p0, 3);
  assert.equal(v.lives.p1, 4);
});

test('duvidou à toa: quem duvidou perde a vida', () => {
  const m = mesa(3);
  m.g.action(m.players[0], { t: 'said' });
  m.g.action(m.players[1], { t: 'doubt' });
  m.g.action(m.players[2], { t: 'vote', ok: true });
  const v = m.V();
  assert.equal(v.result.valid, true);
  assert.equal(v.result.loser, 'p1');
  assert.equal(v.lives.p1, 3);
  assert.equal(v.lives.p0, 4);
});

test('em dupla os dois votam: concordando, quem falou perde', () => {
  const m = mesa(2);
  assert.equal(m.V().phase, 'play', 'dá para jogar com dois');
  m.g.action(m.players[0], { t: 'said' });
  m.g.action(m.players[1], { t: 'doubt' });
  const v = m.V();
  assert.equal(v.phase, 'reveal');
  assert.deepEqual(v.doubt.voters.slice().sort(), ['p0', 'p1'], 'sem júri, os dois envolvidos julgam');
  assert.equal(m.V(m.players[0]).mine.canVote, true);
  assert.equal(m.V(m.players[1]).mine.canVote, true);
  m.g.action(m.players[0], { t: 'vote', ok: false });    // quem falou admite que não valia
  assert.equal(m.V().phase, 'reveal', 'falta o outro votar');
  m.g.action(m.players[1], { t: 'vote', ok: false });
  const r = m.V().result;
  assert.equal(r.valid, false);
  assert.equal(r.loser, 'p0');
  assert.equal(m.V().lives.p0, 3);
});

test('em dupla, discordando, a resposta vale e quem duvidou perde', () => {
  const m = mesa(2);
  m.g.action(m.players[0], { t: 'said' });
  m.g.action(m.players[1], { t: 'doubt' });
  m.g.action(m.players[0], { t: 'vote', ok: true });     // "estava lá"
  m.g.action(m.players[1], { t: 'vote', ok: false });    // "não estava"
  const r = m.V().result;
  assert.equal(r.valid, true, 'empate vale: quem duvida é que tem de provar');
  assert.equal(r.loser, 'p1');
  assert.equal(m.V().lives.p1, 3);
});

test('em dupla a partida termina quando um zera as vidas', () => {
  const m = mesa(2, { lives: 2 });
  tiraVida(m, 'p0');
  assert.equal(m.V().lives.p0, 1);
  assert.equal(m.V().phase, 'play');
  tiraVida(m, 'p0');
  const v = m.V();
  assert.equal(v.phase, 'end');
  assert.equal(v.winner, 'p1');
});

test('empate na votação vale para quem falou', () => {
  const m = mesa(4);
  m.g.action(m.players[0], { t: 'said' });
  m.g.action(m.players[1], { t: 'doubt' });
  m.g.action(m.players[2], { t: 'vote', ok: true });
  m.g.action(m.players[3], { t: 'vote', ok: false });
  const v = m.V();
  assert.equal(v.result.valid, true);
  assert.equal(v.result.loser, 'p1');
});

test('ninguém duvida da própria resposta, e quem está fora não duvida', () => {
  const m = mesa(3, { lives: 2 });
  m.g.action(m.players[0], { t: 'said' });
  m.g.action(m.players[0], { t: 'doubt' });
  assert.equal(m.V().phase, 'play', 'duvidar de si mesmo não faz nada');
  m.g.action(m.players[2], { t: 'doubt' });          // p2 pode duvidar mesmo sem ser a vez dele
  assert.equal(m.V().phase, 'reveal');
  assert.deepEqual(m.V().doubt.voters, ['p1']);
});

test('tempo esgotado tira uma vida e revela a lista', () => {
  const m = mesa(3);
  m.g.onTimeUp();
  const v = m.V();
  assert.equal(v.phase, 'result');
  assert.equal(v.result.timeout, true);
  assert.equal(v.result.loser, 'p0');
  assert.equal(v.lives.p0, 3);
  assert.equal(v.card.items.length, 10);
});

test('a próxima carta é outra e começa pelo próximo da roda', () => {
  const m = mesa(3);
  const primeira = m.V().card.t;
  m.g.action(m.players[0], { t: 'said' });            // vez passa para p1
  m.g.action(m.players[2], { t: 'doubt' });
  m.g.action(m.players[1], { t: 'vote', ok: true });
  m.g.action(m.players[0], { t: 'next' });            // qualquer um vira a carta
  const v = m.V();
  assert.equal(v.phase, 'play');
  assert.equal(v.round, 2);
  assert.equal(v.saidCount, 0);
  assert.equal(v.cur, 'p2', 'a vez era de p1: a carta nova começa no seguinte');
  assert.notEqual(v.card.t, primeira);
  assert.equal(v.card.items, null);
});

// Faz o alvo perder uma vida: ele fala, alguém duvida e a turma diz que não valia.
function tiraVida(m, alvo) {
  for (let guarda = 0; m.V().cur !== alvo && guarda < 20; guarda++) m.g.action(m.de(m.V().cur), { t: 'said' });
  m.g.action(m.de(alvo), { t: 'said' });
  const duvidador = m.players.find(p => p.pid !== alvo && (m.V().lives[p.pid] || 0) > 0);
  m.g.action(duvidador, { t: 'doubt' });
  for (const pid of (m.V().doubt ? m.V().doubt.voters.slice() : [])) {
    if (m.V().phase === 'reveal') m.g.action(m.de(pid), { t: 'vote', ok: false });
  }
  if (m.V().phase === 'result') m.g.action(m.players[0], { t: 'next' });
}

test('sem vidas o jogador sai e o último de pé vence', () => {
  const m = mesa(3, { lives: 2 });
  tiraVida(m, 'p0');
  assert.equal(m.V().lives.p0, 1);
  assert.deepEqual(m.V().out, []);
  tiraVida(m, 'p0');
  let v = m.V();
  assert.equal(v.lives.p0, 0);
  assert.deepEqual(v.out, ['p0']);
  assert.notEqual(v.cur, 'p0', 'eliminado não recebe mais a vez');
  // agora p1 cai duas vezes (quem já está fora continua votando) e sobra p2
  tiraVida(m, 'p1');
  tiraVida(m, 'p1');
  v = m.V();
  assert.equal(v.phase, 'end');
  assert.equal(v.winner, 'p2');
});

test('a parte privada diz a cada celular o que ele pode fazer', () => {
  const m = mesa(4);
  m.g.action(m.players[0], { t: 'said' });
  const eu = m.V(m.players[1]).mine, outro = m.V(m.players[2]).mine, falou = m.V(m.players[0]).mine;
  assert.equal(eu.myTurn, true);
  assert.equal(eu.canDoubt, true);
  assert.equal(outro.canDoubt, true, 'qualquer um vivo pode duvidar, não só o da vez');
  assert.equal(falou.canDoubt, false);
  m.g.action(m.players[1], { t: 'doubt' });
  assert.equal(m.V(m.players[2]).mine.canVote, true);
  assert.equal(m.V(m.players[0]).mine.canVote, false, 'quem falou não julga a própria resposta');
  assert.equal(m.V(m.players[1]).mine.canVote, false, 'quem duvidou também não vota');
  m.g.action(m.players[2], { t: 'vote', ok: false });
  assert.equal(m.V(m.players[2]).mine.myVote, false);
  assert.equal(m.V().phase, 'reveal', 'ainda falta p3 votar');
});

test('quem sai da sala no meio não trava a partida', () => {
  const m = mesa(4);
  m.g.action(m.players[0], { t: 'said' });
  m.g.action(m.players[1], { t: 'doubt' });
  m.players.splice(1, 1);                              // quem duvidou sumiu
  m.g.onPlayerLeave('p1');
  const v = m.V();
  assert.equal(v.phase, 'play', 'a duvidada cai junto e entra carta nova');
  assert.equal(v.doubt, null);
  assert.equal(v.card.items, null);
});

test('salvar e restaurar mantém a partida de pé', () => {
  const m = mesa(3);
  m.g.action(m.players[0], { t: 'said' });
  m.g.action(m.players[1], { t: 'doubt' });
  m.g.action(m.players[2], { t: 'vote', ok: false });
  const salvo = JSON.parse(JSON.stringify(m.g.serialize()));
  const outro = top10.create({
    players: m.players, byPid: pid => m.players.find(p => p.pid === pid) || null,
    setEvent() {}, addEvent() {}, armTimer() {}, clearTimer() {}, get timerEnd() { return null; },
    broadcast() {}, stream() {}, exit() {},
  });
  outro.restore(salvo);
  const v = outro.view(m.players[0]);
  assert.equal(v.phase, 'result');
  assert.equal(v.lives.p0, 3);
  assert.equal(v.card.items.length, 10);
});

test('as cartas têm sempre dez itens diferentes', () => {
  const cards = require('../games/top10/cards.js');
  let n = 0;
  for (const cat of cards.CATEGORIES) {
    const lista = cards.CARDS[cat.id] || [];
    assert.ok(lista.length > 0, 'tema sem carta: ' + cat.id);
    for (const c of lista) {
      n++;
      assert.equal(c.items.length, 10, c.t);
      assert.equal(new Set(c.items).size, 10, 'item repetido em: ' + c.t);
      assert.ok(c.t && c.t.length > 5, 'carta sem título');
    }
  }
  assert.ok(n >= 40, 'poucas cartas: ' + n);
});


// ---------------------------------------------------------------- modo mediador

test('modo mediador: um celular só conduz a mesa de nomes digitados', () => {
  const m = mesaMediador(['Ana', 'Bia', 'Caio']);
  const v = m.V();
  assert.equal(v.phase, 'play');
  assert.equal(v.solo, true);
  assert.deepEqual(v.order, ['#0', '#1', '#2'], 'a roda são os nomes, não as vagas da sala');
  assert.deepEqual(v.roster.map(r => r.name), ['Ana', 'Bia', 'Caio']);
  assert.ok(v.roster.every(r => r.lives === 4 && r.local === true));
  assert.ok(v.roster.every(r => !!r.color), 'cada nome ganha uma cor da paleta');
  assert.equal(v.cur, '#0');
  assert.equal(v.card.items, null, 'a lista continua escondida do mediador');
  assert.equal(v.mine.mediator, true);
});

test('modo mediador: FALEI passa a vez mesmo sem o jogador ter celular', () => {
  const m = mesaMediador(['Ana', 'Bia', 'Caio']);
  m.g.action(m.players[0], { t: 'said' });
  assert.equal(m.V().cur, '#1');
  assert.equal(m.V().last, '#0');
  m.g.action(m.players[0], { t: 'said' });
  assert.equal(m.V().saidCount, 2);
  assert.equal(m.V().cur, '#2');
});

test('modo mediador: o celular diz quem duvidou e julga a resposta', () => {
  const m = mesaMediador(['Ana', 'Bia', 'Caio']);
  m.g.action(m.players[0], { t: 'said' });                      // Ana respondeu
  m.g.action(m.players[0], { t: 'doubt', by: '#2' });            // Caio gritou duvido
  let v = m.V();
  assert.equal(v.phase, 'reveal');
  assert.equal(v.card.items.length, 10);
  assert.deepEqual(v.doubt, { by: '#2', target: '#0', votes: {}, voters: [] }, 'sem votação: quem decide é o mediador');
  assert.equal(v.mine.canJudge, true);
  assert.equal(v.mine.canVote, false);
  m.g.action(m.players[0], { t: 'vote', ok: true });             // votar não vale aqui
  assert.equal(m.V().phase, 'reveal');
  m.g.action(m.players[0], { t: 'judge', ok: false });           // não valia
  v = m.V();
  assert.equal(v.phase, 'result');
  assert.equal(v.result.valid, false);
  assert.equal(v.result.loser, '#0');
  assert.equal(v.lives['#0'], 3);
});

test('modo mediador: duvidada à toa tira a vida de quem duvidou', () => {
  const m = mesaMediador(['Ana', 'Bia', 'Caio']);
  m.g.action(m.players[0], { t: 'said' });
  m.g.action(m.players[0], { t: 'doubt', by: '#1' });
  m.g.action(m.players[0], { t: 'judge', ok: true });
  const v = m.V();
  assert.equal(v.result.loser, '#1');
  assert.equal(v.lives['#1'], 3);
  assert.equal(v.lives['#0'], 4);
});

test('modo mediador: não dá para duvidar de quem acabou de falar em nome dele mesmo', () => {
  const m = mesaMediador(['Ana', 'Bia']);
  m.g.action(m.players[0], { t: 'said' });                       // Ana respondeu
  m.g.action(m.players[0], { t: 'doubt', by: '#0' });            // "a própria Ana duvidou"
  assert.equal(m.V().phase, 'play');
  m.g.action(m.players[0], { t: 'doubt', by: '#9' });            // nome que não existe
  assert.equal(m.V().phase, 'play');
  m.g.action(m.players[0], { t: 'doubt', by: '#1' });
  assert.equal(m.V().phase, 'reveal');
});

test('modo mediador: precisa de 2 nomes para começar', () => {
  const m = mesa(1, { solo: true, names: ['Ana'] });
  m.g.action(m.players[0], { t: 'begin' });
  assert.equal(m.V().phase, 'setup');
  m.g.action(m.players[0], { t: 'config', cfg: { names: ['Ana', 'Bia'] } });
  m.g.action(m.players[0], { t: 'begin' });
  assert.equal(m.V().phase, 'play');
});

test('modo mediador: nome repetido e sobra de nomes são podados', () => {
  const m = mesa(1, { solo: true, names: ['Ana', 'ana', '  Bia  ', '', 'Caio'] });
  assert.deepEqual(m.V().cfg.names, ['Ana', 'Bia', 'Caio']);
});

test('modo mediador: a partida termina no último de pé', () => {
  const m = mesaMediador(['Ana', 'Bia'], { lives: 2 });
  for (let i = 0; i < 2; i++) {
    for (let g = 0; m.V().cur !== '#0' && g < 10; g++) m.g.action(m.players[0], { t: 'said' });
    m.g.action(m.players[0], { t: 'said' });
    m.g.action(m.players[0], { t: 'doubt', by: '#1' });
    m.g.action(m.players[0], { t: 'judge', ok: false });
    if (m.V().phase === 'result') m.g.action(m.players[0], { t: 'next' });
  }
  const v = m.V();
  assert.equal(v.phase, 'end');
  assert.equal(v.winner, '#1');
  assert.equal(v.roster.find(r => r.pid === '#0').lives, 0);
});

test('modo mediador: o celular do mediador cair não derruba a mesa', () => {
  const m = mesaMediador(['Ana', 'Bia', 'Caio']);
  m.g.action(m.players[0], { t: 'said' });
  m.g.onPlayerLeave('p0');                                      // o mediador saiu da sala
  const v = m.V(null);
  assert.equal(v.phase, 'play', 'a mesa é de nomes digitados: a partida continua');
  assert.deepEqual(v.order, ['#0', '#1', '#2']);
  assert.equal(v.cur, '#1');
});

test('modo mediador: salvar e restaurar mantém os nomes e as vidas', () => {
  const m = mesaMediador(['Ana', 'Bia', 'Caio']);
  m.g.action(m.players[0], { t: 'said' });
  m.g.action(m.players[0], { t: 'doubt', by: '#1' });
  m.g.action(m.players[0], { t: 'judge', ok: false });
  const salvo = JSON.parse(JSON.stringify(m.g.serialize()));
  const outro = top10.create({
    players: m.players, colors: m.api.colors, byPid: pid => m.players.find(p => p.pid === pid) || null,
    setEvent() {}, addEvent() {}, armTimer() {}, clearTimer() {}, get timerEnd() { return null; },
    broadcast() {}, stream() {}, exit() {},
  });
  outro.restore(salvo);
  const v = outro.view(m.players[0]);
  assert.equal(v.solo, true);
  assert.deepEqual(v.roster.map(r => r.name), ['Ana', 'Bia', 'Caio']);
  assert.equal(v.lives['#0'], 3);
  assert.equal(v.mine.mediator, true);
});

// ---------------------------------------------------------------- pular a carta

test('pular troca a carta sem tirar vida e sem passar a vez', () => {
  const m = mesa(3);
  const primeira = m.V().card.t;
  m.g.action(m.players[0], { t: 'said' });            // vez passa para p1
  assert.equal(m.V().saidCount, 1);
  m.g.action(m.players[2], { t: 'skip' });            // p2 lembra que já jogaram essa
  const v = m.V();
  assert.notEqual(v.card.t, primeira, 'entrou outra carta');
  assert.equal(v.card.items, null, 'a carta nova continua escondida');
  assert.equal(v.phase, 'play');
  assert.equal(v.cur, 'p1', 'a vez continua com quem estava para responder');
  assert.equal(v.saidCount, 0, 'a contagem recomeça');
  assert.equal(v.last, null);
  for (const p of m.players) assert.equal(v.lives[p.pid], 4, 'pular não tira vida de ninguém');
});

test('quem está na vez não pula (senão era fuga da própria vez)', () => {
  const m = mesa(3);
  const primeira = m.V().card.t;
  m.g.action(m.players[0], { t: 'skip' });            // p0 é quem está na vez
  assert.equal(m.V().card.t, primeira);
  assert.equal(m.V(m.players[0]).mine.canSkip, false);
  assert.equal(m.V(m.players[1]).mine.canSkip, true);
});

test('pular só vale com a carta em jogo', () => {
  const m = mesa(3);
  m.g.action(m.players[0], { t: 'said' });
  m.g.action(m.players[1], { t: 'doubt' });           // fase de revelação
  const titulo = m.V().card.t;
  m.g.action(m.players[2], { t: 'skip' });
  assert.equal(m.V().phase, 'reveal');
  assert.equal(m.V().card.t, titulo);
});

test('modo mediador: o celular que conduz sempre pode pular', () => {
  const m = mesaMediador(['Ana', 'Bia', 'Caio']);
  const primeira = m.V().card.t;
  assert.equal(m.V().mine.canSkip, true);
  m.g.action(m.players[0], { t: 'skip' });
  const v = m.V();
  assert.notEqual(v.card.t, primeira);
  assert.equal(v.cur, '#0', 'a vez não anda: só a carta trocou');
  assert.equal(v.roster.every(r => r.lives === 4), true);
});

test('carta pulada não volta enquanto houver outras', () => {
  const m = mesa(3, { cats: ['musica'] });            // tema com poucas cartas
  const vistas = [m.V().card.t];
  for (let i = 0; i < 2; i++) {
    m.g.action(m.players[1], { t: 'skip' });
    vistas.push(m.V().card.t);
  }
  assert.equal(new Set(vistas).size, vistas.length, 'não repetiu: ' + vistas.join(' | '));
});
