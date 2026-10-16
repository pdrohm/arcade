(() => {
  const go = () => window.BashPhone.register('pogo', { title: 'Pogo Pandemonium', color: '#ffce1f' });
  if (window.BashPhone) go(); else { const s = document.createElement('script'); s.src = '/shared/bash/phone.js'; s.onload = go; document.head.appendChild(s); }
})();
