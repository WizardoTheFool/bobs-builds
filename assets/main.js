// Simple util
const £ = sel => document.querySelector(sel);
const ££ = sel => [...document.querySelectorAll(sel)];

// SHOP RENDER
async function renderShop() {
  const wrap = document.getElementById('shop-grid');
  if (!wrap) return;
  const res = await fetch('assets/products.json');
  const data = await res.json();
  const products = data.products;

  // Filters
  const q = ($('#q')?.value || '').toLowerCase();
  const tier = $('#tier')?.value || 'all';
  const filtered = products.filter(p => {
    const text = `${p.name} ${p.cpu} ${p.gpu} ${p.ram} ${p.storage}`.toLowerCase();
    const matchesQ = q ? text.includes(q) : true;
    const matchesTier = tier === 'all' ? true : p.tier === tier;
    return matchesQ && matchesTier;
  });

  wrap.innerHTML = filtered.map(p => `
    <article class="card ${p.tier==='better'?'highlight':''}">
      <div class="badge">${p.badge}</div>
      <h3>${p.name}</h3>
      <ul class="specs">
        <li>CPU: ${p.cpu}</li>
        <li>GPU: ${p.gpu}</li>
        <li>RAM: ${p.ram}</li>
        <li>Storage: ${p.storage}</li>
        <li>OS: ${p.os}</li>
      </ul>
      <p class="price">£${p.price.toLocaleString('en-GB',{minimumFractionDigits:2})}</p>
      <p class="tiny ${p.status==='In stock'?'ok':'warn'}">${p.status}</p>
      <img class="thumb lightbox" src="${p.thumb}" alt="${p.name}" data-gallery='${JSON.stringify(p.gallery)}'/>
      <div class="btn-row">
        <a class="btn btn-primary" href="products/${p.slug}.html">View details</a>
        <a class="btn btn-outline" target="_blank" rel="noopener" href="${p.fb}">Buy on Facebook</a>
        <a class="btn btn-outline" target="_blank" rel="noopener" href="${p.ebay}">Buy on eBay</a>
      </div>
    </article>
  `).join('');

  wireLightbox();
}
££('#q, #tier').forEach(el => el?.addEventListener('input', renderShop));

// LIGHTBOX
function wireLightbox(){
  ££('.lightbox').forEach(img=>{
    img.addEventListener('click', ()=>{
      const gallery = JSON.parse(img.dataset.gallery||'[]');
      const dlg = document.createElement('dialog');
      dlg.className='lb';
      dlg.innerHTML = `
        <div class="lb-wrap">
          <button class="btn lb-x">✕</button>
          <img src="${gallery[0] || img.src}" alt="">
          <div class="lb-row">
            ${gallery.map(g=>`<img src="${g}" alt="">`).join('')}
          </div>
        </div>`;
      document.body.appendChild(dlg);
      dlg.showModal();
      dlg.querySelector('.lb-x').onclick = ()=> dlg.close();
      dlg.addEventListener('close', ()=> dlg.remove());
      dlg.querySelectorAll('.lb-row img').forEach(t => t.onclick = ()=> dlg.querySelector('img').src = t.src);
    });
  });
}

// PRODUCT PAGE – inject JSON-LD + gallery thumbnails (optional)
async function enhanceProduct(slug){
  const holder = document.getElementById('product-jsonld');
  const gal = document.getElementById('product-gallery');
  if (!holder && !gal) return;
  const res = await fetch('../assets/products.json');
  const {products} = await res.json();
  const p = products.find(x=>x.slug===slug);
  if (!p) return;

  if (holder){
    holder.textContent = JSON.stringify({
      "@context":"https://schema.org",
      "@type":"Product",
      "name": p.name,
      "image": p.gallery,
      "brand": {"@type":"Brand","name":"Bob's Builds"},
      "description": `${p.cpu}, ${p.gpu}, ${p.ram}, ${p.storage}, ${p.os}`,
      "offers": {"@type":"Offer","priceCurrency":"GBP","price": p.price, "availability":"https://schema.org/InStock"}
    });
  }
  if (gal){
    gal.innerHTML = p.gallery.map(src=>`<img class="thumb lightbox" src="${src}" data-gallery='${JSON.stringify(p.gallery)}' alt="${p.name}">`).join('');
    wireLightbox();
  }
}

// PWA register
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/assets/sw.js').catch(()=>{});
  });
}

renderShop();
