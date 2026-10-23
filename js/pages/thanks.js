/* «Спасибо»: номер заказа и статус оплаты с сервера. Сюда же клиент возвращается со страницы платёжной системы. */
(function () {
  const A = window.AS, root = document.querySelector("[data-thanks]");
  if (!root) return;
  const $ = s => root.querySelector(s);
  let id = A.qs("order");
  if (!id) { try { id = (JSON.parse(localStorage.getItem("as_last_order") || "{}")).order; } catch (e) {} }
  if (!id || !/^[a-f0-9]{16,40}$/.test(id)) return;
  const title = $("[data-t-title]"), text = $("[data-t-text]"), actions = $("[data-t-actions]");
  const CALL = "В рабочее время вам перезвонит оператор и уточнит комплектацию салона. Перед отправкой пришлём фотоотчёт.";
  let tries = 0;
  function payButton(st) {
    if (!st.can_pay || $("[data-t-pay]")) return;
    const b = document.createElement("button");
    b.type = "button"; b.className = "btn btn--primary"; b.dataset.tPay = "";
    b.textContent = `Оплатить ${A.fmt(st.due_now - st.paid)}`;
    b.addEventListener("click", async () => {
      b.disabled = true; b.textContent = "Переходим к оплате…";
      const r = await A.api(`/orders/${id}/pay`, {});
      if (r.ok && r.data.payment_url) { location.href = r.data.payment_url; return; }
      b.disabled = false; b.textContent = `Оплатить ${A.fmt(st.due_now - st.paid)}`; A.toast(r.error || "Не удалось перейти к оплате");
    });
    actions.prepend(b);
    /* главная кнопка одна — «Оплатить»; «На главную» становится второстепенной */
    actions.querySelectorAll(".btn--primary:not([data-t-pay])").forEach(x => { x.style.transition = "none"; x.classList.replace("btn--primary", "btn--ghost"); x.dataset.wasPrimary = ""; void x.offsetWidth; x.style.transition = ""; });
  }
  function show(st) {
    const n = `<b>${A.esc(st.number)}</b>`;
    const rest = st.total - st.paid, tariff = st.delivery_by_tariff ? " Доставка — по тарифу транспортной компании." : "";
    root.classList.toggle("thanks--wait", st.pay_status === "pending" || st.pay_status === "canceled");
    /* ok — оплачено или принято, wait — ждём оплату или подтверждение, fail — платёж не прошёл */
    root.dataset.state = "ok";
    if (st.pay_status === "paid") {
      title.textContent = "Заказ оплачен";
      text.innerHTML = `Номер заказа ${n}. Оплата ${A.fmt(st.paid)} получена.${tariff} ${CALL}`;
    } else if (st.pay_status === "partially_paid") {
      title.textContent = "Предоплата получена";
      text.innerHTML = `Номер заказа ${n}. Внесено ${A.fmt(st.paid)}, остаток ${A.fmt(rest)} — при получении.${tariff} ${CALL}`;
    } else if (st.pay_status === "invoice") {
      title.textContent = "Заказ принят";
      text.innerHTML = `Номер заказа ${n}. Счёт выставим по реквизитам организации — менеджер пришлёт его вместе с подтверждением заказа. ${CALL}`;
    } else if (st.last_payment === "pending" && tries < 20) {
      root.dataset.state = "wait";
      title.textContent = "Проверяем оплату";
      text.innerHTML = `Номер заказа ${n}. Ждём подтверждение от платёжной системы — обычно это несколько секунд.`;
      tries++; setTimeout(load, 3000); return;
    } else if (st.can_pay && st.last_payment === "canceled") {
      root.dataset.state = "fail";
      title.textContent = "Оплата не прошла";
      text.innerHTML = `Номер заказа ${n}. Платёж отменён или банк его отклонил. Заказ сохранён — попробуйте оплатить ещё раз или дождитесь звонка: менеджер поможет с оплатой.`;
      payButton(st);
    } else if (st.can_pay) {
      root.dataset.state = "wait";
      title.textContent = "Заказ оформлен, ждёт оплаты";
      text.innerHTML = `Номер заказа ${n}. Оплатите ${st.pay_scheme === "prepay" ? "предоплату" : "заказ"} онлайн или дождитесь звонка — менеджер поможет оформить оплату.`;
      payButton(st);
    } else {
      title.textContent = "Заказ принят";
      text.innerHTML = `Номер заказа ${n}. ${CALL}`;
    }
    const b = $("[data-t-pay]");
    if (b && !st.can_pay) { b.remove(); actions.querySelectorAll("[data-was-primary]").forEach(x => x.classList.replace("btn--ghost", "btn--primary")); }
  }
  async function load() {
    const r = await A.api(`/orders/${id}`, null, { timeout: 8000 });
    if (r.ok) show(r.data);
  }
  load();
})();
