/* Поиск (шаблон T17, в noindex): ?q= — марки и модели карточками, пусто — «Нет вашей модели?» и заявка.
   Названия ищет AS.search. VIN и номер кузова — сервер (/api/vin/suggest), без связи с ним — марка по коду VIN (AS_vin.decodeVin). */
(function () {
  const A = window.AS, V = window.AS_vin, e = A.esc, MAX = 24, BRAND_MAX = 12;
  const q = (A.qs("q") || "").trim();
  const el = id => document.getElementById(id);
  const lead = el("s-lead"), out = el("s-out"), none = el("s-none"), helpBox = el("s-help");
  const HELP = `<div class="side__box side__box--yellow"><p class="side__h">Нет вашей модели?</p><p>Задайте вопрос или позвоните — подскажем, есть ли лекало для вашего автомобиля.</p><div class="help-cta"><button class="btn btn--dark btn--sm" type="button" data-ask-open>Задать вопрос</button><a class="help-cta__tel" href="tel:88007753260">8 (800) 775-32-60<small>бесплатно по России</small></a></div></div>`;

  const block = (title, body, more = "", sub = "") => `<section class="section section--tight"><div><div class="section__head"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ""}</div>${more}</div>${body}</div></section>`;
  const brandCard = (b, extra) => `<a class="brand" href="${A.URL.brand(b.id, extra)}"><img src="${A.brandLogo(b.id)}" alt="Логотип ${e(b.n)}" loading="lazy" width="52" height="52"><span>${e(b.n)}</span><small>Все модели</small></a>`;
  const note = text => `<p class="srv-note">${text}</p>`;

  /* Все лекала модели нашлись — карточка модели, иначе карточки подходящих лекал */
  function modelCards(models) {
    const byFam = new Map();
    models.forEach(m => { if (!byFam.has(m.f)) byFam.set(m.f, []); byFam.get(m.f).push(m); });
    return [...byFam].flatMap(([id, list]) => {
      const f = A.FAMILIES[id];
      return f && f.items.length > 1 && list.length === f.items.length ? [A.famCard(f)] : list.map(m => A.genCard(m));
    });
  }
  /* Запрос по марке: сначала популярные модели, как на странице марки, остальные — по кнопке «Все модели» */
  function byBrand(b) {
    const pop = ((window.AS_CATALOG || {}).pop || {})[b.id] || [];
    const rank = id => { const i = pop.indexOf(id); return i < 0 ? pop.length : i; };
    const fams = b.fams.slice().sort((x, y) => rank(x.id) - rank(y.id) || x.n.localeCompare(y.n));
    const cut = fams.length > BRAND_MAX;
    return block(cut ? `Популярные модели ${e(b.n)}` : `Модели ${e(b.n)}`, `<div class="fams">${fams.slice(0, BRAND_MAX).map(f => A.famCard(f)).join("")}</div>`,
      cut ? `<a class="btn btn--more" href="${A.URL.brand(b.id)}">Все модели ${e(b.n)}</a>` : "");
  }
  function byName(brands, models) {
    let html = "";
    if (brands.length) html += block("Марки", `<div class="brands">${brands.map(b => brandCard(b)).join("")}</div>`);
    const whole = brands.find(b => models.filter(m => m.b === b.id).length >= b.cnt);
    if (whole) return html + byBrand(whole);
    if (models.length) {
      const cards = modelCards(models), cut = cards.length > MAX;
      html += block("Модели и поколения", `<div class="fams">${cards.slice(0, MAX).join("")}</div>`, "", cut ? "Уточните запрос: добавьте модель, поколение или год." : "");
    }
    return html;
  }
  /* Сервер распознал номер, но подходящих лекал нет: его текст идёт в лид, ниже заявка */
  let vinMessage = "";
  async function byVin() {
    const v = V.decodeVin(q), extra = { vin: v ? v.vin : q, ...(v && v.year ? { year: v.year } : {}) };
    const d = await V.suggestApi(q);
    if (d) {
      const cards = (d.items || []).map(it => A.BY_SLUG[it.slug]).filter(Boolean).map(m => A.genCard(m)).join("");
      const other = d.other && d.other.length ? `${d.other.join(", ")}: готовых лекал в каталоге нет, менеджер подскажет, можно ли сшить.` : "";
      if (!cards) {
        vinMessage = d.message || other;
        const brands = ((d.wmi && d.wmi.brands) || []).map(id => A.BRAND[id]).filter(Boolean);
        return brands.length ? block("Марка по VIN", `<div class="brands">${brands.map(b => brandCard(b, extra)).join("")}</div>`) : "";
      }
      const notes = [d.message ? e(d.message) : "", d.more ? "Введите больше символов, список сузится." : "",
        other ? `${e(other)} <button class="link" type="button" data-ask-open>Задать вопрос</button>` : ""].filter(Boolean);
      return block((d.kind || "").startsWith("frame") ? "Подходят по номеру кузова" : "Подходят по VIN", `<div class="fams">${cards}</div>${notes.map(note).join("")}`);
    }
    /* нет связи с сервером: марка и модельный год по стандарту VIN */
    if (v && v.brands.length) return block("Подходят по VIN", `<div class="brands">${v.brands.map(id => brandCard(A.BRAND[id], extra)).join("")}</div>`);
    return "";
  }

  function nothing(text) {
    lead.textContent = text;
    el("s-form").elements.car.value = q;
    el("s-aside").innerHTML = HELP;
    none.hidden = false;
    helpBox.remove();
  }
  (async () => {
    if (q.length < 2) { helpBox.innerHTML = HELP; return; }
    el("s-box").querySelector("input").value = q;
    const { models, brands } = A.search(q, 200);
    const found = models.length + brands.length, vinish = V.vinLike(q) || (!found && V.sugLike(q, 0));
    let html = byName(brands, models);
    if (vinish) {
      lead.textContent = "Ищем автомобили по VIN…";
      html = (await byVin()) + html;
    }
    if (!html || vinMessage) {
      out.innerHTML = html;
      nothing(vinMessage || (V.isFrame(q)
        ? `Похоже на номер кузова праворульного автомобиля. Оставьте заявку или выберите марку и модель в каталоге — менеджер сверит номер кузова с лекалом.`
        : `По запросу «${q}» ничего не нашли. Попробуйте латиницей или только модель, например «Camry» или «Солярис».`));
      return;
    }
    lead.textContent = `Результаты по запросу «${q}»`;
    out.innerHTML = html;
    helpBox.innerHTML = HELP;
  })();
})();
