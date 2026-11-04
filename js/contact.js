/* =====================================================================
   АВТОСТИЛЬ — всплывающее окно связи «Есть вопросы? Мы на связи!»: QR-код, мессенджеры, живой чат, телефон, консультация.
   Условия — как у виджета на старом сайте (время на сайте, прокрутка 68 % страницы или мышь ушла за верх окна), но позже (правка пользователя 04.11.2026):
   полторы минуты на сайте, а прокрутка и уход мыши срабатывают не раньше чем через 45 секунд (там — минута и сразу).
   Отличия: один показ за сессию (там — по разу на каждое условие), время считается по всей сессии, а не на одной странице.
   QR ведёт на эту же страницу с ?svyaz=1: на телефоне сразу открывается это же окно с кнопками мессенджеров.
   Подключается из app.js после chat.js.
   ===================================================================== */
(function () {
  "use strict";
  const A = window.AS;
  if (!A || document.querySelector("[data-contact]")) return;
  const { $, $$ } = A;
  const SEEN_KEY = "as_contact_seen", START_KEY = "as_contact_start", PARAM = "svyaz";
  const SHOW_AFTER = 90000, SCROLL_PCT = 68, MIN_ON_SITE = 45000, RETRY = 3000;
  const SKIP_PAGES = ["cart", "thanks", "custom"];   /* покупку и конструктор не прерываем; у оформления заказа тоже data-page="cart" */
  const PHONE = "8 (800) 775-32-60", TEL = "tel:88007753260";
  const session = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- QR-код (ISO 18004): байтовый режим, уровень коррекции M, версии 1–20 ---------- */
  const QR_EC_LEN = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26];
  const QR_BLOCKS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16];
  const qrRawModules = v => {
    let n = (16 * v + 128) * v + 64;
    if (v >= 2) { const a = Math.floor(v / 7) + 2; n -= (25 * a - 10) * a - 55; if (v >= 7) n -= 36; }
    return n;
  };
  const gfMul = (x, y) => { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; } return z; };
  function rsDivisor(deg) {
    const r = Array(deg).fill(0); r[deg - 1] = 1;
    let root = 1;
    for (let i = 0; i < deg; i++) {
      for (let j = 0; j < deg; j++) { r[j] = gfMul(r[j], root); if (j + 1 < deg) r[j] ^= r[j + 1]; }
      root = gfMul(root, 2);
    }
    return r;
  }
  function rsRemainder(data, div) {
    const r = div.map(() => 0);
    data.forEach(b => {
      const f = b ^ r.shift(); r.push(0);
      div.forEach((c, i) => { r[i] ^= gfMul(c, f); });
    });
    return r;
  }
  function qrCodewords(bytes) {
    let v = 1;
    for (; v <= 20; v++) if (4 + (v < 10 ? 8 : 16) + bytes.length * 8 <= (Math.floor(qrRawModules(v) / 8) - QR_EC_LEN[v] * QR_BLOCKS[v]) * 8) break;
    if (v > 20) return null;
    const cap = Math.floor(qrRawModules(v) / 8) - QR_EC_LEN[v] * QR_BLOCKS[v];
    const bits = [], put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    put(4, 4); put(bytes.length, v < 10 ? 8 : 16); bytes.forEach(b => put(b, 8));
    put(0, Math.min(4, cap * 8 - bits.length));
    put(0, (8 - bits.length % 8) % 8);
    for (let p = 0xec; bits.length < cap * 8; p ^= 0xec ^ 0x11) put(p, 8);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(""), 2));
    const n = QR_BLOCKS[v], ec = QR_EC_LEN[v], raw = Math.floor(qrRawModules(v) / 8), shortN = n - raw % n, shortLen = Math.floor(raw / n);
    const div = rsDivisor(ec), blocks = [], ecs = [];
    for (let i = 0, k = 0; i < n; i++) {
      const len = shortLen - ec + (i < shortN ? 0 : 1), b = data.slice(k, k + len); k += len;
      blocks.push(b); ecs.push(rsRemainder(b, div));
    }
    const out = [];
    for (let i = 0; i <= shortLen - ec; i++) blocks.forEach((b, j) => { if (i < shortLen - ec || j >= shortN) out.push(b[i]); });
    for (let i = 0; i < ec; i++) ecs.forEach(b => out.push(b[i]));
    return { v, out };
  }
  function qrMatrix(text) {
    const cw = qrCodewords(Array.from(new TextEncoder().encode(text)));
    if (!cw) return null;
    const { v, out } = cw, size = v * 4 + 17;
    const m = [], fn = [];
    for (let i = 0; i < size; i++) { m.push(Array(size).fill(false)); fn.push(Array(size).fill(false)); }
    const setFn = (x, y, on) => { if (x >= 0 && y >= 0 && x < size && y < size) { m[y][x] = on; fn[y][x] = true; } };
    for (let i = 0; i < size; i++) { setFn(6, i, i % 2 === 0); setFn(i, 6, i % 2 === 0); }
    [[3, 3], [size - 4, 3], [3, size - 4]].forEach(([cx, cy]) => {
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const d = Math.max(Math.abs(dx), Math.abs(dy)); setFn(cx + dx, cy + dy, d !== 2 && d !== 4); }
    });
    if (v >= 2) {
      const a = Math.floor(v / 7) + 2, step = Math.ceil((v * 4 + 4) / (a * 2 - 2)) * 2, pos = [6];
      for (let p = size - 7; pos.length < a; p -= step) pos.splice(1, 0, p);
      pos.forEach((y, i) => pos.forEach((x, j) => {
        if ((i === 0 && j === 0) || (i === 0 && j === a - 1) || (i === a - 1 && j === 0)) return;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) setFn(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }));
    }
    const format = mask => {
      const d = mask;   /* у уровня M биты коррекции равны 00 */
      let r = d;
      for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      const b = ((d << 10) | r) ^ 0x5412, bit = i => ((b >>> i) & 1) !== 0;
      for (let i = 0; i <= 5; i++) setFn(8, i, bit(i));
      setFn(8, 7, bit(6)); setFn(8, 8, bit(7)); setFn(7, 8, bit(8));
      for (let i = 9; i < 15; i++) setFn(14 - i, 8, bit(i));
      for (let i = 0; i < 8; i++) setFn(size - 1 - i, 8, bit(i));
      for (let i = 8; i < 15; i++) setFn(8, size - 15 + i, bit(i));
      setFn(8, size - 8, true);
    };
    format(0);
    if (v >= 7) {
      let r = v;
      for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
      const b = (v << 12) | r;
      for (let i = 0; i < 18; i++) { const on = ((b >>> i) & 1) !== 0, p = size - 11 + i % 3, q = Math.floor(i / 3); setFn(p, q, on); setFn(q, p, on); }
    }
    let k = 0, up = true;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let t = 0; t < size; t++) {
        const y = up ? size - 1 - t : t;
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          if (!fn[y][x] && k < out.length * 8) { m[y][x] = ((out[k >>> 3] >>> (7 - (k & 7))) & 1) !== 0; k++; }
        }
      }
      up = !up;
    }
    const MASKS = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, x => x % 3 === 0, (x, y) => (x + y) % 3 === 0, (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => (x * y) % 2 + (x * y) % 3 === 0, (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0, (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0];
    const applyMask = i => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && MASKS[i](x, y)) m[y][x] = !m[y][x]; };
    const penalty = () => {
      let p = 0, dark = 0;
      const line = get => {
        let run = 0, prev = null, hist = "";
        for (let i = 0; i < size; i++) {
          const c = get(i);
          if (c === prev) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else { run = 1; prev = c; }
          hist += c ? "1" : "0";
        }
        p += 40 * ((hist.match(/(?=10111010000)/g) || []).length + (hist.match(/(?=00001011101)/g) || []).length);
      };
      for (let i = 0; i < size; i++) { line(x => m[i][x]); line(y => m[y][i]); }
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        if (m[y][x]) dark++;
        if (x < size - 1 && y < size - 1 && m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) p += 3;
      }
      return p + 10 * Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size));
    };
    let best = 0, low = Infinity;
    for (let i = 0; i < 8; i++) {
      applyMask(i); format(i);
      const p = penalty();
      if (p < low) { low = p; best = i; }
      applyMask(i);
    }
    applyMask(best); format(best);
    return m;
  }
  function qrSvg(text) {
    const m = qrMatrix(text);
    if (!m) return "";
    const n = m.length, q = 2;
    let d = "";
    m.forEach((row, y) => row.forEach((on, x) => { if (on) d += `M${x + q} ${y + q}h1v1h-1z`; }));
    return `<svg viewBox="0 0 ${n + q * 2} ${n + q * 2}" shape-rendering="crispEdges" role="img" aria-label="QR-код: мессенджеры и телефон на вашем смартфоне"><path fill="#231f20" d="${d}"/></svg>`;
  }
  /* QR с локального адреса телефон не откроет: на локальной копии код ведёт на основной сайт */
  function qrUrl() {
    if (/^(localhost|127\.|\[::1\]|.*\.localhost$|.*\.test$)/.test(location.hostname)) return "https://1avtochehol.ru/";
    const u = new URL(location.href);
    u.hash = ""; u.searchParams.set(PARAM, "1");
    return u.href;
  }

  /* ---------- окно ---------- */
  const glyph = (src, w) => `<img class="cpop__glyph" src="assets/icons/${src}" alt="" width="${w}" height="${w}">`;
  const msgBtn = (id, cls, icon) => { const x = A.MSG.find(m => m.id === id); return x ? `<a class="cpop__btn cpop__btn--${cls}" href="${x.url}" target="_blank" rel="noopener" data-contact-done><span class="cpop__ico">${icon}</span>${x.name}</a>` : ""; };
  document.body.insertAdjacentHTML("beforeend", `<div class="modal cpop" data-contact role="dialog" aria-modal="true" aria-labelledby="cpop-title">
    <div class="modal__bg" data-contact-close></div>
    <div class="modal__panel cpop__panel">
      <button type="button" class="iconbtn cpop__close" data-contact-close aria-label="Закрыть"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
      <p class="modal__title cpop__title" id="cpop-title">Есть вопросы? Мы на связи!</p>
      <div class="cpop__grid">
        <div class="cpop__box cpop__qr"><p class="cpop__tag">Наведите камеру телефона</p><div class="cpop__code" data-contact-qr></div></div>
        <div class="cpop__box cpop__list">
          ${msgBtn("max", "max", glyph("max-glyph.png", 22))}
          ${msgBtn("whatsapp", "wa", glyph("whatsapp-glyph.svg", 34))}
          ${msgBtn("telegram", "tg", glyph("telegram-glyph.svg", 34))}
          <button type="button" class="cpop__btn cpop__btn--chat" data-contact-chat><span class="cpop__ico"><img class="cpop__ava" src="assets/photos/manager-yulia.png" alt="" width="32" height="32"></span>Живой чат</button>
        </div>
      </div>
      <div class="cpop__box cpop__foot">
        <a class="cpop__tel" href="${TEL}" data-contact-done><span>Бесплатный номер</span><b>${PHONE}</b></a>
        <button type="button" class="btn btn--primary cpop__ask" data-ask-open data-contact-done>Получить консультацию</button>
      </div>
    </div>
  </div>`);
  const pop = $("[data-contact]"), code = $("[data-contact-qr]", pop);
  const isOpen = () => pop.classList.contains("is-open");
  let backTo = null;
  function open() {
    if (isOpen()) return;
    backTo = document.activeElement;
    if (!code.firstChild) code.innerHTML = qrSvg(qrUrl());
    pop.classList.add("is-open"); document.body.style.overflow = "hidden";
    $(".cpop__close", pop).focus({ preventScroll: true });
  }
  function close(refocus) {
    if (!isOpen()) return;
    pop.classList.remove("is-open"); document.body.style.overflow = "";
    if (refocus && backTo && backTo.focus) backTo.focus({ preventScroll: true });
  }
  $$("[data-contact-close]", pop).forEach(b => b.addEventListener("click", () => close(true)));
  /* «Получить консультацию» открывает окно заявки из подвала: обработчик в app.js сработает следом, на document */
  $$("[data-contact-done]", pop).forEach(b => b.addEventListener("click", () => close()));
  $("[data-contact-chat]", pop).addEventListener("click", () => { close(); if (A.chat) A.chat.open(); });
  document.addEventListener("keydown", e => {
    if (!isOpen()) return;
    if (e.key === "Escape") { close(true); return; }
    if (e.key !== "Tab") return;
    const f = $$("a, button", pop).filter(el => el.offsetParent), first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ---------- когда показать ---------- */
  /* открыто другое окно, клиент что-то вводит или вкладка в фоне: подождём */
  const busy = () => document.hidden || document.body.style.overflow === "hidden" || document.body.classList.contains("chat-lock")
    || !!$(".modal.is-open, .drawer.is-open, .mega.is-open, #as-msgcard:not([hidden])")
    || !!(document.activeElement && document.activeElement.matches("input, textarea, select, [contenteditable]"));
  let retryT = 0;
  function whenFree(fn) { clearTimeout(retryT); if (busy()) retryT = setTimeout(() => whenFree(fn), RETRY); else fn(); }

  const params = new URLSearchParams(location.search);
  if (params.has(PARAM)) {   /* пришли по QR */
    params.delete(PARAM);
    const q = params.toString();
    history.replaceState(null, "", location.pathname + (q ? "?" + q : "") + location.hash);
    session.set(SEEN_KEY, "1");
    whenFree(open);
    return;
  }
  if (session.get(SEEN_KEY) || SKIP_PAGES.includes(document.body.dataset.page) || (A.chat && A.chat.started())) return;

  let start = +session.get(START_KEY);
  if (!start) { start = Date.now(); session.set(START_KEY, String(start)); }
  const onSite = () => Date.now() - start;
  let timer = 0;
  function fire() {
    whenFree(() => {
      if (session.get(SEEN_KEY) || (A.chat && A.chat.started())) return;
      session.set(SEEN_KEY, "1");
      clearTimeout(timer);
      removeEventListener("scroll", onScroll);
      document.removeEventListener("mouseout", onLeave);
      open();
    });
  }
  function onScroll() {
    const h = document.documentElement.scrollHeight - innerHeight;
    if (h > 0 && onSite() >= MIN_ON_SITE && scrollY / h * 100 >= SCROLL_PCT) fire();
  }
  function onLeave(e) { if (e.clientY <= 0 && !e.relatedTarget && onSite() >= MIN_ON_SITE) fire(); }
  timer = setTimeout(fire, Math.max(0, SHOW_AFTER - onSite()));
  addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("mouseout", onLeave);
})();
