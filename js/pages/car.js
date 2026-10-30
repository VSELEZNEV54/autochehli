/* Страница модели: ?f=семейство (выбор поколения) или ?m=лекало (стандартные сочетания + индивидуальный пошив) */
(function () {
  const A = window.AS, e = A.esc, SSR = window.AS_SSR;  // SSR: контейнеры, крошки и разметку уже вывел сервер (lib/pages.php), здесь только обработчики
  let m = A.BY_SLUG[A.qs("m")], f = m ? A.FAMILIES[m.f] : A.FAMILIES[A.qs("f")];
  const found = !!f;  // неизвестный адрес: в прототипе показываем Camry с noindex, на сайте сервер отдаёт 404
  if (!f) { m = A.BY_SLUG["toyota_camry-xv70"]; f = A.FAMILIES[m.f]; }
  if (!m && f.items.length === 1) m = f.items[0];
  const b = A.BRAND[f.b], full = b.n + " " + f.n;
  /* Отзывы владельцев модели (T4, блоки 3 и 16): число — AS_CATALOG.rv, сами отзывы (js/reviews.js, 150 КБ) подгружаем,
     только если они есть. Отзыв привязан к модели, а не к кузову: покупатели пишут «Honda Fit», без поколения */
  const nRev = ((window.AS_CATALOG || {}).rv || {})[f.id] || 0;
  const revLink = nRev ? `<span><a class="link" href="#c-reviews"><b>${nRev}</b> ${A.plural(nRev, "отзыв", "отзыва", "отзывов")} владельцев</a></span>` : "";
  const revSection = '<section class="section section--tight" id="c-reviews" hidden></section>';
  function showReviews() {
    if (!nRev) return;
    A.loadScript("reviews.js").then(() => {
      const box = document.getElementById("c-reviews"), list = (window.AS_REVIEWS || []).filter(r => r.f === f.id), SHOW = 6;
      if (!box || !list.length) return;
      const all = list.length > SHOW ? [`Все отзывы о ${full}`, A.href("reviews", { f: f.id })] : [`Все отзывы о ${b.n}`, A.href("reviews", { b: b.id })];
      box.innerHTML = `<div class="section__head" style="margin-bottom:16px"><div><h2 style="font-size:1.5rem">Отзывы владельцев ${e(full)}</h2><p>Покупатели, которые заказывали у нас чехлы на ${e(full)}${f.items.length > 1 ? " — на разные поколения" : ""}.</p></div><a class="btn btn--more" href="${all[1]}">${e(all[0])}</a></div>
        <div class="reviews">${list.slice(0, SHOW).map(r => A.reviewCard(r, { here: f.id })).join("")}</div>`;
      box.hidden = false;
    }).catch(() => {});
  }
  const crumbs = document.getElementById("c-crumbs");
  if (!SSR) crumbs.insertAdjacentHTML("beforeend", `<li><a href="${A.URL.brand(b.id)}">${e(b.n)}</a></li>` + (m && f.items.length > 1 ? `<li><a href="${A.URL.fam(f)}">${e(f.n)}</a></li><li>${e([m.g, m.v].filter(Boolean).join(", ") || m.y)}</li>` : `<li>${e(f.n)}</li>`));
  if (!SSR) {
  document.getElementById("c-side-title").textContent = `Поколения ${f.n}`;
  document.getElementById("c-gens").innerHTML = f.items.map(x => `<a href="${A.URL.pos(x)}" class="${m && x.s === m.s ? "is-active" : ""}"><span>${e([x.g, x.v].filter(Boolean).join(", ") || "Все версии")}</span><small>${e(x.y || "")}</small></a>`).join("");
  document.getElementById("c-other-title").textContent = `Другие модели ${b.n}`;
  document.getElementById("c-other").innerHTML = b.fams.filter(x => x.id !== f.id).slice(0, 14).map(x => `<a href="${A.URL.fam(x)}">${e(x.n)}<small>${x.items.length}</small></a>`).join("") + `<a href="${A.URL.brand(b.id)}"><b>Все модели ${e(b.n)}</b></a>`;
  }
  const main = document.getElementById("c-main");
  const strip = A.perkStrip();

  /* SEO-тексты по образцу главной: семейство (выбор поколения) и конкретное лекало */
  const genLabel = x => [x.g, x.v].filter(Boolean).join(", ");
  const famTags = cur => f.items.filter(x => x !== cur).slice(0, 10).map(x => [`Чехлы на ${full} ${genLabel(x) || x.y || ""}`.trim(), A.URL.pos(x)])
    .concat(b.fams.filter(x => x.id !== f.id).slice(0, 12).map(x => [`Чехлы на ${b.n} ${x.n}`, A.URL.fam(x)]))
    .concat([[`Все чехлы ${b.n}`, A.URL.brand(b.id)], ["Авточехлы из экокожи", A.href("collection", { c: "eco" })], ["Чехлы из алькантары", A.href("collection", { c: "alcantara" })], ["Авточехлы жаккард", A.href("collection", { c: "jacquard" })]]);
  function seoFam() {
    const st = A.famStats(f);
    return A.seoBlock({
      h2: `Чехлы на сиденья ${e(full)} от производителя`,
      intro: `<p>Модельные чехлы на ${e(full)} шьём по заводским лекалам на собственном производстве в Новосибирске: своё лекало для каждого поколения и варианта салона, годы выпуска — ${e(st.years)}. Чехлы повторяют контуры и линии сидений, сохраняют доступ к регулировкам, подлокотникам и креплениям, не пузырятся и не собираются гармошкой. Салон выглядит так, будто сиденья перетянули заново.</p>`,
      parts: [
        [`Поколения и кузова ${e(full)}`, `<ul>${f.items.map(x => `<li><a href="${A.URL.pos(x)}">${e(full)}${genLabel(x) ? " " + e(genLabel(x)) : ""}</a> — ${e(x.y || "все годы")}, комплект от ${A.fmt(x.p[0])}</li>`).join("")}</ul>`],
        ["Как выбрать лекало", `<p>Выберите поколение по годам выпуска и вариант салона — от них зависит выкройка. Если сомневаетесь, введите VIN-номер в строке поиска: по нему определим марку и модельный год. Комплектацию салона — деление задней спинки, подлокотник, подголовники — уточнит менеджер после заказа.</p>`],
        A.SEO_PART.materials(full),
        A.SEO_PART.prices(full, A.minPrices(f.items)),
        A.SEO_PART.custom(full),
        A.SEO_PART.service()
      ],
      tags: famTags(null)
    });
  }
  function seoModel(x) {
    const name = A.carName(x), others = f.items.filter(y => y !== x);
    return A.seoBlock({
      h2: `Чехлы на сиденья ${e(name)} от производителя`,
      intro: `<p>Комплект для ${e(name)}${x.y ? " (" + e(x.y) + ")" : ""} шьётся на собственном производстве в Новосибирске по заводскому лекалу именно этого поколения${x.v ? " и варианта салона — " + e(x.v) : ""}. Чехлы повторяют контуры и линии сидений, сохраняют доступ к регулировкам, подлокотникам и креплениям, не пузырятся и не собираются гармошкой. Купить чехлы на ${e(name)} можно напрямую у производителя, без наценки посредников.</p>`,
      parts: [
        ["Что входит в комплект", `<p>Чехлы на передние и задние сиденья, спинки и подголовники, разрывные швы под Airbag, крепёж — резинки с крючками и шнур для утяжки. Оплётка руля в цвет салона — в подарок к комплекту. Автоковрики EVA в цвет чехлов и установку в вашем городе добавим по запросу.</p>`],
        others.length ? [`Другие поколения ${e(full)}`, `<p>${others.map(y => `<a href="${A.URL.pos(y)}">${e(full)}${genLabel(y) ? " " + e(genLabel(y)) : ""}</a> (${e(y.y || "все годы")})`).join(", ")}. Если не уверены, какое лекало подходит, введите VIN-номер в строке поиска или позвоните 8 (800) 775-32-60.</p>`] : null,
        A.SEO_PART.materials(name),
        A.SEO_PART.prices(name, x.p),
        A.SEO_PART.custom(name),
        A.SEO_PART.service()
      ],
      tags: famTags(x)
    });
  }

  /* фильтр по материалу и сортировка — общие для семейства и лекала; k — сколько лекал в выдаче */
  const MATS = [["all", "Все", A.VARIANTS.length], ["1", "Экокожа", 0], ["2", "Алькантара", 0], ["0", "Жаккард", 0]]
    .map(x => x[0] === "all" ? x : [x[0], x[1], A.VARIANTS.filter(v => String(v.mat) === x[0]).length]).filter(x => x[2]);
  const toolbar = k => `<div class="toolbar"><div class="chips" id="c-mat">${MATS.map((x, i) => `<button type="button" class="chip${i ? "" : " is-selected"}" data-mat="${x[0]}">${x[1]} <small>${x[2] * k}</small></button>`).join("")}</div><select class="select" id="c-sort" aria-label="Сортировка"><option value="pop">Сначала популярные</option><option value="asc">Сначала дешевле</option><option value="desc">Сначала дороже</option></select></div>`;
  let mat = "all", sort = "pop";
  function bindToolbar(render) {
    document.getElementById("c-mat").addEventListener("click", ev => { const btn = ev.target.closest("[data-mat]"); if (!btn) return; mat = btn.dataset.mat; document.querySelectorAll("#c-mat .chip").forEach(c => c.classList.toggle("is-selected", c === btn)); render(true); });
    document.getElementById("c-sort").addEventListener("change", ev => { sort = ev.target.value; render(true); });
  }

  if (!m) {
    /* --- семейство: выбор поколения --- */
    /* Title и Description — по маске T4 для модели без поколения, H1 — как у марки: «Авточехлы на Lada Vesta» */
    const ruF = A.kitOf(f.items[0]).ru || f.n;
    A.seo({
      title: A.titleFit([`Чехлы на сиденья ${ruF}: авточехлы на ${full}, цена от ${A.fmt(f.min)}`, `Чехлы на сиденья ${full}, цена от ${A.fmt(f.min)}`, `Чехлы на ${full}, цена от ${A.fmt(f.min)}`]),
      description: `Модельные чехлы на сиденья ${ruF}: экокожа, алькантара, жаккард. Своё заводское лекало на каждый кузов, разрывные швы под Airbag, доставка по России.`,
      keywords: [...new Set([`чехлы на сиденья ${ruF}`, `чехлы на сиденья ${full}`, `авточехлы на ${full}`, `модельные чехлы ${full}`, `купить чехлы на ${ruF}`])].join(", ").toLowerCase(),
      page: "car", params: { f: f.id }, image: A.carRender(f.items[0]) || undefined, noindex: !found
    });
    if (!SSR) document.getElementById("c-h1").textContent = "Авточехлы на " + full;
    if (!SSR) document.getElementById("c-meta").innerHTML = revLink + `<span><b>${f.items.length}</b> ${A.plural(f.items.length, "лекало", "лекала", "лекал")}</span>${f.from ? `<span>с <b>${f.from}</b> года</span>` : ""}<span>комплект от <b>${A.fmt(f.min)}</b></span>`;
    if (!SSR) main.innerHTML = `<div class="section__head" style="margin-bottom:16px"><div><h2 style="font-size:1.5rem">Выберите поколение${f.items.some(x => x.v) ? " и вариант салона" : ""}</h2><p>Для каждого кузова — своё заводское лекало. Если не уверены в поколении, введите VIN-номер в строке поиска.</p></div></div>
      <div class="fams">${f.items.map(A.genCard).join("")}</div>
      <div class="section__head" style="margin:clamp(32px,3vw,48px) 0 16px"><div><h2 style="font-size:1.5rem">Чехлы на ${e(full)}</h2><p>Готовые сочетания на все кузова ${e(full)}. Чтобы видеть чехлы только на свой кузов, выберите поколение выше.</p></div></div>
      ${toolbar(f.items.length)}
      <div class="grid" id="c-grid" style="grid-auto-flow:dense"></div>
      <div class="section__more" id="c-more"></div>
      <section class="section section--tight">${strip}</section>
      ${revSection}
      <section class="section section--tight">${A.customCard(f.items[0], full)}</section>
      <section class="section section--tight"><div class="seo">${seoFam()}</div></section>`;
    /* чехлы на все кузова: популярные сочетания идут «лесенкой» по кузовам — новые кузова первыми, одинаковые фото не встают рядом */
    const grid = document.getElementById("c-grid"), more = document.getElementById("c-more"), PAGE = 12;
    let shown = PAGE;
    function render(reset) {
      if (reset) shown = PAGE;
      const vs = A.VARIANTS.filter(v => mat === "all" || String(v.mat) === mat), list = [];
      f.items.forEach((x, gi) => vs.forEach((v, vi) => list.push({ x, v, k: (gi + vi) * 100 + gi })));
      list.sort((p, q) => p.k - q.k);
      if (sort !== "pop") list.sort((p, q) => (sort === "asc" ? 1 : -1) * (A.priceOf(p.x, p.v) - A.priceOf(q.x, q.v)));
      const cards = list.slice(0, shown).map(c => A.coverCard(c.x, c.v, { salon: true })), rest = list.length - shown;
      grid.innerHTML = cards.join("");
      more.innerHTML = rest > 0 ? `<button type="button" class="btn btn--ghost">Показать ещё ${Math.min(PAGE, rest)}</button>` : "";
      A.badges();
    }
    more.addEventListener("click", ev => { if (!ev.target.closest(".btn")) return; shown += PAGE; render(); });
    bindToolbar(render);
    if (!SSR) render();
    /* Разметка: хлебные крошки и список кузовов модели */
    const ld = { "@context": "https://schema.org", "@graph": [
      { "@type": "BreadcrumbList", itemListElement: [["Главная", A.href("index")], ["Модельные авточехлы", A.href("catalog")], [b.n, A.URL.brand(b.id)], [f.n, A.URL.fam(f)]].map(([n, u], i) => ({ "@type": "ListItem", position: i + 1, name: n, item: A.abs(u) })) },
      { "@type": "ItemList", name: `Авточехлы на ${full}`, itemListElement: f.items.map((x, i) => ({ "@type": "ListItem", position: i + 1, name: A.carName(x), url: A.abs(A.URL.pos(x)) })) }] };
    if (!SSR) document.head.insertAdjacentHTML("beforeend", `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`);
  } else {
    /* --- лекало (шаблон T4): стандартные сочетания + плашка индивидуального пошива ---
       Title, H1, Description — по SEO-маскам T4 (план/Шаблоны страниц для Битрикса) с решениями 29.10.2026:
       без срока пошива, Title до 70 знаков, иначе без поколения. */
    const name = A.carName(m), model = m.m || f.n, gen = [m.g, m.v].filter(Boolean).join(", "), kit = A.kitOf(m), ru = kit.ru || model;
    const yrs = m.y ? m.y.replace(/^(\d{4})–\1$/, "$1") : "", from = A.fmt(m.p[0]);
    const h1 = `Авточехлы на ${b.n} ${model}${gen ? " " + gen : ""}`;
    const ruGen = m.g && !/\d$/.test(ru) ? " " + m.g : "";  // «Рио 2» из Битрикса уже с поколением — без «II»
    const desc = `Модельные чехлы на сиденья ${ru}${yrs ? " " + yrs : ""}: экокожа, алькантара, жаккард. Пошив по заводским лекалам, разрывные швы под Airbag, оплата при получении.`;
    A.seo({
      title: A.titleFit([`Чехлы на сиденья ${ru}${ruGen}: авточехлы на ${b.n} ${model}, цена от ${from}`, `Чехлы на сиденья ${ru}: авточехлы на ${b.n} ${model}, цена от ${from}`, `Чехлы на ${name}, цена от ${from}`, `Чехлы на ${b.n} ${model}, цена от ${from}`]),
      description: desc,
      keywords: [...new Set([`чехлы на сиденья ${ru}${ruGen}`, `авточехлы на ${b.n} ${model}`, `чехлы на ${name}`, `чехлы на сиденья ${b.n} ${model}${gen ? " " + gen.replace(/,/g, "") : ""}`, `модельные чехлы ${name}`])].join(", ").toLowerCase(),
      page: "car", params: { m: m.s }, image: A.carRender(m) || A.posPhoto(m), noindex: !found
    });
    if (!SSR) document.getElementById("c-h1").innerHTML = `${e(h1)}${yrs ? ` <span class="muted" style="font-weight:600">(${e(yrs)})</span>` : ""}`;
    if (!SSR) document.getElementById("c-meta").innerHTML = revLink + (kit.n ? "<span><b>Лекало в базе</b></span>" : "") + `<span>Жаккард <b>${A.fmt(m.p[0])}</b></span><span>Экокожа <b>${A.fmt(m.p[1])}</b></span><span>Алькантара <b>${A.fmt(m.p[2])}</b></span>`;
    if (!SSR) document.getElementById("c-side-custom").href = A.URL.custom(m);
    if (!SSR) main.innerHTML = `${toolbar(1)}
      <div class="grid" id="c-grid" style="grid-auto-flow:dense"></div>
      <section class="section section--tight">${strip}</section>
      <section class="section section--tight">
        <div class="section__head" style="margin-bottom:16px"><div><h2 style="font-size:1.5rem">Комплектация салона ${e(name)}</h2><p>По данным производства. Если в вашем салоне иначе, менеджер уточнит комплектацию после заказа.</p></div></div>
        ${A.specHtml([["Марка и модель", b.n + " " + model], ["Поколение", m.g], ["Вариант салона", m.v], ["Годы выпуска", yrs], ...A.kitRows(m), ["Гарантия", "1 год на качество пошива"]])}
      </section>
      <section class="section section--tight">
        <div class="section__head" style="margin-bottom:16px"><div><h2 style="font-size:1.5rem">Что входит в комплект</h2></div></div>
        ${A.kitIncludes(m)}
      </section>
      <section class="section section--tight" data-tabs>
        <div class="tabs"><button class="is-active" data-tab="install">Установка</button><button data-tab="faq">Вопросы</button></div>
        <div class="tab-pane is-active" data-pane="install"><div class="prose"><p>Качественная установка может занять около двух часов. Сначала надевают чехол на подушку сиденья, затем на спинку; резинки с крючками заводят под сиденье. Разрывные швы должны быть со стороны дверей — кресла различают по ярлыкам AIRBAG. Пошаговая инструкция — <a href="${A.href("info-install")}">в разделе для клиентов</a>.</p></div></div>
        <div class="tab-pane" data-pane="faq"><div class="faq" style="grid-template-columns:1fr"><div class="faq__list"><details open><summary>Подойдут ли чехлы на мою комплектацию ${e(name)}?</summary><p>Чехлы шьются по заводскому лекалу ${e(name)}${m.v ? " (" + e(m.v) + ")" : ""}. Сверьте комплектацию салона в таблице выше: деление спинки, подлокотники, подголовники. Если в вашем салоне иначе — выберите соседний вариант слева или позвоните менеджеру.</p></details><details><summary>Сработают ли подушки безопасности?</summary><p>Да. Мастера делают специальные разрывные швы, которые не мешают срабатыванию подушек безопасности.</p></details></div></div></div>
      </section>
      ${revSection}
      <section class="section section--tight">${A.customCard(m)}</section>
      <section class="section section--tight"><div class="seo">${seoModel(m)}</div></section>`;
    const grid = document.getElementById("c-grid");
    function render() {
      let list = A.VARIANTS.filter(v => mat === "all" || String(v.mat) === mat);
      if (sort === "asc") list = list.slice().sort((x, y) => A.priceOf(m, x) - A.priceOf(m, y));
      if (sort === "desc") list = list.slice().sort((x, y) => A.priceOf(m, y) - A.priceOf(m, x));
      const cards = list.map(v => A.coverCard(m, v));
      grid.innerHTML = cards.join("");
      A.badges();
    }
    bindToolbar(render);
    if (!SSR) render();
    /* Разметка T4: хлебные крошки и товар с диапазоном цен (AggregateRating — когда у отзывов появятся оценки).
       Нижняя цена — как в Title: базовая цена модели (жаккард доступен через конструктор), верхняя — дорогая карточка. */
    const abs = A.abs, prices = A.VARIANTS.map(v => A.priceOf(m, v));
    const trail = [["Главная", A.href("index")], ["Модельные авточехлы", A.href("catalog")], [b.n, A.URL.brand(b.id)]]
      .concat(f.items.length > 1 ? [[f.n, A.URL.fam(f)]] : []).concat([[h1, A.URL.pos(m)]]);
    const ld = { "@context": "https://schema.org", "@graph": [
      { "@type": "BreadcrumbList", itemListElement: trail.map(([n, u], i) => ({ "@type": "ListItem", position: i + 1, name: n, item: abs(u) })) },
      { "@type": "Product", name: h1, description: desc, image: abs(A.carRender(m) || A.posPhoto(m)), brand: { "@type": "Brand", name: "Автостиль" },
        offers: { "@type": "AggregateOffer", priceCurrency: "RUB", lowPrice: Math.min(...prices), highPrice: Math.max(...prices), offerCount: prices.length, url: abs(A.URL.pos(m)) } }] };
    if (!SSR) document.head.insertAdjacentHTML("beforeend", `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`);
    if (!SSR) document.querySelectorAll("[data-tabs]").forEach(box => { const btns = box.querySelectorAll("[data-tab]"), panes = box.querySelectorAll("[data-pane]"); btns.forEach(bt => bt.addEventListener("click", () => { btns.forEach(x => x.classList.toggle("is-active", x === bt)); panes.forEach(p => p.classList.toggle("is-active", p.dataset.pane === bt.dataset.tab)); })); });
  }
  showReviews();
  A.badges();
})();
