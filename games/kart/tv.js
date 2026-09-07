'use strict';
// TV do KART. Este arquivo é carregado em toda TV (inclusive a Samsung de 2016), por isso fica em ES5.
// O 3D só é carregado quando o navegador tem WebGL 2 e módulos; caso contrário mostra um aviso.
// Visual: "adesivos" de papel creme com tinta roxa, iguais aos do celular e ao mundo 3D.
(function () {
  var A=ARCADE, scene=null, context=null, generation=0, failure='', loading=false, readyId=null, hudKey='', overlayKey='', lastLap={}, flashUntil={};
  var TRACKS={race:'Circuito Aurora',battle:'Forte Prisma'}, MODES={race:'CORRIDA · 3 VOLTAS',battle:'BATALHA · 2 MINUTOS'};
  function stop(){generation++;if(scene)scene.dispose();scene=null;context=null;loading=false;failure='';readyId=null;hudKey='';overlayKey='';lastLap={};flashUntil={};document.body.classList.remove('kart-tv');}
  function fail(text){failure=text;overlayKey='';var e=document.getElementById('kart-overlay');if(e)e.innerHTML='<div class="kart-fail kart-sticker"><h2>KART precisa de uma TV com navegador 3D</h2><p>'+A.esc(text)+'</p><p>Abra a sala em um computador com Chrome, Edge ou Firefox atualizado.</p></div>';}
  function init(token){if(token!==generation||!context)return;try{scene=new A.KartScene(document.getElementById('kart-canvas'));scene.update(context.G);loading=false;refresh(context);}catch(e){loading=false;if(scene)scene.dispose();scene=null;fail('Não foi possível iniciar o 3D. '+String(e.message||e));}}
  function load(){if(scene||loading||failure)return;var probe=document.createElement('script');if(!('noModule' in probe)||!window.WebGL2RenderingContext){fail('Este navegador não tem suporte a WebGL 2 e módulos JavaScript.');return;}loading=true;var token=generation;if(A.KartScene){init(token);return;}probe.type='module';probe.src='/shared/kart/scene.js';probe.onload=function(){probe.remove();if(A.KartScene)init(token);else if(token===generation){loading=false;fail('O motor 3D não carregou. Atualize a página para tentar de novo.');}};probe.onerror=function(){probe.remove();if(token===generation){loading=false;fail('Não foi possível carregar o motor 3D. Atualize a página para tentar de novo.');}};document.head.appendChild(probe);}
  // Ícones (SVG) vêm de um arquivo comum com o celular; até carregar, os retratos ficam vazios e
  // o cartaz é redesenhado quando o arquivo chega.
  function icons(){if(window.KartIcons||document.getElementById('kart-icons-js'))return;var s=document.createElement('script');s.id='kart-icons-js';s.src='/shared/kart/icons.js';s.onload=function(){hudKey='';overlayKey='';if(context)refresh(context);};document.head.appendChild(s);}
  function portrait(i,color,cls){var I=window.KartIcons;return '<span class="'+cls+'" style="background:'+(I?I.driverBg(i):'#cfe2ee')+'">'+(I?I.driver(i,color):'')+'</span>';}
  function kartIcon(i,color){var I=window.KartIcons;return I?I.kart(i,color):'';}
  function misc(name){var I=window.KartIcons;return I?I.misc(name):'';}
  function put(el,text){if(el&&el.textContent!==text)el.textContent=text;}
  function show(el,on){if(el&&el.hidden===on)el.hidden=!on;}
  function clock(t){t=Math.max(0,Math.floor(t));var m=Math.floor(t/60),s=t%60;return m+':'+(s<10?'0':'')+s;}
  // Moldura do HUD: uma etiqueta por câmera. Só é reconstruída quando muda a lista de pilotos.
  function hudHtml(g){var karts=g.world.karts,n=karts.length,battle=g.mode==='battle',out='';
    for(var i=0;i<n;i++){var k=karts[i],x=n===2?i*50:i%2*50,y=n>2?Math.floor(i/2)*50:0,w=n===1?100:50,h=n>2?50:100;
      out+='<div class="kart-view-hud" style="left:'+x+'%;top:'+y+'%;width:'+w+'%;height:'+h+'%">'+
        '<div class="kv-top"><div class="kv-name">'+portrait(k.driver,k.color,'kv-portrait')+'<strong>'+A.esc(k.name)+'</strong><i class="kv-color" style="background:'+A.esc(k.color)+'"></i></div><div class="kv-pos" data-pos><b data-pos-n>'+(battle?k.kills:k.position)+'</b><i>'+(battle?'KO':'º')+'</i></div></div>'+
        '<div class="kv-bottom">'+(battle?'<div class="kv-hp"><span class="kv-heart">♥</span><span class="kv-bar"><i data-hp></i></span><b data-hp-n>100</b><b class="kv-clock" data-clock>2:00</b></div>':'<div class="kv-lap" data-lap>VOLTA <b data-lap-n>1</b>/3<span class="kv-dots"><i></i><i></i><i></i></span><b class="kv-clock" data-clock>0:00</b></div>')+
        '<div class="kv-speed" data-speed><span class="kv-boost" data-boost hidden>TURBO!</span><svg viewBox="0 0 100 62"><path class="kv-gauge-ink" d="M10 50A40 40 0 0 1 90 50"/><path class="kv-gauge-bg" d="M10 50A40 40 0 0 1 90 50"/><path class="kv-gauge" data-gauge d="M10 50A40 40 0 0 1 90 50"/></svg><span class="kv-kmh"><span data-kmh>0</span><small>KM/H</small></span><div class="kv-drift"><i data-drift></i></div></div></div>'+
        '<div class="kart-respawn kart-sticker" data-respawn hidden>VOLTANDO…</div><div class="kart-flash kart-stroke" data-flash hidden></div></div>';}
    return out;}
  function hud(g){var el=document.getElementById('kart-hud');if(!el)return;
    if(!g.world||g.phase==='setup'||g.phase==='loading'||g.phase==='results'){if(hudKey){el.innerHTML='';hudKey='';}return;}
    var karts=g.world.karts,key=g.matchId+':'+g.mode+':'+(window.KartIcons?'i':'');for(var j=0;j<karts.length;j++)key+='|'+karts[j].pid+karts[j].name+karts[j].color+karts[j].driver;
    if(key!==hudKey){hudKey=key;lastLap={};flashUntil={};el.innerHTML=hudHtml(g);}
    var battle=g.mode==='battle',t=g.world.time,clockText=battle?clock(120-t):clock(t),low=battle&&120-t<=10;
    var views=el.querySelectorAll('.kart-view-hud');
    for(var i=0;i<karts.length&&i<views.length;i++){var k=karts[i],v=views[i];
      var pos=v.querySelector('[data-pos]');put(v.querySelector('[data-pos-n]'),String(battle?k.kills:k.position));
      var pc=battle?'kv-pos ko':'kv-pos p'+Math.min(4,k.position);if(pos.className!==pc)pos.className=pc;
      put(v.querySelector('[data-clock]'),clockText);
      if(battle){var hp=Math.max(0,Math.ceil(k.hp)),bar=v.querySelector('[data-hp]'),hpEl=v.querySelector('.kv-hp');put(v.querySelector('[data-hp-n]'),String(hp));if(bar){bar.style.width=hp+'%';var bc=hp<=30?'low':hp<=60?'mid':'';if(bar.className!==bc)bar.className=bc;}if(hpEl&&hpEl.classList.contains('low')!==low)hpEl.classList.toggle('low',low);}
      else{var lap=Math.min(3,k.lap+1),lapEl=v.querySelector('[data-lap]');put(v.querySelector('[data-lap-n]'),k.finished?'3':String(lap));var dots=lapEl.querySelectorAll('.kv-dots i');for(var d=0;d<dots.length;d++){var on=d<k.lap;if(dots[d].classList.contains('on')!==on)dots[d].classList.toggle('on',on);}var fin=k.lap>=2&&!k.finished;if(lapEl.classList.contains('final')!==fin)lapEl.classList.toggle('final',fin);
        if(lastLap[k.pid]===undefined)lastLap[k.pid]=k.lap;else if(k.lap===2&&lastLap[k.pid]<2){flashUntil[k.pid]={until:t+2,text:'VOLTA FINAL!'};lastLap[k.pid]=k.lap;}}
      // Velocímetro: arco que enche com a velocidade; fica vermelho no turbo. Barra de derrapagem embaixo.
      var speed=k.speed||0,gauge=v.querySelector('[data-gauge]'),sp=v.querySelector('[data-speed]');if(gauge)gauge.style.strokeDashoffset=String(Math.round(126*(1-Math.min(1,speed/38))));
      put(v.querySelector('[data-kmh]'),String(Math.round(speed*4)));var boosting=k.boost>0;if(sp.classList.contains('boost')!==boosting)sp.classList.toggle('boost',boosting);show(v.querySelector('[data-boost]'),boosting);
      var drift=v.querySelector('[data-drift]');if(drift){drift.style.width=Math.round(Math.min(1,(k.driftCharge||0)/2.5)*100)+'%';var ch=k.driftCharge>=.65;if(drift.classList.contains('charged')!==ch)drift.classList.toggle('charged',ch);}
      show(v.querySelector('[data-respawn]'),k.respawn>0);
      // Avisos curtos por câmera: largada, volta final, chegada.
      var flash=v.querySelector('[data-flash]'),text='';
      if(g.phase==='playing'&&t<1.1)text='JÁ!';else if(k.finished&&g.phase==='playing'&&t-k.finishTime<2.5)text='<small>CHEGOU</small>'+k.position+'º';else if(flashUntil[k.pid]&&flashUntil[k.pid].until>t)text=flashUntil[k.pid].text;
      if(flash.getAttribute('data-text')!==text){flash.setAttribute('data-text',text);flash.innerHTML=text;}show(flash,!!text);}
  }
  function pilotCard(p,g){var kartName=g.karts?g.karts[p.kart]:'';return '<div class="kart-pilot kart-sticker'+(p.ready?' ready':'')+'"><div class="kp-portrait" style="background:'+(window.KartIcons?window.KartIcons.driverBg(p.driver):'#cfe2ee')+'">'+(window.KartIcons?window.KartIcons.driver(p.driver,p.color):'')+'</div><strong>'+A.esc(p.name)+'</strong><small>'+A.esc(g.drivers[p.driver])+' · '+A.esc(kartName)+'</small><div class="kp-kart">'+kartIcon(p.kart,p.color)+'</div><span class="kp-tag '+(p.ready?'ready':'wait')+'">'+(p.ready?'PRONTO':'ESCOLHENDO…')+'</span></div>';}
  function confetti(){var out='<div class="kart-confetti">';for(var i=0;i<28;i++)out+='<i style="left:'+(i*3.6+1)+'%;animation-delay:'+(-(i*.37)%3.2).toFixed(2)+'s;animation-duration:'+(2.6+(i%5)*.35).toFixed(2)+'s"></i>';return out+'</div>';}
  function overlay(g){var el=document.getElementById('kart-overlay');if(!el||failure)return;
    var key=g.phase+':'+g.mode+':'+g.countdown+':'+(window.KartIcons?'i':'')+':'+(g.phase==='setup'?JSON.stringify([g.roster,g.error]):'');
    if(key===overlayKey)return;overlayKey=key;
    var logo=function(small){return '<div class="kart-logo'+(small?' small':'')+'"><span class="kl-arcade">Arcade</span><span class="kl-kart">Kart</span></div>';};
    if(g.phase==='setup'){var cards='';for(var i=0;i<g.roster.length;i++)cards+=pilotCard(g.roster[i],g);for(var e=g.roster.length;e<Math.max(2,Math.min(4,g.roster.length+1));e++)cards+='<div class="kart-pilot kart-sticker empty"><div class="kp-portrait">+</div><strong>Vaga livre</strong><small>entre pelo celular</small></div>';
      el.innerHTML='<div class="kart-lobby">'+logo()+'<div class="kart-track kart-sticker"><small>'+MODES[g.mode]+'</small><h1>'+TRACKS[g.mode]+'</h1></div><div class="kart-roster">'+cards+'</div><p class="kart-hint'+(g.error?' warn':'')+'">'+misc(g.error?'burst':'phone')+A.esc(g.error||'Escolha piloto e kart no celular · o primeiro piloto dá a largada')+'</p></div>';}
    else if(g.phase==='loading')el.innerHTML='<div class="kart-card kart-sticker kart-loading"><div class="kart-wheel">'+misc('wheel')+'</div><h2>PREPARANDO A PISTA…</h2><p>'+TRACKS[g.mode]+'</p></div>';
    else if(g.phase==='countdown'){var lights='';for(var l=0;l<3;l++)lights+='<i class="'+(l<4-g.countdown?'on':'')+'"></i>';el.innerHTML='<div class="kart-countdown"><b>'+g.countdown+'</b><div class="kart-lights kart-sticker">'+lights+'</div></div>';}
    else if(g.phase==='results'){var res=g.world.results,battle=g.mode==='battle';
      var info=function(p){return battle?p.kills+' KO'+(p.kills===1?'':'s')+' · '+p.deaths+' quedas':p.finished?clock(p.finishTime)+'.'+Math.floor(p.finishTime%1*10):p.lap+(p.lap===1?' volta':' voltas');};
      var step=function(p,n){return '<div class="kpd kpd-'+n+' kart-sticker">'+(n===1?'<div class="kpd-crown">'+misc('trophy')+'</div>':'')+'<div class="kp-portrait" style="background:'+(window.KartIcons?window.KartIcons.driverBg((g.roster.filter(function(r){return r.pid===p.pid;})[0]||{}).driver||0):'#cfe2ee')+'">'+(window.KartIcons?window.KartIcons.driver((g.roster.filter(function(r){return r.pid===p.pid;})[0]||{}).driver||0,p.color):'')+'</div><strong>'+A.esc(p.name)+'</strong><small>'+info(p)+'</small><div class="kpd-step">'+n+'º</div></div>';};
      var podium=(res[1]?step(res[1],2):'')+(res[0]?step(res[0],1):'')+(res[2]?step(res[2],3):'');
      var others='';for(var o=3;o<res.length;o++)others+='<span class="kart-sticker">'+portrait((g.roster.filter(function(r){return r.pid===res[o].pid;})[0]||{}).driver||0,res[o].color,'kv-portrait')+res[o].position+'º · '+A.esc(res[o].name)+' · '+info(res[o])+'</span>';
      el.innerHTML=confetti()+'<div class="kart-results">'+logo(true)+'<small class="kr-kicker">RESULTADO · '+TRACKS[g.mode].toUpperCase()+'</small><div class="kart-podium">'+podium+'</div><div class="kart-podium-base"></div>'+(others?'<div class="kart-others">'+others+'</div>':'')+'<p class="kart-hint">'+misc('phone')+'Jogue de novo ou volte ao Arcade pelo celular</p></div>';}
    else el.innerHTML='';}
  // Estado completo (troca de fase, pilotos, erro): redesenha a sobreposição e avisa o 3D.
  function refresh(c){context=c;var g=c.G;if(scene){scene.update(g);if(g.phase==='loading'&&readyId!==g.matchId){readyId=g.matchId;A.send({t:'kart-tv-ready',matchId:g.matchId});}}if(failure){fail(failure);return;}overlay(g);hud(g);}
  // Quadro rápido (20 Hz): só posições, voltas e avisos. Nada de innerHTML.
  function frame(c){context=c;var g=c.G;if(!g)return;if(scene)scene.update(g);if(!failure)hud(g);}
  A.register('kart',{tv:{mount:function(c){stop();context=c;document.body.classList.add('kart-tv');if(!document.getElementById('kart-tv-css')){var link=document.createElement('link');link.id='kart-tv-css';link.rel='stylesheet';link.href='/shared/kart/tv.css';document.head.appendChild(link);}icons();return '<div id="kart-stage"><canvas id="kart-canvas" aria-label="KART 3D"></canvas><div id="kart-hud"></div><div id="kart-overlay"></div></div>';},html:function(){return {side:''};},after:function(c){refresh(c);load();},frame:frame,destroy:stop}});
})();
