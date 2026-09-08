'use strict';
const W=require('./world');
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const ROAD_TOP_SPEED=25;
const OFFROAD_TOP_SPEED=11;
const BOOST_TOP_SPEED=37;
const ROAD_ACCELERATION=18;
const OFFROAD_ACCELERATION=12;
const OFFROAD_OVERSPEED_DECELERATION=26;
const BOOST_ACCELERATION=26;
const SAFETY_BRAKE_DECELERATION=24;
const HIT_DECELERATION=38;
const HOP_VELOCITY=7.5;
const HOP_COOLDOWN=.45;
const BOMB_THROW_SPEED=22;
function createMatch(roster,mode='race'){
 mode=mode==='battle'?'battle':'race';const map=W.map(mode);
 return {mode,time:0,finished:false,results:[],firstFinish:null,nextId:1,pickups:map.pickups.map((p,i)=>({...p,id:i,cooldown:0})),projectiles:[],effects:[],karts:roster.slice(0,4).map((p,i)=>({pid:p.pid,name:p.name,color:p.color,driver:p.driver||0,kart:p.kart||0,...map.spawns[i],speed:0,vx:0,vz:0,vy:0,lap:0,position:i+1,finished:false,finishTime:null,hp:100,kills:0,deaths:0,item:null,boost:0,boostCooldown:0,driftCharge:0,respawn:0,shield:1.5,slip:0,stun:0,clockSlow:0,checkpoint:0,progress:0,travel:0,lastGround:map.spawns[i].y,lastItem:false,lastBoost:false,lastDrift:false,wasDrifting:false,driftDir:0,hopCooldown:0,padCooldown:0,ramCooldown:0,lastAttacker:null,lastHit:-100,bump:-100}))};
}
function effect(s,type,x,z,y=0){s.effects.push({id:s.nextId++,type,x,z,y,life:.6});}
function spawn(s,k){const i=s.karts.indexOf(k),p=s.mode==='race'?W.point(k.checkpoint/12+.012,(i%2?1:-1)*2):W.map(s.mode).spawns[i];Object.assign(k,p,{speed:0,vx:0,vz:0,vy:0,respawn:0,hp:100,shield:2,slip:0,stun:0,clockSlow:0,lastGround:p.y,driftCharge:0,lastDrift:false,wasDrifting:false,driftDir:0,hopCooldown:0});}
function damage(s,target,amount,owner){if(target.finished||target.respawn>0||target.shield>0)return;target.lastAttacker=owner||null;target.lastHit=s.time;target.stun=.3;effect(s,'hit',target.x,target.z,target.y);if(s.mode!=='battle'){target.speed*=.4;return;}target.hp=Math.max(0,target.hp-amount);if(target.hp===0){target.deaths++;target.respawn=3;target.speed=0;target.item=null;const killer=s.karts.find(k=>k.pid===owner);if(killer&&killer!==target)killer.kills++;effect(s,'explosion',target.x,target.z,target.y);}}
function useItem(s,k){
 if(!k.item||k.respawn>0||k.finished)return;const type=k.item;k.item=null;
 if(type==='shield'){k.shield=5;return;}if(type==='boost'){k.boost=Math.max(k.boost,2);return;}
 if(type==='clock'){for(const rival of s.karts){if(rival===k||rival.respawn>0||rival.finished||rival.shield>0)continue;rival.clockSlow=Math.max(rival.clockSlow,2.5);rival.speed*=.68;rival.vx*=.68;rival.vz*=.68;effect(s,'hit',rival.x,rival.z,rival.y);}return;}
 const behind=['mine','oil','banana','nitro'].includes(type),dir=behind?-1:1;
 const speed=behind?0:type==='rapid'?65:type==='bomb'?BOMB_THROW_SPEED:43;
 let vx=Math.sin(k.heading)*speed,vz=Math.cos(k.heading)*speed;
 // Thrown bombs retain the kart's velocity, then receive a forward throw impulse.
 if(type==='bomb'){vx+=k.vx;vz+=k.vz;}
 const x=k.x+Math.sin(k.heading)*3*dir,z=k.z+Math.cos(k.heading)*3*dir;
 // Traps are placed on the road even when the kart releases them during a hop.
 const y=behind?W.ground(x,z,s.mode,k.y)+.7:k.y+.7;
 const p={id:s.nextId++,type,owner:k.pid,x,z,y,vx,vz,vy:type==='bomb'?8:0,life:behind?12:type==='bomb'?1.4:3,age:0};
 s.projectiles.push(p);if(type==='rapid'){for(const offset of [-.13,.13])s.projectiles.push({...p,id:s.nextId++,vx:Math.sin(k.heading+offset)*speed,vz:Math.cos(k.heading+offset)*speed});}
}
function explode(s,p){effect(s,'explosion',p.x,p.z,p.y);for(const k of s.karts)if(distance(k,p)<8&&Math.abs(k.y-p.y)<6)damage(s,k,45,p.owner);}
function projectiles(s,dt){for(const p of s.projectiles){p.life-=dt;p.age+=dt;p.x+=p.vx*dt;p.z+=p.vz*dt;if(p.type==='bomb'){p.vy-=20*dt;p.y+=p.vy*dt;const ground=W.ground(p.x,p.z,s.mode,p.y);if(p.y<ground+.3){p.y=ground+.3;p.vy=Math.abs(p.vy)*.45;}if(p.life<=0){explode(s,p);continue;}}else if(!['mine','oil','banana','nitro'].includes(p.type))p.y=W.ground(p.x,p.z,s.mode,p.y)+.7;
 if(p.life<=0)continue;for(const k of s.karts){const groundTrap=['oil','mine','banana','nitro'].includes(p.type),hitHeight=groundTrap?.75:2.7;if(k.respawn>0||k.finished||(k.pid===p.owner&&p.age<.65)||distance(k,p)>2.5||Math.abs(k.y+.7-p.y)>hitHeight)continue;if(p.type==='bomb'||p.type==='nitro'){explode(s,p);}else if(p.type==='oil'||p.type==='banana'){if(k.shield<=0){k.slip=p.type==='banana'?2.4:1.8;if(p.type==='banana'){k.speed*=.75;k.vx*=.75;k.vz*=.75;}}effect(s,'hit',k.x,k.z,k.y);}else damage(s,k,p.type==='rapid'?16:p.type==='mine'?40:35,p.owner);p.life=0;break;}
 if(W.map(s.mode).barriers.some(b=>Math.abs(p.x-b.x)<b.width/2&&Math.abs(p.z-b.z)<b.depth/2&&p.y<(b.y||0)+b.height))p.life=0;
 }s.projectiles=s.projectiles.filter(p=>p.life>0);}
function move(s,k,input,dt){
 const active=input.active===true,throttle=active&&input.throttle===true,steer=active&&Number.isFinite(input.steer)?clamp(input.steer,-1,1):0;
 for(const key of ['boost','boostCooldown','shield','slip','stun','clockSlow','hopCooldown','padCooldown','ramCooldown'])k[key]=Math.max(0,k[key]-dt);
 if(k.respawn>0){k.respawn-=dt;if(k.respawn<=0)spawn(s,k);k.lastItem=!!input.item;k.lastBoost=!!input.boost;k.lastDrift=!!input.drift;return;}
 if(k.finished){k.speed=Math.max(0,k.speed-18*dt);return;}
 if(active&&input.item&&!k.lastItem)useItem(s,k);if(active&&input.boost&&!k.lastBoost&&k.boostCooldown<=0){k.boost=1.25;k.boostCooldown=9;}k.lastItem=!!input.item;k.lastBoost=!!input.boost;
 const n=W.nearest(k.x,k.z),shortcut=s.mode==='race'&&W.map('race').shortcuts.some(p=>Math.abs(k.x-p.x)<p.width/2&&Math.abs(k.z-p.z)<p.depth/2),offroad=s.mode==='race'&&n.distance>W.ROAD_WIDTH/2&&!shortcut;
 // B always starts with a hop. Holding it with steering turns that hop into a drift.
 const driftPressed=active&&!!input.drift&&!k.lastDrift;
 const grounded=k.y<=k.lastGround+.12&&k.vy<=0;
 if(driftPressed&&grounded&&k.speed>3&&k.hopCooldown<=0){k.vy=HOP_VELOCITY;k.hopCooldown=HOP_COOLDOWN;}
 const canDrift=active&&!!input.drift&&k.speed>9&&(k.y-k.lastGround<.8||k.wasDrifting);
 const drifting=k.wasDrifting?canDrift:canDrift&&Math.abs(steer)>.15;
 if(drifting&&!k.wasDrifting)k.driftDir=steer<0?-1:1;
 if(drifting)k.driftCharge=Math.min(2.5,k.driftCharge+dt);else if(k.wasDrifting){if(k.driftCharge>=.65&&active&&!input.drift)k.boost=Math.max(k.boost,Math.min(1.9,k.driftCharge));k.driftCharge=0;}k.wasDrifting=drifting;if(!drifting)k.driftDir=0;k.lastDrift=!!input.drift;
 const normalTop=offroad?OFFROAD_TOP_SPEED:k.boost>0?BOOST_TOP_SPEED:ROAD_TOP_SPEED;
 const top=k.clockSlow>0?normalTop*.65:normalTop;
 const hasPower=active&&k.stun<=0&&(throttle||k.boost>0);
 if(hasPower){
  if(k.speed<top){
   // The engine pulls strongly from low speed, then eases into top speed instead of hitting it abruptly.
   const acceleration=k.boost>0?BOOST_ACCELERATION:offroad?OFFROAD_ACCELERATION:ROAD_ACCELERATION;
   const remaining=top-k.speed,taper=.35+.65*remaining/top;
   k.speed+=Math.min(remaining,acceleration*taper*dt);
  }else{
   // When a boost expires, return to normal top speed without a sudden velocity cut.
   const overspeedResistance=offroad?OFFROAD_OVERSPEED_DECELERATION:2.2+k.speed*.025;
   k.speed=Math.max(top,k.speed-overspeedResistance*dt);
  }
 }else{
  // Releasing A or hopping only removes engine power. Stale input still uses a safety brake.
  const resistance=k.stun>0?HIT_DECELERATION:!active?SAFETY_BRAKE_DECELERATION:offroad?7+k.speed*.12:2.2+k.speed*.025;
  k.speed=Math.max(0,k.speed-resistance*dt);
 }
 // While drifting the kart always turns into the slide; the stick tightens (same side) or opens (counter-steer) the arc.
 const speedRatio=clamp(k.speed/ROAD_TOP_SPEED,0,1);
 const steeringRate=2.9+(1.65-2.9)*speedRatio;
 const steeringAtSpeed=.55+.45*clamp(k.speed/6,0,1);
 const turn=drifting?k.driftDir*(1.5+.9*steer*k.driftDir):steer*steeringRate;
 k.heading=(k.heading+turn*steeringAtSpeed*dt+(k.slip>0?1.8*dt:0))%TAU;
 // High-speed grip is deliberately softer so the old travel direction fades instead of snapping to the nose.
 const grip=k.slip>0?1.5:drifting?3.1:11-5.5*speedRatio,blend=1-Math.exp(-grip*dt);
 k.vx+=(Math.sin(k.heading)*k.speed-k.vx)*blend;k.vz+=(Math.cos(k.heading)*k.speed-k.vz)*blend;
 k.x+=k.vx*dt;k.z+=k.vz*dt;
 const surface=W.ground(k.x,k.z,s.mode,k.y+.5),oldGround=k.lastGround;
 if(k.y<=oldGround+.25&&k.vy<=0&&surface<oldGround-.45&&k.speed>10)k.vy=5;
 k.vy-=22*dt;k.y+=k.vy*dt;
 if(k.y<=surface&&k.vy<=0){k.y=surface;k.vy=0;}k.lastGround=surface;
 if(s.mode==='race'){
  // Soft wall just inside the rails (rails sit at ±13): the kart bounces back onto the grass, never onto the rail.
  const current=W.nearest(k.x,k.z);if(current.distance>W.ROAD_WIDTH/2+3.8&&current.distance<23&&!shortcut&&k.y<=current.y+1.2){const dx=k.x-current.x,dz=k.z-current.z,scale=(W.ROAD_WIDTH/2+3.8)/current.distance;if(k.speed>8)k.bump=s.time;k.x=current.x+dx*scale;k.z=current.z+dz*scale;k.speed*=.92;k.vx*=.6;k.vz*=.6;}
  if(current.distance>25||k.y< -10){k.respawn=1;return;}
  const checkpoint=Math.floor(current.progress*12);if(current.distance<13&&checkpoint===(k.checkpoint+1)%12){k.checkpoint=checkpoint;k.travel++;if(checkpoint===0){k.lap++;if(k.lap>=3){k.lap=3;k.finished=true;k.finishTime=s.time;s.firstFinish??=s.time;effect(s,'finish',k.x,k.z,k.y);}}}k.progress=current.progress;
 }else{
  if(Math.abs(k.x)>65||Math.abs(k.z)>65||k.y< -10){damage(s,k,100,k.lastAttacker&&s.time-k.lastHit<5?k.lastAttacker:null);if(k.respawn<=0)spawn(s,k);return;}
  for(const h of W.map('battle').hazards)if(distance(k,h)<h.radius&&k.y<1){damage(s,k,100,k.lastAttacker&&s.time-k.lastHit<5?k.lastAttacker:null);break;}
 }
 for(const b of W.map(s.mode).barriers){if(k.y>(b.y||0)+b.height)continue;const dx=k.x-b.x,dz=k.z-b.z,px=b.width/2+1.1-Math.abs(dx),pz=b.depth/2+1.1-Math.abs(dz);if(px>0&&pz>0){if(px<pz){k.x+=(dx>=0?1:-1)*px;k.vx*=-.4;}else{k.z+=(dz>=0?1:-1)*pz;k.vz*=-.4;}if(k.speed>8)k.bump=s.time;k.speed*=.65;}}
 for(const b of W.map(s.mode).boosts)if(k.padCooldown<=0&&distance(k,b)<3&&Math.abs(k.y-b.y)<2){k.boost=1.2;k.padCooldown=2;effect(s,'boost',k.x,k.z,k.y);}
 for(const p of s.pickups)if(!k.item&&p.cooldown<=0&&distance(k,p)<3&&Math.abs(k.y-p.y)<2){const items=s.mode==='battle'?['rocket','rapid','mine','nitro','bomb','banana','clock','shield','boost']:['rocket','bomb','oil','banana','nitro','clock','shield','boost'];k.item=items[Math.floor((s.time*17+p.id*7+s.karts.indexOf(k)*3))%items.length];p.cooldown=5;effect(s,'pickup',p.x,p.z,p.y);break;}
}
function collisions(s){
 for(let i=0;i<s.karts.length;i++)for(let j=i+1;j<s.karts.length;j++){
  const a=s.karts[i],b=s.karts[j];
  if(a.respawn>0||b.respawn>0||a.finished||b.finished||Math.abs(a.y-b.y)>2)continue;
  const d=distance(a,b);if(d>=2.7)continue;
  const nx=d>.001?(b.x-a.x)/d:1,nz=d>.001?(b.z-a.z)/d:0,overlap=(2.7-d)/2;
  a.x-=nx*overlap;a.z-=nz*overlap;b.x+=nx*overlap;b.z+=nz*overlap;
  const closing=(a.vx-b.vx)*nx+(a.vz-b.vz)*nz;if(closing<=0)continue;
  const aForward=a.vx*nx+a.vz*nz,bForward=-b.vx*nx-b.vz*nz;
  const impulse=closing*.8+2,retention=clamp(1-closing*.012,.65,.92);
  a.vx-=nx*impulse;a.vz-=nz*impulse;b.vx+=nx*impulse;b.vz+=nz*impulse;
  // A collision removes some engine momentum but leaves enough speed for an immediate recovery.
  a.speed*=retention;b.speed*=retention;
  if(closing>6)a.bump=b.bump=s.time;
  if(s.mode==='battle'&&closing>9&&a.ramCooldown<=0&&b.ramCooldown<=0){const attacker=aForward>bForward?a:b,victim=attacker===a?b:a;damage(s,victim,Math.min(40,closing*1.4),attacker.pid);a.ramCooldown=b.ramCooldown=.75;}
 }
}
function raceProgress(k){const local=((k.progress-k.checkpoint/12+1.5)%1)-.5;return k.travel+clamp(local*12,-1,1);}
function standings(s){const sorted=[...s.karts].sort(s.mode==='battle'?(a,b)=>b.kills-a.kills||a.deaths-b.deaths||b.hp-a.hp:(a,b)=>Number(b.finished)-Number(a.finished)||(a.finished&&b.finished?a.finishTime-b.finishTime:0)||raceProgress(b)-raceProgress(a));sorted.forEach((k,i)=>k.position=i+1);return sorted;}
function step(s,inputs,dt){if(s.finished)return;dt=Number.isFinite(dt)?clamp(dt,0,.05):0;if(!dt)return;s.time+=dt;for(const p of s.pickups)p.cooldown=Math.max(0,p.cooldown-dt);for(const e of s.effects)e.life-=dt;s.effects=s.effects.filter(e=>e.life>0);for(const k of s.karts)move(s,k,inputs instanceof Map?inputs.get(k.pid)||{}:inputs?.[k.pid]||{},dt);collisions(s);projectiles(s,dt);const sorted=standings(s);if(s.mode==='battle'?s.time>=120:s.time>=240||s.karts.every(k=>k.finished)||(s.firstFinish!==null&&s.time-s.firstFinish>=20)){s.finished=true;s.results=sorted.map(k=>({pid:k.pid,name:k.name,color:k.color,position:k.position,finishTime:k.finishTime,finished:k.finished,lap:k.lap,kills:k.kills,deaths:k.deaths}));}}
// Snapshots go out twenty times a second to every screen: two decimals keep the wire small.
const r2=v=>typeof v==='number'?Math.round(v*100)/100:v;
const rounded=o=>{const out={};for(const key in o)out[key]=r2(o[key]);return out;};
function publicState(s){return {mode:s.mode,time:r2(s.time),finished:s.finished,results:s.results.map(r=>({...r})),karts:s.karts.map(k=>{const {lastItem,lastBoost,lastDrift,lastAttacker,lastHit,bump,wasDrifting,lastGround,hopCooldown,ramCooldown,padCooldown,...publicKart}=k;return rounded(publicKart);}),pickups:s.pickups.map(rounded),projectiles:s.projectiles.map(rounded),effects:s.effects.map(rounded)};}
module.exports={createMatch,step,publicState,useItem};
