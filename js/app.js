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
  const fmt = n => Math.round(n).toLocaleString("ru-RU") + " ₽";
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
    f.fresh = f.items.some(m => (m.yr || 0) >= 2015);
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
  /* Стандартные сочетания из реальных материалов каталога: номера цветов — со страниц моделей 1avtochehol.ru.
     Фото — работы ателье с ближайшим сочетанием цветов. */
  const VARIANTS = [
    { id: "eco-black", mat: 1, name: "Экокожа, чёрный", code: "№ 100", photo: "seat8", sw: ["eco-black", "eco-black"] },
    { id: "eco-grey", mat: 1, name: "Экокожа, чёрный + серые вставки", code: "№ 100 + № 102", photo: "seat10", sw: ["eco-black", "eco-grey"] },
    { id: "eco-beige", mat: 1, name: "Экокожа, чёрный + бежевые вставки", code: "№ 100 + № 113", photo: "5p", sw: ["eco-black", "eco-beige"] },
    { id: "eco-blue", mat: 1, name: "Экокожа, чёрный + синяя перфорация", code: "№ 100 + № 107", photo: "seat1", sw: ["eco-black", "eco-blue"] },
    { id: "eco-red", mat: 1, name: "Экокожа, чёрный + красная перфорация", code: "№ 100 + № 108", photo: "avtochehol3", sw: ["eco-black", "eco-red"] },
    { id: "eco-orange", mat: 1, name: "Экокожа, чёрный + оранжевая перфорация", code: "№ 100 + № 109", photo: "seat11", sw: ["eco-black", "eco-orange"] },
    { id: "eco-paprika", mat: 1, name: "Экокожа, чёрный + перфорация «паприка»", code: "№ 100 + № 118", photo: "seat7", sw: ["eco-black", "eco-chestnut"] },
    { id: "alc-grey", mat: 2, name: "Алькантара светлая, боковины — чёрная экокожа", code: "№ 314", photo: "avtochehol1", sw: ["eco-black", "alca-grey"] },
    { id: "alc-black", mat: 2, name: "Алькантара тёмная, боковины — чёрная экокожа", code: "№ 215", photo: "3p", sw: ["eco-black", "alca-black"] },
    { id: "jac-black", mat: 0, name: "Жаккард «рогожка серая», боковины — чёрная экокожа", code: "№ 355", photo: "seat9", sw: ["eco-black", "jac-bw"], tag: "Выгодно" }
  ];
  const VAR = Object.fromEntries(VARIANTS.map(v => [v.id, v]));

  const brandName = id => (BRAND[id] || {}).n || id;
  const brandLogo = id => ASSETS + "brands/" + ((BRAND[id] || {}).logo || "toyota.jpg");
  const genName = m => [m.m, m.g].filter(Boolean).join(" ");
  const carName = m => brandName(m.b) + " " + genName(m);
  const yearsText = m => m.y || "все годы";
  const famPhoto = f => ASSETS + "photos/" + PHOTOS[hash(f.id) % PHOTOS.length] + ".jpg";
  const posPhoto = m => ASSETS + "photos/" + PHOTOS[hash(m.s) % PHOTOS.length] + ".jpg";
  const varPhoto = v => ASSETS + "photos/" + v.photo + ".jpg";
  /* Рендеры кузовов (assets/cars, белый фон, 16:10): лекало → файл, js/cars.js */
  const CAR_RENDERS = window.AS_CARS || {};
  const carRender = m => CAR_RENDERS[m.s] ? ASSETS + "cars/" + CAR_RENDERS[m.s] + ".png" : "";
  const priceOf = (m, v) => (m ? m.p : [7975, 9375, 9975])[v.mat];
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
      return { id, title: `Чехлы на ${carName(m)}`, sub: `${v.name} · ${yearsText(m)} · пошив до 3 недель`, price: priceOf(m, v), img: varPhoto(v), url: URL_.product(m, v) };
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
  const swatchDots = sw => `<div class="card__swatches">${sw.map(n => `<i style="background-image:url('${SW(n)}')"></i>`).join("")}</div>`;
  const coverCard = (m, v, opts = {}) => {
    const url = URL_.product(m, v), id = `cover:${m.s}:${v.id}`;
    const tag = opts.tag ?? v.tag;
    return `<article class="card">
      <a class="card__media" href="${url}"><img src="${varPhoto(v)}" alt="Чехлы на ${esc(carName(m))}, ${esc(v.name)}" loading="lazy" width="400" height="400">${tag ? `<div class="card__tags"><span class="card__tag${tag === "Премиум" ? " card__tag--dark" : tag === "Выгодно" ? " card__tag--white" : ""}">${tag}</span></div>` : ""}${opts.logo ? `<span class="card__logo"><img src="${brandLogo(m.b)}" alt=""></span>` : ""}${swatchDots(v.sw)}</a>
      <button type="button" class="card__fav" aria-label="В избранное" data-fav="${id}">${ICON.heart}</button>
      <div class="card__body">
        <a class="card__title" href="${url}">Чехлы на ${esc(carName(m))}, ${esc(v.name.toLowerCase())}</a>
        <div class="card__meta"><span>${esc(yearsText(m))}</span><span class="card__ready">Заводские лекала</span></div>
        <div class="card__foot"><div class="price">${fmt(priceOf(m, v))}</div><button type="button" class="cart-btn" data-add="${id}" aria-label="В корзину">${ICON.cart}</button></div>
      </div>
    </article>`;
  };
  const customCard = (m, wide) => `<a class="custom-card${wide ? " custom-card--wide" : ""}" href="${URL_.custom(m)}">
      <div class="custom-card__body">
        <span class="tag tag--yellow">Индивидуальный пошив</span>
        <h3>${m ? "Соберите свои чехлы на " + esc(carName(m)) : "Соберите чехлы под свой вкус"}</h3>
        <p>Не нашли подходящее сочетание? Выберите цвет боковин, материал и цвет вставок — менеджер уточнит комплектацию салона и рассчитает стоимость.</p>
        <ul><li>Экокожа, перфорация, алькантара, жаккард</li><li>21 цвет вставок по номерам каталога</li><li>Учитываем спинку, подлокотник и подголовники</li></ul>
        <div class="custom-card__price"><div><small>комплект от</small><b>${fmt(m ? Math.min(...m.p) : 7975)}</b><small>итог рассчитает менеджер</small></div><span class="btn btn--primary">Открыть конструктор ${ICON.arrow}</span></div>
      </div>
      <div class="custom-card__visual"><img src="${ASSETS}photos/avtochehol1.jpg" alt="" loading="lazy"><div class="pal">${["eco-black", "eco-grey", "eco-beige", "eco-red", "eco-blue", "eco-orange", "alca-grey", "eco-choco"].map(n => `<i style="background-image:url('${SW(n)}')"></i>`).join("")}</div></div>
    </a>`;
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
      <div class="fam__media${car ? " fam__media--car" : ""}"><img src="${car || famPhoto(f)}" alt="Чехлы на ${esc(brandName(f.b) + " " + f.n)}" loading="lazy">${f.fresh ? '<span class="tag tag--yellow">Есть свежие поколения</span>' : ""}</div>
      <div class="fam__body">
        <div class="fam__title">${esc(brandName(f.b))} ${esc(f.n)}</div>
        <div class="fam__years">${esc(st.years)}</div>
        <div class="fam__stats"><span><b>${st.gens}</b> ${plural(st.gens, "поколение", "поколения", "поколений")}</span><span><b>${n}</b> ${plural(n, "лекало", "лекала", "лекал")}</span></div>
        <div class="fam__foot"><div class="price"><small>комплект</small>${priceRange(f.min, st.max)}</div><span class="btn btn--ghost btn--sm">Выбрать</span></div>
      </div>
    </a>`;
  };
  /* Аксессуары: цены не публикуем (их нет на старом сайте) — «цена по запросу»; demo — пример позиции */
  const accPrice = p => p.gift ? `<div class="price">В подарок<small>к комплекту чехлов</small></div>` : `<div class="price price--ask">Цена по запросу${p.note ? `<small>${esc(p.note)}</small>` : ""}</div>`;
  const productCard = p => `<article class="card${p.demo ? " card--demo" : ""}">
      <a class="card__media" href="${URL_.acc(p)}"><img src="${p.img}" alt="${esc(p.title)}" loading="lazy" width="400" height="400">${p.demo ? `<div class="card__tags"><span class="card__tag card__tag--white">Пример</span></div>` : p.gift ? `<div class="card__tags"><span class="card__tag card__tag--sale">Акция</span></div>` : ""}</a>
      <button type="button" class="card__fav" aria-label="В избранное" data-fav="product:${p.id}">${ICON.heart}</button>
      <div class="card__body"><a class="card__title" href="${URL_.acc(p)}">${esc(p.title)}</a><div class="card__meta"><span>${esc(p.sub || "")}</span></div>
      <div class="card__foot">${accPrice(p)}<a class="btn btn--ghost btn--sm" href="${URL_.acc(p)}">Подробнее</a></div></div>
    </article>`;
  const postCard = (p, wide) => `<a class="post${wide ? " post--wide" : ""}" href="${p.slug}.html"><div class="post__img"><img src="${p.img}" alt="" loading="lazy"></div><div class="post__body"><div class="post__meta"><span class="tag">${esc(p.tag)}</span>${p.date ? `<span>${esc(p.date)}</span>` : ""}</div><div class="post__title">${esc(p.title)}</div><div class="post__lead">${esc(p.lead)}</div></div></a>`;
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
    if (acc) acc.innerHTML = sortedBrands().map(b => `<details><summary><img src="${brandLogo(b.id)}" alt="" loading="lazy"><span>${esc(b.n)}</span><small>${b.fams.length}</small></summary><div class="acc__models">${b.fams.map(f => `<a href="${URL_.fam(f)}"><b>${esc(f.n)}</b> · ${f.items.length} ${plural(f.items.length, "лекало", "лекала", "лекал")}</a>`).join("")}<a class="more" href="${URL_.brand(b.id)}">Все модели ${esc(b.n)} →</a></div></details>`).join("");
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
      pane.innerHTML = `<div class="mega__title"><img src="${brandLogo(id)}" alt=""><div><h3>Чехлы на ${esc(b.n)}</h3><span>${b.fams.length} ${plural(b.fams.length, "модель", "модели", "моделей")} · ${b.cnt} ${plural(b.cnt, "лекало", "лекала", "лекал")} · комплект от ${fmt(Math.min(...b.fams.map(f => f.min)))}</span></div><a class="link" href="${URL_.brand(id)}">Все модели ${esc(b.n)} ${ICON.arrow}</a></div>
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
      sl.classList.toggle("is-light", slides[i].classList.contains("slide--yellow"));
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
  function initSearch(root) {
    const input = $("input", root), drop = $(".search__drop", root), btn = $("button", root);
    if (!input || !drop) return;
    let active = -1;
    const close = () => { drop.classList.remove("is-open"); active = -1; };
    const render = () => {
      const q = input.value, { models, brands } = search(q);
      if (norm(q).length < 2) { close(); return; }
      let html = "";
      if (brands.length) html += '<div class="search__group">Марки</div>' + brands.map(b => `<a class="search__item" href="${URL_.brand(b.id)}"><img src="${brandLogo(b.id)}" alt=""><div><div class="t">${hl(b.n, q)}</div><div class="s">${b.fams.length} моделей в каталоге</div></div><div class="p">Все модели →</div></a>`).join("");
      if (models.length) html += '<div class="search__group">Модели и поколения</div>' + models.map(m => `<a class="search__item" href="${URL_.pos(m)}"><img src="${brandLogo(m.b)}" alt=""><div><div class="t">${hl(carName(m), q)}</div><div class="s">${esc([m.v, yearsText(m)].filter(Boolean).join(" · "))}</div></div><div class="p">от ${fmt(m.p[0])}</div></a>`).join("");
      if (!html) html = `<div class="search__empty">По запросу <b>${esc(q)}</b> ничего не нашли. Попробуйте латиницей или только модель — «Camry», «Солярис». Нет вашей модели — <a href="custom.html"><b>закажите индивидуальный пошив</b></a>.</div>`;
      drop.innerHTML = html; drop.classList.add("is-open"); active = -1;
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

  /* ---------- формы (демо-отправка) ---------- */
  $$("form[data-form]").forEach(form => form.addEventListener("submit", e => {
    e.preventDefault();
    const btn = form.querySelector("[type=submit]"); if (btn) { btn.disabled = true; btn.textContent = "Отправляем…"; }
    setTimeout(() => { form.reset(); if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || "Отправить"; } toast(form.dataset.formMessage || "Заявка отправлена. В рабочее время вам перезвонит оператор"); }, 600);
  }));

  /* ---------- вкладки, галерея, блоки по data-атрибутам ---------- */
  $$("[data-tabs]").forEach(box => { const btns = $$("[data-tab]", box), panes = $$("[data-pane]", box); btns.forEach(b => b.addEventListener("click", () => { btns.forEach(x => x.classList.toggle("is-active", x === b)); panes.forEach(p => p.classList.toggle("is-active", p.dataset.pane === b.dataset.tab)); })); });
  $$("[data-products]").forEach(box => { const list = (window.AS_PRODUCTS || []).filter(p => p.cat === box.dataset.products); box.innerHTML = list.map(productCard).join("") || '<div class="empty">Товары появятся позже</div>'; });
  $$("[data-posts]").forEach(box => { const n = +box.dataset.posts || 3, ex = box.dataset.postsExclude || ""; box.innerHTML = (window.AS_POSTS || []).filter(p => p.slug !== ex).slice(0, n).map(p => postCard(p)).join(""); });

  window.AS_accPrice = accPrice;
  window.AS = { $, $$, esc, fmt, qs, plural, ICON, BRANDS, MODELS, BRAND, BY_SLUG, FAMILIES, VARIANTS, VAR, MAT_NAME, sortedBrands, brandName, brandLogo, genName, carName, yearsText, famPhoto, posPhoto, varPhoto, carRender, priceOf, URL: URL_, coverCard, customCard, famCard, productCard, postCard, toast, Cart, Fav, badges, initPicker, search };
  window.AS_cart = Cart; window.AS_fav = Fav; window.AS_postCard = postCard; window.AS_productCard = productCard;
  badges();
})();
