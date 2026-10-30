/* Конструктор индивидуального пошива: разделы идут подряд справа — автомобиль, салон, рисунок, боковины, центральная часть, тыл, дополнительно.
   Превью сиденья слева закреплено, полоса разделов сверху и цена с кнопками «В корзину» и «Заявка менеджеру» внизу всегда на экране.
   Материалы, цвета и цены — со страниц моделей 1avtochehol.ru, доплаты — из дорожной карты продаж (AS.ADDONS), вопросы о салоне — из формы заказа старого сайта.
   Цену комплекта в заказе сервер считает сам (backend/app/catalog.py, custom_quote) — DESIGN_PRICE и SIDE_ALC_PRICE сверяет test_catalog_sync.py. */
(function () {
  const A = window.AS, e = A.esc, root = document.querySelector("[data-builder]");
  if (!root) return;
  const $ = (s, r = root) => r.querySelector(s), $$ = (s, r = root) => [...r.querySelectorAll(s)];
  const SW = n => "assets/swatches/" + n + ".jpg";

  /* ---------- палитры и цены (реальный каталог) ---------- */
  const ECO = {
    black: ["Чёрный", "#202224", "eco-black"], grey: ["Серый", "#5b6161", "eco-grey"],
    beige: ["Бежевый", "#d4c597", "eco-beige"], choco: ["Шоколадный", "#4b3d2c", "eco-choco"]
  };
  const MATS = {
    eco: { name: "Экокожа", idx: 1, colors: ECO },
    perf: { name: "Перфорация", full: "Экокожа с перфорацией", idx: 1, colors: {
      black: ["Чёрный", "#1f2123", "perf-black"], grey: ["Серый", "#55605a", "perf-grey"], red: ["Красный", "#c4351f", "eco-red"], blue: ["Синий", "#2f55b5", "eco-blue"],
      yellow: ["Жёлтый", "#e2c21f", "eco-yellow-perf"], orange: ["Оранжевый", "#dd651b", "eco-orange"], paprika: ["Паприка", "#a3441f", "eco-chestnut"], pink: ["Розовый", "#cf6f9f", "eco-pink"] } },
    alc: { name: "Алькантара", idx: 2, colors: {
      dark: ["Тёмная", "#3a3d3b", "alca-black"], cherry: ["Вишня", "#7d2335", "eco-cherry"], blue: ["Синяя", "#2f3d6b", "eco-navy"],
      light: ["Светлая", "#9e998e", "alca-grey"], beige: ["Бежевая", "#b7a98a", "eco-cream"] } },
    jac: { name: "Жаккард", idx: 0, colors: {
      grey: ["Рогожка серая", "#5f605c", "jac-bw", "#b9b9b4"], splash: ["Брызги", "#4a4a48", "flock-grey", "#d0d0cb"],
      red: ["Рогожка красная", "#ad3338", "jac-red", "#ea9494"], blue: ["Рогожка синяя", "#2b5d99", "jac-blue", "#79a8de"] } }
  };
  const THREAD = "#a3a5ab";
  /* Доплата за рисунок серединки (дорожная карта продаж): [на экокоже и перфорации, на алькантаре] */
  const DESIGN_PRICE = { plain: [0, 0], classic: [600, 600], rhomb: [1000, 1500] };
  /* Боковины из алькантары — «боковые поддержки в цвет серединки»: весь перед сиденья из алькантары центральной части */
  const SIDE_ALC_PRICE = 700;
  /* На жаккарде настрочек нет, ромб шьём на гладкой экокоже и алькантаре */
  const DESIGNS = {
    plain: { name: "Без рисунка", note: "Гладкая серединка: перфорация, алькантара, жаккард", ico: '<g fill="currentColor" stroke="none"><circle cx="10" cy="9" r="1.3"/><circle cx="17" cy="9" r="1.3"/><circle cx="24" cy="9" r="1.3"/><circle cx="31" cy="9" r="1.3"/><circle cx="13.5" cy="17" r="1.3"/><circle cx="20.5" cy="17" r="1.3"/><circle cx="27.5" cy="17" r="1.3"/></g>', ok: () => true },
    classic: { name: "Классика", note: "Поперечные полосы, горизонтальная настрочка", ico: '<path d="M2 9h36M2 17h36"/>', ok: mat => mat !== "jac" },
    rhomb: { name: "Ромб 35 мм", note: "Стёжка ромбом, на алькантаре +1 500 ₽", ico: '<path d="M2 13 9 4l7 9 7-9 7 9 7-9M2 13l7 9 7-9 7 9 7-9 7 9"/>', ok: mat => mat === "eco" || mat === "alc" }
  };
  const dPrice = (id, mat) => DESIGN_PRICE[id][mat === "alc" ? 1 : 0];
  /* Боковины («бочка») — экокожа «Аригон». Другой материал по данным клиента один: алькантара в цвет центральной части, только вместе с алькантарой в центре */
  const SIDE_MATS = {
    eco: { name: "Экокожа «Аригон»", note: "4 цвета", price: "входит", ok: () => true },
    alc: { name: "Алькантара", note: "В цвет центральной части", price: "+" + A.fmt(SIDE_ALC_PRICE), ok: mat => mat === "alc" }
  };
  /* Подписи материалов в выпадающем списке — из текстов старого сайта */
  const MAT_NOTE = { eco: "Гладкая, «Аригон»", perf: "Экокожа с перфорацией", alc: "Приятная на ощупь", jac: "Самый доступный вариант" };
  /* Салон — вопросы из формы заказа старого сайта; «Не знаю» — комплектацию уточнит менеджер */
  const SALON = [
    { id: "kit", name: "Комплект", opts: [["full", "Весь салон"], ["front", "Передний ряд"]], hint: "Передний ряд — два передних сиденья. Его стоимость рассчитает менеджер." },
    { id: "armrest", name: "Задний подлокотник", rear: true, opts: [["yes", "Есть"], ["no", "Нет"], ["", "Не знаю"]], hint: "Откидной подлокотник в середине заднего дивана. Лекало учитывает подлокотник, поэтому важно знать, есть ли он." },
    { id: "backrest", name: "Задняя спинка", rear: true, opts: [["solid", "Цельная"], ["40/60", "40/60"], ["50/50", "50/50"], ["3", "3 части"], ["", "Не знаю"]],
      legend: [["solid", "Цельная", "спинка заднего дивана одной частью, складывается целиком"], ["40/60", "40/60", "две части разной ширины, узкая и широкая складываются по отдельности"], ["50/50", "50/50", "две одинаковые половины"], ["3", "3 части", "три секции, например 40/20/40: средняя складывается отдельно"]] },
    { id: "airbag", name: "Подушки безопасности в сиденьях", opts: [["yes", "Есть"], ["no", "Нет"], ["", "Не знаю"]], hint: "Боковые подушки в спинках передних сидений — на боковине обычно есть ярлык AIRBAG. Для них делаем разрывные швы." }
  ];
  const SPLIT = { solid: [], "40/60": [0.4], "50/50": [0.5], "3": [0.4, 0.6] };
  const splitIco = v => `<svg class="cfg__split" viewBox="0 0 36 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="1" y="1" width="34" height="14" rx="3"/>${SPLIT[v].map(f => `<path d="M${1 + 34 * f} 1v14"/>`).join("")}</svg>`;
  /* По запросу: цену не публикуем, считает менеджер */
  const OPTS = {
    armrest: { name: "Чехол на подлокотник", note: "В цвет комплекта" },
    mats: { name: "Автоковрики EVA в цвет чехлов", note: "Под ваш автомобиль" },
    install: { name: "Установка в вашем городе", note: "Найдём установщика" }
  };
  /* Платные доплаты (AS.ADDONS): отделочная нить и двойная настрочка — только на полосах, вертикальные швы — не на жаккарде.
     «Боковины в цвет вставок» выбираются на шаге «Боковины». Подписи короткие, чтобы карточки шли ровными строками */
  const PAID = { "pillow-head": () => true, "pillow-sq": () => true, thread: () => st.design === "classic", double: () => st.design === "classic", vseams: () => st.mat !== "jac" };
  const NOTE = { "pillow-head": "В цвет комплекта, на молнии", "pillow-sq": "В цвет комплекта, на молнии", thread: "На полосах, цвет нити уточнит менеджер", double: "Две строчки на полосах", vseams: "Все видимые швы цветной нитью" };
  const SHORT = { thread: "Цветная отделочная нить", vseams: "Вертикальные швы" };
  const WHY = { thread: "Только с рисунком «Классика»", double: "Только с рисунком «Классика»", vseams: "На жаккарде не делаем" };
  const paid = () => A.ADDONS.filter(a => PAID[a.id] && PAID[a.id]() && st.opts.has(a.id));
  const DEF_P = [7975, 9375, 9975];
  const DEF = { design: "classic", sideMat: "eco", side: "black", mat: "perf", ins: "grey", back: "black" };
  const DEF_SALON = { kit: "full", armrest: "", backrest: "", airbag: "" };
  const st = Object.assign({ model: null, opts: new Set(), salon: Object.assign({}, DEF_SALON) }, DEF);
  const STEPS = [["car", "Авто"], ["salon", "Салон"], ["design", "Рисунок"], ["side", "Боковины"], ["ins", "Центр"], ["back", "Тыл"], ["extra", "Опции"]];
  let cur = 0;   /* раздел, который сейчас на экране */

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
    const ins = insColor()[1], side = st.sideMat === "alc" ? ins : ECO[st.side][1], dbl = paid().some(a => a.id === "double");
    const P = k => rpath(G[k], RAD[k]);
    const texture = id => {
      if (st.mat === "perf") return `<rect x="0" y="0" width="420" height="600" fill="url(#perf)" clip-path="url(#${id})"/>`;
      if (st.mat === "alc") return `<rect x="0" y="0" width="420" height="600" fill="#000" opacity=".5" filter="url(#suedeD)" clip-path="url(#${id})"/><rect x="0" y="0" width="420" height="600" fill="#fff" opacity=".22" filter="url(#suedeL)" clip-path="url(#${id})"/>`;
      if (st.mat === "jac") return `<rect x="0" y="0" width="420" height="600" fill="url(#jac)" clip-path="url(#${id})"/>`;
      return `<rect x="0" y="0" width="420" height="600" fill="#000" opacity=".35" filter="url(#grain)" clip-path="url(#${id})"/>`;
    };
    const stitch = k => `<path d="${rpath(inset(G[k], -5.5), RAD[k] + 5)}" fill="none" stroke="${THREAD}" stroke-width="1.1" stroke-dasharray="3.4 2.4" stroke-linecap="round"/>` + (dbl ? `<path d="${rpath(inset(G[k], -9.5), RAD[k] + 9)}" fill="none" stroke="${THREAD}" stroke-width="1.1" stroke-dasharray="3.4 2.4" stroke-linecap="round"/>` : "");
    const edge = k => `<path d="${P(k)}" fill="none" stroke="rgba(0,0,0,.5)" stroke-width="2.2"/>` + stitch(k);
    const frame = (k, color, grad) => `<path d="${P(k)}" fill="${color}"/><path d="${P(k)}" fill="#000" opacity=".3" filter="url(#grain)"/><path d="${P(k)}" fill="url(#gH)"/><path d="${P(k)}" fill="url(#${grad || "gV"})"/><path d="${P(k)}" fill="none" stroke="rgba(0,0,0,.4)" stroke-width="1"/>`;
    const insert = (k, clip) => `<path d="${P(k)}" fill="${ins}"/>${texture(clip)}${st.design === "plain" ? "" : `<g clip-path="url(#${clip})">${quilt(st.design, G[k], dbl)}</g>`}<path d="${P(k)}" fill="url(#gIn)"/>`;
    const seam = (d, clip) => `<g clip-path="url(#${clip})"><path d="${d}" stroke="rgba(0,0,0,.5)" stroke-width="2" fill="none"/><path d="${d}" stroke="${THREAD}" stroke-width="1.1" stroke-dasharray="3.4 2.4" fill="none" transform="translate(0 -5)"/>${dbl ? `<path d="${d}" stroke="${THREAD}" stroke-width="1.1" stroke-dasharray="3.4 2.4" fill="none" transform="translate(0 5)"/>` : ""}</g>`;
    const jl = insColor()[3] || "#ccc";
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
  <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="${st.mat === "alc" ? ".06" : ".14"}"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".26"/></linearGradient>
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

  /* ---------- расчёт: базовая цена комплекта по материалу вставок + доплаты; остальное — по запросу ---------- */
  const insColor = () => { const c = MATS[st.mat].colors; return c[st.ins] || Object.values(c)[0]; };
  const matName = id => (MATS[id].full || MATS[id].name);
  function compute() {
    const m = st.model, d = DESIGNS[st.design], base = (m ? m.p : DEF_P)[MATS[st.mat].idx];
    const lines = [{ n: `Комплект на весь салон${m ? ", " + A.genName(m) : ""}: ${matName(st.mat).toLowerCase()}`, v: base, kind: "paid" }];
    if (dPrice(st.design, st.mat)) lines.push({ n: `Рисунок «${d.name}»`, v: dPrice(st.design, st.mat), kind: "paid" });
    if (st.sideMat === "alc") lines.push({ n: "Боковины из алькантары", v: SIDE_ALC_PRICE, kind: "paid" });
    paid().forEach(a => lines.push({ n: a.name, v: a.price, kind: "paid" }));
    if (st.back !== "black") lines.push({ n: "Тыл другого цвета", kind: "ask" });
    st.opts.forEach(id => OPTS[id] && lines.push({ n: OPTS[id].name, kind: "ask" }));
    lines.push({ n: "Разрывные швы под Airbag", kind: "incl" }, { n: "Оплётка руля в цвет салона", kind: "gift" });
    return { total: lines.reduce((s, l) => s + (l.kind === "paid" ? l.v : 0), 0), lines, front: st.salon.kit === "front" };
  }
  const sideText = () => st.sideMat === "alc" ? `алькантара, ${insColor()[0].toLowerCase()}` : "экокожа, " + ECO[st.side][0].toLowerCase();
  const salonText = () => {
    const qs = SALON.filter(q => q.id !== "kit" && !(q.rear && st.salon.kit === "front")), known = qs.filter(q => st.salon[q.id]);
    return [(st.model && st.model.v ? st.model.v + ", " : "") + SALON[0].opts.find(o => o[0] === st.salon.kit)[1].toLowerCase()]
      .concat(known.map(q => `${q.name.toLowerCase()}: ${q.opts.find(o => o[0] === st.salon[q.id])[1].toLowerCase()}`), known.length < qs.length ? ["комплектацию уточнит менеджер"] : []).join(", ");
  };
  const extrasText = () => paid().map(a => `${a.name} +${A.fmt(a.price)}`).concat([...st.opts].filter(id => OPTS[id]).map(id => OPTS[id].name + " (по запросу)")).join(", ") || "—";
  const summary = () => {
    const c = compute();
    return [
      ["Автомобиль", st.model ? A.carName(st.model) : "не выбран"],
      ["Салон", salonText()],
      ["Рисунок", DESIGNS[st.design].name],
      ["Центральная часть", `${matName(st.mat)}, ${insColor()[0].toLowerCase()}`],
      ["Боковины", sideText()],
      ["Тыл", "экокожа, " + ECO[st.back][0].toLowerCase() + (st.back === "black" ? "" : " (по запросу)")],
      ["Дополнительно", extrasText()],
      ["Итого на сайте", c.front ? "передний ряд — по запросу" : "от " + A.fmt(c.total)]
    ];
  };
  /* выбор для заказа и заявки: сервер берёт mat, design, side_mat, salon.kit и opts, остальное — для менеджера */
  const buildConfig = () => ({ design: st.design, side_mat: st.sideMat, side: st.side, mat: st.mat, ins: st.ins, ins_name: `${matName(st.mat)}, ${insColor()[0].toLowerCase()}`, back: st.back, salon: Object.assign({}, st.salon), opts: [...st.opts].filter(id => OPTS[id] || paid().some(a => a.id === id)), total: compute().total });

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
  const card = (attr, id, on, ico, name, note, tag) => `<button type="button" class="cfg__card${on ? " is-selected" : ""}" ${attr}="${id}">${ico}<b>${name}</b><span>${note}</span>${tag ? `<em>${tag}</em>` : ""}</button>`;
  /* материал и цвет в одном окне: материалы — открытым списком строк (новый материал — новая строка), ниже цвета; над каждой частью — подсказка, что выбрать */
  const matRow = x => `<img src="${SW(x.img)}" alt=""><span><b>${e(x.name)}</b><small>${e(x.note)}</small></span><em>${x.price}</em>`;
  const matList = list => `<div class="mlist">${list.map(x => x.attr ? `<button type="button" class="mlist__opt${x.on ? " is-selected" : ""}" ${x.attr}="${x.id}" aria-pressed="${!!x.on}">${matRow(x)}</button>` : `<div class="mlist__opt is-selected">${matRow(x)}</div>`).join("")}</div>`;
  const part = (label, value, body) => `<div class="cfg__wpart"><div class="cfg__wlabel"><b>${label}</b>${value ? `<span>${e(value)}</span>` : ""}</div>${body}</div>`;
  const tile = (attr, id, img, name, on, sub) => `<button type="button" class="cfg__color${on ? " is-selected" : ""}" ${attr}="${id}"><i style="background-image:url('${SW(img)}')"></i><span>${e(name)}${sub ? `<small>${sub}</small>` : ""}</span></button>`;
  const optRow = (id, name, note, price, on, off) => `<label class="cfg__opt${off ? " is-off" : ""}"><span class="cfg__opt-t"><b>${e(name)}</b><small>${e(note)}</small></span><em>${price}</em><input type="checkbox" data-opt="${id}"${on ? " checked" : ""}${off ? " disabled" : ""}><i class="sw"></i></label>`;
  function renderControls() {
    const base = st.model ? st.model.p : DEF_P, g = curGen();
    renderNav();
    cbxFields();
    $$("[data-pick-chip]").forEach(c => c.classList.toggle("is-selected", !!st.model && c.dataset.pickChip === st.model.s));
    /* 2. салон */
    $("[data-c-salon]").innerHTML = (!st.model
      ? `<div class="cfg__empty"><p>Сначала выберите автомобиль — от него зависят лекало и цена.</p><button type="button" class="btn btn--ghost btn--sm" data-go="0">Выбрать автомобиль</button></div>`
      : g && g.items.length > 1
        ? `<div class="cfg__q"><span>Вариант салона — у каждого своё лекало</span><div class="chips">${g.items.map(m => `<button type="button" class="chip${st.model === m ? " is-selected" : ""}" data-variant="${m.s}">${e(m.v || "Стандартный")}</button>`).join("")}</div></div>`
        : `<p class="cfg__note">Для ${e(A.carName(st.model))} в каталоге одно лекало салона.</p>`)
      + SALON.filter(q => !(q.rear && st.salon.kit === "front")).map(q => `<div class="cfg__q"><span>${q.name}</span><div class="seg seg--auto">${q.opts.map(([v, n]) => `<button type="button" class="${st.salon[q.id] === v ? "is-selected" : ""}" data-salon="${q.id}" data-v="${v}">${SPLIT[v] && q.id === "backrest" ? splitIco(v) : ""}${n}</button>`).join("")}</div>${q.hint ? `<p class="cfg__hint">${q.hint}</p>` : ""}${q.legend ? `<dl class="cfg__terms">${q.legend.map(([v, n, d]) => `<div><dt>${splitIco(v)}${n}</dt><dd>${d}</dd></div>`).join("")}</dl>` : ""}</div>`).join("")
      + `<p class="cfg__note">Не уверены — оставьте «Не знаю», комплектацию уточнит менеджер.</p>`;
    /* 3. рисунок */
    $("[data-b-designs]").innerHTML = Object.entries(DESIGNS).map(([id, d]) => { const p = dPrice(id, st.mat === "alc" ? "alc" : "eco"); return card("data-design", id, st.design === id, `<svg viewBox="0 0 40 26" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="1" y="1" width="38" height="24" rx="5"/>${d.ico}</svg>`, d.name, d.note, p ? "+" + A.fmt(p) : "входит"); }).join("");
    $("[data-b-design-note]").textContent = st.mat === "jac" ? "На жаккарде настрочек нет — только гладкая серединка." : "Ромб шьём на гладкой экокоже и алькантаре, полосы — на любом материале, кроме жаккарда.";
    /* 4. боковины: материал и цвет в одном окне */
    $("[data-b-sides]").innerHTML = part("Выберите материал", SIDE_MATS[st.sideMat].name, matList(Object.entries(SIDE_MATS).map(([id, s]) => ({ attr: "data-side-mat", id, img: id === "eco" ? ECO[st.side][2] : (st.mat === "alc" ? insColor()[2] : "alca-grey"), name: s.name, note: s.note, price: s.price, on: st.sideMat === id }))))
      + (st.sideMat === "eco"
        ? part("Выберите цвет", ECO[st.side][0], `<div class="cfg__colors">${Object.entries(ECO).map(([id, c]) => tile("data-side", id, c[2], c[0], st.side === id)).join("")}</div>`)
        : part("Цвет", insColor()[0], `<p class="cfg__winnote">Весь перед сиденья — из алькантары того же цвета, что центральная часть. Цвет меняется в разделе «Центральная часть», тыл остаётся из экокожи.</p>`));
    /* 5. центральная часть */
    const ic = MATS[st.mat].colors[st.ins] ? st.ins : Object.keys(MATS[st.mat].colors)[0];
    $("[data-b-inserts]").innerHTML = part("Выберите материал", MATS[st.mat].name, matList(Object.entries(MATS).map(([id, m]) => { const n = Object.keys(m.colors).length; return { attr: "data-mat", id, img: Object.values(m.colors)[0][2], name: m.name, note: `${MAT_NOTE[id]} · ${n} ${A.plural(n, "цвет", "цвета", "цветов")}`, price: A.fmt(base[m.idx]), on: st.mat === id }; })))
      + part("Выберите цвет", MATS[st.mat].colors[ic][0], `<div class="cfg__colors">${Object.entries(MATS[st.mat].colors).map(([id, c]) => tile("data-ins", id, c[2], c[0], ic === id)).join("")}</div>`);
    /* 6. тыл */
    $("[data-b-backs]").innerHTML = part("Материал", "", matList([{ img: ECO[st.back][2], name: "Экокожа «Аригон»", note: "Чёрный входит в комплект, другой цвет — по запросу", price: "" }]))
      + part("Выберите цвет", ECO[st.back][0], `<div class="cfg__colors">${Object.entries(ECO).map(([id, c]) => tile("data-back", id, c[2], c[0], st.back === id, id === "black" ? "входит" : "по запросу")).join("")}</div>`);
    /* 7. дополнительно: переключатель, цена и подписи — ровными колонками */
    $("[data-b-opts]").innerHTML = `<h3 class="cfg__sub">С доплатой</h3>` + A.ADDONS.filter(a => PAID[a.id]).map(a => { const ok = PAID[a.id](); return optRow(a.id, SHORT[a.id] || a.name, ok ? NOTE[a.id] || a.note : WHY[a.id], "+" + A.fmt(a.price), ok && st.opts.has(a.id), !ok); }).join("")
      + `<h3 class="cfg__sub">По запросу — стоимость уточнит менеджер</h3>` + Object.entries(OPTS).map(([id, o]) => optRow(id, o.name, o.note, "по запросу", st.opts.has(id), false)).join("");
  }
  function render() {
    if (!MATS[st.mat].colors[st.ins]) st.ins = Object.keys(MATS[st.mat].colors)[0];
    A.ADDONS.forEach(a => { if (PAID[a.id] && !PAID[a.id]()) st.opts.delete(a.id); });
    renderControls();
    const c = compute(), m = st.model;
    drawSeat();
    const set = (sel, v) => $$(sel, document).forEach(x => { x.innerHTML = v; });
    set("[data-b-total-label]", c.front ? "Передний ряд" : 'Итого<span class="cfg__lbl"> за весь салон</span>');
    set("[data-b-total]", c.front ? "по запросу" : A.fmt(c.total));
    set("[data-b-lines]", (c.front ? `<div><span>Весь салон для сравнения</span><b>${A.fmt(c.total)}</b></div>` : "") + c.lines.map((l, i) => `<div><span>${e(l.n)}</span><b class="${l.kind === "incl" || l.kind === "gift" ? "free" : ""}">${l.kind === "gift" ? "в подарок" : l.kind === "incl" ? "включено" : l.kind === "ask" ? "по запросу" : (i ? "+" : "") + A.fmt(l.v)}</b></div>`).join(""));
    set("[data-b-car]", m ? e(A.carName(m)) : "Автомобиль не выбран");
    set("[data-b-car-sub]", m ? e([m.v, A.yearsText(m)].filter(Boolean).join(" · ")) : "Выберите автомобиль справа — цена зависит от лекала");
    set("[data-b-val=car]", m ? e(A.genName(m)) : "не выбран");
    set("[data-b-val=salon]", c.front ? "передний ряд" : m && m.v ? e(m.v) : "весь салон");
    set("[data-b-val=design]", DESIGNS[st.design].name);
    set("[data-b-val=side]", st.sideMat === "alc" ? "алькантара" : ECO[st.side][0]);
    set("[data-b-val=ins]", `${MATS[st.mat].name}, ${insColor()[0].toLowerCase()}`);
    set("[data-b-val=back]", ECO[st.back][0]);
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
    const bar = $("[data-b-steps]");
    bar.innerHTML = STEPS.map(([id, short], i) => `<button type="button" class="${i === cur ? "is-active" : ""}${i === 0 && st.model && cur ? " is-done" : ""}" data-go="${i}"${i === cur ? ' aria-current="true"' : ""}><i>${i + 1}</i><span>${short}</span></button>`).join("");
    const a = $(".is-active", bar);
    if (a && bar.scrollWidth > bar.clientWidth) bar.scrollLeft = a.offsetLeft - (bar.clientWidth - a.offsetWidth) / 2;
  }
  function go(i) {
    openDrop("");
    window.scrollTo({ top: $(`[data-step="${STEPS[i][0]}"]`).getBoundingClientRect().top + scrollY - topGap(), behavior: "smooth" });
  }
  function spy() {
    const y = topGap() + 80;
    let i = 0;
    STEPS.forEach(([id], k) => { if ($(`[data-step="${id}"]`).getBoundingClientRect().top <= y) i = k; });
    if (i === cur) return;
    cur = i;
    renderNav();
  }
  addEventListener("scroll", spy, { passive: true });

  /* ---------- события: несовместимые сочетания переключаем сами и говорим об этом ---------- */
  function setDesign(id) {
    st.design = id;
    if (!DESIGNS[id].ok(st.mat)) { const was = st.mat; st.mat = id === "rhomb" ? "eco" : "perf"; A.toast(`${id === "rhomb" ? "Ромб" : "Полосы"} на ${was === "jac" ? "жаккарде" : "перфорации"} не шьём — вставки: ${MATS[st.mat].name.toLowerCase()}`); }
  }
  function setMat(id) {
    const msg = [];
    st.mat = id;
    if (!DESIGNS[st.design].ok(id)) { st.design = "plain"; msg.push(`рисунок «Без рисунка»: ${id === "jac" ? "на жаккарде настрочек нет" : "ромб шьём на гладкой экокоже и алькантаре"}`); }
    if (st.sideMat === "alc" && !SIDE_MATS.alc.ok(id)) { st.sideMat = "eco"; msg.push("боковины из экокожи: алькантаровые шьём только с алькантарой в центре"); }
    if (msg.length) A.toast(`${MATS[id].name} — ${msg.join("; ")}`);
  }
  function setSideMat(id) {
    st.sideMat = id;
    if (!SIDE_MATS[id].ok(st.mat)) { st.mat = "alc"; A.toast("Боковины из алькантары шьём вместе с алькантарой в центре — центральная часть: алькантара"); }
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
    if (d.design) setDesign(d.design);
    else if (d.sideMat) setSideMat(d.sideMat);
    else if (d.side) st.side = d.side;
    else if (d.mat) setMat(d.mat);
    else if (d.ins) st.ins = d.ins;
    else if (d.back) st.back = d.back;
    else if (d.salon) st.salon[d.salon] = d.v;
    else if (d.variant) setModel(A.BY_SLUG[d.variant]);
    else if (d.pickChip) { setModel(A.BY_SLUG[d.pickChip]); if (mode === "vin") $("[data-c-vin-out]").innerHTML = `<div class="vin-msg vin-msg--ok">Выбрано: ${e(A.carName(st.model))}${st.model.y ? " · " + e(st.model.y) : ""}</div>`; }
    else return;
    render();
  });
  root.addEventListener("change", ev => {
    const t = ev.target;
    if (t.dataset.opt) { t.checked ? st.opts.add(t.dataset.opt) : st.opts.delete(t.dataset.opt); render(); }
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
  $$("[data-b-reset]", document).forEach(b => b.addEventListener("click", () => { Object.assign(st, DEF); st.salon = Object.assign({}, DEF_SALON); st.opts.clear(); render(); A.toast("Настройки сброшены"); }));
  /* VIN или номер кузова: подсказки модели с сервера */
  window.AS_vin && window.AS_vin.suggest($("[data-c-vin]"), { onPick: slug => { setModel(A.BY_SLUG[slug]); render(); $("[data-c-vin-out]").innerHTML = `<div class="vin-msg vin-msg--ok">Выбрано: ${e(A.carName(st.model))}${st.model.y ? " · " + e(st.model.y) : ""}</div>`; } });

  /* лёгкий 3D-поворот превью за курсором */
  const stage = $("[data-b-canvas]");
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    stage.addEventListener("pointermove", ev => { const r = stage.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width - 0.5, y = (ev.clientY - r.top) / r.height - 0.5; stage.style.setProperty("--ry", fx(x * 18) + "deg"); stage.style.setProperty("--rx", fx(-y * 8) + "deg"); });
    stage.addEventListener("pointerleave", () => { stage.style.setProperty("--ry", "0deg"); stage.style.setProperty("--rx", "0deg"); });
  }

  /* ---------- эскиз в PNG ---------- */
  const svgUrl = () => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(seatSVG());
  function download() {
    const img = new Image();
    img.onload = () => {
      const W = 1200, H = 1560, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
      const g = cv.getContext("2d"), grd = g.createRadialGradient(W / 2, 380, 80, W / 2, 560, 900);
      grd.addColorStop(0, "#ffffff"); grd.addColorStop(1, "#e6e6e1"); g.fillStyle = grd; g.fillRect(0, 0, W, H);
      const sh = 1000, sw = sh * 420 / 600; g.drawImage(img, (W - sw) / 2, 40, sw, sh);
      g.fillStyle = "#231f20"; g.font = "800 44px Golos Text, Arial, sans-serif"; g.fillText("Эскиз чехлов" + (st.model ? " на " + A.carName(st.model) : ""), 70, 1120);
      g.font = "500 28px Golos Text, Arial, sans-serif"; let y = 1180;
      summary().slice(1, -1).forEach(([k, v]) => { g.fillStyle = "#6b6e74"; g.fillText(k, 70, y); g.fillStyle = "#231f20"; g.fillText(v.length > 48 ? v.slice(0, 46) + "…" : v, 360, y); y += 44; });
      const c = compute();
      g.font = "800 40px Golos Text, Arial, sans-serif"; g.fillText(c.front ? "Передний ряд — по запросу" : "от " + A.fmt(c.total).replace(/ /g, " "), 70, H - 60);
      g.font = "500 26px Golos Text, Arial, sans-serif"; g.fillStyle = "#6b6e74"; g.textAlign = "right"; g.fillText("Автостиль · 8 (800) 775-32-60", W - 70, H - 64);
      cv.toBlob(b => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "avtostil-eskiz.png"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000); });
    };
    img.src = svgUrl();
  }
  $$("[data-b-download]", document).forEach(b => b.addEventListener("click", download));

  /* ---------- корзина: собранный комплект — отдельная позиция custom:<лекало>:<ключ выбора> ---------- */
  const hashStr = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0; return h.toString(36); };
  function addToCart() {
    const m = st.model, c = compute();
    if (!m) { A.toast("Выберите автомобиль — без него не подобрать лекало"); go(0); return; }
    if (c.front) { A.toast("Передний ряд оформим заявкой: стоимость рассчитает менеджер"); openModal(); return; }
    const low = s => s.charAt(0).toLowerCase() + s.slice(1);
    const config = buildConfig(), ask = [...st.opts].filter(id => OPTS[id]).map(id => low(OPTS[id].name)).concat(st.back === "black" ? [] : ["тыл другого цвета"]);
    const label = `${DESIGNS[st.design].name}, вставки: ${matName(st.mat).toLowerCase()} ${insColor()[0].toLowerCase()}, ${st.sideMat === "alc" ? "боковины из алькантары" : "боковины: экокожа " + ECO[st.side][0].toLowerCase()}, тыл: ${ECO[st.back][0].toLowerCase()}`
      + (paid().length ? ", " + paid().map(a => low(a.name)).join(", ") : "") + (ask.length ? "; по запросу: " + ask.join(", ") : "");
    A.Cart.add({ id: `custom:${m.s}:${hashStr(JSON.stringify(config))}`, title: `Индивидуальный пошив: чехлы на ${A.carName(m)}`, sub: label, label, price: c.total, img: svgUrl(),
      url: A.href("custom", { m: m.s, cfg: JSON.stringify(config) }), model: m.s, config, opts: { mats: st.opts.has("mats"), install: st.opts.has("install") } });
    A.toast("Комплект добавлен в корзину", ["Перейти", A.href("cart")]);
  }

  /* ---------- заявка менеджеру ---------- */
  const modal = document.querySelector("[data-b-modal]");
  const fillModal = () => {
    const c = compute();
    $("[data-b-mini]", modal).innerHTML = `<img src="${svgUrl()}" alt="Ваш дизайн">`;
    $("[data-b-summary]", modal).innerHTML = summary().slice(0, -1).map(([k, v]) => `<div><dt>${k}</dt><dd>${e(v)}</dd></div>`).join("") + `<div class="breq__total"><dt>${c.front ? "Передний ряд" : "Весь салон от"}</dt><dd>${c.front ? "по запросу" : A.fmt(c.total)}</dd></div>`;
  };
  /* подсказки в поле VIN заявки: выбрал автомобиль из списка — он подставляется в конструктор и в сводку */
  window.AS_vin && window.AS_vin.suggest($("[data-req-vin]", modal), { onPick: slug => { setModel(A.BY_SLUG[slug]); render(); fillModal(); A.toast("Автомобиль выбран: " + A.carName(A.BY_SLUG[slug])); } });
  function openModal() {
    fillModal();
    $("[data-b-form]", modal).hidden = false; $("[data-b-done]", modal).hidden = true;
    const rv = $("[data-req-vin]", modal); if (rv && !rv.value) { try { rv.value = localStorage.getItem("as_vin") || ""; } catch (er) {} }
    modal.classList.add("is-open"); document.body.style.overflow = "hidden";
    setTimeout(() => { const i = $("input", modal); i && i.focus(); }, 50);
  }
  const closeModal = () => { modal.classList.remove("is-open"); document.body.style.overflow = ""; };
  $$("[data-b-open]", document).forEach(b => b.addEventListener("click", openModal));
  $$("[data-b-close]", modal).forEach(b => b.addEventListener("click", closeModal));
  document.addEventListener("keydown", ev => { if (ev.key === "Escape" && modal.classList.contains("is-open")) closeModal(); });
  /* заявка → /api/requests: выбор в конструкторе, сводка для менеджера, контакты, VIN. Сервер берёт из config материал вставок (mat) и опции (opts) */
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
    const done = $("[data-b-done] p", modal); if (done && res.data.number) done.textContent = `Номер заявки ${res.data.number}. В рабочее время вам перезвонит оператор, уточнит комплектацию салона и стоимость.`;
  });

  /* превью высотой в первый экран: от верха конструктора до низа окна */
  const fit = () => root.style.setProperty("--cfg-h", Math.max(620, Math.round(innerHeight - (root.getBoundingClientRect().top + scrollY) - 16)) + "px");
  fit(); addEventListener("resize", fit);

  /* ?m=лекало — автомобиль, ?cfg=… — выбор из корзины («изменить комплект») */
  const preset = A.BY_SLUG[A.qs("m")];
  if (preset) setModel(preset);
  try {
    const c = JSON.parse(A.qs("cfg") || "null");
    if (c) {
      if (DESIGNS[c.design]) st.design = c.design;
      if (MATS[c.mat]) st.mat = c.mat;
      if (typeof c.ins === "string") st.ins = c.ins;
      if (SIDE_MATS[c.side_mat]) st.sideMat = c.side_mat;
      if (ECO[c.side]) st.side = c.side;
      if (ECO[c.back]) st.back = c.back;
      if (c.salon) SALON.forEach(q => { if (q.opts.some(o => o[0] === c.salon[q.id])) st.salon[q.id] = c.salon[q.id]; });
      (c.opts || []).forEach(o => st.opts.add(String(o)));
    }
  } catch (er) {}
  render(); spy();
})();
