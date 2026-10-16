/* Страница модели: ?f=семейство (выбор поколения) или ?m=лекало (готовые чехлы + индивидуальный пошив) */
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
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg>',
    ruler: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16M6 16l6-12 6 12"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z"/><path d="m9 12 2 2 4-4"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>'
  };
  const strip = `<div class="ready-strip"><div>${ICO.clock}<div><b>Пошив за 1 день</b>готовые комплекты</div></div><div>${ICO.ruler}<div><b>Лекала с сидений</b>${e(m ? genName(m) : f.n)}</div></div><div>${ICO.shield}<div><b>Молнии под Airbag</b>включены в цену</div></div><div>${ICO.pin}<div><b>Установка в Москве</b>1,5 часа, 2 500 ₽</div></div></div>`;
  function genName(x) { return A.genName(x); }

  if (!m) {
    /* --- семейство: выбор поколения --- */
    document.title = `Чехлы на сиденья ${full}: ${f.items.length} ${A.plural(f.items.length, "кузов", "кузова", "кузовов")}, от ${A.fmt(f.min)} | Автостиль`;
    document.getElementById("c-h1").textContent = "Чехлы на сиденья " + full;
    document.getElementById("c-meta").innerHTML = `<span><b>${f.items.length}</b> ${A.plural(f.items.length, "лекало", "лекала", "лекал")}</span>${f.from ? `<span>с <b>${f.from}</b> года</span>` : ""}<span>готовые от <b>${A.fmt(f.min)}</b></span><span>пошив 1 день</span>`;
    document.querySelector('link[rel="canonical"]').href = `https://1avtochehol.ru/avto/${f.id}/`;
    main.innerHTML = strip + `<div class="section__head" style="margin-bottom:16px"><div><h2 style="font-size:1.5rem">Выберите поколение и вариант салона</h2><p>Комплектация влияет на выкройку: деление спинки, подлокотник, подголовники.</p></div></div>
      <div class="gens">${f.items.map(x => `<a class="gen" href="${A.URL.pos(x)}"><img src="${A.posPhoto(x)}" alt="" loading="lazy"><div><b>${e(full)} ${e(x.g || "")}</b><span>${e(x.v || "Все версии салона")}</span><span>${e(x.y || "все годы")}</span><div class="price"><small>готовые</small>от ${A.fmt(x.p[0])}</div></div></a>`).join("")}</div>
      <div class="section__head" style="margin:clamp(32px,3vw,48px) 0 16px"><div><h2 style="font-size:1.5rem">Готовые чехлы на ${e(full)} ${e(f.items[0].g || "")}</h2><p>Самое свежее поколение в каталоге. Для других кузовов выберите лекало выше.</p></div><a class="link" href="${A.URL.pos(f.items[0])}">Все варианты ${A.ICON.arrow}</a></div>
      <div class="grid">${A.VARIANTS.slice(0, 4).map(v => A.coverCard(f.items[0], v)).join("")}</div>
      <div class="grid" style="margin-top:var(--gap)">${A.customCard(f.items[0], true)}</div>`;
  } else {
    /* --- лекало: готовые чехлы + плашка индивидуального пошива --- */
    const name = A.carName(m), sub = [m.v, m.y].filter(Boolean).join(", ");
    document.title = `Чехлы на сиденья ${name}${m.y ? " (" + m.y + ")" : ""} — купить, цена от ${A.fmt(m.p[0])} | Автостиль`;
    document.querySelector('meta[name="description"]').content = `Модельные чехлы на сиденья ${name}${sub ? ", " + sub : ""}: жаккард ${A.fmt(m.p[0])}, экокожа ${A.fmt(m.p[1])}, алькантара ${A.fmt(m.p[2])}. Пошив за 1 день, молнии под Airbag, доставка по России, установка в Москве.`;
    document.querySelector('link[rel="canonical"]').href = `https://1avtochehol.ru/avto/${m.s}/`;
    document.getElementById("c-h1").innerHTML = `Чехлы на сиденья ${e(name)}${sub ? ` <span class="muted" style="font-weight:600">${e(sub)}</span>` : ""}`;
    document.getElementById("c-meta").innerHTML = `<span class="stars">★★★★★</span><span><b>4,9</b> · ${12 + (m.s.length * 7) % 40} отзывов</span><span>Жаккард <b>${A.fmt(m.p[0])}</b></span><span>Экокожа <b>${A.fmt(m.p[1])}</b></span><span>Алькантара <b>${A.fmt(m.p[2])}</b></span>`;
    document.getElementById("c-side-custom").href = A.URL.custom(m);
    const MATS = [["all", "Все", A.VARIANTS.length], ["1", "Экокожа", 0], ["2", "Алькантара", 0], ["0", "Жаккард", 0]];
    MATS.forEach(x => { if (x[0] !== "all") x[2] = A.VARIANTS.filter(v => String(v.mat) === x[0]).length; });
    main.innerHTML = strip + `<div class="toolbar"><div class="chips" id="c-mat">${MATS.map((x, i) => `<button type="button" class="chip${i ? "" : " is-selected"}" data-mat="${x[0]}">${x[1]} <small>${x[2]}</small></button>`).join("")}</div><select class="select" id="c-sort" aria-label="Сортировка"><option value="pop">Сначала популярные</option><option value="asc">Сначала дешевле</option><option value="desc">Сначала дороже</option></select></div>
      <div class="grid" id="c-grid" style="grid-auto-flow:dense"></div>
      <section class="section section--tight" data-tabs>
        <div class="tabs"><button class="is-active" data-tab="kit">Что входит</button><button data-tab="spec">Лекало и салон</button><button data-tab="install">Установка</button><button data-tab="faq">Вопросы</button></div>
        <div class="tab-pane is-active" data-pane="kit"><div class="includes"><div>${A.ICON.check}Чехлы на 2 передних сиденья</div><div>${A.ICON.check}Задняя спинка и подушка</div><div>${A.ICON.check}Чехлы на все подголовники</div><div>${A.ICON.check}Молнии-разрывники под Airbag</div><div>${A.ICON.check}Крепёж: стяжки, крючки, липучки</div><div>${A.ICON.check}Оплётка на руль в подарок</div></div></div>
        <div class="tab-pane" data-pane="spec"><dl class="spec"><div><dt>Марка и модель</dt><dd>${e(b.n + " " + f.n)}</dd></div><div><dt>Поколение, кузов</dt><dd>${e(m.g || "—")}</dd></div><div><dt>Вариант салона</dt><dd>${e(m.v || "стандартный")}</dd></div><div><dt>Годы выпуска</dt><dd>${e(m.y || "все годы")}</dd></div><div><dt>Срок пошива</dt><dd>1 день · индивидуальный 3 дня</dd></div><div><dt>Гарантия посадки</dt><dd>12 месяцев</dd></div></dl></div>
        <div class="tab-pane" data-pane="install"><div class="prose"><p>Установка занимает 1,5–2 часа без инструмента: снимите подголовники, наденьте чехлы на спинки, проведите стяжки через зазор и зацепите крючки под сиденьем. Пошаговая инструкция — <a href="info-install.html">в разделе для клиентов</a>.</p><p>В Москве ставим в мастерской на Полярной за 2 500 ₽, пока вы ждёте в шоуруме.</p></div></div>
        <div class="tab-pane" data-pane="faq"><div class="faq" style="grid-template-columns:1fr"><div class="faq__list"><details open><summary>Подойдут ли чехлы на мою комплектацию ${e(name)}?</summary><p>Лекало снято с сидений ${e(name)}${m.v ? " (" + e(m.v) + ")" : ""}. Если в вашем салоне другое деление спинки или нет подлокотника — выберите соседний вариант слева или пришлите фото, подберём.</p></details><details><summary>Чем готовые чехлы отличаются от индивидуальных?</summary><p>Готовые — проверенные сочетания цветов, шьём за 1 день. Индивидуальные собираются в конструкторе: любые цвета, строчка и нить, срок 3 дня.</p></details><details><summary>Сработают ли подушки безопасности?</summary><p>Да, в спинках передних сидений вшиты молнии-разрывники.</p></details></div></div></div>
      </section>
      <section class="section section--tight"><div class="seo"><h2>Чехлы на сиденья ${e(name)} от производителя</h2><p>Комплект для ${e(name)}${m.y ? " " + e(m.y) : ""} шьётся по лекалу, снятому с сидений реального автомобиля. Чехлы повторяют форму боковой поддержки, учитывают подголовники, подлокотник и подушки безопасности в спинках.</p><p>Готовые комплекты: жаккард — ${A.fmt(m.p[0])}, экокожа — ${A.fmt(m.p[1])}, экокожа с алькантарой — ${A.fmt(m.p[2])}. Пошив за 1 день, доставка в 6 000 городов, оплата при получении. Свой дизайн можно собрать в конструкторе индивидуального пошива.</p></div></section>`;
    const grid = document.getElementById("c-grid");
    let mat = "all", sort = "pop";
    function render() {
      let list = A.VARIANTS.filter(v => mat === "all" || String(v.mat) === mat);
      if (sort === "asc") list = list.slice().sort((x, y) => A.priceOf(m, x) - A.priceOf(m, y));
      if (sort === "desc") list = list.slice().sort((x, y) => A.priceOf(m, y) - A.priceOf(m, x));
      const cards = list.map(v => A.coverCard(m, v));
      cards.splice(Math.min(6, cards.length), 0, A.customCard(m, true));
      grid.innerHTML = cards.join("");
      A.badges();
    }
    document.getElementById("c-mat").addEventListener("click", ev => { const btn = ev.target.closest("[data-mat]"); if (!btn) return; mat = btn.dataset.mat; document.querySelectorAll("#c-mat .chip").forEach(c => c.classList.toggle("is-selected", c === btn)); render(); });
    document.getElementById("c-sort").addEventListener("change", ev => { sort = ev.target.value; render(); });
    render();
    document.querySelectorAll("[data-tabs]").forEach(box => { const btns = box.querySelectorAll("[data-tab]"), panes = box.querySelectorAll("[data-pane]"); btns.forEach(bt => bt.addEventListener("click", () => { btns.forEach(x => x.classList.toggle("is-active", x === bt)); panes.forEach(p => p.classList.toggle("is-active", p.dataset.pane === bt.dataset.tab)); })); });
  }
  A.badges();
})();
