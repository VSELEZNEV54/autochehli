/* =====================================================================
   АВТОСТИЛЬ — прототип фронта. Мега-меню, поиск, баннер, калькулятор.
   Бэкенда нет: данные из data.js, цены демонстрационные.
   ===================================================================== */
(function () {
  "use strict";

  document.documentElement.classList.add("js");
  const BRANDS = window.AS_BRANDS || [];
  const MODELS = window.AS_MODELS || [];
  const BRAND_BY_ID = Object.fromEntries(BRANDS.map(b => [b.id, b]));
  const ASSETS = (document.body.dataset.assets || "assets") + "/";
  const POPULAR = ["toyota", "hyundai", "kia", "lada", "renault", "nissan", "volkswagen", "skoda", "mitsubishi", "mazda", "ford", "chevrolet", "honda", "suzuki", "subaru", "opel", "peugeot", "uaz", "gaz"];

  /* ---------- ценообразование (демо) ---------- */
  const BASE = { b: 5490, c: 5990, d: 6490, suv: 6990, mpv: 8490, pickup: 6990 };
  const CLASS_NAME = { b: "B-класс", c: "C-класс", d: "D-класс", suv: "Кроссовер / внедорожник", mpv: "Минивэн / 7 мест", pickup: "Пикап" };
  const MATERIALS = {
    jacquard:  { name: "Жаккард",              add: 0,    photo: "seat9.jpg" },
    eco:       { name: "Экокожа",              add: 1500, photo: "seat1.jpg" },
    ecoperf:   { name: "Экокожа + перфорация", add: 2000, photo: "seat12.jpg" },
    alcantara: { name: "Экокожа + алькантара", add: 3000, photo: "avtochehol1.jpg" },
    flock:     { name: "Флок",                 add: 1000, photo: "seat3.jpg" }
  };
  const OPTIONS = {
    rhomb:   { name: "Стёжка «ромб»",               add: 1200 },
    armrest: { name: "Чехол на задний подлокотник", add: 600 },
    airbag:  { name: "Молнии под Airbag в спинках", add: 0 },
    seats7:  { name: "Третий ряд (7 мест)",         add: 2500 },
    mats:    { name: "Коврики EVA в цвет чехлов",   add: 3900 },
    install: { name: "Установка в мастерской",      add: 2500 },
    wheel:   { name: "Оплётка на руль",             add: 0, gift: 500 }
  };
  const COLORS = {
    black: { name: "Чёрный", sw: "eco-black.jpg" }, grey: { name: "Серый", sw: "eco-grey.jpg" },
    beige: { name: "Бежевый", sw: "eco-beige.jpg" }, cream: { name: "Кремовый", sw: "eco-cream.jpg" },
    red: { name: "Красный", sw: "eco-red.jpg" }, orange: { name: "Оранжевый", sw: "eco-orange.jpg" },
    blue: { name: "Синий", sw: "eco-blue.jpg" }, navy: { name: "Тёмно-синий", sw: "eco-navy.jpg" },
    choco: { name: "Шоколад", sw: "eco-choco.jpg" }, chestnut: { name: "Каштан", sw: "eco-chestnut.jpg" },
    cherry: { name: "Вишня", sw: "eco-cherry.jpg" }, pink: { name: "Розовый", sw: "eco-pink.jpg" }
  };
  window.AS_PRICING = { BASE, MATERIALS, OPTIONS, COLORS, CLASS_NAME };

  const fmt = n => Math.round(n).toLocaleString("ru-RU") + " ₽";
  const priceFrom = m => BASE[m.c] || BASE.c;
  window.AS_priceFrom = priceFrom;

  /* ---------- утилиты ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const brandName = id => (BRAND_BY_ID[id] || {}).n || id;
  const brandLogo = id => ASSETS + "brands/" + ((BRAND_BY_ID[id] || {}).logo || "toyota.jpg");
  const modelUrl = m => "car.html?m=" + encodeURIComponent(m.slug);
  const brandUrl = id => "brand.html?b=" + encodeURIComponent(id);
  const modelPhoto = m => ASSETS + "photos/" + (m.p || "seat1") + ".jpg";
  const yearsText = y => window.AS_years(y);
  const sortedBrands = () => BRANDS.filter(b => b.cnt).slice().sort((a, b) => {
    const ia = POPULAR.indexOf(a.id), ib = POPULAR.indexOf(b.id);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return a.n.localeCompare(b.n, "ru");
  });
  window.AS = { fmt, brandName, brandLogo, modelUrl, brandUrl, modelPhoto, yearsText, MODELS, BRANDS, BRAND_BY_ID, ASSETS, POPULAR, sortedBrands };

  /* ---------- toast ---------- */
  let toastEl;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; document.body.appendChild(toastEl); }
    toastEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>${esc(msg)}`;
    toastEl.classList.add("is-on");
    clearTimeout(toastEl._t); toastEl._t = setTimeout(() => toastEl.classList.remove("is-on"), 3200);
  }
  window.AS_toast = toast;
  document.addEventListener("click", e => { const b = e.target.closest("[data-toast]"); if (b) { e.preventDefault(); e.stopPropagation(); toast(b.dataset.toast); } });

  /* ---------- мобильное меню ---------- */
  const drawer = $("[data-drawer]");
  function openDrawer(tab) {
    if (!drawer) return;
    drawer.classList.add("is-open"); document.body.style.overflow = "hidden";
    if (tab) $$("[data-drawer-tab]", drawer).forEach(b => { if (b.dataset.drawerTab === tab) b.click(); });
  }
  const closeDrawer = () => { drawer?.classList.remove("is-open"); document.body.style.overflow = ""; };
  $$("[data-drawer-open]").forEach(b => b.addEventListener("click", () => openDrawer(b.dataset.drawerOpen)));
  $$("[data-drawer-close]").forEach(b => b.addEventListener("click", closeDrawer));
  if (drawer) {
    const tabs = $$("[data-drawer-tab]", drawer), panes = $$("[data-drawer-pane]", drawer);
    tabs.forEach(t => t.addEventListener("click", () => { tabs.forEach(x => x.classList.toggle("is-active", x === t)); panes.forEach(p => p.classList.toggle("is-active", p.dataset.drawerPane === t.dataset.drawerTab)); }));
    const acc = $("[data-drawer-catalog]", drawer);
    if (acc) acc.innerHTML = sortedBrands().map(b => {
      const models = MODELS.filter(m => m.b === b.id).slice().sort((a, c) => a.n.localeCompare(c.n));
      return `<details><summary><img src="${brandLogo(b.id)}" alt="" loading="lazy"><span>${esc(b.n)}</span><small>${b.cnt}</small></summary><div class="acc__models">${models.slice(0, 12).map(m => `<a href="${modelUrl(m)}"><b>${esc(m.n)}</b> · ${esc(yearsText(m.y))}</a>`).join("")}<a class="more" href="${brandUrl(b.id)}">Все ${models.length} моделей ${esc(b.n)} →</a></div></details>`;
    }).join("");
  }

  /* ---------- мега-меню каталога ---------- */
  const mega = $("[data-mega]"), megaBg = $("[data-mega-bg]"), megaBtn = $("[data-mega-toggle]");
  if (mega && megaBtn) {
    const list = $("[data-mega-brands]", mega), pane = $("[data-mega-models]", mega);
    let current = null, hoverT;
    list.innerHTML = sortedBrands().map(b => `<a class="mega__brand" href="${brandUrl(b.id)}" data-brand="${b.id}"><img src="${brandLogo(b.id)}" alt="" loading="lazy"><span>${esc(b.n)}</span><small>${b.cnt}</small></a>`).join("");
    const showBrand = id => {
      if (current === id) return; current = id;
      $$(".mega__brand", list).forEach(el => el.classList.toggle("is-active", el.dataset.brand === id));
      const b = BRAND_BY_ID[id], models = MODELS.filter(m => m.b === id).slice().sort((a, c) => a.n.localeCompare(c.n));
      let html = `<div class="mega__title"><img src="${brandLogo(id)}" alt=""><div><h3>Авточехлы на ${esc(b.n)}</h3><span>${models.length} моделей · пошив 3 дня · от ${fmt(Math.min(...models.map(priceFrom)))}</span></div><a class="link" href="${brandUrl(id)}">Все модели марки →</a></div>`;
      if (!models.length) html += `<div class="mega__empty">Лекала снимаем под заказ — <a href="#" data-toast="Заявка на новое лекало (демо)">оставьте заявку</a>.</div>`;
      else {
        html += '<div class="mega__cols">'; let letter = "";
        models.forEach(m => {
          const L = m.n[0].toUpperCase();
          if (L !== letter) { letter = L; html += `<div class="mega__letter">${L}</div>`; }
          html += `<a href="${modelUrl(m)}">${esc(m.n)}<span>${esc(yearsText(m.y))}</span></a>`;
        });
        html += "</div>";
      }
      pane.innerHTML = html;
    };
    list.addEventListener("mouseover", e => { const el = e.target.closest(".mega__brand"); if (!el) return; clearTimeout(hoverT); hoverT = setTimeout(() => showBrand(el.dataset.brand), 60); });
    list.addEventListener("focusin", e => { const el = e.target.closest(".mega__brand"); if (el) showBrand(el.dataset.brand); });
    const open = () => { showBrand(current || "toyota"); mega.classList.add("is-open"); megaBg.classList.add("is-open"); megaBtn.classList.add("is-open"); megaBtn.setAttribute("aria-expanded", "true"); };
    const close = () => { mega.classList.remove("is-open"); megaBg.classList.remove("is-open"); megaBtn.classList.remove("is-open"); megaBtn.setAttribute("aria-expanded", "false"); };
    megaBtn.addEventListener("click", e => { e.preventDefault(); if (window.innerWidth <= 1024) { openDrawer("catalog"); return; } mega.classList.contains("is-open") ? close() : open(); });
    $$("[data-mega-open]").forEach(el => el.addEventListener("click", e => { e.preventDefault(); if (window.innerWidth <= 1024) openDrawer("catalog"); else { window.scrollTo({ top: 0, behavior: "smooth" }); open(); } }));
    megaBg.addEventListener("click", close);
    document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    document.addEventListener("click", e => { if (mega.classList.contains("is-open") && !mega.contains(e.target) && !megaBtn.contains(e.target) && !e.target.closest("[data-mega-open]")) close(); });
  }

  /* ---------- баннер-слайдер ---------- */
  $$("[data-banner]").forEach(b => {
    const track = $(".banner__track", b), slides = $$(".slide", b), dots = $(".banner__dots", b);
    let i = 0, timer;
    dots.innerHTML = slides.map((_, k) => `<button type="button" aria-label="Слайд ${k + 1}"></button>`).join("");
    const go = n => {
      i = (n + slides.length) % slides.length;
      track.style.transform = `translateX(-${i * 100}%)`;
      $$("button", dots).forEach((d, k) => d.classList.toggle("is-active", k === i));
      b.classList.toggle("is-dark", slides[i].classList.contains("slide--graphite"));
    };
    const play = () => { clearInterval(timer); timer = setInterval(() => go(i + 1), 6000); };
    $$("button", dots).forEach((d, k) => d.addEventListener("click", () => { go(k); play(); }));
    $(".banner__arrow--prev", b)?.addEventListener("click", () => { go(i - 1); play(); });
    $(".banner__arrow--next", b)?.addEventListener("click", () => { go(i + 1); play(); });
    b.addEventListener("mouseenter", () => clearInterval(timer));
    b.addEventListener("mouseleave", play);
    let x0 = null;
    b.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; }, { passive: true });
    b.addEventListener("touchend", e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) go(dx < 0 ? i + 1 : i - 1); x0 = null; play(); });
    go(0); play();
  });

  /* ---------- умный поиск ---------- */
  const TR = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya" };
  const norm = s => String(s || "").toLowerCase().replace(/ё/g, "е").replace(/[()«»"'.,/]/g, " ").replace(/\s+/g, " ").trim();
  const translit = s => norm(s).replace(/[а-я]/g, ch => TR[ch] ?? ch);
  function lev(a, b) {
    if (a === b) return 0; if (!a.length) return b.length; if (!b.length) return a.length;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[b.length];
  }
  const INDEX = MODELS.map(m => {
    const b = BRAND_BY_ID[m.b] || { n: m.b, s: "" };
    const lat = norm(b.n + " " + m.n + " " + m.slug.replace(/[_-]/g, " "));
    const cyrTokens = norm(b.s + " " + (m.s || "")).split(" ").filter(Boolean);
    return { m, latTokens: lat.split(" "), cyrTokens, cyrTokensTr: cyrTokens.map(translit) };
  });
  function tokenScore(q, entry) {
    const qt = translit(q);
    let best = 0;
    const check = (tok, tokTr, weightExact, weightPrefix) => {
      if (!tok) return;
      if (tok === q || tokTr === qt) best = Math.max(best, weightExact);
      else if (tok.startsWith(q) || tokTr.startsWith(qt)) best = Math.max(best, weightPrefix);
      else if (tok.length >= 3 && q.length >= 3 && (q.startsWith(tok) || qt.startsWith(tokTr))) best = Math.max(best, weightPrefix - 0.5);
      else if (/^\d{2,}$/.test(q) && tok.includes(q)) best = Math.max(best, 1.5);
      else if (q.length >= 4 && tokTr.length >= 4 && lev(qt, tokTr) <= (q.length >= 6 ? 2 : 1)) best = Math.max(best, 1.2);
    };
    entry.latTokens.forEach(t => check(t, t, 3, 2));
    entry.cyrTokens.forEach((t, i) => check(t, entry.cyrTokensTr[i], 3, 2));
    return best;
  }
  function search(query, limit = 8) {
    const q = norm(query);
    if (q.length < 2) return { models: [], brands: [] };
    const tokens = q.split(" ").filter(Boolean);
    const scored = [];
    for (const e of INDEX) {
      let total = 0, matched = 0;
      for (const t of tokens) { const s = tokenScore(t, e); if (s > 0) { total += s; matched++; } }
      if (matched === tokens.length && total > 0) { if (/^с /.test(e.m.y || "")) total += 0.15; scored.push({ m: e.m, score: total }); }
    }
    scored.sort((a, b) => b.score - a.score || a.m.n.localeCompare(b.m.n));
    const brands = BRANDS.filter(b => { const n = norm(b.n), s = norm(b.s); return tokens.some(t => n.startsWith(t) || s.split(" ").some(x => x.startsWith(t)) || (t.length >= 4 && lev(translit(t), n) <= 1)); }).slice(0, 3);
    return { models: scored.slice(0, limit).map(x => x.m), brands };
  }
  window.AS_search = search;
  function highlight(text, query) {
    const tokens = norm(query).split(" ").filter(t => t.length >= 2);
    let out = esc(text);
    tokens.forEach(t => { out = out.replace(new RegExp("(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "i"), "<mark>$1</mark>"); });
    return out;
  }
  function initSearch(root) {
    const input = $("input", root), drop = $(".search__drop", root), btn = $("button", root);
    if (!input || !drop) return;
    let active = -1;
    const close = () => { drop.classList.remove("is-open"); active = -1; };
    const render = () => {
      const q = input.value; const { models, brands } = search(q);
      if (norm(q).length < 2) { close(); return; }
      let html = "";
      if (brands.length) { html += '<div class="search__group">Марки</div>' + brands.map(b => `<a class="search__item" href="${brandUrl(b.id)}"><img src="${brandLogo(b.id)}" alt=""><div><div class="t">${highlight(b.n, q)}</div><div class="s">${b.cnt} моделей в каталоге</div></div><div class="p">Все чехлы →</div></a>`).join(""); }
      if (models.length) { html += '<div class="search__group">Модели</div>' + models.map(m => `<a class="search__item" href="${modelUrl(m)}"><img src="${brandLogo(m.b)}" alt=""><div><div class="t">${highlight(brandName(m.b) + " " + m.n, q)}</div><div class="s">${esc(yearsText(m.y))} · ${CLASS_NAME[m.c]}</div></div><div class="p">от ${fmt(priceFrom(m))}</div></a>`).join(""); }
      if (!html) html = `<div class="search__empty">По запросу <b>${esc(q)}</b> ничего не нашли. Попробуйте латиницей или укажите только модель — «Camry», «Солярис».</div>`;
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

  /* ---------- калькулятор (мастер на главной и карточка товара) ---------- */
  class Calculator {
    constructor(root) {
      this.root = root;
      this.state = { model: null, material: root.dataset.material || "eco", side: "black", insert: "grey", opts: new Set(["airbag", "wheel"]), step: 1 };
      this.steps = $$("[data-wizard-pane]", root).length;
      this.maxStep = 1;
      this.bind(); this.update(); if (this.steps) this.goStep(1);
    }
    bind() {
      const r = this.root, s = this.state;
      const bSel = $("[data-calc-brand]", r), mSel = $("[data-calc-model]", r);
      if (bSel && mSel) {
        bSel.innerHTML = '<option value="">Выберите марку</option>' + sortedBrands().map(b => `<option value="${b.id}">${esc(b.n)}</option>`).join("");
        const fillModels = id => {
          const list = MODELS.filter(m => m.b === id).slice().sort((a, c) => a.n.localeCompare(c.n));
          mSel.disabled = !list.length;
          mSel.innerHTML = '<option value="">' + (list.length ? "Выберите модель" : "Сначала марку") + "</option>" + list.map(m => `<option value="${esc(m.slug)}">${esc(m.n)} · ${esc(yearsText(m.y))}</option>`).join("");
        };
        bSel.addEventListener("change", () => { fillModels(bSel.value); s.model = null; $$("[data-calc-pick]", r).forEach(c => c.classList.remove("is-selected")); this.update(); });
        mSel.addEventListener("change", () => { s.model = MODELS.find(m => m.slug === mSel.value) || null; $$("[data-calc-pick]", r).forEach(c => c.classList.toggle("is-selected", s.model && c.dataset.calcPick === s.model.slug)); this.update(); });
        const preset = r.dataset.model && MODELS.find(m => m.slug === r.dataset.model);
        if (preset) { bSel.value = preset.b; fillModels(preset.b); mSel.value = preset.slug; s.model = preset; } else fillModels("");
        this.bSel = bSel; this.mSel = mSel; this.fillModels = fillModels;
      } else if (r.dataset.model) s.model = MODELS.find(m => m.slug === r.dataset.model) || null;
      $$("[data-calc-pick]", r).forEach(ch => ch.addEventListener("click", () => {
        const m = MODELS.find(x => x.slug === ch.dataset.calcPick); if (!m) return;
        s.model = m; if (this.bSel) { this.bSel.value = m.b; this.fillModels(m.b); this.mSel.value = m.slug; }
        $$("[data-calc-pick]", r).forEach(c => c.classList.toggle("is-selected", c === ch));
        this.update();
      }));
      $$("[data-calc-material]", r).forEach(b => b.addEventListener("click", () => { s.material = b.dataset.calcMaterial; this.update(); }));
      const renderSw = (box, key) => {
        if (!box) return;
        box.innerHTML = Object.entries(COLORS).map(([id, c]) => `<button type="button" class="swatch${s[key] === id ? " is-selected" : ""}" title="${c.name}" data-color="${id}" style="background-image:url('${ASSETS}swatches/${c.sw}')" aria-label="${c.name}"></button>`).join("");
        $$(".swatch", box).forEach(b => b.addEventListener("click", () => { s[key] = b.dataset.color; renderSw(box, key); this.update(); }));
      };
      renderSw($("[data-calc-sides]", r), "side"); renderSw($("[data-calc-inserts]", r), "insert");
      $$("[data-calc-opt]", r).forEach(inp => { inp.checked = s.opts.has(inp.dataset.calcOpt); inp.addEventListener("change", () => { inp.checked ? s.opts.add(inp.dataset.calcOpt) : s.opts.delete(inp.dataset.calcOpt); this.update(); }); });
      $$("[data-calc-order]", r).forEach(b => b.addEventListener("click", () => {
        const c = this.compute(), m = s.model;
        window.AS_cart.add({ id: "cfg:" + (m ? m.slug : "any") + ":" + s.material + ":" + s.side + ":" + s.insert + ":" + [...s.opts].sort().join("+"), title: m ? `Авточехлы ${brandName(m.b)} ${m.n}` : "Авточехлы (модель уточним)", sub: `${c.mat.name} · ${COLORS[s.side].name} / ${COLORS[s.insert].name}` + ([...s.opts].filter(id => OPTIONS[id] && OPTIONS[id].add > 0).map(id => " · " + OPTIONS[id].name).join("")), price: c.total, old: c.old, img: ASSETS + "photos/" + c.mat.photo, url: m ? modelUrl(m) : "index.html#calc" });
        if (b.dataset.calcOrder === "go") location.href = "cart.html"; else toast("Добавлено в корзину");
      }));
      $$("[data-wizard-next]", r).forEach(b => b.addEventListener("click", () => this.goStep(s.step + 1)));
      $$("[data-wizard-prev]", r).forEach(b => b.addEventListener("click", () => this.goStep(s.step - 1)));
      $$("[data-wizard-goto]", r).forEach(b => b.addEventListener("click", () => this.goStep(+b.dataset.wizardGoto)));
      $$("[data-wizard-step]", r).forEach(b => b.addEventListener("click", () => { const n = +b.dataset.wizardStep; if (n <= this.maxStep) this.goStep(n); }));
    }
    goStep(n) {
      const s = this.state, r = this.root;
      if (!this.steps) return;
      n = Math.max(1, Math.min(this.steps, n)); s.step = n; this.maxStep = Math.max(this.maxStep, n);
      $$("[data-wizard-pane]", r).forEach(p => p.classList.toggle("is-active", +p.dataset.wizardPane === n));
      $$("[data-wizard-step]", r).forEach(b => { const k = +b.dataset.wizardStep; b.classList.toggle("is-active", k === n); b.classList.toggle("is-done", k < n); });
      $$("[data-wizard-prev]", r).forEach(b => b.disabled = n === 1);
      $$("[data-wizard-next]", r).forEach(b => { b.style.display = n === this.steps ? "none" : ""; b.textContent = n === this.steps - 1 ? "Показать итог" : "Далее"; });
      $$("[data-wizard-hint]", r).forEach(h => h.textContent = `Шаг ${n} из ${this.steps}`);
      $$("[data-calc-summary]", r).forEach(el => el.classList.toggle("is-final", n === this.steps));
      if (r.getBoundingClientRect().top < 0) r.scrollIntoView({ behavior: "smooth", block: "start" });
      this.update();
    }
    compute() {
      const s = this.state, m = s.model;
      const cls = m ? m.c : (this.root.dataset.class || "c");
      const base = BASE[cls], mat = MATERIALS[s.material];
      const lines = [{ n: `Комплект чехлов, ${CLASS_NAME[cls].toLowerCase()}`, v: base }, { n: mat.name, v: mat.add, free: mat.add === 0 }];
      let total = base + mat.add;
      s.opts.forEach(id => { const o = OPTIONS[id]; if (!o) return; lines.push({ n: o.name, v: o.add, free: o.add === 0, gift: o.gift }); total += o.add; });
      const old = Math.round(total * 1.18 / 10) * 10;
      return { total, old, lines, cls, mat };
    }
    update() {
      const s = this.state, r = this.root, c = this.compute();
      $$("[data-calc-material]", r).forEach(b => b.classList.toggle("is-selected", b.dataset.calcMaterial === s.material));
      const set = (sel, html) => $$(sel, r).forEach(el => el.innerHTML = html);
      set("[data-calc-total]", fmt(c.total)); set("[data-calc-old]", fmt(c.old)); set("[data-calc-save]", "−" + fmt(c.old - c.total));
      const carName = s.model ? `${brandName(s.model.b)} ${s.model.n}` : "";
      set("[data-calc-car]", s.model ? `${esc(carName)}<small>${esc(yearsText(s.model.y))} · ${CLASS_NAME[s.model.c]} · лекала в базе</small>` : `Автомобиль не выбран<small>Цена для ${CLASS_NAME[c.cls].toLowerCase()}а. Выберите модель на шаге 1</small>`);
      set("[data-calc-car-short]", s.model ? esc(carName) : "не выбран");
      set("[data-calc-lines]", c.lines.map(l => `<div><span class="${l.v ? "" : "muted"}">${esc(l.n)}</span><b class="${l.free ? "free" : ""}">${l.gift ? `<s class="muted">${fmt(l.gift)}</s> подарок` : (l.free ? "включено" : "+ " + fmt(l.v))}</b></div>`).join(""));
      const pv = $("[data-calc-preview]", r);
      if (pv) {
        const img = $("img", pv), next = ASSETS + "photos/" + c.mat.photo;
        if (img && !img.src.endsWith(c.mat.photo)) { img.style.opacity = 0; setTimeout(() => { img.src = next; img.onload = () => img.style.opacity = 1; }, 120); }
        const dots = $(".pv", pv); if (dots) dots.innerHTML = `<i style="background-image:url('${ASSETS}swatches/${COLORS[s.side].sw}')" title="Боковины: ${COLORS[s.side].name}"></i><i style="background-image:url('${ASSETS}swatches/${COLORS[s.insert].sw}')" title="Вставки: ${COLORS[s.insert].name}"></i>`;
      }
      set("[data-calc-colors]", `${COLORS[s.side].name} / ${COLORS[s.insert].name}`);
      set("[data-calc-material-name]", c.mat.name);
      set("[data-calc-opts]", [...s.opts].filter(id => OPTIONS[id] && OPTIONS[id].add > 0).map(id => OPTIONS[id].name).join(", ") || "без доплат");
      document.dispatchEvent(new CustomEvent("calc:update", { detail: c }));
    }
  }
  $$("[data-calc]").forEach(el => new Calculator(el));

  /* ---------- прочие механики ---------- */
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }), { threshold: 0.01 });
    $$(".reveal").forEach(el => io.observe(el));
  } else $$(".reveal").forEach(el => el.classList.add("is-in"));

  $$("[data-tabs]").forEach(box => {
    const btns = $$("[data-tab]", box), panes = $$("[data-pane]", box);
    btns.forEach(b => b.addEventListener("click", () => { btns.forEach(x => x.classList.toggle("is-active", x === b)); panes.forEach(p => p.classList.toggle("is-active", p.dataset.pane === b.dataset.tab)); }));
  });
  $$("[data-gallery]").forEach(g => {
    const main = $("[data-gallery-main]", g), thumbs = $$("[data-gallery-thumb]", g);
    thumbs.forEach(t => t.addEventListener("click", () => { thumbs.forEach(x => x.classList.toggle("is-active", x === t)); main.style.opacity = 0; setTimeout(() => { main.src = $("img", t).src; main.onload = () => main.style.opacity = 1; }, 120); }));
  });

  /* ---------- карточка товара (общий рендер) ---------- */
  window.AS_card = (m, tag) => {
    const p = priceFrom(m), old = Math.round(p * 1.18 / 10) * 10;
    return `<a class="card" href="${modelUrl(m)}">
      <div class="card__media"><img src="${modelPhoto(m)}" alt="Авточехлы ${esc(brandName(m.b))} ${esc(m.n)}" loading="lazy" width="400" height="340"><div class="card__logo"><img src="${brandLogo(m.b)}" alt=""></div>
        <div class="card__tags"><span class="card__tag card__tag--sale">−15 %</span>${tag ? `<span class="card__tag${tag === "Хит" ? "" : " card__tag--dark"}">${tag}</span>` : ""}</div>
        <button type="button" class="card__fav" aria-label="В избранное" data-fav="model:${m.slug}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 21s-7-4.6-9.3-9A5.2 5.2 0 0 1 12 6.4 5.2 5.2 0 0 1 21.3 12C19 16.4 12 21 12 21z"/></svg></button></div>
      <div class="card__body"><div class="card__title">Авточехлы ${esc(brandName(m.b))} ${esc(m.n)}</div>
        <div class="card__meta"><span>${esc(yearsText(m.y))}</span><span class="stars">★★★★★</span><span>${12 + (m.slug.length * 7) % 40} отзывов</span></div>
        <div class="card__foot"><div class="price">от ${fmt(p)}<s>${fmt(old)}</s><small>экокожа от ${fmt(p + 1500)}</small></div><span class="btn btn--primary btn--sm">Выбрать</span></div></div>
    </a>`;
  };
  /* ---------- корзина и избранное (localStorage) ---------- */
  const store = { get(k) { try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch (e) { return []; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const Cart = {
    items: store.get("as_cart"),
    save() { store.set("as_cart", this.items); updateBadges(); document.dispatchEvent(new CustomEvent("cart:change")); },
    add(item) { const ex = this.items.find(i => i.id === item.id); if (ex) ex.qty += item.qty || 1; else this.items.push(Object.assign({ qty: 1 }, item)); this.save(); },
    remove(id) { this.items = this.items.filter(i => i.id !== id); this.save(); },
    setQty(id, q) { const it = this.items.find(i => i.id === id); if (!it) return; it.qty = Math.max(1, q); this.save(); },
    clear() { this.items = []; this.save(); },
    count() { return this.items.reduce((n, i) => n + i.qty, 0); },
    total() { return this.items.reduce((n, i) => n + i.price * i.qty, 0); }
  };
  const Fav = {
    items: store.get("as_fav"),
    save() { store.set("as_fav", this.items); updateBadges(); document.dispatchEvent(new CustomEvent("fav:change")); },
    has(id) { return this.items.some(i => i.id === id); },
    toggle(item) { if (this.has(item.id)) this.items = this.items.filter(i => i.id !== item.id); else this.items.push(item); this.save(); return this.has(item.id); }
  };
  window.AS_cart = Cart; window.AS_fav = Fav;
  function updateBadges() {
    $$("[data-cart-count]").forEach(el => { el.textContent = Cart.count(); el.hidden = !Cart.count(); });
    $$("[data-fav-count]").forEach(el => { el.textContent = Fav.items.length; el.hidden = !Fav.items.length; });
    $$("[data-fav]").forEach(el => el.classList.toggle("is-on", Fav.has(el.dataset.fav)));
  }
  // разрешить объект по id: model:<slug> или product:<id>
  function resolveItem(id) {
    if (id.startsWith("model:")) { const m = MODELS.find(x => x.slug === id.slice(6)); if (!m) return null; return { id, title: `Авточехлы ${brandName(m.b)} ${m.n}`, sub: yearsText(m.y) + " · от " + fmt(priceFrom(m)), price: priceFrom(m), img: modelPhoto(m), url: modelUrl(m) }; }
    if (id.startsWith("product:")) { const p = (window.AS_PRODUCTS || []).find(x => x.id === id.slice(8)); if (!p) return null; return { id, title: p.title, sub: p.sub || "", price: p.price, old: p.old, img: p.img, url: p.url || (p.cat + ".html#" + p.id) }; }
    return null;
  }
  document.addEventListener("click", e => {
    const f = e.target.closest("[data-fav]");
    if (f) { e.preventDefault(); e.stopPropagation(); const it = resolveItem(f.dataset.fav); if (!it) return; const on = Fav.toggle(it); toast(on ? "Добавлено в избранное" : "Убрано из избранного"); return; }
    const a = e.target.closest("[data-add]");
    if (a) { e.preventDefault(); const it = resolveItem(a.dataset.add); if (!it) return; Cart.add(it); toast("Добавлено в корзину: " + it.title); if (a.dataset.addGo !== undefined) location.href = "cart.html"; }
  });
  updateBadges();

  /* ---------- выбор города ---------- */
  const CITIES = ["Москва", "Санкт-Петербург", "Новосибирск", "Екатеринбург", "Казань", "Нижний Новгород", "Красноярск", "Челябинск", "Самара", "Уфа", "Ростов-на-Дону", "Краснодар", "Омск", "Воронеж", "Пермь", "Волгоград", "Тюмень", "Хабаровск", "Владивосток", "Иркутск", "Саратов", "Тольятти", "Барнаул", "Ижевск", "Ульяновск", "Ярославль", "Махачкала", "Томск", "Оренбург", "Кемерово", "Минск", "Алматы", "Астана"];
  const cityModal = $("[data-city-modal]");
  const cityName = () => { try { return localStorage.getItem("as_city") || "Москва"; } catch (e) { return "Москва"; } };
  $$("[data-city-name]").forEach(el => el.textContent = cityName());
  if (cityModal) {
    const list = $("[data-city-list]", cityModal), filter = $("[data-city-filter]", cityModal);
    const render = q => { const t = (q || "").toLowerCase(); list.innerHTML = CITIES.filter(c => c.toLowerCase().includes(t)).map(c => `<button type="button" class="city-list__item${c === cityName() ? " is-active" : ""}" data-city="${c}">${c}</button>`).join("") || `<div class="muted small" style="padding:10px">Города нет в списке — доставим в любой населённый пункт, уточните у менеджера.</div>`; };
    const open = () => { cityModal.classList.add("is-open"); document.body.style.overflow = "hidden"; render(""); setTimeout(() => filter.focus(), 50); };
    const close = () => { cityModal.classList.remove("is-open"); document.body.style.overflow = ""; };
    $$("[data-city-open]").forEach(b => b.addEventListener("click", open));
    $$("[data-city-close]", cityModal).forEach(b => b.addEventListener("click", close));
    filter.addEventListener("input", () => render(filter.value));
    list.addEventListener("click", e => { const b = e.target.closest("[data-city]"); if (!b) return; try { localStorage.setItem("as_city", b.dataset.city); } catch (err) {} $$("[data-city-name]").forEach(el => el.textContent = b.dataset.city); close(); toast("Город: " + b.dataset.city + ". Сроки доставки обновлены"); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  }

  /* ---------- формы (демо-отправка) ---------- */
  $$("form[data-form]").forEach(form => form.addEventListener("submit", e => {
    e.preventDefault();
    const btn = form.querySelector("[type=submit]"); if (btn) { btn.disabled = true; btn.textContent = "Отправляем…"; }
    setTimeout(() => {
      if (form.dataset.form === "order") { Cart.clear(); location.href = "thanks.html"; return; }
      form.reset(); if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || "Отправить"; }
      toast(form.dataset.formMessage || "Заявка отправлена. Перезвоним в течение 15 минут");
    }, 600);
  }));

  /* ---------- сетка товаров (универсальные, накидки, коврики…) ---------- */
  window.AS_productCard = p => `<article class="card" id="${p.id}">
      <a class="card__media" href="${p.url || "#" + p.id}"><img src="${p.img}" alt="${esc(p.title)}" loading="lazy" width="400" height="340">${p.tag ? `<div class="card__tags"><span class="card__tag${p.tag === "Акция" ? " card__tag--sale" : p.tag === "Хит" ? "" : " card__tag--dark"}">${p.tag}</span></div>` : ""}</a>
      <button type="button" class="card__fav" aria-label="В избранное" data-fav="product:${p.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 21s-7-4.6-9.3-9A5.2 5.2 0 0 1 12 6.4 5.2 5.2 0 0 1 21.3 12C19 16.4 12 21 12 21z"/></svg></button>
      <div class="card__body"><div class="card__title">${esc(p.title)}</div><div class="card__meta"><span>${esc(p.sub || "")}</span>${p.rating ? `<span class="stars">★★★★★</span><span>${p.rating}</span>` : ""}</div>
      <div class="card__foot"><div class="price">${fmt(p.price)}${p.old ? `<s>${fmt(p.old)}</s>` : ""}${p.note ? `<small>${esc(p.note)}</small>` : ""}</div><button type="button" class="btn btn--primary btn--sm" data-add="product:${p.id}">В корзину</button></div></div>
    </article>`;
  $$("[data-products]").forEach(box => {
    const cat = box.dataset.products, list = (window.AS_PRODUCTS || []).filter(p => p.cat === cat);
    box.innerHTML = list.map(window.AS_productCard).join("") || `<div class="empty">Товары появятся позже</div>`;
    updateBadges();
  });
  /* ---------- блог: карточки статей ---------- */
  window.AS_postCard = (p, wide) => `<a class="post${wide ? " post--wide" : ""}" href="${p.slug}.html"><div class="post__img"><img src="${p.img}" alt="" loading="lazy"></div><div class="post__body"><div class="post__meta"><span class="tag">${esc(p.tag)}</span><span>${esc(p.date)}</span></div><div class="post__title">${esc(p.title)}</div><div class="post__lead">${esc(p.lead)}</div></div></a>`;
  $$("[data-posts]").forEach(box => {
    const n = +box.dataset.posts || 3, ex = box.dataset.postsExclude || "";
    box.innerHTML = (window.AS_POSTS || []).filter(p => p.slug !== ex).slice(0, n).map(p => window.AS_postCard(p)).join("");
  });
})();
