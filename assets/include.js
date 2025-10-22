<script>
// inject header/footer, handle mobile nav, highlight active link
(async () => {
  const headerSpot = document.getElementById('site-header');
  const footerSpot = document.getElementById('site-footer');

  if (headerSpot) {
    const h = await fetch('partials/header.html');
    headerSpot.innerHTML = await h.text();
  }
  if (footerSpot) {
    const f = await fetch('partials/footer.html');
    footerSpot.innerHTML = await f.text();
  }

  // after DOM paints injected header/footer
  requestAnimationFrame(() => {
    // mobile nav
    const toggle = document.querySelector('.nav-toggle');
    const links = document.getElementById('nav-links');
    if (toggle && links) {
      toggle.addEventListener('click', () => {
        const open = links.style.display === 'flex';
        links.style.display = open ? 'none' : 'flex';
        toggle.setAttribute('aria-expanded', String(!open));
      });
    }

    // active link
    const file = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('[data-nav]').forEach(a => {
      if (a.getAttribute('href') === file) a.classList.add('active');
    });

    // footer year
    const y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
  });
})();
</script>

