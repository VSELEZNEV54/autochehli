/* Главная: марки, популярные сочетания чехлов */
(function () {
  const A = window.AS;
  const top = A.sortedBrands().slice(0, 15);
  document.getElementById("home-brands").innerHTML = top.map(b => `<a class="brand" href="${A.URL.brand(b.id)}"><img src="${A.brandLogo(b.id)}" alt="Логотип ${A.esc(b.n)}" loading="lazy" width="80" height="80"><span>${A.esc(b.n)}</span><small>${b.fams.length} ${A.plural(b.fams.length, "модель", "модели", "моделей")}</small></a>`).join("")
    + `<a class="brand brand--all" href="catalog.html"><i aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg></i><span>Все марки</span><small>и модели</small></a>`;
  const hits = A.HITS;
  document.getElementById("home-hits").innerHTML = hits.filter(([s]) => A.BY_SLUG[s]).map(([s, v]) => A.coverCard(A.BY_SLUG[s], A.VAR[v], { logo: true })).join("");
  A.badges();
})();
