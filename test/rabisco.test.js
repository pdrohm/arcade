// Rabisco: palpite no chat, "tá perto", dicas, pontos e o que cada tela pode ver.
'use strict';
process.env.RB_SAY_MS = '0';   // nos testes os palpites saem em sequência, sem o freio de 350 ms
const test = require('node:test');
const assert = require('node:assert/strict');
const rabisco = require('../games/rabisco/game.js');
const { judge } = require('../games/rabisco/guess.js');

// Sala de mentira: só o que o jogo usa da api do arcade.
function sala(n, opts) {
  opts = opts || {};
  const players = [];
  for (let i = 0; i < n; i++) players.push({ pid: 'p' + i, name: 'J' + i, color: 'cor' + i, on: true });
  let timerEnd = null, streamed = 0;
  const api = {
    players,
    byPid: pid => players.find(p => p.pid === pid) || null,
    onlinePids: () => new Set(players.filter(p => p.on !== false).map(p => p.pid)),
    setEvent() {}, addEvent() {},
    armTimer(ms) { timerEnd = Date.now() + ms; },
    clearTimer() { timerEnd = null; },
    get timerEnd() { return timerEnd; },
    broadcast() {}, stream() { streamed++; }, exit() {},
    tvCount: () => (opts.tv ? 1 : 0),
  };
  const g = rabisco.create(api);
  g.start();
  const V = (p, type) => g.view(p === undefined ? players[0] : p, type);
  return { g, players, api, V, streamed: () => streamed };
}
// Começa e escolhe a primeira palavra; devolve quem desenha e a palavra.
function comecar(m, cfg) {
  if (cfg) m.g.action(m.players[0], { t: 'rb-cfg', cfg });
  m.g.action(m.players[0], { t: 'begin' });
  const v = m.V();
  const d = m.players.find(p => p.pid === v.drawer);
  m.g.action(d, { t: 'pick', i: 0 });
  const word = m.V(d).word;
  return { d, word, outros: m.players.filter(p => p !== d) };
}

test('juiz: certo, perto e errado', () => {
  const alvo = { w: 'cachorro', near: ['cão', 'cãozinho'] };
  assert.equal(judge('cachorro', alvo), 'hit');
  assert.equal(judge('  CACHORRO!! ', alvo), 'hit');
  assert.equal(judge('acho que é cachorro', alvo), 'hit', 'no meio da frase também vale (e some do chat)');
  assert.equal(judge('cachoro', alvo), 'close');
  assert.equal(judge('cachorr', alvo), 'close');
  assert.equal(judge('cãozinho', alvo), 'close');
  assert.equal(judge('gato', alvo), 'miss');
  assert.equal(judge('guarda chuva', { w: 'guarda-chuva' }), 'hit');
  assert.equal(judge('o rei leao', { w: 'Rei Leão' }), 'hit');
  assert.equal(judge('queijo', { w: 'pão de queijo' }), 'close');
  assert.equal(judge('sal', { w: 'sol' }), 'miss', 'palavra curta não perdoa letra trocada');
});

test('é um jogo próprio na biblioteca (Imagem e Ação continua igual)', () => {
  assert.equal(rabisco.meta.id, 'rabisco');
  assert.equal(require('../games/imagemeacao/game.js').meta.name, 'Imagem e Ação');
  const m = sala(3);
  assert.equal(m.V().phase, 'setup');
});

test('só quem desenha vê as opções e a palavra; a TV nunca vê antes da hora', () => {
  const m = sala(3, { tv: true });
  m.g.action(m.players[0], { t: 'begin' });
  const v0 = m.V();
  const d = m.players.find(p => p.pid === v0.drawer);
  const outro = m.players.find(p => p !== d);
  assert.equal(m.V(d).options.length, 3);
  assert.equal(m.V(outro).options, null);
  assert.equal(m.g.view(null, 'tv').options, null);
  m.g.action(d, { t: 'pick', i: 1 });
  const w = m.V(d).word;
  assert.ok(w);
  assert.equal(m.V(outro).word, null);
  assert.equal(m.g.view(null, 'tv').word, null);
  assert.ok(m.V(outro).hint.every(ch => ch === '_' || ch === ' ' || !/[a-z]/i.test(ch)), 'no começo a dica é só tracinho');
  assert.equal(m.V(outro).hasTv, true);
  assert.equal(m.V(outro).place, 'presencial');
});

test('palpite certo: some do chat, vira "acertou!" e dá pontos para os dois', () => {
  const m = sala(3);
  const { d, word, outros } = comecar(m);
  const [a, b] = outros;
  m.g.action(a, { t: 'say', text: word });
  const vb = m.V(b);
  assert.ok(!vb.chat.some(x => x.text && x.text.toLowerCase().includes(word.toLowerCase())), 'a palavra não pode aparecer para quem não acertou');
  assert.ok(vb.chat.some(x => x.k === 'hit' && x.pid === a.pid));
  assert.ok(vb.scores[a.pid] >= 500, 'acertou rápido + bônus de primeiro');
  assert.ok(vb.scores[d.pid] > 0, 'quem desenha ganha quando alguém acerta');
  assert.equal(m.V(a).word, word, 'quem acertou passa a ver a palavra');
  assert.equal(vb.word, null);
  // quem acertou conversa só com quem também sabe
  m.g.action(a, { t: 'say', text: 'é ' + word + ' kkk' });
  assert.ok(m.V(d).chat.some(x => x.k === 'knower' && x.pid === a.pid));
  assert.ok(!m.V(b).chat.some(x => x.k === 'knower'));
});

test('perto: só quem chutou vê o próprio texto; os outros só sabem que está perto', () => {
  const m = sala(3);
  comecar(m, {});
  const v0 = m.V();
  const d = m.players.find(p => p.pid === v0.drawer);
  const [a, b] = m.players.filter(p => p !== d);
  const w = m.V(d).word;
  const quase = w.length > 6 ? w.slice(0, -1) : null;
  if (!quase) return;   // palavra curta demais para este teste
  m.g.action(a, { t: 'say', text: quase });
  assert.ok(m.V(a).chat.some(x => x.k === 'close' && x.text === quase));
  assert.ok(m.V(a).fx.some(e => e.k === 'close'));
  assert.ok(!m.V(b).chat.some(x => x.text === quase));
  assert.ok(m.V(b).chat.some(x => x.k === 'sys' && x.tone === 'close'));
  assert.ok(!m.V(b).fx.some(e => e.k === 'close'));
});

test('quando todo mundo acerta a vez termina, revela a palavra e passa para o próximo', () => {
  const m = sala(3);
  const { d, word, outros } = comecar(m);
  for (const o of outros) m.g.action(o, { t: 'say', text: word });
  const v = m.V(outros[0]);
  assert.equal(v.phase, 'reveal');
  assert.equal(m.g.view(null, 'tv').word, word, 'na revelação todo mundo vê');
  assert.equal(v.guessed.length, 2);
  m.g.onTimeUp();
  const v2 = m.V();
  assert.equal(v2.phase, 'choose');
  assert.notEqual(v2.drawer, d.pid);
});

test('ninguém acerta: tempo acaba, ninguém ganha ponto', () => {
  const m = sala(2);
  const { outros } = comecar(m);
  m.g.action(outros[0], { t: 'say', text: 'zzzz' });
  m.g.onTimeUp();
  const v = m.V();
  assert.equal(v.phase, 'reveal');
  assert.ok(Object.keys(v.scores).every(k => v.scores[k] === 0));
  assert.ok(v.chat.some(x => x.k === 'guess' && x.text === 'zzzz'), 'palpite errado aparece para todos');
});

test('escolha automática quando o tempo de escolher acaba', () => {
  const m = sala(2);
  m.g.action(m.players[0], { t: 'begin' });
  m.g.onTimeUp();
  assert.equal(m.V().phase, 'draw');
});

test('partida inteira: todas as rodadas, fim com pódio e prêmios', () => {
  const m = sala(3);
  m.g.action(m.players[0], { t: 'rb-cfg', cfg: { rounds: 2 } });
  m.g.action(m.players[0], { t: 'begin' });
  for (let turn = 0; turn < 6; turn++) {
    const v = m.V();
    assert.equal(v.phase, 'choose', 'vez ' + turn);
    const d = m.players.find(p => p.pid === v.drawer);
    m.g.action(d, { t: 'pick', i: 0 });
    const w = m.V(d).word;
    const outros = m.players.filter(p => p !== d);
    m.g.action(outros[0], { t: 'say', text: 'errado' + turn });
    m.g.action(outros[0], { t: 'say', text: w });
    if (turn % 2) m.g.action(outros[1], { t: 'say', text: w });
    else m.g.onTimeUp();
    m.g.onTimeUp();   // fim da revelação
  }
  const v = m.V();
  assert.equal(v.phase, 'end');
  assert.equal(v.rank.length, 3);
  assert.ok(v.awards.some(a => a.k === 'fast'));
  assert.ok(v.awards.some(a => a.k === 'artist'));
  m.g.action(m.players[2], { t: 'again' });
  assert.equal(m.V().phase, 'choose');
});

test('quadro: só quem desenha risca; a TV pede o quadro inteiro quando perde um pedaço', () => {
  const m = sala(3, { tv: true });
  const { d, outros } = comecar(m);
  m.g.input(outros[0], { k: 'draw', ops: [{ t: 's', id: 1, c: '#111111', w: 8, p: [1, 1, 5, 5] }] });
  assert.equal(m.streamed(), 0);
  m.g.input(d, { k: 'draw', ops: [{ t: 's', id: 1, c: '#111111', w: 8, p: [1, 1, 5, 5] }, { t: 'x' }] });
  assert.equal(m.streamed(), 1);
  const tv = m.g.view(null, 'tv');
  assert.equal(tv.board.seq, 1);
  assert.equal(tv.board.ops.length, 0, 'estado normal leva só o número do traço');
  assert.equal(m.g.tvAction({ t: 'rb-sync' }), true);
  assert.equal(m.g.view(null, 'tv').board.ops.length, 1, 'pediu: recebe tudo uma vez');
  assert.equal(m.g.view(null, 'tv').board.ops.length, 0);
});

test('saiu quem desenhava: a vez acaba e o jogo segue', () => {
  const m = sala(3);
  const { d } = comecar(m);
  m.players.splice(m.players.indexOf(d), 1);
  m.g.onPlayerLeave(d.pid, 0);
  assert.equal(m.V(m.players[0]).phase, 'reveal');
});

test('palavras da turma e só elas', () => {
  const m = sala(2);
  m.g.action(m.players[0], { t: 'rb-words', text: 'tio Zé, churrasco do domingo; gato da vizinha' });
  m.g.action(m.players[0], { t: 'rb-cfg', cfg: { onlyCustom: true } });
  assert.equal(m.V().cfg.customN, 3);
  assert.equal(m.V().cfg.custom, undefined, 'a lista em si não vai para os celulares');
  m.g.action(m.players[0], { t: 'begin' });
  const v = m.V();
  const d = m.players.find(p => p.pid === v.drawer);
  assert.ok(m.V(d).options.every(o => o.cat.key === 'turma'));
});

test('modo Caos: sem borracha, o servidor recusa desfazer', () => {
  const m = sala(2);
  const { d } = comecar(m, { preset: 'caos' });
  const v = m.V(d);
  if (!v.mod || v.mod.key !== 'semborracha') return;   // sorteado: só confere quando cair
  m.g.input(d, { k: 'draw', ops: [{ t: 'u' }] });
  assert.equal(m.streamed(), 0);
});

test('dicas aparecem com o tempo', async () => {
  const m = sala(2);
  // palavra longa e fixa: com palavra curta só sai 1 dica, no meio do tempo (o teste esperaria demais)
  m.g.action(m.players[0], { t: 'rb-words', text: 'paralelepipedo, helicoptero, computador' });
  m.g.action(m.players[0], { t: 'rb-cfg', cfg: { drawSec: 30, hints: 4, pace: 'cedo', onlyCustom: true } });
  const { outros } = comecar(m);
  const v = m.V(outros[0]);
  assert.equal(v.hintsTotal, 4);
  const tick = setInterval(() => {}, 1000);
  await new Promise(r => setTimeout(r, 30 * 1000 * 0.2 + 1500));
  clearInterval(tick);
  assert.ok(m.V(outros[0]).revealed >= 1);
  assert.ok(m.V(outros[0]).hint.some(ch => /[A-Z]/.test(ch)));
  m.g.destroy();
});
