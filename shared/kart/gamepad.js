'use strict';
// Casca visual reutilizável do controle. O jogo cuida dos eventos e do estado.
(function () {
  function html(options) {
    var o = options || {};
    return '<div class="kart-gamepad">' +
      '<header class="kart-controller-header">' +
        '<span class="kart-player">' + (o.player || '') + '<i></i></span>' +
        '<span id="kart-status" class="kart-status-screen" role="status"></span>' +
        '<button type="button" data-fullscreen aria-label="Tela cheia">&#x26F6;</button>' +
      '</header>' +
      '<div class="kart-console">' +
        '<div class="kart-stick-area">' +
          '<div class="kart-stick-well">' +
            '<div class="kart-stick" data-stick role="slider" tabindex="0" aria-label="Direção. Arraste para os lados ou use as setas do teclado." aria-valuemin="-100" aria-valuemax="100" aria-valuenow="0">' +
              '<span class="kart-stick-arrow left" aria-hidden="true">&#x2039;</span><span class="kart-stick-arrow right" aria-hidden="true">&#x203A;</span>' +
              '<span class="kart-stick-knob" aria-hidden="true"><span></span></span>' +
            '</div>' +
          '</div>' +
          '<small class="kart-control-caption">ANALÓGICO</small>' +
        '</div>' +
        '<div class="kart-console-center">' +
          '<div class="kart-pixel-logo"><small>ARCADE</small><b>KART</b></div>' +
          '<div class="kart-item-display">' +
            '<span id="kart-item" class="kart-item-slot" aria-hidden="true"></span>' +
            '<span><small>ITEM</small><b id="kart-item-name">SEM ITEM</b><em>APERTE X</em></span>' +
          '</div>' +
          '<div class="kart-speaker" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>' +
        '</div>' +
        '<div class="kart-actions" aria-label="Botões de ação">' +
          '<button class="kart-pad kart-item kart-key-x empty" data-control="item" aria-pressed="false" aria-label="X, usar item"><b>X</b><small>ITEM</small></button>' +
          '<button class="kart-pad kart-throttle kart-key-a" data-control="throttle" aria-pressed="false" aria-label="A, acelerar"><b>A</b><small>ACELERAR</small></button>' +
          '<button class="kart-pad kart-drift kart-key-b" data-control="drift" aria-pressed="false" aria-label="B, derrapar"><b>B</b><small>DRIFT</small><span class="kart-drift-fill" aria-hidden="true"></span></button>' +
          '<button class="kart-pad kart-boost kart-key-y" data-control="boost" aria-pressed="false" aria-label="Y, turbo"><b>Y</b><small id="kart-boost-state">TURBO</small></button>' +
        '</div>' +
      '</div>' +
      '<p class="kart-help">SEGURE A PARA ACELERAR</p>' +
    '</div>';
  }
  window.KartGamepad = { html: html };
})();
