/* Хаб марки: модели (семейства) с поколениями */
(function () {
  const A = window.AS, b = A.BRAND[A.qs("b")] || A.BRAND.toyota;
  const fams = b.fams, min = Math.min(...fams.map(f => f.min));
  document.title = `Чехлы на сиденья ${b.n}: ${fams.length} ${A.plural(fams.length, "модель", "модели", "моделей")}, от ${A.fmt(min)} | Автостиль`;
  document.querySelector('meta[name="description"]').content = `Модельные чехлы на сиденья ${b.n}: ${fams.map(f => f.n).slice(0, 6).join(", ")} и другие. ${b.cnt} лекал, комплект от ${A.fmt(min)}, пошив по заводским лекалам, доставка по России.`;
  document.querySelector('link[rel="canonical"]').href = "https://1avtochehol.ru/avto/" + b.id + "/";
  document.querySelector("[data-crumb]").textContent = b.n;
  document.getElementById("b-logo").src = A.brandLogo(b.id); document.getElementById("b-logo").alt = b.n;
  document.getElementById("b-h1").textContent = "Чехлы на сиденья " + b.n;
  document.getElementById("b-meta").innerHTML = `<span><b>${fams.length}</b> ${A.plural(fams.length, "модель", "модели", "моделей")}</span><span><b>${b.cnt}</b> ${A.plural(b.cnt, "лекало", "лекала", "лекал")}</span><span>комплект от <b>${A.fmt(min)}</b></span>`;
  document.getElementById("b-side").innerHTML = fams.map(f => `<a href="${A.URL.fam(f)}">${A.esc(f.n)}<small>${f.items.length}</small></a>`).join("");
  const q = document.getElementById("b-q"), sort = document.getElementById("b-sort"), box = document.getElementById("b-fams"), cnt = document.getElementById("b-count");
  const norm = s => (s || "").toLowerCase().replace(/ё/g, "е");
  /* поиск по VIN (поле в тулбаре или ?vin= из поиска в шапке): марка по коду WMI и модельный год → модели с лекалами на этот год */
  const VIN = window.AS_vin, vinIn = document.getElementById("b-vin"), vinOut = document.getElementById("b-vin-out");
  let vinYear = 0, byYear = false, vinNote = null, vinSlugs = null;
  function vinShow() {
    vinOut.hidden = !vinNote;
    if (!vinNote) { vinOut.innerHTML = ""; return; }
    const toggle = vinSlugs ? `Показать все модели ${A.esc(b.n)}` : vinYear ? (byYear ? `Показать все модели ${A.esc(b.n)}` : `Только модели ${vinYear} года`) : "";
    vinOut.innerHTML = `<div class="vin-msg${vinNote[1] ? " vin-msg--" + vinNote[1] : ""}">${vinNote[0]}</div>` + (toggle ? `<button type="button" class="link" data-vin-all>${toggle}</button>` : "");
  }
  async function findVin(raw) {
    const e = A.esc;
    raw = String(raw || "").trim(); vinYear = 0; byYear = false; vinNote = null; vinSlugs = null;
    history.replaceState(null, "", A.URL.brand(b.id));
    /* сначала — сервер: модель и кузов по справочнику VIN; не ответил или не нашёл модель — марка и год локально */
    const sd = raw && VIN.api ? await VIN.api(raw) : null;
    const own = sd ? sd.matches.filter(m => m.brand === b.id) : [];
    if (own.length) {
      try { localStorage.setItem("as_vin", sd.vin || raw.toUpperCase()); } catch (er) {}
      vinSlugs = new Set(own.map(m => m.slug));
      history.replaceState(null, "", `${A.URL.brand(b.id)}&vin=${encodeURIComponent(sd.vin || raw)}${sd.year_sure ? "&year=" + sd.year : ""}`);
      vinNote = [`${e(sd.message)} Показаны подходящие модели — выберите свою.`, "ok"];
      vinShow(); render(); return;
    }
    if (sd && sd.matches.length) {
      vinNote = [`${e(sd.message)} ${sd.matches.slice(0, 4).map(m => `<a class="link" href="${m.url}">${e(m.title)}</a>`).join(", ")}`, "warn"];
      vinShow(); render(); return;
    }
    if (!raw) { /* поле очистили — показываем все модели */ }
    else if (VIN.isFrame(raw)) vinNote = ["Это номер кузова праворульного автомобиля, по нему модель автоматически не определить. Выберите модель ниже — менеджер сверит номер кузова с лекалом.", "warn"];
    else {
      const d = VIN.decodeVin(raw);
      if (!d) vinNote = ["VIN — 17 символов: латинские буквы без I, O, Q и цифры.", "warn"];
      else if (d.brands.length && !d.brands.includes(b.id)) vinNote = [`По VIN это ${d.brands.map(id => `<a class="link" href="${A.URL.brand(id)}&vin=${d.vin}${d.year ? "&year=" + d.year : ""}">${e(A.brandName(id))}</a>`).join(" или ")}${d.year ? `, ${d.year} модельный год` : ""}, а не ${e(b.n)}. Перейдите к моделям этой марки.`, "warn"];
      else if (!d.brands.length && !d.year) vinNote = [`Марку по коду ${e(d.wmi)} определить не удалось. Выберите модель вручную или оставьте VIN менеджеру.`, "warn"];
      else {
        try { localStorage.setItem("as_vin", d.vin); } catch (er) {}
        vinYear = d.year || 0; byYear = !!vinYear;
        history.replaceState(null, "", `${A.URL.brand(b.id)}&vin=${d.vin}${vinYear ? "&year=" + vinYear : ""}`);
        if (!d.brands.length) vinNote = [`Марку по коду ${e(d.wmi)} не нашли в справочнике — проверьте, что это VIN автомобиля ${e(b.n)}. Модельный год — ${vinYear}: показаны модели ${e(b.n)} с лекалами на этот год.`, ""];
        else if (!vinYear) vinNote = [`По VIN это ${e(b.n)}, но модельный год определить не удалось. Выберите модель ниже — менеджер сверит VIN с лекалом.`, ""];
        else vinNote = [`По VIN ${e(d.vin)}: ${e(b.n)}, ${vinYear} модельный год. Показаны модели, у которых есть лекала на этот год, — выберите свою. Комплектацию салона уточнит менеджер.`, "ok"];
      }
    }
    vinShow(); render();
  }
  /* подсказки при вводе VIN — только модели этой марки */
  VIN.suggest && VIN.suggest(vinIn, { brand: b.id });
  vinOut.addEventListener("click", ev => { if (!ev.target.closest("[data-vin-all]")) return; if (vinSlugs) { vinSlugs = null; vinNote = null; } else byYear = !byYear; vinShow(); render(); });
  vinIn.addEventListener("keydown", ev => { if (ev.key === "Enter") { ev.preventDefault(); findVin(vinIn.value); } });
  vinIn.addEventListener("input", () => { if (!vinIn.value.trim() && vinNote) findVin(""); });
  document.getElementById("b-vin-go").addEventListener("click", () => findVin(vinIn.value));
  function render() {
    const t = norm(q.value.trim());
    let list = fams.filter(f => !t || norm(f.n).includes(t) || f.items.some(m => norm([m.g, m.v, m.ru].join(" ")).includes(t)));
    if (vinSlugs) list = list.filter(f => f.items.some(m => vinSlugs.has(m.s)));
    else if (byYear && VIN) list = list.filter(f => f.items.some(m => VIN.yearMatch(m, vinYear)));
    if (sort.value === "new") list = list.slice().sort((x, y) => (y.from || 0) - (x.from || 0) || y.items[0].yr - x.items[0].yr);
    else if (sort.value === "count") list = list.slice().sort((x, y) => y.items.length - x.items.length);
    cnt.textContent = `${list.length} из ${fams.length}`;
    box.innerHTML = list.map(A.famCard).join("") || `<div class="empty">Модель не найдена. Позвоните <a class="link" href="tel:88007753260">8 (800) 775-32-60</a> — подскажем, есть ли лекало.</div>`;
  }
  q.addEventListener("input", render); sort.addEventListener("change", render);
  if (A.qs("vin")) { vinIn.value = A.qs("vin"); findVin(vinIn.value); } else render();
  /* SEO-текст по образцу главной */
  const e = A.esc, all = fams.flatMap(f => f.items);
  const famLine = f => { const st = A.famStats(f); return `<a href="${A.URL.fam(f)}">${e(b.n)} ${e(f.n)}</a> (${e(st.years)})`; };
  document.getElementById("b-seo").innerHTML = A.seoBlock({
    h2: `Чехлы на сиденья ${e(b.n)} от производителя`,
    intro: `<p>«Автостиль» с 2009 года шьёт модельные чехлы на сиденья ${e(b.n)} на собственном производстве в Новосибирске. В каталоге — модели ${e(b.n)} разных поколений: для каждого поколения и варианта салона своя выкройка. Поэтому чехлы повторяют контуры и линии сидений, сохраняют доступ к регулировкам, подлокотникам и креплениям, не пузырятся и не собираются гармошкой. Купить авточехлы ${e(b.n)} можно напрямую у производителя, с доставкой по всей России и в страны СНГ.</p>`,
    parts: [
      [`Модели ${e(b.n)} в каталоге`, `<p>${fams.map(famLine).join(", ")}.</p>`],
      [`Как подобрать чехлы на ${e(b.n)}`, `<p>Выберите модель ${e(b.n)}, затем поколение кузова и вариант салона — на странице модели показаны стандартные сочетания материала и цвета с ценой за комплект. Если не уверены в поколении, введите VIN-номер в строке поиска: по нему определим марку и модельный год. Комплектацию салона — деление задней спинки, подлокотник, подголовники — уточнит менеджер после заказа.</p>`],
      A.SEO_PART.materials(b.n),
      A.SEO_PART.prices(b.n, A.minPrices(all)),
      A.SEO_PART.custom(b.n),
      A.SEO_PART.service()
    ],
    tags: fams.slice(0, 24).map(f => [`Чехлы на ${b.n} ${f.n}`, A.URL.fam(f)])
      .concat([[`Авточехлы ${b.n} на заказ`, A.URL.custom(null)], ["Авточехлы из экокожи", "collection.html?c=eco"], ["Чехлы из алькантары", "collection.html?c=alcantara"], ["Авточехлы жаккард", "collection.html?c=jacquard"], ["Все марки", "catalog.html"]])
  });
})();
