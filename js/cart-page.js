/* Корзина и оформление заказа — две страницы, один скрипт (режим — data-mode у #cart):
   cart.html — состав из localStorage, допы к заказу, сверка VIN → кнопка «Перейти к оформлению»;
   checkout.html — доставка, оплата, получатель → заказ на сервере (/api/orders).
   Онлайн-оплата: сервер создаёт платёж, клиент уходит на страницу платёжной системы и возвращается на thanks.html.
   Допы и VIN переходят между страницами через localStorage (as_extras, as_vin). */
(function () {
  const A = window.AS, Cart = window.AS_cart, box = document.getElementById("cart");
  const MODE = box.dataset.mode === "checkout" ? "checkout" : "cart";
  /* Доставка и оплата — как на старом сайте: DPD, EMS Почта России, самовывоз и курьер в Новосибирске; предоплата от 1 000 ₽ */
  const DELIVERY = [
    { id: "pickup", name: "Самовывоз в Новосибирске", sub: "ул. Бориса Богаткова 253/2, оф. 116", price: 0 },
    { id: "nsk", name: "Курьер по Новосибирску", sub: "Доставка по городу", price: 385 },
    { id: "dpd", name: "Транспортная компания DPD", sub: "Срок и стоимость — по тарифу транспортной компании", price: null },
    { id: "ems", name: "EMS Почта России", sub: "Срок и стоимость — по тарифу Почты России", price: null },
    { id: "other", name: "Другая транспортная компания", sub: "По согласованию с менеджером", price: null }
  ];
  /* От этой суммы товаров, ₽, доставка бесплатна любым способом (backend/app/catalog.py, FREE_DELIVERY_FROM) */
  const FREE_DELIVERY_FROM = 20000;
  let delivery = "dpd", pay = "full", prepay = 1000, online = true, sending = false;
  const VIN = window.AS_vin;
  const ls = k => { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } };
  /* чехлы на модель (cover:) и комплекты из конструктора (custom: — с выбором в config, цену сервер считает сам) */
  const covers = () => Cart.items.filter(i => i.id.startsWith("cover:") || i.id.startsWith("custom:"));
  /* порог — по тому, что уйдёт на сервер: сумму заказа считает он */
  const coversSum = () => covers().reduce((n, i) => n + i.price * i.qty, 0);
  const isFree = () => coversSum() >= FREE_DELIVERY_FROM;
  const extras = { mats: false, install: false };
  /* введённое в форму не теряется при перерисовке (смена доставки или оплаты) */
  const fv = { name: "", phone: "", city: ls("as_city"), email: "", address: "", company: "", inn: "", comment: "", consent: false, marketing: null };
  let vin = "", extrasInit = false;
  A.api("/config").then(r => { if (r.ok) { prepay = r.data.prepay || prepay; online = !!r.data.online; if (Cart.items.length) render(); } });
  function initExtras() {
    if (extrasInit) return; extrasInit = true;
    covers().forEach(i => { if (i.opts) { extras.mats = extras.mats || !!i.opts.mats; extras.install = extras.install || !!i.opts.install; } if (i.vin && !vin) vin = i.vin; });
    try { const saved = JSON.parse(ls("as_extras") || "null"); if (saved) Object.assign(extras, saved); } catch (er) {}
    if (!vin) vin = ls("as_vin");
  }
  const slugOf = i => i.model || i.id.split(":")[1];
  /* сверка VIN с каждым комплектом: сервер (справочник VIN), без связи — локально по марке и году */
  function vinLocal(raw) {
    const list = covers(), e = A.esc;
    if (!list.length) { const d = VIN.decodeVin(raw); return d ? `<div class="vin-msg">${d.brands.length ? e(d.brands.map(A.brandName).join(" / ")) : "Марка не определена"}${d.year ? ", " + d.year + " модельный год" : ""}. Менеджер сверит VIN при подтверждении.</div>` : `<div class="vin-msg vin-msg--warn">VIN — 17 символов: латинские буквы без I, O, Q и цифры.</div>`; }
    return list.map(i => { const r = VIN.vinCheck(A.BY_SLUG[slugOf(i)], raw); const cls = r.state === "ok" ? "ok" : (r.state === "bad" || r.state === "brand" || r.state === "year") ? "warn" : "info"; return `<div class="vin-msg vin-msg--${cls}"><b>${e(i.title)}:</b> ${e(r.text)}</div>`; }).join("");
  }
  /* что говорит VIN — марка и модель по справочнику, модельный год */
  const vinWho = d => {
    const w = d.wmi || {}, brand = (w.brand_names || []).join(" / ") || w.make || w.maker || "";
    const m = d.matches.length && d.check === "ok" ? d.matches.find(x => x.slug) : null;
    return ((m ? m.title : `${brand} ${(d.vehicle && d.vehicle.model) || ""}`).trim() + (d.year_sure ? `, ${d.year} модельный год` : "")).replace(/^, /, "");
  };
  function vinLine(d) {
    const who = vinWho(d);
    if (d.check === "ok") return ["ok", `по VIN — ${who}, совпадает с выбранным автомобилем. Комплектацию салона уточнит менеджер.`];
    if (d.check === "mismatch" || d.check === "body") return ["warn", `${d.message} Проверьте, что выбран ваш автомобиль.`];
    if (d.check === "year") return ["warn", `модельный год по VIN — ${d.year}, а выбранный кузов выпускался в другие годы. Похоже, нужен другой кузов.`];
    if (d.check === "frame") return ["info", `${d.message.replace(/ Выберите.*$/, "")} Менеджер сверит номер кузова с лекалом.`];
    return ["info", (who ? `по VIN это ${who}. ` : "марку по VIN определить не удалось. ") + "Менеджер сверит VIN с лекалом при подтверждении."];
  }
  async function vinReport(raw, out) {
    if (!raw) { out.innerHTML = ""; return; }
    out.innerHTML = '<div class="vin-msg">Проверяем…</div>';
    const list = covers(), e = A.esc;
    const res = await Promise.all((list.length ? list : [null]).map(i => VIN.api(raw, i ? slugOf(i) : "")));
    if (res.some(x => !x)) { out.innerHTML = vinLocal(raw); return; }
    out.innerHTML = res.map((d, k) => {
      const i = list[k];
      if (!i || d.kind === "invalid") return `<div class="vin-msg${d.kind === "invalid" ? " vin-msg--warn" : ""}">${e(d.message)}</div>`;
      const [cls, text] = vinLine(d);
      return `<div class="vin-msg vin-msg--${cls}"><b>${e(i.title)}:</b> ${e(text)}</div>`;
    }).join("");
  }
  const btnLabel = () => pay === "invoice" ? "Оформить заказ" : "Перейти к оплате";
  const plural = n => n % 10 === 1 && n % 100 !== 11 ? "позиция" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "позиции" : "позиций";
  /* подсказка по каждому комплекту: с каких символов начинается VIN марки и какая буква года стоит 10-й */
  function vinHints() {
    const e = A.esc, seen = new Set();
    return covers().map(i => A.BY_SLUG[slugOf(i)]).filter(m => m && !seen.has(m.s) && seen.add(m.s)).map(m => {
      const h = VIN.vinHint(m); if (!h) return "";
      const code = s => `<code>${e(s)}</code>`;
      return `<div class="vin-hint"><b>${e(A.carName(m))}${m.y ? " · " + e(m.y) : ""}</b>${h.wmi.length ? `<span>Первые символы VIN — код завода марки: ${h.wmi.slice(0, 8).map(w => code(w + "…")).join(" ")}</span>` : ""}${h.codes.length ? `<span>10-й символ — модельный год ${h.years[0]}${h.years.length > 1 ? "–" + h.years[h.years.length - 1] : ""}: ${[...new Set(h.codes)].map(code).join(" ")}</span>` : ""}</div>`;
    }).join("");
  }
  const saveExtras = () => { try { localStorage.setItem("as_extras", JSON.stringify(extras)); } catch (er) {} };
  const emptyHtml = `<div class="cart-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.5L21 8H6.5"/><circle cx="10" cy="20" r="1.2"/><circle cx="17" cy="20" r="1.2"/></svg><h2 style="font-size:1.25rem; margin-bottom:6px">В корзине пока пусто</h2><p class="muted small" style="margin-bottom:18px">Выберите марку и модель в каталоге — комплект появится здесь.</p><div class="actions" style="gap:8px; justify-content:center"><a class="btn btn--primary" href="#" data-mega-open>Выбрать марку</a><a class="btn btn--ghost" href="${A.href("custom")}">Конструктор</a></div></div>`;
  /* «Ваш заказ»: в корзине — итог и переход к оформлению, на оформлении — ещё и состав заказа, доставка и кнопка оплаты */
  function summaryHtml(sub, dprice, total) {
    const co = MODE === "checkout", free = isFree(), left = FREE_DELIVERY_FROM - coversSum();
    const list = co ? `<div class="sum-items">${Cart.items.map(i => `<a class="sum-item" href="${A.relink(i.url)}"><img src="${i.img}" alt=""><span><b>${i.title}</b><small>${i.qty > 1 ? i.qty + " × " : ""}${A.fmt(i.price)}</small></span></a>`).join("")}</div><a class="sum-edit" href="${A.href("cart")}">Изменить состав заказа</a>` : "";
    const btn = co
      ? `<button class="btn btn--primary btn--lg btn--block" type="submit" form="order-form" ${sending ? "disabled" : ""}>${sending ? "Оформляем…" : btnLabel()}</button>`
      : `<a class="btn btn--primary btn--lg btn--block" href="${A.href("checkout")}">Перейти к оформлению</a>`;
    return `<aside class="summary">
        <div class="calc__car">Ваш заказ<small>${Cart.count()} ${plural(Cart.count())}</small></div>
        ${list}
        <div class="calc__lines">
          <div><span>Товары</span><b>${A.fmt(sub)}</b></div>
          <div><span>Доставка</span>${free ? `<b class="free">Бесплатно</b>` : `<b>${!co ? "при оформлении" : dprice == null ? "по тарифу ТК" : dprice ? A.fmt(dprice) : "—"}</b>`}</div>
          ${free || (co && delivery === "pickup") ? "" : `<div><span class="muted">До бесплатной доставки — ${A.fmt(left)}</span></div>`}
          ${extras.mats ? `<div><span>Автоковрики EVA в цвет чехлов</span><b>по запросу</b></div>` : ""}
          ${extras.install ? `<div><span>Установка в вашем городе</span><b>по запросу</b></div>` : ""}
          <div><span class="muted">Оплётка руля в цвет салона</span><b class="free">в подарок</b></div>
        </div>
        <div class="calc__total"><div><div class="small muted">Итого${!free && (!co || dprice == null) ? " без доставки" : ""}</div><div class="price">${A.fmt(total)}</div></div></div>
        ${btn}
        <div class="calc__note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>Менеджер перезвонит и уточнит комплектацию салона.</div>
      </aside>`;
  }
  function render() {
    if (!Cart.items.length) { box.style.display = "block"; box.innerHTML = emptyHtml; bindMega(); return; }
    box.style.display = "";
    initExtras();
    if (MODE === "checkout") renderCheckout(); else renderCart();
  }
  /* --- корзина: состав, подарок, допы, сверка VIN --- */
  function renderCart() {
    const sub = Cart.total(), e = A.esc, hints = vinHints();
    box.innerHTML = `
      <div class="cart__main">
        <div class="cart-list">${Cart.items.map(i => `<div class="cart-item"><a href="${A.relink(i.url)}"><img class="cart-item__img" src="${i.img}" alt=""></a><div class="cart-item__info"><a class="cart-item__title" href="${A.relink(i.url)}">${i.title}</a><div class="cart-item__sub">${i.sub || ""}</div>${i.id.startsWith("cfg:any") ? '<div class="cart-item__sub" style="color:var(--sale)">Модель не выбрана — уточним при подтверждении</div>' : ""}</div><div class="cart-item__right"><div class="price">${A.fmt(i.price * i.qty)}${i.old ? `<s>${A.fmt(i.old * i.qty)}</s>` : ""}</div><div class="qty"><button type="button" data-qty="${i.id}" data-d="-1" aria-label="Меньше">−</button><input type="number" min="1" max="99" inputmode="numeric" value="${i.qty}" data-qty-input="${i.id}" aria-label="Количество"><button type="button" data-qty="${i.id}" data-d="1" aria-label="Больше">+</button></div><button type="button" class="cart-item__remove" data-remove="${i.id}">Удалить</button></div></div>`).join("")}</div>
        <div class="callout" style="margin-top:12px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12v8H4v-8M2 7h20v5H2zM12 22V7"/></svg><div><b>Оплётка руля в цвет салона — в подарок</b>Положим в заказ к комплекту чехлов.</div></div>
        <div class="cart-extras">
          <section class="tile">
            <h2 class="cart-h">Дополнительно к заказу</h2>
            <div class="addons">
              <label class="toggle"><div><b>Автоковрики EVA в цвет чехлов</b><span>Добавим к заказу, стоимость уточнит менеджер</span></div><span class="tp">по запросу</span><input type="checkbox" data-extra="mats" ${extras.mats ? "checked" : ""}><i class="sw"></i></label>
              <label class="toggle"><div><b>Установка в вашем городе</b><span>Найдём установщика в вашем городе, стоимость уточнит менеджер</span></div><span class="tp">по запросу</span><input type="checkbox" data-extra="install" ${extras.install ? "checked" : ""}><i class="sw"></i></label>
            </div>
          </section>
          <section class="tile">
            <h2 class="cart-h">Сверка по VIN</h2>
            ${hints ? `<div class="vin-hints">${hints}</div>` : ""}
            <p class="small muted" style="margin-bottom:10px">Введите VIN — проверим, что чехлы подходят именно вашему автомобилю. Хватит первых 11 символов. Комплектацию салона менеджер уточнит при звонке.</p>
            <div class="vin-row"><input class="input" type="text" placeholder="VIN или номер кузова" maxlength="20" autocomplete="off" spellcheck="false" value="${e(vin)}" data-cart-vin><button class="btn btn--dark" type="button" data-cart-vin-go>Проверить</button></div>
            <div class="vin-res" data-cart-vin-out></div>
          </section>
        </div>
      </div>
      ${summaryHtml(sub, null, sub)}`;
    box.querySelectorAll("[data-qty]").forEach(b => b.addEventListener("click", () => { const it = Cart.items.find(i => i.id === b.dataset.qty); Cart.setQty(b.dataset.qty, Math.min(99, it.qty + +b.dataset.d)); }));
    /* количество можно вписать: применяем по Enter или при уходе из поля */
    box.querySelectorAll("[data-qty-input]").forEach(inp => {
      inp.addEventListener("change", () => { const n = parseInt(inp.value, 10), it = Cart.items.find(i => i.id === inp.dataset.qtyInput); if (n >= 1) Cart.setQty(inp.dataset.qtyInput, Math.min(99, n)); else inp.value = it.qty; });
      inp.addEventListener("keydown", ev => { if (ev.key === "Enter") { ev.preventDefault(); inp.blur(); } });
    });
    box.querySelectorAll("[data-remove]").forEach(b => b.addEventListener("click", () => Cart.remove(b.dataset.remove)));
    box.querySelectorAll("[data-extra]").forEach(i => i.addEventListener("change", () => { extras[i.dataset.extra] = i.checked; saveExtras(); render(); }));
    const vIn = box.querySelector("[data-cart-vin]"), vOut = box.querySelector("[data-cart-vin-out]");
    const saveVin = () => { try { localStorage.setItem("as_vin", vin); } catch (er) {} };
    const vRun = () => { vin = vIn.value.trim().toUpperCase(); saveVin(); vinReport(vin, vOut); };
    box.querySelector("[data-cart-vin-go]").addEventListener("click", vRun);
    vIn.addEventListener("keydown", ev => { if (ev.key === "Enter") { ev.preventDefault(); vRun(); } });
    vIn.addEventListener("input", () => { vin = vIn.value.trim().toUpperCase(); saveVin(); });
    if (vin) vinReport(vin, vOut);
  }
  /* --- оформление: доставка, оплата, получатель --- */
  function renderCheckout() {
    const sub = Cart.total(), d = DELIVERY.find(x => x.id === delivery);
    const free = isFree(), dprice = free ? 0 : d.price;
    const total = sub + (dprice || 0);
    const val = k => A.esc(fv[k]);
    box.innerHTML = `
      <form class="checkout checkout--page" id="order-form" novalidate>
        <div class="checkout__step">
          <h2><i>1</i>Доставка</h2>
          ${DELIVERY.map(x => `<label class="radio"><input type="radio" name="delivery" value="${x.id}" ${x.id === delivery ? "checked" : ""}><div><b>${x.name}</b><span>${free && (x.id === "dpd" || x.id === "ems") ? "Отправим за наш счёт" : x.sub}</span></div>${free ? `<span class="rp free">Бесплатно</span>` : `<span class="rp">${x.price == null ? "по тарифу" : x.price ? A.fmt(x.price) : ""}</span>`}</label>`).join("")}
        </div>
        <div class="checkout__step">
          <h2><i>2</i>Оплата</h2>
          <label class="radio"><input type="radio" name="pay" value="full" ${pay === "full" ? "checked" : ""}><div><b>Картой или по QR-коду онлайн</b></div></label>
          <label class="radio"><input type="radio" name="pay" value="invoice" ${pay === "invoice" ? "checked" : ""}><div><b>Безналичный расчёт для юрлиц</b><span>Счёт по реквизитам организации</span></div></label>
          <label class="radio"><input type="radio" name="pay" value="prepay" ${pay === "prepay" ? "checked" : ""}><div><b>Предоплата ${A.fmt(prepay)}, остальное при получении</b></div></label>
          ${pay === "invoice" ? `<div class="form-grid" style="margin-top:6px"><div class="field"><label>Организация</label><input class="input" type="text" name="company" required maxlength="200" placeholder="ООО «Название»" value="${val("company")}"></div><div class="field"><label>ИНН</label><input class="input" type="text" name="inn" required inputmode="numeric" maxlength="12" placeholder="10 или 12 цифр" value="${val("inn")}"></div></div>` : ""}
        </div>
        <div class="checkout__step">
          <h2><i>3</i>Получатель</h2>
          <div class="form-grid">
            <div class="field"><label>Имя</label><input class="input" type="text" name="name" required maxlength="80" autocomplete="name" placeholder="Как к вам обращаться" value="${val("name")}"></div>
            <div class="field"><label>Телефон</label><input class="input" type="tel" name="phone" required autocomplete="tel" placeholder="+7 (___) ___-__-__" value="${val("phone")}"></div>
            <div class="field"><label>Город</label><input class="input" type="text" name="city" required maxlength="120" autocomplete="address-level2" placeholder="Ваш город" value="${val("city")}"></div>
            <div class="field"><label>E-mail для чека и трек-номера</label><input class="input" type="email" name="email" maxlength="160" autocomplete="email" placeholder="необязательно" value="${val("email")}"></div>
            ${delivery === "pickup" ? "" : `<div class="field full"><label>${delivery === "nsk" ? "Адрес доставки" : "Адрес или пункт выдачи"}</label><input class="input" type="text" name="address" maxlength="300" autocomplete="street-address" placeholder="${delivery === "nsk" ? "Улица, дом, квартира" : "Можно уточнить с менеджером"}" value="${val("address")}"></div>`}
            <div class="field full"><label>Комментарий</label><textarea class="input" name="comment" maxlength="1500" placeholder="Пожелания к заказу">${val("comment")}</textarea></div>
            <div class="field full">${A.consentHtml({ consent: fv.consent, marketing: fv.marketing })}</div>
          </div>
        </div>
      </form>
      ${summaryHtml(sub, dprice, total)}`;
    box.querySelectorAll("input[name=delivery]").forEach(r => r.addEventListener("change", () => { delivery = r.value; render(); }));
    box.querySelectorAll("input[name=pay]").forEach(r => r.addEventListener("change", () => { pay = r.value; render(); }));
    const form = document.getElementById("order-form");
    A.guardForm(form);
    form.addEventListener("input", ev => { const t = ev.target; if (t.name in fv) fv[t.name] = t.type === "checkbox" ? t.checked : t.value; });
    form.addEventListener("change", ev => { const t = ev.target; if (t.name === "consent" || t.name === "marketing") fv[t.name] = t.checked; });
    A.enhanceForm(form);
    form.addEventListener("submit", ev => { ev.preventDefault(); submit(form); });
  }
  async function submit(form) {
    if (sending) return;
    if (!form.reportValidity()) return;
    const items = covers().map(i => i.config ? { id: i.id, qty: i.qty, config: i.config, label: i.label || "" } : { id: i.id, qty: i.qty });
    if (!items.length) { A.toast("В корзине нет чехлов для заказа"); return; }
    sending = true;
    const btn = box.querySelector("[type=submit]"); btn.disabled = true; btn.textContent = "Оформляем…";
    const body = {
      items, delivery, payment: pay, vin, extras: { ...extras }, comment: fv.comment, consent: fv.consent, marketing: fv.marketing == null ? !!(form.querySelector("[name=marketing]") || {}).checked : fv.marketing, address: delivery === "pickup" ? "" : fv.address,
      company: pay === "invoice" ? fv.company : "", inn: pay === "invoice" ? fv.inn : "",
      customer: { name: fv.name, phone: fv.phone, city: fv.city, email: fv.email }, meta: A.formMeta(form)
    };
    const res = await A.api("/orders", body);
    sending = false;
    if (!res.ok) {
      btn.disabled = false; btn.textContent = btnLabel();
      A.fieldErrors(form, res); A.toast(res.error); return;
    }
    try { localStorage.setItem("as_last_order", JSON.stringify({ order: res.data.order, number: res.data.number })); } catch (er) {}
    Cart.items = []; try { localStorage.setItem("as_cart4", "[]"); localStorage.removeItem("as_extras"); } catch (er) {}
    location.href = res.data.payment_url || res.data.redirect;
  }
  function bindMega() { box.querySelectorAll("[data-mega-open]").forEach(el => el.addEventListener("click", e => { e.preventDefault(); document.querySelector("[data-mega-toggle]").click(); })); }
  document.addEventListener("cart:change", render);
  render();
})();
