// Utils
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const money = (n) => '£' + Number(n || 0).toLocaleString('en-GB', {minimumFractionDigits:2});
const months = 12;
const monthly = (p) => '£' + (Number(p)/months).toFixed(2);

const FAV_KEY = 'bb:favs';
const RV_KEY  = 'bb:recent';
const CMP_KEY = 'bb:compare';
function getCompare(){ try { return JSON.parse(localStorage.getItem(CMP_KEY)) || []; } catch { return []; } }
function setCompare(arr){ localStorage.setItem(CMP_KEY, JSON.stringify(arr)); updateCompareCount(); }
function toggleCompare(slug){ const s = new Set(getCompare()); s.has(slug) ? s.delete(slug) : s.add(slug); setCompare([...s].slice(0,3)); }
function updateCompareCount(){ const el = document.getElementById('compare-count'); if (el) el.textContent = getCompare().length; }


// FAVES
function getFavs(){ try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; } catch { return []; } }
function setFavs(arr){ localStorage.setItem(FAV_KEY, JSON.stringify(arr)); updateFavCount(); }
function toggleFav(slug){
  const favs = new Set(getFavs());
  favs.has(slug) ? favs.delete(slug) : favs.add(slug);
  setFavs([...favs]);
}
function updateFavCount(){
  const el = $('#fav-count');
  if (el) el.textContent = getFavs().length;
}

// RECENTLY VIEWED
function pushRecent(slug){
  const cur = getRecent().filter(x=>x!==slug);
  cur.unshift(slug);
  localStorage.setItem(RV_KEY, JSON.stringify(cur.slice(0,6)));
}
function getRecent(){ try { return JSON.parse(localStorage.getItem(RV_KEY)) || []; } catch { return []; } }

// STARS
function stars(rating=0){
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half?'☆':'') + '✩'.repeat(empty);
}

// SHOP RENDER
let PRODUCTS = [];
async function renderShop() {
  const wrap = $('#shop-grid');
  if (!wrap) return;

  if (!PRODUCTS.length){
    const res = await fetch('assets/products.json');
    const data = await res.json();
    PRODUCTS = data.products || [];
  }

  const favs = new Set(getFavs());

  // Filters
  const q       = ($('#q')?.value || '').toLowerCase();
  const tier    = $('#tier')?.value || 'all';
  const onlyFav = $('#onlyFavs')?.checked || (location.hash === '#favs');
  const sort    = $('#sort')?.value || 'featured';

  let list = PRODUCTS.filter(p => {
    const text = `${p.name} ${p.cpu} ${p.gpu} ${p.ram} ${p.storage}`.toLowerCase();
    const matchesQ    = q ? text.includes(q) : true;
    const matchesTier = tier === 'all' ? true : p.tier === tier;
    const matchesFav  = onlyFav ? favs.has(p.slug) : true;
    return matchesQ && matchesTier && matchesFav;
  });

  // Sort
  list.sort((a,b)=>{
    if (sort === 'price_asc') return (a.sale_price ?? a.price) - (b.sale_price ?? b.price);
    if (sort === 'price_desc') return (b.sale_price ?? b.price) - (a.sale_price ?? a.price);
    if (sort === 'name_asc') return a.name.localeCompare(b.name);
    if (sort === 'rating_desc') return (b.rating||0) - (a.rating||0);
    return 0;
  });

  // Render
  wrap.innerHTML = list.map(p => {
    const onSale = p.sale_price && p.sale_price < p.price;
    const priceHtml = onSale
      ? `<p class="price"><span class="was">Was ${money(p.price)}</span> <span class="now">${money(p.sale_price)}</span></p>`
      : `<p class="price">${money(p.price)}</p>`;

    const stockTxt = p.status === 'Built to order'
      ? 'Built to order'
      : (p.stock > 2 ? 'In stock' : (p.stock > 0 ? 'Low stock' : 'Out of stock'));

    const stockClass = p.status === 'Built to order'
      ? 'warn' : (p.stock > 2 ? 'ok' : (p.stock > 0 ? 'warn' : 'danger'));

    const favActive = favs.has(p.slug) ? 'active' : '';

    return `
      <article class="card ${p.tier==='better' ? 'highlight':''}">
        <div class="badge">${p.badge}${onSale ? ' • <span class="sale">SALE</span>' : ''}</div>
        <button class="fav-btn ${favActive}" data-fav="${p.slug}" aria-label="Toggle favourite">❤️</button>
        <h3>${p.name}</h3>
        <div class="rating" title="${p.rating || 0} from ${p.reviews_count || 0} reviews">
          <span class="stars">${stars(p.rating)}</span>
          <span class="rcount">(${p.reviews_count || 0})</span>
        </div>
        <ul class="specs">
          <li>CPU: ${p.cpu}</li>
          <li>GPU: ${p.gpu}</li>
          <li>RAM: ${p.ram}</li>
          <li>Storage: ${p.storage}</li>
          <li>OS: ${p.os}</li>
        </ul>
        ${priceHtml}
        <p class="tiny ${stockClass}">${stockTxt}</p>
        <img class="thumb lightbox" src="${p.thumb}" alt="${p.name}" data-gallery='${JSON.stringify(p.gallery)}'>
        <div class="btn-row">
          <a class="btn btn-primary" href="products/${p.slug}.html">View details</a>
          <a class="btn btn-outline" target="_blank" rel="noopener" href="${p.fb}">Buy on Facebook</a>
          <a class="btn btn-outline" target="_blank" rel="noopener" href="${p.ebay}">Buy on eBay</a>
        </div>
      </article>
    `;
  }).join('');

  wireLightbox();
  $$('#shop-grid [data-fav]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const slug = btn.getAttribute('data-fav');
      toggleFav(slug);
      btn.classList.toggle('active');
    });
  });
  updateFavCount();
}

// Re-render when controls change
['#q', '#tier', '#sort', '#onlyFavs'].forEach(sel => {
  const el = $(sel);
  if (el) el.addEventListener('input', renderShop);
});

// LIGHTBOX
function wireLightbox() {
  $$('.lightbox').forEach(img => {
    img.addEventListener('click', () => {
      const gallery = JSON.parse(img.dataset.gallery || '[]');
      const dlg = document.createElement('dialog');
      dlg.className = 'lb';
      dlg.innerHTML = `
        <div class="lb-wrap">
          <button class="btn lb-x">✕</button>
          <img src="${gallery[0] || img.src}" alt="">
          <div class="lb-row">
            ${gallery.map(g => `<img src="${g}" alt="">`).join('')}
          </div>
        </div>`;
      document.body.appendChild(dlg);
      dlg.showModal();
      dlg.querySelector('.lb-x').onclick = () => dlg.close();
      dlg.addEventListener('close', () => dlg.remove());
      dlg.querySelectorAll('.lb-row img').forEach(t => {
        t.onclick = () => (dlg.querySelector('.lb-wrap > img').src = t.src);
      });
    });
  });
}

// PRODUCT PAGE – JSON-LD + gallery + recently viewed + fav
async function enhanceProduct(slug) {
  const holder = document.getElementById('product-jsonld');
  const gal    = document.getElementById('product-gallery');

  const res = await fetch('../assets/products.json');
  const { products = [] 
  try { injectProductActions(slug); } catch(e) {}
} = await res.json();
  const p = products.find(x => x.slug === slug);
  if (!p) return;

  pushRecent(slug);

  if (holder) {
    holder.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      "name": p.name,
      "image": p.gallery,
      "brand": { "@type": "Brand", "name": "Bob's Builds" },
      "description": `${p.cpu}, ${p.gpu}, ${p.ram}, ${p.storage}, ${p.os}`,
      "offers": { "@type": "Offer", "priceCurrency": "GBP", "price": p.sale_price ?? p.price, "availability": "https://schema.org/InStock" },
      "aggregateRating": { "@type": "AggregateRating", "ratingValue": p.rating || 0, "reviewCount": p.reviews_count || 0 }
    });
  }
  if (gal) {
    gal.innerHTML = p.gallery.map(src =>
      `<img class="thumb lightbox" src="${src}" data-gallery='${JSON.stringify(p.gallery)}' alt="${p.name}">`
    ).join('');
    wireLightbox();
  }

  const favBtn = document.getElementById('fav-toggle');
  if (favBtn){
    if (getFavs().includes(slug)) favBtn.classList.add('active');
    favBtn.addEventListener('click', ()=> {
      toggleFav(slug);
      favBtn.classList.toggle('active');
    });
  }

  updateFavCount();

  const recent = getRecent().filter(s => s !== slug).slice(0,3);
  const recWrap = document.getElementById('recent-list');
  if (recWrap){
    const smalls = recent.map(s => {
      const rp = products.find(x => x.slug === s);
      return rp ? `<a class="pill" href="${s}.html">${rp.name}</a>` : '';
    }).join('');
    recWrap.innerHTML = smalls || '<span class="tiny muted">No recent items yet.</span>';
  }
}

// ✅ UPDATED PWA registration (root-level sw.js)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swPath = location.pathname.includes('/products/')
      ? '../sw.js'
      : 'sw.js';
    navigator.serviceWorker.register(swPath, { scope: './' }).catch(()=>{});
  });
}

// Kick off
renderShop();
updateFavCount();

function wireCompareButtons(){
  document.querySelectorAll('[data-compare]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const slug = btn.getAttribute('data-compare');
      toggleCompare(slug);
      btn.textContent = getCompare().includes(slug) ? 'Remove' : 'Compare';
    });
  });
  updateCompareCount();
}

function injectProductActions(slug){
  const host = document.querySelector('.product-actions') || document.querySelector('.product-meta') || document.querySelector('.product-cta');
  if (!host) return;
  const wrap = document.createElement('div');
  wrap.className = 'row';
  wrap.innerHTML = `<button class="btn btn-ghost btn-sm" id="cmp-btn">${getCompare().includes(slug)?'Remove from':'Add to'} Compare</button>
  <a class="btn btn-primary btn-sm" href="../compare.html">View Compare</a>`;
  host.appendChild(wrap);
  const btn = document.getElementById('cmp-btn');
  if (btn){ btn.addEventListener('click', ()=>{ toggleCompare(slug); btn.textContent = getCompare().includes(slug)?'Remove from Compare':'Add to Compare'; }); }
}

function renderCompare(){
  const slugs = getCompare();
  const host = document.getElementById('compare-wrap');
  if (!host) return;
  if (!slugs.length){ host.innerHTML = `<div class="card"><p class="muted">Nothing to compare yet. Add up to three builds from the Shop.</p></div>`; return; }
  fetch('assets/products.json').then(r=>r.json()).then(({products})=>{
    const list = products.filter(p=>slugs.includes(p.slug));
    if (!list.length){ host.innerHTML = `<div class="card"><p class="muted">Selected builds are unavailable.</p></div>`; return; }
    const fields = [["CPU","cpu"],["GPU","gpu"],["RAM","ram"],["Storage","storage"],["Motherboard","mobo"],["PSU","psu"],["Case","case"],["Price","price"],["Sale","sale_price"]];
    let html = `<div class="table"><div class="t-row head"><div class="t-cell">Spec</div>${list.map(p=>`<div class="t-cell"><strong>${p.name}</strong></div>`).join('')}</div>`;
    for (const [label,key] of fields){
      html += `<div class="t-row"><div class="t-cell muted">${label}</div>${list.map(p=>{ const val = p[key] ?? '—'; const out = (key==='price'||key==='sale_price') ? money(val) : val; return `<div class=\"t-cell\">${out}</div>`; }).join('')}</div>`;
    }
    html += `</div>`;
    host.innerHTML = html;
  });
}
