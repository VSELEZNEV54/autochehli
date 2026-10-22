/* Страница корзины: рендер из localStorage, доставка, форма заказа (демо) */
(function () {
  const A = window.AS, Cart = window.AS_cart, box = document.getElementById("cart");
  /* Доставка и оплата — как на старом сайте: DPD, EMS Почта России, самовывоз и курьер в Новосибирске; предоплата от 1 000 ₽ */
  const DELIVERY = [
    { id: "dpd", name: "Транспортная компания DPD", sub: "Срок и стоимость — по тарифу транспортной компании", price: null },
    { id: "ems", name: "EMS Почта России", sub: "Срок и стоимость — по тарифу Почты России", price: null },
    { id: "pickup", name: "Самовывоз в Новосибирске", sub: "ул. Бориса Богаткова 253/2, оф. 116", price: 0 },
    { id: "nsk", name: "Курьер по Новосибирску", sub: "Доставка по городу", price: 385 },
    { id: "other", name: "Другая транспортная компания", sub: "По согласованию с менеджером", price: null }
  ];
  let delivery = "dpd", pay = "prepay";
  function render() {
    if (!Cart.items.length) {
      box.style.display = "block";
      box.innerHTML = `<div class="cart-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.5L21 8H6.5"/><circle cx="10" cy="20" r="1.2"/><circle cx="17" cy="20" r="1.2"/></svg><h2 style="font-size:1.25rem; margin-bottom:6px">В корзине пока пусто</h2><p class="muted small" style="margin-bottom:18px">Выберите марку и модель в каталоге — комплект появится здесь.</p><div class="actions" style="gap:8px; justify-content:center"><a class="btn btn--primary" href="#" data-mega-open>Выбрать марку</a><a class="btn btn--ghost" href="custom.html">Конструктор</a></div></div>`;
      bindMega(); return;
    }
    box.style.display = "";
    const sub = Cart.total(), d = DELIVERY.find(x => x.id === delivery);
    const dprice = d.price;
    const total = sub + (dprice || 0);
    box.innerHTML = `
      <div>
        <div class="cart-list">${Cart.items.map(i => `<div class="cart-item"><img class="cart-item__img" src="${i.img}" alt=""><div><a class="cart-item__title" href="${i.url}">${i.title}</a><div class="cart-item__sub">${i.sub || ""}</div>${i.id.startsWith("cfg:any") ? '<div class="cart-item__sub" style="color:var(--c-sale)">Модель не выбрана — уточним при подтверждении</div>' : ""}</div><div class="cart-item__right"><div class="price">${A.fmt(i.price * i.qty)}${i.old ? `<s>${A.fmt(i.old * i.qty)}</s>` : ""}</div><div class="qty"><button type="button" data-qty="${i.id}" data-d="-1">−</button><span>${i.qty}</span><button type="button" data-qty="${i.id}" data-d="1">+</button></div><button type="button" class="cart-item__remove" data-remove="${i.id}">Удалить</button></div></div>`).join("")}</div>
        <div class="callout" style="margin-top:14px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12v8H4v-8M2 7h20v5H2zM12 22V7"/></svg><div><b>Оплётка на руль в подарок</b>Оплётка стоимостью 500 ₽ — в подарок к комплекту чехлов. Подробности акции уточнит менеджер.</div></div>
        <form class="tile" data-form="order" style="margin-top:16px" id="order-form">
          <h2 style="font-size:1.25rem; margin-bottom:14px">Доставка</h2>
          ${DELIVERY.map(x => `<label class="radio"><input type="radio" name="delivery" value="${x.id}" ${x.id === delivery ? "checked" : ""}><div><b>${x.name}</b><span>${x.sub}</span></div><span class="rp">${x.price == null ? "по тарифу" : x.price ? A.fmt(x.price) : ""}</span></label>`).join("")}
          <h2 style="font-size:1.25rem; margin:20px 0 14px">Оплата</h2>
          <label class="radio"><input type="radio" name="pay" value="prepay" ${pay === "prepay" ? "checked" : ""}><div><b>Предоплата от 1 000 ₽</b><span>Остаток — при получении, если в вашем городе доступен наложенный платёж</span></div></label>
          <label class="radio"><input type="radio" name="pay" value="online" ${pay === "online" ? "checked" : ""}><div><b>Полная оплата картой или по QR-коду</b><span>Visa, Mastercard, Maestro, МИР — через Сбербанк, комиссия 0 %</span></div></label>
          <label class="radio"><input type="radio" name="pay" value="invoice" ${pay === "invoice" ? "checked" : ""}><div><b>Безналичный расчёт для юрлиц</b><span>Счёт выставляем по реквизитам организации</span></div></label>
          <h2 style="font-size:1.25rem; margin:20px 0 14px">Получатель</h2>
          <div class="form-grid">
            <div class="field"><label>Имя</label><input class="input" type="text" required placeholder="Как к вам обращаться"></div>
            <div class="field"><label>Телефон</label><input class="input" type="tel" required placeholder="+7 (___) ___-__-__"></div>
            <div class="field"><label>Город</label><input class="input" type="text" required placeholder="Ваш город" value="${(() => { try { return localStorage.getItem("as_city") || ""; } catch (e) { return ""; } })()}"></div>
            <div class="field"><label>E-mail для чека и трек-номера</label><input class="input" type="email" placeholder="необязательно"></div>
            <div class="field full"><label>Комментарий: год выпуска, комплектация, пожелания</label><textarea class="input" placeholder="Например: 2019 год, задний подлокотник есть, спинка 60/40"></textarea></div>
            <div class="field full"><label class="check"><input type="checkbox" required> <span>Согласен с <a href="offer.html">условиями оферты</a> и <a href="privacy.html">обработкой персональных данных</a></span></label></div>
          </div>
        </form>
      </div>
      <aside class="summary">
        <div class="calc__car">Ваш заказ<small>${Cart.count()} ${Cart.count() === 1 ? "позиция" : Cart.count() < 5 ? "позиции" : "позиций"}</small></div>
        <div class="calc__lines">
          <div><span>Товары</span><b>${A.fmt(sub)}</b></div>
          <div><span>Доставка</span><b>${dprice == null ? "по тарифу ТК" : dprice ? A.fmt(dprice) : "—"}</b></div>
          <div><span class="muted">Оплётка на руль</span><b class="free">подарок по акции</b></div>
        </div>
        <div class="calc__total"><div><div class="small muted">Итого${dprice == null ? " без доставки" : ""}</div><div class="price">${A.fmt(total)}</div></div></div>
        <button class="btn btn--primary btn--lg btn--block" type="submit" form="order-form" data-label="Оформить заказ">Оформить заказ</button>
        <div class="calc__note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>Менеджер перезвонит и уточнит комплектацию салона. Работаем по предоплате от 1 000 ₽.</div>
      </aside>`;
    box.querySelectorAll("[data-qty]").forEach(b => b.addEventListener("click", () => { const it = Cart.items.find(i => i.id === b.dataset.qty); Cart.setQty(b.dataset.qty, it.qty + +b.dataset.d); }));
    box.querySelectorAll("[data-remove]").forEach(b => b.addEventListener("click", () => Cart.remove(b.dataset.remove)));
    box.querySelectorAll("input[name=delivery]").forEach(r => r.addEventListener("change", () => { delivery = r.value; render(); }));
    box.querySelectorAll("input[name=pay]").forEach(r => r.addEventListener("change", () => { pay = r.value; render(); }));
    const form = document.getElementById("order-form");
    form.addEventListener("submit", e => { e.preventDefault(); const btn = box.querySelector("[type=submit]"); btn.disabled = true; btn.textContent = "Оформляем…"; setTimeout(() => { Cart.clear(); location.href = "thanks.html"; }, 700); });
  }
  function bindMega() { box.querySelectorAll("[data-mega-open]").forEach(el => el.addEventListener("click", e => { e.preventDefault(); document.querySelector("[data-mega-toggle]").click(); })); }
  document.addEventListener("cart:change", render);
  render();
})();
