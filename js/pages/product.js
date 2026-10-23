/* Карточка товара: чехлы на модель (?m=&v=) или аксессуар (?p=). Сроки, оплата, доставка и гарантия — по старому сайту 1avtochehol.ru */
(function () {
  const A = window.AS, e = A.esc, root = document.getElementById("p-root");
  document.body.classList.add("has-sticky");
  const IC = {
    gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>',
    truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h11v10H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z"/><path d="m9 12 2 2 4-4"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>'
  };
  const infoBlock = () => `<div class="buybox__info">
      <div>${IC.truck}<div>Доставка в <b data-city-name>${e(window.AS_city ? window.AS_city() : "ваш город")}</b><span>DPD, EMS Почта России · по тарифу транспортной компании</span></div><em>от 250 ₽</em></div>
      <div>${IC.pin}<div>Самовывоз в Новосибирске<span>ул. Бориса Богаткова 253/2, оф. 116</span></div><em></em></div>
      <div>${IC.card}<div>Предоплата от 1 000 ₽<span>Картой онлайн или по QR-коду, комиссия 0 %. Остаток — при получении, где доступен наложенный платёж</span></div><em></em></div>
      <div>${IC.shield}<div>Гарантия на качество пошива<span>При соблюдении правил ухода. Если товар не подойдёт — вернём деньги</span></div><em>1 год</em></div>
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
    const CAT = { fabrics: ["Экокожа оптом", "fabrics.html"] }[p.cat] || ["Каталог", "catalog.html"];
    document.title = p.title + " | Автостиль";
    document.getElementById("p-crumbs").insertAdjacentHTML("beforeend", `<li><a href="${CAT[1]}">${CAT[0]}</a></li><li>${e(p.title)}</li>`);
    const same = window.AS_PRODUCTS.filter(x => x.cat === p.cat && x.id !== p.id);
    const imgs = [p.img].concat(same.slice(0, 3).map(x => x.img));
    const ask = `<div class="buybox__cta"><a class="btn btn--primary btn--lg" href="contacts.html#form">Оставить заявку</a><a class="btn btn--dark btn--lg" href="tel:88007753260">8 (800) 775-32-60</a><button class="btn btn--ghost btn--lg btn--icon" type="button" data-fav="product:${p.id}" aria-label="В избранное">${A.ICON.heart}</button></div>`;
    const giftCta = `<div class="buybox__cta"><a class="btn btn--primary btn--lg" href="catalog.html">Выбрать чехлы</a><a class="btn btn--dark btn--lg" href="tel:88007753260">8 (800) 775-32-60</a><button class="btn btn--ghost btn--lg btn--icon" type="button" data-fav="product:${p.id}" aria-label="В избранное">${A.ICON.heart}</button></div>`;
    root.innerHTML = gallery(imgs, p.gift ? `<div class="card__tags"><span class="card__tag card__tag--sale">Акция</span></div>` : "") + `<div class="buybox">
      <h1>${e(p.title)}</h1>
      <div class="buybox__meta"><span>${e(p.sub || "")}</span></div>
      ${panel(`<div class="buybox__price">${window.AS_accPrice(p)}</div>`,
        `<div class="buy-panel__ready">${IC.phone}<div><b>${p.gift ? "Подробности акции" : "Наличие и стоимость"}</b><span>уточнит менеджер</span></div></div>`,
        p.gift ? giftCta : ask,
        ["Бесплатный звонок по России", "Заявки через сайт — круглосуточно"])}
      
      ${infoBlock()}
    </div>`;
    tabsBox.innerHTML = `<div class="tabs"><button class="is-active" data-tab="d">Описание</button><button data-tab="s">Характеристики</button></div><div class="tab-pane is-active" data-pane="d"><div class="prose"><p>${e(p.title)}. ${e(p.sub || "")}.</p><p>${p.demo ? "Позиция приведена как пример. Точный ассортимент, наличие и стоимость сообщит менеджер по телефону 8 (800) 775-32-60." : p.gift ? "Оплётка руля в цвет салона — в подарок к комплекту чехлов." : "Наличие и стоимость для вашего автомобиля сообщит менеджер по телефону 8 (800) 775-32-60."}</p></div></div><div class="tab-pane" data-pane="s"><dl class="spec"><div><dt>Категория</dt><dd>${CAT[0]}</dd></div><div><dt>Наличие</dt><dd>уточняйте у менеджера</dd></div><div><dt>Цена</dt><dd>${p.gift ? "в подарок к комплекту чехлов" : "по запросу"}</dd></div></dl></div>`;
    document.getElementById("p-more-title").textContent = "Ещё в разделе";
    document.getElementById("p-more-link").href = CAT[1]; document.getElementById("p-more-link").textContent = "Весь раздел";
    document.getElementById("p-more").innerHTML = same.slice(0, 5).map(A.productCard).join("");
    document.getElementById("p-sticky-name").textContent = p.sub || CAT[0]; document.getElementById("p-sticky-price").textContent = p.gift ? "В подарок" : "Цена по запросу";
    const sbtn = document.getElementById("p-sticky-btn"); sbtn.textContent = p.gift ? "Выбрать чехлы" : "Оставить заявку"; sbtn.addEventListener("click", () => { location.href = p.gift ? "catalog.html" : "contacts.html#form"; });
    document.getElementById("p-sticky-img").src = p.img; document.getElementById("p-sticky-title").textContent = p.title;
    document.getElementById("p-sticky-buy").hidden = true;
    document.querySelectorAll("[data-picker]").forEach(x => A.initPicker(x));
    bindGallery(); bindTabs(); bindSticky(); A.badges();
    return;
  }

  /* --- чехлы на модель: стандартное сочетание материала и цвета --- */
  let m = A.BY_SLUG[A.qs("m")] || A.BY_SLUG["toyota_camry-xv70"], v = A.VAR[A.qs("v")] || A.VARIANTS[0];
  const f = A.FAMILIES[m.f], b = A.BRAND[m.b];
  const opt = { mats: false, install: false };
  const title = () => `Чехлы на сиденья ${A.carName(m)}, ${v.name.toLowerCase()}`;
  const total = () => A.priceOf(m, v);
  const cartId = () => `cover:${m.s}:${v.id}`;
  document.title = `${title()} — ${A.fmt(A.priceOf(m, v))} | Автостиль`;
  document.querySelector('meta[name="description"]').content = `${title()}${m.y ? " (" + m.y + ")" : ""}. Цена ${A.fmt(A.priceOf(m, v))} за комплект на весь салон. Пошив по заводскому лекалу, разрывные швы под Airbag, доставка по России, гарантия на пошив 1 год.`;
  document.getElementById("p-crumbs").insertAdjacentHTML("beforeend", `<li><a href="catalog.html">Модельные авточехлы</a></li><li><a href="${A.URL.brand(b.id)}">${e(b.n)}</a></li><li><a href="${A.URL.fam(f)}">${e(f.n)}</a></li>${f.items.length > 1 ? `<li><a href="${A.URL.pos(m)}">${e([m.g, m.v].filter(Boolean).join(", ") || m.y)}</a></li>` : ""}<li>${e(v.name)}</li>`);
  const imgs = A.varPhotos(v).slice(0, 5);
  const matVariants = mat => A.VARIANTS.filter(x => x.mat === mat);
  const gift = `<div class="buy-panel__gift">${IC.gift}<span><b>Оплётка руля в цвет салона</b> — в подарок к чехлам</span></div>`;
  root.innerHTML = gallery(imgs, `<div class="card__tags">${v.tag ? `<span class="card__tag">${v.tag}</span>` : ""}<span class="card__tag card__tag--white">Фото наших работ</span></div>`) + `<div class="buybox">
    <h1>${e(title())}</h1>
    <div class="buybox__meta"><span>Вариант <b>${e(v.label)}</b></span>${m.y ? `<span>${e(m.y)}</span>` : ""}<a class="link" href="reviews.html">Отзывы покупателей</a></div>
    ${panel(`<div class="buybox__price">${A.priceHtml(m, v, ' id="p-total"')}<span class="muted small">за комплект<br>на весь салон</span></div>`,
      "",
      `<div class="buybox__cta"><button class="btn btn--primary btn--lg" type="button" id="p-add">В корзину</button><button class="btn btn--dark btn--lg" type="button" id="p-buy">Купить в 1 клик</button><button class="btn btn--ghost btn--lg btn--icon" type="button" data-fav="${cartId()}" aria-label="В избранное">${A.ICON.heart}</button></div>${gift}`,
      ["Онлайн-оплата", "Оплата при получении", "Доставка в пункт выдачи", "Гарантия на пошив 1 год"])}
    <div class="opt-block"><h4>Вариант <b>${e(v.label)}</b></h4><div class="colors">${matVariants(v.mat).map(x => `<a class="color-chip${x.id === v.id ? " is-active" : ""}" href="${A.URL.product(m, x)}" title="${e(x.label)}"><i style="${window.AS_colorDot(x.colors)}"></i><span>${e(x.label)}</span></a>`).join("")}</div>
      <details class="color-select" data-color-select><summary><i style="${window.AS_colorDot(v.colors)}"></i><span>${e(v.label)}</span></summary><div class="color-select__list">${matVariants(v.mat).map(x => `<a class="${x.id === v.id ? "is-active" : ""}" href="${A.URL.product(m, x)}"><i style="${window.AS_colorDot(x.colors)}"></i>${e(x.label)}</a>`).join("")}</div></details></div>
    <div class="opt-block"><h4>Материал</h4><div class="seg">${[1, 2, 0].filter(mt => matVariants(mt).length).map(mt => `<a href="${A.URL.product(m, matVariants(mt)[0])}" class="${v.mat === mt ? "is-selected" : ""}">${A.MAT_NAME[mt].replace("Экокожа + алькантара", "Алькантара")}<small>от ${A.fmt(Math.min(...matVariants(mt).map(x => A.priceOf(m, x))))}</small></a>`).join("")}</div></div>
    <a class="buybox__custom" href="${A.URL.custom(m)}"><b>Не нашли свой цвет?</b><span>Соберите комплект в конструкторе — сошьём чехлы по вашему дизайну.</span><span class="btn btn--dark">Открыть конструктор</span></a>
    <div class="opt-block"><h4>Дополнительно к заказу</h4><div class="addons">
      <label class="toggle"><div><b>Автоковрики EVA в цвет чехлов</b><span>Добавим к заказу, стоимость уточнит менеджер</span></div><span class="tp">по запросу</span><input type="checkbox" data-opt="mats"><i class="sw"></i></label>
      <label class="toggle"><div><b>Установка в вашем городе</b><span>Найдём установщика в вашем городе, стоимость уточнит менеджер</span></div><span class="tp">по запросу</span><input type="checkbox" data-opt="install"><i class="sw"></i></label>
    </div></div>
    ${infoBlock()}
  </div>`;
  /* выпадающий список цвета (мобильные): закрыть по клику мимо */
  document.addEventListener("click", ev => { const d = document.querySelector("[data-color-select][open]"); if (d && !d.contains(ev.target)) d.open = false; });
  const upd = () => { const pt = document.getElementById("p-total"); pt.querySelector(".price__now").textContent = A.fmt(total()); document.getElementById("p-sticky-price").textContent = A.fmt(total()); };
  document.querySelectorAll("[data-opt]").forEach(i => i.addEventListener("change", () => { opt[i.dataset.opt] = i.checked; }));
  const add = go => {
    const extra = (opt.mats ? ["+ автоковрики EVA в цвет чехлов (по запросу)"] : []).concat(opt.install ? ["+ установка в вашем городе (по запросу)"] : []);
    A.Cart.add({ id: cartId() + (opt.mats ? ":mats" : "") + (opt.install ? ":install" : ""), title: `Чехлы на ${A.carName(m)}`, sub: `${v.name} · ${m.y || "все годы"}${extra.length ? " · " + extra.join(", ") : ""}`, price: total(), img: A.varPhoto(v), url: location.pathname.split("/").pop() + location.search, model: m.s, opts: { ...opt } });
    if (go) location.href = "cart.html"; else A.toast("Добавлено в корзину", ["Перейти", "cart.html"]);
  };
  document.getElementById("p-add").addEventListener("click", () => add(false));
  document.getElementById("p-buy").addEventListener("click", () => add(true));
  document.getElementById("p-sticky-btn").addEventListener("click", () => add(false));
  document.getElementById("p-sticky-name").textContent = A.genName(m) + " · " + v.label.toLowerCase();
  document.getElementById("p-sticky-title").textContent = "Чехлы на " + A.carName(m);
  document.getElementById("p-sticky-img").src = A.varPhoto(v);
  document.getElementById("p-sticky-buy").addEventListener("click", () => add(true));
  upd();
  tabsBox.innerHTML = `<div class="tabs"><button class="is-active" data-tab="d">Описание</button><button data-tab="s">Характеристики</button><button data-tab="k">Комплект</button><button data-tab="i">Установка</button><button data-tab="r">Отзывы</button></div>
    <div class="tab-pane is-active" data-pane="d"><div class="prose"><p>Комплект чехлов на ${e(A.carName(m))}${m.v ? " (" + e(m.v) + ")" : ""}: ${e(v.name.toLowerCase())}. Шьётся под заказ по заводскому лекалу этой модели, поэтому повторяет контуры и линии сидений, не пузырится и не собирается гармошкой.</p><h3>Что важно знать</h3><ul><li>Лекало под конкретную марку, модель и кузов — комплектацию салона уточнит менеджер</li><li>Специальные разрывные швы не мешают срабатыванию подушек безопасности</li><li>Экокожа «Аригон» 1,05–1,15 мм, цикл истирания — не менее 40 000 раз</li><li>Фотоотчёт перед отправкой</li><li>На некоторых моделях отверстия под подголовники и мелкие кнопки не прорезаны — их прорезают при установке</li></ul></div></div>
    <div class="tab-pane" data-pane="s"><dl class="spec"><div><dt>Автомобиль</dt><dd>${e(A.carName(m))}</dd></div><div><dt>Вариант салона</dt><dd>${e(m.v || "стандартный")}</dd></div><div><dt>Годы выпуска</dt><dd>${e(m.y || "все годы")}</dd></div><div><dt>Материал вставок</dt><dd>${A.MAT_NAME[v.mat].replace("Экокожа + алькантара", "Алькантара")}</dd></div><div><dt>Цвет</dt><dd>${e(v.label)}</dd></div><div><dt>Боковины</dt><dd>Экокожа</dd></div><div><dt>Подушки безопасности</dt><dd>разрывные швы</dd></div><div><dt>Гарантия</dt><dd>1 год на качество пошива</dd></div></dl></div>
    <div class="tab-pane" data-pane="k"><div class="includes"><div>${A.ICON.check}Чехлы на сиденья, спинки и подголовники</div><div>${A.ICON.check}Разрывные швы под Airbag</div><div>${A.ICON.check}Крепёж: резинки с крючками, шнур для утяжки</div><div>${A.ICON.check}Оплётка руля в цвет салона — в подарок</div></div></div>
    <div class="tab-pane" data-pane="i"><div class="prose"><p>Качественная установка может занять около двух часов. Не путайте правое и левое передние кресла: разрывные швы должны быть со стороны дверей, кресла различают по вшитым ярлыкам AIRBAG. Подробно — <a href="info-install.html">в инструкции по установке</a>.</p><p>Если не хотите ставить сами, отметьте «Установка в вашем городе» — найдём установщика в вашем городе, стоимость уточнит менеджер.</p></div></div>
    <div class="tab-pane" data-pane="r"><div class="reviews"><article class="review"><div class="review__head"><div class="avatar">П</div><div><b>Петр</b><span>Улан-Удэ · 12.06.2022</span></div></div><p>Без проблем обговорили с менеджером цвет и текстуру чехлов. Установил самостоятельно, для удобства снимал сиденья. Мне пошили отличные чехлы, я доволен качеством материала и изготовления.</p><span class="review__car">Chevrolet Niva</span></article><article class="review"><div class="review__head"><div class="avatar">Ю</div><div><b>Юлия</b><span>Новосибирск · 24.02.2022</span></div></div><p>Качественные чехлы. Не везде есть отверстия, и чтобы их надеть, пришлось вытаскивать кресла из машины, очень трудоёмкий процесс. Но не жалею, салон как новенький. Рекомендую.</p><span class="review__car">Toyota Gaia</span></article></div><p class="small muted" style="margin-top:12px">Отзывы покупателей с сайта 1avtochehol.ru. <a class="link" href="reviews.html">Все отзывы</a></p></div>`;
  document.getElementById("p-more-title").textContent = `Другие сочетания на ${A.carName(m)}`;
  document.getElementById("p-more-link").href = A.URL.pos(m); document.getElementById("p-more-link").textContent = "Все варианты";
  document.getElementById("p-more").innerHTML = A.VARIANTS.filter(x => x.id !== v.id).slice(0, 5).map(x => A.coverCard(m, x)).join("");
  bindGallery(); bindTabs(); bindSticky(); A.badges();
})();
