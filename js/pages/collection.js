/* Подборки (SEO-посадочные): ?c=материал/тип авто, ?city=город, без параметров — список подборок */
(function () {
  const A = window.AS, e = A.esc;
  const POP = ["toyota_camry-xv70", "lada_vesta", "hyundai_solaris-2", "kia_rio-iv", "renault_duster", "toyota_rav4-new", "hyundai_creta", "kia_sportageiv-re", "lada_granta-re", "volkswagen_polo", "lada_largus5m", "skoda_octavia-a-7", "nissan_qashqai-new2014", "mitsubishi_outlander-3", "haval_jolion", "kia_seltos"];
  const firstOf = fam => (A.FAMILIES[fam] || {}).items?.[0];
  /* Подборки только из реальных материалов и цветов каталога (страницы моделей 1avtochehol.ru) */
  const C = {
    eco: { t: "Чехлы на сиденья из экокожи", lead: "Экокожа «Аригон» с полиуретановым покрытием на хлопковой основе, толщина 1,05–1,15 мм. Цвета: чёрный, серый, бежевый, шоколадный и восемь цветов с перфорацией. Комплект на весь салон от 9 375 ₽.", mat: 1 },
    perf: { t: "Чехлы из перфорированной экокожи", lead: "Перфорированная экокожа на вставках: чёрный, серый, красный, синий, жёлтый, оранжевый, паприка, розовый. Цена как у обычной экокожи — от 9 375 ₽ за комплект.", vars: ["eco-blue", "eco-red", "eco-orange", "eco-paprika"] },
    alcantara: { t: "Чехлы на сиденья из алькантары", lead: "Боковины из экокожи, вставки из алькантары. Цвета: тёмная, вишня, синяя, светлая, бежевая. Комплект на весь салон от 9 975 ₽.", mat: 2 },
    jacquard: { t: "Чехлы на сиденья из жаккарда", lead: "Вставки из жаккарда: «рогожка» серая, красная и синяя, «брызги». Самый доступный вариант — комплект на весь салон от 7 975 ₽.", mat: 0 },
    suv: { t: "Чехлы на сиденья для кроссоверов и внедорожников", lead: "Заводские лекала для кроссоверов и внедорожников: RAV4, Sportage, Creta, Duster, Qashqai, Outlander, Jolion и другие.", fams: ["toyota-rav4", "kia-sportage", "hyundai-creta", "renault-duster", "nissan-qashqai", "mitsubishi-outlander", "haval-jolion", "kia-seltos", "hyundai-tucson", "volkswagen-tiguan", "nissan-x-trail", "mazda-cx-5", "uaz-patriot", "chevrolet-niva", "lada-niva-travel", "skoda-yeti"] },
    mpv: { t: "Чехлы для 7-местных автомобилей", lead: "Отдельные лекала для 7-местных версий автомобилей. Цена комплекта — на странице модели.", filter: m => /7\s*мест/i.test([m.m, m.g, m.v].join(" ")) },
    budget: { t: "Недорогие чехлы на сиденья до 8 000 ₽", lead: "Комплекты из жаккарда на весь салон по заводским лекалам вашей модели — от 7 975 ₽.", mat: 0 }
  };
  /* Города: адреса — со страницы «Контакты» старого сайта, остальное — общая доставка */
  const CITY = {
    moskva: ["Москва", "в Москве", "В Москве находится второе производство «Автостиль»: ул. Полярная, территория ГПЗ-21, тел. +7 (495) 777-19-43. Условия самовывоза уточняйте у менеджера."],
    spb: ["Санкт-Петербург", "в Санкт-Петербурге"], novosibirsk: ["Новосибирск", "в Новосибирске", "Отдел продаж и производство: ул. Бориса Богаткова 253/2, оф. 116. Самовывоз или курьер по городу — 385 ₽."],
    ekaterinburg: ["Екатеринбург", "в Екатеринбурге"], kazan: ["Казань", "в Казани"], nizhniy: ["Нижний Новгород", "в Нижнем Новгороде"], krasnodar: ["Краснодар", "в Краснодаре"], samara: ["Самара", "в Самаре"],
    ufa: ["Уфа", "в Уфе", "Пункт выдачи в Уфе: проспект Октября, 113."], rostov: ["Ростов-на-Дону", "в Ростове-на-Дону"], chelyabinsk: ["Челябинск", "в Челябинске"], voronezh: ["Воронеж", "в Воронеже"],
    krasnoyarsk: ["Красноярск", "в Красноярске", "Представительство: проспект Свободный, 57, пом. 81, магазин «Автодруг»."], habarovsk: ["Хабаровск", "в Хабаровске", "Представительство: проспект 60-летия Октября, 148В, магазин «Коврики27.рф»."]
  };
  const crumbs = document.getElementById("k-crumbs"), h1 = document.getElementById("k-h1"), lead = document.getElementById("k-lead"), chips = document.getElementById("k-chips"), info = document.getElementById("k-info"), grid = document.getElementById("k-grid"), seo = document.getElementById("k-seo");
  const cKey = A.qs("c"), cityKey = A.qs("city");
  const setMeta = (title, desc) => { document.title = title + " | Автостиль"; document.querySelector('meta[name="description"]').content = desc; };
  const chipLinks = active => Object.entries(C).map(([k, v]) => `<a class="chip${k === active ? " is-selected" : ""}" href="collection.html?c=${k}">${e(v.t.replace("Чехлы на сиденья ", "").replace("Чехлы ", ""))}</a>`).join("");
  const cards = (positions, varsFor) => positions.filter(Boolean).map((m, i) => A.coverCard(m, A.VAR[varsFor(i)] || A.VARIANTS[0], { logo: true }));

  if (cityKey && CITY[cityKey]) {
    const [name, where, local] = CITY[cityKey];
    const title = `Чехлы на сиденья ${where}`;
    setMeta(title, `Модельные чехлы на сиденья ${where}: 485 лекал на 41 марку, комплект от 7 975 ₽, пошив по заводским лекалам, доставка DPD и Почтой России, гарантия на пошив 1 год.`);
    document.querySelector('link[rel="canonical"]').href = `https://1avtochehol.ru/dostavka/${cityKey}/`;
    crumbs.insertAdjacentHTML("beforeend", `<li><a href="delivery.html">Доставка</a></li><li>${e(name)}</li>`);
    h1.textContent = title;
    lead.textContent = local || `Шьём по заводским лекалам вашего автомобиля и отправляем ${where} транспортной компанией DPD или EMS Почтой России. Стоимость доставки — по тарифу транспортной компании.`;
    chips.innerHTML = Object.entries(CITY).map(([k, v]) => `<a class="chip${k === cityKey ? " is-selected" : ""}" href="collection.html?city=${k}">${e(v[0])}</a>`).join("");
    const box = (b, s) => `<div class="stat"><b style="font-size:1.375rem">${b}</b><span>${s}</span></div>`;
    info.innerHTML = `<div class="stat-row" style="margin-bottom:var(--gap)">${box("485", "лекал на 41 марку") + box("от 250 ₽", "доставка по тарифу транспортной компании") + box("от 1 000 ₽", "предоплата, остаток — при получении, где доступно") + box("1 год", "гарантия на качество пошива")}</div>`;
    grid.innerHTML = cards(POP.slice(0, 10).map(s => A.BY_SLUG[s]), i => ["eco-black", "eco-beige", "alc-grey", "eco-grey", "jac-black"][i % 5]).join("") + A.customCard(null, true);
    seo.innerHTML = `<h2>Чехлы на сиденья ${e(where)}</h2><p>«Автостиль» шьёт модельные чехлы по заводским лекалам: 485 лекал на 41 марку. ${local ? e(local) : `Доставляем ${e(where)} транспортной компанией DPD или EMS Почтой России.`}</p><p>Комплект на весь салон — от 7 975 ₽. Своё сочетание цветов можно собрать в конструкторе и отправить заявку.</p>`;
  } else if (cKey && C[cKey]) {
    const c = C[cKey];
    setMeta(c.t + " — купить по лекалам вашего авто", c.lead);
    document.querySelector('link[rel="canonical"]').href = `https://1avtochehol.ru/podborki/${cKey}/`;
    crumbs.insertAdjacentHTML("beforeend", `<li><a href="collection.html">Подборки</a></li><li>${e(c.t)}</li>`);
    h1.textContent = c.t; lead.textContent = c.lead; chips.innerHTML = chipLinks(cKey);
    let positions = c.fams ? c.fams.map(firstOf) : c.filter ? A.MODELS.filter(c.filter).slice(0, 16) : POP.map(s => A.BY_SLUG[s]);
    const vars = c.vars || A.VARIANTS.filter(v => c.mat === undefined || v.mat === c.mat).map(v => v.id);
    const list = cards(positions, i => vars[i % vars.length]);
    list.splice(Math.min(6, list.length), 0, A.customCard(null, true));
    grid.innerHTML = list.join("") || '<div class="empty">Подборка пополняется</div>';
    seo.innerHTML = `<h2>${e(c.t)}</h2><p>${e(c.lead)}</p><p>Все комплекты шьются по заводским лекалам конкретного поколения и варианта салона: чехлы повторяют контуры сидений, учитывают подлокотник, подголовники и подушки безопасности. Доставка в 6 000 населённых пунктов России и СНГ.</p>`;
  } else {
    setMeta("Подборки чехлов на сиденья: по материалу, типу авто и городу", "Подборки модельных чехлов: экокожа, перфорация, алькантара, жаккард, для кроссоверов и 7-местных авто. Доставка в 6 000 населённых пунктов.");
    crumbs.insertAdjacentHTML("beforeend", "<li>Подборки</li>");
    h1.textContent = "Подборки чехлов"; lead.textContent = "Комплекты, сгруппированные по материалу и типу автомобиля. Выберите подборку или сразу свою модель в каталоге.";
    chips.innerHTML = ""; info.innerHTML = `<div class="guides" style="margin-bottom:var(--gap)">${Object.entries(C).map(([k, v]) => `<a class="guide" href="collection.html?c=${k}"><b>${e(v.t)}</b><p>${e(v.lead)}</p><span class="link">Смотреть ${A.ICON.arrow}</span></a>`).join("")}</div>`;
    seo.innerHTML = `<h2>Доставка по городам</h2><p>${Object.entries(CITY).map(([k, v]) => `<a href="collection.html?city=${k}">Чехлы на сиденья ${e(v[1])}</a>`).join(" · ")}</p>`;
  }
  A.badges();
})();
