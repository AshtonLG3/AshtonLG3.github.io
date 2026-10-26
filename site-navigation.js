(() => {
  const menu = document.getElementById('mobile-menu');
  const button = document.getElementById('mobile-menu-btn');
  if (!menu || !button) return;
  function setOpen(open) {
    menu.classList.toggle('hidden', !open);
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  button.addEventListener('click', () => setOpen(button.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', event => { if (event.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      button.focus();
    }
  });
  document.querySelectorAll('.site-nav a[href^="/"]').forEach(link => {
    const target = new URL(link.href);
    if (!target.hash && target.pathname === location.pathname) link.setAttribute('aria-current', 'page');
  });
})();
