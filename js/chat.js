/* =====================================================================
   АВТОСТИЛЬ — плавающая кнопка связи справа снизу: окно с мессенджерами, живым чатом и телефоном, чат с менеджером.
   Подключается одной строкой в конце app.js (loadScript), поэтому есть на всех страницах и в шаблоне Битрикса.
   До контактов сервер ничего не хранит: вопросы лежат в браузере (as_chat) и уходят в /chat/start вместе с именем и телефоном.
   Два пути: клиент пишет вопрос (запоминаем, просим имя и телефон) или сразу жмёт «Оставить контакты» под приветствием.
   Дальше — /chat/{token}/messages: отправка и опрос ответов. Ответы менеджера приходят из amoCRM и админки (backend/).
   ===================================================================== */
(function () {
  "use strict";
  const A = window.AS;
  if (!A || document.querySelector(".fabs")) return;
  const { $, esc } = A;
  const KEY = "as_chat", MAX_MSGS = 200, MAX_TEXT = 2000, MAX_START = 20, TYPING_MS = 700;
  const POLL_OPEN = 6000, POLL_CLOSED = 45000, POLL_MAX = 300000;
  const HINT_KEY = "as_chat_hint", HINT_DELAY = 3000, HINT_MOBILE_MS = 12000;
  const PHONE = "8 (800) 775-32-60", TEL = "tel:88007753260";
  const HELLO = "Добрый день! Готовы вас проконсультировать. Какой у вас вопрос?";
  const ASK = "Спасибо, запомнили ваш вопрос. Как к вам обращаться и на какой номер написать или перезвонить?";
  const ASK_PLAIN = "Как к вам обращаться и на какой номер написать или перезвонить?";
  const THANKS = name => `Спасибо, ${name}! Менеджер получил ваш вопрос и ответит здесь в рабочее время. Если закроете окно, ответ сохранится в этом чате, а при необходимости мы перезвоним.`;
  const THANKS_PLAIN = name => `Спасибо, ${name}! Менеджер получил ваши контакты и свяжется с вами в рабочее время. Здесь можно сразу написать вопрос.`;
  const svg = inner => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  const ICONS = {
    msg: svg('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
    chat: svg('<path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z"/><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"/>'),
    close: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
    phone: svg('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>'),
    send: svg('<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>')
  };
  const isMobile = () => matchMedia("(max-width: 767px)").matches;

  /* ---------- состояние: история, токен и черновик живут в localStorage и видны на всех страницах ---------- */
  const fresh = () => ({ token: "", last: 0, msgs: [], greeted: false, asked: false, unread: 1, draft: "", opened: 0 });
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "null");
      if (s && Array.isArray(s.msgs)) {
        s.msgs.forEach(m => { if (m.st === "sending") { m.st = "failed"; m.err = "Не отправлено."; } });   /* ушли со страницы, не дождавшись ответа */
        return Object.assign(fresh(), s);
      }
    } catch (e) {}
    return fresh();
  }
  let st = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
  const pendingMsgs = () => st.msgs.filter(m => m.author === "customer" && m.id == null && !m.st);   /* ещё без контактов, пойдут в /chat/start */
  const sameText = (a, b) => String(a).replace(/\s+/g, " ").trim() === String(b).replace(/\s+/g, " ").trim();

  /* ---------- разметка ---------- */
  const msgLink = id => { const m = A.MSG.find(x => x.id === id); return m ? `<a class="msg-btn" href="${m.url}" target="_blank" rel="noopener"><img src="${m.icon}" alt="" width="48" height="48" loading="lazy">${m.name}</a>` : ""; };
  document.body.insertAdjacentHTML("beforeend", `<div class="fabs">
      <button type="button" class="fab" data-fab aria-haspopup="dialog" aria-expanded="false" aria-controls="as-msgcard" aria-label="Связаться с нами">${ICONS.msg}${ICONS.close}<span class="fab__badge" data-chat-badge hidden></span></button>
    </div>
    <div class="chat-hint" data-chat-hint role="status" hidden>
      <button type="button" class="chat-hint__open" data-hint-open><b>Менеджер «Автостиль»</b><span class="chat__online">Онлайн</span><span class="chat-hint__text">${HELLO}</span></button>
      <button type="button" class="iconbtn" data-hint-close aria-label="Скрыть приветствие">${ICONS.close}</button>
    </div>
    <div class="msgcard" id="as-msgcard" role="dialog" aria-label="Связаться с нами" hidden>
      <div class="msgcard__head"><p class="msgcard__title">Напишите нам в удобный мессенджер</p><button type="button" class="iconbtn" data-card-close aria-label="Закрыть">${ICONS.close}</button></div>
      <div class="msgcard__list">${["whatsapp", "telegram", "max"].map(msgLink).join("")}
        <button type="button" class="msgcard__row msgcard__row--chat" data-card-chat>${ICONS.chat}<span class="msgcard__text"><b>Живой чат на сайте</b><span class="chat__online">Менеджер онлайн</span></span><span class="msgcard__badge" data-card-badge role="img" hidden></span></button>
        <a class="msgcard__row" href="${TEL}">${ICONS.phone}<span class="msgcard__text"><b>${PHONE}</b><span>бесплатно по России</span></span></a>
      </div>
    </div>
    <div class="chat" id="as-chat" role="dialog" aria-label="Чат с менеджером" hidden>
      <div class="chat__head"><img class="chat__logo" src="assets/logo/icon.svg" alt="" width="36" height="33"><div class="chat__who"><b>Менеджер «Автостиль»</b><span class="chat__online">Онлайн</span></div><button type="button" class="iconbtn" data-chat-close aria-label="Закрыть чат">${ICONS.close}</button></div>
      <div class="chat__feed" data-chat-feed>
        <div class="chat__list" role="log" aria-live="polite" data-chat-list></div>
        <div class="chat__typing" data-chat-typing role="status" aria-label="Менеджер печатает" hidden><i></i><i></i><i></i></div>
        <div data-chat-slot></div>
      </div>
      <div class="chat__bar"><textarea class="chat__input" data-chat-input rows="1" maxlength="${MAX_TEXT}" enterkeyhint="send" placeholder="Напишите сообщение" aria-label="Ваше сообщение"></textarea><button type="button" class="chat__send" data-chat-send aria-label="Отправить">${ICONS.send}</button></div>
    </div>`);
  const btn = $("[data-fab]"), badge = $("[data-chat-badge]"), cardBadge = $("[data-card-badge]");
  const card = $("#as-msgcard"), chat = $("#as-chat"), feed = $("[data-chat-feed]", chat), list = $("[data-chat-list]", chat);
  const typing = $("[data-chat-typing]", chat), slot = $("[data-chat-slot]", chat), input = $("[data-chat-input]", chat);
  const hint = $("[data-chat-hint]");
  const chatOpen = () => !chat.hidden;

  /* ---------- лента ---------- */
  const timeOf = at => {
    const d = new Date(at); if (isNaN(d)) return "";
    const t = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    return d.toDateString() === new Date().toDateString() ? t : d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }) + " " + t;
  };
  const telLink = s => esc(s).replace(PHONE, `<a href="${TEL}">${PHONE}</a>`);   /* только для наших сообщений об ошибке */
  const msgHtml = (m, i) => `<div class="chat__msg${m.author === "customer" ? " chat__msg--me" : ""}"><div class="chat__bubble">${esc(m.text).replace(/\n/g, "<br>")}</div>`
    + (m.st === "failed" ? `<p class="chat__err">${telLink(m.err || "Не отправлено.")} <button type="button" class="chat__retry" data-chat-retry="${i}">Отправить снова</button></p>` : `<div class="chat__time">${m.st === "sending" ? "Отправляем…" : esc(timeOf(m.at))}</div>`)
    + "</div>";
  const nearBottom = () => feed.scrollHeight - feed.scrollTop - feed.clientHeight < 80;
  const toBottom = () => { feed.scrollTop = feed.scrollHeight; };
  function render() { list.innerHTML = st.msgs.map(msgHtml).join(""); syncForm(); toBottom(); }
  function paint(m) { const i = st.msgs.indexOf(m), n = list.children[i]; if (n) n.outerHTML = msgHtml(m, i); }
  function push(m) {
    const stick = m.author === "customer" || nearBottom();
    st.msgs.push(m);
    if (st.msgs.length > MAX_MSGS) { st.msgs = st.msgs.slice(-MAX_MSGS); render(); }
    else list.insertAdjacentHTML("beforeend", msgHtml(m, st.msgs.length - 1));
    if (stick) toBottom();
  }
  /* идёт переписка и есть непрочитанное: кнопка сразу открывает чат, минуя окно связи */
  const replyWaiting = () => !!st.token && st.unread > 0;
  /* значок непрочитанных и состояние кнопки: при открытом окне она показывает крестик и закрывает его, а число переходит на строку чата в окне */
  function setBadge() {
    const n = st.unread, inChat = chatOpen(), open = inChat || !card.hidden, toChat = inChat || (!open && replyWaiting()), num = n > 9 ? "9+" : n;
    badge.textContent = num; badge.hidden = !n || open;
    cardBadge.textContent = num; cardBadge.hidden = !n; cardBadge.setAttribute("aria-label", `Новых сообщений: ${n}`);
    btn.setAttribute("aria-expanded", open);
    btn.setAttribute("aria-controls", toChat ? "as-chat" : "as-msgcard");
    btn.setAttribute("aria-label", inChat ? "Закрыть чат" : open ? "Закрыть окно связи" : toChat ? `Открыть чат, новых сообщений: ${n}` : "Связаться с нами" + (n ? `, новых сообщений: ${n}` : ""));
  }
  /* сообщение менеджера, которое пишет сам сайт: приветствие, просьба оставить контакты, спасибо */
  function say(text) {
    push({ author: "manager", text, at: new Date().toISOString() });
    if (!chatOpen()) { st.unread++; setBadge(); }
  }
  /* индикатор «печатает» и отложенное сообщение; flushTyping выводит его сразу, если клиент уже пишет */
  let typingT = 0, typingDo = null;
  function afterTyping(fn) {
    typingDo = fn; typing.hidden = false;
    if (nearBottom() || !feed.clientHeight) toBottom();
    typingT = setTimeout(flushTyping, TYPING_MS);
  }
  function flushTyping() {
    if (!typingDo) return;
    clearTimeout(typingT); typing.hidden = true;
    const fn = typingDo; typingDo = null; fn(); save();
  }
  const sayHello = () => { if (!st.greeted) { st.greeted = true; say(HELLO); syncForm(); } };
  const askContacts = () => {
    if (st.token || st.asked) return;
    st.asked = true; say(pendingMsgs().length ? ASK : ASK_PLAIN); syncForm();
    if (!chatOpen()) return;
    /* на телефоне прячем клавиатуру: иначе карточку с полями не видно */
    if (isMobile()) input.blur(); else if (!input.value && form) $("[name=name]", form).focus({ preventScroll: true });
    const last = list.lastElementChild; if (last) feed.scrollTop = last.offsetTop - 12;
  };

  /* ---------- карточка с контактами в ленте ---------- */
  let form = null;
  function syncForm() {
    const need = !st.token && st.asked;
    if (need && !form) buildForm();
    else if (!need && form) { slot.innerHTML = ""; form = null; }
    /* вопроса ещё нет: можно сразу оставить контакты */
    if (!form) slot.innerHTML = st.greeted && !st.token && !pendingMsgs().length ? '<button type="button" class="btn btn--ghost btn--sm" data-chat-contacts>Оставить контакты</button>' : "";
  }
  function buildForm() {
    slot.innerHTML = `<form class="chat__form form-grid">
        <div class="field"><label for="chat-name">Имя</label><input class="input" id="chat-name" name="name" required maxlength="80" autocomplete="name"></div>
        <div class="field"><label for="chat-phone">Телефон</label><input class="input" id="chat-phone" name="phone" type="tel" required autocomplete="tel" placeholder="+7 (___) ___-__-__"></div>
        ${A.consentHtml()}
        <button type="submit" class="btn btn--primary btn--block" data-label="Отправить менеджеру">Отправить менеджеру</button>
        <p class="form-tel">Или позвоните: <a href="${TEL}">${PHONE}</a><span>бесплатно по России</span></p>
        <p class="chat__err" data-chat-form-err hidden></p>
      </form>`;
    form = $("form", slot);
    A.enhanceForm(form); A.guardForm(form);
    form._t0 = Math.min(st.opened || Infinity, Math.floor(performance.timeOrigin));   /* антиспам считает время от захода на страницу и открытия чата, а не от появления короткой карточки: с автозаполнением её заполняют за секунду */
    form.addEventListener("submit", submitContacts);
  }
  async function submitContacts(e) {
    e.preventDefault();
    const f = e.currentTarget, btn = $("[type=submit]", f), errBox = $("[data-chat-form-err]", f), data = new FormData(f), name = String(data.get("name") || "").trim();
    const pend = pendingMsgs(), sent = pend.slice(0, MAX_START);
    btn.disabled = true; btn.textContent = "Отправляем…"; errBox.hidden = true;
    inflight++;
    const res = await A.api("/chat/start", { name, phone: String(data.get("phone") || "").trim(), consent: !!data.get("consent"), marketing: !!data.get("marketing"), messages: sent.map(m => m.text), meta: A.formMeta(f) });
    inflight--;
    btn.disabled = false; btn.textContent = btn.dataset.label;
    if (!res.ok) {
      A.fieldErrors(f, res);
      const why = (res.errors || []).map(x => x.message).filter(Boolean).join(". ");
      errBox.innerHTML = telLink((why ? why + ". " : "") + (res.error.includes(PHONE) ? res.error : `${res.error} Или позвоните ${PHONE}.`));
      errBox.hidden = false; toBottom();
      return;
    }
    const d = res.data || {}, back = (d.messages || []).filter(m => m.author === "customer");
    st.token = d.token; st.number = d.number;
    sent.forEach((m, i) => { if (back[i]) { m.id = back[i].id; m.at = back[i].at || m.at; paint(m); } });
    take(d.messages || []);
    say((pend.length ? THANKS : THANKS_PLAIN)(name)); syncForm(); save();
    pendingMsgs().forEach(queueSend);   /* сверх MAX_START и всё, что написали, пока шёл запрос */
    schedule();
  }

  /* ---------- отправка и опрос ответов ---------- */
  let queue = Promise.resolve(), inflight = 0;
  function queueSend(m) {
    m.st = "sending"; m.err = ""; paint(m);
    queue = queue.then(() => postMsg(m));
  }
  async function postMsg(m) {
    if (!st.token) { send(m.text); return; }   /* чат сбросился, пока сообщение ждало в очереди */
    inflight++;
    const res = await A.api(`/chat/${encodeURIComponent(st.token)}/messages`, { text: m.text });
    inflight--;
    if (res.status === 404) { restart(m.text); return; }
    if (res.ok && res.data && res.data.message) {
      /* last не двигаем: ответ менеджера с меньшим id ещё мог не прийти; своё сообщение вернётся опросом и отсеется по id */
      Object.assign(m, { id: res.data.message.id, at: res.data.message.at || m.at, st: "", err: "" });
    } else if (m.id == null) { m.st = "failed"; m.err = res.error; }
    paint(m); save();
  }
  /* сообщения с сервера: тот же id второй раз не показываем, своё неподтверждённое сообщение связываем с ответом сервера */
  function take(items) {
    items.forEach(m => {
      if (!m || m.id == null) return;
      st.last = Math.max(st.last, +m.id || 0);
      if (st.msgs.some(x => x.id === m.id)) return;
      if (m.author === "customer") {
        const mine = st.msgs.find(x => x.author === "customer" && x.id == null && sameText(x.text, m.text));
        if (mine) { Object.assign(mine, { id: m.id, at: m.at, st: "", err: "" }); paint(mine); return; }
      }
      push({ id: m.id, author: m.author, text: String(m.text ?? ""), at: m.at });
      if (m.author !== "customer" && !chatOpen()) st.unread++;
    });
    setBadge();
  }
  let pollT = 0, polling = false, pollErrs = 0;
  function schedule() {
    clearTimeout(pollT);
    if (!st.token || document.hidden) return;
    pollT = setTimeout(poll, Math.min((chatOpen() ? POLL_OPEN : POLL_CLOSED) * 2 ** pollErrs, POLL_MAX));
  }
  async function poll() {
    if (polling || !st.token || document.hidden) return;
    polling = true;
    const token = st.token, res = await A.api(`/chat/${encodeURIComponent(token)}/messages?after=${st.last}`);
    polling = false;
    if (token !== st.token) { schedule(); return; }
    if (res.status === 404) { restart(); return; }
    if (res.ok) {
      pollErrs = 0;
      const items = (res.data && res.data.messages) || [];
      if (items.length) { take(items); save(); }
    } else pollErrs = Math.min(pollErrs + 1, 6);
    schedule();
  }
  /* сервер не знает токен — начинаем новый чат; text — сообщение, которое не удалось доставить */
  function restart(text) {
    clearTimeout(typingT); typingDo = null; typing.hidden = true; clearTimeout(pollT); pollErrs = 0;
    const draft = input.value;
    st = fresh(); st.draft = draft;
    if (chatOpen()) st.unread = 0;
    render(); setBadge();
    if (text) send(text); else if (chatOpen()) afterTyping(sayHello);
    save();
  }
  function send(text) {
    flushTyping(); sayHello();   /* вопрос не должен оказаться раньше приветствия */
    const m = { author: "customer", text, at: new Date().toISOString() };
    push(m); syncForm();
    if (st.token) queueSend(m);
    else if (!st.asked && !typingDo) afterTyping(askContacts);
    save();
  }

  /* ---------- поле ввода: Enter отправляет, Shift+Enter — перенос ---------- */
  function fitInput() {
    input.style.height = "auto";
    const h = input.scrollHeight + 2;   /* + рамка */
    if (h > 2) input.style.height = Math.min(h, 120) + "px";
    input.style.overflowY = h > 120 ? "auto" : "hidden";
  }
  let draftT = 0;
  function submitText() {
    const text = input.value.trim().slice(0, MAX_TEXT);
    if (!text) return;
    input.value = ""; st.draft = ""; clearTimeout(draftT); fitInput();
    send(text);
  }
  input.addEventListener("input", () => { fitInput(); st.draft = input.value; clearTimeout(draftT); draftT = setTimeout(save, 300); });
  input.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); submitText(); } });
  $("[data-chat-send]", chat).addEventListener("click", () => { submitText(); input.focus({ preventScroll: true }); });
  list.addEventListener("click", e => { const b = e.target.closest("[data-chat-retry]"), m = b && st.msgs[+b.dataset.chatRetry]; if (m) queueSend(m); });
  slot.addEventListener("click", e => { if (e.target.closest("[data-chat-contacts]")) { askContacts(); save(); } });

  /* ---------- окна: открыто максимум одно; на телефоне чат на весь экран, поле ввода над клавиатурой ---------- */
  const vv = window.visualViewport;
  function fitViewport() {
    if (!chatOpen() || !vv || !isMobile()) { chat.style.removeProperty("--chat-vh"); chat.style.removeProperty("--chat-top"); return; }
    const stick = nearBottom();
    chat.style.setProperty("--chat-vh", vv.height + "px"); chat.style.setProperty("--chat-top", vv.offsetTop + "px");
    if (stick) toBottom();
  }
  if (vv) { vv.addEventListener("resize", fitViewport); vv.addEventListener("scroll", fitViewport); }
  function openChat() {
    closeCard(); hideHint();
    if (!st.opened) st.opened = Date.now();
    chat.hidden = false; document.body.classList.add("chat-lock");
    st.unread = 0; setBadge(); fitViewport(); fitInput(); toBottom(); save();
    if (!st.greeted && !typingDo) afterTyping(sayHello);
    if (!isMobile()) input.focus({ preventScroll: true });   /* на телефоне клавиатура сама не выезжает: сначала человек видит окно */
    if (st.token) { clearTimeout(pollT); poll(); }
  }
  function closeChat(refocus) {
    if (!chatOpen()) return;
    chat.hidden = true; document.body.classList.remove("chat-lock");
    setBadge(); fitViewport(); schedule();
    if (refocus) btn.focus({ preventScroll: true });
  }
  function openCard() { closeChat(); hideHint(); card.hidden = false; setBadge(); $("a", card).focus({ preventScroll: true }); }
  function closeCard(refocus) {
    if (card.hidden) return;
    card.hidden = true; setBadge();
    if (refocus) btn.focus({ preventScroll: true });
  }
  /* приветствие у кнопки: менеджер пишет первым, один раз за сессию и пока чат не начат */
  let hintT = 0;
  function hideHint() { clearTimeout(hintT); hint.hidden = true; }
  /* на телефоне приветствие закрывало бы фото товара и мешало его листать */
  const galleryOnScreen = () => { const g = $("[data-gallery]"), r = g && g.getBoundingClientRect(); return !!r && r.bottom > 0 && r.top < innerHeight; };
  function showHint() {
    if (st.greeted || st.token || chatOpen() || !card.hidden) return;
    if (isMobile() && (document.body.classList.contains("cookie-open") || galleryOnScreen())) { hintT = setTimeout(showHint, 2000); return; }   /* на телефоне баннер cookie скрывает кнопки */
    try { sessionStorage.setItem(HINT_KEY, "1"); } catch (e) {}
    hint.hidden = false;
    if (isMobile()) hintT = setTimeout(hideHint, HINT_MOBILE_MS);
  }
  $("[data-hint-open]", hint).addEventListener("click", openChat);
  $("[data-hint-close]", hint).addEventListener("click", hideHint);
  btn.addEventListener("click", () => { if (chatOpen()) closeChat(true); else if (!card.hidden) closeCard(true); else if (replyWaiting()) openChat(); else openCard(); });
  $("[data-chat-close]", chat).addEventListener("click", () => closeChat(true));
  $("[data-card-close]", card).addEventListener("click", () => closeCard(true));
  $("[data-card-chat]", card).addEventListener("click", openChat);
  document.addEventListener("keydown", e => { if (e.key === "Escape") { closeChat(true); closeCard(true); } });
  document.addEventListener("click", e => { if (!card.hidden && !card.contains(e.target) && !btn.contains(e.target)) closeCard(); });

  /* ---------- вкладки и переходы: опрос только на видимой вкладке, состояние общее ---------- */
  document.addEventListener("visibilitychange", () => { if (document.hidden) clearTimeout(pollT); else if (st.token) poll(); });
  addEventListener("pagehide", save);
  addEventListener("storage", e => {
    if ((e.key && e.key !== KEY) || inflight) return;
    st = load();
    if (chatOpen()) st.unread = 0;
    render(); setBadge();
    if (document.activeElement !== input) { input.value = st.draft; fitInput(); }
    schedule();
  });

  /* ---------- старт на странице ---------- */
  /* конструктор: цена и кнопки покупки прижаты к низу экрана (на узких экранах фиксированы) — кнопка стоит над ними */
  const cfgFoot = $(".cfg__foot");
  if (cfgFoot) {
    const setLift = () => document.body.style.setProperty("--fabs-lift", cfgFoot.offsetHeight + "px");
    setLift(); new ResizeObserver(setLift).observe(cfgFoot);
  }
  input.value = st.draft;
  render(); setBadge();
  if (!st.token && !st.asked && pendingMsgs().length) { askContacts(); save(); }   /* ушли со страницы, пока менеджер «печатал» */
  if (st.token) poll();
  let hintSeen = false; try { hintSeen = !!sessionStorage.getItem(HINT_KEY); } catch (e) {}
  if (!hintSeen && !st.greeted && !st.token && !(cfgFoot && isMobile())) hintT = setTimeout(showHint, HINT_DELAY);
})();
