/* Конструктор индивидуального пошива: живое превью сиденья, расчёт цены, заявка на пошив */
(function () {
  const A = window.AS, e = A.esc, root = document.querySelector("[data-builder]");
  if (!root) return;
  const $ = (s, r = root) => r.querySelector(s), $$ = (s, r = root) => [...r.querySelectorAll(s)];
  const SW = n => "assets/swatches/" + n + ".jpg";

  /* ---------- палитры и цены ---------- */
  const ECO = {
    black: ["Чёрный", "#202224", "eco-black"], graphite: ["Графит", "#3d4646", "eco-grey"], light: ["Светло-серый", "#aaa49e", "eco-light"],
    cream: ["Кремовый", "#cbc2b5", "eco-cream"], beige: ["Бежевый", "#d4c597", "eco-beige"], choco: ["Шоколад", "#4b3d2c", "eco-choco"],
    chestnut: ["Каштан", "#a0562c", "eco-chestnut"], red: ["Красный", "#c4351f", "eco-red"], cherry: ["Вишня", "#871c3f", "eco-cherry"],
    orange: ["Оранжевый", "#dd651b", "eco-orange"], blue: ["Синий", "#4a5989", "eco-blue"], navy: ["Тёмно-синий", "#2d3a66", "eco-navy"]
  };
  const PERF_SW = { black: "perf-black", graphite: "perf-grey" };
  const MATS = {
    eco: { name: "Экокожа", note: "Практичная, моется", idx: 1, add: 0, colors: ECO },
    perf: { name: "Перфорация", full: "Экокожа с перфорацией", note: "Дышит, не потеет", idx: 1, add: 500, colors: ECO },
    alc: { name: "Алькантара", note: "Бархатистая, тёплая", idx: 2, add: 0, colors: { black: ["Чёрная", "#2a2d2b", "alca-black"], grey: ["Серая", "#8f8a80", "alca-grey"] } },
    jac: { name: "Жаккард", note: "Плотная ткань", idx: 0, add: 0, colors: { bw: ["Чёрно-серый", "#4b4c49", "jac-bw", "#c9c9c4"], blue: ["Синий", "#2b5d99", "jac-blue", "#79a8de"], red: ["Красный", "#ad3338", "jac-red", "#ea9494"] } }
  };
  const THREAD = { black: ["Чёрная", "#17181a"], grey: ["Серая", "#a3a5ab"], white: ["Белая", "#f4f3ee"], beige: ["Бежевая", "#dcc89a"], red: ["Красная", "#d8322a"], orange: ["Оранжевая", "#f07a1a"], yellow: ["Жёлтая", "#f2d21b"], blue: ["Синяя", "#2d63da"] };
  const DESIGNS = {
    classic: { name: "Классика", note: "Поперечные полосы", add: 0, ico: '<path d="M2 9h36M2 17h36"/>' },
    rhomb: { name: "Ромб", note: "Самый популярный", add: 1200, ico: '<path d="M2 13 9 4l7 9 7-9 7 9 7-9M2 13l7 9 7-9 7 9 7-9 7 9"/>' },
    honey: { name: "Соты", note: "Объёмная стёжка", add: 1500, ico: '<path d="M8 5l5 3v5l-5 3-5-3V8zM20 5l5 3v5l-5 3-5-3V8zM32 5l5 3v5l-5 3-5-3V8zM14 15l5 3v5l-5 3-5-3v-5zM26 15l5 3v5l-5 3-5-3v-5z"/>' },
    vert: { name: "Полосы", note: "Вертикальные каналы", add: 900, ico: '<path d="M9 2v22M17 2v22M25 2v22M33 2v22"/>' }
  };
  const OPTS = {
    embroidery: { name: "Вышивка на подголовниках", note: "Марка авто нитью в цвет строчки", add: 1500 },
    armrest: { name: "Задний подлокотник", note: "Чехол из того же материала", add: 600 },
    mats: { name: "Коврики EVA в цвет", note: "Кант под цвет боковин, −15 %", add: 3900 },
    install: { name: "Установка в Москве", note: "Мастерская на Полярной, 1,5 часа", add: 2500 }
  };
  const DOUBLE = 800, PIPING = 1000, DEF_P = [7975, 9375, 9975];
  const DEF = { design: "rhomb", side: "black", mat: "alc", ins: "grey", thread: "grey", stitch: "single", piping: false, pipe: "red" };
  const st = Object.assign({ model: null, opts: new Set() }, DEF);

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

  /* стёжка на вставках: канавка, «подушки» между ними и строчка по обе стороны */
  function quilt(type, pts, thread, dbl) {
    const [x0, y0, x1, y1] = bbox(pts), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, D = Math.hypot(x1 - x0, y1 - y0) / 2 + 12;
    const groove = 'stroke="rgba(0,0,0,.42)" stroke-width="1.6" fill="none"', dash = `stroke="${thread}" stroke-width="1.05" stroke-dasharray="3.2 2.4" fill="none" stroke-linecap="round"`;
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
    if (type === "vert") family(90, 21);
    if (type === "rhomb") { family(58, 24); family(-58, 24); }
    if (type === "honey") {
      const R = 12.5, h = Math.sqrt(3) * R, hex = (x, y, r) => rpath([0, 1, 2, 3, 4, 5].map(i => [x + r * Math.cos(Math.PI / 3 * i), y + r * Math.sin(Math.PI / 3 * i)]), 1.5);
      for (let c = 0, x = x0 - R; x < x1 + R; c++, x += 1.5 * R) for (let y = y0 - h + (c % 2 ? h / 2 : 0); y < y1 + h; y += h) {
        out += `<path d="${hex(x, y, R)}" ${groove}/><path d="${hex(x, y, R * 0.76)}" ${dash}/><path d="${hex(x - 1, y - 2, R * 0.5)}" fill="rgba(255,255,255,.07)"/>`;
      }
    }
    return out;
  }

  function seatSVG() {
    const side = ECO[st.side][1], mat = MATS[st.mat], ic = mat.colors[st.ins] || Object.values(mat.colors)[0], ins = ic[1];
    const thread = THREAD[st.thread][1], pipe = THREAD[st.pipe][1], dbl = st.stitch === "double";
    const emb = st.opts.has("embroidery"), brand = st.model ? A.brandName(st.model.b).toUpperCase() : "АВТОСТИЛЬ";
    const P = k => rpath(G[k], { head: 40, back: 24, cush: 24, headIn: 26, backIn: 14, cushIn: 12 }[k]);
    const texture = id => {
      if (st.mat === "perf") return `<rect x="0" y="0" width="420" height="600" fill="url(#perf)" clip-path="url(#${id})"/>`;
      if (st.mat === "alc") return `<rect x="0" y="0" width="420" height="600" fill="#000" opacity=".5" filter="url(#suedeD)" clip-path="url(#${id})"/><rect x="0" y="0" width="420" height="600" fill="#fff" opacity=".22" filter="url(#suedeL)" clip-path="url(#${id})"/>`;
      if (st.mat === "jac") return `<rect x="0" y="0" width="420" height="600" fill="url(#jac)" clip-path="url(#${id})"/>`;
      return `<rect x="0" y="0" width="420" height="600" fill="#000" opacity=".35" filter="url(#grain)" clip-path="url(#${id})"/>`;
    };
    const edge = (k, out) => {
      const pts = G[k], r = { headIn: 26, backIn: 14, cushIn: 12 }[k];
      let s = st.piping ? `<path d="${P(k)}" fill="none" stroke="${pipe}" stroke-width="4.2"/><path d="${P(k)}" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="1.1" transform="translate(-.6 -.8)"/>`
        : `<path d="${P(k)}" fill="none" stroke="rgba(0,0,0,.5)" stroke-width="2.2"/>`;
      s += `<path d="${rpath(inset(pts, -5.5), r + 5)}" fill="none" stroke="${thread}" stroke-width="1.1" stroke-dasharray="3.4 2.4" stroke-linecap="round"/>`;
      if (dbl) s += `<path d="${rpath(inset(pts, -9.5), r + 9)}" fill="none" stroke="${thread}" stroke-width="1.1" stroke-dasharray="3.4 2.4" stroke-linecap="round"/>`;
      return s + (out || "");
    };
    const frame = (k, grad) => `<path d="${P(k)}" fill="${side}"/><path d="${P(k)}" fill="#000" opacity=".3" filter="url(#grain)"/><path d="${P(k)}" fill="url(#gH)"/><path d="${P(k)}" fill="url(#${grad || "gV"})"/><path d="${P(k)}" fill="none" stroke="rgba(0,0,0,.4)" stroke-width="1"/>`;
    const insert = (k, clip, plain) => `<path d="${P(k)}" fill="${ins}"/>${texture(clip)}${plain ? "" : `<g clip-path="url(#${clip})">${quilt(st.design, G[k], thread, dbl)}</g>`}<path d="${P(k)}" fill="url(#gIn)"/>`;
    const seam = (d, clip) => `<g clip-path="url(#${clip})">${st.piping ? `<path d="${d}" stroke="${pipe}" stroke-width="4" fill="none"/>` : `<path d="${d}" stroke="rgba(0,0,0,.5)" stroke-width="2" fill="none"/>`}<path d="${d}" stroke="${thread}" stroke-width="1.1" stroke-dasharray="3.4 2.4" fill="none" transform="translate(0 -5)"/>${dbl ? `<path d="${d}" stroke="${thread}" stroke-width="1.1" stroke-dasharray="3.4 2.4" fill="none" transform="translate(0 5)"/>` : ""}</g>`;
    const jl = ic[3] || "#ccc", fs = Math.min(15, 128 / brand.length);
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
<ellipse cx="210" cy="568" rx="172" ry="13" fill="#000" opacity=".28" filter="url(#soft)"/>
<rect x="175" y="118" width="9" height="30" rx="3" fill="url(#chrome)"/><rect x="236" y="118" width="9" height="30" rx="3" fill="url(#chrome)"/>
${frame("head", "gR")}
${insert("headIn", "cHead", emb)}${edge("headIn")}
${emb ? `<text x="210.6" y="${fx(79 + fs * 0.35 + 0.8)}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="800" font-size="${fx(fs)}" letter-spacing="1.6" fill="rgba(0,0,0,.45)">${e(brand)}</text><text x="210" y="${fx(79 + fs * 0.35)}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="800" font-size="${fx(fs)}" letter-spacing="1.6" fill="${thread}">${e(brand)}</text>` : ""}
${frame("back")}
<path d="M106 196 L99 344" stroke="#fff" stroke-opacity=".14" stroke-width="12" stroke-linecap="round" filter="url(#hl)"/><path d="M314 196 L321 344" stroke="#fff" stroke-opacity=".1" stroke-width="12" stroke-linecap="round" filter="url(#hl)"/>
${insert("backIn", "cBack")}
${seam("M130 300 L290 300", "cBack")}
${edge("backIn")}
${frame("cush", "gC")}
<path d="M94 414 L80 512" stroke="#fff" stroke-opacity=".12" stroke-width="12" stroke-linecap="round" filter="url(#hl)"/><path d="M326 414 L340 512" stroke="#fff" stroke-opacity=".09" stroke-width="12" stroke-linecap="round" filter="url(#hl)"/>
${insert("cushIn", "cCush")}
${edge("cushIn")}
${seam("M50 520 Q210 528 370 520", "cCushF")}
</svg>`;
  }

  /* ---------- расчёт ---------- */
  function compute() {
    const m = st.model, mat = MATS[st.mat], des = DESIGNS[st.design];
    const base = (m ? m.p : DEF_P)[mat.idx];
    const lines = [{ n: "Комплект по лекалам" + (m ? ", " + A.genName(m) : ""), v: base, base: true }];
    if (mat.add) lines.push({ n: mat.full || mat.name, v: mat.add });
    lines.push({ n: "Рисунок «" + des.name + "»", v: des.add });
    if (st.stitch === "double") lines.push({ n: "Двойная строчка", v: DOUBLE });
    if (st.piping) lines.push({ n: "Кант по швам", v: PIPING });
    st.opts.forEach(id => lines.push({ n: OPTS[id].name, v: OPTS[id].add }));
    lines.push({ n: "Молнии под Airbag", v: 0 }, { n: "Оплётка на руль", v: 0, gift: 500 });
    return { total: lines.reduce((s, l) => s + l.v, 0), lines };
  }
  const insColor = () => { const c = MATS[st.mat].colors; return c[st.ins] || Object.values(c)[0]; };
  const insSwatch = id => st.mat === "perf" && PERF_SW[id] ? PERF_SW[id] : MATS[st.mat].colors[id][2];
  const summary = () => [
    ["Автомобиль", st.model ? A.carName(st.model) : "не выбран"],
    ["Боковины", "Экокожа, " + ECO[st.side][0].toLowerCase()],
    ["Вставки", (MATS[st.mat].full || MATS[st.mat].name) + ", " + insColor()[0].toLowerCase()],
    ["Рисунок", DESIGNS[st.design].name],
    ["Строчка", (st.stitch === "double" ? "двойная, " : "одинарная, ") + THREAD[st.thread][0].toLowerCase() + " нить"],
    ["Кант", st.piping ? THREAD[st.pipe][0].toLowerCase() : "без канта"],
    ["Опции", [...st.opts].map(id => OPTS[id].name).join(", ") || "—"]
  ];

  /* ---------- интерфейс ---------- */
  const swBtn = (id, name, bg, on, attr) => `<button type="button" class="${on ? "is-selected" : ""}" ${attr}="${id}" title="${e(name)}" aria-label="${e(name)}" style="${bg}"></button>`;
  function renderControls() {
    $("[data-b-designs]").innerHTML = Object.entries(DESIGNS).map(([id, d]) => `<button type="button" class="${st.design === id ? "is-selected" : ""}" data-design="${id}"><svg viewBox="0 0 40 26" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="1" y="1" width="38" height="24" rx="5"/>${d.ico}</svg><b>${d.name}</b><span>${d.add ? "+ " + A.fmt(d.add) : "без доплаты"}</span></button>`).join("");
    $("[data-b-sides]").innerHTML = Object.entries(ECO).map(([id, c]) => swBtn(id, c[0], `background-image:url('${SW(c[2])}')`, st.side === id, "data-side")).join("");
    const base = st.model ? st.model.p : DEF_P;
    $("[data-b-mats]").innerHTML = Object.entries(MATS).map(([id, m]) => { const c = Object.values(m.colors)[0]; return `<button type="button" class="${st.mat === id ? "is-selected" : ""}" data-mat="${id}"><img src="${SW(id === "perf" ? "perf-black" : c[2])}" alt=""><b>${m.name}</b><span>${A.fmt(base[m.idx] + m.add)}</span></button>`; }).join("");
    $("[data-b-inserts]").innerHTML = Object.entries(MATS[st.mat].colors).map(([id, c]) => swBtn(id, c[0], `background-image:url('${SW(insSwatch(id))}')`, (MATS[st.mat].colors[st.ins] ? st.ins : Object.keys(MATS[st.mat].colors)[0]) === id, "data-ins")).join("");
    $("[data-b-thread]").innerHTML = Object.entries(THREAD).map(([id, t]) => swBtn(id, t[0] + " нить", `background:${t[1]}`, st.thread === id, "data-thread")).join("");
    $("[data-b-pipe]").innerHTML = Object.entries(THREAD).map(([id, t]) => swBtn(id, t[0], `background:${t[1]}`, st.pipe === id, "data-pipe")).join("");
    $("[data-b-pipe-row]").hidden = !st.piping;
    $$("[data-b-stitch] button").forEach(b => b.classList.toggle("is-selected", b.dataset.stitch === st.stitch));
    $$("[data-opt]").forEach(i => { i.checked = st.opts.has(i.dataset.opt); });
    $("[data-piping]").checked = st.piping;
  }
  function render() {
    if (!MATS[st.mat].colors[st.ins]) st.ins = Object.keys(MATS[st.mat].colors)[0];
    renderControls();
    const svg = seatSVG(), c = compute(), m = st.model;
    $("[data-b-canvas]").innerHTML = svg;
    const set = (sel, v) => $$(sel, document).forEach(x => { x.innerHTML = v; });
    set("[data-b-total]", A.fmt(c.total));
    set("[data-b-lines]", c.lines.map(l => `<div><span>${e(l.n)}</span><b class="${l.v ? "" : "free"}">${l.gift ? `<s class="muted">${A.fmt(l.gift)}</s> подарок` : l.base ? A.fmt(l.v) : l.v ? "+ " + A.fmt(l.v) : "включено"}</b></div>`).join(""));
    set("[data-b-car]", m ? e(A.carName(m)) : "Автомобиль не выбран");
    set("[data-b-car-sub]", m ? e([m.v, A.yearsText(m)].filter(Boolean).join(" · ")) + " · лекала в базе" : "Выберите авто слева — цена зависит от лекала");
    set("[data-b-val=car]", m ? e(A.genName(m)) : "не выбран");
    set("[data-b-val=design]", DESIGNS[st.design].name);
    set("[data-b-val=side]", ECO[st.side][0]);
    set("[data-b-val=ins]", insColor()[0]);
    set("[data-b-val=thread]", THREAD[st.thread][0]);
    set("[data-b-legend]", [["Боковины", `background-image:url('${SW(ECO[st.side][2])}')`, ECO[st.side][0]], ["Вставки", `background-image:url('${SW(insSwatch(st.ins))}')`, MATS[st.mat].name + ", " + insColor()[0].toLowerCase()], ["Нить", `background:${THREAD[st.thread][1]}`, THREAD[st.thread][0]], ["Рисунок", "", DESIGNS[st.design].name]].concat(st.piping ? [["Кант", `background:${THREAD[st.pipe][1]}`, THREAD[st.pipe][0]]] : []).map(([k, bg, v]) => `<span>${bg ? `<i style="${bg}"></i>` : ""}${k}: <b>${e(v)}</b></span>`).join(""));
  }

  /* ---------- события ---------- */
  root.addEventListener("click", ev => {
    const b = ev.target.closest("button"); if (!b || !root.contains(b)) return;
    const d = b.dataset;
    if (d.design) st.design = d.design;
    else if (d.side) st.side = d.side;
    else if (d.mat) st.mat = d.mat;
    else if (d.ins) st.ins = d.ins;
    else if (d.thread) st.thread = d.thread;
    else if (d.pipe) st.pipe = d.pipe;
    else if (d.stitch) st.stitch = d.stitch;
    else if (d.pickChip) { picker && picker.set(d.pickChip); return; }
    else return;
    render();
  });
  root.addEventListener("change", ev => {
    const t = ev.target;
    if (t.dataset.opt) { t.checked ? st.opts.add(t.dataset.opt) : st.opts.delete(t.dataset.opt); render(); }
    if (t.hasAttribute("data-piping")) { st.piping = t.checked; render(); }
  });
  const picker = A.initPicker($("[data-cpicker]"), s => {
    st.model = s.m ? A.BY_SLUG[s.m] : null;
    $$("[data-pick-chip]").forEach(c => c.classList.toggle("is-selected", c.dataset.pickChip === s.m));
    render();
  });
  const preset = A.qs("m");
  $$("[data-b-reset]", document).forEach(b => b.addEventListener("click", () => { Object.assign(st, DEF); st.opts.clear(); render(); A.toast("Настройки сброшены"); }));

  /* лёгкий 3D-поворот превью за курсором */
  const stage = $("[data-b-canvas]");
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    stage.addEventListener("pointermove", ev => { const r = stage.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width - 0.5, y = (ev.clientY - r.top) / r.height - 0.5; stage.style.setProperty("--ry", fx(x * 18) + "deg"); stage.style.setProperty("--rx", fx(-y * 8) + "deg"); });
    stage.addEventListener("pointerleave", () => { stage.style.setProperty("--ry", "0deg"); stage.style.setProperty("--rx", "0deg"); });
  }

  /* ---------- эскиз в PNG ---------- */
  function svgImage(cb) { const img = new Image(); img.onload = () => cb(img); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(seatSVG()); }
  function download() {
    svgImage(img => {
      const W = 1200, H = 1560, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
      const g = cv.getContext("2d"), grd = g.createRadialGradient(W / 2, 380, 80, W / 2, 560, 900);
      grd.addColorStop(0, "#ffffff"); grd.addColorStop(1, "#e6e6e1"); g.fillStyle = grd; g.fillRect(0, 0, W, H);
      const sh = 1000, sw = sh * 420 / 600; g.drawImage(img, (W - sw) / 2, 40, sw, sh);
      g.fillStyle = "#131416"; g.font = "800 44px Inter, Arial, sans-serif"; g.fillText("Эскиз чехлов" + (st.model ? " на " + A.carName(st.model) : ""), 70, 1120);
      g.font = "500 28px Inter, Arial, sans-serif"; let y = 1180;
      summary().slice(1).forEach(([k, v]) => { g.fillStyle = "#6b6e74"; g.fillText(k, 70, y); g.fillStyle = "#131416"; g.fillText(v.length > 52 ? v.slice(0, 50) + "…" : v, 300, y); y += 44; });
      g.font = "800 40px Inter, Arial, sans-serif"; g.fillText(A.fmt(compute().total).replace(/ /g, " "), 70, H - 60);
      g.font = "500 26px Inter, Arial, sans-serif"; g.fillStyle = "#6b6e74"; g.textAlign = "right"; g.fillText("Автостиль · 8 (800) 775-32-60", W - 70, H - 64);
      cv.toBlob(b => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "avtostil-eskiz.png"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000); });
    });
  }
  $$("[data-b-download]", document).forEach(b => b.addEventListener("click", download));

  /* ---------- заявка ---------- */
  const modal = document.querySelector("[data-b-modal]");
  function openModal() {
    $("[data-b-mini]", modal).innerHTML = `<img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(seatSVG())}" alt="Ваш дизайн">`;
    $("[data-b-summary]", modal).innerHTML = summary().map(([k, v]) => `<div><dt>${k}</dt><dd>${e(v)}</dd></div>`).join("") + `<div class="breq__total"><dt>Стоимость</dt><dd>${A.fmt(compute().total)}</dd></div>`;
    $("[data-b-form]", modal).hidden = false; $("[data-b-done]", modal).hidden = true;
    modal.classList.add("is-open"); document.body.style.overflow = "hidden";
    setTimeout(() => { const i = $("input", modal); i && i.focus(); }, 50);
  }
  const closeModal = () => { modal.classList.remove("is-open"); document.body.style.overflow = ""; };
  $$("[data-b-open]", document).forEach(b => b.addEventListener("click", openModal));
  $$("[data-b-close]", modal).forEach(b => b.addEventListener("click", closeModal));
  document.addEventListener("keydown", ev => { if (ev.key === "Escape" && modal.classList.contains("is-open")) closeModal(); });
  $("[data-b-form]", modal).addEventListener("submit", ev => {
    ev.preventDefault();
    const f = ev.target, btn = $("[type=submit]", f); btn.disabled = true; btn.textContent = "Отправляем…";
    setTimeout(() => { f.reset(); btn.disabled = false; btn.textContent = "Отправить заявку"; f.hidden = true; $("[data-b-done]", modal).hidden = false; }, 700);
  });

  if (preset && A.BY_SLUG[preset] && picker) picker.set(preset); else render();
})();
