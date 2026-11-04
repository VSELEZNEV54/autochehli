/* Конструктор индивидуального пошива, по образцу простого конструктора пользователя (правка 04.11.2026). Разделы идут подряд справа:
   автомобиль → цвет основы (экокожа) → материал центральной вставки → цвет вставки → цвет отделочной нити (только у перфорированной кожи) → дополнительно.
   Превью сиденья слева закреплено (60 % ширины), полоса разделов сверху и цена с кнопками «В корзину» и «Заявка менеджеру» внизу всегда на экране.
   Материалы, цвета и доплаты — по «Дорожной карте продаж» (js/options.js, правится руками). Цену комплекта в заказе сервер считает сам
   по тому же options.js (backend/app/catalog.py, custom_quote), письмо с эскизом собирает тоже сервер (custom_describe). */
(function () {
  const A = window.AS, e = A.esc, root = document.querySelector("[data-builder]");
  if (!root) return;
  const $ = (s, r = root) => r.querySelector(s), $$ = (s, r = root) => [...r.querySelectorAll(s)];

  /* ---------- опции: js/options.js ---------- */
  const O = window.AS_OPTIONS;
  const MATS = Object.fromEntries(O.materials.map(m => [m.id, m]));
  const BASE = O.base;   /* экокожа «Аригон»: боковины, тыл, подголовники */
  const DESIGNS = Object.fromEntries(O.designs.map(d => [d.id, d]));
  const THREADS = Object.fromEntries(O.threads);
  const DEF_THREAD = "#a3a5ab";   /* обычная нить в тон — на превью */
  let THREAD = DEF_THREAD;
  const ICO = {
    classic: '<path d="M2 9h36M2 17h36"/>',
    romb: '<path d="M2 13 9 4l7 9 7-9 7 9 7-9M2 13l7 9 7-9 7 9 7-9 7 9"/>',
    plain: '<g fill="currentColor" stroke="none"><circle cx="10" cy="9" r="1.3"/><circle cx="17" cy="9" r="1.3"/><circle cx="24" cy="9" r="1.3"/><circle cx="31" cy="9" r="1.3"/><circle cx="13.5" cy="17" r="1.3"/><circle cx="20.5" cy="17" r="1.3"/><circle cx="27.5" cy="17" r="1.3"/></g>'
  };
  /* По запросу: цены в дорожной карте нет, считает менеджер */
  const OPTS = { install: { name: "Установка в вашем городе", note: "Найдём установщика" } };
  /* Автомобиль не выбран — «от» по всему каталогу: цены живые, чисел здесь быть не должно */
  const DEF_P = A.minPrices(A.MODELS);
  /* Стандартный комплект по дорожной карте: чёрная экокожа «Аригон», серая вставка, горизонтальная настрочка */
  const DEF = { base: "c79236", mat: "perf", ins: "c79243", design: "classic", same: false, thread: "" };
  const st = Object.assign({ model: null, opts: new Set(), qty: {} }, DEF);
  const STEPS = [["car", "Авто"], ["base", "Основа"], ["mat", "Материал"], ["ins", "Цвет"], ["thread", "Нить"], ["extra", "Опции"]];
  const steps = () => STEPS.filter(([id]) => id !== "thread" || MATS[st.mat].thread);
  let cur = 0;   /* раздел на экране */

  /* Выбор сохраняется как есть, а в расчёт идёт то, что можно сшить из выбранного материала: на флоке и жаккарде настрочки нет,
     «Лицевая часть единым цветом» — только экокожа и алькантара, цвет нити — только у перфорированной кожи. Вернулись к материалу — вернулся и выбор */
  const M = () => MATS[st.mat];
  const design = () => (M().design ? st.design : "plain");
  const same = () => st.same && !!M().barrel;
  const thread = () => (M().thread ? st.thread : "");
  const threadPaid = () => !!thread() && design() !== "plain";
  const addonOk = a => !(a.not || []).includes(st.mat) && (!a.needs || a.needs.includes(design())) && (!a.threaded || !!thread());
  const paid = () => O.addons.filter(a => addonOk(a) && st.opts.has(a.id)).map(a => Object.assign({}, a, { n: a.qty ? st.qty[a.id] || 1 : 1 }));
  /* ---------- геометрия сиденья ---------- */
  const fx = n => Math.round(n * 10) / 10;
  const toward = (p, q, r) => { const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy), k = Math.min(r, L / 2) / L; return [p[0] + dx * k, p[1] + dy * k]; };
  const rpath = (pts, r) => pts.map((p1, i) => { const n = pts.length, a = toward(p1, pts[(i - 1 + n) % n], r), b = toward(p1, pts[(i + 1) % n], r); return `${i ? "L" : "M"}${fx(a[0])} ${fx(a[1])}Q${fx(p1[0])} ${fx(p1[1])} ${fx(b[0])} ${fx(b[1])}`; }).join("") + "Z";
  const isect = ([[x1, y1], [x2, y2]], [[x3, y3], [x4, y4]]) => { const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4); if (Math.abs(d) < 1e-6) return [x2, y2]; const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d; return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)]; };
  function inset(pts, d) {
    const n = pts.length; let area = 0;
    pts.forEach((p, i) => { const q = pts[(i + 1) % n]; area += p[0] * q[1] - q[0] * p[1]; });
    const sg = area > 0 ? 1 : -1;
    const L = pts.map((p, i) => { const q = pts[(i + 1) % n], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy), nx = -dy / l * sg * d, ny = dx / l * sg * d; return [[p[0] + nx, p[1] + ny], [q[0] + nx, q[1] + ny]]; });
    return L.map((l, i) => isect(L[(i - 1 + n) % n], l));
  }
  const bbox = pts => { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
  const G = {
    head: [[138, 22], [282, 22], [276, 126], [144, 126]],
    back: [[124, 142], [296, 142], [330, 180], [338, 352], [316, 378], [104, 378], [82, 352], [90, 180]],
    backIn: [[150, 174], [270, 174], [276, 358], [144, 358]],
    cush: [[102, 374], [318, 374], [346, 402], [364, 524], [340, 552], [80, 552], [56, 524], [74, 402]],
    cushIn: [[148, 394], [272, 394], [290, 502], [130, 502]]
  };
  G.headIn = inset(G.head, 15);
  const RAD = { head: 40, back: 24, cush: 24, headIn: 26, backIn: 14, cushIn: 12 };

  /* стёжка на вставках: канавка, «подушки» между ними и строчка по обе стороны */
  function quilt(type, pts, dbl) {
    const [x0, y0, x1, y1] = bbox(pts), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, D = Math.hypot(x1 - x0, y1 - y0) / 2 + 12;
    const groove = 'stroke="rgba(0,0,0,.42)" stroke-width="1.6" fill="none"', dash = `stroke="${THREAD}" stroke-width="1.05" stroke-dasharray="3.2 2.4" fill="none" stroke-linecap="round"`;
    let out = "";
    const family = (deg, s) => {
      const a = deg * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx, N = Math.ceil(D / s);
      for (let k = -N; k <= N; k++) {
        const px = cx + nx * k * s, py = cy + ny * k * s;
        const seg = o => `M${fx(px - dx * D + nx * o)} ${fx(py - dy * D + ny * o)}L${fx(px + dx * D + nx * o)} ${fx(py + dy * D + ny * o)}`;
        out += `<path d="${seg(4.5)}" stroke="rgba(255,255,255,.09)" stroke-width="6" fill="none"/><path d="${seg(-4.5)}" stroke="rgba(0,0,0,.12)" stroke-width="6" fill="none"/>`;
        out += `<path d="${seg(0)}" ${groove}/><path d="${seg(3)}" ${dash}/>` + (dbl ? `<path d="${seg(-3)}" ${dash}/>` : "");
      }
    };
    if (type === "classic") family(0, 24);
    if (type === "rhomb") { family(58, 24); family(-58, 24); }
    return out;
  }

  /* превью сиденья спереди (позже заменим на 3D-рендер сбоку) */
  function seatSVG() {
    const ins = insColor()[1], side = same() ? ins : BASE[st.base][1], tex = M().tex, pat = M().pattern || { classic: "classic", romb: "rhomb" }[design()], dbl = paid().some(a => a.id === "double");
    THREAD = thread() ? THREADS[thread()] : DEF_THREAD;
    const P = k => rpath(G[k], RAD[k]);
    const texture = id => {
      if (tex === "perf") return `<rect x="0" y="0" width="420" height="600" fill="url(#perf)" clip-path="url(#${id})"/>`;
      if (tex === "alc") return `<rect x="0" y="0" width="420" height="600" fill="#000" opacity=".5" filter="url(#suedeD)" clip-path="url(#${id})"/><rect x="0" y="0" width="420" height="600" fill="#fff" opacity=".22" filter="url(#suedeL)" clip-path="url(#${id})"/>`;
      if (tex === "jac") return `<rect x="0" y="0" width="420" height="600" fill="url(#jac)" clip-path="url(#${id})"/>`;
      return `<rect x="0" y="0" width="420" height="600" fill="#000" opacity=".35" filter="url(#grain)" clip-path="url(#${id})"/>`;
    };
    const stitch = k => `<path d="${rpath(inset(G[k], -5.5), RAD[k] + 5)}" fill="none" stroke="${THREAD}" stroke-width="1.1" stroke-dasharray="3.4 2.4" stroke-linecap="round"/>` + (dbl ? `<path d="${rpath(inset(G[k], -9.5), RAD[k] + 9)}" fill="none" stroke="${THREAD}" stroke-width="1.1" stroke-dasharray="3.4 2.4" stroke-linecap="round"/>` : "");
    const edge = k => `<path d="${P(k)}" fill="none" stroke="rgba(0,0,0,.5)" stroke-width="2.2"/>` + stitch(k);
    const frame = (k, color, grad) => `<path d="${P(k)}" fill="${color}"/><path d="${P(k)}" fill="#000" opacity=".3" filter="url(#grain)"/><path d="${P(k)}" fill="url(#gH)"/><path d="${P(k)}" fill="url(#${grad || "gV"})"/><path d="${P(k)}" fill="none" stroke="rgba(0,0,0,.4)" stroke-width="1"/>`;
    const insert = (k, clip) => `<path d="${P(k)}" fill="${ins}"/>${texture(clip)}${pat ? `<g clip-path="url(#${clip})">${quilt(pat, G[k], dbl)}</g>` : ""}<path d="${P(k)}" fill="url(#gIn)"/>`;
    const seam = (d, clip) => `<g clip-path="url(#${clip})"><path d="${d}" stroke="rgba(0,0,0,.5)" stroke-width="2" fill="none"/><path d="${d}" stroke="${THREAD}" stroke-width="1.1" stroke-dasharray="3.4 2.4" fill="none" transform="translate(0 -5)"/>${dbl ? `<path d="${d}" stroke="${THREAD}" stroke-width="1.1" stroke-dasharray="3.4 2.4" fill="none" transform="translate(0 5)"/>` : ""}</g>`;
    const jl = insColor()[2] || "#ccc";
    const posts = `<rect x="175" y="118" width="9" height="30" rx="3" fill="url(#chrome)"/><rect x="236" y="118" width="9" height="30" rx="3" fill="url(#chrome)"/>`;
    const shadow = `<ellipse cx="210" cy="568" rx="172" ry="13" fill="#000" opacity=".28" filter="url(#soft)"/>`;
    const body = `${shadow}
${posts}
${frame("head", side, "gR")}
${insert("headIn", "cHead")}${edge("headIn")}
${frame("back", side)}
<path d="M106 196 L99 344" stroke="#fff" stroke-opacity=".14" stroke-width="12" stroke-linecap="round" filter="url(#hl)"/><path d="M314 196 L321 344" stroke="#fff" stroke-opacity=".1" stroke-width="12" stroke-linecap="round" filter="url(#hl)"/>
${insert("backIn", "cBack")}
${seam("M130 300 L290 300", "cBack")}
${edge("backIn")}
${frame("cush", side, "gC")}
<path d="M94 414 L80 512" stroke="#fff" stroke-opacity=".12" stroke-width="12" stroke-linecap="round" filter="url(#hl)"/><path d="M326 414 L340 512" stroke="#fff" stroke-opacity=".09" stroke-width="12" stroke-linecap="round" filter="url(#hl)"/>
${insert("cushIn", "cCush")}
${edge("cushIn")}
${seam("M50 520 Q210 528 370 520", "cCushF")}`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 600" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Превью чехла">
<defs>
  <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset=".72" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".34"/></linearGradient>
  <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset=".12" stop-color="#000" stop-opacity="0"/><stop offset=".6" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></linearGradient>
  <linearGradient id="gH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".5"/><stop offset=".1" stop-color="#000" stop-opacity=".06"/><stop offset=".17" stop-color="#fff" stop-opacity=".13"/><stop offset=".3" stop-color="#000" stop-opacity=".1"/><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset=".7" stop-color="#000" stop-opacity=".1"/><stop offset=".83" stop-color="#fff" stop-opacity=".13"/><stop offset=".9" stop-color="#000" stop-opacity=".06"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></linearGradient>
  <radialGradient id="gR" cx=".45" cy=".28" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient>
  <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="${tex === "alc" ? ".06" : ".14"}"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".26"/></linearGradient>
  <linearGradient id="chrome" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7d8187"/><stop offset=".45" stop-color="#e6e8eb"/><stop offset="1" stop-color="#6f7378"/></linearGradient>
  <pattern id="perf" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1.8" cy="1.8" r="1.05" fill="rgba(0,0,0,.6)"/><circle cx="5.3" cy="5.3" r="1.05" fill="rgba(0,0,0,.6)"/><circle cx="1.6" cy="1.5" r=".5" fill="rgba(255,255,255,.12)"/><circle cx="5.1" cy="5" r=".5" fill="rgba(255,255,255,.12)"/></pattern>
  <pattern id="jac" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="4" fill="${jl}" opacity=".5"/><rect x="4" y="4" width="4" height="4" fill="${jl}" opacity=".3"/><path d="M0 4h8M4 0v8" stroke="rgba(0,0,0,.25)" stroke-width=".6"/></pattern>
  <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.15" numOctaves="2" seed="4" result="n"/><feColorMatrix in="n" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.3 -.5"/><feComposite in2="SourceGraphic" operator="in"/></filter>
  <filter id="suedeD" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="2.3" numOctaves="2" seed="8"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.5 -.55"/><feComposite in2="SourceGraphic" operator="in"/></filter>
  <filter id="suedeL" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="2"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.4 -.6"/><feComposite in2="SourceGraphic" operator="in"/></filter>
  <filter id="soft" x="-30%" y="-300%" width="160%" height="700%"><feGaussianBlur stdDeviation="9"/></filter>
  <filter id="hl" x="-50%" y="-10%" width="200%" height="120%"><feGaussianBlur stdDeviation="4"/></filter>
  <clipPath id="cHead"><path d="${P("headIn")}"/></clipPath><clipPath id="cBack"><path d="${P("backIn")}"/></clipPath><clipPath id="cCush"><path d="${P("cushIn")}"/></clipPath><clipPath id="cCushF"><path d="${P("cush")}"/></clipPath>
</defs>
${body}
</svg>`;
  }

  /* ---------- расчёт: цена модели за материал вставки + доплаты из дорожной карты; остальное — по запросу ---------- */
  const insColor = () => { const c = M().colors; return c[st.ins] || Object.values(c)[0]; };
  const matName = id => (MATS[id].full || MATS[id].name);
  const low = s => s.charAt(0).toLowerCase() + s.slice(1);
  /* цена комплекта за материал у этой модели: m.p по материалу (0 жаккард и флок, 1 экокожа, 2 алькантара) + доплата (ромб 35 мм: +1 000 / +1 500) */
  const matPrice = (m, id) => (m ? m.p : DEF_P)[MATS[id].pi] + (MATS[id].add || 0);
  function compute() {
    const m = st.model, d = DESIGNS[design()];
    const lines = [{ n: `Комплект на весь салон${m ? ", " + A.genName(m) : ""}: ${low(matName(st.mat))}`, v: matPrice(m, st.mat), kind: "paid" }];
    if (d.price) lines.push({ n: d.name, v: d.price, kind: "paid" });
    if (same()) lines.push({ n: "Лицевая часть единым цветом", v: O.barrel, kind: "paid" });
    if (threadPaid()) lines.push({ n: `Декоративная строчка: ${thread().toLowerCase()} нить`, v: O.thread, kind: "paid" });
    paid().forEach(a => lines.push({ n: a.name + (a.n > 1 ? ` × ${a.n}` : ""), v: a.price * a.n, kind: "paid" }));
    st.opts.forEach(id => OPTS[id] && lines.push({ n: OPTS[id].name, kind: "ask" }));
    lines.push({ n: "Разрывные швы под Airbag", kind: "incl" }, { n: "Оплётка руля в цвет салона", kind: "gift" });
    return { total: lines.reduce((s, l) => s + (l.kind === "paid" ? l.v : 0), 0), lines };
  }
  const designText = () => (M().pattern ? "ромб 35 мм на материале" : low(DESIGNS[design()].name));
  const extrasText = () => (same() ? ["лицевая часть единым цветом"] : []).concat(paid().map(a => low(a.name) + (a.n > 1 ? ` × ${a.n}` : "")), [...st.opts].filter(id => OPTS[id]).map(id => low(OPTS[id].name) + " (по запросу)")).join(", ") || "—";
  const summary = () => [
    ["Автомобиль", st.model ? A.carName(st.model) : "не выбран"],
    ["Цвет основы", "экокожа, " + BASE[st.base][0].toLowerCase()],
    ["Центральная вставка", `${matName(st.mat)}, ${insColor()[0].toLowerCase()}`],
    ["Настрочка", designText()]
  ].concat(M().thread ? [["Отделочная нить", thread() ? thread().toLowerCase() : "обычная, в тон"]] : [], [
    ["Дополнительно", extrasText()],
    ["Итого на сайте", "от " + A.fmt(compute().total)]
  ]);
  /* выбор для заказа, заявки и письма с эскизом: сервер считает цену по mat, design, side_mat, thread, opts и qty; bx — номера в Битриксе, для менеджера */
  const buildConfig = () => {
    const p = paid();
    return { design: design(), side_mat: same() ? "same" : "eco", side: st.base, back: st.base, mat: st.mat, ins: st.ins, ins_name: `${matName(st.mat)}, ${insColor()[0].toLowerCase()}`,
      thread: thread(), opts: p.map(a => a.id).concat([...st.opts].filter(id => OPTS[id])), qty: Object.fromEntries(p.filter(a => a.qty).map(a => [a.id, a.n])), total: compute().total,
      bx: { center_material: M().bx, center_color: +st.ins.slice(1), side_color: +st.base.slice(1) } };
  };
  /* ---------- выбор автомобиля: поля с подсказками (можно печатать и по-русски) или VIN ---------- */
  const norm = s => String(s || "").toLowerCase().replace(/ё/g, "е").trim();
  const pick = { b: "", f: "", g: -1 };
  let mode = "model", openKey = "", active = -1;
  const CBX = { brand: ["Марка", "Марка: Toyota, Лада, Хендай…"], fam: ["Модель", "Модель: Camry, Солярис, Веста…"], gen: ["Поколение, кузов", "Кузов или годы: XV70, 2018…"] };
  const POP = $$("[data-pick-chip]").map(c => A.BY_SLUG[c.dataset.pickChip]).filter(Boolean);
  const gensOf = f => { const out = []; f.items.forEach(m => { let x = out.find(o => o.g === (m.g || "")); if (!x) out.push(x = { g: m.g || "", items: [] }); x.items.push(m); }); return out; };
  const curGen = () => { const f = A.FAMILIES[pick.f]; return f && pick.g >= 0 ? gensOf(f)[pick.g] : null; };
  const genLabel = g => `${g.g || "Все кузова"} · ${g.items[0].y || "все годы"}`;
  const thumb = items => { const r = items.map(A.carRender).find(Boolean); return r ? `<img src="${r}" alt="" loading="lazy">` : `<img class="is-logo" src="${A.brandLogo(items[0].b)}" alt="" loading="lazy">`; };
  function options(key, q) {
    const t = norm(q), b = A.BRAND[pick.b];
    if (key === "brand") {
      const fuzzy = t.length >= 2 ? A.search(q).brands.map(x => x.id) : [];
      return A.sortedBrands().filter(x => !t || norm(x.n).includes(t) || norm(x.s).split(" ").some(w => w.startsWith(t)) || fuzzy.includes(x.id));
    }
    if (key === "fam") {
      if (b) {
        if (!t) return b.fams;
        const hit = new Set(t.length >= 2 ? A.search(b.n + " " + q, 60).models.filter(m => m.b === b.id).map(m => m.f) : []);
        return b.fams.filter(f => norm(f.n).includes(t) || f.items.some(m => norm(m.ru).includes(t)) || hit.has(f.id));
      }
      if (t.length < 2) return POP.map(m => A.FAMILIES[m.f]).filter((f, i, a) => a.indexOf(f) === i);
      const out = []; A.search(q, 80).models.forEach(m => { const f = A.FAMILIES[m.f]; if (!out.includes(f)) out.push(f); });
      return out.slice(0, 24);
    }
    const f = A.FAMILIES[pick.f]; if (!f) return [];
    return gensOf(f).map((g, i) => Object.assign({ i }, g)).filter(g => !t || norm(g.g).includes(t) || g.items.some(m => norm([m.y, m.v, m.ru].join(" ")).includes(t)));
  }
  function dropHtml(key, q) {
    const list = options(key, q), b = A.BRAND[pick.b];
    if (!list.length) return `<div class="cbx__empty">${key === "gen" && !pick.f ? "Сначала выберите модель." : "Ничего не нашли. Попробуйте латиницей или по-русски — «Camry», «Солярис», или найдите автомобиль по VIN."}</div>`;
    if (key === "brand") return `<div class="cbx__grid">${list.map(x => `<button type="button" class="cbx__tile${x.id === pick.b ? " is-selected" : ""}" data-cbx-opt="${x.id}"><img src="${A.brandLogo(x.id)}" alt="" loading="lazy"><span>${e(x.n)}</span></button>`).join("")}</div>`;
    if (key === "fam") return (!b && norm(q).length < 2 ? `<div class="cbx__group">Популярные модели — или начните вводить название</div>` : "") + list.map(f => { const s = A.famStats(f); return `<button type="button" class="cbx__row${f.id === pick.f ? " is-selected" : ""}" data-cbx-opt="${f.id}"><span class="cbx__thumb">${thumb(f.items)}</span><span><b>${b ? "" : e(A.brandName(f.b)) + " "}${e(f.n)}</b><small>${e(s.years)} · ${s.gens} ${A.plural(s.gens, "поколение", "поколения", "поколений")}</small></span></button>`; }).join("");
    return list.map(g => `<button type="button" class="cbx__row${g.i === pick.g ? " is-selected" : ""}" data-cbx-opt="${g.i}"><span class="cbx__thumb">${thumb(g.items)}</span><span><b>${e(g.g || "Все кузова")}</b><small>${e(g.items[0].y || "все годы")}${g.items.length > 1 ? ` · ${g.items.length} ${A.plural(g.items.length, "вариант", "варианта", "вариантов")} салона` : ""}</small></span></button>`).join("");
  }
  function cbxFields() {
    const b = A.BRAND[pick.b], f = A.FAMILIES[pick.f], g = curGen();
    $$("[data-cbx]").forEach(el => {
      const key = el.dataset.cbx;
      if (!el.firstChild) el.innerHTML = `<div class="cbx__field"><img class="cbx__logo" alt="" hidden><input class="cbx__input" type="text" autocomplete="off" spellcheck="false" aria-label="${CBX[key][0]}" placeholder="${CBX[key][1]}" data-cbx-input="${key}"><svg class="cbx__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></div><div class="cbx__drop" data-cbx-drop hidden></div>`;
      const inp = $("input", el), val = key === "brand" ? (b ? b.n : "") : key === "fam" ? (f ? f.n : "") : (g ? genLabel(g) : "");
      if (document.activeElement !== inp) inp.value = val;
      inp.disabled = key === "gen" && !f;
      const logo = $(".cbx__logo", el);
      logo.hidden = key !== "brand" || !b;
      if (key === "brand" && b) logo.src = A.brandLogo(b.id);
    });
  }
  function openDrop(key, q) {
    openKey = key; active = -1;
    root.classList.toggle("is-picking", !!key);
    $$("[data-cbx]").forEach(el => { const on = el.dataset.cbx === key, drop = $("[data-cbx-drop]", el); el.classList.toggle("is-open", on); if (!drop) return; drop.hidden = !on; if (on) drop.innerHTML = dropHtml(key, q || ""); });
  }
  const closeDrop = () => { if (openKey) { openDrop(""); cbxFields(); } };
  function choose(key, id) {
    if (key === "brand") { if (pick.b !== id) { pick.b = id; pick.f = ""; pick.g = -1; st.model = null; } }
    if (key === "fam") { const f = A.FAMILIES[id]; pick.b = f.b; pick.f = id; pick.g = -1; st.model = null; if (gensOf(f).length === 1) { pick.g = 0; st.model = f.items[0]; } }
    if (key === "gen") { pick.g = +id; st.model = curGen().items[0]; }
    if (document.activeElement && root.contains(document.activeElement)) document.activeElement.blur();
    openDrop(""); render();
    /* следующее поле открывается само: марка → модель → кузов */
    const next = key === "brand" ? "fam" : key === "fam" && pick.g < 0 ? "gen" : "";
    if (next) $(`[data-cbx-input="${next}"]`).focus();
  }
  function setModel(m) {
    st.model = m || null;
    if (m) { pick.b = m.b; pick.f = m.f; pick.g = gensOf(A.FAMILIES[m.f]).findIndex(x => x.items.includes(m)); }
  }
  function setMode(m) {
    mode = m;
    $$("[data-mode]").forEach(b => b.classList.toggle("is-active", b.dataset.mode === m));
    $("[data-c-fields]").hidden = m !== "model"; $("[data-c-vinbox]").hidden = m !== "vin";
    if (m === "vin") setTimeout(() => $("[data-c-vin]").focus(), 0);
  }
  /* VIN без сервера: марка по коду завода и модельный год; с сервером — подсказки модели и кузова (AS_vin.suggest) */
  function vinLocal() {
    const V = window.AS_vin, raw = $("[data-c-vin]").value.trim(), out = $("[data-c-vin-out]");
    if (!V || !raw) { out.innerHTML = ""; return; }
    if (V.isFrame(raw)) { out.innerHTML = `<div class="vin-msg">Номер кузова праворульного автомобиля — выберите модель из подсказок или вкладку «Марка и модель». Менеджер сверит номер кузова с лекалом.</div>`; return; }
    const d = V.decodeVin(raw);
    if (!d) { out.innerHTML = raw.length >= 17 ? `<div class="vin-msg vin-msg--warn">VIN — 17 символов: латинские буквы без I, O, Q и цифры.</div>` : ""; return; }
    if (!d.brands.length) { out.innerHTML = `<div class="vin-msg">Марку по коду ${e(d.wmi)} определить не удалось — выберите автомобиль вручную, менеджер сверит VIN.</div>`; return; }
    if (d.brands.length === 1 && pick.b !== d.brands[0]) { pick.b = d.brands[0]; pick.f = ""; pick.g = -1; st.model = null; render(); }
    out.innerHTML = `<div class="vin-msg vin-msg--ok">По VIN: ${e(d.brands.map(A.brandName).join(" или "))}${d.year ? `, ${d.year} модельный год` : ""}. Выберите модель и кузов: <button type="button" class="link" data-mode="model">Марка и модель</button></div>`;
  }

  /* ---------- интерфейс ---------- */
  /* цвета — кружками без подписей (правка пользователя 04.11.2026): название — во всплывающей подсказке и для экранного диктора.
     У ткани (третий элемент — светлый оттенок) кружок в мелкую крапинку */
  const fill = c => (c[2] ? `background-color:${c[1]};background-image:radial-gradient(${c[2]} 1px, transparent 1.6px);background-size:6px 6px` : `background-color:${c[1]}`);
  const dot = (attr, id, c, on) => `<button type="button" class="cfg__dot${on ? " is-selected" : ""}" ${attr}="${e(id)}" style="${fill(c)}" title="${e(c[0])}" aria-label="${e(c[0])}" aria-pressed="${on}"></button>`;
  const card = (x, on) => `<button type="button" class="cfg__card${on ? " is-selected" : ""}" data-design="${x.id}" aria-pressed="${on}"><svg viewBox="0 0 40 26" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="1" y="1" width="38" height="24" rx="5"/>${ICO[x.id]}</svg><b>${e(x.name)}</b><span>${e(x.note)}</span><em>${x.price ? "+" + A.fmt(x.price) : "без доплаты"}</em></button>`;
  const optRow = (id, name, note, price, on, off) => `<label class="cfg__opt${off ? " is-off" : ""}"><span class="cfg__opt-t"><b>${e(name)}</b><small>${e(note)}</small></span><em>${price}</em><input type="checkbox" data-opt="${id}"${on ? " checked" : ""}${off ? " disabled" : ""}><i class="sw"></i></label>`;
  /* подушки и экокожа отрезом — штуками: вместо переключателя счётчик в той же колонке */
  const qtyRow = a => { const n = st.opts.has(a.id) ? +st.qty[a.id] || 1 : 0; return `<div class="cfg__opt"><span class="cfg__opt-t"><b>${e(a.name)}</b><small>${e(a.note)}</small></span><em>+${A.fmt(a.price)}</em><span class="cfg__qty"><button type="button" data-qty="${a.id}" data-d="-1" aria-label="Меньше"${n ? "" : " disabled"}>−</button><b>${n}</b><button type="button" data-qty="${a.id}" data-d="1" aria-label="Больше"${n >= 9 ? " disabled" : ""}>+</button></span></div>`; };
  function renderControls() {
    const X = M();
    renderNav();
    cbxFields();
    $$("[data-pick-chip]").forEach(c => c.classList.toggle("is-selected", !!st.model && c.dataset.pickChip === st.model.s));
    /* 2. цвет основы */
    $("[data-b-base]").innerHTML = Object.entries(BASE).map(([id, c]) => dot("data-base", id, c, st.base === id)).join("");
    /* 3. материал вставки — строками с ценой комплекта у выбранной модели */
    $("[data-b-mats]").innerHTML = `<div class="mlist">${O.materials.map(m => { const n = Object.keys(m.colors).length, on = m.id === st.mat; return `<button type="button" class="mlist__opt${on ? " is-selected" : ""}" data-mat="${m.id}" aria-pressed="${on}"><i style="${fill(on ? insColor() : Object.values(m.colors)[0])}"></i><span><b>${e(m.name)}</b><small>${e(m.note)} · ${n} ${A.plural(n, "цвет", "цвета", "цветов")}</small></span><em>${A.fmt(matPrice(st.model, m.id))}</em></button>`; }).join("")}</div>`;
    /* 4. цвет вставки */
    $("[data-b-ins]").innerHTML = Object.entries(X.colors).map(([id, c]) => dot("data-ins", id, c, st.ins === id)).join("");
    /* 5. цвет отделочной нити — только у перфорированной кожи (правка пользователя 04.11.2026); первый кружок — обычная нить в тон */
    $('[data-step="thread"]').hidden = !X.thread;
    if (X.thread) {
      $("[data-b-threads]").innerHTML = `<button type="button" class="cfg__dot cfg__dot--none${thread() ? "" : " is-selected"}" data-thread="" title="Обычная нить в тон" aria-label="Обычная нить в тон, без доплаты" aria-pressed="${!thread()}"></button>`
        + O.threads.map(([n, h]) => dot("data-thread", n, [n, h], st.thread === n)).join("");
      $("[data-b-thread-note]").textContent = design() === "plain"
        ? "Цветная нить ложится на настрочку и швы. Без настрочки она пойдёт только на вертикальные швы — их можно добавить в разделе «Дополнительно»."
        : `Цветная нить — декоративная строчка по настрочке, +${A.fmt(O.thread)}. Первый кружок — обычная нить в тон, без доплаты.`;
    }
    /* 6. дополнительно: настрочка, услуги с ценой, по запросу. Переключатель, цена и подписи — ровными колонками */
    const pattern = X.pattern ? `<p class="cfg__note">Стёжка ромбом 35 мм уже на материале — отдельная настрочка не нужна.</p>`
      : !X.design ? `<p class="cfg__note">На флоке и жаккарде настрочек не делаем: у ткани свой узор, нить на нём теряется.</p>`
      : `<div class="cfg__cards cfg__cards--3">${O.designs.map(x => card(x, design() === x.id)).join("")}</div>`;
    $("[data-b-opts]").innerHTML = `<h3 class="cfg__sub">Настрочка на вставке</h3>${pattern}<h3 class="cfg__sub">Услуги</h3>`
      + optRow("same", "Лицевая часть единым цветом", X.barrel ? "Боковины спереди — из материала вставки" : "Только с экокожей и алькантарой", "+" + A.fmt(O.barrel), same(), !X.barrel)
      + O.addons.filter(a => !a.threaded || X.thread).map(a => { const ok = addonOk(a); return a.qty ? qtyRow(a) : optRow(a.id, a.name, ok ? a.note : a.why, "+" + A.fmt(a.price), ok && st.opts.has(a.id), !ok); }).join("")
      + `<h3 class="cfg__sub">По запросу — стоимость уточнит менеджер</h3>` + Object.entries(OPTS).map(([id, o]) => optRow(id, o.name, o.note, "по запросу", st.opts.has(id), false)).join("");
  }
  function render() {
    if (!M().colors[st.ins]) st.ins = Object.keys(M().colors)[0];
    renderControls();
    const c = compute(), m = st.model;
    drawSeat();
    const set = (sel, v) => $$(sel, document).forEach(x => { x.innerHTML = v; });
    set("[data-b-total]", A.fmt(c.total));
    set("[data-b-lines]", c.lines.map((l, i) => `<div><span>${e(l.n)}</span><b class="${l.kind === "incl" || l.kind === "gift" ? "free" : ""}">${l.kind === "gift" ? "в подарок" : l.kind === "incl" ? "включено" : l.kind === "ask" ? "по запросу" : (i ? "+" : "") + A.fmt(l.v)}</b></div>`).join(""));
    set("[data-b-car]", m ? e(A.carName(m)) : "Автомобиль не выбран");
    set("[data-b-car-sub]", m ? e([A.cfgText(m), A.yearsText(m)].filter(Boolean).join(" · ")) : "Выберите автомобиль справа — цена зависит от лекала");
    set("[data-b-val=car]", m ? e(A.genName(m)) : "не выбран");
    set("[data-b-val=base]", BASE[st.base][0]);
    set("[data-b-val=mat]", e(M().name));
    set("[data-b-val=ins]", insColor()[0]);
    set("[data-b-val=thread]", thread() || "обычная, в тон");
  }
  function drawSeat() {
    $("[data-b-canvas]").innerHTML = seatSVG();
  }
  /* полоса разделов: клик прокручивает к разделу, при прокрутке подсвечен раздел на экране.
     На десктопе полоса прилипает под шапкой, на телефоне сверху закреплено превью */
  const headerH = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 0;
  const mobile = () => matchMedia("(max-width: 899px)").matches;
  const topGap = () => headerH() + (mobile() ? $(".cfg__stage").offsetHeight : $("[data-b-steps]").offsetHeight) + 12;
  function renderNav() {
    const bar = $("[data-b-steps]"), list = steps();
    cur = Math.min(cur, list.length - 1);
    bar.innerHTML = list.map(([id, short], i) => `<button type="button" class="${i === cur ? "is-active" : ""}" data-go="${i}"${i === cur ? ' aria-current="true"' : ""}><span>${short}</span></button>`).join("");
    const a = $(".is-active", bar);
    if (a && bar.scrollWidth > bar.clientWidth) bar.scrollLeft = a.offsetLeft - (bar.clientWidth - a.offsetWidth) / 2;
  }
  function go(i) {
    openDrop("");
    window.scrollTo({ top: $(`[data-step="${steps()[i][0]}"]`).getBoundingClientRect().top + scrollY - topGap(), behavior: "smooth" });
  }
  function spy() {
    const y = topGap() + 80;
    let i = 0;
    steps().forEach(([id], k) => { if ($(`[data-step="${id}"]`).getBoundingClientRect().top <= y) i = k; });
    if (i === cur) return;
    cur = i;
    renderNav();
  }
  addEventListener("scroll", spy, { passive: true });

  /* ---------- события ---------- */
  /* при смене материала цвет остаётся тем же, если он есть в новом материале: сначала полное совпадение, затем по основному цвету («Серый» → «Тёмно-серая» → «Рогожка серая»); иначе — первый в списке, самый ходовой */
  const colorStem = n => n.toLowerCase().replace(/ё/g, "е").replace(/(ый|ий|ой|ая|яя|ые|ие)$/, "");
  const colorBase = n => colorStem(n.split(/[\s,-]+/).pop());
  function sameColor(id, name) {
    const list = Object.entries(MATS[id].colors);
    return (list.find(([, c]) => colorStem(c[0]) === colorStem(name)) || list.find(([, c]) => colorBase(c[0]) === colorBase(name)) || list[0])[0];
  }
  /* материал сам выбор не стирает: что к нему не подходит, не считается, и об этом говорим */
  function setMat(id) {
    const was = insColor()[0], before = [design(), same(), thread()], msg = [];
    st.mat = id; st.ins = sameColor(id, was);
    if (before[0] !== "plain" && design() === "plain") msg.push(M().pattern ? "ромб уже на материале" : "настрочек на ткани не делаем");
    if (before[1] && !same()) msg.push("лицевую часть единым цветом шьём с экокожей и алькантарой");
    if (before[2] && !thread()) msg.push("цвет нити выбирают только для перфорированной кожи");
    if (msg.length) A.toast(`${M().name}: ${msg.join("; ")}`);
  }
  root.addEventListener("mousedown", ev => { if (ev.target.closest("[data-cbx-drop]")) ev.preventDefault(); });
  root.addEventListener("click", ev => {
    const b = ev.target.closest("button"); if (!b || !root.contains(b)) return;
    const d = b.dataset;
    if (d.cbxOpt !== undefined) { choose(b.closest("[data-cbx]").dataset.cbx, d.cbxOpt); return; }
    if (d.go !== undefined) { go(+d.go); return; }
    if (d.mode) { setMode(d.mode); return; }
    if (b.matches("[data-b-cart]")) { addToCart(); return; }
    if (b.matches("[data-b-lines-toggle]")) { const l = $("[data-b-lines]"); l.hidden = !l.hidden; b.setAttribute("aria-expanded", String(!l.hidden)); return; }
    if (d.design) st.design = d.design;
    else if (d.base) st.base = d.base;
    else if (d.mat) setMat(d.mat);
    else if (d.ins) st.ins = d.ins;
    else if (d.thread !== undefined) st.thread = d.thread;
    else if (d.qty) { const n = Math.max(0, Math.min(9, (st.opts.has(d.qty) ? st.qty[d.qty] || 1 : 0) + +d.d)); st.qty[d.qty] = n; n ? st.opts.add(d.qty) : st.opts.delete(d.qty); }
    else if (d.pickChip) { setModel(A.BY_SLUG[d.pickChip]); if (mode === "vin") $("[data-c-vin-out]").innerHTML = `<div class="vin-msg vin-msg--ok">Выбрано: ${e(A.carName(st.model))}${st.model.y ? " · " + e(st.model.y) : ""}</div>`; }
    else return;
    render();
  });
  root.addEventListener("change", ev => {
    const t = ev.target, id = t.dataset.opt;
    if (!id) return;
    if (id === "same") st.same = t.checked;
    else t.checked ? st.opts.add(id) : st.opts.delete(id);
    render();
  });
  /* поля автомобиля: фокус открывает список, ввод фильтрует, стрелки и Enter выбирают */
  root.addEventListener("focusin", ev => {
    const k = ev.target.dataset && ev.target.dataset.cbxInput; if (!k) return;
    ev.target.select(); openDrop(k, "");
    /* на телефоне превью на время выбора не закреплено, поле — под шапкой, чтобы список было видно */
    if (matchMedia("(max-width: 899px)").matches) {
      const hh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 0;
      window.scrollTo({ top: ev.target.getBoundingClientRect().top + scrollY - hh - 12, behavior: "smooth" });
    }
  });
  root.addEventListener("input", ev => { const k = ev.target.dataset.cbxInput; if (k) openDrop(k, ev.target.value); if (ev.target.matches("[data-c-vin]")) vinLocal(); });
  root.addEventListener("keydown", ev => {
    const k = ev.target.dataset && ev.target.dataset.cbxInput; if (!k) return;
    const opts = $$(`[data-cbx="${k}"] [data-cbx-opt]`);
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") { ev.preventDefault(); if (!opts.length) return; active = (active + (ev.key === "ArrowDown" ? 1 : -1) + opts.length) % opts.length; opts.forEach((o, i) => o.classList.toggle("is-active", i === active)); opts[active].scrollIntoView({ block: "nearest" }); }
    else if (ev.key === "Enter") { ev.preventDefault(); const o = opts[active] || (ev.target.value.trim() && opts[0]); if (o) choose(k, o.dataset.cbxOpt); }
    else if (ev.key === "Escape") { closeDrop(); ev.target.blur(); }
  });
  document.addEventListener("click", ev => {
    if (openKey && !ev.target.closest("[data-cbx]")) closeDrop();
  });
  $$("[data-b-reset]", document).forEach(b => b.addEventListener("click", () => { Object.assign(st, DEF); st.opts.clear(); st.qty = {}; render(); A.toast("Настройки сброшены"); }));
  /* VIN или номер кузова: подсказки модели с сервера */
  window.AS_vin && window.AS_vin.suggest($("[data-c-vin]"), { onPick: slug => { setModel(A.BY_SLUG[slug]); render(); $("[data-c-vin-out]").innerHTML = `<div class="vin-msg vin-msg--ok">Выбрано: ${e(A.carName(st.model))}${st.model.y ? " · " + e(st.model.y) : ""}</div>`; } });

  /* лёгкий 3D-поворот превью за курсором */
  const stage = $("[data-b-canvas]");
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    stage.addEventListener("pointermove", ev => { const r = stage.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width - 0.5, y = (ev.clientY - r.top) / r.height - 0.5; stage.style.setProperty("--ry", fx(x * 18) + "deg"); stage.style.setProperty("--rx", fx(-y * 8) + "deg"); });
    stage.addEventListener("pointerleave", () => { stage.style.setProperty("--ry", "0deg"); stage.style.setProperty("--rx", "0deg"); });
  }

  /* ---------- окна: эскиз на почту и заявка менеджеру ---------- */
  const openM = el => { el.classList.add("is-open"); document.body.style.overflow = "hidden"; setTimeout(() => { const i = $("input", el); i && i.focus(); }, 50); };
  const closeM = el => { el.classList.remove("is-open"); document.body.style.overflow = ""; };
  const svgUrl = () => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(seatSVG());
  const listHtml = () => summary().slice(0, -1).map(([k, v]) => `<div><dt>${k}</dt><dd>${e(v)}</dd></div>`).join("") + `<div class="breq__total"><dt>Весь салон от</dt><dd>${A.fmt(compute().total)}</dd></div>`;

  /* эскиз в PNG: превью, состав и цена */
  function download() {
    const img = new Image();
    img.onload = () => {
      const W = 1200, H = 1560, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
      const g = cv.getContext("2d"), grd = g.createRadialGradient(W / 2, 380, 80, W / 2, 560, 900);
      grd.addColorStop(0, "#ffffff"); grd.addColorStop(1, "#e6e6e1"); g.fillStyle = grd; g.fillRect(0, 0, W, H);
      const sh = 1000, sw = sh * 420 / 600; g.drawImage(img, (W - sw) / 2, 40, sw, sh);
      g.fillStyle = "#231f20"; g.font = "800 44px Golos Text, Arial, sans-serif"; g.fillText("Эскиз чехлов" + (st.model ? " на " + A.carName(st.model) : ""), 70, 1120);
      g.font = "500 28px Golos Text, Arial, sans-serif"; let y = 1180;
      summary().slice(1, -1).forEach(([k, v]) => { g.fillStyle = "#6b6e74"; g.fillText(k, 70, y); g.fillStyle = "#231f20"; g.fillText(v.length > 44 ? v.slice(0, 42) + "…" : v, 400, y); y += 44; });
      g.font = "800 40px Golos Text, Arial, sans-serif"; g.fillText("от " + A.fmt(compute().total).replace(/ /g, " "), 70, H - 60);
      g.font = "500 26px Golos Text, Arial, sans-serif"; g.fillStyle = "#6b6e74"; g.textAlign = "right"; g.fillText("Автостиль · 8 (800) 775-32-60", W - 70, H - 64);
      cv.toBlob(b => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "avtostil-eskiz.png"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000); });
    };
    img.src = svgUrl();
  }
  /* «Скачать эскиз» — сначала форма с e-mail (правка пользователя 04.11.2026): эскиз уходит на почту, файл сохраняется на устройство.
     Письмо собирает сервер из выбора (catalog.custom_describe), текст из браузера в него не попадает */
  const sk = document.querySelector("[data-b-sketch]");
  function openSketch() {
    $("[data-sk-mini]", sk).innerHTML = `<img src="${svgUrl()}" alt="Ваш эскиз">`;
    $("[data-sk-list]", sk).innerHTML = listHtml();
    $("[data-sk-form]", sk).hidden = false; $("[data-sk-done]", sk).hidden = true;
    openM(sk);
  }
  $$("[data-b-download]", document).forEach(b => b.addEventListener("click", openSketch));
  $$("[data-sk-close]", sk).forEach(b => b.addEventListener("click", () => closeM(sk)));
  A.guardForm($("[data-sk-form]", sk));
  $("[data-sk-form]", sk).addEventListener("submit", async ev => {
    ev.preventDefault();
    const f = ev.target, btn = $("[type=submit]", f), fd = new FormData(f), get = k => String(fd.get(k) || "").trim();
    btn.disabled = true; btn.textContent = "Отправляем…";
    const res = await A.api("/requests", {
      kind: "sketch", name: get("name"), email: get("email"), model: st.model ? st.model.s : "", car: st.model ? A.carName(st.model) : "", config: buildConfig(), summary: summary(),
      consent: !!(f.querySelector("input[type=checkbox][required]") || {}).checked, marketing: !!(f.querySelector("[name=marketing]") || {}).checked, meta: A.formMeta(f)
    });
    btn.disabled = false; btn.textContent = "Отправить и скачать";
    /* ошибка в полях — поправить; сервер недоступен — файл всё равно отдаём */
    if (!res.ok && res.status && res.status < 500) { A.fieldErrors(f, res); A.toast(res.error); return; }
    download();
    $("[data-sk-done] p:not(.breq__title)", sk).textContent = res.ok ? `Отправили эскиз на ${get("email")} и сохранили файл на ваше устройство. Если письма нет, проверьте папку «Спам».`
      : "Файл сохранён на ваше устройство, а письмо отправить не удалось. Попробуйте позже или позвоните 8 (800) 775-32-60.";
    f.reset(); f.hidden = true; $("[data-sk-done]", sk).hidden = false;
  });

  /* ---------- корзина: собранный комплект — отдельная позиция custom:<лекало>:<ключ выбора> ---------- */
  const hashStr = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0; return h.toString(36); };
  function addToCart() {
    const m = st.model, c = compute();
    if (!m) { A.toast("Выберите автомобиль — без него не подобрать лекало"); go(0); return; }
    const config = buildConfig(), extra = extrasText();
    const label = `Вставка: ${low(matName(st.mat))} ${insColor()[0].toLowerCase()}, основа: экокожа ${BASE[st.base][0].toLowerCase()}, настрочка: ${designText()}`
      + (thread() ? `, нить: ${thread().toLowerCase()}` : "") + (extra !== "—" ? ", " + extra : "");
    A.Cart.add({ id: `custom:${m.s}:${hashStr(JSON.stringify(config))}`, title: `Индивидуальный пошив: чехлы на ${A.carName(m)}`, sub: label, label, price: c.total, img: svgUrl(),
      url: A.href("custom", { m: m.s, cfg: JSON.stringify(config) }), model: m.s, config, opts: { install: st.opts.has("install") } });
    A.toast("Комплект добавлен в корзину", ["Перейти", A.href("cart")]);
  }

  /* ---------- заявка менеджеру ---------- */
  const modal = document.querySelector("[data-b-modal]");
  const fillModal = () => {
    $("[data-b-mini]", modal).innerHTML = `<img src="${svgUrl()}" alt="Ваш дизайн">`;
    $("[data-b-summary]", modal).innerHTML = listHtml();
  };
  /* подсказки в поле VIN заявки: выбрал автомобиль из списка — он подставляется в конструктор и в сводку */
  window.AS_vin && window.AS_vin.suggest($("[data-req-vin]", modal), { onPick: slug => { setModel(A.BY_SLUG[slug]); render(); fillModal(); A.toast("Автомобиль выбран: " + A.carName(A.BY_SLUG[slug])); } });
  function openModal() {
    fillModal();
    $("[data-b-form]", modal).hidden = false; $("[data-b-done]", modal).hidden = true;
    const rv = $("[data-req-vin]", modal); if (rv && !rv.value) { try { rv.value = localStorage.getItem("as_vin") || ""; } catch (er) {} }
    openM(modal);
  }
  $$("[data-b-open]", document).forEach(b => b.addEventListener("click", openModal));
  $$("[data-b-close]", modal).forEach(b => b.addEventListener("click", () => closeM(modal)));
  document.addEventListener("keydown", ev => { if (ev.key === "Escape") [modal, sk].forEach(x => x.classList.contains("is-open") && closeM(x)); });
  /* заявка → /api/requests: выбор в конструкторе, сводка для менеджера, контакты, VIN. Сервер берёт из config материал вставки (mat) и опции (opts) */
  A.guardForm($("[data-b-form]", modal));
  $("[data-b-form]", modal).addEventListener("submit", async ev => {
    ev.preventDefault();
    const f = ev.target, btn = $("[type=submit]", f), fd = new FormData(f), get = k => String(fd.get(k) || "").trim();
    btn.disabled = true; btn.textContent = "Отправляем…";
    const res = await A.api("/requests", {
      kind: "custom", name: get("name"), phone: get("phone"), contact_method: get("contact_method"), vin: get("vin"), message: get("message"),
      model: st.model ? st.model.s : "", car: st.model ? A.carName(st.model) : "", config: buildConfig(), summary: summary(),
      consent: !!(f.querySelector("input[type=checkbox][required]") || {}).checked, marketing: !!(f.querySelector("[name=marketing]") || {}).checked, meta: A.formMeta(f)
    });
    btn.disabled = false; btn.textContent = "Отправить заявку";
    if (!res.ok) { A.fieldErrors(f, res); A.toast(res.error); return; }
    if (get("vin")) { try { localStorage.setItem("as_vin", get("vin").toUpperCase()); } catch (er) {} }
    f.reset(); f.hidden = true; $("[data-b-done]", modal).hidden = false;
    const done = $("[data-b-done] p:not(.breq__title)", modal); if (done && res.data.number) done.textContent = `Номер заявки ${res.data.number}. В рабочее время вам перезвонит оператор, уточнит комплектацию салона и стоимость.`;
  });

  /* превью высотой в первый экран: от верха конструктора до низа окна */
  const fit = () => root.style.setProperty("--cfg-h", Math.max(620, Math.round(innerHeight - (root.getBoundingClientRect().top + scrollY) - 16)) + "px");
  fit(); addEventListener("resize", fit);

  /* ?m=лекало — автомобиль, ?cfg=… — выбор из корзины («изменить комплект») или из письма с эскизом.
     Ссылка приходит извне, а значения идут в разметку и подпись корзины: только известные материалы, цвета, услуги и числа 1–9 */
  const has = (o, k) => typeof k === "string" && Object.prototype.hasOwnProperty.call(o, k);
  const preset = A.BY_SLUG[A.qs("m")];
  if (preset) setModel(preset);
  try {
    const c = JSON.parse(A.qs("cfg") || "null");
    if (c && typeof c === "object") {
      if (has(MATS, c.mat)) st.mat = c.mat;
      if (has(DESIGNS, c.design)) st.design = c.design;
      if (has(M().colors, c.ins)) st.ins = c.ins;
      if (has(BASE, c.side)) st.base = c.side;
      st.same = c.side_mat === "same";
      if (has(THREADS, c.thread)) st.thread = c.thread;
      (Array.isArray(c.opts) ? c.opts : []).forEach(o => { if (O.addons.some(a => a.id === o) || has(OPTS, o)) st.opts.add(o); });
      O.addons.forEach(a => { const n = (c.qty || {})[a.id]; if (a.qty && Number.isInteger(n) && n >= 1 && n <= 9) st.qty[a.id] = n; });
    }
  } catch (er) {}
  render(); spy();
})();
