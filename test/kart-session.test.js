const test = require('node:test');
const assert = require('node:assert/strict');
const Kart = require('../games/kart/game');
function harness() {
  const players = ['a','b','c'].map(pid=>({pid,name:pid,color:'roxo'}));
  let exits = 0;
  const api = { players, colorInfo:()=>({hex:'#a855f7'}), byPid:pid=>players.find(p=>p.pid===pid), setEvent(){}, broadcast(){}, stream(){}, exit(){exits++;} };
  const game = Kart.create(api); game.start();
  return { game, players, exits:()=>exits };
}
test('identity merge preserves exactly one driver in the surviving seat',()=>{
  const {game,players,exits}=harness();
  game.action(players[0],{t:'kart-select',driver:4});
  game.rekey('a','b');
  players[0].pid='b'; players.splice(1,1);
  game.onPlayerLeave('b');
  const view=game.view(null,'tv');
  assert.deepEqual(view.roster.map(p=>p.pid),['b','c']);
  assert.equal(view.roster[0].driver,4); assert.equal(exits(),0);
  game.destroy();
});
test('reconnect rekey keeps choice and rejects old-seat controls',()=>{
  const {game,players}=harness();
  game.action(players[0],{t:'kart-select',kart:2});
  game.rekey('a','new'); players[0].pid='new';
  assert.equal(game.view(null,'tv').roster[0].kart,2);
  assert.equal(game.view(null,'tv').roster[0].pid,'new');
  game.destroy();
});
test('server restart preserves choices but requires a new ready state',()=>{
  const {game,players}=harness();
  game.action(players[0],{t:'kart-select',driver:3});game.action(players[0],{t:'kart-ready'});
  const data=game.serialize();const match=game.view(null,'tv').matchId;
  game.restore(data);
  const restored=game.view(null,'tv');assert.equal(restored.phase,'setup');assert.notEqual(restored.matchId,match);
  assert.equal(restored.roster[0].driver,3);assert.equal(restored.roster[0].ready,false);assert.equal(restored.world,null);
  game.destroy();
});
