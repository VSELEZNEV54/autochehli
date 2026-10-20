/* Главная: марки, популярные сочетания чехлов */
(function () {
  const A = window.AS;
  const top = A.sortedBrands().slice(0, 19);
  document.getElementById("home-brands").innerHTML = top.map(b => `<a class="brand" href="${A.URL.brand(b.id)}"><img src="${A.brandLogo(b.id)}" alt="Логотип ${A.esc(b.n)}" loading="lazy" width="52" height="52"><span>${A.esc(b.n)}</span><small>${b.fams.length} ${A.plural(b.fams.length, "модель", "модели", "моделей")}</small></a>`).join("")
    + `<a class="brand brand--all" href="catalog.html"><b>41</b><span>Все марки</span><small>485 лекал</small></a>`;
  const hits = [["toyota_camry-xv70", "eco-beige"], ["lada_vesta", "eco-black"], ["hyundai_solaris-2", "eco-grey"], ["kia_rio-iv", "eco-red"], ["renault_duster", "jac-black"], ["toyota_rav4-new", "alc-grey"], ["hyundai_creta", "eco-blue"], ["kia_sportageiv-re", "alc-black"], ["lada_granta-re", "eco-orange"], ["volkswagen_polo", "eco-black"]];
  document.getElementById("home-hits").innerHTML = hits.filter(([s]) => A.BY_SLUG[s]).map(([s, v]) => A.coverCard(A.BY_SLUG[s], A.VAR[v], { logo: true })).join("");
  A.badges();
})();
