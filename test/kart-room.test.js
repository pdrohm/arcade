const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtemp, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const WebSocket = require('ws');
const World = require('../shared/kart/world');

async function freePort() {
  const socket = net.createServer();
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  return port;
}
async function until(predicate, timeout = 8000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { const value = predicate(); if (value) return value; await new Promise(resolve => setTimeout(resolve, 20)); }
  throw new Error('Timed out waiting for room state');
}
async function connect(port, hello) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  const client = { ws, states: 0, frames: 0, game: null, core: null, you: null, errors: [], send: msg => ws.send(JSON.stringify(msg)) };
  ws.on('message', raw => {
    const msg = JSON.parse(raw);
    if (msg.t === 'state') { client.states++; client.core = msg.core; client.game = msg.game; client.you = msg.you; }
    if (msg.t === 'game-frame') { client.frames++; client.game = msg.game; }
    if (msg.t === 'error') client.errors.push(msg.text);
  });
  await new Promise((resolve,reject) => { ws.once('open',resolve); ws.once('error',reject); });
  client.send(hello);
  await until(() => client.core);
  return client;
}

test('room → Kart → phone inputs → exit → existing game; room and inventory isolation', { timeout: 30000 }, async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'arcade-kart-'));
  const port = await freePort();
  const server = spawn(process.execPath, ['server.js'], { cwd: path.resolve(__dirname,'..'), env: { ...process.env, PORT: String(port), STATE_FILE: path.join(dir,'state.json'), STATS_KEY:'test-only', NO_LAN:'1' }, stdio:['ignore','pipe','pipe'] });
  let output = ''; server.stdout.on('data', d => output += d); server.stderr.on('data', d => output += d);
  const clients = [];
  t.after(async () => { for (const c of clients) c.ws.terminate(); server.kill(); await new Promise(resolve => server.exitCode !== null ? resolve() : server.once('exit',resolve)); await rm(dir,{recursive:true,force:true}); });
  await until(() => output.includes('ARCADE DA CASA'));
  const add = async hello => { const c = await connect(port,hello); clients.push(c); return c; };
  const tv = await add({t:'tv',room:'TEST'});
  const elsewhere = await add({t:'tv',room:'SAFE'});
  const a = await add({t:'join',room:'TEST',pid:'alpha',name:'Ana',color:'roxo'});
  const b = await add({t:'join',room:'TEST',pid:'bravo',name:'Bia',color:'ciano'});
  const c = await add({t:'join',room:'TEST',pid:'charlie',name:'Caio',color:'amarelo'});
  const d = await add({t:'join',room:'TEST',pid:'delta',name:'Dani',color:'verde'});
  const spectator = await add({t:'join',room:'TEST',pid:'echo',name:'Eva',color:'rosa'});
  a.send({t:'play',id:'kart'});
  await until(() => a.game && a.game.phase === 'setup');
  assert.equal(a.game.roster.length,4);
  assert.equal(elsewhere.core.screen,'library');
  spectator.send({t:'kart-start'});
  b.send({t:'kart-mode',mode:'battle'});
  await new Promise(resolve => setTimeout(resolve,100));
  assert.equal(a.game.mode,'race'); assert.equal(a.game.phase,'setup');
  for (const p of [a,b,c,d]) p.send({t:'kart-ready'});
  await until(() => a.game.canStart);
  tv.send({t:'kart-tv-ready',matchId:a.game.matchId});
  a.send({t:'kart-start'});
  await until(() => a.game.phase === 'countdown');
  const pump = setInterval(() => {
    for (const [p,steer] of [[a,-.6],[b,.6]]) p.send({t:'input',matchId:p.game.matchId,steer,active:true,drift:false,item:false,boost:false});
  }, 70);
  t.after(() => clearInterval(pump));
  await until(() => a.game.phase === 'playing');
  const count = a.states;
  await new Promise(resolve => setTimeout(resolve,700));
  assert.ok(a.frames > 5,'fast stream arrives');
  assert.ok(a.states - count < 4,'input does not broadcast full room');
  const ka = a.game.world.karts.find(x => x.pid === 'alpha');
  const kb = a.game.world.karts.find(x => x.pid === 'bravo');
  assert.notEqual(ka.heading,kb.heading,'phones control independent karts');
  assert.ok(ka.speed > 0);
  assert.ok(a.game.private);
  assert.equal(tv.game.private,null);
  assert.ok(tv.game.world.karts.every(x => !Object.hasOwn(x,'item')));
  assert.equal(spectator.game.private,null);
  // Forged input cannot assign another public pid or send positions/laps.
  spectator.send({t:'input',matchId:a.game.matchId,pid:'alpha',steer:1,active:true,lap:99,x:99999});
  clearInterval(pump);
  await new Promise(resolve => setTimeout(resolve,1400));
  assert.ok(a.game.world.karts.find(x => x.pid === 'alpha').speed < ka.speed,'stale controls brake');
  assert.ok(a.game.world.karts.every(x => x.lap < 3));
  const sid = a.you.sid;
  a.ws.close();
  const rejoined = await add({t:'join',room:'TEST',pid:'alpha',sid,name:'Ana',color:'roxo'});
  assert.equal(rejoined.you.pid,'alpha');
  assert.equal(rejoined.game.roster.length,4);
  rejoined.send({t:'quit'});
  await until(() => tv.core.screen === 'library');
  const frames = tv.frames;
  await new Promise(resolve => setTimeout(resolve,200));
  assert.equal(tv.frames,frames,'Kart loop stops on exit');
  assert.equal(tv.core.players.length,5,'room seats survive Kart');
  rejoined.send({t:'play',id:'uno'});
  await until(() => tv.core.gameId === 'uno');
  assert.ok(tv.game,'existing game still starts');
  rejoined.send({t:'quit'});
  await until(() => tv.core.screen === 'library');
  rejoined.send({t:'play',id:'kart'});
  await until(() => rejoined.game && rejoined.core.gameId === 'kart');
  rejoined.send({t:'kart-mode',mode:'battle'});
  await until(() => rejoined.game.mode === 'battle');
  for (const url of ['/vendor/three/three.module.js','/vendor/three/three.core.js','/games/kart/tv.js','/games/kart/phone.js','/shared/kart/world.js']) {
    const response = await fetch(`http://127.0.0.1:${port}${url}`); assert.equal(response.status,200,url);
    assert.match(response.headers.get('content-type'),/javascript/);
  }
  assert.equal((await fetch(`http://127.0.0.1:${port}/vendor/three/package.json`)).status,404);
  assert.equal((await fetch(`http://127.0.0.1:${port}/games/kart/game.js`)).status,404);
});

// Optional full-duration wire test: no clock shortcuts or privileged simulation endpoints.
test('full 3-lap wire race and timed battle', { skip: process.env.KART_E2E !== '1', timeout: 260000 }, async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(),'arcade-kart-full-'));
  const port = await freePort();
  const server = spawn(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,PORT:String(port),STATE_FILE:path.join(dir,'state.json'),STATS_KEY:'test-only',NO_LAN:'1'},stdio:['ignore','pipe','pipe']});
  let output=''; server.stdout.on('data',d=>output+=d); server.stderr.on('data',d=>output+=d);
  const clients=[]; let pump;
  t.after(async()=>{clearInterval(pump);for(const c of clients)c.ws.terminate();server.kill();await new Promise(resolve=>server.exitCode!==null?resolve():server.once('exit',resolve));await rm(dir,{recursive:true,force:true});});
  await until(()=>output.includes('ARCADE DA CASA'));
  const add=async h=>{const c=await connect(port,h);clients.push(c);return c;};
  const tv=await add({t:'tv',room:'FULL'});
  const ps=[];
  for(const [i,color] of ['roxo','ciano'].entries()) ps.push(await add({t:'join',room:'FULL',pid:'pilot'+i,name:'Pilot '+i,color}));
  ps[0].send({t:'play',id:'kart'});
  await until(()=>ps[0].game&&ps[0].game.phase==='setup');
  async function launch(){for(const p of ps)p.send({t:'kart-ready'});await until(()=>ps[0].game.canStart);tv.send({t:'kart-tv-ready',matchId:ps[0].game.matchId});ps[0].send({t:'kart-start'});await until(()=>ps[0].game.phase==='playing');}
  const angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
  pump=setInterval(()=>{
    for(const p of ps){const g=p.game;if(!g||!g.world)continue;const k=g.world.karts.find(x=>x.pid===p.you.pid);if(!k)continue;
      let target;
      if(g.mode==='race') { const near=World.nearest(k.x,k.z); const index=Math.floor(near.progress*World.TRACK.length); target=World.TRACK[(index+4)%World.TRACK.length]; }
      else target=g.world.karts.find(x=>x.pid!==k.pid)||{x:0,z:0};
      const steer=Math.max(-1,Math.min(1,angle(Math.atan2(target.x-k.x,target.z-k.z)-k.heading)*1.4));
      p.send({t:'input',matchId:g.matchId,steer,active:true,drift:false,item:Math.floor(Date.now()/300)%2===0,boost:false});
    }
  },70);
  await launch();
  await until(()=>ps[0].game.phase==='results',120000);
  assert.ok(ps[0].game.world.karts.some(k=>k.lap===3),'driver completes three actual laps');
  assert.ok(ps[0].game.world.results.length===2);
  ps[0].send({t:'quit'});await until(()=>tv.core.screen==='library');
  ps[0].send({t:'play',id:'kart'});await until(()=>ps[0].game&&ps[0].game.phase==='setup');
  ps[0].send({t:'kart-mode',mode:'battle'});await until(()=>ps[0].game.mode==='battle');
  await launch();
  await until(()=>ps[0].game.phase==='results',145000);
  assert.ok(ps[0].game.world.time>=120);
  assert.equal(ps[0].game.world.results.length,2);
  ps[0].send({t:'quit'});await until(()=>tv.core.screen==='library');assert.equal(tv.core.players.length,2);
});
