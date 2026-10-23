/* Страница модели: ?f=семейство (выбор поколения) или ?m=лекало (стандартные сочетания + индивидуальный пошив) */
(function () {
  const A = window.AS, e = A.esc;
  let m = A.BY_SLUG[A.qs("m")], f = m ? A.FAMILIES[m.f] : A.FAMILIES[A.qs("f")];
  if (!f) { m = A.BY_SLUG["toyota_camry-xv70"]; f = A.FAMILIES[m.f]; }
  if (!m && f.items.length === 1) m = f.items[0];
  const b = A.BRAND[f.b], full = b.n + " " + f.n;
  const crumbs = document.getElementById("c-crumbs");
  crumbs.insertAdjacentHTML("beforeend", `<li><a href="${A.URL.brand(b.id)}">${e(b.n)}</a></li>` + (m && f.items.length > 1 ? `<li><a href="${A.URL.fam(f)}">${e(f.n)}</a></li><li>${e([m.g, m.v].filter(Boolean).join(", ") || m.y)}</li>` : `<li>${e(f.n)}</li>`));
  document.getElementById("c-side-title").textContent = `Поколения ${f.n}`;
  document.getElementById("c-gens").innerHTML = f.items.map(x => `<a href="${A.URL.pos(x)}" class="${m && x.s === m.s ? "is-active" : ""}"><span>${e([x.g, x.v].filter(Boolean).join(", ") || "Все версии")}</span><small>${e(x.y || "")}</small></a>`).join("");
  document.getElementById("c-other-title").textContent = `Другие модели ${b.n}`;
  document.getElementById("c-other").innerHTML = b.fams.filter(x => x.id !== f.id).slice(0, 14).map(x => `<a href="${A.URL.fam(x)}">${e(x.n)}<small>${x.items.length}</small></a>`).join("") + `<a href="${A.URL.brand(b.id)}"><b>Все модели ${e(b.n)}</b></a>`;
  const main = document.getElementById("c-main");
  const ICO = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg>',
    ruler: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16M6 16l6-12 6 12"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z"/><path d="m9 12 2 2 4-4"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>'
  };
  const strip = `<div class="ready-strip"><div>${ICO.ruler}<div><b>Заводские лекала</b>${e(m ? genName(m) : f.n)}</div></div><div>${ICO.check}<div><b>Гарантия 1 год</b>на качество пошива</div></div><div>${ICO.shield}<div><b>Разрывные швы под Airbag</b>подушки сработают штатно</div></div><div>${ICO.pin}<div><b>Доставка по России</b>DPD и Почта России, от 250 ₽</div></div></div>`;
  function genName(x) { return A.genName(x); }

  /* SEO-тексты по образцу главной: семейство (выбор поколения) и конкретное лекало */
  const genLabel = x => [x.g, x.v].filter(Boolean).join(", ");
  const famTags = cur => f.items.filter(x => x !== cur).slice(0, 10).map(x => [`Чехлы на ${full} ${genLabel(x) || x.y || ""}`.trim(), A.URL.pos(x)])
    .concat(b.fams.filter(x => x.id !== f.id).slice(0, 12).map(x => [`Чехлы на ${b.n} ${x.n}`, A.URL.fam(x)]))
    .concat([[`Все чехлы ${b.n}`, A.URL.brand(b.id)], ["Авточехлы из экокожи", "collection.html?c=eco"], ["Чехлы из алькантары", "collection.html?c=alcantara"], ["Авточехлы жаккард", "collection.html?c=jacquard"]]);
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
    document.title = `Чехлы на сиденья ${full}: ${f.items.length} ${A.plural(f.items.length, "кузов", "кузова", "кузовов")}, от ${A.fmt(f.min)} | Автостиль`;
    document.getElementById("c-h1").textContent = "Чехлы на сиденья " + full;
    document.getElementById("c-meta").innerHTML = `<span><b>${f.items.length}</b> ${A.plural(f.items.length, "лекало", "лекала", "лекал")}</span>${f.from ? `<span>с <b>${f.from}</b> года</span>` : ""}<span>комплект от <b>${A.fmt(f.min)}</b></span>`;
    document.querySelector('link[rel="canonical"]').href = `https://1avtochehol.ru/avto/${f.id}/`;
    main.innerHTML = strip + `<div class="section__head" style="margin-bottom:16px"><div><h2 style="font-size:1.5rem">Выберите поколение${f.items.some(x => x.v) ? " и вариант салона" : ""}</h2><p>Для каждого кузова — своё заводское лекало. Если не уверены в поколении, введите VIN-номер в строке поиска.</p></div></div>
      <div class="fams">${f.items.map(A.genCard).join("")}</div>
      <div class="section__head" style="margin:clamp(32px,3vw,48px) 0 16px"><div><h2 style="font-size:1.5rem">Чехлы на ${e(full)}</h2><p>Готовые сочетания на все кузова ${e(full)}. Чтобы видеть чехлы только на свой кузов, выберите поколение выше.</p></div></div>
      ${toolbar(f.items.length)}
      <div class="grid" id="c-grid" style="grid-auto-flow:dense"></div>
      <div class="section__more" id="c-more"></div>
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
    render();
  } else {
    /* --- лекало: стандартные сочетания + плашка индивидуального пошива --- */
    const name = A.carName(m), sub = [m.v, m.y].filter(Boolean).join(", ");
    document.title = `Чехлы на сиденья ${name}${m.y ? " (" + m.y + ")" : ""} — купить, цена от ${A.fmt(m.p[0])} | Автостиль`;
    document.querySelector('meta[name="description"]').content = `Модельные чехлы на сиденья ${name}${sub ? ", " + sub : ""}: жаккард ${A.fmt(m.p[0])}, экокожа ${A.fmt(m.p[1])}, алькантара ${A.fmt(m.p[2])}. Пошив по заводскому лекалу, разрывные швы под Airbag, доставка по России, гарантия на пошив 1 год.`;
    document.querySelector('link[rel="canonical"]').href = `https://1avtochehol.ru/avto/${m.s}/`;
    document.getElementById("c-h1").innerHTML = `Чехлы на сиденья ${e(name)}${sub ? ` <span class="muted" style="font-weight:600">${e(sub)}</span>` : ""}`;
    document.getElementById("c-meta").innerHTML = `<span>Жаккард <b>${A.fmt(m.p[0])}</b></span><span>Экокожа <b>${A.fmt(m.p[1])}</b></span><span>Алькантара <b>${A.fmt(m.p[2])}</b></span>`;
    document.getElementById("c-side-custom").href = A.URL.custom(m);
    main.innerHTML = strip + `${toolbar(1)}
      <div class="grid" id="c-grid" style="grid-auto-flow:dense"></div>
      <section class="section section--tight" data-tabs>
        <div class="tabs"><button class="is-active" data-tab="kit">Что входит</button><button data-tab="spec">Лекало и салон</button><button data-tab="install">Установка</button><button data-tab="faq">Вопросы</button></div>
        <div class="tab-pane is-active" data-pane="kit"><div class="includes"><div>${A.ICON.check}Чехлы на сиденья, спинки и подголовники</div><div>${A.ICON.check}Разрывные швы под Airbag</div><div>${A.ICON.check}Крепёж: резинки с крючками, шнур для утяжки</div><div>${A.ICON.check}Оплётка руля в цвет салона — в подарок</div></div></div>
        <div class="tab-pane" data-pane="spec"><dl class="spec"><div><dt>Марка и модель</dt><dd>${e(b.n + " " + f.n)}</dd></div><div><dt>Поколение, кузов</dt><dd>${e(m.g || "—")}</dd></div><div><dt>Вариант салона</dt><dd>${e(m.v || "стандартный")}</dd></div><div><dt>Годы выпуска</dt><dd>${e(m.y || "все годы")}</dd></div><div><dt>Гарантия</dt><dd>1 год на качество пошива</dd></div></dl></div>
        <div class="tab-pane" data-pane="install"><div class="prose"><p>Качественная установка может занять около двух часов. Сначала надевают чехол на подушку сиденья, затем на спинку; резинки с крючками заводят под сиденье. Разрывные швы должны быть со стороны дверей — кресла различают по ярлыкам AIRBAG. Пошаговая инструкция — <a href="info-install.html">в разделе для клиентов</a>.</p></div></div>
        <div class="tab-pane" data-pane="faq"><div class="faq" style="grid-template-columns:1fr"><div class="faq__list"><details open><summary>Подойдут ли чехлы на мою комплектацию ${e(name)}?</summary><p>Чехлы шьются по заводскому лекалу ${e(name)}${m.v ? " (" + e(m.v) + ")" : ""}. Если в вашем салоне другое деление спинки или нет подлокотника — выберите соседний вариант слева или позвоните менеджеру.</p></details><details><summary>Сработают ли подушки безопасности?</summary><p>Да. Мастера делают специальные разрывные швы, которые не мешают срабатыванию подушек безопасности.</p></details></div></div></div>
      </section>
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
    render();
    document.querySelectorAll("[data-tabs]").forEach(box => { const btns = box.querySelectorAll("[data-tab]"), panes = box.querySelectorAll("[data-pane]"); btns.forEach(bt => bt.addEventListener("click", () => { btns.forEach(x => x.classList.toggle("is-active", x === bt)); panes.forEach(p => p.classList.toggle("is-active", p.dataset.pane === bt.dataset.tab)); })); });
  }
  A.badges();
})();
