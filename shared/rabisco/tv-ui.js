// Rabisco — tela da TV.
// A TV é passiva: nada é clicável, tudo aponta para o celular. O quadro é o herói; o resto ajuda sem competir.
// Palco (.stage): faixa de cima (quem desenha, modificador, rodada, tempo) + cartão de papel com a dica e o quadro.
// Painel (#side): placar e chat, montados uma vez e só remendados (keepSide), para as animações não reiniciarem.
// Efeitos (confete, "+pontos") numa camada fixa por cima de tudo, sem receber toque.
// A TV da casa é um Chrome 47: sem parâmetro padrão, desestruturação, rest, spread de objeto, async,
// catch sem variável; no CSS sem var(), grid, vão em flex, inset nem clamp sem reserva. Ver docs/TV-ANTIGA.md.
'use strict';
window.ARCADE = window.ARCADE || {};
window.ARCADE.rabiscoTv = (() => {
  const TV_SIZE = 1280;
  // medidas fixas do palco (batem com o CSS): faixa de cima + vão, cartão, linha da dica, barra de tempo
  const STRIP_H = 64 + 12, CARD_PX = 36, CARD_PY = 14 + 16, HINT_H = 104, BAR_H = 10 + 12;
  const COL_W = 250 + 22;
  const OVER_SIZE = 820, SETUP_W = 1260;   // camadas e menu são desenhados nesse tamanho e escalados para caber   // tela larga: a faixa vira uma coluna à esquerda do cartão e o quadro cresce
  const CONFETTI = ['#f59e0b', '#16a34a', '#3b82f6', '#ec4899', '#a855f7', '#22d3ee', '#facc15', '#ef4444'];

  const style = `
    .rb-root { position:relative; width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#f3f4f6; }
    .rb-play { display:flex; flex-direction:column; width:880px; }
    .rb-setup { display:none; width:100%; height:100%; align-items:center; justify-content:center; overflow:hidden; }
    .rb-root.rb-ph-setup .rb-play { display:none; }
    .rb-root.rb-ph-setup .rb-setup { display:flex; }

    /* faixa de cima */
    .rb-strip { display:flex; align-items:center; height:64px; margin-bottom:12px; }
    .rb-strip > * + * { margin-left:12px; }
    .rb-drawer { display:flex; align-items:center; height:54px; padding:0 22px 0 7px; border-radius:99px; font-size:24px; font-weight:900; white-space:nowrap; overflow:hidden; min-width:0; flex:0 1 auto; box-shadow:0 8px 20px rgba(0,0,0,0.35), inset 0 -3px 0 rgba(0,0,0,0.15); }
    .rb-drawer b { overflow:hidden; text-overflow:ellipsis; min-width:0; }
    .rb-drawer small { font-size:19px; font-weight:800; opacity:.88; margin-left:10px; flex:none; }
    .rb-drawer .rb-av { width:40px; height:40px; margin-right:12px; font-size:19px; background:#0b0e17; color:#fff; }
    .rb-meta { flex:1; min-width:0; display:flex; align-items:center; justify-content:flex-end; overflow:hidden; }
    .rb-meta > * + * { margin-left:10px; }
    .rb-chip { display:inline-flex; align-items:center; height:46px; padding:0 18px; border-radius:99px; background:#182036; border:1px solid #2a3350; font-size:20px; font-weight:800; white-space:nowrap; color:#e5e7eb; flex:none; }
    .rb-chip b { font-weight:900; color:#fff; margin-left:6px; }
    .rb-chip.rb-round { color:#9aa6c0; }
    .rb-chip.rb-mod { background:#2e1a4d; border-color:#a855f7; color:#f3e8ff; }
    .rb-chip.rb-mod i { display:inline-block; width:16px; height:16px; border-radius:50%; margin-left:6px; border:2px solid #fff; }
    .rb-clock { flex:none; height:54px; min-width:132px; padding:0 18px; border-radius:16px; background:#182036; border:1px solid #2a3350; display:flex; align-items:center; justify-content:center; font-size:36px; font-weight:900; font-variant-numeric:tabular-nums; line-height:1; }
    .rb-clock.rb-low { background:#7f1d1d; border-color:#ef4444; color:#fff; animation:rb-pulse .5s infinite alternate; }
    .rb-clock.rb-hide { visibility:hidden; }
    .rb-chip.rb-win { border:0; font-weight:900; }

    /* tela larga (TV 16:9): a faixa vira coluna à esquerda e o quadro usa a altura toda */
    .rb-wide .rb-play { flex-direction:row; align-items:center; }
    .rb-wide .rb-strip { flex-direction:column; align-items:stretch; justify-content:center; width:250px; height:auto; margin:0 22px 0 0; flex:none; }
    .rb-wide .rb-strip > * { margin:0 0 16px 0; }
    .rb-wide .rb-strip > * + * { margin-left:0; }
    .rb-wide .rb-strip > .rb-meta { margin-bottom:0; }
    .rb-wide .rb-drawer { order:1; flex-direction:column; height:auto; padding:18px 14px 16px; border-radius:22px; text-align:center; flex:none; }
    .rb-wide .rb-drawer .rb-av { width:68px; height:68px; font-size:32px; margin:0 0 10px; }
    .rb-wide .rb-drawer b { font-size:30px; max-width:100%; }
    .rb-wide .rb-drawer small { margin:6px 0 0; font-size:19px; }
    .rb-wide .rb-clock { order:2; height:118px; font-size:66px; border-radius:22px; }
    .rb-wide .rb-clock.rb-hide { display:none; }
    .rb-wide .rb-meta { order:3; flex:none; flex-direction:column; align-items:stretch; overflow:visible; }
    .rb-wide .rb-meta > * + * { margin-left:0; margin-top:10px; }
    .rb-wide .rb-chip { justify-content:center; height:auto; min-height:48px; padding:9px 14px; white-space:normal; text-align:center; line-height:1.2; }

    /* cartão de papel (mesmo cavalete do tabuleiro) */
    .rb-card { position:relative; padding:14px 18px 16px; border-radius:24px; background:linear-gradient(160deg,#f6f1e4,#e9e2d0);
      box-shadow:0 30px 60px rgba(0,0,0,0.6), inset 0 0 0 6px rgba(255,255,255,0.53), inset 0 0 0 8px #c9bfa6; }
    .rb-hint { height:104px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#1a1a1a; overflow:hidden; }
    .rb-letters { display:flex; align-items:flex-end; justify-content:center; font-weight:900; line-height:1; font-size:52px; white-space:nowrap; }
    .rb-l { display:inline-block; width:.8em; margin:0 .08em; text-align:center; border-bottom:.09em solid #1a1a1a; padding-bottom:.04em; }
    .rb-l.rb-blank { color:transparent; }
    .rb-l.rb-sp { width:.52em; border-bottom-color:transparent; }
    .rb-l.rb-punct { border-bottom-color:transparent; }
    .rb-l.rb-pop { color:#b45309; border-bottom-color:#b45309; animation:rb-pop .7s cubic-bezier(.2,1.5,.3,1) both; }
    .rb-letters.rb-hfull .rb-l { color:#15803d; border-bottom-color:#15803d; }
    .rb-letters.rb-hfull .rb-l.rb-new { animation:rb-pop .6s cubic-bezier(.2,1.5,.3,1) both; }
    .rb-hsub { margin-top:10px; font-size:19px; font-weight:800; color:#6b6252; white-space:nowrap; }
    .rb-hsub span + span::before { content:'·'; margin:0 10px; color:#a89e88; }
    .rb-hmsg { font-size:26px; font-weight:800; color:#6b6252; }
    .rb-cvwrap { position:relative; border-radius:14px; overflow:hidden; background:#fff; box-shadow:0 0 0 3px #fff, 0 0 0 5px rgba(0,0,0,0.12), 0 12px 30px rgba(0,0,0,0.25); }
    .rb-cv { display:block; width:800px; height:800px; background:#fff; }
    .rb-cv.rb-flip { transform:rotate(180deg); }
    .rb-cv.rb-shake { animation:rb-shake 1s ease-in-out infinite; }
    .rb-bar { height:10px; margin-top:12px; border-radius:99px; background:rgba(0,0,0,0.12); overflow:hidden; }
    .rb-bar i { display:block; height:100%; width:0; background:#16a34a; border-radius:99px; transition:width .25s linear, background .3s; }
    .rb-bar.rb-low i { background:#ef4444; }

    /* camadas por cima do quadro: escolhendo, revelação, fim */
    .rb-over { position:absolute; top:0; left:0; right:0; bottom:0; display:none; align-items:center; justify-content:center; overflow:hidden; }
    .rb-over.rb-on { display:flex; }
    .rb-scale { flex:none; width:820px; height:820px; display:flex; align-items:center; justify-content:center; -webkit-transform-origin:50% 50%; transform-origin:50% 50%; }
    .rb-over.rb-o-choose { background:rgba(236,229,211,0.55); }
    .rb-over.rb-o-reveal { background:rgba(11,14,23,0.5); }
    .rb-over.rb-o-end { background:radial-gradient(700px 500px at 50% 20%, #1b2440 0%, #0b0e17 75%); }
    .rb-ncard { background:#182036; border:1px solid #2a3350; border-radius:22px; box-shadow:0 24px 50px rgba(0,0,0,0.5); text-align:center; color:#f3f4f6; }

    .rb-ch { padding:34px 46px 30px; max-width:86%; display:flex; flex-direction:column; align-items:center; animation:rb-rise .45s cubic-bezier(.2,.8,.2,1) both; }
    .rb-ch > * + * { margin-top:14px; }
    .rb-ch-av { width:86px; height:86px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:40px; font-weight:900; border:4px solid #fff; box-shadow:0 8px 20px rgba(0,0,0,0.4); }
    .rb-ch-t { font-size:30px; font-weight:800; line-height:1.25; }
    .rb-ch-t b { font-weight:900; }
    .rb-ch-n { font-size:72px; font-weight:900; line-height:1; color:#f59e0b; font-variant-numeric:tabular-nums; animation:rb-breathe 1s ease-in-out infinite; }
    .rb-ch-mod { padding:12px 18px; border-radius:14px; background:#2e1a4d; border:1px solid #a855f7; }
    .rb-ch-mod b { display:block; font-size:22px; font-weight:900; color:#f3e8ff; }
    .rb-ch-mod span { display:block; margin-top:4px; font-size:17px; color:#d8b4fe; font-weight:700; }
    .rb-ch-sub { font-size:18px; font-weight:700; color:#9aa6c0; }

    .rb-rv { width:88%; padding:26px 30px 24px; animation:rb-cardin .55s cubic-bezier(.2,.9,.3,1.1) both; }
    .rb-rv-k { font-size:18px; font-weight:900; letter-spacing:.2em; text-transform:uppercase; color:#9aa6c0; }
    .rb-rv-w { font-size:84px; font-weight:900; line-height:1.05; color:#f59e0b; letter-spacing:.02em; margin-top:6px; word-wrap:break-word; }
    .rb-rv-why { font-size:19px; font-weight:800; color:#cbd5e1; margin-top:6px; }
    .rb-rv-cols { display:flex; margin-top:20px; text-align:left; }
    .rb-rv-col { flex:1; min-width:0; }
    .rb-rv-col + .rb-rv-col { margin-left:16px; padding-left:16px; border-left:1px solid #2a3350; }
    .rb-rv-h { font-size:14px; font-weight:900; letter-spacing:.16em; text-transform:uppercase; color:#64748b; margin-bottom:8px; }
    .rb-g, .rb-rr { display:flex; align-items:center; font-size:21px; font-weight:800; height:34px; white-space:nowrap; animation:rb-rise .4s cubic-bezier(.2,.8,.2,1) both; }
    .rb-g > * + *, .rb-rr > * + * { margin-left:10px; }
    .rb-g-p { color:#4ade80; font-weight:900; min-width:74px; font-variant-numeric:tabular-nums; }
    .rb-g-n, .rb-rr-n { overflow:hidden; text-overflow:ellipsis; min-width:0; }
    .rb-none { font-size:24px; font-weight:900; color:#fca5a5; padding:6px 0; }
    .rb-rr-p { color:#9aa6c0; min-width:34px; font-weight:900; }
    .rb-rr-n { flex:1; }
    .rb-rr-s { font-variant-numeric:tabular-nums; font-weight:900; }
    .rb-up { color:#4ade80; font-size:16px; width:20px; text-align:center; }
    .rb-dn { color:#f87171; font-size:16px; width:20px; text-align:center; }
    .rb-eq { width:20px; }

    .rb-end { width:100%; height:100%; padding:26px 24px 22px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; }
    .rb-end-t { font-size:44px; font-weight:900; letter-spacing:-1px; animation:rb-rise .5s both; }
    .rb-pod { display:flex; align-items:flex-end; justify-content:center; margin-top:18px; }
    .rb-pc { width:31%; max-width:210px; display:flex; flex-direction:column; align-items:center; margin:0 8px; animation:rb-rise .6s cubic-bezier(.2,.8,.2,1) both; }
    .rb-pc-m { font-size:52px; line-height:1; }
    .rb-pc-n { font-size:25px; font-weight:900; margin-top:6px; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .rb-pc-s { font-size:20px; font-weight:800; color:#cbd5e1; font-variant-numeric:tabular-nums; margin-top:2px; }
    .rb-pc-b { width:100%; margin-top:10px; border-radius:14px 14px 0 0; background:#182036; border:1px solid #2a3350; border-bottom:0; display:flex; align-items:flex-start; justify-content:center; padding-top:10px; font-size:34px; font-weight:900; color:#9aa6c0; transform-origin:50% 100%; animation:rb-grow .7s cubic-bezier(.2,.8,.2,1) both; }
    .rb-rest { font-size:18px; font-weight:700; color:#9aa6c0; margin-top:10px; }
    .rb-rest span + span { margin-left:16px; }
    .rb-aws { display:flex; flex-wrap:wrap; justify-content:center; margin-top:16px; }
    .rb-aw { width:31%; margin:5px; padding:12px 10px 11px; border-radius:16px; background:#182036; border:1px solid #2a3350; animation:rb-rise .5s cubic-bezier(.2,.8,.2,1) both; }
    .rb-aw-e { font-size:32px; line-height:1; }
    .rb-aw-t { font-size:13px; font-weight:900; letter-spacing:.1em; text-transform:uppercase; color:#f59e0b; margin-top:6px; }
    .rb-aw-n { font-size:20px; font-weight:900; margin-top:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .rb-aw-d { font-size:15px; font-weight:700; color:#9aa6c0; margin-top:2px; }

    /* menu (setup) */
    .rb-su { flex:none; width:1260px; padding:0 30px; transform-origin:50% 50%; }
    .rb-su-top { display:flex; align-items:center; }
    .rb-su-art { flex:none; width:280px; padding:16px 16px 12px; border-radius:22px; background:linear-gradient(160deg,#f6f1e4,#e9e2d0); transform:rotate(-4deg);
      box-shadow:0 24px 50px rgba(0,0,0,0.55), inset 0 0 0 5px rgba(255,255,255,0.53), inset 0 0 0 7px #c9bfa6; }
    .rb-su-art svg { display:block; width:100%; height:200px; background:#fff; border-radius:12px; }
    .rb-su-art div { text-align:center; margin-top:10px; font-size:34px; font-weight:900; color:#1a1a1a; letter-spacing:.3em; }
    .rb-su-txt { flex:1; min-width:0; margin-left:60px; }
    .rb-su-logo { font-size:128px; font-weight:900; letter-spacing:-4px; line-height:.9; }
    .rb-su-logo span { color:#f59e0b; }
    .rb-su-pitch { font-size:31px; font-weight:600; color:#d7deee; line-height:1.3; margin-top:20px; }
    .rb-su-row { display:flex; align-items:stretch; margin-top:44px; }
    .rb-su-box { background:#182036; border:1px solid #2a3350; border-radius:18px; padding:20px 22px; }
    .rb-su-cfg { flex:1.25; min-width:0; }
    .rb-su-ppl { flex:1; min-width:0; margin-left:20px; }
    .rb-su-k { font-size:15px; font-weight:900; letter-spacing:.16em; text-transform:uppercase; color:#9aa6c0; margin-bottom:12px; }
    .rb-su-pre { display:flex; align-items:center; }
    .rb-su-pre > span { font-size:52px; line-height:1; margin-right:16px; }
    .rb-su-pre b { display:block; font-size:38px; font-weight:900; line-height:1; }
    .rb-su-pre small { display:block; font-size:15px; font-weight:800; color:#9aa6c0; letter-spacing:.12em; text-transform:uppercase; margin-bottom:4px; }
    .rb-chips { display:flex; flex-wrap:wrap; margin:10px -4px -4px; }
    .rb-chips > * { margin:4px; }
    .rb-sc-chip { display:inline-block; padding:6px 13px; border-radius:99px; background:#0b0e17; border:1px solid #2a3350; font-size:18px; font-weight:800; color:#e5e7eb; white-space:nowrap; }
    .rb-sc-chip.rb-hot { background:#f59e0b; border-color:#f59e0b; color:#111; }
    .rb-sc-chip.rb-cat { color:#cbd5e1; font-weight:700; font-size:16px; }
    .rb-su-turma { margin-top:12px; font-size:19px; font-weight:800; color:#fbbf24; }
    .rb-su-pl { display:inline-flex; align-items:center; padding:6px 14px 6px 6px; border-radius:99px; background:#0b0e17; font-size:21px; font-weight:800; white-space:nowrap; max-width:100%; }
    .rb-su-pl .rb-av { width:30px; height:30px; margin-right:9px; font-size:14px; }
    .rb-su-pl.rb-off { opacity:.5; }
    .rb-su-empty { font-size:19px; color:#9aa6c0; font-weight:700; }
    .rb-su-cta { margin-top:28px; text-align:center; font-size:25px; font-weight:700; color:#cbd5e1; }
    .rb-su-cta b { color:#f59e0b; font-weight:900; }

    /* comum */
    .rb-av { display:inline-flex; align-items:center; justify-content:center; flex:none; border-radius:50%; font-weight:900; border:2px solid rgba(255,255,255,0.75); line-height:1; }

    /* painel da direita */
    .rb-side { flex:1; min-height:0; display:flex; flex-direction:column; }
    .rb-side > * + * { margin-top:12px; }
    .rb-box { background:#182036; border:1px solid #2a3350; border-radius:18px; padding:14px; }
    .rb-h { display:flex; align-items:baseline; justify-content:space-between; font-size:14px; font-weight:900; letter-spacing:.16em; text-transform:uppercase; color:#9aa6c0; margin-bottom:10px; }
    .rb-h span { letter-spacing:0; text-transform:none; font-weight:700; color:#64748b; font-size:14px; }
    .rb-rankbox { flex:none; }
    .rb-row { position:relative; display:flex; align-items:center; height:50px; padding:0 14px 0 8px; border-radius:12px; background:#0b0e17; border:2px solid transparent; font-size:21px; }
    .rb-row + .rb-row { margin-top:6px; }
    .rb-row > * + * { margin-left:10px; }
    .rb-pos { width:22px; text-align:center; font-weight:900; color:#64748b; font-size:17px; flex:none; }
    .rb-row .rb-av { width:34px; height:34px; font-size:16px; }
    .rb-nm { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:800; }
    .rb-tags { flex:none; display:flex; align-items:center; font-size:20px; }
    .rb-tags > * { display:none; margin-left:4px; }
    .rb-row.rb-lead .rb-crown, .rb-row.rb-dr .rb-pen, .rb-row.rb-off .rb-offl { display:inline-block; }
    .rb-row.rb-ok .rb-ck { display:inline-flex; }
    .rb-ck { width:26px; height:26px; border-radius:50%; background:#16a34a; color:#fff; font-size:16px; font-weight:900; align-items:center; justify-content:center; }
    .rb-crown.rb-bounce { animation:rb-bounce 1s cubic-bezier(.2,1.5,.3,1); }
    .rb-sc { flex:none; display:inline-block; min-width:64px; text-align:right; font-weight:900; font-variant-numeric:tabular-nums; }
    .rb-sc.rb-bump { animation:rb-bump .7s ease-out; }
    .rb-row.rb-dr { border-color:#f59e0b; }
    .rb-row.rb-ok { background:#0f2a1a; border-color:#16a34a; }
    .rb-row.rb-off { opacity:.5; }
    .rb-row.rb-flash { animation:rb-flash .9s ease-out; }
    .rb-rank { position:relative; }
    .rb-rank.rb-tight .rb-row { height:40px; font-size:18px; }
    .rb-rank.rb-tight .rb-row + .rb-row { margin-top:4px; }
    .rb-rank.rb-tight .rb-av { width:28px; height:28px; font-size:13px; }
    .rb-how { font-size:18px; line-height:1.35; color:#e5e7eb; font-weight:600; }
    .rb-how div { display:flex; align-items:flex-start; }
    .rb-how div + div { margin-top:10px; }
    .rb-how span { flex:none; width:34px; font-size:22px; }
    .rb-chatbox { flex:1; min-height:0; display:flex; flex-direction:column; }
    .rb-chat { flex:1; min-height:0; overflow:hidden; -webkit-mask-image:linear-gradient(to bottom, rgba(0,0,0,0) 0, #000 30px); }
    .rb-chat:empty::before { content:'Os palpites e a conversa aparecem aqui.'; display:block; color:#64748b; font-size:17px; font-weight:700; text-align:center; padding:18px 6px; }
    .rb-m { font-size:19px; line-height:1.3; padding:4px 2px; word-wrap:break-word; animation:rb-in .25s ease-out both; }
    .rb-m + .rb-m { margin-top:2px; }
    .rb-m b { font-weight:900; margin-right:7px; }
    .rb-m.rb-k-guess { font-size:16px; color:#7c8aa8; font-style:italic; }
    .rb-m.rb-k-guess b { font-style:normal; opacity:.7; font-weight:800; }
    .rb-m.rb-k-knower { color:#9aa6c0; }
    .rb-pill { display:inline-block; padding:5px 14px; border-radius:99px; background:#16a34a; color:#fff; font-weight:900; font-size:18px; box-shadow:0 4px 12px rgba(22,163,74,0.35); }
    .rb-pill i { font-style:normal; color:#dcfce7; margin-left:6px; }
    .rb-m.rb-k-sys { text-align:center; font-size:15px; font-weight:700; color:#9aa6c0; padding:5px 8px; }
    .rb-t-good { color:#4ade80; } .rb-t-bad { color:#f87171; } .rb-t-warn { color:#fbbf24; }
    .rb-m.rb-t-good { color:#4ade80; } .rb-m.rb-t-bad { color:#f87171; } .rb-m.rb-t-warn { color:#fbbf24; }
    .rb-m.rb-t-fun { color:#c4b5fd; } .rb-m.rb-t-hint { color:#fbbf24; } .rb-m.rb-t-close { color:#67e8f9; }
    .rb-ev { flex:none; font-size:16px; text-align:center; color:#cbd5e1; line-height:1.4; }
    .rb-ev:empty { display:none; }

    /* efeitos: camada fixa, não recebe toque */
    .rb-fx { position:fixed; top:0; left:0; right:0; bottom:0; pointer-events:none; z-index:55; overflow:hidden; }
    .rb-cf { position:absolute; width:10px; height:14px; border-radius:2px; opacity:1; transition:transform .95s cubic-bezier(.15,.7,.3,1), opacity .45s .55s; }
    .rb-float { position:absolute; text-align:right; font-size:30px; font-weight:900; white-space:nowrap; text-shadow:0 3px 10px rgba(0,0,0,0.6); animation:rb-floatup 1.3s ease-out both; }
    .rb-float.rb-big { font-size:38px; }

    @keyframes rb-pop { 0% { transform:scale(.2); opacity:0; } 60% { transform:scale(1.35); opacity:1; } 100% { transform:scale(1); opacity:1; } }
    @keyframes rb-pulse { to { transform:scale(1.07); } }
    @keyframes rb-breathe { 50% { transform:scale(1.06); } }
    @keyframes rb-shake { 0%,100% { transform:translate(0,0) rotate(0); } 20% { transform:translate(-5px,2px) rotate(-.7deg); } 40% { transform:translate(4px,-3px) rotate(.6deg); } 60% { transform:translate(-3px,-2px) rotate(-.4deg); } 80% { transform:translate(5px,3px) rotate(.7deg); } }
    @keyframes rb-in { from { opacity:0; transform:translateY(8px); } }
    @keyframes rb-rise { from { opacity:0; transform:translateY(16px); } }
    @keyframes rb-cardin { from { opacity:0; transform:perspective(900px) rotateX(75deg) scale(.85); } to { opacity:1; transform:perspective(900px) rotateX(0) scale(1); } }
    @keyframes rb-grow { from { transform:scaleY(0); } }
    @keyframes rb-bounce { 0% { transform:scale(1); } 30% { transform:scale(1.8) translateY(-6px) rotate(-14deg); } 60% { transform:scale(.9) rotate(8deg); } 100% { transform:scale(1); } }
    @keyframes rb-bump { 40% { transform:scale(1.3); color:#4ade80; } }
    @keyframes rb-flash { 0% { box-shadow:0 0 0 0 rgba(22,163,74,0.9); } 100% { box-shadow:0 0 0 16px rgba(22,163,74,0); } }
    @keyframes rb-floatup { 0% { opacity:0; transform:translateY(12px) scale(.6); } 15% { opacity:1; transform:translateY(0) scale(1.15); } 30% { transform:translateY(-6px) scale(1); } 75% { opacity:1; } 100% { opacity:0; transform:translateY(-64px) scale(1); } }
  `;

  // ---------- estado da tela ----------
  let lastC = null, viewer = null, timerT = null, fitBound = false, clearedKey = '';
  let fxSeen = null, matchId = null, lastTick = null;
  let hintSig = '', hintPrev = null, hintTurn = null, hintUnits = 0;
  let startRank = null, startRankTurn = null;
  let overSig = '', endConfetti = null, sideMode = '';
  let rows = {}, scoresShown = {}, msgs = {};

  const $id = id => document.getElementById(id);
  const q = (el, s) => el.querySelector(s);
  const setHtml = (el, h) => { if (el && el.__rbh !== h) { el.__rbh = h; el.innerHTML = h; } };
  const initial = n => { const a = Array.from(String(n || '?').trim()); return (a[0] || '?').toUpperCase(); };
  function who(c, pid, m) {
    const p = (c.C.players || []).find(x => x.pid === pid);
    const name = p ? p.name : (m && m.name) || 'Alguém';
    const key = p ? p.color : (m && m.color) || null;
    const info = key ? c.ci(key) : { hex: '#64748b', dark: true };
    return { name, hex: info.hex, fg: info.dark ? '#fff' : '#111', on: p ? p.on !== false : false };
  }
  function notes(c, fs, vol, type, gap, dur) {
    fs.forEach((f, i) => setTimeout(() => c.beep(f, dur || .22, type || 'triangle', vol), i * (gap || 110)));
  }
  const rankOrder = G => (G.rank || []).map(r => r.pid);

  // ---------- quadro: o maior quadrado que cabe ----------
  function fit() {
    const root = $id('rb-root'), play = $id('rb-play'), cv = $id('rb-cv');
    if (!root || !play || !cv) return;
    const W = root.clientWidth, H = root.clientHeight;
    if (!W || !H) return;
    fitSetup(W, H);
    const top = Math.floor(Math.min(W - CARD_PX - 8, H - STRIP_H - CARD_PY - HINT_H - BAR_H - 8));
    const wide = Math.floor(Math.min(W - CARD_PX - COL_W - 8, H - CARD_PY - HINT_H - BAR_H - 8));
    const isWide = wide > top;
    const size = Math.max(240, isWide ? wide : top);
    root.classList.toggle('rb-wide', isWide);
    cv.style.width = size + 'px'; cv.style.height = size + 'px';
    play.style.width = (size + CARD_PX + (isWide ? COL_W : 0)) + 'px';
    fitHint();
    fitOver();
  }
  function fitOver() {
    const sc = $id('rb-scale'), cv = $id('rb-cv');
    if (sc && cv && cv.clientWidth) sc.style.transform = `scale(${(cv.clientWidth / OVER_SIZE).toFixed(3)})`;
  }
  function fitSetup(W, H) {
    const su = $id('rb-su');
    if (!su || !su.offsetHeight) return;
    const k = Math.min(1, (W - 10) / SETUP_W, (H - 10) / su.offsetHeight);
    su.style.transform = k < 1 ? `scale(${k.toFixed(3)})` : '';
  }
  function fitHint() {
    const el = $id('rb-letters'), cv = $id('rb-cv');
    if (!el || !cv || !hintUnits) return;
    const w = cv.clientWidth || 800;
    el.style.fontSize = Math.max(18, Math.min(54, Math.floor((w - 24) / hintUnits))) + 'px';
  }

  function syncBoard(c) {
    const G = c.G;
    const cv = $id('rb-cv');
    if (!cv || !window.ARCADE.draw) return;
    if (!viewer || viewer.canvas !== cv) {
      const nv = window.ARCADE.draw.viewer(cv, TV_SIZE);
      if (viewer) nv.adopt(viewer);
      viewer = nv;
    }
    if (G.board) { clearedKey = ''; viewer.sync(G.board, () => c.send({ t: 'rb-sync' })); return; }
    const key = G.phase + ':' + G.turnNo + ':' + G.matchId;   // sem quadro (escolhendo, fim): papel em branco
    if (clearedKey !== key) { clearedKey = key; viewer.reset(); }
  }

  // ---------- palco: faixa de cima ----------
  function renderStrip(c) {
    const G = c.G, esc = c.esc;
    const dr = $id('rb-drawer');
    if (G.drawer && G.phase !== 'end') {
      const w = who(c, G.drawer);
      const verb = G.phase === 'choose' ? 'escolhendo…' : G.phase === 'reveal' ? 'desenhou' : 'desenhando';
      setHtml(dr, `<span class="rb-av">${esc(initial(w.name))}</span><b>${esc(w.name)}</b><small>✏️ ${verb}</small>`);
      dr.style.background = w.hex; dr.style.color = w.fg; dr.style.display = '';
    } else dr.style.display = 'none';
    let m = '';
    if (G.mod && G.phase !== 'end') {
      const dots = G.mod.colors ? G.mod.colors.map(x => `<i style="background:${esc(x)}"></i>`).join('') : '';
      m += `<span class="rb-chip rb-mod">${G.mod.emoji} ${esc(G.mod.name)}${dots}</span>`;
    }
    if (G.phase === 'end') {
      const win = (G.rank || [])[0];
      if (win) { const w = who(c, win.pid); m += `<span class="rb-chip rb-win" style="background:${w.hex};color:${w.fg}">🏆 ${esc(w.name)} venceu</span>`; }
    } else m += `<span class="rb-chip rb-round">Rodada<b>${G.round}/${G.rounds}</b></span>`;
    setHtml($id('rb-meta'), m);
    const cv = $id('rb-cv');
    const live = G.phase === 'draw' || G.phase === 'reveal';
    cv.classList.toggle('rb-flip', live && !!G.mod && G.mod.key === 'espelho');
    cv.classList.toggle('rb-shake', G.phase === 'draw' && !!G.mod && G.mod.key === 'tremor');
  }

  // ---------- palco: a dica (letras grandes e espaçadas) ----------
  function renderHint(c) {
    const G = c.G, esc = c.esc, el = $id('rb-hint');
    if (G.phase === 'end') { hintSig = ''; hintUnits = 0; setHtml(el, '<div class="rb-hmsg">📱 Jogar de novo? Toque no celular</div>'); return; }
    if (!G.hint || G.phase === 'choose') {
      hintSig = ''; hintUnits = 0;
      setHtml(el, G.phase === 'reveal' ? '<div class="rb-hmsg">Ninguém desenhou nesta vez</div>' : '<div class="rb-hmsg">⌨️ Chute digitando no celular</div>');
      return;
    }
    const full = G.phase === 'reveal';
    const sig = G.turnNo + '|' + G.hint.join('') + '|' + full;
    if (sig === hintSig) return;
    hintSig = sig;
    const prev = hintTurn === G.turnNo ? hintPrev : null;
    let units = 0, k = 0;
    const parts = G.hint.map((ch, i) => {
      if (ch === ' ') { units += .68; return '<span class="rb-l rb-sp"></span>'; }
      units += .96;
      if (ch === '_') return '<span class="rb-l rb-blank">_</span>';
      const letter = ch.toLowerCase() !== ch.toUpperCase() || /[0-9]/.test(ch);
      if (!letter) return `<span class="rb-l rb-punct">${esc(ch)}</span>`;
      const was = prev && prev[i] === '_';
      if (full) return `<span class="rb-l${was || !prev ? ' rb-new' : ''}" style="animation-delay:${(k++) * 45}ms">${esc(ch)}</span>`;
      return `<span class="rb-l${was ? ' rb-pop' : ''}">${esc(ch)}</span>`;
    }).join('');
    hintPrev = G.hint.slice(); hintTurn = G.turnNo; hintUnits = units;
    const lens = G.lens || [];
    let total = 0; lens.forEach(n => { total += n; });
    const count = lens.length > 1 ? `${lens.join(' + ')} letras` : `${total} ${total === 1 ? 'letra' : 'letras'}`;
    const sub = [];
    if (G.cat) sub.push(`<span>${G.cat.emoji} ${esc(G.cat.name)}</span>`);
    sub.push(`<span>${count}</span>`);
    if (!full && G.hintsTotal) sub.push(`<span>💡 ${G.revealed}/${G.hintsTotal}</span>`);
    el.__rbh = null;
    el.innerHTML = `<div class="rb-letters${full ? ' rb-hfull' : ''}" id="rb-letters">${parts}</div><div class="rb-hsub">${sub.join('')}</div>`;
    fitHint();
  }

  // ---------- palco: camadas por cima do quadro ----------
  function chooseHtml(c) {
    const G = c.G, esc = c.esc, w = who(c, G.drawer), r = c.remaining();
    return `<div class="rb-ncard rb-ch">
      <div class="rb-ch-av" style="background:${w.hex};color:${w.fg}">${esc(initial(w.name))}</div>
      <div class="rb-ch-t">✏️ <b style="color:${w.hex}">${esc(w.name)}</b> está escolhendo a palavra…</div>
      <div class="rb-ch-n" id="rb-ocount">${r === null ? '' : Math.ceil(r)}</div>
      ${G.mod ? `<div class="rb-ch-mod"><b>🌀 Caos: ${G.mod.emoji} ${esc(G.mod.name)}</b><span>${esc(G.mod.desc)}</span></div>` : ''}
      <div class="rb-ch-sub">Vez ${G.turnIdx} de ${G.turnsInRound} · Rodada ${G.round} de ${G.rounds} · chute pelo celular ⌨️</div>
    </div>`;
  }
  function revealHtml(c) {
    const G = c.G, esc = c.esc;
    const cvw = OVER_SIZE;   // a camada inteira é escalada junto com o quadro
    const word = G.word ? String(G.word).toUpperCase() : '';
    const why = { all: 'Todo mundo acertou! 🎉', time: '⏰ Acabou o tempo', skip: '⏭️ Desistiu do desenho', gone: '🚪 Quem desenhava saiu' }[G.endReason] || '';
    let head;
    if (word) {
      const fs = Math.floor(Math.max(34, Math.min(cvw * 0.11, cvw * 0.74 / (word.length * 0.68))));
      head = `<div class="rb-rv-k">A palavra era</div><div class="rb-rv-w" style="font-size:${fs}px">${esc(word)}</div>`;
    } else head = `<div class="rb-rv-k">Sem desenho nesta vez</div><div class="rb-rv-w" style="font-size:56px">⏭️</div>`;
    if (why) head += `<div class="rb-rv-why">${why}</div>`;
    const tp = G.turnPts || {};
    const gains = Object.keys(tp).map(pid => ({ pid, pts: tp[pid] })).filter(x => x.pts > 0).sort((a, b) => b.pts - a.pts);
    const hits = (G.guessed || []).length;
    let left = '<div class="rb-rv-h">Nesta vez</div>';
    if (!hits) left += '<div class="rb-none">Ninguém acertou 😭</div>';
    else left += gains.slice(0, 6).map((g, i) => {
      const w = who(c, g.pid);
      return `<div class="rb-g" style="animation-delay:${200 + i * 90}ms"><b class="rb-g-p">+${g.pts}</b><span class="rb-g-n" style="color:${w.hex}">${esc(w.name)}</span>${g.pid === G.drawer ? '<span>✏️</span>' : ''}</div>`;
    }).join('');
    const rank = G.rank || [];
    const before = startRankTurn === G.turnNo && startRank ? startRank : null;
    let right = '<div class="rb-rv-h">Placar</div>';
    right += rank.slice(0, 5).map((r, i) => {
      const w = who(c, r.pid);
      let mv = '<span class="rb-eq"></span>';
      if (before) {
        const j = before.indexOf(r.pid);
        if (j > i) mv = '<span class="rb-up">▲</span>'; else if (j >= 0 && j < i) mv = '<span class="rb-dn">▼</span>';
      }
      return `<div class="rb-rr" style="animation-delay:${300 + i * 90}ms"><span class="rb-rr-p">${r.place}º</span><span class="rb-rr-n" style="color:${w.hex}">${esc(w.name)}</span><span class="rb-rr-s">${r.score}</span>${mv}</div>`;
    }).join('');
    return `<div class="rb-ncard rb-rv">${head}<div class="rb-rv-cols"><div class="rb-rv-col">${left}</div><div class="rb-rv-col">${right}</div></div></div>`;
  }
  function endHtml(c) {
    const G = c.G, esc = c.esc;
    const rank = G.rank || [];
    const top = rank.slice(0, 3);
    const medal = p => (p === 1 ? '🥇' : p === 2 ? '🥈' : p === 3 ? '🥉' : '🎖️');
    const hgt = p => (p === 1 ? 150 : p === 2 ? 108 : 76);
    const order = top.length === 3 ? [top[1], top[0], top[2]] : top.length === 2 ? [top[1], top[0]] : top;
    const pod = order.map((r, i) => {
      const w = who(c, r.pid);
      return `<div class="rb-pc" style="animation-delay:${r.place === 1 ? 500 : 150 + i * 120}ms"><div class="rb-pc-m">${medal(r.place)}</div><div class="rb-pc-n" style="color:${w.hex}">${esc(w.name)}</div><div class="rb-pc-s">${r.score} pts</div><div class="rb-pc-b" style="height:${hgt(r.place)}px;border-top:4px solid ${w.hex}">${r.place}º</div></div>`;
    }).join('');
    const rest = rank.slice(3, 8).map(r => `<span>${r.place}º ${esc(who(c, r.pid).name)} · ${r.score}</span>`).join('');
    const aw = (G.awards || []).slice(0, 6).map((a, i) => {
      const w = who(c, a.pid);
      return `<div class="rb-aw" style="animation-delay:${900 + i * 120}ms"><div class="rb-aw-e">${a.emoji}</div><div class="rb-aw-t">${esc(a.title)}</div><div class="rb-aw-n" style="color:${w.hex}">${esc(w.name)}</div><div class="rb-aw-d">${esc(a.detail)}</div></div>`;
    }).join('');
    return `<div class="rb-end"><div class="rb-end-t">🏆 Fim de jogo</div><div class="rb-pod">${pod}</div>${rest ? `<div class="rb-rest">${rest}</div>` : ''}${aw ? `<div class="rb-aws">${aw}</div>` : ''}</div>`;
  }
  function renderOver(c) {
    const G = c.G, el = $id('rb-over');
    let sig = '', cls = '', html = '';
    if (G.phase === 'choose') { sig = 'c|' + G.turnNo + '|' + G.drawer + '|' + (G.mod ? G.mod.key : ''); cls = 'rb-o-choose'; }
    else if (G.phase === 'reveal') { sig = 'r|' + G.turnNo + '|' + (G.word || '') + '|' + JSON.stringify(G.turnPts) + JSON.stringify(G.rank); cls = 'rb-o-reveal'; }
    else if (G.phase === 'end') { sig = 'e|' + G.matchId + '|' + JSON.stringify(G.rank) + JSON.stringify(G.awards); cls = 'rb-o-end'; }
    if (sig === overSig) return;
    overSig = sig;
    if (G.phase === 'choose') html = chooseHtml(c);
    else if (G.phase === 'reveal') html = revealHtml(c);
    else if (G.phase === 'end') html = endHtml(c);
    el.className = 'rb-over' + (sig ? ' rb-on ' + cls : '');
    el.innerHTML = html ? `<div class="rb-scale" id="rb-scale">${html}</div>` : '';
    fitOver();
  }

  // ---------- menu (setup) ----------
  const DOODLE = `<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet"><g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="150" cy="50" r="19" stroke="#f59e0b" stroke-width="6"/>
    <path d="M150 21V11M150 79V89M121 50H111M179 50H189M130 30l-7-7M170 70l7 7M170 30l7-7M130 70l-7 7" stroke="#f59e0b" stroke-width="5"/>
    <path d="M38 156V104L78 70L118 104V156Z" stroke="#1a1a1a" stroke-width="6"/>
    <path d="M66 156V128H90V156" stroke="#ef4444" stroke-width="6"/>
    <path d="M12 166C42 158 70 172 100 164S160 156 188 164" stroke="#16a34a" stroke-width="6"/></g></svg>`;
  function renderSetup(c) {
    const G = c.G, esc = c.esc, cfg = G.cfg || {};
    const pr = (G.presets || {})[cfg.preset];
    const pre = pr ? `<span>${pr.emoji}</span><div><small>Modo</small><b>${esc(pr.name)}</b></div>` : '<span>🛠️</span><div><small>Modo</small><b>Do nosso jeito</b></div>';
    const chips = [`${cfg.rounds} ${cfg.rounds === 1 ? 'rodada' : 'rodadas'}`, `${cfg.drawSec} s por desenho`, cfg.hints ? `${cfg.hints} ${cfg.hints === 1 ? 'dica' : 'dicas'}` : 'sem dicas'];
    let chipHtml = chips.map(x => `<span class="rb-sc-chip">${x}</span>`).join('');
    if (cfg.chaos) chipHtml += '<span class="rb-sc-chip rb-hot">🌀 Caos</span>';
    const sel = cfg.cats || [];
    // a lista da turma não vem para a TV (estragaria a surpresa): só a quantidade
    const nCustom = cfg.customN !== undefined ? cfg.customN : (cfg.custom || []).length;
    const cats = cfg.onlyCustom && nCustom ? [] : (G.cats || []).filter(k => sel.indexOf(k.key) >= 0);
    const catHtml = cats.map(k => `<span class="rb-sc-chip rb-cat">${k.emoji} ${esc(k.name)}</span>`).join('');
    const turma = nCustom ? `<div class="rb-su-turma">✍️ Palavras da turma: ${nCustom}${cfg.onlyCustom ? ' (só elas)' : ''}</div>` : '';
    const ps = c.C.players || [];
    const ppl = ps.length ? `<div class="rb-chips" style="margin-top:0">${ps.map(p => {
      const w = who(c, p.pid);
      return `<span class="rb-su-pl${p.on === false ? ' rb-off' : ''}"><span class="rb-av" style="background:${w.hex};color:${w.fg}">${esc(initial(w.name))}</span>${esc(w.name)}${p.on === false ? ' 📵' : ''}</span>`;
    }).join('')}</div>` : '<div class="rb-su-empty">Ninguém ainda. Entre pelo celular!</div>';
    const online = ps.filter(p => p.on !== false).length;
    const cta = online >= 2 ? '📱 Ajustem no celular e toquem em <b>Começar</b>' : '📱 Precisa de <b>2 pessoas</b> para começar';
    setHtml($id('rb-setup'), `<div class="rb-su" id="rb-su">
      <div class="rb-su-top">
        <div class="rb-su-art">${DOODLE}<div>C _ S _</div></div>
        <div class="rb-su-txt"><div class="rb-su-logo">Rabisco<span>.</span></div>
          <div class="rb-su-pitch">Desenhe no celular. Adivinhe digitando. Quem acerta primeiro ganha mais.</div></div>
      </div>
      <div class="rb-su-row">
        <div class="rb-su-box rb-su-cfg"><div class="rb-su-pre">${pre}</div><div class="rb-chips">${chipHtml}</div>${catHtml ? `<div class="rb-chips">${catHtml}</div>` : ''}${turma}</div>
        <div class="rb-su-box rb-su-ppl"><div class="rb-su-k">Na sala · ${ps.length}</div>${ppl}</div>
      </div>
      <div class="rb-su-cta">${cta}</div>
    </div>`);
  }

  // ---------- painel da direita ----------
  const HOW = `<div class="rb-how">
    <div><span>✏️</span>Na sua vez, escolha uma palavra e desenhe no celular.</div>
    <div><span>⌨️</span>Os outros chutam digitando no celular.</div>
    <div><span>⚡</span>Quem acerta antes ganha mais. Quem desenha ganha a cada acerto.</div></div>`;
  function ensureSide() {
    const side = $id('side');
    if (!side) return false;
    if (!$id('rb-side')) {
      side.innerHTML = `<div id="rb-side" class="rb-side">
        <div class="rb-box rb-rankbox"><div class="rb-h"><b id="rb-rk-t">Placar</b><span id="rb-rk-s"></span></div><div class="rb-rank" id="rb-rank"></div></div>
        <div class="rb-box rb-chatbox"><div class="rb-h"><b>Chat</b><span>palpites pelo celular ⌨️</span></div><div class="rb-chat" id="rb-chat"></div></div>
        <div class="rb-ev" id="rb-ev"></div></div>`;
      rows = {}; msgs = {}; scoresShown = {}; sideMode = '';
    }
    return true;
  }
  function renderRank(c) {
    const G = c.G, box = $id('rb-rank');
    if (G.phase === 'setup') {
      if (sideMode !== 'setup') { sideMode = 'setup'; rows = {}; scoresShown = {}; box.className = 'rb-rank'; box.innerHTML = HOW; $id('rb-rk-t').textContent = 'Como jogar'; $id('rb-rk-s').textContent = ''; }
      return;
    }
    if (sideMode !== 'rank') { sideMode = 'rank'; box.innerHTML = ''; rows = {}; scoresShown = {}; $id('rb-rk-t').textContent = 'Placar'; }
    const rank = G.rank || [];
    $id('rb-rk-s').textContent = G.phase === 'end' ? 'final' : `rodada ${G.round}/${G.rounds}`;
    box.classList.toggle('rb-tight', rank.length > 7);
    const before = {};
    Object.keys(rows).forEach(pid => { before[pid] = rows[pid].getBoundingClientRect().top; });
    const guessed = G.guessed || [];
    const live = G.phase === 'choose' || G.phase === 'draw' || G.phase === 'reveal';
    const keep = {};
    rank.forEach((r, i) => {
      keep[r.pid] = true;
      let el = rows[r.pid];
      if (!el) {
        el = document.createElement('div');
        el.className = 'rb-row';
        el.innerHTML = '<span class="rb-pos"></span><span class="rb-av"></span><b class="rb-nm"></b><span class="rb-tags"><span class="rb-pen">✏️</span><span class="rb-ck">✓</span><span class="rb-crown">👑</span><span class="rb-offl">📵</span></span><span class="rb-sc"></span>';
        rows[r.pid] = el;
      }
      const w = who(c, r.pid);
      q(el, '.rb-pos').textContent = r.place;
      const av = q(el, '.rb-av');
      av.textContent = initial(w.name); av.style.background = w.hex; av.style.color = w.fg;
      q(el, '.rb-nm').textContent = w.name;
      const sc = q(el, '.rb-sc');
      if (scoresShown[r.pid] !== r.score) {
        if (scoresShown[r.pid] !== undefined && r.score > scoresShown[r.pid]) { sc.classList.remove('rb-bump'); void sc.offsetWidth; sc.classList.add('rb-bump'); }
        scoresShown[r.pid] = r.score;
        sc.textContent = r.score;
      }
      el.classList.toggle('rb-dr', live && G.drawer === r.pid);
      el.classList.toggle('rb-ok', (G.phase === 'draw' || G.phase === 'reveal') && guessed.indexOf(r.pid) >= 0);
      el.classList.toggle('rb-lead', G.leader === r.pid && r.score > 0);
      el.classList.toggle('rb-off', !w.on);
      if (box.children[i] !== el) box.insertBefore(el, box.children[i] || null);
    });
    Object.keys(rows).forEach(pid => { if (!keep[pid]) { rows[pid].remove(); delete rows[pid]; delete scoresShown[pid]; } });
    // troca de posição: cada linha sai de onde estava e desliza até o lugar novo
    rank.forEach(r => {
      const el = rows[r.pid];
      if (before[r.pid] === undefined) return;
      const dy = before[r.pid] - el.getBoundingClientRect().top;
      if (Math.abs(dy) < 1) return;
      el.style.transition = 'none'; el.style.transform = `translateY(${dy}px)`;
      void el.offsetWidth;
      el.style.transition = 'transform .5s cubic-bezier(.2,.8,.2,1)'; el.style.transform = '';
    });
  }
  function msgEl(c, m) {
    const esc = c.esc, el = document.createElement('div');
    const w = m.pid ? who(c, m.pid, m) : null;
    const nm = w ? `<b style="color:${w.hex}">${esc(w.name)}</b>` : '';
    if (m.k === 'hit') {
      el.className = 'rb-m rb-k-hit';
      el.innerHTML = `<span class="rb-pill">✓ ${esc(w ? w.name : 'Alguém')} acertou!${m.pts ? `<i>+${m.pts}</i>` : ''}</span>`;
    } else if (m.k === 'guess') {
      el.className = 'rb-m rb-k-guess'; el.innerHTML = nm + esc(m.text);
    } else if (m.k === 'chat' || m.k === 'knower') {
      el.className = 'rb-m rb-k-' + m.k; el.innerHTML = nm + (m.k === 'knower' ? '🤫 ' : '') + esc(m.text);
    } else {
      el.className = 'rb-m rb-k-sys rb-t-' + (m.tone || 'info'); el.textContent = m.text;
    }
    return el;
  }
  function renderChat(c) {
    const G = c.G, box = $id('rb-chat');
    const list = (G.chat || []).slice(-30);
    const keep = {};
    list.forEach((m, i) => {
      keep[m.id] = true;
      let el = msgs[m.id];
      if (!el) { el = msgEl(c, m); msgs[m.id] = el; }
      if (box.children[i] !== el) box.insertBefore(el, box.children[i] || null);
    });
    Object.keys(msgs).forEach(id => { if (!keep[id]) { msgs[id].remove(); delete msgs[id]; } });
    box.scrollTop = box.scrollHeight;
  }

  // ---------- efeitos ----------
  function fxLayer() {
    let el = $id('rb-fx');
    if (!el) { el = document.createElement('div'); el.id = 'rb-fx'; el.className = 'rb-fx'; document.body.appendChild(el); }
    return el;
  }
  function rowRect(pid) {
    const el = rows[pid];
    const box = $id('rb-rank');
    if (!el || !box || !el.offsetParent) return null;
    const b = box.getBoundingClientRect(), top = b.top + el.offsetTop;   // offsetTop ignora a troca de posição em andamento
    return { left: b.left + el.offsetLeft, right: b.left + el.offsetLeft + el.offsetWidth, top, height: el.offsetHeight };
  }
  function floatAt(x, y, text, color, big) {
    const d = document.createElement('div');
    d.className = 'rb-float' + (big ? ' rb-big' : '');
    d.textContent = text; d.style.color = color; d.style.right = (window.innerWidth - x) + 'px'; d.style.top = y + 'px';
    fxLayer().appendChild(d);
    setTimeout(() => d.remove(), 1400);
  }
  // pedacinhos que saem de um ponto; o transform final é escrito depois de um reflow para a transição andar
  function burst(x, y, n, opts) {
    const layer = fxLayer(), parts = [];
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i');
      p.className = 'rb-cf';
      p.style.left = x + 'px'; p.style.top = y + 'px';
      p.style.background = CONFETTI[(i + Math.floor(Math.random() * 8)) % CONFETTI.length];
      if (i % 3 === 0) p.style.borderRadius = '50%';
      if (opts.dur) p.style.transitionDuration = (opts.dur * (0.75 + Math.random() * 0.5)) + 's, .6s';
      if (opts.dur) p.style.transitionDelay = '0s, ' + (opts.dur * 0.6) + 's';
      layer.appendChild(p);
      parts.push({ p, dx: opts.dx(i), dy: opts.dy(i), r: (Math.random() - 0.5) * 900 });
    }
    void layer.offsetWidth;
    parts.forEach(o => { o.p.style.transform = `translate(${Math.round(o.dx)}px,${Math.round(o.dy)}px) rotate(${Math.round(o.r)}deg)`; o.p.style.opacity = '0'; });
    setTimeout(() => parts.forEach(o => o.p.remove()), (opts.dur || 1) * 1300 + 400);
  }
  function rowBurst(pid, n) {
    const r = rowRect(pid);
    if (!r) return;
    burst(r.left + 36, r.top + r.height / 2, n, {
      dx: () => -40 - Math.random() * 180 + Math.random() * 90,
      dy: () => -30 - Math.random() * 150 + Math.random() * 60,
    });
  }
  function rowFloat(pid, text, color, big) {
    const r = rowRect(pid);
    if (r) floatAt(r.left - 14, r.top + r.height / 2 - 22, text, color, big);   // à esquerda da linha, sem cobrir o placar
  }
  function rainConfetti() {
    const W = window.innerWidth, H = window.innerHeight;
    burst(W / 2, -20, 70, {
      dur: 2.2,
      dx: () => (Math.random() - 0.5) * W * 0.9,
      dy: () => H * (0.7 + Math.random() * 0.35),
    });
  }
  function bounceCrown(pid) {
    const el = rows[pid];
    if (!el) return;
    const cr = q(el, '.rb-crown');
    cr.classList.remove('rb-bounce'); void cr.offsetWidth; cr.classList.add('rb-bounce');
  }
  function play(c, e) {
    if (e.k === 'hit') {
      rowBurst(e.pid, e.first ? 22 : 12);
      rowFloat(e.pid, '+' + e.pts, '#4ade80', !!e.first);
      const el = rows[e.pid];
      if (el) { el.classList.remove('rb-flash'); void el.offsetWidth; el.classList.add('rb-flash'); }
      if (e.dpid && e.dpts) setTimeout(() => rowFloat(e.dpid, '+' + e.dpts + ' ✏️', '#fbbf24', false), 260);
      if (e.first) c.chord([660, 880, 1320]); else notes(c, [784, 1175], .1, 'triangle', 100);
    } else if (e.k === 'lead') {
      setTimeout(() => { bounceCrown(e.pid); notes(c, [523, 659, 784, 1047], .12, 'square', 95, .16); }, 380);
    } else if (e.k === 'hint') {
      c.beep(1320, .09, 'sine', .08); setTimeout(() => c.beep(1760, .08, 'sine', .06), 80);
    } else if (e.k === 'reveal') {
      setTimeout(() => {
        if (e.hits) notes(c, [659, 784, 1047], .14, 'triangle', 120);
        else { c.beep(440, .3, 'triangle', .14); setTimeout(() => c.beep(330, .45, 'triangle', .14), 260); }
      }, 300);
    } else if (e.k === 'turn') {
      notes(c, [523, 659], .08, 'sine', 120);
    } else if (e.k === 'draw') {
      c.beep(880, .12, 'triangle', .1);
    } else if (e.k === 'ten') {
      c.beep(660, .14, 'sine', .1);
    } else if (e.k === 'end') {
      notes(c, [523, 659, 784, 1047, 1319], .14, 'triangle', 120);
    }
  }
  function runFx(c) {
    const G = c.G, last = G.lastFx || 0;
    if (fxSeen === null) { fxSeen = last; return; }   // TV recarregou: não repete o que já passou
    if (last < fxSeen) fxSeen = 0;
    let max = fxSeen;
    (G.fx || []).forEach(e => { if (e.id > fxSeen) { play(c, e); if (e.id > max) max = e.id; } });
    fxSeen = Math.max(max, last);
  }

  // ---------- relógio próprio (o do client.js mexe em #timer/#tbar; aqui não usamos esses ids) ----------
  function tickClock() {
    const c = lastC;
    if (!c || !c.G) return;
    const G = c.G, r = c.remaining();
    const clock = $id('rb-clock'), t = $id('rb-time'), barBox = $id('rb-barbox'), bar = $id('rb-bar');
    if (!clock || !bar) return;
    const timed = r !== null && (G.phase === 'choose' || G.phase === 'draw' || G.phase === 'reveal');
    clock.classList.toggle('rb-hide', !timed || G.phase === 'reveal');
    const low = timed && G.phase === 'draw' && r <= 10;
    clock.classList.toggle('rb-low', low);
    barBox.classList.toggle('rb-low', low);
    if (!timed) { bar.style.width = '0%'; lastTick = null; return; }
    t.textContent = c.fmt(r);
    const total = (G.turnMs || 60000) / 1000;
    bar.style.width = Math.max(0, Math.min(100, r / total * 100)) + '%';
    const secs = Math.ceil(r);
    if (G.phase === 'draw' && secs >= 1 && secs <= 5 && secs !== lastTick) { lastTick = secs; c.beep(880, .05, 'square', .06); }
    if (G.phase !== 'draw' || secs > 5) lastTick = null;
    const oc = $id('rb-ocount');
    if (oc) oc.textContent = Math.ceil(r);
  }

  function onResize() { fit(); }

  return {
    mount(c) {
      if (!$id('rb-style')) { const st = document.createElement('style'); st.id = 'rb-style'; st.textContent = style; document.head.appendChild(st); }
      viewer = null; hintSig = ''; overSig = ''; clearedKey = ''; hintUnits = 0;
      return `<div class="rb-root" id="rb-root">
        <div class="rb-setup" id="rb-setup"></div>
        <div class="rb-play" id="rb-play">
          <div class="rb-strip"><div class="rb-drawer" id="rb-drawer"></div><div class="rb-meta" id="rb-meta"></div><div class="rb-clock rb-hide" id="rb-clock"><span id="rb-time">0:00</span></div></div>
          <div class="rb-card">
            <div class="rb-hint" id="rb-hint"></div>
            <div class="rb-cvwrap"><canvas class="rb-cv" id="rb-cv"></canvas><div class="rb-over" id="rb-over"></div></div>
            <div class="rb-bar" id="rb-barbox"><i id="rb-bar"></i></div>
          </div>
        </div>
      </div>`;
    },
    html() { return { side: '', keepSide: true }; },
    frame(c) { lastC = c; if (c.G) syncBoard(c); },
    after(c) {
      lastC = c;
      const G = c.G, root = $id('rb-root');
      if (!G || !root) return;
      document.body.classList.add('rb-tv');
      if (!fitBound) { fitBound = true; window.addEventListener('resize', onResize); }
      if (!timerT) timerT = setInterval(tickClock, 200);
      if (G.matchId !== matchId) {   // partida nova: o chat recomeça do zero (os ids também)
        if (matchId !== null && fxSeen !== null) fxSeen = 0;
        matchId = G.matchId;
        const chat = $id('rb-chat');
        if (chat) chat.innerHTML = '';
        msgs = {}; startRank = null; startRankTurn = null; hintPrev = null; hintTurn = null;
      }
      // placar no começo da vez: na revelação mostra quem subiu ▲ e quem caiu ▼
      if (G.turnNo !== startRankTurn && (G.phase === 'choose' || G.phase === 'draw')) { startRank = rankOrder(G); startRankTurn = G.turnNo; }
      root.className = 'rb-root rb-ph-' + G.phase + (root.classList.contains('rb-wide') ? ' rb-wide' : '');
      if (G.phase === 'setup') renderSetup(c);
      else { renderStrip(c); renderHint(c); }
      syncBoard(c);
      fit();
      if (G.phase !== 'setup') renderOver(c); else overSig = '';
      if (ensureSide()) {
        renderRank(c);
        renderChat(c);
        setHtml($id('rb-ev'), (G.phase === 'setup' || G.phase === 'end') && c.C.event && c.C.event.text ? c.hl(c.C.event.text) : '');
      }
      runFx(c);
      if (G.phase === 'end' && endConfetti !== G.matchId) { endConfetti = G.matchId; if (fxSeen !== null) rainConfetti(); }
      tickClock();
    },
    leave() {
      clearInterval(timerT); timerT = null;
      if (fitBound) { window.removeEventListener('resize', onResize); fitBound = false; }
      const fx = $id('rb-fx'); if (fx) fx.remove();
      const side = $id('side'); if (side && $id('rb-side')) side.innerHTML = '';
      document.body.classList.remove('rb-tv');
      lastC = null; viewer = null; fxSeen = null; matchId = null; lastTick = null;
      hintSig = ''; hintPrev = null; hintTurn = null; hintUnits = 0;
      startRank = null; startRankTurn = null; overSig = ''; endConfetti = null; sideMode = ''; clearedKey = '';
      rows = {}; scoresShown = {}; msgs = {};
    },
  };
})();
