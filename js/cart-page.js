/* Страница корзины: рендер из localStorage, доставка, форма заказа (демо) */
(function () {
  const A = window.AS, Cart = window.AS_cart, box = document.getElementById("cart");
  const DELIVERY = [
    { id: "pvz", name: "Пункт выдачи СДЭК / Boxberry", sub: "2–7 дней, примерка перед оплатой", price: 350, freeFrom: 10000 },
    { id: "courier", name: "Курьер до двери", sub: "2–7 дней, СДЭК", price: 550, freeFrom: 0 },
    { id: "msk", name: "Курьер по Москве", sub: "На следующий день", price: 300, freeFrom: 8000 },
    { id: "pickup", name: "Самовывоз", sub: "Москва, Хабаровск, Уфа — в день готовности", price: 0, freeFrom: 0 }
  ];
  let delivery = "pvz", pay = "cod";
  function render() {
    if (!Cart.items.length) {
      box.style.display = "block";
      box.innerHTML = `<div class="cart-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.5L21 8H6.5"/><circle cx="10" cy="20" r="1.2"/><circle cx="17" cy="20" r="1.2"/></svg><h2 style="font-size:1.25rem; margin-bottom:6px">В корзине пока пусто</h2><p class="muted small" style="margin-bottom:18px">Выберите марку в каталоге или рассчитайте комплект в калькуляторе — цена появится здесь.</p><div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap"><a class="btn btn--primary" href="#" data-mega-open>Выбрать марку</a><a class="btn btn--ghost" href="index.html#calc">Калькулятор</a></div></div>`;
      bindMega(); return;
    }
    box.style.display = "";
    const sub = Cart.total(), d = DELIVERY.find(x => x.id === delivery);
    const dprice = d.freeFrom && sub >= d.freeFrom ? 0 : d.price;
    const discount = pay === "online" ? Math.round(sub * 0.03) : 0;
    const total = sub + dprice - discount;
    box.innerHTML = `
      <div>
        <div class="cart-list">${Cart.items.map(i => `<div class="cart-item"><img class="cart-item__img" src="${i.img}" alt=""><div><a class="cart-item__title" href="${i.url}">${i.title}</a><div class="cart-item__sub">${i.sub || ""}</div>${i.id.startsWith("cfg:any") ? '<div class="cart-item__sub" style="color:var(--c-sale)">Модель не выбрана — уточним при подтверждении</div>' : ""}</div><div class="cart-item__right"><div class="price">${A.fmt(i.price * i.qty)}${i.old ? `<s>${A.fmt(i.old * i.qty)}</s>` : ""}</div><div class="qty"><button type="button" data-qty="${i.id}" data-d="-1">−</button><span>${i.qty}</span><button type="button" data-qty="${i.id}" data-d="1">+</button></div><button type="button" class="cart-item__remove" data-remove="${i.id}">Удалить</button></div></div>`).join("")}</div>
        <div class="callout" style="margin-top:14px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12v8H4v-8M2 7h20v5H2zM12 22V7"/></svg><div><b>Оплётка на руль в подарок</b>Добавим к комплекту модельных чехлов автоматически, цвет подберём под боковины.</div></div>
        <form class="tile" data-form="order" style="margin-top:16px" id="order-form">
          <h2 style="font-size:1.25rem; margin-bottom:14px">Доставка</h2>
          ${DELIVERY.map(x => `<label class="radio"><input type="radio" name="delivery" value="${x.id}" ${x.id === delivery ? "checked" : ""}><div><b>${x.name}</b><span>${x.sub}</span></div><span class="rp">${x.freeFrom && sub >= x.freeFrom ? "бесплатно" : x.price ? A.fmt(x.price) : "бесплатно"}</span></label>`).join("")}
          <h2 style="font-size:1.25rem; margin:20px 0 14px">Оплата</h2>
          <label class="radio"><input type="radio" name="pay" value="cod" ${pay === "cod" ? "checked" : ""}><div><b>При получении</b><span>Наличными или картой в пункте выдачи, курьеру, на производстве</span></div></label>
          <label class="radio"><input type="radio" name="pay" value="online" ${pay === "online" ? "checked" : ""}><div><b>Картой онлайн</b><span>Visa, Mastercard, Мир, СБП</span></div><span class="rp" style="color:var(--c-success)">−3 %</span></label>
          <label class="radio"><input type="radio" name="pay" value="invoice" ${pay === "invoice" ? "checked" : ""}><div><b>По счёту для юрлиц</b><span>С НДС и без, документы в комплекте</span></div></label>
          <h2 style="font-size:1.25rem; margin:20px 0 14px">Получатель</h2>
          <div class="form-grid">
            <div class="field"><label>Имя</label><input class="input" type="text" required placeholder="Как к вам обращаться"></div>
            <div class="field"><label>Телефон</label><input class="input" type="tel" required placeholder="+7 (___) ___-__-__"></div>
            <div class="field"><label>Город</label><input class="input" type="text" required value="${(() => { try { return localStorage.getItem("as_city") || "Москва"; } catch (e) { return "Москва"; } })()}"></div>
            <div class="field"><label>E-mail для чека и трек-номера</label><input class="input" type="email" placeholder="необязательно"></div>
            <div class="field full"><label>Комментарий: год выпуска, комплектация, пожелания</label><textarea class="input" placeholder="Например: 2019 год, задний подлокотник есть, спинка 60/40"></textarea></div>
            <div class="field full"><label class="check"><input type="checkbox" required> Согласен с <a href="offer.html">условиями оферты</a> и <a href="privacy.html">обработкой персональных данных</a></label></div>
          </div>
        </form>
      </div>
      <aside class="summary">
        <div class="calc__car">Ваш заказ<small>${Cart.count()} ${Cart.count() === 1 ? "позиция" : Cart.count() < 5 ? "позиции" : "позиций"}</small></div>
        <div class="calc__lines">
          <div><span>Товары</span><b>${A.fmt(sub)}</b></div>
          <div><span>Доставка · ${d.name.split(" ")[0]}</span><b class="${dprice ? "" : "free"}">${dprice ? A.fmt(dprice) : "бесплатно"}</b></div>
          ${discount ? `<div><span>Скидка за онлайн-оплату</span><b class="free">−${A.fmt(discount)}</b></div>` : ""}
          <div><span class="muted">Оплётка на руль</span><b class="free"><s class="muted">500 ₽</s> подарок</b></div>
        </div>
        <div class="calc__total"><div><div class="small muted">Итого</div><div class="price">${A.fmt(total)}</div></div>${sub < 10000 && delivery === "pvz" ? `<span class="calc__savings" style="background:var(--c-band); color:var(--c-text-2)">до бесплатной доставки ${A.fmt(10000 - sub)}</span>` : ""}</div>
        <button class="btn btn--primary btn--lg btn--block" type="submit" form="order-form" data-label="Оформить заказ">Оформить заказ</button>
        <div class="calc__note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>Менеджер перезвонит, уточнит комплектацию и сроки. Оплата после подтверждения.</div>
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
