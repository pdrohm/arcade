'use strict';

(() => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js').catch(err => {
        console.warn('Não foi possível ativar o modo app.', err);
      });
    });
  }

  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (standalone || sessionStorage.getItem('arcade_install_hidden') === '1') return;

  let installPrompt = null;
  let banner = null;

  function hideBanner() {
    if (banner) banner.remove();
    banner = null;
  }

  function dismiss() {
    sessionStorage.setItem('arcade_install_hidden', '1');
    hideBanner();
  }

  function showBanner(kind) {
    if (banner) return;
    banner = document.createElement('aside');
    banner.className = 'pwa-install';
    banner.setAttribute('aria-live', 'polite');
    const ios = kind === 'ios';
    banner.innerHTML = `<img class="pwa-install-icon" src="/icons/icon-192.png" alt="">
      <div class="pwa-install-copy"><b>Instale o Arcade</b>${ios ? 'Toque em Compartilhar e depois em Adicionar à Tela de Início.' : 'Abra como um app no seu celular.'}</div>
      ${ios ? '' : '<button class="pwa-install-action" type="button">Instalar</button>'}
      <button class="pwa-install-close" type="button" aria-label="Fechar">×</button>`;
    banner.querySelector('.pwa-install-close').addEventListener('click', dismiss);
    const action = banner.querySelector('.pwa-install-action');
    if (action) action.addEventListener('click', async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      installPrompt = null;
      if (choice.outcome === 'accepted') hideBanner();
    });
    document.body.appendChild(banner);
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    showBanner('prompt');
  });

  window.addEventListener('appinstalled', hideBanner);

  const isAppleMobile = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isAppleMobile) window.addEventListener('load', () => showBanner('ios'));
})();
