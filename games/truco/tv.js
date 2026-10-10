// Truco na TV: a mesa. Cada pessoa tem o seu lugar, com a ordem da vaza, quem deu as cartas e a dupla.
// Quando alguém joga, a carta VOA da cadeira até o lugar dela na mesa; no fim da vaza, as cartas vão
// para quem ganhou. A TV nunca mostra a mão de ninguém: só quantas cartas cada pessoa ainda tem.
//
// A TV da casa usa Chrome 47; CSS e sintaxe seguem docs/TV-ANTIGA.md.
// A mesa é montada uma vez (mount) e atualizada por dentro (after); as animações nascem da
// diferença entre o estado anterior e o novo, como no UNO.
'use strict';
(() => {
  const variants = { paulista: 'Paulista', mineiro: 'Mineiro', gaucho: 'Gaudério' };
  const TEAM = ['#ffce1f', '#3db4f2'];
  const TEAM_INK = ['#0f0f14', '#0f0f14'];
  const suits = {
    french: { S: ['♠', 'Espadas'], H: ['♥', 'Copas'], D: ['♦', 'Ouros'], C: ['♣', 'Paus'] },
    spanish: { E: ['E', 'Espadas'], B: ['B', 'Bastos'], O: ['O', 'Ouros'], C: ['C', 'Copas'] },
  };
  // Nome do pedido de truco pelo valor que ele passa a valer, em cada variante.
  const TRUCO_NAMES = {
    paulista: { 3: 'TRUCO!', 6: 'SEIS!', 9: 'NOVE!', 12: 'DOZE!' },
    mineiro: { 4: 'TRUCO!', 6: 'SEIS!', 10: 'DEZ!', 12: 'DOZE!' },
    gaucho: { 2: 'TRUCO!', 3: 'RETRUCO!', 4: 'VALE QUATRO!' },
  };
  const CALL_NAMES = { envido: 'ENVIDO!', real_envido: 'REAL ENVIDO!', falta_envido: 'FALTA ENVIDO!', flor: 'FLOR!', contra_flor: 'CONTRA FLOR!', contra_flor_resto: 'CONTRA FLOR AO RESTO!' };
  const TOPS = {
    mineiro: 'Manilhas: 4♣ · 7♥ · A♠ · 7♦',
    gaucho: '1 de Espadas · 1 de Bastos · 7 de Espadas · 7 de Ouros',
  };

  const css = `
    .trv { position:absolute; top:0; right:.6vw; bottom:.6vw; left:0; overflow:hidden; color:#0f0f14;
      background-color:#f0443a; background-image:radial-gradient(rgba(15,15,20,.16) .1vw, transparent .11vw); background-size:.6vw .6vw;
      border:.25vw solid #0f0f14; box-shadow:.6vw .6vw 0 #0f0f14; }
    .trv-felt { display:none; }
    .trv-brand { position:absolute; top:2.5%; left:2%; }
    .trv-brand b { display:inline-block; padding:.45vw .9vw; background:#0f0f14; color:#f1f0ea; font-size:1.7vw; font-weight:900; font-stretch:125%; text-transform:uppercase; letter-spacing:-.01em; line-height:1; }
    .trv-brand small { display:block; margin-top:.45vw; font-family:'JetBrains Mono',monospace; font-size:.85vw; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#0f0f14; }

    /* ---- canto: valor da mão e vazas ---- */
    .trv-stake { position:absolute; top:2.5%; right:2%; min-width:8vw; text-align:center; padding:.6vw 1vw .7vw; background:#fff; border:.2vw solid #0f0f14; box-shadow:.4vw .4vw 0 #0f0f14; }
    .trv-stake b { display:block; font-family:'Pixelify Sans',monospace; font-size:3vw; line-height:1; color:#0f0f14; }
    .trv-stake small { display:block; font-family:'JetBrains Mono',monospace; font-size:.75vw; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:#0f0f14; }
    .trv-stake.ask { background:#ffce1f; animation:trv-pulse .6s ease-in-out infinite alternate; }
    @keyframes trv-pulse { to { transform:scale(1.06); } }
    .trv-tricks { display:flex; justify-content:center; margin-top:.5vw; }
    .trv-tricks i { display:block; width:1.2vw; height:1.2vw; margin:0 .2vw; border:.15vw solid #0f0f14; background:#e4e2d9; }
    .trv-tricks i.tie { background:#9a978c; }

    /* ---- vira ---- */
    .trv-vira { position:absolute; left:2%; bottom:3%; display:flex; align-items:center; padding:.6vw .9vw; background:#fff; border:.2vw solid #0f0f14; box-shadow:.4vw .4vw 0 #0f0f14; }
    .trv-vira .trv-card { width:3.6vw; height:5.4vw; margin-right:.8vw; box-shadow:.2vw .2vw 0 #0f0f14; }
    .trv-vira .trv-card .num { font-size:.9vw; } .trv-vira .trv-card .symbol { font-size:2vw; } .trv-vira .trv-card .suit { display:none; }
    .trv-vira .txt b { display:block; font-size:1.2vw; font-weight:900; font-stretch:125%; text-transform:uppercase; }
    .trv-vira .txt span { display:block; font-family:'JetBrains Mono',monospace; font-size:.8vw; font-weight:700; color:#0f0f14; margin-top:.25vw; max-width:16vw; line-height:1.3; }

    /* ---- carta ---- */
    .trv-card { position:relative; width:6vw; height:9vw; background:#fff; border:.2vw solid #0f0f14; border-radius:.35vw; box-shadow:.35vw .35vw 0 #0f0f14; color:#0f0f14; overflow:hidden; }
    .trv-card.red { color:#d02a20; } .trv-card.sp { background:#fff; }
    .trv-card.sp .trv-art { display:block; width:100%; height:100%; }
    .trv-card.sp .trv-value { position:absolute; top:.25vw; left:.25vw; min-width:1.5vw; padding:0 .2vw; border:.1vw solid #0f0f14; background:#fff; color:#0f0f14; font-family:'Pixelify Sans',monospace; font-size:1.05vw; font-weight:700; line-height:1.5vw; text-align:center; }
    .trv-card.sp .trv-face { position:absolute; right:.25vw; bottom:.3vw; padding:.1vw .25vw; background:#0f0f14; color:#fff; font-family:'JetBrains Mono',monospace; font-size:.6vw; font-weight:700; text-transform:uppercase; }
    .trv-card .num { position:absolute; top:.35vw; left:.4vw; font-size:1.3vw; font-weight:900; line-height:1; text-align:center; }
    .trv-card .symbol { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:3vw; line-height:1; }
    .trv-card .suit { position:absolute; bottom:.35vw; left:.1vw; right:.1vw; font-family:'JetBrains Mono',monospace; font-size:.55vw; font-weight:700; letter-spacing:.06em; text-transform:uppercase; text-align:center; }
    .trv-card.back { background-color:#0f0f14; background-image:repeating-linear-gradient(45deg,#0f0f14,#0f0f14 .35vw,#23232b .35vw,#23232b .7vw); }
    .trv-card.back:after { content:''; position:absolute; top:8%; left:10%; width:80%; height:84%; box-sizing:border-box; border:.15vw solid #ffce1f; }
    .trv-card.back.sp { background:#fff url('/cards/spanish/back.webp') center no-repeat; background-size:100% 100%; }
    .trv-card.back.sp:after { display:none; }
    .trv-card.sm { width:2.6vw; height:3.9vw; border-width:.12vw; border-radius:.25vw; box-shadow:.15vw .15vw 0 #0f0f14; }

    /* ---- lugar na mesa de cada carta jogada ---- */
    .trv-slot { position:absolute; width:6vw; height:9vw; margin:-4.5vw 0 0 -3vw; border-radius:.35vw; border:.15vw dashed rgba(15,15,20,.4); transition:transform .35s, opacity .35s; }
    .trv-slot.full { border-color:transparent; }
    .trv-slot .trv-card { position:absolute; top:-.15vw; left:-.15vw; }
    .trv-slot.best .trv-card { box-shadow:0 0 0 .3vw #ffce1f,.6vw .6vw 0 #0f0f14; }
    .trv-slot.best { transform:scale(1.12); z-index:2; }
    .trv-slot.dim { opacity:.7; transform:scale(.94); }
    .trv-slot .crown { position:absolute; left:50%; bottom:-2.3vw; margin-left:-4vw; width:8vw; text-align:center; }
    .trv-slot .crown span { display:inline-block; padding:.2vw .5vw; background:#ffce1f; border:.15vw solid #0f0f14; color:#0f0f14; font-family:'JetBrains Mono',monospace; font-size:.75vw; font-weight:700; text-transform:uppercase; white-space:nowrap; }
    .trv-slot .who { position:absolute; left:50%; bottom:-1.7vw; width:10vw; margin-left:-5vw; text-align:center; font-size:.8vw; font-weight:900; color:#0f0f14; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

    /* ---- sentido da jogada ---- */
    .trv-dir { position:absolute; left:50%; top:50%; width:44vw; height:30vw; margin:-15vw 0 0 -22vw; border-radius:50%; border:.2vw dashed rgba(15,15,20,.28); }
    .trv-dir i { position:absolute; font-style:normal; font-size:1.6vw; line-height:1; color:rgba(15,15,20,.5); }
    .trv-dir .a1 { left:50%; top:-.95vw; margin-left:-.6vw; transform:rotate(180deg); }
    .trv-dir .a2 { right:-.7vw; top:50%; margin-top:-.8vw; transform:rotate(90deg); }
    .trv-dir .a3 { left:50%; bottom:-.95vw; margin-left:-.6vw; transform:rotate(0deg); }
    .trv-dir .a4 { left:-.7vw; top:50%; margin-top:-.8vw; transform:rotate(-90deg); }
    .trv-dir.two .a2,.trv-dir.two .a4 { display:none; }

    /* ---- cadeiras ---- */
    .trs { position:absolute; width:13vw; margin-left:-6.5vw; margin-top:-5.4vw; text-align:center; transition:opacity .4s; }
    .trs.off { opacity:.45; }
    .trs-fan { position:relative; height:2.4vw; margin-bottom:.3vw; }
    .trs-fan i { position:absolute; left:50%; bottom:0; width:1.5vw; height:2.2vw; margin-left:-.75vw; border:.12vw solid #0f0f14; border-radius:.15vw;
      background:#0f0f14; box-shadow:inset 0 0 0 .15vw #ffce1f; transform-origin:50% 130%; }
    .trs-av { position:relative; width:5vw; height:5vw; margin:0 auto; background:#fff; border:.2vw solid #0f0f14; box-shadow:.35vw .35vw 0 #0f0f14; transition:transform .3s, box-shadow .3s; }
    .trs-av > i { display:block; line-height:0; overflow:hidden; height:100%; }
    .trs-av > b { position:absolute; left:0; right:0; bottom:0; height:0; border-top:.45vw solid #0f0f14; }
    .trs.now .trs-av { background:#ffce1f; transform:translate(-.2vw,-.2vw) scale(1.1); box-shadow:.6vw .6vw 0 #0f0f14; }
    .trs-ord { position:absolute; right:-1.2vw; top:-.8vw; min-width:2vw; height:2vw; padding:0 .3vw; background:#0f0f14; color:#fff; border:.12vw solid #0f0f14; font-family:'Pixelify Sans',monospace; font-size:1vw; font-weight:700; line-height:1.8vw; }
    .trs-ord.done { background:#fff; color:#0f0f14; }
    .trs-ord:empty { display:none; }
    .trs-tag { position:absolute; left:-1.4vw; top:-.8vw; height:2vw; padding:0 .45vw; background:#ffce1f; color:#0f0f14; border:.12vw solid #0f0f14; font-family:'JetBrains Mono',monospace; font-size:.75vw; font-weight:700; line-height:1.8vw; letter-spacing:.06em; text-transform:uppercase; }
    .trs-tag:empty { display:none; }
    .trs-name { display:inline-block; max-width:12vw; margin-top:.7vw; padding:.1vw .6vw; border:.15vw solid #0f0f14; background:#fff; font-size:1.15vw; font-weight:900; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .trs-team { display:table; margin:.3vw auto 0; padding:.15vw .6vw; border:.12vw solid #0f0f14; font-family:'JetBrains Mono',monospace; font-size:.75vw; font-weight:700; letter-spacing:.05em; text-transform:uppercase; white-space:nowrap; }
    .trs-say { position:absolute; left:50%; top:-1.8vw; z-index:8; padding:.4vw 1vw; background:#fff; color:#0f0f14; border:.2vw solid #0f0f14; box-shadow:.35vw .35vw 0 #0f0f14; font-size:1.5vw; font-weight:900; font-stretch:125%; text-transform:uppercase; white-space:nowrap;
      transform:translateX(-50%); animation:trs-say 2.6s ease-out both; pointer-events:none; }
    @keyframes trs-say { 0% { opacity:0; transform:translateX(-50%) translateY(1vw) scale(.5); } 12% { opacity:1; transform:translateX(-50%) translateY(-.4vw) scale(1.08); } 20% { transform:translateX(-50%) translateY(0) scale(1); } 85% { opacity:1; } 100% { opacity:0; transform:translateX(-50%) translateY(-1vw); } }

    /* ---- carta voando ---- */
    .trv-fly { position:absolute; z-index:6; margin-left:-3vw; margin-top:-4.5vw; transition:left .55s cubic-bezier(.2,.8,.2,1), top .55s cubic-bezier(.2,.8,.2,1), transform .55s cubic-bezier(.2,.8,.2,1), opacity .25s; }
    .trv-fly.small { margin-left:-1.3vw; margin-top:-1.95vw; }

    /* ---- centro: vez, resultado ---- */
    .trv-mid { position:absolute; left:50%; top:50%; width:17vw; margin-left:-8.5vw; margin-top:-2.6vw; text-align:center; z-index:3; }
    .trv-mid > div { background:#ffce1f; border:.2vw solid #0f0f14; padding:.5vw .7vw; }
    .trv-mid > div + div { border-top:0; }
    .trv-mid > div:last-child { box-shadow:.45vw .45vw 0 #0f0f14; }
    .trv-mid .line1 { font-size:1.35vw; font-weight:900; font-stretch:125%; text-transform:uppercase; line-height:1.05; }
    .trv-mid .line2 { font-family:'JetBrains Mono',monospace; font-size:.75vw; font-weight:700; text-transform:uppercase; line-height:1.35; background:#fff; }
    .trv-banner { position:absolute; left:50%; top:50%; z-index:7; width:30vw; margin-left:-15vw; margin-top:-4vw; padding:1vw 1.2vw 1.5vw; text-align:center;
      background:#fff; border:.25vw solid #0f0f14; box-shadow:.7vw .7vw 0 #0f0f14; overflow:hidden; animation:trv-banner .45s cubic-bezier(.2,1.3,.3,1) both; }
    .trv-banner small { display:block; font-family:'JetBrains Mono',monospace; font-size:.85vw; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:#0f0f14; }
    .trv-banner b { display:inline-block; margin-top:.4vw; padding:.2vw .7vw; border:.2vw solid #0f0f14; font-size:2vw; font-weight:900; font-stretch:125%; text-transform:uppercase; line-height:1.1; color:#0f0f14; }
    .trv-banner span { display:block; margin-top:.5vw; font-size:1.05vw; font-weight:800; color:#0f0f14; }
    .trv-banner .time { position:absolute; left:0; right:0; bottom:0; height:.5vw; background:#e4e2d9; border-top:.15vw solid #0f0f14; }
    .trv-banner .time i { display:block; width:100%; height:100%; background:#0f0f14; transform-origin:left; animation-name:trv-time; animation-timing-function:linear; animation-fill-mode:forwards; }
    .trv-banner.compact { width:20vw; margin-left:-10vw; margin-top:-3.6vw; padding:.7vw .8vw 1.1vw; }
    .trv-banner.compact b { font-size:1.4vw; } .trv-banner.compact span { font-size:.85vw; }
    @keyframes trv-time { to { transform:scaleX(0); } }
    @keyframes trv-banner { from { opacity:0; transform:scale(.7); } to { opacity:1; transform:scale(1); } }

    /* ---- estouro: TRUCO!, QUERO!, CORREU! ---- */
    .trv-burst { position:absolute; left:50%; top:30%; z-index:9; padding:.8vw 2.6vw; background:#ffce1f; color:#0f0f14; border:.3vw solid #0f0f14; box-shadow:.9vw .9vw 0 #0f0f14; font-size:4.5vw; font-weight:900; font-stretch:125%; text-transform:uppercase; line-height:1; white-space:nowrap;
      transform:translate(-50%,-50%); animation:trv-burst 1.5s cubic-bezier(.2,1.3,.3,1) both; pointer-events:none; }
    @keyframes trv-burst { 0% { opacity:0; transform:translate(-50%,-50%) scale(.3) rotate(-8deg); } 18% { opacity:1; transform:translate(-50%,-50%) scale(1.1) rotate(2deg); } 30% { transform:translate(-50%,-50%) scale(1) rotate(-2deg); } 80% { opacity:1; } 100% { opacity:0; transform:translate(-50%,-62%) scale(.92) rotate(-2deg); } }

    /* ---- por cima da mesa: preparação, mão de 11, fim de mão, fim de jogo ---- */
    .trv-veil { position:absolute; top:0; right:0; bottom:0; left:0; z-index:5; background:rgba(241,240,234,.96); }
    .trv-over { position:absolute; left:50%; top:50%; z-index:5; width:40vw; margin-left:-20vw; transform:translateY(-50%); padding:1.8vw 2vw; text-align:center;
      background:#fff; border:.25vw solid #0f0f14; box-shadow:.8vw .8vw 0 #0f0f14; }
    .trv-over small { display:inline-block; padding:.35vw .7vw; background:#0f0f14; color:#f1f0ea; font-family:'JetBrains Mono',monospace; font-size:.85vw; font-weight:700; letter-spacing:.1em; text-transform:uppercase; }
    .trv-over h2 { margin-top:.9vw; font-size:2.6vw; font-weight:900; font-stretch:125%; text-transform:uppercase; line-height:1; }
    .trv-over p { margin-top:.9vw; font-size:1.1vw; color:#0f0f14; line-height:1.4; }
    .trv-over .teams { display:flex; justify-content:center; margin-top:1.2vw; }
    .trv-over .teams > div { width:47%; padding:.8vw .5vw; border:.2vw solid #0f0f14; box-shadow:.35vw .35vw 0 #0f0f14; color:#0f0f14; }
    .trv-over .teams > div + div { margin-left:4%; }
    .trv-over .teams b { display:block; font-family:'Pixelify Sans',monospace; font-size:3.4vw; line-height:1; }
    .trv-over .teams span { display:block; margin-top:.35vw; font-size:.95vw; font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .trv-over .chips { margin-top:1vw; }
    .trv-over .chips span { display:inline-block; margin:.2vw; padding:.35vw .8vw; background:#fff; border:.15vw solid #0f0f14; font-family:'JetBrains Mono',monospace; font-size:.8vw; font-weight:700; text-transform:uppercase; line-height:1.4; }

    .trv-msg { position:absolute; right:2%; bottom:3%; max-width:26vw; text-align:right; font-size:1vw; font-weight:800; color:#0f0f14; }
    .trv-msg:not(:empty) { padding:.45vw .7vw; background:#fff; border:.15vw solid #0f0f14; box-shadow:.3vw .3vw 0 #0f0f14; }

    /* ---- painel do lado ---- */
    .trp-head { background:#0f0f14; color:#f1f0ea; border:3px solid #0f0f14; box-shadow:5px 5px 0 #f0443a; padding:14px 16px; }
    .trp-head b { display:block; font-size:30px; font-weight:900; font-stretch:125%; text-transform:uppercase; line-height:1; }
    .trp-head p { margin-top:6px; color:#ffce1f; font-family:'JetBrains Mono',monospace; font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; }
    .trp-team { position:relative; background:#fff; border:3px solid #0f0f14; box-shadow:5px 5px 0 #0f0f14; padding:12px 14px 14px; }
    .trp-team.win { background:#ffce1f; }
    .trp-team .row { display:flex; align-items:center; }
    .trp-team .dot { width:18px; height:18px; border:2px solid #0f0f14; margin-right:10px; flex:none; }
    .trp-team .nm { flex:1; min-width:0; padding:0; border:0; background:none; font-size:17px; font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .trp-team strong { font-family:'Pixelify Sans',monospace; font-size:46px; font-weight:700; line-height:1; margin-left:auto; padding-left:10px; color:#0f0f14; }
    .trp-team .bar { height:14px; margin-top:9px; background:#e4e2d9; border:2px solid #0f0f14; overflow:hidden; }
    .trp-team .bar i { display:block; height:100%; transition:width .6s; }
    .trp-box { background:#fff; border:3px solid #0f0f14; box-shadow:5px 5px 0 #0f0f14; padding:12px 13px; color:#0f0f14; font-size:15px; line-height:1.35; }
    .trp-box > small { display:block; font-family:'JetBrains Mono',monospace; text-transform:uppercase; letter-spacing:.08em; font-size:12px; font-weight:700; color:#55555e; margin-bottom:8px; }
    .trp-order { display:flex; flex-wrap:wrap; margin:-3px; }
    .trp-order span { margin:3px; padding:4px 8px; background:#fff; border:2px solid #0f0f14; font-size:14px; font-weight:800; }
    .trp-order span i { display:inline-block; width:10px; height:10px; margin-right:6px; border:2px solid #0f0f14; vertical-align:-1px; }
    .trp-order span.now { background:#ffce1f; box-shadow:3px 3px 0 #0f0f14; }
    .trp-order span.done { opacity:.45; }
    .trp-hist { display:flex; align-items:center; padding:6px 0; border-top:2px solid #e4e2d9; }
    .trp-hist:first-of-type { border-top:0; }
    .trp-hist > em { width:62px; flex:none; font-style:normal; font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:700; color:#55555e; text-transform:uppercase; }
    .trp-hist .cards { display:flex; flex:1; }
    .trp-hist .trv-card { width:30px; height:45px; border-width:2px; border-radius:3px; margin-right:5px; box-shadow:2px 2px 0 #0f0f14; }
    .trp-hist .trv-card .num { font-size:11px; top:2px; left:3px; } .trp-hist .trv-card .symbol { font-size:19px; } .trp-hist .trv-card .suit { display:none; }
    .trp-hist .trv-card.sp .trv-value { font-size:10px; min-width:12px; line-height:13px; top:1px; left:1px; } .trp-hist .trv-card.sp .trv-face { display:none; }
    .trp-hist .trv-card.win { box-shadow:0 0 0 2px #ffce1f,3px 3px 0 #0f0f14; }
    .trp-hist > b { flex:none; margin-left:6px; padding:3px 7px; border:2px solid #0f0f14; font-family:'JetBrains Mono',monospace; font-size:11px; text-transform:uppercase; }

    @media (prefers-reduced-motion:reduce) { .trv-fly,.trv-slot { transition:none; } .trs-say,.trv-burst,.trv-banner,.trv-stake.ask { animation:none; } }
  `;

  const rank = n => n === 1 ? 'A' : n === 10 ? 'Q' : n === 11 ? 'J' : n === 12 ? 'K' : String(n);
  const spanishName = n => n === 10 ? 'Sota' : n === 11 ? 'Cavalo' : n === 12 ? 'Rei' : String(n);
  const qa = (root, sel) => Array.prototype.slice.call(root.querySelectorAll(sel));
  const $ = id => document.getElementById(id);
  const card = (x, G, cls) => {
    if (!x) return '';
    const sp = G.cfg.variant === 'gaucho', suit = (sp ? suits.spanish : suits.french)[x.s] || ['?', 'Carta'];
    const inner = sp
      ? `<img class="trv-art" src="/cards/spanish/${x.s}${x.n}.webp" alt="" draggable="false"><span class="trv-value" aria-hidden="true">${x.n}</span>${x.n >= 10 ? `<span class="trv-face" aria-hidden="true">${spanishName(x.n)}</span>` : ''}`
      : `<span class="num">${rank(x.n)}<br>${suit[0]}</span><span class="symbol" aria-hidden="true">${suit[0]}</span><span class="suit">${suit[1]}</span>`;
    return `<div class="trv-card ${sp ? 'sp' : ''} ${!sp && (x.s === 'H' || x.s === 'D') ? 'red' : ''} ${cls || ''}" role="img" aria-label="${sp ? spanishName(x.n) : rank(x.n)} de ${suit[1]}">${inner}</div>`;
  };
  const back = (G, cls) => `<div class="trv-card back ${G.cfg.variant === 'gaucho' ? 'sp' : ''} ${cls || ''}"></div>`;

  // Lugares em volta da mesa (% da mesa), no sentido da jogada: baixo, esquerda, cima, direita.
  const SEATS = { 2: [{ x: 50, y: 84 }, { x: 50, y: 15 }], 4: [{ x: 50, y: 84 }, { x: 11, y: 50 }, { x: 50, y: 15 }, { x: 89, y: 50 }] };
  const SLOTS = { 2: [{ x: 50, y: 63 }, { x: 50, y: 37 }], 4: [{ x: 50, y: 63.5 }, { x: 31, y: 50 }, { x: 50, y: 36.5 }, { x: 69, y: 50 }] };
  const CENTER = { x: 50, y: 50 };

  const trucoName = (G, kind, points) => kind === 'truco' || /^\d+$/.test(kind)
    ? (TRUCO_NAMES[G.cfg.variant] || {})[points] || 'TRUCO!' : CALL_NAMES[kind] || 'PEDIDO!';

  // memória entre estados (para descobrir o que aconteceu)
  let prev = null, lastBeep = '', timers = [];
  const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };

  function burst(txt, bg, ink) {
    const t = $('trv'); if (!t) return;
    const b = document.createElement('div'); b.className = 'trv-burst'; b.textContent = txt;
    if (bg) { b.style.background = bg; b.style.color = ink || '#0f0f14'; }
    t.appendChild(b); later(() => b.remove(), 1550);
  }
  function say(pid, txt, bg, ink) {
    const s = document.querySelector(`.trs[data-pid="${pid}"]`); if (!s) return;
    const old = s.querySelector('.trs-say'); if (old) old.remove();
    const b = document.createElement('div'); b.className = 'trs-say'; b.textContent = txt;
    if (bg) { b.style.background = bg; b.style.color = ink || '#0f0f14'; }
    s.appendChild(b); later(() => b.remove(), 2650);
  }
  // Uma carta voa de um ponto a outro da mesa (em % da mesa).
  function fly(html, from, to, o) {
    const fx = $('trv-fx'); if (!fx || !from || !to) return;
    o = o || {};
    const el = document.createElement('div');
    el.className = 'trv-fly' + (o.small ? ' small' : '');
    el.innerHTML = html;
    el.style.left = from.x + '%'; el.style.top = from.y + '%';
    el.style.transform = 'rotate(' + (o.rot0 || 0) + 'deg) scale(' + (o.s0 || 1) + ')';
    fx.appendChild(el);
    later(() => {
      el.style.left = to.x + '%'; el.style.top = to.y + '%';
      el.style.transform = 'rotate(' + (o.rot1 || 0) + 'deg) scale(' + (o.s1 || 1) + ')';
    }, 30 + (o.delay || 0));
    if (o.fade !== false) later(() => { el.style.opacity = '0'; }, 560 + (o.delay || 0));
    later(() => el.remove(), 820 + (o.delay || 0));
  }

  ARCADE.register('truco', {
    tv: {
      mount() {
        prev = null; lastBeep = '';
        timers.forEach(clearTimeout); timers = [];
        return `<style>${css}</style><div class="trv" id="trv">
          <div class="trv-felt"></div>
          <div class="trv-dir" id="trv-dir"><i class="a1">➤</i><i class="a2">➤</i><i class="a3">➤</i><i class="a4">➤</i></div>
          <div class="trv-brand" id="trv-brand"></div>
          <div class="trv-stake" id="trv-stake"></div>
          <div id="trv-vira"></div>
          <div id="trv-slots"></div>
          <div class="trv-mid" id="trv-mid"></div>
          <div id="trv-seats"></div>
          <div id="trv-fx"></div>
          <div id="trv-banner"></div>
          <div id="trv-over"></div>
          <div class="trv-msg" id="trv-msg"></div>
        </div>`;
      },
      destroy() { timers.forEach(clearTimeout); timers = []; prev = null; },

      html(c) {
        const G = c.G; if (!G) return {};
        const esc = c.esc, players = c.C.players || [];
        const player = pid => players.filter(p => p.pid === pid)[0];
        const name = pid => player(pid) ? esc(player(pid).name) : 'Jogador';
        const seats = G.seats && G.seats.length ? G.seats : players.map(p => p.pid);
        const teamOf = (pid, i) => G.teams && G.teams[pid] !== undefined && G.phase !== 'setup' ? G.teams[pid] : i % 2;
        const members = t => seats.filter((pid, i) => teamOf(pid, i) === t).map(name).join(' + ') || `Dupla ${t + 1}`;
        const n = seats.length;
        const teamBox = t => {
          const pct = Math.max(0, Math.min(100, (G.scores[t] || 0) / (G.target || 12) * 100));
          return `<div class="trp-team ${G.phase === 'end' && G.winner === t ? 'win' : ''}"><div class="row"><i class="dot" style="background:${TEAM[t]}"></i><span class="nm">${n === 2 ? members(t) : `Dupla ${t + 1} · ${members(t)}`}</span><strong>${G.scores[t] || 0}</strong></div><div class="bar"><i style="width:${pct}%;background:${TEAM[t]}"></i></div></div>`;
        };
        const playing = G.phase === 'play' || G.phase === 'reveal';
        const lead = G.trickLead || G.turn;
        const leadAt = G.order.indexOf(lead);
        const played = {}; (G.table || []).forEach(x => { played[x.pid] = true; });
        const order = playing && leadAt >= 0 && G.phase === 'play'
          ? `<div class="trp-box"><small>Ordem desta vaza</small><div class="trp-order">${G.order.map((pid, i) => G.order[(leadAt + i) % n]).map((pid, i) =>
            `<span class="${G.turn === pid && !G.bid ? 'now' : ''} ${played[pid] ? 'done' : ''}"><i style="background:${TEAM[G.teams[pid]]}"></i>${i + 1}º ${name(pid)}${played[pid] ? ' ✓' : ''}</span>`).join('')}</div></div>` : '';
        const hist = (G.history || []).map((h, i) => `<div class="trp-hist"><em>Vaza ${i + 1}</em><div class="cards">${h.plays.map(x => card(x.card, G, (h.best || []).indexOf(x.pid) >= 0 && h.winner !== null ? 'win' : '')).join('')}</div><b style="${h.winner === null ? 'background:#e4e2d9' : `background:${TEAM[h.winner]};color:${TEAM_INK[h.winner]}`}">${h.winner === null ? 'empate' : `Dupla ${h.winner + 1}`}</b></div>`).join('');
        let side = `<div class="trp-head"><b>TRUCO ${(variants[G.cfg.variant] || '').toUpperCase()}</b><p>${G.phase === 'setup' ? `Até ${G.target} pontos · ${n === 2 || n === 4 ? `${n} pessoas` : 'entrem 2 ou 4 pessoas'}` : `Mão ${G.round} · até ${G.target} pontos`}</p></div>`;
        side += teamBox(0) + teamBox(1) + order;
        if (hist) side += `<div class="trp-box"><small>Cartas desta mão</small>${hist}</div>`;
        side += `<div class="trp-box"><small>Regra da mesa</small>${esc(G.rules || '')}</div>`;
        return { side };
      },

      after(c) {
        const G = c.G, esc = c.esc; if (!G || !$('trv')) return;
        const players = c.C.players || [];
        const ply = pid => players.filter(p => p.pid === pid)[0];
        const name = pid => ply(pid) ? esc(ply(pid).name) : 'Jogador';
        const seats = G.seats && G.seats.length ? G.seats : players.map(p => p.pid);
        const n = seats.length;
        const layout = SEATS[n] || SEATS[4], slotsAt = SLOTS[n] || SLOTS[4];
        const pos = {}, slotPos = {};
        seats.forEach((pid, i) => {
          pos[pid] = layout[i] || CENTER;
          slotPos[pid] = slotsAt[i] || CENTER;
        });
        const teamOf = (pid, i) => G.phase !== 'setup' && G.teams[pid] !== undefined ? G.teams[pid] : i % 2;
        const inHand = G.phase === 'play' || G.phase === 'reveal' || G.phase === 'eleven';
        const reveal = G.phase === 'reveal' ? G.reveal : null;
        const table = G.table || [];
        const lastAt = G.lastPlay ? G.lastPlay.at : null;
        const newRound = prev && prev.round !== G.round && G.round > 0;
        const justPlayed = G.lastPlay && prev && prev.lastAt !== lastAt && !newRound ? G.lastPlay : null;

        // ---------- topo: marca, valor da mão, vazas ----------
        const brand = `<b>Truco ${variants[G.cfg.variant] || ''}</b><small>${G.phase === 'setup' ? `Até ${G.target} pontos` : `Mão ${G.round} · até ${G.target}`}</small>`;
        if ($('trv-brand').innerHTML !== brand) $('trv-brand').innerHTML = brand;
        const stakeEl = $('trv-stake');
        let stake = '';
        if (G.phase !== 'setup') {
          const dots = [0, 1, 2].map(i => {
            const w = (G.tricks || [])[i];
            return w === undefined ? '<i></i>' : w === null ? '<i class="tie"></i>' : `<i style="background:${TEAM[w]}"></i>`;
          }).join('');
          stake = G.bid
            ? `<small>Valendo</small><b>${G.bid.points}?</b><small>${G.bid.kind === 'truco' ? 'pedido' : 'aposta'}</small>`
            : `<small>Mão vale</small><b>${G.stake}</b><small>${G.stake === 1 ? 'ponto' : 'pontos'}</small>`;
          stake += `<div class="trv-tricks">${dots}</div>`;
        }
        if (stakeEl.innerHTML !== stake) stakeEl.innerHTML = stake;
        stakeEl.style.display = stake ? '' : 'none';
        stakeEl.className = 'trv-stake' + (G.bid ? ' ask' : '');

        // ---------- vira e manilha ----------
        let vira = '';
        if (G.vira && G.phase !== 'setup') vira = `<div class="trv-vira">${card(G.vira, G)}<div class="txt"><b>Vira</b><span>Manilha: ${rank(G.manilha || 0)} (${'♦ ♠ ♥ ♣'.split(' ').join(' < ')})</span></div></div>`;
        else if (TOPS[G.cfg.variant] && G.phase !== 'setup') vira = `<div class="trv-vira"><div class="txt"><b>${G.cfg.variant === 'gaucho' ? 'Cartas mais fortes' : 'Manilhas fixas'}</b><span>${TOPS[G.cfg.variant]}</span></div></div>`;
        if ($('trv-vira').innerHTML !== vira) $('trv-vira').innerHTML = vira;

        // ---------- sentido ----------
        $('trv-dir').className = 'trv-dir' + (n === 2 ? ' two' : '');
        $('trv-dir').style.display = G.phase === 'setup' || n < 2 ? 'none' : '';

        // ---------- cadeiras ----------
        const box = $('trv-seats');
        const have = {}; qa(box, '.trs').forEach(s => { have[s.dataset.pid] = s; });
        const keep = {};
        const leadAt = G.order.indexOf(G.trickLead || G.turn);
        const played = {}; table.forEach(x => { played[x.pid] = true; });
        seats.forEach((pid, i) => {
          const p = ply(pid); if (!p) return;
          keep[pid] = true;
          let s = have[pid];
          if (!s) {
            s = document.createElement('div'); s.className = 'trs'; s.dataset.pid = pid;
            s.innerHTML = '<div class="trs-fan"></div><div class="trs-av"><i></i><b></b><span class="trs-ord"></span><span class="trs-tag"></span></div><div class="trs-name"></div><div class="trs-team"></div>';
            box.appendChild(s);
          }
          s.style.left = pos[pid].x + '%'; s.style.top = pos[pid].y + '%';
          const t = teamOf(pid, i);
          const av = s.querySelector('.trs-av');
          const avh = c.avatar(p, Math.round(window.innerWidth * 0.046));
          const ai = av.children[0]; if (ai.dataset.k !== avh) { ai.dataset.k = avh; ai.innerHTML = avh; }
          av.children[1].style.borderColor = TEAM[t];
          const nm = s.querySelector('.trs-name'); const nst = 'background:' + c.ci(p.color).hex + ';color:#0f0f14'; if (nm.getAttribute('style') !== nst) nm.setAttribute('style', nst); const nome = p.name + (p.on === false ? ' 📵' : ''); if (nm.textContent !== nome) nm.textContent = nome;
          const tm = s.querySelector('.trs-team'); const tt = n === 2 ? (i === 0 ? 'Lado 1' : 'Lado 2') : `Dupla ${t + 1}`;
          if (tm.textContent !== tt) tm.textContent = tt;
          tm.style.background = TEAM[t]; tm.style.color = TEAM_INK[t];
          // ordem desta vaza: 1º, 2º... a partir de quem começou
          const ord = s.querySelector('.trs-ord');
          const k = G.phase === 'play' && leadAt >= 0 ? (G.order.indexOf(pid) - leadAt + n) % n + 1 : 0;
          const ot = k ? (played[pid] ? '✓' : `${k}º`) : '';
          if (ord.textContent !== ot) ord.textContent = ot;
          ord.className = 'trs-ord' + (played[pid] ? ' done' : '');
          const tag = s.querySelector('.trs-tag');
          const tg = G.phase === 'setup' ? '' : G.dealer === pid ? 'Deu' : G.mano === pid ? 'Mão' : '';
          if (tag.textContent !== tg) tag.textContent = tg;
          const fan = s.querySelector('.trs-fan');
          const cnt = inHand ? Math.min(3, G.counts && G.counts[pid] || 0) : 0;
          if (Number(fan.dataset.k) !== cnt) {
            fan.dataset.k = cnt;
            fan.innerHTML = Array.from({ length: cnt }, (_, j) => `<i style="transform:rotate(${(j - (cnt - 1) / 2) * 14}deg)"></i>`).join('');
          }
          s.classList.toggle('now', G.phase === 'play' && !G.bid && G.turn === pid);
          s.classList.toggle('off', p.on === false);
        });
        for (const pid in have) if (!keep[pid]) have[pid].remove();

        // ---------- cartas na mesa ----------
        const slots = $('trv-slots');
        const haveSlot = {}; qa(slots, '.trv-slot').forEach(s => { haveSlot[s.dataset.pid] = s; });
        const onTable = {}; table.forEach(x => { onTable[x.pid] = x.card; });
        const best = reveal && reveal.best ? reveal.best : [];
        seats.forEach(pid => {
          let s = haveSlot[pid];
          if (!s) { s = document.createElement('div'); s.className = 'trv-slot'; s.dataset.pid = pid; slots.appendChild(s); }
          delete haveSlot[pid];
          s.style.left = slotPos[pid].x + '%'; s.style.top = slotPos[pid].y + '%';
          s.style.display = G.phase === 'setup' ? 'none' : '';
          const x = onTable[pid];
          const isBest = !!(reveal && x && best.indexOf(pid) >= 0 && reveal.winner !== null);
          const k = x ? `${x.id}:${isBest}` : '';
          if (s.dataset.k !== k && !(justPlayed && justPlayed.pid === pid)) {
            s.dataset.k = k;
            s.innerHTML = x ? `${card(x, G)}${isBest ? '<div class="crown"><span>★ mais forte</span></div>' : ''}` : '';
          }
          s.classList.toggle('full', !!x);
          s.classList.toggle('best', isBest);
          s.classList.toggle('dim', !!(reveal && x && reveal.winner !== null && !isBest));
        });
        for (const pid in haveSlot) haveSlot[pid].remove();

        // a carta que acabou de ser jogada voa da cadeira até o lugar dela; só então aparece no lugar
        if (justPlayed && pos[justPlayed.pid]) {
          const pid = justPlayed.pid, slot = slots.querySelector(`.trv-slot[data-pid="${pid}"]`);
          fly(card(justPlayed.card, G), pos[pid], slotPos[pid], { rot0: -25, rot1: 0, s0: .45, s1: 1, fade: false });
          c.beep(520, .07, 'triangle', .12);
          later(() => {
            if (!slot) return;
            const cur = ARCADE.ctx && ARCADE.ctx();
            const still = cur && cur.G && (cur.G.table || []).filter(x => x.pid === pid)[0];
            if (!still) return;
            slot.dataset.k = `${still.card.id}:false`;
            slot.innerHTML = card(still.card, G);
          }, 560);
        }

        // fim da vaza: as cartas vão para quem ganhou (ou somem no meio, se empatou)
        if (prev && prev.table.length && !table.length && !newRound) {
          const to = prev.best && prev.best.length && prev.winner !== null && pos[prev.best[0]] ? pos[prev.best[0]] : CENTER;
          prev.table.forEach((x, j) => fly(card(x.card, G), prev.slotPos[x.pid] || CENTER, to, { delay: j * 60, s0: 1, s1: .3, rot1: 20 }));
        }
        // mão nova: três cartas voam de quem deu para cada pessoa
        if (newRound && inHand) {
          const from = pos[G.dealer] || CENTER;
          seats.forEach((pid, i) => {
            for (let j = 0; j < 3; j++) fly(back(G), from, pos[pid], { delay: (j * n + i) * 75, s0: .5, s1: .35, rot1: (j - 1) * 14 });
          });
        }

        // ---------- pedidos e respostas ----------
        if (prev && G.lastCall && G.lastCall.at !== prev.callAt) {
          const txt = trucoName(G, G.lastCall.kind, G.lastCall.points);
          const t = G.teams[G.lastCall.pid];
          burst(txt, TEAM[t], TEAM_INK[t]);
          say(G.lastCall.pid, txt, TEAM[t], TEAM_INK[t]);
          c.chord([440, 554, 659], 'square');
        }
        if (prev && G.lastAnswer && G.lastAnswer.at !== prev.answerAt) {
          const ok = G.lastAnswer.accept;
          const txt = ok ? 'QUERO!' : 'CORREU!';
          burst(txt, ok ? '#35d07f' : '#f0443a', '#0f0f14');
          say(G.lastAnswer.pid, txt, ok ? '#35d07f' : '#f0443a', '#0f0f14');
          if (ok) c.chord([523, 659]); else c.chord([392, 311], 'sawtooth');
        }

        // ---------- centro: de quem é a vez ----------
        let mid = '';
        if (reveal) mid = '';
        else if (G.phase === 'play' && !G.bid && G.turn) {
          const left = n - table.length;
          mid = `<div class="line1">Vez de ${name(G.turn)}</div><div class="line2">Vaza ${G.trick + 1} de 3${left > 1 ? ` · depois: ${name(G.order[(G.order.indexOf(G.turn) + 1) % n])}` : ' · última carta da vaza'}</div>`;
        } else if (G.phase === 'play' && G.bid) {
          mid = `<div class="line1">${trucoName(G, G.bid.level === 'truco' ? 'truco' : G.bid.level, G.bid.points)}</div><div class="line2">Dupla ${G.bid.toTeam + 1} responde no celular: quero, corro ou aumento</div>`;
        }
        if (G.iron && G.phase === 'play') mid += '<div class="line2">Mão de ferro: ninguém vê as próprias cartas</div>';
        if ($('trv-mid').innerHTML !== mid) $('trv-mid').innerHTML = mid;

        // ---------- faixa do resultado (vaza ou mão) ----------
        const bannerEl = $('trv-banner');
        const bk = reveal ? `${G.round}:${reveal.kind}:${reveal.trick}:${reveal.winner}` : '';
        if (bannerEl.dataset.k !== bk) {
          bannerEl.dataset.k = bk;
          if (!reveal) bannerEl.innerHTML = '';
          else {
            const left = Math.max(.1, Math.min(5, (reveal.endsAt - Date.now()) / 1000));
            const who = reveal.winner === null ? '' : seats.filter((pid, i) => teamOf(pid, i) === reveal.winner).map(name).join(' + ');
            const title = reveal.winner === null ? 'Vaza empatada!' : reveal.kind === 'match' ? 'Venceram o jogo!' : reveal.kind === 'hand' ? 'Ganharam a mão!' : 'Ganharam a vaza!';
            const small = reveal.kind === 'trick' ? `Vaza ${reveal.trick} de 3` : reveal.reason === 'pedido recusado' ? 'A outra dupla correu' : reveal.kind === 'match' ? 'Fim de jogo' : 'Fim da mão';
            const pts = reveal.points ? `+${reveal.points} ${reveal.points === 1 ? 'ponto' : 'pontos'}` : reveal.winner === null ? 'Ninguém leva esta vaza' : 'As cartas vão para quem ganhou';
            const col = reveal.winner === null ? '#e4e2d9' : TEAM[reveal.winner];
            // a faixa fica longe das cartas: no centro só quando a mesa está vazia
            bannerEl.innerHTML = `<div class="trv-banner ${table.length ? 'compact' : ''}"><small>${small}</small><b style="background:${col}">${who || title}</b><span>${who ? `${title} · ${pts}` : pts}</span><div class="time"><i style="animation-duration:${left}s"></i></div></div>`;
            if (reveal.kind !== 'trick') c.chord(reveal.kind === 'match' ? [523, 659, 784, 1046] : [523, 659, 784]);
            else c.beep(reveal.winner === null ? 330 : 660, .12, 'sine', .14);
          }
        }

        // ---------- por cima da mesa: preparação, mão de 11, fim de mão, fim de jogo ----------
        const teamsHtml = `<div class="teams">${[0, 1].map(t => `<div style="background:${TEAM[t]}"><b>${G.scores[t] || 0}</b><span>${seats.filter((pid, i) => teamOf(pid, i) === t).map(name).join(' + ') || `Dupla ${t + 1}`}</span></div>`).join('')}</div>`;
        let over = '';
        if (G.phase === 'setup') {
          const ok = n === 2 || n === 4;
          over = `<div class="trv-over"><small>Truco ${variants[G.cfg.variant] || ''} · até ${G.target} pontos</small><h2>${ok ? n === 4 ? 'Duplas na mesa' : 'Mano a mano' : 'Entrem 2 ou 4 pessoas'}</h2><p>${ok ? n === 4 ? 'Quem senta de frente é parceiro. No celular dá para sortear os lugares.' : 'Uma pessoa contra a outra.' : `Agora há ${n} ${n === 1 ? 'pessoa' : 'pessoas'} na sala.`}</p><div class="chips"><span>${esc(G.rules || '')}</span></div><p>Escolham a regra e toquem em <b>Começar</b> no celular.</p></div>`;
        } else if (G.phase === 'eleven') {
          const sp = G.special || {};
          over = `<div class="trv-over"><small>Mão de ${sp.threshold || 11}</small><h2>Dupla ${(sp.team || 0) + 1} decide</h2><p>Eles veem as cartas do parceiro. Jogar vale ${sp.stake || 3}; correr dá ${sp.runPoints || 1} ${sp.runPoints === 1 ? 'ponto' : 'pontos'} para a outra dupla.</p>${teamsHtml}</div>`;
        } else if (G.phase === 'round') {
          const w = G.roundWinner;
          over = `<div class="trv-over"><small>Fim da mão ${G.round}</small><h2>${w === null || w === undefined ? 'Mão empatada' : `Dupla ${w + 1} ganhou a mão`}</h2>${teamsHtml}<p>Toquem em <b>Próxima mão</b> no celular.</p></div>`;
        } else if (G.phase === 'end') {
          const w = G.winner;
          over = `<div class="trv-over"><small>Fim de jogo</small><h2>${seats.filter((pid, i) => teamOf(pid, i) === w).map(name).join(' + ') || `Dupla ${w + 1}`} ${n === 2 ? 'venceu!' : 'venceram!'}</h2>${teamsHtml}<p>Toquem em <b>Jogar de novo</b> no celular.</p></div>`;
        }
        const overEl = $('trv-over');
        if (over) over = '<div class="trv-veil"></div>' + over;
        if (overEl.innerHTML !== over) overEl.innerHTML = over;

        const msg = c.C.event ? c.hl(c.C.event.text) : '';
        if ($('trv-msg').innerHTML !== msg) $('trv-msg').innerHTML = msg;

        // som quando muda a vez
        const bk2 = `${G.phase}:${G.round}:${G.turn}`;
        if (lastBeep && bk2 !== lastBeep && G.phase === 'play' && !justPlayed) c.beep(700, .05, 'sine', .06);
        lastBeep = bk2;

        // guarda o estado para a próxima comparação
        prev = {
          round: G.round, lastAt, table: table.slice(), slotPos,
          best: reveal && reveal.best ? reveal.best.slice() : prev && prev.table.length && table.length ? prev.best : [],
          winner: reveal ? reveal.winner : prev ? prev.winner : null,
          callAt: G.lastCall ? G.lastCall.at : null, answerAt: G.lastAnswer ? G.lastAnswer.at : null,
        };
      },
    },
  });
})();
