'use strict';
// Ícones do KART: um só traço para TV e celular (SVG embutido, sem arquivo de imagem).
// Fica em ES5 porque a TV carrega este arquivo. Tudo é desenhado com a mesma "tinta" (#2a2250)
// e formas redondas, para os cartazes, o HUD e o controle falarem a mesma língua do mundo 3D.
(function () {
  var INK = '#2a2250';
  function svg(inner, cls) { return '<svg class="ki ' + (cls || '') + '" viewBox="0 0 64 64" width="64" height="64" aria-hidden="true" focusable="false">' + inner + '</svg>'; }
  function eyes(x1, x2, y, r, color) {
    color = color || '#ffffff';
    return '<circle cx="' + x1 + '" cy="' + y + '" r="' + r + '" fill="' + color + '" stroke="' + INK + '" stroke-width="3"/><circle cx="' + x2 + '" cy="' + y + '" r="' + r + '" fill="' + color + '" stroke="' + INK + '" stroke-width="3"/>' +
      '<circle cx="' + (x1 + r * .25) + '" cy="' + (y + r * .15) + '" r="' + (r * .45) + '" fill="' + INK + '"/><circle cx="' + (x2 + r * .25) + '" cy="' + (y + r * .15) + '" r="' + (r * .45) + '" fill="' + INK + '"/>';
  }
  var S = 'stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"';
  // Pilotos: só a cabeça, de frente, como um adesivo. A ordem segue DRIVERS em games/kart/game.js.
  var DRIVERS = [
    // Robô
    function () { return '<line x1="32" y1="6" x2="32" y2="14" ' + S + '/><circle cx="32" cy="6" r="4" fill="#ff6a5c" ' + S + '/>' +
      '<rect x="12" y="14" width="40" height="38" rx="11" fill="#cfe2ee" ' + S + '/><rect x="18" y="24" width="28" height="12" rx="6" fill="#2a2250"/>' +
      '<rect x="21" y="27" width="7" height="6" rx="2" fill="#58c8f5"/><rect x="36" y="27" width="7" height="6" rx="2" fill="#58c8f5"/>' +
      '<line x1="24" y1="43" x2="40" y2="43" ' + S + '/><line x1="29" y1="40" x2="29" y2="46" ' + S + '/><line x1="35" y1="40" x2="35" y2="46" ' + S + '/>'; },
    // Alien
    function () { return '<line x1="22" y1="14" x2="17" y2="5" ' + S + '/><line x1="42" y1="14" x2="47" y2="5" ' + S + '/><circle cx="16" cy="5" r="3.5" fill="#ffcf3f" ' + S + '/><circle cx="48" cy="5" r="3.5" fill="#ffcf3f" ' + S + '/>' +
      '<path d="M32 12c14 0 22 10 22 20 0 13-11 26-22 26S10 45 10 32c0-10 8-20 22-20z" fill="#8de071" ' + S + '/>' +
      '<ellipse cx="23" cy="32" rx="6" ry="8" fill="#2a2250" transform="rotate(15 23 32)"/><ellipse cx="41" cy="32" rx="6" ry="8" fill="#2a2250" transform="rotate(-15 41 32)"/>' +
      '<circle cx="21" cy="29" r="2" fill="#fff"/><circle cx="39" cy="29" r="2" fill="#fff"/><path d="M27 47q5 3 10 0" fill="none" ' + S + '/>'; },
    // Esqueleto
    function () { return '<path d="M32 8c13 0 22 9 22 21 0 8-4 13-9 16v8H19v-8c-5-3-9-8-9-16C10 17 19 8 32 8z" fill="#f7f1e6" ' + S + '/>' +
      '<circle cx="23" cy="30" r="6.5" fill="#2a2250"/><circle cx="41" cy="30" r="6.5" fill="#2a2250"/><circle cx="24" cy="31" r="2" fill="#fff"/><circle cx="42" cy="31" r="2" fill="#fff"/>' +
      '<path d="M32 36l-3 5h6z" fill="#2a2250"/><line x1="26" y1="47" x2="26" y2="53" ' + S + '/><line x1="32" y1="47" x2="32" y2="53" ' + S + '/><line x1="38" y1="47" x2="38" y2="53" ' + S + '/>'; },
    // Gato
    function () { return '<path d="M12 26L9 6l16 10zM52 26l3-20-16 10z" fill="#f4b183" ' + S + '/><path d="M13 21l-1-9 8 5zM51 21l1-9-8 5z" fill="#ff9ecb"/>' +
      '<circle cx="32" cy="34" r="22" fill="#f4b183" ' + S + '/>' + eyes(23, 41, 31, 5) +
      '<path d="M32 39l-3 3h6z" fill="#ff6a5c"/><path d="M32 42v4M29 46q3 3 6 0" fill="none" ' + S + '/>' +
      '<path d="M6 36l14 2M6 44l14-2M58 36l-14 2M58 44l-14-2" fill="none" ' + S + '/>'; },
    // Cavaleiro
    function (color) { return '<path d="M32 4c4 0 8 6 8 14l-8 4-8-4c0-8 4-14 8-14z" fill="' + color + '" ' + S + '/>' +
      '<path d="M12 34c0-13 9-22 20-22s20 9 20 22v18H12z" fill="#b9c4e6" ' + S + '/><rect x="16" y="28" width="32" height="10" rx="5" fill="#2a2250"/>' +
      '<circle cx="24" cy="33" r="2.5" fill="#58c8f5"/><circle cx="40" cy="33" r="2.5" fill="#58c8f5"/><line x1="32" y1="40" x2="32" y2="52" ' + S + '/>'; },
    // Geleia
    function () { return '<path d="M32 10c14 0 24 12 22 26-1 9 3 14-3 16-5 2-9-4-19-4s-14 6-19 4c-6-2-2-7-3-16C8 22 18 10 32 10z" fill="#7de3b1" fill-opacity=".92" ' + S + '/>' +
      '<ellipse cx="22" cy="20" rx="5" ry="3" fill="#fff" fill-opacity=".7" transform="rotate(-25 22 20)"/>' + eyes(24, 40, 34, 5) + '<path d="M26 44q6 5 12 0" fill="none" ' + S + '/>'; },
  ];
  var DRIVER_BG = ['#cfe2ee', '#8de071', '#f7f1e6', '#f4b183', '#b9c4e6', '#7de3b1'];
  // Karts vistos de lado, andando para a direita. A ordem segue KARTS em games/kart/game.js.
  function kart(i, color) {
    color = color || '#ff6a5c';
    var wheels = '<circle cx="18" cy="46" r="9" fill="#2a2250"/><circle cx="18" cy="46" r="4" fill="#fff6e3"/><circle cx="46" cy="46" r="9" fill="#2a2250"/><circle cx="46" cy="46" r="4" fill="#fff6e3"/>';
    var driver = '<circle cx="30" cy="22" r="7" fill="#fff6e3" ' + S + '/>';
    if (i === 1) return svg('<path d="M8 22h8l4 8h-10z" fill="' + INK + '"/>' + driver + '<path d="M6 40c0-6 6-10 14-10h30c6 0 10 3 10 8v4H6z" fill="' + color + '" ' + S + '/><rect x="24" y="28" width="16" height="6" rx="3" fill="' + INK + '"/><path d="M56 38l6-8" ' + S + '/><circle cx="62" cy="30" r="3" fill="#ffcf3f" ' + S + '/>' + wheels);
    if (i === 2) return svg(driver + '<rect x="8" y="26" width="48" height="16" rx="5" fill="' + color + '" ' + S + '/><rect x="22" y="22" width="20" height="10" rx="4" fill="' + INK + '"/><rect x="14" y="31" width="8" height="6" rx="2" fill="#fff6e3" fill-opacity=".6"/><rect x="42" y="31" width="8" height="6" rx="2" fill="#fff6e3" fill-opacity=".6"/>' + wheels);
    return svg('<path d="M12 24l2 6" ' + S + '/><rect x="8" y="22" width="10" height="4" rx="2" fill="' + color + '" ' + S + '/>' + driver + '<path d="M8 42c0-8 5-12 12-12h26c7 0 12 4 12 12z" fill="' + color + '" ' + S + '/><rect x="24" y="30" width="14" height="6" rx="3" fill="' + INK + '"/><circle cx="50" cy="36" r="3" fill="#fff6e3"/>' + wheels);
  }
  // Itens: todos com o mesmo contorno, para a mão do jogador reconhecer pela forma.
  var ITEMS = {
    rocket: '<path d="M32 6c9 8 12 20 8 34H24C20 26 23 14 32 6z" fill="#fff6e3" ' + S + '/><path d="M24 30l-8 10 8 2zM40 30l8 10-8 2z" fill="#ff6a5c" ' + S + '/><circle cx="32" cy="24" r="5" fill="#58c8f5" ' + S + '/><path d="M27 42l5 14 5-14z" fill="#ffcf3f" ' + S + '/>',
    bomb: '<circle cx="30" cy="38" r="18" fill="#2a2250" ' + S + '/><rect x="24" y="14" width="12" height="8" rx="3" fill="#8ea0c4" ' + S + '/><path d="M36 14q6-6 12 0" fill="none" ' + S + '/><circle cx="50" cy="12" r="4" fill="#ffcf3f" ' + S + '/><circle cx="23" cy="31" r="4" fill="#fff" fill-opacity=".35"/>',
    oil: '<path d="M18 12h28v40H18z" fill="#6d6a86" ' + S + '/><ellipse cx="32" cy="12" rx="14" ry="5" fill="#8ea0c4" ' + S + '/><ellipse cx="32" cy="52" rx="14" ry="5" fill="#4d4a68" ' + S + '/><path d="M18 24h28M18 40h28" ' + S + '/><path d="M30 26q10 2 8 12-2 6-8 4-4-4 0-16z" fill="#2a2250"/>',
    shield: '<path d="M32 6l20 7v16c0 12-8 22-20 29C20 51 12 41 12 29V13z" fill="#58c8f5" ' + S + '/><path d="M32 14l12 4v11c0 8-5 14-12 19V14z" fill="#fff" fill-opacity=".45"/>',
    boost: '<path d="M36 4L14 36h14l-4 24 26-34H36z" fill="#ffcf3f" ' + S + '/>',
    rapid: '<path d="M20 6l-8 22h9l-3 16 14-22h-8l6-16zM44 6l-8 22h9l-3 16 14-22h-8l6-16z" fill="#ff9ecb" ' + S + '/>',
    mine: '<path d="M32 8l5 9 10-3-3 10 9 5-9 5 3 10-10-3-5 9-5-9-10 3 3-10-9-5 9-5-3-10 10 3z" fill="#ff6a5c" ' + S + '/><circle cx="32" cy="32" r="8" fill="#ffcf3f" ' + S + '/>',
  };
  var MISC = {
    flag: '<path d="M14 8v50" ' + S + '/><path d="M14 10h38l-6 12 6 12H14z" fill="#fff6e3" ' + S + '/><path d="M14 10h9v8h-9zM32 10h9v8h-9zM23 18h9v8h-9zM41 18h6v8h-6zM14 26h9v8h-9zM32 26h9v8h-9z" fill="#2a2250"/>',
    burst: '<path d="M32 4l6 14 15-6-6 15 13 7-13 7 6 15-15-6-6 14-6-14-15 6 6-15L4 34l13-7-6-15 15 6z" fill="#ffcf3f" ' + S + '/><path d="M32 18l3 8 9-3-4 9 7 4-7 4 4 9-9-3-3 8-3-8-9 3 4-9-7-4 7-4-4-9 9 3z" fill="#ff6a5c"/>',
    trophy: '<path d="M20 8h24v14c0 8-5 14-12 14S20 30 20 22z" fill="#ffcf3f" ' + S + '/><path d="M20 12H10c0 8 4 13 10 14M44 12h10c0 8-4 13-10 14" fill="none" ' + S + '/><path d="M28 36h8v8h-8zM20 44h24v10H20z" fill="#ffcf3f" ' + S + '/>',
    turbo: '<path d="M36 4L14 36h14l-4 24 26-34H36z" fill="#ff6a5c" ' + S + '/>',
    drift: '<path d="M10 44c0-18 12-30 30-30h10" fill="none" ' + S + ' stroke-width="7"/><path d="M42 6l12 8-12 8z" fill="#2a2250"/><circle cx="12" cy="48" r="5" fill="#ffcf3f" ' + S + '/><circle cx="24" cy="54" r="3" fill="#ffcf3f"/><circle cx="34" cy="56" r="2" fill="#ffcf3f"/>',
    phone: '<rect x="10" y="20" width="44" height="24" rx="6" fill="#fff6e3" ' + S + '/><circle cx="47" cy="32" r="3" fill="#2a2250"/><path d="M14 8q18-6 36 0" fill="none" ' + S + '/><path d="M44 3l8 5-6 6z" fill="#2a2250"/>',
    wheel: '<circle cx="32" cy="32" r="24" fill="#2a2250"/><circle cx="32" cy="32" r="11" fill="#fff6e3" ' + S + '/><circle cx="32" cy="32" r="3" fill="#2a2250"/><path d="M32 8v10M32 46v10M8 32h10M46 32h10" stroke="#fff6e3" stroke-width="4" stroke-linecap="round"/>',
    eye: '<path d="M4 32q28-30 56 0-28 30-56 0z" fill="#fff6e3" ' + S + '/><circle cx="32" cy="32" r="10" fill="#58c8f5" ' + S + '/><circle cx="34" cy="33" r="5" fill="#2a2250"/>',
    check: '<path d="M12 34l14 12 26-30" fill="none" ' + S + ' stroke-width="8"/>',
  };
  window.KartIcons = {
    INK: INK,
    driverBg: function (i) { return DRIVER_BG[i] || DRIVER_BG[0]; },
    driver: function (i, color) { var fn = DRIVERS[i] || DRIVERS[0]; return svg(fn(color || '#ff6a5c'), 'ki-driver'); },
    kart: kart,
    item: function (name) { return ITEMS[name] ? svg(ITEMS[name], 'ki-item') : ''; },
    misc: function (name) { return MISC[name] ? svg(MISC[name], 'ki-misc') : ''; },
  };
  if (window.ARCADE) window.ARCADE.KartIcons = window.KartIcons;
  document.dispatchEvent(new CustomEvent('kart-icons'));
})();
