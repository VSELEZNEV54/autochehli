/* =====================================================================
   АВТОСТИЛЬ — ядро прототипа (v4)
   Каталог: марка → модель → поколение (лекало) → чехлы.
   Индивидуальный пошив: пошаговый конструктор. Корзина и избранное в localStorage.
   ===================================================================== */
(function () {
  "use strict";
  document.documentElement.classList.add("js");

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = n => Math.round(n).toLocaleString("ru-RU").replace(/\s/g, "\u00a0") + "\u00a0₽";
  const qs = k => new URLSearchParams(location.search).get(k);
  const hash = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  const ICON = {
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.5L21 8H6.5"/><circle cx="10" cy="20" r="1.2"/><circle cx="17" cy="20" r="1.2"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 21s-7-4.6-9.3-9A5.2 5.2 0 0 1 12 6.4 5.2 5.2 0 0 1 21.3 12C19 16.4 12 21 12 21z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
  };

  /* ---------- данные каталога ---------- */
  const ASSETS = "assets/";
  const BRANDS = window.AS_BRANDS || [];
  const MODELS = window.AS_MODELS || [];
  const BRAND = Object.fromEntries(BRANDS.map(b => [b.id, b]));
  const BY_SLUG = Object.fromEntries(MODELS.map(m => [m.s, m]));
  const POPULAR = ["toyota", "lada", "kia", "hyundai", "renault", "nissan", "volkswagen", "skoda", "honda", "mitsubishi", "chevrolet", "ford", "mazda", "haval", "chery", "uaz", "gaz", "suzuki", "subaru", "opel"];
  const PHOTOS = ["seat1", "seat10", "seat11", "seat12", "seat2", "seat3", "seat4", "seat5", "seat6", "seat7", "seat8", "seat9", "avtochehol1", "avtochehol2", "avtochehol3", "avtochehol4", "1p", "4p", "5p"];
  const FAMILIES = {};
  MODELS.forEach(m => {
    const f = FAMILIES[m.f] || (FAMILIES[m.f] = { id: m.f, b: m.b, n: m.m, items: [] });
    f.items.push(m);
  });
  Object.values(FAMILIES).forEach(f => {
    f.items.sort((a, b) => (b.yr || 0) - (a.yr || 0) || a.s.localeCompare(b.s));
    f.min = Math.min(...f.items.map(m => m.p[0]));
    const yrs = f.items.map(m => m.yr).filter(Boolean);
    f.from = yrs.length ? Math.min(...yrs) : 0;
  });
  BRANDS.forEach(b => { b.fams = Object.values(FAMILIES).filter(f => f.b === b.id).sort((x, y) => x.n.localeCompare(y.n)); b.cnt = MODELS.filter(m => m.b === b.id).length; });
  const sortedBrands = () => BRANDS.slice().sort((a, b) => {
    const ia = POPULAR.indexOf(a.id), ib = POPULAR.indexOf(b.id);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return a.n.localeCompare(b.n);
  });

  /* ---------- стандартные сочетания чехлов на любую модель ---------- */
  const SW = n => ASSETS + "swatches/" + n + ".jpg";
  const MAT_NAME = ["Жаккард", "Экокожа", "Экокожа + алькантара"];
  /* Базовые карточки чехлов — таблица клиента от 23.10.2026 (n — номер строки).
     Боковины и тыл — чёрная экокожа «Аригон», mat — материал серединки (0 жаккард, 1 экокожа/перфорация, 2 алькантара).
     Цена = базовая цена модели за материал (m.p, как на старом сайте) + extra — доплаты из дорожной карты продаж:
     горизонтальная настрочка +600, мелкий ромб 35 мм +1 000 на экокоже и +1 500 на алькантаре, боковины в цвет серединки +700.
     stitch: "h" — горизонтальная настрочка, rhomb — серединка с заводской стёжкой ромбом 35 мм.
     photos — фото наших работ именно этого сочетания; пустой список — фото ещё нет, карточка на сайте не показывается. */
  const C_BLACK = "#231f20";
  const ALL_VARIANTS = [
    { n: 1, id: "jac-grey", mat: 0, name: "Чёрная экокожа + жаккард «рогожка серая»", label: "Жаккард «рогожка серая»", colors: [C_BLACK, "#7d7e7a"], extra: 0, photos: [], tag: "Выгодно" },
    { n: 2, id: "perf-grey", mat: 1, name: "Чёрная экокожа + серая перфорация", label: "Серая перфорация", colors: [C_BLACK, "#8a8d90"], extra: 0, photos: [] },
    { n: 3, id: "perf-black", mat: 1, name: "Чёрная экокожа + чёрная перфорация", label: "Чёрная перфорация", colors: [C_BLACK, C_BLACK], extra: 0, photos: [] },
    { n: 4, id: "perf-grey-h", mat: 1, name: "Чёрная экокожа + серая перфорация, горизонтальная настрочка", label: "Серая перфорация + настрочка", colors: [C_BLACK, "#8a8d90"], extra: 600, stitch: "h", photos: ["seat10"] },
    { n: 5, id: "perf-black-h", mat: 1, name: "Чёрная экокожа + чёрная перфорация, горизонтальная настрочка", label: "Чёрная перфорация + настрочка", colors: [C_BLACK, C_BLACK], extra: 600, stitch: "h", photos: [] },
    { n: 6, id: "rhomb-grey", mat: 1, name: "Чёрная экокожа + серая экокожа, ромб 35 мм", label: "Серый ромб 35 мм", colors: [C_BLACK, "#6f7377"], extra: 1000, rhomb: true, photos: ["seat2", "seat6"] },
    { n: 7, id: "alc-rhomb-grey", mat: 2, name: "Чёрная экокожа + серая алькантара, ромб 35 мм", label: "Серая алькантара, ромб 35 мм", colors: [C_BLACK, "#5d6064"], extra: 1500, rhomb: true, photos: ["avtochehol1"] },
    { n: 8, id: "alc-rhomb-full", mat: 2, name: "Серая алькантара ромбом 35 мм на весь перед, боковины в цвет серединки", label: "Серая алькантара на весь перед", colors: ["#5d6064", "#5d6064"], extra: 2200, rhomb: true, full: true, photos: ["avtochehol2"], tag: "Премиум" },
    { n: 9, id: "perf-orange-h", mat: 1, name: "Чёрная экокожа + оранжевая перфорация, горизонтальная настрочка", label: "Оранжевая перфорация + настрочка", colors: [C_BLACK, "#e0661b"], extra: 600, stitch: "h", photos: ["seat5", "seat4", "1p", "2p", "orange_zoom"] },
    { n: 10, id: "perf-blue-h", mat: 1, name: "Чёрная экокожа + синяя перфорация, горизонтальная настрочка", label: "Синяя перфорация + настрочка", colors: [C_BLACK, "#2f55b5"], extra: 600, stitch: "h", photos: ["seat12", "seat1"] },
    { n: 11, id: "perf-red-h", mat: 1, name: "Чёрная экокожа + красная перфорация, горизонтальная настрочка", label: "Красная перфорация + настрочка", colors: [C_BLACK, "#c4351f"], extra: 600, stitch: "h", photos: ["avtochehol3", "red_zoom"] },
    { n: 12, id: "perf-paprika", mat: 1, name: "Чёрная экокожа + перфорация «паприка»", label: "Перфорация «паприка»", colors: [C_BLACK, "#a3441f"], extra: 0, photos: [] }
  ];
  ALL_VARIANTS.forEach(v => { v.photo = v.photos[0] || ""; });
  /* на сайте — только карточки с фото; порядок — по приоритету размещения */
  const ORDER = ["perf-grey-h", "rhomb-grey", "alc-rhomb-grey", "alc-rhomb-full", "perf-orange-h", "perf-blue-h", "perf-red-h", "jac-grey", "perf-grey", "perf-black", "perf-black-h", "perf-paprika"];
  const VARIANTS = ALL_VARIANTS.filter(v => v.photos.length).sort((x, y) => ORDER.indexOf(x.id) - ORDER.indexOf(y.id));
  const VAR = Object.fromEntries(VARIANTS.map(v => [v.id, v]));
  /* «Чехлы на популярные модели» — главная и страница дилеров: [лекало, карточка] */
  const HITS = [["toyota_camry-xv70", "alc-rhomb-full"], ["lada_vesta", "perf-grey-h"], ["hyundai_solaris-2", "rhomb-grey"], ["kia_rio-iv", "perf-red-h"], ["renault_duster", "perf-grey-h"], ["toyota_rav4-new", "alc-rhomb-grey"], ["hyundai_creta", "perf-blue-h"], ["kia_sportageiv-re", "alc-rhomb-grey"], ["lada_granta-re", "perf-orange-h"], ["volkswagen_polo", "rhomb-grey"]];
  /* Доплаты к комплекту — розничные цены из дорожной карты продаж. Только для конструктора, в карточке товара их нет (решение клиента 23.10).
     when(v) — к каким карточкам применимо (на жаккарде настрочек не делают, на ромбе 35 мм отделочная нить и двойная настрочка невозможны, боковины из перфорации не шьют) */
  const ADDONS = [
    { id: "pillow-head", name: "Подушка под голову", note: "В цвет комплекта, на молнии, крепится к подголовнику", price: 600 },
    { id: "pillow-sq", name: "Подушка квадратная", note: "В цвет комплекта, на молнии", price: 600 },
    { id: "thread", name: "Строчка цветной отделочной нитью", note: "На горизонтальных полосах. Цвет нити уточнит менеджер", price: 600, when: v => v.stitch === "h" },
    { id: "double", name: "Двойная настрочка", note: "Две параллельные строчки на полосах", price: 400, when: v => v.stitch === "h" },
    { id: "vseams", name: "Вертикальные швы отделочной нитью", note: "Все видимые швы комплекта — цветной нитью", price: 600, when: v => v.mat !== 0 },
    { id: "sides", name: "Боковины в цвет серединки", note: "Лицевая часть сидений единым цветом", price: 700, when: v => v.mat === 2 && !v.full }
  ];
  const addonsFor = v => ADDONS.filter(a => !a.when || a.when(v));

  const brandName = id => (BRAND[id] || {}).n || id;
  const brandLogo = id => ASSETS + "brands/" + ((BRAND[id] || {}).logo || "toyota.jpg");
  const genName = m => [m.m, m.g].filter(Boolean).join(" ");
  const carName = m => brandName(m.b) + " " + genName(m);
  const yearsText = m => m.y || "все годы";
  const famPhoto = f => ASSETS + "photos/" + PHOTOS[hash(f.id) % PHOTOS.length] + ".jpg";
  const posPhoto = m => ASSETS + "photos/" + PHOTOS[hash(m.s) % PHOTOS.length] + ".jpg";
  const varPhoto = v => ASSETS + "photos/" + v.photo + ".jpg";
  const varPhotos = v => v.photos.map(n => ASSETS + "photos/" + n + ".jpg");
  /* Рендеры кузовов (assets/cars, белый фон, 16:10): лекало → файл, js/cars.js */
  const CAR_RENDERS = window.AS_CARS || {};
  const carRender = m => CAR_RENDERS[m.s] ? ASSETS + "cars/" + CAR_RENDERS[m.s] + ".png" : "";
  const priceOf = (m, v) => (m ? m.p : [7975, 9375, 9975])[v.mat] + (v.extra || 0);
  /* Старая цена комплекта — как на старом сайте: зачёркнутая цена модели (обычно 12 975 ₽, поле «o» в data.js) + те же доплаты варианта */
  const oldPriceOf = (m, v) => { const o = m && m.o ? m.o + (v.extra || 0) : 0; return o > priceOf(m, v) ? o : 0; };
  const discountOf = (m, v) => { const o = oldPriceOf(m, v); return o ? Math.round((1 - priceOf(m, v) / o) * 100) : 0; };
  const priceHtml = (m, v, attrs = "") => {
    const o = oldPriceOf(m, v), now = `<span class="price__now">${fmt(priceOf(m, v))}</span>`;
    return o ? `<div class="price price--sale"${attrs}>${now}<span class="price__was"><s>${fmt(o)}</s><b class="price__off">−${discountOf(m, v)}\u00a0%</b></span></div>` : `<div class="price"${attrs}>${now}</div>`;
  };
  const URL_ = {
    brand: id => "brand.html?b=" + encodeURIComponent(id),
    fam: f => (f.items.length === 1 ? "car.html?m=" + encodeURIComponent(f.items[0].s) : "car.html?f=" + encodeURIComponent(f.id)),
    pos: m => "car.html?m=" + encodeURIComponent(m.s),
    product: (m, v) => "product.html?m=" + encodeURIComponent(m.s) + "&v=" + v.id,
    custom: m => "custom.html" + (m ? "?m=" + encodeURIComponent(m.s) : ""),
    acc: p => "product.html?p=" + encodeURIComponent(p.id)
  };

  /* ---------- toast ---------- */
  let toastEl;
  function toast(msg, link) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; document.body.appendChild(toastEl); }
    toastEl.innerHTML = ICON.check + esc(msg) + (link ? `<a href="${link[1]}">${esc(link[0])}</a>` : "");
    toastEl.classList.add("is-on");
    clearTimeout(toastEl._t); toastEl._t = setTimeout(() => toastEl.classList.remove("is-on"), 3600);
  }
  document.addEventListener("click", e => { const b = e.target.closest("[data-toast]"); if (b) { e.preventDefault(); toast(b.dataset.toast); } });

  /* ---------- сервер /api: заказы, заявки, VIN (backend/) ---------- */
  const API = "/api", PAGE_T0 = Date.now(), PHONE_TEXT = "позвоните 8 (800) 775-32-60";
  try { /* метки рекламы и источник перехода — запоминаем на визит, уходят в заказ */
    const p = new URLSearchParams(location.search), utm = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "yclid", "gclid"].forEach(k => { if (p.get(k)) utm[k] = p.get(k).slice(0, 120); });
    if (Object.keys(utm).length) sessionStorage.setItem("as_utm", JSON.stringify(utm));
    if (!sessionStorage.getItem("as_ref") && document.referrer && !document.referrer.startsWith(location.origin)) sessionStorage.setItem("as_ref", document.referrer.slice(0, 300));
  } catch (e) {}
  const formMeta = form => {
    let utm = {}, ref = "";
    try { utm = JSON.parse(sessionStorage.getItem("as_utm") || "{}"); ref = sessionStorage.getItem("as_ref") || ""; } catch (e) {}
    const hp = form && form.querySelector("[name=website]");
    return { page: location.pathname + location.search, referrer: ref, utm, elapsed_ms: Date.now() - ((form && form._t0) || PAGE_T0), hp: hp ? hp.value : "" };
  };
  async function api(path, body, opts = {}) {
    const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), opts.timeout || 20000);
    try {
      const r = await fetch(API + path, { method: body ? "POST" : "GET", headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined, signal: ctrl.signal, credentials: "same-origin" });
      let data = null; try { data = await r.json(); } catch (e) {}
      if (!r.ok) return { ok: false, status: r.status, errors: (data && data.errors) || [], error: (data && typeof data.detail === "string" && data.detail) || `Не удалось отправить — ${PHONE_TEXT}, оформим по телефону.` };
      return { ok: true, data };
    } catch (e) {
      return { ok: false, status: 0, errors: [], error: `Нет связи с сервером. Проверьте интернет или ${PHONE_TEXT}.` };
    } finally { clearTimeout(t); }
  }
  /* скрытое поле-ловушка: человек его не видит, бот заполняет */
  function guardForm(form) {
    if (form._guard) return; form._guard = true; form._t0 = Date.now();
    const hp = document.createElement("input");
    Object.assign(hp, { type: "text", name: "website", tabIndex: -1, autocomplete: "off", className: "hp" });
    hp.setAttribute("aria-hidden", "true"); form.appendChild(hp);
  }
  /* поля с ошибкой от сервера — красная рамка и фокус на первом */
  const ERR_FIELDS = [["телефон", ["phone", "contact"]], ["e-mail", ["email", "contact"]], ["инн", ["inn"]], ["организац", ["company"]], ["имя", ["name"]], ["сообщение", ["message"]], ["согласие", ["consent"]]];
  function fieldErrors(form, res) {
    $$(".is-invalid", form).forEach(x => x.classList.remove("is-invalid"));
    (res.errors || []).forEach(er => {
      /* ошибка уровня всей формы — угадываем поле по тексту */
      const names = er.field && er.field !== "body" ? [er.field] : ((ERR_FIELDS.find(([w]) => er.message.toLowerCase().includes(w)) || [])[1] || []);
      const el = names.map(n => form.querySelector(`[name="${n}"]`)).find(Boolean);
      if (el) el.classList.add("is-invalid");
    });
    const first = form.querySelector(".is-invalid"); if (first) first.focus();
  }
  document.addEventListener("input", e => { if (e.target.classList && e.target.classList.contains("is-invalid")) e.target.classList.remove("is-invalid"); });

  /* ---------- корзина и избранное ---------- */
  const store = { get(k) { try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch (e) { return []; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const Cart = {
    items: store.get("as_cart4"),
    save() { store.set("as_cart4", this.items); badges(); document.dispatchEvent(new CustomEvent("cart:change")); },
    add(item) { const ex = this.items.find(i => i.id === item.id); if (ex) ex.qty += item.qty || 1; else this.items.push(Object.assign({ qty: 1 }, item)); this.save(); },
    remove(id) { this.items = this.items.filter(i => i.id !== id); this.save(); },
    setQty(id, q) { const it = this.items.find(i => i.id === id); if (it) { it.qty = Math.max(1, q); this.save(); } },
    clear() { this.items = []; this.save(); },
    count() { return this.items.reduce((n, i) => n + i.qty, 0); },
    total() { return this.items.reduce((n, i) => n + i.price * i.qty, 0); }
  };
  const Fav = {
    items: store.get("as_fav4"),
    save() { store.set("as_fav4", this.items); badges(); document.dispatchEvent(new CustomEvent("fav:change")); },
    has(id) { return this.items.some(i => i.id === id); },
    toggle(item) { if (this.has(item.id)) this.items = this.items.filter(i => i.id !== item.id); else this.items.push(item); this.save(); return this.has(item.id); }
  };
  function badges() {
    $$("[data-cart-count]").forEach(el => { el.textContent = Cart.count(); el.hidden = !Cart.count(); });
    $$("[data-fav-count]").forEach(el => { el.textContent = Fav.items.length; el.hidden = !Fav.items.length; });
    $$("[data-fav]").forEach(el => el.classList.toggle("is-on", Fav.has(el.dataset.fav)));
  }
  function resolveItem(id) {
    const [kind, a, b] = id.split(":");
    if (kind === "cover") {
      const m = BY_SLUG[a], v = VAR[b]; if (!m || !v) return null;
      return { id, title: `Чехлы на ${carName(m)}`, sub: `${v.name} · ${yearsText(m)}`, price: priceOf(m, v), img: varPhoto(v), url: URL_.product(m, v) };
    }
    if (kind === "product") {
      const p = (window.AS_PRODUCTS || []).find(x => x.id === a); if (!p) return null;
      return { id, title: p.title, sub: p.sub || "", price: p.price, old: p.old, img: p.img, url: URL_.acc(p) };
    }
    return null;
  }
  document.addEventListener("click", e => {
    const f = e.target.closest("[data-fav]");
    if (f) { e.preventDefault(); e.stopPropagation(); const it = resolveItem(f.dataset.fav); if (!it) return; toast(Fav.toggle(it) ? "Добавлено в избранное" : "Убрано из избранного"); return; }
    const a = e.target.closest("[data-add]");
    if (a) {
      e.preventDefault(); const it = resolveItem(a.dataset.add); if (!it) return;
      Cart.add(it); a.classList.add("is-added");
      if (a.dataset.addGo !== undefined) location.href = "cart.html"; else toast("Добавлено в корзину", ["Перейти", "cart.html"]);
    }
  });

  /* ---------- карточки ---------- */
  const colorDot = c => `background:linear-gradient(135deg, ${c[0]} 0 50%, ${c[1]} 50% 100%)`;
  const swatchDots = v => `<div class="card__swatches"><i style="${colorDot(v.colors)}" title="${esc(v.label)}"></i></div>`;
  const coverCard = (m, v, opts = {}) => {
    const url = URL_.product(m, v), id = `cover:${m.s}:${v.id}`;
    const tag = opts.tag ?? v.tag;
    const tags = tag ? `<span class="card__tag${tag === "Премиум" ? " card__tag--dark" : tag === "Выгодно" ? " card__tag--white" : ""}">${tag}</span>` : "";
    return `<article class="card">
      <a class="card__media" href="${url}"><img src="${varPhoto(v)}" alt="Чехлы на ${esc(carName(m))}, ${esc(v.name)}" loading="lazy" width="400" height="400">${tags ? `<div class="card__tags">${tags}</div>` : ""}${opts.logo ? `<span class="card__logo"><img src="${brandLogo(m.b)}" alt=""></span>` : ""}${swatchDots(v)}</a>
      <button type="button" class="card__fav" aria-label="В избранное" data-fav="${id}">${ICON.heart}</button>
      <div class="card__body">
        <a class="card__title" href="${url}">Чехлы на ${esc(carName(m))}, ${esc(v.name.toLowerCase())}</a>
        <div class="card__meta"><span>${esc(opts.salon && m.v ? m.v + " · " + yearsText(m) : yearsText(m))}</span><span class="card__ready">Заводские лекала</span></div>
        <div class="card__foot">${priceHtml(m, v)}<button type="button" class="cart-btn" data-add="${id}" aria-label="В корзину">${ICON.cart}</button></div>
      </div>
    </article>`;
  };
  /* Блок «Индивидуальный пошив» — один на весь сайт (главная, каталог, марки, модели, подборки); в сетке карточек встаёт на всю ширину */
  const customCard = (m, name) => `<div class="studio">
      <div class="studio__body">
        <span class="tag tag--yellow">Индивидуальный пошив</span>
        <h2>Не нашли свой вариант? Соберите чехлы в конструкторе</h2>
        <p>Соберите свой дизайн комплекта в удобном конструкторе: выберите цвет боковин, материал и цвет вставок, рисунок — и оставьте заявку. Менеджер уточнит комплектацию салона и рассчитает стоимость.</p>
        <div class="studio__steps"><div><i>01</i><b>Цвет</b><span>боковины и вставки — 21 цвет</span></div><div><i>02</i><b>Материал</b><span>экокожа, перфорация, алькантара, жаккард</span></div><div><i>03</i><b>Рисунок</b><span>классические полосы или стёжка ромбом</span></div><div><i>04</i><b>Дополнительно</b><span>коврики EVA, установка, оплётка руля в подарок</span></div></div>
        <div class="studio__actions"><a class="btn btn--primary btn--lg" href="${URL_.custom(m)}">Открыть конструктор</a>${m ? "" : '<a class="btn btn--glass btn--lg" href="#" data-mega-open>Чехлы на мою модель</a>'}</div>
      </div>
      <div class="studio__visual">
        <img src="${ASSETS}photos/seat6.jpg" alt="Пример наших работ" loading="lazy">
        <div class="studio__panel">
          <b>Ваш дизайн · ${esc(name || (m ? carName(m) : "Toyota Camry XV70"))}</b>
          <div class="row"><span>Боковины / вставки</span><div class="pal"><i class="on" style="background-image:url('${SW("eco-black")}')"></i><i style="background-image:url('${SW("alca-grey")}')"></i><i style="background-image:url('${SW("eco-beige")}')"></i><i style="background-image:url('${SW("perf-black")}')"></i></div></div>
          <div class="row"><span>Чёрная экокожа + светлая алькантара</span><span class="price">от ${fmt(m ? m.p[2] : 9975)}</span></div>
        </div>
      </div>
    </div>`;
  /* SEO-текст по образцу главной: h2, вводный абзац, разделы h3, цены, «Популярные запросы» */
  const seoBlock = ({ h2, intro, parts, tags }) => `<h2>${h2}</h2>${intro}${parts.filter(Boolean).map(([h, body]) => `<h3>${h}</h3>${body}`).join("")}${tags && tags.length ? `<div class="seo__tags"><b>Популярные запросы</b><ul>${tags.map(([t, u]) => `<li><a href="${u}">${esc(t)}</a></li>`).join("")}</ul></div>` : ""}`;
  /* Общие разделы — только факты со старого сайта; name — «Lada Vesta», «Lada» или пусто */
  const SEO_PART = {
    materials: name => ["Материалы: экокожа, алькантара, жаккард", `<p>Боковины чехлов${name ? " на " + esc(name) : ""} шьём из экокожи «Аригон» — полиуретановое покрытие на хлопковой основе толщиной 1,05–1,15 мм, цикл истирания не менее 40 000 раз. Для вставок выберите гладкую экокожу, экокожу с перфорацией, алькантару или жаккард. Все материалы гипоаллергенные, «дышащие» и выдерживают морозы до −30 °C. Экокожа легко чистится, алькантара приятна на ощупь, а жаккардовые вставки — самый доступный вариант комплекта.</p>`],
    prices: (name, p) => [`Цены на чехлы${name ? " " + esc(name) : " для сидений"}`, `<ul><li>Чехлы из жаккарда — от ${fmt(p[0])}</li><li>Чехлы из экокожи и экокожи с перфорацией — от ${fmt(p[1])}</li><li>Чехлы из алькантары — от ${fmt(p[2])}</li></ul><p>Цена указана за комплект на весь салон${name ? "" : " и зависит от модели автомобиля"}. Работаем по предоплате от 1 000 ₽, остаток можно оплатить при получении.</p>`],
    custom: name => ["Пошив авточехлов на заказ", `<p>Не нашли готовое сочетание${name ? " для " + esc(name) : ""}? Соберите свои чехлы в <a href="custom.html">конструкторе</a>: выберите цвет боковин, материал и цвет вставок, рисунок — классические полосы или стёжку ромбом. К заказу можно добавить автоковрики EVA в цвет чехлов, а оплётку руля в цвет салона дарим к каждому комплекту. Менеджер уточнит комплектацию салона и рассчитает стоимость пошива.</p>`],
    service: () => ["Безопасность, гарантия и доставка", `<p>Для сидений с боковыми подушками безопасности делаем разрывные швы с ярлыками AIRBAG — чехлы не мешают их срабатыванию. Гарантия на качество пошива — 1 год. Перед отправкой присылаем фотоотчёт. Доставляем DPD и EMS Почтой России в 6 000 населённых пунктов России и СНГ, в Новосибирске — самовывоз и курьер. Представительства «Автостиля» работают в городах России и Казахстана, установку в вашем городе организуем по запросу.</p>`]
  };
  /* Минимальные цены по материалам [жаккард, экокожа, алькантара] для набора лекал */
  const minPrices = list => [0, 1, 2].map(i => Math.min(...list.map(m => m.p[i])));
  const famStats = f => {
    if (f._st) return f._st;
    let to = 0, now = false;
    f.items.forEach(m => {
      const y = m.y || "", r = y.match(/(\d{4})\s*[–-]\s*(\d{4})/), d = y.match(/до\s*(\d{4})/);
      if (r) to = Math.max(to, +r[2]); else if (/^с\s*\d{4}/.test(y)) now = true; else if (d) to = Math.max(to, +d[1]);
    });
    const gens = new Set(f.items.map(m => (m.g || "").split(/[ ,]/)[0] || m.m)).size;
    const max = Math.max(...f.items.map(m => Math.max(...m.p)));
    const years = f.from ? (now ? `${f.from} — н. в.` : to ? `${f.from}–${to}` : `с ${f.from}`) : "все годы";
    return (f._st = { gens, max, years });
  };
  const priceRange = (a, b) => a === b ? fmt(a) : `${fmt(a).replace(/\s?₽$/, "")} – ${fmt(b)}`;
  const famCard = f => {
    const st = famStats(f), n = f.items.length, car = f.items.map(carRender).find(Boolean);
    return `<a class="fam" href="${URL_.fam(f)}">
      <div class="fam__media${car ? " fam__media--car" : ""}"><img src="${car || famPhoto(f)}" alt="Чехлы на ${esc(brandName(f.b) + " " + f.n)}" loading="lazy"></div>
      <div class="fam__body">
        <div class="fam__title">${esc(brandName(f.b))} ${esc(f.n)}</div>
        <div class="fam__years">${esc(st.years)}</div>
        <div class="fam__stats"><span><b>${st.gens}</b> ${plural(st.gens, "поколение", "поколения", "поколений")}</span><span><b>${n}</b> ${plural(n, "лекало", "лекала", "лекал")}</span></div>
        <div class="fam__foot"><div class="price"><small>комплект</small>${priceRange(f.min, st.max)}</div><span class="btn btn--ghost btn--sm">Выбрать</span></div>
      </div>
    </a>`;
  };
  /* Карточка поколения (лекала) на странице модели — в том же виде, что и карточка модели */
  const genCard = m => {
    const car = carRender(m), years = (m.y || "все годы").replace(/^с\s*(\d{4})$/, "$1 — н. в."), mats = new Set(VARIANTS.map(v => v.mat)).size;
    return `<a class="fam" href="${URL_.pos(m)}">
      <div class="fam__media${car ? " fam__media--car" : ""}"><img src="${car || posPhoto(m)}" alt="Чехлы на ${esc(carName(m))}" loading="lazy"></div>
      <div class="fam__body">
        <div class="fam__title">${esc(carName(m))}</div>
        <div class="fam__years">${esc(years)}</div>
        <div class="fam__stats">${m.v ? `<span>${esc(m.v)}</span>` : ""}<span><b>${VARIANTS.length}</b> ${plural(VARIANTS.length, "сочетание", "сочетания", "сочетаний")}</span><span><b>${mats}</b> ${plural(mats, "материал", "материала", "материалов")}</span></div>
        <div class="fam__foot"><div class="price"><small>комплект</small>${priceRange(Math.min(...m.p), Math.max(...m.p))}</div><span class="btn btn--ghost btn--sm">Выбрать</span></div>
      </div>
    </a>`;
  };
  /* Аксессуары: цены не публикуем (их нет на старом сайте) — «цена по запросу»; demo-позиции на странице не помечаются */
  const accPrice = p => p.gift ? `<div class="price">В подарок<small>к комплекту чехлов</small></div>` : `<div class="price price--ask">Цена по запросу${p.note ? `<small>${esc(p.note)}</small>` : ""}</div>`;
  const productCard = p => `<article class="card">
      <a class="card__media" href="${URL_.acc(p)}"><img src="${p.img}" alt="${esc(p.title)}" loading="lazy" width="400" height="400">${p.gift ? `<div class="card__tags"><span class="card__tag card__tag--sale">Акция</span></div>` : ""}</a>
      <button type="button" class="card__fav" aria-label="В избранное" data-fav="product:${p.id}">${ICON.heart}</button>
      <div class="card__body"><a class="card__title" href="${URL_.acc(p)}">${esc(p.title)}</a><div class="card__meta"><span>${esc(p.sub || "")}</span></div>
      <div class="card__foot">${accPrice(p)}<a class="btn btn--ghost btn--sm" href="${URL_.acc(p)}">Подробнее</a></div></div>
    </article>`;
  /* Карточка статьи: рубрика и дата, заголовок, тема (материал, модель, город), подзаголовок, «Читать статью» */
  const postCard = p => `<a class="post" href="${p.slug}.html"><div class="post__img"><img src="${p.img}" alt="" loading="lazy"></div><div class="post__body"><div class="post__meta"><span class="tag">${esc(p.tag)}</span>${p.date ? `<time>${esc(p.date)}</time>` : ""}</div><div class="post__title">${esc(p.title)}</div>${p.topic ? `<div class="post__topic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>${esc(p.topic)}</div>` : ""}<div class="post__lead">${esc(p.lead)}</div><div class="post__more">Читать статью<i aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></i></div></div></a>`;
  function plural(n, a, b, c) { const n10 = n % 10, n100 = n % 100; return n10 === 1 && n100 !== 11 ? a : n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20) ? b : c; }

  /* ---------- мобильное меню ---------- */
  const drawer = $("[data-drawer]");
  function openDrawer(tab) {
    if (!drawer) return;
    drawer.classList.add("is-open"); document.body.style.overflow = "hidden";
    if (tab) $$("[data-drawer-tab]", drawer).forEach(b => { if (b.dataset.drawerTab === tab) b.click(); });
  }
  $$("[data-drawer-open]").forEach(b => b.addEventListener("click", e => { e.preventDefault(); openDrawer(b.dataset.drawerOpen); }));
  $$("[data-drawer-close]").forEach(b => b.addEventListener("click", () => { drawer.classList.remove("is-open"); document.body.style.overflow = ""; }));
  if (drawer) {
    const tabs = $$("[data-drawer-tab]", drawer), panes = $$("[data-drawer-pane]", drawer);
    tabs.forEach(t => t.addEventListener("click", () => { tabs.forEach(x => x.classList.toggle("is-active", x === t)); panes.forEach(p => p.classList.toggle("is-active", p.dataset.drawerPane === t.dataset.drawerTab)); }));
    const acc = $("[data-drawer-catalog]", drawer);
    if (acc) acc.innerHTML = sortedBrands().map(b => `<details><summary><img src="${brandLogo(b.id)}" alt="" loading="lazy"><span>${esc(b.n)}</span><small>${b.fams.length}</small></summary><div class="acc__models">${b.fams.map(f => `<a href="${URL_.fam(f)}"><b>${esc(f.n)}</b> · ${f.items.length} ${plural(f.items.length, "лекало", "лекала", "лекал")}</a>`).join("")}<a class="more" href="${URL_.brand(b.id)}">Все модели ${esc(b.n)}</a></div></details>`).join("");
  }

  /* ---------- мега-меню ---------- */
  const mega = $("[data-mega]"), megaBg = $("[data-mega-bg]"), megaBtn = $("[data-mega-toggle]");
  if (mega && megaBtn) {
    const list = $("[data-mega-brands]", mega), pane = $("[data-mega-models]", mega), customLink = $("[data-mega-custom]", mega);
    let current = null, hoverT;
    list.innerHTML = sortedBrands().map(b => `<a class="mega__brand" href="${URL_.brand(b.id)}" data-brand="${b.id}"><img src="${brandLogo(b.id)}" alt="" loading="lazy"><span>${esc(b.n)}</span><small>${b.fams.length}</small></a>`).join("");
    const show = id => {
      if (current === id) return; current = id;
      $$(".mega__brand", list).forEach(el => el.classList.toggle("is-active", el.dataset.brand === id));
      const b = BRAND[id];
      pane.innerHTML = `<div class="mega__title"><img src="${brandLogo(id)}" alt=""><div><h3>Чехлы на ${esc(b.n)}</h3><span>${b.fams.length} ${plural(b.fams.length, "модель", "модели", "моделей")} · ${b.cnt} ${plural(b.cnt, "лекало", "лекала", "лекал")} · комплект от ${fmt(Math.min(...b.fams.map(f => f.min)))}</span></div><a class="btn btn--more" href="${URL_.brand(id)}">Все модели ${esc(b.n)}</a></div>
        <div class="mega__cols">${b.fams.map(f => `<div class="mega__fam"><a href="${URL_.fam(f)}">${esc(f.n)}</a>${f.items.length > 1 ? `<ul>${f.items.map(m => `<li><a href="${URL_.pos(m)}">${esc([m.g, m.v].filter(Boolean).join(", ") || "Все годы")}${m.y ? " · " + esc(m.y) : ""}</a></li>`).join("")}</ul>` : `<ul><li><a href="${URL_.pos(f.items[0])}">${esc(f.items[0].y || "все годы")}</a></li></ul>`}</div>`).join("")}</div>`;
      if (customLink) customLink.href = "custom.html";
    };
    list.addEventListener("mouseover", e => { const el = e.target.closest(".mega__brand"); if (!el) return; clearTimeout(hoverT); hoverT = setTimeout(() => show(el.dataset.brand), 70); });
    list.addEventListener("focusin", e => { const el = e.target.closest(".mega__brand"); if (el) show(el.dataset.brand); });
    const open = () => { show(current || "toyota"); mega.classList.add("is-open"); megaBg.classList.add("is-open"); megaBtn.classList.add("is-open"); megaBtn.setAttribute("aria-expanded", "true"); };
    const close = () => { mega.classList.remove("is-open"); megaBg.classList.remove("is-open"); megaBtn.classList.remove("is-open"); megaBtn.setAttribute("aria-expanded", "false"); };
    megaBtn.addEventListener("click", e => { e.preventDefault(); if (window.innerWidth <= 1100) { openDrawer("catalog"); return; } mega.classList.contains("is-open") ? close() : open(); });
    document.addEventListener("click", e => { const t = e.target.closest("[data-mega-open]"); if (t) { e.preventDefault(); if (window.innerWidth <= 1100) openDrawer("catalog"); else { window.scrollTo({ top: 0, behavior: "smooth" }); open(); } } });
    megaBg.addEventListener("click", close);
    document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    document.addEventListener("click", e => { if (mega.classList.contains("is-open") && !mega.contains(e.target) && !megaBtn.contains(e.target) && !e.target.closest("[data-mega-open]")) close(); });
  }
  const page = document.body.dataset.page;
  $$(`[data-nav="${page}"]`).forEach(a => a.classList.add("is-active"));

  /* ---------- слайдер ---------- */
  $$("[data-slider]").forEach(sl => {
    const track = $(".slider__track", sl), slides = $$(".slide", sl), dots = $(".slider__dots", sl);
    let i = 0, timer;
    dots.innerHTML = slides.map((_, k) => `<button type="button" aria-label="Слайд ${k + 1}"></button>`).join("");
    const go = n => {
      i = (n + slides.length) % slides.length;
      track.style.transform = `translateX(-${i * 100}%)`;
      $$("button", dots).forEach((d, k) => { d.classList.remove("is-active"); if (k === i) { void d.offsetWidth; d.classList.add("is-active"); } });
      sl.classList.toggle("is-light", slides[i].matches(".slide--yellow, .slide--light"));
    };
    const play = () => { clearInterval(timer); timer = setInterval(() => go(i + 1), 6000); sl.classList.remove("is-paused"); };
    $$("button", dots).forEach((d, k) => d.addEventListener("click", () => { go(k); play(); }));
    $("[data-prev]", sl)?.addEventListener("click", () => { go(i - 1); play(); });
    $("[data-next]", sl)?.addEventListener("click", () => { go(i + 1); play(); });
    sl.addEventListener("mouseenter", () => { clearInterval(timer); sl.classList.add("is-paused"); });
    sl.addEventListener("mouseleave", play);
    let x0 = null;
    sl.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; }, { passive: true });
    sl.addEventListener("touchend", e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) go(dx < 0 ? i + 1 : i - 1); x0 = null; play(); });
    go(0); play();
  });

  /* ---------- умный поиск ---------- */
  const TR = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya" };
  const norm = s => String(s || "").toLowerCase().replace(/ё/g, "е").replace(/[()«»"'.,/]/g, " ").replace(/\s+/g, " ").trim();
  const translit = s => norm(s).replace(/[а-я]/g, ch => TR[ch] ?? ch);
  function lev(a, b) {
    if (a === b) return 0; if (!a.length) return b.length; if (!b.length) return a.length;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) { const cur = [i]; for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
    return prev[b.length];
  }
  const INDEX = MODELS.map(m => {
    const b = BRAND[m.b] || { n: m.b, s: "" };
    const lat = norm([b.n, m.m, m.g, m.v, m.s.replace(/[_-]/g, " ")].join(" "));
    const cyr = norm(b.s + " " + (m.ru || "")).split(" ").filter(Boolean);
    return { m, lat: lat.split(" "), cyr, cyrTr: cyr.map(translit) };
  });
  function tokenScore(q, e) {
    const qt = translit(q); let best = 0;
    const check = (tok, tokTr) => {
      if (!tok) return;
      if (tok === q || tokTr === qt) best = Math.max(best, 3);
      else if (tok.startsWith(q) || tokTr.startsWith(qt)) best = Math.max(best, 2);
      else if (tok.length >= 3 && q.length >= 3 && (q.startsWith(tok) || qt.startsWith(tokTr))) best = Math.max(best, 1.5);
      else if (/^\d{2,}$/.test(q) && tok.includes(q)) best = Math.max(best, 1.5);
      else if (q.length >= 4 && tokTr.length >= 4 && lev(qt, tokTr) <= (q.length >= 6 ? 2 : 1)) best = Math.max(best, 1.2);
    };
    e.lat.forEach(t => check(t, t)); e.cyr.forEach((t, i) => check(t, e.cyrTr[i]));
    return best;
  }
  function search(query, limit = 8) {
    const q = norm(query); if (q.length < 2) return { models: [], brands: [] };
    const tokens = q.split(" ").filter(Boolean), scored = [];
    for (const e of INDEX) {
      let total = 0, ok = 0;
      for (const t of tokens) { const s = tokenScore(t, e); if (s > 0) { total += s; ok++; } }
      if (ok === tokens.length) scored.push({ m: e.m, score: total + (e.m.yr || 0) / 100000 });
    }
    scored.sort((a, b) => b.score - a.score);
    const brands = BRANDS.filter(b => { const n = norm(b.n), s = norm(b.s); return tokens.some(t => n.startsWith(t) || s.split(" ").some(x => x.startsWith(t)) || (t.length >= 4 && lev(translit(t), n) <= 1)); }).slice(0, 3);
    return { models: scored.slice(0, limit).map(x => x.m), brands };
  }
  const hl = (text, query) => { let out = esc(text); norm(query).split(" ").filter(t => t.length >= 2).forEach(t => { out = out.replace(new RegExp("(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "i"), "<mark>$1</mark>"); }); return out; };
  /* ---------- VIN: марка по коду производителя (WMI, 1–3 символы), модельный год по 10-му символу ----------
     Полную расшифровку модели и кузова даёт только внешний VIN-сервис на сервере; здесь — то, что вычисляется по стандарту. */
  const VIN_WMI = {
    WAU: ["audi"], WA1: ["audi"], TRU: ["audi"], WUA: ["audi"],
    WBA: ["bmw"], WBS: ["bmw"], WBX: ["bmw"], WBY: ["bmw"], X4X: ["bmw"],
    LVV: ["chery"], KL1: ["chevrolet"], X9L: ["chevrolet"], "1G1": ["chevrolet"], "1GN": ["chevrolet"], XUF: ["chevrolet", "opel"], XUU: ["chevrolet", "opel"],
    VF7: ["citroen"], Z8T: ["citroen", "peugeot", "mitsubishi"], KLA: ["daewoo"], KLY: ["daewoo"], XWB: ["daewoo", "chevrolet"], JDA: ["daihatsu"],
    Z8N: ["nissan", "datsun"], "1B3": ["dodge"], "2B3": ["dodge"], "1C3": ["dodge"], ZFA: ["fiat"],
    WF0: ["ford"], X9F: ["ford"], "1FA": ["ford"], "1FM": ["ford"], "1FT": ["ford"], "3FA": ["ford"], NM0: ["ford"],
    X96: ["gaz"], XTH: ["gaz"], LGW: ["great-wall", "haval"],
    JHM: ["honda"], JHL: ["honda"], SHH: ["honda"], SHS: ["honda"], "1HG": ["honda"], "2HG": ["honda"], "5J6": ["honda"], "19X": ["honda"],
    KMH: ["hyundai"], KM8: ["hyundai"], Z94: ["hyundai", "kia"], X7M: ["hyundai", "tagaz"], NLH: ["hyundai"], MAL: ["hyundai"], TMA: ["hyundai"],
    JAA: ["isuzu"], JAL: ["isuzu"], KNA: ["kia"], KNC: ["kia"], KND: ["kia"], KNE: ["kia"], XWE: ["kia"],
    XTA: ["lada"], SAL: ["land-rover"], JTH: ["lexus"], JTJ: ["lexus"], LLV: ["lifan"],
    JMZ: ["mazda"], JM1: ["mazda"], JM3: ["mazda"], WDD: ["mercedes"], WDB: ["mercedes"], WDC: ["mercedes"], WDF: ["mercedes"], W1K: ["mercedes"], W1N: ["mercedes"],
    JMB: ["mitsubishi"], JMY: ["mitsubishi"], JA3: ["mitsubishi"], JA4: ["mitsubishi"], MMB: ["mitsubishi"],
    JN1: ["nissan"], JN6: ["nissan"], JN8: ["nissan"], SJN: ["nissan"], VSK: ["nissan"], "1N4": ["nissan"], "1N6": ["nissan"], "5N1": ["nissan"], "3N1": ["nissan"],
    W0L: ["opel"], W0V: ["opel"], VF3: ["peugeot"], VR3: ["peugeot"], "1G2": ["pontiac"],
    VF1: ["renault"], X7L: ["renault"], UU1: ["renault"], TMB: ["skoda"], XW8: ["volkswagen", "skoda"], WME: ["smart"], KPT: ["ssangyong"],
    JF1: ["subaru"], JF2: ["subaru"], "4S3": ["subaru"], "4S4": ["subaru"], JS2: ["suzuki"], JS3: ["suzuki"], JSA: ["suzuki"], TSM: ["suzuki"],
    XW7: ["toyota"], "4T1": ["toyota"], "4T3": ["toyota"], "5TD": ["toyota"], "5TF": ["toyota"], "2T1": ["toyota"], "2T3": ["toyota"], SB1: ["toyota"], NMT: ["toyota"], MR0: ["toyota"], MR1: ["toyota"], VNK: ["toyota"], AHT: ["toyota"],
    XTT: ["uaz"], WVW: ["volkswagen"], WV1: ["volkswagen"], WV2: ["volkswagen"], WVG: ["volkswagen"], "3VW": ["volkswagen"], "9BW": ["volkswagen"], AAV: ["volkswagen"],
    YV1: ["volvo"], YV4: ["volvo"], Y6D: ["zaz"]
  };
  const VIN_YEARS = "ABCDEFGHJKLMNPRSTVWXY123456789";
  const cleanVin = raw => String(raw || "").toUpperCase().replace(/[\s\-_.]/g, "");
  const isVin = raw => /^[A-HJ-NPR-Z0-9]{17}$/.test(cleanVin(raw));
  const isFrame = raw => { const v = String(raw || "").toUpperCase().trim(); return !isVin(v) && /^[A-Z]{1,5}\d{1,3}[A-Z]?-?\d{4,8}$/.test(v.replace(/\s/g, "")); };
  function decodeVin(raw) {
    const v = cleanVin(raw); if (!isVin(v)) return null;
    const w3 = v.slice(0, 3);
    let brands = VIN_WMI[w3] || (v.startsWith("JT") ? ["toyota"] : []);
    brands = brands.filter(id => BRAND[id]);
    const i = VIN_YEARS.indexOf(v[9]); let year = null;
    if (i >= 0) { const base = 1980 + i, max = new Date().getFullYear() + 1; year = base + 30 <= max ? base + 30 : base; }
    return { vin: v, wmi: w3, brands, year };
  }
  function yearRange(m) {
    const y = (m && m.y) || "", r = y.match(/(\d{4})\s*[–-]\s*(\d{4})/), from = y.match(/^с\s*(\d{4})/), to = y.match(/^до\s*(\d{4})/);
    if (r) return [+r[1], +r[2]]; if (from) return [+from[1], 9999]; if (to) return [0, +to[1]]; return [0, 9999];
  }
  const yearMatch = (m, year) => { if (!year) return true; const [a, b] = yearRange(m); return year >= a - 1 && year <= b + 1; };
  /* подсказка к лекалу: коды завода-изготовителя марки (первые символы VIN) и буквы модельного года (10-й символ) по годам кузова */
  function vinHint(m) {
    if (!m) return null;
    /* коды североамериканских заводов (начинаются с цифр 1–5) — в конце: такие машины в России редкость */
    const wmi = Object.keys(VIN_WMI).filter(k => VIN_WMI[k].includes(m.b)).sort((x, y) => /^[1-5]/.test(x) - /^[1-5]/.test(y));
    if (m.b === "toyota") wmi.unshift("JT");
    const [a, b] = yearRange(m), now = new Date().getFullYear(), to = Math.min(b === 9999 ? now : b, now);
    const years = a >= 1980 && to >= a ? Array.from({ length: to - a + 1 }, (_, i) => a + i) : [];
    return { wmi, years, codes: years.map(y => VIN_YEARS[(y - 1980) % 30]) };
  }
  /* сверка VIN с выбранным лекалом: марка + модельный год */
  function vinCheck(m, raw) {
    if (isFrame(raw)) return { state: "frame", text: "Это номер кузова праворульного автомобиля — менеджер сверит его с лекалом вручную." };
    const d = decodeVin(raw);
    if (!d) return { state: "bad", text: "VIN — 17 символов: латинские буквы без I, O, Q и цифры." };
    const bn = d.brands.map(brandName).join(" / ");
    if (!d.brands.length) return { state: "unknown", d, text: `Марку по коду ${d.wmi} определить не удалось${d.year ? `, модельный год — ${d.year}` : ""}. Менеджер сверит VIN при подтверждении заказа.` };
    if (m && !d.brands.includes(m.b)) return { state: "brand", d, text: `По VIN это ${bn}, а выбраны чехлы на ${carName(m)}. Проверьте автомобиль.` };
    if (m && d.year && !yearMatch(m, d.year)) {
      const alt = (FAMILIES[m.f] ? FAMILIES[m.f].items : []).filter(x => x.s !== m.s && yearMatch(x, d.year));
      return { state: "year", d, alt, text: `Модельный год по VIN — ${d.year}, а выбранный кузов выпускался ${yearsText(m).replace(/^с /, "с ")}. Похоже, нужен другой кузов.` };
    }
    return { state: "ok", d, text: `${bn}${d.year ? `, ${d.year} модельный год` : ""} — совпадает с выбранным автомобилем. Комплектацию салона уточнит менеджер.` };
  }
  function vinTarget(d) { return d && d.brands.length ? `${URL_.brand(d.brands[0])}&vin=${d.vin}${d.year ? "&year=" + d.year : ""}` : null; }
  /* Полная расшифровка — на сервере (/api/vin): справочник кодов производителей мира, правила VDS по маркам,
     коды кузова праворульных «японцев» и VIN, сверенные менеджерами. Без связи — локальная расшифровка выше. */
  const vinCache = {};
  async function vinApi(q, model) {
    const k = q + "|" + (model || "");
    if (!vinCache[k]) {
      const r = await api("/vin?q=" + encodeURIComponent(q) + (model ? "&model=" + encodeURIComponent(model) : ""), null, { timeout: 6000 });
      if (!r.ok) return null;
      vinCache[k] = r.data;
    }
    return vinCache[k];
  }
  const vinLike = q => { const c = cleanVin(q); return isVin(c) || isFrame(q) || (c.length >= 9 && c.length <= 16 && /^[A-HJ-NPR-Z0-9]+$/.test(c) && /\d/.test(c)); };
  const vinMatchLinks = d => d.matches.map(m => `<a class="link" href="${m.url}">${esc(m.title)}${m.salon ? " · " + esc(m.salon) : ""}${m.years ? " · " + esc(m.years) : ""}</a>`).join("<br>");
  const saveVin = v => { try { localStorage.setItem("as_vin", v); } catch (e) {} };
  /* форма «найти по VIN» */
  function initVinForm(root) {
    const input = $("[data-vin-input]", root), go = $("[data-vin-go]", root);
    /* поле ответа в блоке подбора лежит рядом с формой VIN, а не внутри неё */
    const out = $("[data-vin-out]", root) || (root.closest(".picker") && $("[data-vin-out]", root.closest(".picker")));
    if (!input || !out) return;
    const run = async e => {
      e && e.preventDefault();
      const raw = input.value.trim(); if (!raw) { input.focus(); return; }
      if (go) go.disabled = true;
      const sd = await vinApi(raw);
      if (go) go.disabled = false;
      if (sd && sd.kind !== "invalid") {
        saveVin(sd.vin || raw.toUpperCase());
        if (sd.matches.length === 1) { location.href = sd.matches[0].url; return; }
        if (sd.matches.length) { out.innerHTML = `<span class="vin-msg vin-msg--ok">${esc(sd.message)} Выберите:<br>${vinMatchLinks(sd)}</span>`; return; }
        if (sd.brand_url) { location.href = sd.brand_url; return; }
        out.innerHTML = `<span class="vin-msg vin-msg--warn">${esc(sd.message)}${sd.level === "maker" || (sd.vehicle && sd.vehicle.model) ? ` <a class="link" href="custom.html">Индивидуальный пошив</a>` : ""}</span>`;
        return;
      }
      if (sd) { out.innerHTML = `<span class="vin-msg vin-msg--warn">${esc(sd.message)}</span>`; return; }
      if (isFrame(raw)) { out.innerHTML = `<span class="vin-msg vin-msg--warn">Это номер кузова праворульного автомобиля. Выберите марку и модель — менеджер сверит номер кузова с лекалом.</span>`; return; }
      const d = decodeVin(raw);
      if (!d) { out.innerHTML = `<span class="vin-msg vin-msg--warn">VIN — 17 символов: латинские буквы без I, O, Q и цифры.</span>`; return; }
      if (!d.brands.length) { out.innerHTML = `<span class="vin-msg vin-msg--warn">Марку по коду ${esc(d.wmi)} определить не удалось. Выберите автомобиль вручную или оставьте VIN менеджеру.</span>`; return; }
      if (d.brands.length > 1) { out.innerHTML = `<span class="vin-msg">По VIN: ${d.brands.map(id => `<a class="link" href="${URL_.brand(id)}&vin=${d.vin}${d.year ? "&year=" + d.year : ""}">${esc(brandName(id))}</a>`).join(" или ")}${d.year ? `, ${d.year} модельный год` : ""}. Выберите марку.</span>`; return; }
      location.href = vinTarget(d);
    };
    go && go.addEventListener("click", run);
    input.addEventListener("keydown", e => { if (e.key === "Enter") run(e); });
  }
  $$("[data-vin-form]").forEach(f => { initVinForm(f); attachVinSuggest($("[data-vin-input]", f)); });
  /* блок подбора: переключатель «марка и модель» ↔ «VIN» */
  function pickerVin(p, on) {
    if (!p) return;
    p.classList.toggle("is-vin", on);
    $$("[data-picker-tab]", p).forEach(b => { const act = (b.dataset.pickerTab === "vin") === on; b.classList.toggle("is-active", act); b.setAttribute("aria-selected", act); });
    if (on) setTimeout(() => { const i = $("[data-vin-input]", p); i && i.focus({ preventScroll: true }); }, 60);
  }
  $$("[data-picker-tab]").forEach(b => b.addEventListener("click", () => pickerVin(b.closest(".picker"), b.dataset.pickerTab === "vin")));
  $$("[data-vin-tile]").forEach(t => t.addEventListener("click", e => { const p = $("#podbor"); if (!p) return; e.preventDefault(); p.scrollIntoView({ behavior: "smooth", block: "center" }); pickerVin(p, true); }));
  if (location.hash === "#vin" && $("#podbor")) { pickerVin($("#podbor"), true); setTimeout(() => $("#podbor").scrollIntoView({ block: "center" }), 120); }

  /* ---------- подсказки при вводе VIN или номера кузова (/api/vin/suggest) ----------
     «XTA» → лекала Lada, «XTA2190» → Granta седан, «NZE14» → Corolla Axio/Fielder. Чем больше символов, тем короче список. */
  const sugCache = {};
  async function vinSuggestApi(q, brand) {
    const k = q + "|" + (brand || "");
    if (!sugCache[k]) {
      const r = await api(`/vin/suggest?q=${encodeURIComponent(q)}${brand ? "&brand=" + encodeURIComponent(brand) : ""}`, null, { timeout: 5000 });
      if (!r.ok) return null;
      sugCache[k] = r.data;
    }
    return sugCache[k];
  }
  /* в общем поиске подсказки VIN — когда есть цифры или по названию ничего не нашлось («XTA», «Z94C», «NZE14») */
  const sugLike = (q, found) => { const c = cleanVin(q); return c.length >= 3 && c.length <= 17 && /^[A-Z0-9]+$/.test(c) && (/\d/.test(c) || !found); };
  const sugItem = it => `<a class="search__item" href="${it.url}" data-slug="${it.slug}"><img src="${brandLogo(it.brand)}" alt=""><div><div class="t">${esc(it.title)}</div><div class="s">${esc([it.salon, it.years || "все годы"].filter(Boolean).join(" · "))} · <span class="search__why">${esc(it.why)}${it.sure ? "" : ", вероятно"}</span></div></div><div class="p">от ${fmt(it.price_from)}</div></a>`;
  function sugHtml(d, exclude = []) {
    if (!d || d.kind === "none" || d.kind === "invalid") return "";
    const items = d.items.filter(it => !exclude.includes(it.slug));
    let h = `<div class="search__group">Подходят по ${d.kind.startsWith("frame") ? "номеру кузова" : "VIN"}</div>`;
    if (d.message) h += `<div class="search__hint">${esc(d.message)}</div>`;
    h += items.map(sugItem).join("");
    if (d.more) h += `<div class="search__hint">и ещё ${d.more} — введите больше символов, список сузится</div>`;
    if (d.other && d.other.length) h += `<a class="search__item search__item--custom" href="custom.html"><span class="search__plus">+</span><div><div class="t">${esc(d.other.join(", "))}</div><div class="s">Готовых лекал нет — сошьём на заказ</div></div></a>`;
    if (!items.length && !(d.other && d.other.length)) {
      if (exclude.length) return "";
      h += `<div class="search__empty">По этим символам автомобилей в каталоге нет. Проверьте VIN или выберите марку и модель в каталоге.</div>`;
    }
    return h;
  }
  /* выпадающий список подсказок у поля VIN: подбор на главной, страница марки, конструктор */
  function attachVinSuggest(input, opts = {}) {
    if (!input || input._sug) return null;
    input._sug = true;
    let box = input.closest(".search");
    if (!box) { box = document.createElement("span"); box.className = "vin-sug"; input.parentNode.insertBefore(box, input); box.appendChild(input); }
    const drop = document.createElement("div");
    drop.className = "search__drop"; drop.setAttribute("role", "listbox");
    box.appendChild(drop);
    input.setAttribute("aria-autocomplete", "list");
    let t, active = -1;
    const close = () => { drop.classList.remove("is-open"); active = -1; };
    const render = async () => {
      const q = input.value.trim();
      if (cleanVin(q).length < 3) { close(); return; }
      const d = await vinSuggestApi(q, opts.brand);
      if (input.value.trim() !== q) return;
      const h = sugHtml(d);
      if (!h) { close(); return; }
      drop.innerHTML = h; drop.classList.add("is-open"); active = -1;
      place();
    };
    /* в окне заявки (прокручиваемая панель) список раскрываем вверх, если снизу не хватает места */
    const place = () => {
      const panel = input.closest(".modal__panel");
      drop.classList.remove("search__drop--up"); drop.style.maxHeight = "";
      if (!panel) return;
      const r = input.getBoundingClientRect(), c = panel.getBoundingClientRect();
      const below = c.bottom - r.bottom - 12, above = r.top - c.top - 12;
      if (below < 260 && above > below) { drop.classList.add("search__drop--up"); drop.style.maxHeight = Math.max(160, above) + "px"; }
      else drop.style.maxHeight = Math.max(160, below) + "px";
    };
    input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(render, 180); });
    input.addEventListener("focus", () => { if (cleanVin(input.value).length >= 3) render(); });
    /* в фазе перехвата: стрелки и Enter по подсказке срабатывают раньше «Найти по VIN» */
    input.addEventListener("keydown", e => {
      const els = $$(".search__item", drop), open = drop.classList.contains("is-open");
      if (e.key === "Escape") { close(); return; }
      if (!open || !els.length) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        active = e.key === "ArrowDown" ? Math.min(active + 1, els.length - 1) : Math.max(active - 1, 0);
        els.forEach((el, i) => el.classList.toggle("is-active", i === active)); els[active].scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") {
        if (active >= 0) { e.preventDefault(); e.stopImmediatePropagation(); els[active].click(); } else close();
      }
    }, true);
    drop.addEventListener("click", e => {
      const a = e.target.closest(".search__item"); if (!a) return;
      const v = input.value.trim().toUpperCase(); if (vinLike(v)) saveVin(v);   /* «NZE14» — ещё не номер, не запоминаем */
      if (a.dataset.slug && opts.onPick) { e.preventDefault(); opts.onPick(a.dataset.slug); close(); }
    });
    document.addEventListener("click", e => { if (!box.contains(e.target)) close(); });
    return { close };
  }
  function initSearch(root) {
    const input = $("input", root), drop = $(".search__drop", root), btn = $("button", root);
    if (!input || !drop) return;
    let active = -1;
    const close = () => { drop.classList.remove("is-open"); active = -1; };
    const render = () => {
      const q = input.value, { models, brands } = search(q);
      if (norm(q).length < 2) { close(); return; }
      let html = "", local = "";
      const vd = decodeVin(q);
      if (vd) local = '<div class="search__group">Поиск по VIN</div>' + (vd.brands.length ? vd.brands.map(id => `<a class="search__item" href="${URL_.brand(id)}&vin=${vd.vin}${vd.year ? "&year=" + vd.year : ""}"><img src="${brandLogo(id)}" alt=""><div><div class="t">${esc(brandName(id))}${vd.year ? `, ${vd.year} модельный год` : ""}</div><div class="s">Показать модели с лекалами на этот год</div></div></a>`).join("") : `<div class="search__empty">VIN распознан, но марку по коду ${esc(vd.wmi)} определить не удалось — выберите автомобиль в каталоге или оставьте VIN менеджеру.</div>`);
      else if (isFrame(q)) local = `<div class="search__empty">Похоже на номер кузова праворульного автомобиля. Выберите марку и модель — менеджер сверит номер кузова с лекалом.</div>`;
      if (brands.length) html += '<div class="search__group">Марки</div>' + brands.map(b => `<a class="search__item" href="${URL_.brand(b.id)}"><img src="${brandLogo(b.id)}" alt=""><div><div class="t">${hl(b.n, q)}</div><div class="s">${b.fams.length} моделей в каталоге</div></div><div class="p">Все модели</div></a>`).join("");
      if (models.length) html += '<div class="search__group">Модели и поколения</div>' + models.map(m => `<a class="search__item" href="${URL_.pos(m)}"><img src="${brandLogo(m.b)}" alt=""><div><div class="t">${hl(carName(m), q)}</div><div class="s">${esc([m.v, yearsText(m)].filter(Boolean).join(" · "))}</div></div><div class="p">от ${fmt(m.p[0])}</div></a>`).join("");
      /* начало VIN или номера кузова — подсказки с сервера: какие автомобили каталога подходят */
      const sq = sugLike(q, models.length + brands.length) ? q : "";
      const notFound = `<div class="search__empty" data-empty>По запросу <b>${esc(q)}</b> ничего не нашли. Попробуйте латиницей или только модель — «Camry», «Солярис». Нет вашей модели — <a href="custom.html"><b>закажите индивидуальный пошив</b></a>.</div>`;
      if (!html && !local) html = sq ? '<div class="search__hint" data-empty>Ищем автомобили по VIN…</div>' : notFound;
      drop.innerHTML = (sq ? `<div data-vin-slot>${local}</div>` : local) + html; drop.classList.add("is-open"); active = -1;
      clearTimeout(root._vinT);
      if (sq) root._vinT = setTimeout(() => vinSuggestApi(sq).then(d => {
        const slot = $("[data-vin-slot]", drop), h = sugHtml(d, models.map(m => m.s)), empty = $("[data-empty]", drop);
        if (!slot || input.value !== q) return;
        if (!h) { if (empty) empty.outerHTML = notFound; return; }
        slot.innerHTML = h;
        if (empty) empty.remove();
      }), 200);
    };
    input.addEventListener("input", render);
    input.addEventListener("focus", () => { if (input.value.length >= 2) render(); });
    input.addEventListener("keydown", e => {
      const els = $$(".search__item", drop);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (!drop.classList.contains("is-open")) render(); active = e.key === "ArrowDown" ? Math.min(active + 1, els.length - 1) : Math.max(active - 1, 0); els.forEach((el, i) => el.classList.toggle("is-active", i === active)); els[active]?.scrollIntoView({ block: "nearest" }); }
      else if (e.key === "Enter") { e.preventDefault(); const t = els[active >= 0 ? active : 0]; if (t) location.href = t.getAttribute("href"); }
      else if (e.key === "Escape") close();
    });
    btn?.addEventListener("click", e => { e.preventDefault(); const f = $(".search__item", drop); if (f) location.href = f.getAttribute("href"); else render(); });
    document.addEventListener("click", e => { if (!root.contains(e.target)) close(); });
  }
  $$("[data-search]").forEach(initSearch);

  /* ---------- подбор марка → модель → поколение (селекты) ---------- */
  function initPicker(root, onChange) {
    const bSel = $("[data-pick-brand]", root), fSel = $("[data-pick-fam]", root), gSel = $("[data-pick-gen]", root), go = $("[data-pick-go]", root);
    if (!bSel) return null;
    const st = { b: "", f: "", m: "" };
    bSel.innerHTML = '<option value="">Марка</option>' + sortedBrands().map(b => `<option value="${b.id}">${esc(b.n)}</option>`).join("");
    const fillFams = () => {
      const b = BRAND[st.b]; fSel.disabled = !b;
      fSel.innerHTML = '<option value="">Модель</option>' + (b ? b.fams.map(f => `<option value="${f.id}">${esc(f.n)}</option>`).join("") : "");
      fillGens();
    };
    const fillGens = () => {
      const f = FAMILIES[st.f]; if (!gSel) return; gSel.disabled = !f;
      gSel.innerHTML = '<option value="">Поколение, кузов</option>' + (f ? f.items.map(m => `<option value="${m.s}">${esc([m.g, m.v].filter(Boolean).join(", ") || "Все версии")}${m.y ? " · " + esc(m.y) : ""}</option>`).join("") : "");
      if (f && f.items.length === 1) { gSel.value = f.items[0].s; st.m = f.items[0].s; }
    };
    const target = () => st.m ? URL_.pos(BY_SLUG[st.m]) : st.f ? URL_.fam(FAMILIES[st.f]) : st.b ? URL_.brand(st.b) : "catalog.html";
    bSel.addEventListener("change", () => { st.b = bSel.value; st.f = ""; st.m = ""; fillFams(); onChange && onChange(st); });
    fSel.addEventListener("change", () => { st.f = fSel.value; st.m = ""; fillGens(); onChange && onChange(st); });
    gSel?.addEventListener("change", () => { st.m = gSel.value; onChange && onChange(st); });
    go?.addEventListener("click", e => { e.preventDefault(); location.href = target(); });
    const set = slug => { const m = BY_SLUG[slug]; if (!m) return; st.b = m.b; bSel.value = m.b; fillFams(); st.f = m.f; fSel.value = m.f; fillGens(); st.m = m.s; if (gSel) gSel.value = m.s; onChange && onChange(st); };
    fillFams();
    return { st, set };
  }
  $$("[data-picker]").forEach(p => initPicker(p));

  $$("[data-studio]").forEach(el => { el.innerHTML = customCard(null); });

  /* ---------- высота шапки для липких блоков ---------- */
  const hdr = $(".header");
  const setHeaderH = () => hdr && document.documentElement.style.setProperty("--header-h", hdr.offsetHeight + "px");
  setHeaderH(); addEventListener("resize", setHeaderH); addEventListener("load", setHeaderH);

  /* ---------- выбор города ---------- */
  const CITIES = ["Москва", "Санкт-Петербург", "Новосибирск", "Екатеринбург", "Казань", "Нижний Новгород", "Красноярск", "Челябинск", "Самара", "Уфа", "Ростов-на-Дону", "Краснодар", "Омск", "Воронеж", "Пермь", "Волгоград", "Тюмень", "Хабаровск", "Владивосток", "Иркутск", "Саратов", "Тольятти", "Барнаул", "Ижевск", "Ярославль", "Томск", "Оренбург", "Кемерово", "Минск", "Алматы", "Астана"];
  const cityName = () => { try { return localStorage.getItem("as_city") || "Москва"; } catch (e) { return "Москва"; } };
  window.AS_city = cityName;
  $$("[data-city-name]").forEach(el => el.textContent = cityName());
  const cityModal = $("[data-city-modal]");
  if (cityModal) {
    const list = $("[data-city-list]", cityModal), filter = $("[data-city-filter]", cityModal);
    const render = q => { const t = (q || "").toLowerCase(); list.innerHTML = CITIES.filter(c => c.toLowerCase().includes(t)).map(c => `<button type="button" class="city-list__item${c === cityName() ? " is-active" : ""}" data-city="${c}">${c}</button>`).join("") || `<div class="muted small" style="padding:10px">Доставим в любой населённый пункт — уточните у менеджера.</div>`; };
    const open = () => { cityModal.classList.add("is-open"); document.body.style.overflow = "hidden"; render(""); setTimeout(() => filter.focus(), 50); };
    const close = () => { cityModal.classList.remove("is-open"); document.body.style.overflow = ""; };
    $$("[data-city-open]").forEach(b => b.addEventListener("click", open));
    $$("[data-city-close]", cityModal).forEach(b => b.addEventListener("click", close));
    filter.addEventListener("input", () => render(filter.value));
    list.addEventListener("click", e => { const b = e.target.closest("[data-city]"); if (!b) return; try { localStorage.setItem("as_city", b.dataset.city); } catch (err) {} $$("[data-city-name]").forEach(el => el.textContent = b.dataset.city); close(); toast("Город: " + b.dataset.city); document.dispatchEvent(new CustomEvent("city:change")); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  }

  /* ---------- «Задать вопрос»: модалка из подвала, кнопки [data-ask-open] (значение "consult" — сразу консультация) ----------
     Два режима: вопрос (kind question, текст обязателен) и консультация (kind contact, перезвонит оператор, текст по желанию) */
  const askModal = $("[data-ask-modal]");
  if (askModal) {
    const close = () => { askModal.classList.remove("is-open"); document.body.style.overflow = ""; };
    const ASK = {
      question: { kind: "question", topic: "Вопрос", title: "Задать вопрос", note: "Ответим в рабочее время — по телефону или на почту.", contact: "Телефон или e-mail", type: "text", ph: "+7 или почта", msg: "Вопрос", msgPh: "Например: подойдут ли чехлы на мой автомобиль?", req: true, btn: "Отправить вопрос", done: "Вопрос отправлен. Менеджер ответит в рабочее время" },
      consult: { kind: "contact", topic: "Консультация", title: "Получить консультацию", note: "Оставьте телефон — в рабочее время вам перезвонит оператор и поможет подобрать чехлы.", contact: "Телефон", type: "tel", ph: "+7 (___) ___-__-__", msg: "Комментарий", msgPh: "Марка, модель, год или удобное время для звонка", req: false, btn: "Заказать консультацию", done: "Заявка на консультацию отправлена. В рабочее время вам перезвонит оператор" }
    };
    const form = $("form", askModal);
    const setMode = key => {
      const m = ASK[key] || ASK.question, msg = $("textarea[name=message]", form), contact = $("input[name=contact]", form), btn = $("[type=submit]", form);
      $$("[data-ask-mode]", askModal).forEach(b => { const on = b.dataset.askMode === key; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on); });
      $("[data-ask-title]", askModal).textContent = m.title; $("[data-ask-note]", askModal).textContent = m.note;
      $("[data-ask-contact-label]", askModal).textContent = m.contact; contact.type = m.type; contact.placeholder = m.ph;
      $("[data-ask-msg-label]", askModal).textContent = m.msg; msg.placeholder = m.msgPh; msg.required = m.req;
      form.dataset.form = m.kind; form.dataset.formMessage = m.done; $("input[name=topic]", form).value = m.topic;
      btn.textContent = btn.dataset.label = m.btn;
    };
    $$("[data-ask-mode]", askModal).forEach(b => b.addEventListener("click", () => setMode(b.dataset.askMode)));
    document.addEventListener("click", e => { const t = e.target.closest("[data-ask-open]"); if (!t) return; e.preventDefault(); setMode(t.dataset.askOpen === "consult" ? "consult" : "question"); askModal.classList.add("is-open"); document.body.style.overflow = "hidden"; setTimeout(() => $("input[name=name]", askModal).focus(), 50); });
    $$("[data-ask-close]", askModal).forEach(b => b.addEventListener("click", close));
    $("form", askModal).addEventListener("form:sent", close);
    document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  }

  /* ---------- копирование в буфер: [data-copy="селектор"] — для списка dl копируем «термин: значение» построчно ---------- */
  document.addEventListener("click", async e => {
    const b = e.target.closest("[data-copy]"); if (!b) return;
    const src = $(b.dataset.copy); if (!src) return;
    const rows = $$("dt", src);
    const text = rows.length ? rows.map(dt => `${dt.textContent.trim()}: ${dt.nextElementSibling ? dt.nextElementSibling.textContent.trim() : ""}`).join("\n") : src.innerText.trim();
    try { await navigator.clipboard.writeText(text); toast(b.dataset.copyDone || "Скопировано"); }
    catch (er) {
      /* нет доступа к буферу (http, запрет браузера) — копируем через скрытое поле, иначе выделяем текст */
      const ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;left:-9999px;top:0"; document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand("copy"); } catch (er2) {} ta.remove();
      if (ok) toast(b.dataset.copyDone || "Скопировано");
      else { const r = document.createRange(); r.selectNodeContents(src); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); toast("Текст выделен — нажмите Ctrl+C или ⌘+C"); }
    }
  });

  /* ---------- формы: согласия, маска телефона, проверка телефона и e-mail ----------
     Согласие на обработку ПДн — обязательное, отдельным документом (soglasie.html, ст. 9 152-ФЗ).
     Согласие на рекламную рассылку — необязательное; по решению заказчика отмечено заранее (MARKETING_DEFAULT).
     В статичной форме блок согласий — <div class="field full" data-consent></div>, в формах из JS — AS.consentHtml(). */
  const MARKETING_DEFAULT = true;
  function consentHtml(o = {}) {
    const mk = o.marketing == null ? MARKETING_DEFAULT : o.marketing;
    return `<div class="consent">
      <label class="check check--lg"><input type="checkbox" name="consent" required${o.consent ? " checked" : ""}><i aria-hidden="true"></i><span>Даю <a href="soglasie.html" target="_blank">согласие на обработку персональных данных</a> на условиях <a href="privacy.html" target="_blank">политики конфиденциальности</a></span></label>
      <label class="check check--lg"><input type="checkbox" name="marketing"${mk ? " checked" : ""}><i aria-hidden="true"></i><span>Согласен получать новости и специальные предложения — <a href="rassylka.html" target="_blank">условия рассылки</a></span></label>
    </div>`;
  }
  const consentNote = label => `<p class="form-note">Нажимая «${esc(label)}», вы подтверждаете согласие на <a href="soglasie.html" target="_blank">обработку персональных данных</a> и соглашаетесь с <a href="privacy.html" target="_blank">политикой конфиденциальности</a> и условиями <a href="offer.html" target="_blank">публичной оферты</a>.</p>`;
  const EMAIL_RE = /^[A-Za-z0-9._%+\-]{1,64}@[A-Za-z0-9.\-]{1,190}\.[A-Za-zА-Яа-я]{2,24}$/;
  /* те же правила, что на сервере (backend/app/schemas.py → normalize_phone) */
  function phoneOk(raw) {
    raw = String(raw || "").trim();
    let d = raw.replace(/\D/g, "");
    if (d.length === 11 && d[0] === "8") d = "7" + d.slice(1);
    else if (d.length === 10 && "3456789".includes(d[0])) d = "7" + d;
    if (d.length === 11 && d[0] === "7") return d[1] !== "0" && d[1] !== "1";
    return raw.startsWith("+") && d.length >= 10 && d.length <= 15;
  }
  /* маска +7 (900) 000-00-00; номер другой страны можно ввести с «+» и своим кодом — тогда маска не мешает */
  function phoneMask(el) {
    if (el._mask) return; el._mask = true;
    const fmt = d => {
      let s = "+7";
      if (d.length > 1) s += " (" + d.slice(1, 4);
      if (d.length >= 4) s += ")";
      if (d.length > 4) s += " " + d.slice(4, 7);
      if (d.length > 7) s += "-" + d.slice(7, 9);
      if (d.length > 9) s += "-" + d.slice(9, 11);
      return s;
    };
    const foreign = v => /^\+[0-689]/.test(v.trim());
    const apply = del => {
      const v = el.value;
      if (foreign(v)) { el.value = "+" + v.replace(/[^\d ()-]/g, "").slice(0, 22); return; }
      let d = v.replace(/\D/g, "");
      if (!d) { el.value = ""; el._d = ""; return; }
      if (d[0] === "8") d = "7" + d.slice(1); else if (d[0] !== "7") d = "7" + d;
      d = d.slice(0, 11);
      if (del && d === el._d) d = d.slice(0, -1);   /* стёрли скобку или дефис — стираем и цифру перед ними */
      el._d = d;
      el.value = d.length > 1 ? fmt(d) : "+7";
    };
    el.addEventListener("input", e => apply(/^delete/.test(e.inputType || "")));
    el.addEventListener("focus", () => { if (!el.value) { el.value = "+7 ("; el._d = "7"; } });
    el.addEventListener("blur", () => { if (el.value.replace(/\D/g, "") === "7") { el.value = ""; el._d = ""; } });
    if (el.value) apply(false);
  }
  function setErr(el, msg) {
    const field = el.closest(".field, .consent") || el.parentNode;
    /* в блоке согласий два чекбокса — у каждого своя строка ошибки */
    let box = [...field.querySelectorAll(":scope > .field__err")].find(b => b._el === el);
    if (!msg) { el.classList.remove("is-invalid"); el._err = false; if (box) box.remove(); return; }
    el.classList.add("is-invalid"); el._err = true;
    if (!box) {
      box = document.createElement("p"); box.className = "field__err"; box._el = el;
      if (el.type === "checkbox" && el.closest("label")) el.closest("label").after(box); else field.appendChild(box);
    }
    box.textContent = msg;
  }
  function fieldError(el) {
    const v = (el.value || "").trim(), name = el.name || "";
    if (el.type === "checkbox") return el.required && !el.checked ? (name === "consent" ? "Отметьте согласие на обработку персональных данных" : "Отметьте, чтобы продолжить") : "";
    if (el.required && !v) return el.type === "tel" || name === "phone" ? "Укажите телефон" : name === "contact" ? "Укажите телефон или e-mail" : "Заполните поле";
    if (!v) return "";
    if (el.type === "tel" || name === "phone") return phoneOk(v) ? "" : "Проверьте номер: +7 (900) 000-00-00";
    if (el.type === "email" || name === "email") return EMAIL_RE.test(v) ? "" : "Проверьте e-mail: например, name@mail.ru";
    if (name === "contact") return (v.includes("@") ? EMAIL_RE.test(v) : phoneOk(v)) ? "" : "Укажите телефон +7 (900) 000-00-00 или e-mail";
    return "";
  }
  function checkForm(form) {
    let first = null;
    $$("input, select, textarea", form).forEach(el => {
      if (el.type === "hidden" || el.classList.contains("hp") || el.disabled || el.closest("[hidden]")) return;
      const msg = fieldError(el);
      setErr(el, msg);
      if (msg && !first) first = el;
    });
    if (first) { first.focus({ preventScroll: true }); first.scrollIntoView({ block: "center", behavior: "smooth" }); }
    return !first;
  }
  function enhanceForm(form) {
    if (!form || form._enh) return; form._enh = true;
    form.setAttribute("novalidate", "");
    $$("[data-consent]", form).forEach(box => { box.innerHTML = consentHtml(); });
    $$("input[type=tel], input[name=phone]", form).forEach(phoneMask);
    const btn = form.querySelector("[type=submit]") || (form.id && document.querySelector(`[type=submit][form="${form.id}"]`));
    if (btn && form.querySelector("[name=consent]")) {
      const after = btn.closest(".field") && form.contains(btn) ? btn.closest(".field") : btn;
      if (!(after.nextElementSibling && after.nextElementSibling.classList.contains("form-note"))) after.insertAdjacentHTML("afterend", consentNote((btn.dataset.label || btn.textContent).trim()));
    }
    /* ошибку показываем, когда человек ушёл из поля, и убираем, как только исправил */
    form.addEventListener("focusout", e => { const el = e.target; if (el.matches && el.matches("input[type=tel], input[type=email], input[name=phone], input[name=email], input[name=contact]") && el.value.trim()) setErr(el, fieldError(el)); });
    const recheck = e => { const el = e.target; if (el._err && !fieldError(el)) setErr(el, ""); };
    form.addEventListener("input", recheck);
    form.addEventListener("change", recheck);
  }
  /* проверка раньше обработчиков формы: при ошибке заявка не уходит, обработчики формы не вызываются */
  document.addEventListener("submit", e => {
    const form = e.target;
    if (form && form._enh && !checkForm(form)) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  $$("form").forEach(f => { if (f.querySelector("[data-consent], [name=consent], input[type=checkbox][required]")) enhanceForm(f); });

  /* ---------- cookie: баннер и выбор посетителя ----------
     as_cookie: all — все, включая аналитику; necessary / none — только необходимые (без них сайт не работает).
     Счётчики аналитики подключать только при AS.cookieOk("analytics"). */
  const COOKIE_KEY = "as_cookie";
  const cookieChoice = () => { try { return (JSON.parse(localStorage.getItem(COOKIE_KEY) || "null") || {}).v || ""; } catch (e) { return ""; } };
  const cookieOk = kind => kind === "necessary" || cookieChoice() === "all";
  function cookieBanner() {
    if (document.querySelector(".cookie")) return;
    const el = document.createElement("div");
    el.className = "cookie"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Настройки cookie");
    el.innerHTML = `<div class="cookie__text"><b>Мы используем cookie</b><p>Необходимые cookie нужны для работы корзины, избранного и форм. Аналитические помогают улучшать сайт — включим их только с вашего согласия. Подробнее — в <a href="cookies.html">политике cookie</a>.</p></div>
      <div class="cookie__btns"><button type="button" class="btn cookie__btn cookie__btn--no" data-cookie="none">Отказаться</button><button type="button" class="btn cookie__btn cookie__btn--min" data-cookie="necessary">Только необходимые</button><button type="button" class="btn btn--primary cookie__btn" data-cookie="all">Принять все</button></div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("is-open"));
    el.addEventListener("click", e => {
      const b = e.target.closest("[data-cookie]"); if (!b) return;
      try { localStorage.setItem(COOKIE_KEY, JSON.stringify({ v: b.dataset.cookie, at: new Date().toISOString() })); } catch (er) {}
      el.classList.remove("is-open"); setTimeout(() => el.remove(), 300);
      document.dispatchEvent(new CustomEvent("cookie:change", { detail: b.dataset.cookie }));
    });
  }
  if (!cookieChoice()) setTimeout(cookieBanner, 600);
  document.addEventListener("click", e => { if (e.target.closest("[data-cookie-open]")) { e.preventDefault(); cookieBanner(); } });

  /* ---------- формы заявок → /api/requests; data-form — тип: question, contact, wholesale, review ---------- */
  $$("form[data-form]").forEach(form => {
    guardForm(form);
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const btn = form.querySelector("[type=submit]"), label = btn ? (btn.dataset.label || btn.textContent) : "";
      if (btn) { btn.disabled = true; btn.textContent = "Отправляем…"; }
      const f = new FormData(form), get = k => String(f.get(k) || "").trim(), consent = form.querySelector("input[type=checkbox][required]");
      const res = await api("/requests", { kind: form.dataset.form || "question", name: get("name"), phone: get("phone"), contact: get("contact"), email: get("email"), city: get("city"), topic: get("topic"), car: get("car"), message: [get("message")].concat($$("[data-note]", form).map(i => i.value.trim() ? `${i.dataset.note}: ${i.value.trim()}` : "")).filter(Boolean).join("\n"), vin: get("vin"), consent: consent ? consent.checked : false, marketing: !!(form.querySelector("[name=marketing]") || {}).checked, meta: formMeta(form) });
      if (btn) { btn.disabled = false; btn.textContent = label || "Отправить"; }
      if (!res.ok) { fieldErrors(form, res); toast(res.error); return; }
      form.reset(); form._t0 = Date.now();
      toast(form.dataset.formMessage || "Заявка отправлена. В рабочее время вам перезвонит оператор");
      form.dispatchEvent(new CustomEvent("form:sent"));
    });
  });

  /* ---------- вкладки, галерея, блоки по data-атрибутам ---------- */
  $$("[data-tabs]").forEach(box => { const btns = $$("[data-tab]", box), panes = $$("[data-pane]", box); btns.forEach(b => b.addEventListener("click", () => { btns.forEach(x => x.classList.toggle("is-active", x === b)); panes.forEach(p => p.classList.toggle("is-active", p.dataset.pane === b.dataset.tab)); })); });
  $$("[data-products]").forEach(box => { const list = (window.AS_PRODUCTS || []).filter(p => p.cat === box.dataset.products); box.innerHTML = list.map(productCard).join("") || '<div class="empty">Товары появятся позже</div>'; });
  /* data-posts-exclude="auto" — не показывать статью, на странице которой стоит блок «Читайте также» */
  $$("[data-posts]").forEach(box => { const n = +box.dataset.posts || 3, ex = box.dataset.postsExclude === "auto" ? (location.pathname.split("/").pop() || "").replace(/\.html$/, "") : box.dataset.postsExclude || ""; box.innerHTML = (window.AS_POSTS || []).filter(p => p.slug !== ex).slice(0, n).map(p => postCard(p)).join(""); });

  window.AS_accPrice = accPrice;
  window.AS_colorDot = colorDot;
  window.AS_vin = { decodeVin, vinCheck, vinHint, isVin, isFrame, yearMatch, cleanVin, api: vinApi, vinLike, suggest: attachVinSuggest };
  window.AS = { api, formMeta, guardForm, fieldErrors, consentHtml, enhanceForm, checkForm, phoneOk, cookieOk, cookieBanner, seoBlock, SEO_PART, minPrices, famStats, $, $$, esc, fmt, qs, plural, ICON, BRANDS, MODELS, BRAND, BY_SLUG, FAMILIES, VARIANTS, ALL_VARIANTS, VAR, HITS, ADDONS, addonsFor, varPhotos, MAT_NAME, sortedBrands, brandName, brandLogo, genName, carName, yearsText, famPhoto, posPhoto, varPhoto, carRender, priceOf, oldPriceOf, discountOf, priceHtml, URL: URL_, coverCard, customCard, famCard, genCard, productCard, postCard, toast, Cart, Fav, badges, initPicker, search };
  window.AS_cart = Cart; window.AS_fav = Fav; window.AS_postCard = postCard; window.AS_productCard = productCard;
  badges();
})();
