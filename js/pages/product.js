/* Карточка товара: готовые чехлы на модель (?m=&v=) или аксессуар (?p=) */
(function () {
  const A = window.AS, e = A.esc, root = document.getElementById("p-root");
  document.body.classList.add("has-sticky");
  const ADDONS = [
    { id: "mats", name: "Коврики EVA в цвет чехлов", sub: "Комплект в салон, −15 % с чехлами", add: 3900 },
    { id: "armrest", name: "Чехол на задний подлокотник", sub: "Из того же материала", add: 600 },
    { id: "install", name: "Установка в Москве", sub: "Мастерская на Полярной, 1,5 часа", add: 2500 }
  ];
  const deliveryDate = d => { const t = new Date(); t.setDate(t.getDate() + d); return t.toLocaleDateString("ru-RU", { day: "numeric", month: "long" }); };
  const infoBlock = (ship) => `<div class="buybox__info">
      <div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h11v10H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg><div>Доставка в <b data-city-name>${e(window.AS_city ? window.AS_city() : "Москва")}</b><span>СДЭК, Boxberry, Почта · от 10 000 ₽ бесплатно</span></div><em>с ${deliveryDate(ship + 2)}</em></div>
      <div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg><div>Самовывоз в Москве<span>Производство на Полярной, 9:00–21:00</span></div><em>${deliveryDate(ship)}</em></div>
      <div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg><div>Оплата при получении<span>Или картой онлайн со скидкой 3 %</span></div><em>−3 %</em></div>
      <div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z"/><path d="m9 12 2 2 4-4"/></svg><div>Гарантия 12 месяцев<span>Не подошли по посадке — перешьём бесплатно</span></div><em>14 дней</em></div>
    </div>`;
  const gallery = (imgs, tags) => `<div class="gallery" data-gallery><div class="gallery__thumbs">${imgs.map((src, i) => `<button type="button" class="${i ? "" : "is-active"}" data-thumb="${src}" aria-label="Фото ${i + 1}"><img src="${src}" alt="" loading="lazy"></button>`).join("")}</div><div class="gallery__main"><img id="p-main" src="${imgs[0]}" alt="" width="900" height="900">${tags}</div></div>`;
  function bindGallery() {
    const main = document.getElementById("p-main");
    document.querySelectorAll("[data-thumb]").forEach(t => t.addEventListener("click", () => { document.querySelectorAll("[data-thumb]").forEach(x => x.classList.toggle("is-active", x === t)); main.style.opacity = 0; setTimeout(() => { main.src = t.dataset.thumb; main.onload = () => main.style.opacity = 1; }, 100); }));
  }
  const perks = items => `<ul class="buy-panel__perks">${items.map(t => `<li>${A.ICON.check}${t}</li>`).join("")}</ul>`;
  const panel = (price, ready, cta, list) => `<div class="buy-panel" id="p-panel"><div class="buy-panel__row">${price}${ready}</div>${cta}${perks(list)}</div>`;
  function bindSticky() {
    const cta = document.querySelector(".buybox__cta"), bar = document.querySelector(".sticky-cta");
    if (!cta || !bar || !("IntersectionObserver" in window)) return;
    new IntersectionObserver(([en]) => document.body.classList.toggle("cta-away", !en.isIntersecting), { rootMargin: "-60px 0px 0px 0px" }).observe(cta);
  }
  const tabsBox = document.getElementById("p-tabs");
  function bindTabs() { const btns = tabsBox.querySelectorAll("[data-tab]"), panes = tabsBox.querySelectorAll("[data-pane]"); btns.forEach(b => b.addEventListener("click", () => { btns.forEach(x => x.classList.toggle("is-active", x === b)); panes.forEach(p => p.classList.toggle("is-active", p.dataset.pane === b.dataset.tab)); })); }

  const pid = A.qs("p");
  if (pid) {
    /* --- аксессуар --- */
    const p = (window.AS_PRODUCTS || []).find(x => x.id === pid) || window.AS_PRODUCTS[0];
    const CAT = { capes: ["Накидки", "capes.html"], mats: ["Коврики EVA", "mats.html"], wheel: ["Оплётки на руль", "wheel.html"], fabrics: ["Экокожа оптом", "fabrics.html"] }[p.cat] || ["Каталог", "catalog.html"];
    document.title = p.title + " — купить, цена " + A.fmt(p.price) + " | Автостиль";
    document.getElementById("p-crumbs").insertAdjacentHTML("beforeend", `<li><a href="${CAT[1]}">${CAT[0]}</a></li><li>${e(p.title)}</li>`);
    const same = window.AS_PRODUCTS.filter(x => x.cat === p.cat && x.id !== p.id);
    const imgs = [p.img].concat(same.slice(0, 3).map(x => x.img));
    root.innerHTML = gallery(imgs, p.tag ? `<div class="card__tags"><span class="card__tag${p.tag === "Акция" ? " card__tag--sale" : ""}">${p.tag}</span></div>` : "") + `<div class="buybox">
      <h1>${e(p.title)}</h1>
      <div class="buybox__meta">${p.rating ? `<span class="stars">★★★★★</span><span><b>4,9</b> · ${p.rating} отзывов</span>` : ""}<span>Артикул <b>AS-${p.id.toUpperCase()}</b></span><span>${e(p.sub || "")}</span></div>
      ${panel(`<div class="buybox__price"><div class="price">${A.fmt(p.price)}${p.old ? `<s>${A.fmt(p.old)}</s>` : ""}</div>${p.old ? `<span class="calc__savings">−${A.fmt(p.old - p.price)}</span>` : `<span class="muted small">${e(p.note || "за комплект")}</span>`}</div>`,
        `<div class="buy-panel__ready"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg><div><b>В наличии</b><span>отправим сегодня до 15:00</span></div></div>`,
        `<div class="buybox__cta"><button class="btn btn--primary btn--lg" type="button" data-add="product:${p.id}">В корзину</button><button class="btn btn--dark btn--lg" type="button" data-add="product:${p.id}" data-add-go>Купить в 1 клик</button><button class="btn btn--ghost btn--lg btn--icon" type="button" data-fav="product:${p.id}" aria-label="В избранное">${A.ICON.heart}</button></div>`,
        ["Оплата при получении", "Гарантия 12 месяцев", "Возврат 14 дней"])}
      ${p.cat === "mats" ? `<div class="opt-block" data-picker><h4>Ваш автомобиль</h4><div class="calc__grid"><select class="select" data-pick-brand></select><select class="select" data-pick-fam disabled></select></div></div>` : ""}
      ${infoBlock(0)}
    </div>`;
    tabsBox.innerHTML = `<div class="tabs"><button class="is-active" data-tab="d">Описание</button><button data-tab="s">Характеристики</button></div><div class="tab-pane is-active" data-pane="d"><div class="prose"><p>${e(p.title)}. ${e(p.sub || "")}. Производство «Автостиль», гарантия 12 месяцев, возврат 14 дней.</p></div></div><div class="tab-pane" data-pane="s"><dl class="spec"><div><dt>Категория</dt><dd>${CAT[0]}</dd></div><div><dt>Артикул</dt><dd>AS-${p.id.toUpperCase()}</dd></div><div><dt>Наличие</dt><dd>На складе в Москве</dd></div><div><dt>Гарантия</dt><dd>12 месяцев</dd></div></dl></div>`;
    document.getElementById("p-more-title").textContent = "Похожие товары";
    document.getElementById("p-more-link").href = CAT[1]; document.getElementById("p-more-link").textContent = "Весь раздел";
    document.getElementById("p-more").innerHTML = same.slice(0, 5).map(A.productCard).join("");
    document.getElementById("p-sticky-name").textContent = p.sub || CAT[0]; document.getElementById("p-sticky-price").textContent = A.fmt(p.price);
    document.getElementById("p-sticky-btn").setAttribute("data-add", "product:" + p.id);
    document.getElementById("p-sticky-img").src = p.img; document.getElementById("p-sticky-title").textContent = p.title;
    const sb = document.getElementById("p-sticky-buy"); sb.setAttribute("data-add", "product:" + p.id); sb.setAttribute("data-add-go", "");
    document.querySelectorAll("[data-picker]").forEach(x => A.initPicker(x));
    bindGallery(); bindTabs(); bindSticky(); A.badges();
    return;
  }

  /* --- готовые чехлы на модель --- */
  let m = A.BY_SLUG[A.qs("m")] || A.BY_SLUG["toyota_camry-xv70"], v = A.VAR[A.qs("v")] || A.VARIANTS[0];
  const f = A.FAMILIES[m.f], b = A.BRAND[m.b];
  const addons = new Set();
  const title = () => `Чехлы на сиденья ${A.carName(m)}, ${v.name.toLowerCase()}`;
  const total = () => A.priceOf(m, v) + [...addons].reduce((s, id) => s + ADDONS.find(a => a.id === id).add, 0);
  const cartId = () => `cover:${m.s}:${v.id}`;
  document.title = `${title()} — ${A.fmt(A.priceOf(m, v))} | Автостиль`;
  document.querySelector('meta[name="description"]').content = `${title()}${m.y ? " (" + m.y + ")" : ""}. Цена ${A.fmt(A.priceOf(m, v))} за комплект на весь салон, пошив за 1 день, молнии под Airbag, доставка по России, установка в Москве.`;
  document.getElementById("p-crumbs").insertAdjacentHTML("beforeend", `<li><a href="catalog.html">Авточехлы на модель</a></li><li><a href="${A.URL.brand(b.id)}">${e(b.n)}</a></li><li><a href="${A.URL.fam(f)}">${e(f.n)}</a></li>${f.items.length > 1 ? `<li><a href="${A.URL.pos(m)}">${e([m.g, m.v].filter(Boolean).join(", ") || m.y)}</a></li>` : ""}<li>${e(v.name)}</li>`);
  const imgs = [A.varPhoto(v), "assets/photos/seat6.jpg", "assets/photos/2p.jpg", "assets/photos/avtochehol2.jpg", A.posPhoto(m)].filter((x, i, a) => a.indexOf(x) === i).slice(0, 5);
  const matVariants = mat => A.VARIANTS.filter(x => x.mat === mat);
  root.innerHTML = gallery(imgs, `<div class="card__tags">${v.tag ? `<span class="card__tag${v.tag === "Премиум" ? " card__tag--dark" : ""}">${v.tag}</span>` : ""}<span class="card__tag card__tag--white">Фото реального комплекта</span></div>`) + `<div class="buybox">
    <h1>${e(title())}</h1>
    <div class="buybox__meta"><span class="stars">★★★★★</span><span><b>4,9</b> · ${12 + (m.s.length * 7) % 40} отзывов</span><span>Артикул <b>AS-${e(m.s.toUpperCase().replace(/[^A-Z0-9]+/g, "-"))}-${v.id.toUpperCase()}</b></span>${m.y ? `<span>${e(m.y)}</span>` : ""}</div>
    ${panel(`<div class="buybox__price"><div class="price" id="p-total">${A.fmt(total())}</div><span class="muted small">за комплект<br>на весь салон</span></div>`,
      `<div class="buy-panel__ready"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg><div><b>Сошьём за 1 день</b><span>отправим ${deliveryDate(1)}</span></div></div>`,
      `<div class="buybox__cta"><button class="btn btn--primary btn--lg" type="button" id="p-add">В корзину</button><button class="btn btn--dark btn--lg" type="button" id="p-buy">Купить в 1 клик</button><button class="btn btn--ghost btn--lg btn--icon" type="button" data-fav="${cartId()}" aria-label="В избранное">${A.ICON.heart}</button></div>`,
      ["Оплата при получении", "Молнии под Airbag", "Гарантия 12 месяцев"])}
    <div class="opt-block"><h4>Поколение и салон <b>${e(A.genName(m))}</b></h4><select class="select" id="p-gen">${f.items.map(x => `<option value="${x.s}" ${x.s === m.s ? "selected" : ""}>${e([x.g, x.v].filter(Boolean).join(", ") || x.m)}${x.y ? " · " + e(x.y) : ""}</option>`).join("")}</select></div>
    <div class="opt-block"><h4>Материал</h4><div class="seg">${[1, 2, 0].map(mt => `<a href="${A.URL.product(m, matVariants(mt)[0])}" class="${v.mat === mt ? "is-selected" : ""}">${A.MAT_NAME[mt].replace("Экокожа + алькантара", "Алькантара")}<small>${A.fmt(m.p[mt])}</small></a>`).join("")}</div></div>
    <div class="opt-block"><h4>Цвет <b>${e(v.name.split(", ").slice(1).join(", "))}</b></h4><div class="variants">${matVariants(v.mat).map(x => `<a class="variant${x.id === v.id ? " is-active" : ""}" href="${A.URL.product(m, x)}" title="${e(x.name)}"><img src="${A.varPhoto(x)}" alt="${e(x.name)}" loading="lazy"></a>`).join("")}</div></div>
    <div class="opt-block"><h4>Дополнительно</h4><div class="addons">${ADDONS.map(a => `<label class="toggle"><div><b>${a.name}</b><span>${a.sub}</span></div><span class="tp">+ ${A.fmt(a.add)}</span><input type="checkbox" data-addon="${a.id}"><i class="sw"></i></label>`).join("")}</div></div>
    <a class="buybox__custom" href="${A.URL.custom(m)}"><img src="assets/photos/avtochehol1.jpg" alt=""><div><b>Нужен другой цвет или строчка?</b><span>Соберите дизайн в конструкторе — пошив 3 дня</span></div>${A.ICON.arrow}</a>
    ${infoBlock(1)}
  </div>`;
  document.getElementById("p-gen").addEventListener("change", ev => { location.href = A.URL.product(A.BY_SLUG[ev.target.value], v); });
  const upd = () => { document.getElementById("p-total").textContent = A.fmt(total()); document.getElementById("p-sticky-price").textContent = A.fmt(total()); };
  document.querySelectorAll("[data-addon]").forEach(i => i.addEventListener("change", () => { i.checked ? addons.add(i.dataset.addon) : addons.delete(i.dataset.addon); upd(); }));
  const add = go => {
    const extra = [...addons].map(id => ADDONS.find(a => a.id === id).name);
    A.Cart.add({ id: cartId() + (extra.length ? ":" + [...addons].sort().join("+") : ""), title: `Чехлы на ${A.carName(m)}`, sub: `${v.name} · ${m.y || "все годы"} · пошив 1 день${extra.length ? " · " + extra.join(", ") : ""}`, price: total(), img: A.varPhoto(v), url: location.pathname.split("/").pop() + location.search });
    if (go) location.href = "cart.html"; else A.toast("Добавлено в корзину", ["Перейти", "cart.html"]);
  };
  document.getElementById("p-add").addEventListener("click", () => add(false));
  document.getElementById("p-buy").addEventListener("click", () => add(true));
  document.getElementById("p-sticky-btn").addEventListener("click", () => add(false));
  document.getElementById("p-sticky-name").textContent = A.genName(m) + " · " + v.name.toLowerCase();
  document.getElementById("p-sticky-title").textContent = "Чехлы на " + A.carName(m);
  document.getElementById("p-sticky-img").src = A.varPhoto(v);
  document.getElementById("p-sticky-buy").addEventListener("click", () => add(true));
  upd();
  tabsBox.innerHTML = `<div class="tabs"><button class="is-active" data-tab="d">Описание</button><button data-tab="s">Характеристики</button><button data-tab="k">Комплект</button><button data-tab="i">Установка</button><button data-tab="r">Отзывы</button></div>
    <div class="tab-pane is-active" data-pane="d"><div class="prose"><p>Готовый комплект чехлов на ${e(A.carName(m))}${m.v ? " (" + e(m.v) + ")" : ""}, ${e(v.name.toLowerCase())}. Шьётся по лекалу, снятому с сидений этого кузова: повторяет форму боковой поддержки, учитывает подголовники, подлокотник и подушки безопасности.</p><h3>Почему сядут как штатная обивка</h3><ul><li>Лекало под конкретное поколение и вариант салона</li><li>Прорези под ремни, Isofix, подлокотник и ручки регулировки</li><li>Поролон 5 мм под лицевым материалом — чехол не «гуляет»</li><li>Стяжки и крючки под сиденьем: не сползает через год</li></ul></div></div>
    <div class="tab-pane" data-pane="s"><dl class="spec"><div><dt>Автомобиль</dt><dd>${e(A.carName(m))}</dd></div><div><dt>Вариант салона</dt><dd>${e(m.v || "стандартный")}</dd></div><div><dt>Годы выпуска</dt><dd>${e(m.y || "все годы")}</dd></div><div><dt>Материал</dt><dd>${A.MAT_NAME[v.mat]}</dd></div><div><dt>Цвет</dt><dd>${e(v.name.split(", ").slice(1).join(", "))}</dd></div><div><dt>Срок пошива</dt><dd>1 рабочий день</dd></div><div><dt>Молнии под Airbag</dt><dd>Есть</dd></div><div><dt>Гарантия</dt><dd>12 месяцев</dd></div></dl></div>
    <div class="tab-pane" data-pane="k"><div class="includes"><div>${A.ICON.check}Чехлы на 2 передних сиденья</div><div>${A.ICON.check}Задняя спинка и подушка</div><div>${A.ICON.check}Чехлы на все подголовники</div><div>${A.ICON.check}Молнии-разрывники под Airbag</div><div>${A.ICON.check}Крепёж: стяжки, крючки, липучки</div><div>${A.ICON.check}Оплётка на руль в подарок</div></div></div>
    <div class="tab-pane" data-pane="i"><div class="prose"><p>Установка 1,5–2 часа без инструмента, видеоинструкция для ${e(f.n)} приходит вместе с заказом. Подробно — <a href="info-install.html">в инструкции</a>. В Москве ставим на Полярной за 2 500 ₽.</p></div></div>
    <div class="tab-pane" data-pane="r"><div class="reviews"><article class="review"><div class="review__head"><div class="avatar">ИВ</div><div><b>Игорь В.</b><span>Самара · месяц назад</span></div><span class="stars">★★★★★</span></div><p>Взял этот вариант на ${e(f.n)}. Сели ровно, швы аккуратные, через неделю после установки ни одной складки.</p></article><article class="review"><div class="review__head"><div class="avatar">ОП</div><div><b>Ольга П.</b><span>Москва · 2 месяца назад</span></div><span class="stars">★★★★★</span></div><p>Забрала на Полярной на следующий день и сразу поставили. Удобно, что всё в одном месте.</p></article></div></div>`;
  document.getElementById("p-more-title").textContent = `Другие готовые чехлы на ${A.carName(m)}`;
  document.getElementById("p-more-link").href = A.URL.pos(m); document.getElementById("p-more-link").innerHTML = "Все варианты " + A.ICON.arrow;
  document.getElementById("p-more").innerHTML = A.VARIANTS.filter(x => x.id !== v.id).slice(0, 5).map(x => A.coverCard(m, x)).join("");
  bindGallery(); bindTabs(); bindSticky(); A.badges();
})();
