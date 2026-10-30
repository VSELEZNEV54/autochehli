/* Подборки (SEO-посадочные): ?c=материал/тип авто, ?city=город, без параметров — список подборок */
(function () {
  const A = window.AS, e = A.esc;
  /* Всё вывел сервер (lib/pages.php): интерактива здесь нет, корзина и избранное — общие обработчики app.js */
  if (window.AS_SSR) { A.badges(); return; }
  const POP = ["toyota_camry-xv70", "lada_vesta", "hyundai_solaris-2", "kia_rio-iv", "renault_duster", "toyota_rav4-new", "hyundai_creta", "kia_sportageiv-re", "lada_granta-re", "volkswagen_polo", "lada_largus5m", "skoda_octavia-a-7", "nissan_qashqai-new2014", "mitsubishi_outlander-3", "haval_jolion", "kia_seltos"];
  const firstOf = fam => (A.FAMILIES[fam] || {}).items?.[0];
  /* Подборки только из реальных материалов и цветов каталога (страницы моделей 1avtochehol.ru) */
  const C = {
    eco: { t: "Чехлы на сиденья из экокожи", d: "Модельные чехлы на сиденья из экокожи «Аригон»: чёрный, серый, бежевый, шоколадный цвета и вставки с перфорацией. Пошив по заводским лекалам, комплект от {from}.", kw: "чехлы на сиденья экокожа, авточехлы из экокожи, авточехлы экокожа, чехлы на сиденья автомобиля экокожа, купить чехлы на сиденья экокожа", lead: "Экокожа «Аригон» с полиуретановым покрытием на хлопковой основе, толщина 1,05–1,15 мм. Цвета: чёрный, серый, бежевый, шоколадный и восемь цветов с перфорацией. Комплект на весь салон от {from}.", mat: 1 },
    perf: { t: "Чехлы из перфорированной экокожи", kw: "чехлы из перфорированной экокожи, авточехлы с перфорацией, чехлы на сиденья перфорация", lead: "Перфорированная экокожа на вставках: чёрный, серый, красный, синий, жёлтый, оранжевый, паприка, розовый. Цена как у обычной экокожи — от {from} за комплект.", mat: 1, vars: ["perf-blue-h", "perf-red-h", "perf-orange-h", "perf-grey-h"] },
    alcantara: { t: "Чехлы на сиденья из алькантары", d: "Модельные чехлы на сиденья из алькантары: вставки тёмные, вишнёвые, синие, светлые и бежевые, боковины из экокожи. Пошив по заводским лекалам, комплект от {from}.", kw: "чехлы из алькантары, чехлы на сиденья из алькантары, чехлы из алькантары купить, чехлы на весь салон из алькантары", lead: "Боковины из экокожи, вставки из алькантары. Цвета: тёмная, вишня, синяя, светлая, бежевая. Комплект на весь салон от {from}.", mat: 2 },
    jacquard: { t: "Чехлы на сиденья из жаккарда", d: "Модельные чехлы на сиденья из жаккарда: «рогожка» серая, красная и синяя, «брызги». Самый доступный материал — комплект на весь салон от {from}, пошив по лекалам.", kw: "авточехлы жаккард, чехлы на сиденья жаккард, чехлы из жаккарда", lead: "Вставки из жаккарда: «рогожка» серая, красная и синяя, «брызги». Самый доступный вариант — комплект на весь салон от {from}.", mat: 0 },
    suv: { t: "Чехлы на сиденья для кроссоверов и внедорожников", d: "Модельные чехлы на сиденья для кроссоверов и внедорожников: RAV4, Sportage, Creta, Duster, Qashqai, Outlander, Jolion и другие. Пошив по заводским лекалам.", kw: "чехлы на сиденья для кроссоверов, авточехлы для внедорожников, чехлы на сиденья кроссовера", lead: "Заводские лекала для кроссоверов и внедорожников: RAV4, Sportage, Creta, Duster, Qashqai, Outlander, Jolion и другие.", fams: ["toyota-rav4", "kia-sportage", "hyundai-creta", "renault-duster", "nissan-qashqai", "mitsubishi-outlander", "haval-jolion", "kia-seltos", "hyundai-tucson", "volkswagen-tiguan", "nissan-x-trail", "mazda-cx-5", "uaz-patriot", "chevrolet-niva", "lada-niva-travel", "skoda-yeti"] },
    mpv: { t: "Чехлы для 7-местных автомобилей", d: "Модельные чехлы для 7-местных автомобилей: отдельные заводские лекала для салонов с третьим рядом. Экокожа, алькантара, жаккард, доставка по России.", kw: "чехлы для 7-местных автомобилей, авточехлы на 7 мест, чехлы на сиденья 7 мест", lead: "Отдельные лекала для 7-местных версий автомобилей. Цена комплекта — на странице модели.", filter: m => /7\s*мест/i.test([m.m, m.g, m.v].join(" ")) },
    budget: { t: "Недорогие чехлы на сиденья до 8 000 ₽", st: "Недорогие чехлы на сиденья", d: "Недорогие модельные чехлы на сиденья: комплекты из жаккарда на весь салон по заводским лекалам вашей модели — от {from}. Доставка по России, гарантия 1 год.", kw: "недорогие чехлы на сиденья, авточехлы недорого, дешёвые авточехлы", lead: "Комплекты из жаккарда на весь салон по заводским лекалам вашей модели — от {from}.", mat: 0 }
  };
  /* Города: адреса — со страницы «Контакты» старого сайта, остальное — общая доставка */
  const CITY = {
    moskva: ["Москва", "в Москве", "Представительство «Автостиль» в Москве: ул. Полярная, 31А, стр. 1 (территория ГПЗ-21), тел. +7 (495) 777-19-43."],
    spb: ["Санкт-Петербург", "в Санкт-Петербурге"], novosibirsk: ["Новосибирск", "в Новосибирске", "Отдел продаж и производство: ул. Бориса Богаткова 253/2, оф. 116. Самовывоз или курьер по городу — 385 ₽."],
    ekaterinburg: ["Екатеринбург", "в Екатеринбурге"], kazan: ["Казань", "в Казани"], nizhniy: ["Нижний Новгород", "в Нижнем Новгороде"], krasnodar: ["Краснодар", "в Краснодаре"], samara: ["Самара", "в Самаре"],
    ufa: ["Уфа", "в Уфе", "Пункт выдачи в Уфе: проспект Октября, 113."], rostov: ["Ростов-на-Дону", "в Ростове-на-Дону"], chelyabinsk: ["Челябинск", "в Челябинске"], voronezh: ["Воронеж", "в Воронеже"],
    krasnoyarsk: ["Красноярск", "в Красноярске", "Представительство: проспект Свободный, 57, пом. 81, магазин «Автодруг»."], habarovsk: ["Хабаровск", "в Хабаровске", "Представительство: проспект 60-летия Октября, 148В, магазин «Коврики27.рф»."]
  };
  /* Представительство на странице города (шаблон T6). Мастерскую, установку и цены здесь не пишем: правила, раздел 10 */
  const OFFICE = {
    moskva: { title: "Представительство в Москве", addr: "ул. Полярная, 31А, стр. 1, территория ГПЗ-21", tel: "+7 (495) 777-19-43", lead: "Шьём по заводским лекалам на производстве в Новосибирске и отправляем в Москву транспортной компанией DPD или EMS Почтой России. В Москве работает представительство «Автостиль»." }
  };
  const crumbs = document.getElementById("k-crumbs"), h1 = document.getElementById("k-h1"), lead = document.getElementById("k-lead"), chips = document.getElementById("k-chips"), info = document.getElementById("k-info"), grid = document.getElementById("k-grid"), seo = document.getElementById("k-seo");
  const cKey = A.qs("c"), cityKey = A.qs("city");
  let canon = "";
  const chipLinks = active => Object.entries(C).map(([k, v]) => `<a class="chip${k === active ? " is-selected" : ""}" href="${A.href("collection", { c: k })}">${e(v.t.replace("Чехлы на сиденья ", "").replace("Чехлы ", ""))}</a>`).join("");
  /* SEO-тексты по образцу главной */
  const P = A.SEO_PART, minAll = A.minPrices(A.MODELS);
  const popLinks = POP.map(sl => A.BY_SLUG[sl] && A.FAMILIES[A.BY_SLUG[sl].f]).filter(Boolean).slice(0, 12).map(f => `<a href="${A.URL.fam(f)}">${e(A.brandName(f.b) + " " + f.n)}</a>`).join(", ");
  const colTags = skip => Object.entries(C).filter(([k]) => k !== skip).map(([k, v]) => [v.t, A.href("collection", { c: k })]);
  const cityTags = skip => Object.entries(CITY).filter(([k]) => k !== skip).map(([k, v]) => [`Чехлы на сиденья ${v[1]}`, A.href("collection", { city: k })]);
  const famTags = () => ["toyota-camry", "lada-vesta", "hyundai-solaris", "kia-rio", "lada-granta", "renault-duster", "kia-sportage", "hyundai-creta"].map(id => A.FAMILIES[id]).filter(Boolean).map(f => [`Чехлы на ${A.brandName(f.b)} ${f.n}`, A.URL.fam(f)]);
  const howTo = ["Как заказать", `<p>Выберите марку, модель и поколение кузова в <a href="${A.href("catalog")}">каталоге</a> или введите VIN-номер в строке поиска — по нему определим марку и модельный год. Добавьте комплект в корзину и оформите заказ: менеджер позвонит, уточнит комплектацию салона и подтвердит заказ. Работаем по предоплате от 1 000 ₽, остаток можно оплатить при получении.</p>`];
  /* Цена «от» подборки — из каталога: в текстах C вместо числа {from}, иначе правка цены в админке не дойдёт до страницы */
  const fromOf = c => A.fmt(Math.min(...(c.mat !== undefined ? A.MODELS.map(x => x.p[c.mat]) : A.MODELS.filter(c.filter || (x => (c.fams || []).includes(x.f))).map(x => x.p[0]))));
  const leadOf = c => c.lead.replace("{from}", fromOf(c));
  const cards = (positions, varsFor) => positions.filter(Boolean).map((m, i) => A.coverCard(m, A.VAR[varsFor(i)] || A.VARIANTS[0], { logo: true }));

  if (cityKey && CITY[cityKey]) {
    const [name, where, local] = CITY[cityKey];
    const title = `Чехлы на сиденья ${where}`;
    canon = A.seo({ title: `${title}: модельные авточехлы с доставкой`, description: `Модельные чехлы на сиденья ${where}: комплект на весь салон от ${A.fmt(minAll[0])}, пошив по заводским лекалам, доставка DPD и Почтой России, гарантия на пошив 1 год.`,
      keywords: `чехлы на сиденья ${where}, авточехлы ${name}, купить авточехлы ${where}, модельные авточехлы ${name}`.toLowerCase(), page: "collection", params: { city: cityKey } });
    crumbs.insertAdjacentHTML("beforeend", `<li><a href="${A.href("delivery")}">Доставка</a></li><li>${e(name)}</li>`);
    h1.textContent = title;
    const office = OFFICE[cityKey];
    lead.textContent = (office && office.lead) || local || `Шьём по заводским лекалам вашего автомобиля и отправляем ${where} транспортной компанией DPD или EMS Почтой России. Стоимость доставки — по тарифу транспортной компании.`;
    chips.innerHTML = Object.entries(CITY).map(([k, v]) => `<a class="chip${k === cityKey ? " is-selected" : ""}" href="${A.href("collection", { city: k })}">${e(v[0])}</a>`).join("");
    const box = (b, s) => `<div class="stat"><b style="font-size:1.375rem">${b}</b><span>${s}</span></div>`;
    const officeHtml = office ? `<div class="side__box city-office"><div><p class="side__h">${e(office.title)}</p><p class="city-office__addr">${e(office.addr)}</p><p class="city-office__note">Производство и отдел продаж — в Новосибирске.</p></div><a class="help-cta__tel city-office__tel" href="tel:${office.tel.replace(/[^\d+]/g, "")}">${e(office.tel)}</a><a class="btn btn--ghost" href="${A.href("contacts", {}, "#cmap")}">На карте контактов</a></div>` : "";
    info.innerHTML = `${officeHtml}<div class="stat-row" style="margin-bottom:var(--gap)">${box("2009", "шьём чехлы на своём производстве") + box("от 250 ₽", "доставка по тарифу транспортной компании") + box("от 1 000 ₽", "предоплата, остаток — при получении, где доступно") + box("1 год", "гарантия на качество пошива")}</div>`;
    grid.innerHTML = cards(POP.slice(0, 10).map(s => A.BY_SLUG[s]), i => ["perf-grey-h", "rhomb-grey", "alc-rhomb-grey", "perf-red-h", "alc-rhomb-full"][i % 5]).join("") + A.customCard(null);
    seo.innerHTML = A.seoBlock({
      h2: `Чехлы на сиденья ${e(where)}`,
      intro: `<p>«Автостиль» с 2009 года шьёт модельные чехлы на сиденья на собственном производстве в Новосибирске и отправляет готовые комплекты ${e(where)}. Для каждого поколения и варианта салона — своя выкройка, поэтому чехлы повторяют контуры сидений и не собираются гармошкой.${local ? " " + e(local) : ""}</p>`,
      parts: [
        [`Доставка ${e(where)}`, `<p>${cityKey === "novosibirsk" ? "В Новосибирске заказ можно забрать самовывозом или заказать курьера по городу — 385 ₽. " : ""}Отправляем ${e(where)} транспортной компанией DPD или EMS Почтой России, стоимость — по тарифу транспортной компании, от 250 ₽, заказы от 20 000 ₽ доставляем бесплатно. Перед отправкой присылаем фотоотчёт.${cityKey !== "novosibirsk" && !office ? ` Установку чехлов в вашем городе <a href="${A.href("ustanovka")}">организуем по запросу</a> — найдём установщика.` : ""}</p>`],
        howTo,
        ["Популярные модели", `<p>Популярные модели в каталоге: ${popLinks}. Полный список — в <a href="${A.href("catalog")}">каталоге по маркам</a>.</p>`],
        P.materials(""),
        P.prices("", minAll),
        P.custom(""),
        P.service({ install: !office })
      ],
      tags: cityTags(cityKey).concat(famTags())
    });
  } else if (cKey && C[cKey]) {
    const c = C[cKey];
    /* маска T5: «Чехлы на сиденья из {материала}: модельные авточехлы, цена от …» */
    const from = fromOf(c);
    const st = `${c.st || c.t}: модельные авточехлы, цена от ${from}`;
    canon = A.seo({ title: st.length > 70 ? `${c.st || c.t}, цена от ${from}` : st, description: (c.d || c.lead).replace("{from}", from), keywords: c.kw || "", page: "collection", params: { c: cKey },
      /* без единой карточки (нет фото для материала) страницу не индексируем; в sitemap её тоже нет — bitrix/build.py */
      noindex: !(c.vars || A.VARIANTS.filter(v => c.mat === undefined || v.mat === c.mat)).length });
    crumbs.insertAdjacentHTML("beforeend", `<li><a href="${A.href("collection")}">Подборки</a></li><li>${e(c.t)}</li>`);
    h1.textContent = c.t; lead.textContent = leadOf(c); chips.innerHTML = chipLinks(cKey);
    let positions = c.fams ? c.fams.map(firstOf) : c.filter ? A.MODELS.filter(c.filter).slice(0, 16) : POP.map(s => A.BY_SLUG[s]);
    const vars = c.vars || A.VARIANTS.filter(v => c.mat === undefined || v.mat === c.mat).map(v => v.id);
    const list = vars.length ? cards(positions, i => vars[i % vars.length]) : [];
    list.push(A.customCard(null));
    grid.innerHTML = list.join("") || '<div class="empty">Подборка пополняется</div>';
    const inList = positions.filter(Boolean).slice(0, 16).map(m => `<a href="${A.URL.pos(m)}">${e(A.carName(m))}</a>`).join(", ");
    seo.innerHTML = A.seoBlock({
      h2: e(c.t),
      intro: `<p>${e(leadOf(c))} Все комплекты шьются на собственном производстве в Новосибирске по заводским лекалам конкретного поколения и варианта салона: чехлы повторяют контуры сидений, учитывают подлокотник, подголовники и подушки безопасности, не пузырятся и не собираются гармошкой.</p>`,
      parts: [
        ["Для каких автомобилей", `<p>В подборке — ${inList}. Не нашли свою модель? Выберите её в <a href="${A.href("catalog")}">каталоге по маркам</a> или введите VIN-номер в строке поиска.</p>`],
        P.materials(""),
        P.prices("", minAll),
        howTo,
        P.custom(""),
        P.service()
      ],
      tags: colTags(cKey).concat(famTags()).concat(cityTags("").slice(0, 6))
    });
  } else {
    canon = A.seo({ title: "Подборки чехлов на сиденья: по материалу, типу авто и городу", description: "Подборки модельных чехлов на сиденья: экокожа, перфорация, алькантара, жаккард, для кроссоверов и 7-местных автомобилей, недорогие комплекты. Доставка по России.",
      keywords: "чехлы на сиденья экокожа, чехлы из алькантары, авточехлы жаккард, чехлы для кроссоверов, недорогие чехлы на сиденья", page: "collection", noindex: !!(cKey || cityKey) });
    crumbs.insertAdjacentHTML("beforeend", "<li>Подборки</li>");
    h1.textContent = "Подборки чехлов"; lead.textContent = "Комплекты, сгруппированные по материалу и типу автомобиля. Выберите подборку или сразу свою модель в каталоге.";
    chips.innerHTML = ""; grid.innerHTML = A.customCard(null); info.innerHTML = `<div class="guides" style="margin-bottom:var(--gap)">${Object.entries(C).map(([k, v]) => `<a class="guide" href="${A.href("collection", { c: k })}"><b>${e(v.t)}</b><p>${e(leadOf(v))}</p><span class="link">Смотреть</span></a>`).join("")}</div>`;
    seo.innerHTML = A.seoBlock({
      h2: "Подборки модельных чехлов на сиденья",
      intro: `<p>Подборки помогают быстро найти комплект: по материалу вставок, типу автомобиля или городу доставки. Все чехлы «Автостиль» шьются на собственном производстве в Новосибирске по заводским лекалам конкретного поколения и варианта салона.</p>`,
      parts: [
        ["Подборки по материалу и типу автомобиля", `<ul>${Object.entries(C).map(([k, v]) => `<li><a href="${A.href("collection", { c: k })}">${e(v.t)}</a></li>`).join("")}</ul>`],
        ["Доставка по городам", `<p>${Object.entries(CITY).map(([k, v]) => `<a href="${A.href("collection", { city: k })}">Чехлы на сиденья ${e(v[1])}</a>`).join(", ")}. Отправляем DPD и EMS Почтой России в 6 000 населённых пунктов России и СНГ.</p>`],
        P.materials(""),
        P.prices("", minAll),
        P.custom(""),
        P.service()
      ],
      tags: colTags("").concat(famTags())
    });
  }
  /* Разметка: хлебные крошки — из #k-crumbs, последний пункт — сама страница */
  const ld = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [...crumbs.querySelectorAll("li")].map((li, i) => {
    const a = li.querySelector("a");
    return { "@type": "ListItem", position: i + 1, name: li.textContent.trim(), item: a ? A.abs(a.getAttribute("href")) : canon };
  }) };
  document.head.insertAdjacentHTML("beforeend", `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`);
  A.badges();
})();
