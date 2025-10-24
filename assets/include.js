// inject header/footer, handle mobile nav, highlight active link, a11y helpers
(async () => {
  const docPath = location.pathname;
  const inProducts = /\/products\//.test(docPath);
  const base = inProducts ? '../' : '';

  const headerSpot = document.getElementById('site-header');
  const footerSpot = document.getElementById('site-footer');

  // Inject header/footer partials
  if (headerSpot) {
    const h = await fetch(base + 'partials/header.html');
    headerSpot.innerHTML = await h.text();
  }
  if (footerSpot) {
    const f = await fetch(base + 'partials/footer.html');
    footerSpot.innerHTML = await f.text();
  }

  // After DOM paints injected header/footer
  requestAnimationFrame(() => {
    // ---- Mobile nav toggle (with accessibility) ----
    const toggle = document.querySelector('.nav-toggle');
    const links  = document.getElementById('nav-links');

    function setNav(open) {
      if (!links || !toggle) return;
      links.style.display = open ? 'flex' : 'none';
      toggle.setAttribute('aria-expanded', String(open));
    }

    if (toggle && links) {
      // Default closed on small screens
      setNav(false);

      toggle.addEventListener('click', () => {
        const isOpen = links.style.display === 'flex';
        setNav(!isOpen);
        if (!isOpen) {
          // focus first link when opening
          const first = links.querySelector('a,button');
          if (first) first.focus();
        } else {
          // return focus to the toggle when closing
          toggle.focus();
        }
      });

      // Close when a nav link is clicked (useful on mobile)
      links.addEventListener('click', (e) => {
        const t = e.target;
        if (t && t.closest('a')) setNav(false);
      });

      // Close on Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') setNav(false);
      });
    }

    // ---- Active link highlight ----
    const file = docPath.split('/').pop() || 'index.html';
    document.querySelectorAll('[data-nav]').forEach(a => {
      const href = a.getAttribute('href');
      const shouldActivate = (inProducts && href === 'shop.html') || href === file;
      if (shouldActivate) a.classList.add('active');
    });

    // ---- Footer dynamic year ----
    const y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();

    // ---- Skip to content: move keyboard focus into <main> ----
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (target && target.matches('.skip-link')) {
        const main = document.getElementById('main');
        if (main) {
          // ensure focusable then focus
          if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
          main.focus({ preventScroll: false });
        }
        // let the browser also jump via the hash
      }
    });
  });
})();
