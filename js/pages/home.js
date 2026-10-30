/* Главная (шаблон T1): популярные марки и хиты по продажам */
(function () {
  const A = window.AS;
  /* По таблице T1: марки и хиты — по продажам (js/catalog-extra.js, tools/build_brand_data.py).
     Без этих данных — прежний порядок марок и подборка A.HITS. */
  const CAT = window.AS_CATALOG || {}, sales = (CAT.order || []).map(id => A.BRAND[id]).filter(Boolean);
  const top = sales.concat(A.sortedBrands().filter(b => !sales.includes(b))).slice(0, 15);
  document.getElementById("home-brands").innerHTML = top.map(b => `<a class="brand" href="${A.URL.brand(b.id)}"><img src="${A.brandLogo(b.id)}" alt="Логотип ${A.esc(b.n)}" loading="lazy" width="80" height="80"><span>${A.esc(b.n)}</span><small>${b.fams.length} ${A.plural(b.fams.length, "модель", "модели", "моделей")}</small></a>`).join("")
    + `<a class="brand brand--all" href="${A.href("catalog")}"><i aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg></i><span>Все марки</span><small>и модели</small></a>`;
  /* хиты: самое продаваемое лекало каждой из марок-лидеров; сочетания идут по кругу, чтобы фото рядом не повторялись */
  const hits = (CAT.hits || []).map(s => A.BY_SLUG[s]).filter(Boolean).map((m, i) => [m.s, A.VARIANTS[i % A.VARIANTS.length].id]);
  document.getElementById("home-hits").innerHTML = (hits.length ? hits : A.HITS).filter(([s, v]) => A.BY_SLUG[s] && A.VAR[v]).map(([s, v]) => A.coverCard(A.BY_SLUG[s], A.VAR[v], { logo: true })).join("");
  /* блоки марок: лекала марки по продажам (AS_CATALOG.home); сочетания идут дальше по кругу, чтобы фото рядом не повторялись */
  let k = 0;
  document.querySelectorAll("[data-brand-hits]").forEach(box => {
    const list = ((CAT.home || {})[box.dataset.brandHits] || []).map(s => A.BY_SLUG[s]).filter(Boolean);
    box.innerHTML = list.map(m => A.coverCard(m, A.VARIANTS[k++ % A.VARIANTS.length])).join("");
  });
  A.badges();
})();
