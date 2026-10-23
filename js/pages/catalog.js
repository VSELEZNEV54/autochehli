/* Каталог: все марки, фильтр по букве и поиску (марки и модели) */
(function () {
  const A = window.AS, brands = A.BRANDS.slice().sort((a, b) => a.id.localeCompare(b.id)), L = b => b.id[0].toUpperCase();
  const box = document.getElementById("cat-brands"), fams = document.getElementById("cat-fams"), q = document.getElementById("cat-q"), alpha = document.getElementById("cat-alpha");
  const letters = [...new Set(brands.map(L))];
  alpha.innerHTML = `<button type="button" class="is-active" data-l="">Все</button>` + letters.map(l => `<button type="button" data-l="${l}">${l}</button>`).join("");
  let letter = "";
  const norm = s => s.toLowerCase().replace(/ё/g, "е");
  function render() {
    const t = norm(q.value.trim());
    const list = brands.filter(b => (!letter || L(b) === letter) && (!t || norm(b.n).includes(t) || norm(b.s).split(" ").some(x => x.startsWith(t))));
    box.innerHTML = list.map(b => `<a class="brand" href="${A.URL.brand(b.id)}"><img src="${A.brandLogo(b.id)}" alt="Логотип ${A.esc(b.n)}" loading="lazy" width="52" height="52"><span>${A.esc(b.n)}</span><small>${b.fams.length} ${A.plural(b.fams.length, "модель", "модели", "моделей")}</small></a>`).join("");
    const famList = t.length >= 2 ? Object.values(A.FAMILIES).filter(f => norm(f.n).includes(t) || (f.items[0].ru && norm(f.items[0].ru).includes(t))).slice(0, 12) : [];
    fams.hidden = !famList.length;
    fams.innerHTML = famList.map(A.famCard).join("");
    if (!list.length && !famList.length) box.innerHTML = `<div class="empty">Ничего не нашли. Попробуйте другое написание или позвоните <a class="link" href="tel:88007753260">8 (800) 775-32-60</a> — подскажем, есть ли лекало для вашего автомобиля.</div>`;
  }
  q.addEventListener("input", render);
  alpha.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; letter = b.dataset.l; alpha.querySelectorAll("button").forEach(x => x.classList.toggle("is-active", x === b)); render(); });
  render();
  /* Популярные модели: 15 карточек — ровно 3 ряда по 5 или 5 рядов по 3; блок индивидуального пошива — после всех карточек, перед SEO-текстом */
  const pop = ["toyota-camry", "lada-vesta", "hyundai-solaris", "kia-rio", "renault-duster", "lada-granta", "kia-sportage", "hyundai-creta", "volkswagen-polo", "skoda-octavia", "nissan-qashqai", "mitsubishi-outlander", "toyota-rav4", "lada-largus", "lada-niva-legend-4x4"].map(id => A.FAMILIES[id]).filter(Boolean);
  document.getElementById("cat-popular").innerHTML = pop.map(A.famCard).join("");

  /* SEO-текст по образцу главной */
  const e = A.esc, byBrand = {};
  pop.forEach(f => (byBrand[f.b] = byBrand[f.b] || []).push(`<a href="${A.URL.fam(f)}">${e(f.n)}</a>`));
  const popText = Object.entries(byBrand).map(([b, list]) => `${e(A.brandName(b))} (${list.join(", ")})`).join(", ");
  const brandLinks = brands.map(b => `<a href="${A.URL.brand(b.id)}">${e(b.n)}</a>`).join(", ");
  const top = brands.slice().sort((x, y) => y.cnt - x.cnt);
  document.getElementById("cat-seo").innerHTML = A.seoBlock({
    h2: "Модельные чехлы на сиденья для любой марки",
    intro: `<p>В каталоге «Автостиль» — модельные чехлы на сиденья автомобилей популярных марок: легковые машины, кроссоверы, минивэны, пикапы и коммерческий транспорт. С 2009 года мы шьём модельные авточехлы на собственном производстве в Новосибирске и продаём их напрямую, без наценки посредников. Для каждого поколения и варианта салона — своё заводское лекало, поэтому чехлы повторяют контуры и линии сидений, сохраняют доступ к регулировкам, подлокотникам и креплениям, не пузырятся и не собираются гармошкой.</p>`,
    parts: [
      ["Как найти чехлы на свой автомобиль", `<p>Выберите марку в списке выше или по первой букве, затем модель и поколение кузова. На странице модели — стандартные сочетания материала и цвета с ценой за комплект на весь салон. Можно начать и с поиска: введите название модели по-русски или по-английски, например «Солярис» или Camry. Если знаете VIN-номер, введите его в строке поиска — по VIN определим марку и модельный год, а комплектацию салона уточнит менеджер после заказа.</p>`],
      ["Популярные марки и модели", `<p>Чаще всего заказывают чехлы на сиденья ${popText}. Полный список марок в каталоге: ${brandLinks}.</p>`],
      A.SEO_PART.materials(""),
      A.SEO_PART.prices("", A.minPrices(A.MODELS)),
      A.SEO_PART.custom(""),
      A.SEO_PART.service()
    ],
    tags: top.slice(0, 24).map(b => [`Чехлы на сиденья ${b.n}`, A.URL.brand(b.id)])
      .concat(pop.slice(0, 10).map(f => [`Чехлы на ${A.brandName(f.b)} ${f.n}`, A.URL.fam(f)]))
      .concat([["Авточехлы из экокожи", "collection.html?c=eco"], ["Чехлы из алькантары", "collection.html?c=alcantara"], ["Авточехлы жаккард", "collection.html?c=jacquard"], ["Чехлы для кроссоверов", "collection.html?c=suv"], ["Недорогие авточехлы", "collection.html?c=budget"], ["Пошив авточехлов на заказ", "custom.html"], ["Стать дилером", "dealers.html"]])
  });
})();
