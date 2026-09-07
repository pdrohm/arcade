'use strict';
// TV do KART. Este arquivo é carregado em toda TV (inclusive a Samsung de 2016), por isso fica em ES5.
// O desenho é 2.5D em Canvas 2D (shared/kart/render.js): nada de WebGL, roda em qualquer TV.
// Cartazes (lobby, carregando, resultado) são HTML por cima do canvas; HUD e contagem são pintados no canvas.
(function () {
  var A=ARCADE, renderer=null, context=null, generation=0, failure='', loading=false, readyId=null, overlayKey='';
  var TRACKS={race:'Circuito Aurora',battle:'Forte Prisma'}, MODES={race:'CORRIDA · 3 VOLTAS',battle:'BATALHA · 2 MINUTOS'};
  var SCRIPTS=['/shared/kart/world.js','/shared/kart/sprites.js','/shared/kart/render.js','/shared/kart/icons.js'];
  function stop(){generation++;if(renderer)renderer.dispose();renderer=null;context=null;loading=false;failure='';readyId=null;overlayKey='';document.body.classList.remove('kart-tv');}
  function fail(text){failure=text;overlayKey='';var e=document.getElementById('kart-overlay');if(e)e.innerHTML='<div class="kart-fail kart-sticker"><h2>O KART não conseguiu desenhar</h2><p>'+A.esc(text)+'</p><p>Atualize a página da TV. Os outros jogos do Arcade continuam funcionando.</p></div>';}
  // Os arquivos do desenho carregam em ordem (o segundo usa o primeiro) e só então o renderizador nasce.
  function loadScripts(list,i,token,done){if(i>=list.length){done();return;}var id='kart-js-'+i;if(document.getElementById(id)||(i===0&&window.KartWorld)||(i===1&&window.KartSprites)||(i===2&&window.KartRender)||(i===3&&window.KartIcons)){loadScripts(list,i+1,token,done);return;}var s=document.createElement('script');s.id=id;s.src=list[i];s.onload=function(){if(token===generation)loadScripts(list,i+1,token,done);};s.onerror=function(){s.parentNode.removeChild(s);if(token===generation){loading=false;fail('Não foi possível carregar '+list[i]+'. Atualize a página para tentar de novo.');}};document.head.appendChild(s);}
  function init(token){if(token!==generation||!context)return;try{var canvas=document.getElementById('kart-canvas');if(!canvas||!canvas.getContext||!canvas.getContext('2d'))throw new Error('este navegador não tem Canvas 2D');renderer=new window.KartRender(canvas);A.kartRenderer=renderer;renderer.update(context.G);loading=false;refresh(context);}catch(e){loading=false;if(renderer)renderer.dispose();renderer=null;fail(String(e.message||e));}}
  function load(){if(renderer||loading||failure)return;loading=true;var token=generation;loadScripts(SCRIPTS,0,token,function(){overlayKey='';init(token);});}
  function portrait(i,color,cls){var I=window.KartIcons;return '<span class="'+cls+'" style="background:'+(I?I.driverBg(i):'#cfe2ee')+'">'+(I?I.driver(i,color):'')+'</span>';}
  function kartIcon(i,color){var I=window.KartIcons;return I?I.kart(i,color):'';}
  function misc(name){var I=window.KartIcons;return I?I.misc(name):'';}
  function clock(t){t=Math.max(0,Math.floor(t));var m=Math.floor(t/60),s=t%60;return m+':'+(s<10?'0':'')+s;}
  function driverOf(g,pid){for(var i=0;i<g.roster.length;i++)if(g.roster[i].pid===pid)return g.roster[i].driver||0;return 0;}
  function pilotCard(p,g){var kartName=g.karts?g.karts[p.kart]:'';return '<div class="kart-pilot kart-sticker'+(p.ready?' ready':'')+'"><div class="kp-portrait" style="background:'+(window.KartIcons?window.KartIcons.driverBg(p.driver):'#cfe2ee')+'">'+(window.KartIcons?window.KartIcons.driver(p.driver,p.color):'')+'</div><strong>'+A.esc(p.name)+'</strong><small>'+A.esc(g.drivers[p.driver])+' · '+A.esc(kartName)+'</small><div class="kp-kart">'+kartIcon(p.kart,p.color)+'</div><span class="kp-tag '+(p.ready?'ready':'wait')+'">'+(p.ready?'PRONTO':'ESCOLHENDO…')+'</span></div>';}
  function confetti(){var out='<div class="kart-confetti">';for(var i=0;i<28;i++)out+='<i style="left:'+(i*3.6+1)+'%;-webkit-animation-delay:'+(-(i*.37)%3.2).toFixed(2)+'s;animation-delay:'+(-(i*.37)%3.2).toFixed(2)+'s;-webkit-animation-duration:'+(2.6+(i%5)*.35).toFixed(2)+'s;animation-duration:'+(2.6+(i%5)*.35).toFixed(2)+'s"></i>';return out+'</div>';}
  function overlay(g){var el=document.getElementById('kart-overlay');if(!el||failure)return;
    var key=g.phase+':'+g.mode+':'+(window.KartIcons?'i':'')+':'+(g.phase==='setup'?JSON.stringify([g.roster,g.error]):'');
    if(key===overlayKey)return;overlayKey=key;
    var logo=function(small){return '<div class="kart-logo'+(small?' small':'')+'"><span class="kl-arcade">Arcade</span><span class="kl-kart">Kart</span></div>';};
    if(g.phase==='setup'){var cards='';for(var i=0;i<g.roster.length;i++)cards+=pilotCard(g.roster[i],g);for(var e=g.roster.length;e<Math.max(2,Math.min(4,g.roster.length+1));e++)cards+='<div class="kart-pilot kart-sticker empty"><div class="kp-portrait">+</div><strong>Vaga livre</strong><small>entre pelo celular</small></div>';
      el.innerHTML='<div class="kart-lobby">'+logo()+'<div class="kart-track kart-sticker"><small>'+MODES[g.mode]+'</small><h1>'+TRACKS[g.mode]+'</h1></div><div class="kart-roster">'+cards+'</div><p class="kart-hint'+(g.error?' warn':'')+'">'+misc(g.error?'burst':'phone')+A.esc(g.error||'Escolha piloto e kart no celular · o primeiro piloto dá a largada')+'</p></div>';}
    else if(g.phase==='loading')el.innerHTML='<div class="kart-card kart-sticker kart-loading"><div class="kart-wheel">'+misc('wheel')+'</div><h2>PREPARANDO A PISTA…</h2><p>'+TRACKS[g.mode]+'</p></div>';
    else if(g.phase==='results'){var res=g.world.results,battle=g.mode==='battle';
      var info=function(p){return battle?p.kills+' KO'+(p.kills===1?'':'s')+' · '+p.deaths+' quedas':p.finished?clock(p.finishTime)+'.'+Math.floor(p.finishTime%1*10):p.lap+(p.lap===1?' volta':' voltas');};
      var step=function(p,n){return '<div class="kpd kpd-'+n+' kart-sticker">'+(n===1?'<div class="kpd-crown">'+misc('trophy')+'</div>':'')+'<div class="kp-portrait" style="background:'+(window.KartIcons?window.KartIcons.driverBg(driverOf(g,p.pid)):'#cfe2ee')+'">'+(window.KartIcons?window.KartIcons.driver(driverOf(g,p.pid),p.color):'')+'</div><strong>'+A.esc(p.name)+'</strong><small>'+info(p)+'</small><div class="kpd-step">'+n+'º</div></div>';};
      var podium=(res[1]?step(res[1],2):'')+(res[0]?step(res[0],1):'')+(res[2]?step(res[2],3):'');
      var others='';for(var o=3;o<res.length;o++)others+='<span class="kart-sticker">'+portrait(driverOf(g,res[o].pid),res[o].color,'kv-portrait')+res[o].position+'º · '+A.esc(res[o].name)+' · '+info(res[o])+'</span>';
      el.innerHTML=confetti()+'<div class="kart-results">'+logo(true)+'<small class="kr-kicker">RESULTADO · '+TRACKS[g.mode].toUpperCase()+'</small><div class="kart-podium">'+podium+'</div><div class="kart-podium-base"></div>'+(others?'<div class="kart-others">'+others+'</div>':'')+'<p class="kart-hint">'+misc('phone')+'Jogue de novo ou volte ao Arcade pelo celular</p></div>';}
    else el.innerHTML='';}
  // Estado completo (troca de fase, pilotos, erro): redesenha o cartaz e avisa o desenho.
  function refresh(c){context=c;var g=c.G;if(renderer){renderer.update(g);if(g.phase==='loading'&&readyId!==g.matchId){readyId=g.matchId;A.send({t:'kart-tv-ready',matchId:g.matchId});}}if(failure){fail(failure);return;}overlay(g);}
  // Quadro rápido (20 Hz): só entrega o estado ao desenho. Nada de innerHTML.
  function frame(c){context=c;var g=c.G;if(!g)return;if(renderer)renderer.update(g);}
  A.register('kart',{tv:{mount:function(c){stop();context=c;document.body.classList.add('kart-tv');if(!document.getElementById('kart-tv-css')){var link=document.createElement('link');link.id='kart-tv-css';link.rel='stylesheet';link.href='/shared/kart/tv.css';document.head.appendChild(link);}return '<div id="kart-stage"><canvas id="kart-canvas" width="960" height="540" aria-label="KART"></canvas><div id="kart-overlay"></div></div>';},html:function(){return {side:''};},after:function(c){refresh(c);load();},frame:frame,destroy:stop}});
})();
