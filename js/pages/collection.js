/* Подборки (SEO-посадочные): ?c=материал/тип авто, ?city=город, без параметров — список подборок */
(function () {
  const A = window.AS, e = A.esc;
  const POP = ["toyota_camry-xv70", "lada_vesta", "hyundai_solaris-2", "kia_rio-iv", "renault_duster", "toyota_rav4-new", "hyundai_creta", "kia_sportageiv-re", "lada_granta-re", "volkswagen_polo", "lada_largus5m", "skoda_octavia-a-7", "nissan_qashqai-new2014", "mitsubishi_outlander-3", "haval_jolion", "kia_seltos"];
  const firstOf = fam => (A.FAMILIES[fam] || {}).items?.[0];
  const C = {
    eco: { t: "Чехлы на сиденья из экокожи", lead: "Самый популярный материал: не боится воды и грязи, протирается салфеткой, выглядит как кожаный салон. 12 цветов, комплект на весь салон от 9 375 ₽, пошив за 1 день.", mat: 1 },
    alcantara: { t: "Чехлы на сиденья из алькантары", lead: "Экокожа на боковинах и бархатные вставки из алькантары со строчкой «ромб». Не греются летом, не скользят, тёплые зимой. От 9 975 ₽ за комплект.", mat: 2 },
    jacquard: { t: "Чехлы на сиденья из жаккарда", lead: "Плотная автомобильная ткань с рельефом: дышит, не электризуется, самая доступная цена. Комплект на весь салон от 7 975 ₽.", mat: 0 },
    romb: { t: "Чехлы на сиденья со строчкой ромб", lead: "Ромб на центральных вставках делает салон визуально дороже — как после перетяжки. Готовые варианты с алькантарой или любой цвет в конструкторе.", vars: ["alc-grey", "alc-black", "alc-brown"] },
    suv: { t: "Чехлы на сиденья для кроссоверов и внедорожников", lead: "Лекала под высокие сиденья с развитой боковой поддержкой: RAV4, Sportage, Creta, Duster, Qashqai, Outlander, Jolion и другие.", fams: ["toyota-rav4", "kia-sportage", "hyundai-creta", "renault-duster", "nissan-qashqai", "mitsubishi-outlander", "haval-jolion", "kia-seltos", "hyundai-tucson", "volkswagen-tiguan", "nissan-x-trail", "mazda-cx-5", "uaz-patriot", "chevrolet-niva", "lada-niva-travel", "skoda-yeti"] },
    mpv: { t: "Чехлы для 7-местных автомобилей и минивэнов", lead: "Комплекты на три ряда сидений: третий ряд шьётся по отдельному лекалу. Ларгус, Орландо, Аутлендер XL и другие 7-местные версии.", filter: m => /7\s*мест/i.test([m.m, m.g, m.v].join(" ")) },
    taxi: { t: "Чехлы на сиденья для такси", lead: "Износостойкие комплекты для машин, которые работают по 12 часов в день: экокожа и жаккард, усиленные швы, быстрая замена. Для таксопарков — опт и тестовый комплект.", fams: ["kia-rio", "hyundai-solaris", "skoda-octavia", "volkswagen-polo", "toyota-camry", "lada-vesta", "lada-largus", "renault-logan", "kia-optima", "lada-granta", "hyundai-elantra", "toyota-corolla"], vars: ["eco-black", "jac-black", "eco-grey"] },
    budget: { t: "Недорогие чехлы на сиденья до 8 000 ₽", lead: "Готовые комплекты из жаккарда на весь салон по лекалам вашей модели. Та же посадка и молнии под Airbag, что у дорогих материалов.", mat: 0 }
  };
  const CITY = {
    moskva: ["Москва", "в Москве", 0], spb: ["Санкт-Петербург", "в Санкт-Петербурге", 2], novosibirsk: ["Новосибирск", "в Новосибирске", 5], ekaterinburg: ["Екатеринбург", "в Екатеринбурге", 3], kazan: ["Казань", "в Казани", 2],
    nizhniy: ["Нижний Новгород", "в Нижнем Новгороде", 2], krasnodar: ["Краснодар", "в Краснодаре", 3], samara: ["Самара", "в Самаре", 3], ufa: ["Уфа", "в Уфе", 3], rostov: ["Ростов-на-Дону", "в Ростове-на-Дону", 3],
    chelyabinsk: ["Челябинск", "в Челябинске", 4], voronezh: ["Воронеж", "в Воронеже", 2], krasnoyarsk: ["Красноярск", "в Красноярске", 6], habarovsk: ["Хабаровск", "в Хабаровске", 4]
  };
  const crumbs = document.getElementById("k-crumbs"), h1 = document.getElementById("k-h1"), lead = document.getElementById("k-lead"), chips = document.getElementById("k-chips"), info = document.getElementById("k-info"), grid = document.getElementById("k-grid"), seo = document.getElementById("k-seo");
  const cKey = A.qs("c"), cityKey = A.qs("city");
  const setMeta = (title, desc) => { document.title = title + " | Автостиль"; document.querySelector('meta[name="description"]').content = desc; };
  const chipLinks = active => Object.entries(C).map(([k, v]) => `<a class="chip${k === active ? " is-selected" : ""}" href="collection.html?c=${k}">${e(v.t.replace("Чехлы на сиденья ", "").replace("Чехлы ", ""))}</a>`).join("");
  const cards = (positions, varsFor) => positions.filter(Boolean).map((m, i) => A.coverCard(m, A.VAR[varsFor(i)] || A.VARIANTS[0], { logo: true }));

  if (cityKey && CITY[cityKey]) {
    const [name, where, days] = CITY[cityKey], moscow = cityKey === "moskva";
    const title = moscow ? "Чехлы на сиденья в Москве: пошив и установка" : `Чехлы на сиденья ${where} с доставкой`;
    setMeta(title, `Модельные чехлы на сиденья ${where}: 485 лекал, готовые комплекты от 7 975 ₽, пошив за 1 день, ${moscow ? "самовывоз и установка на Полярной" : "доставка СДЭК за " + days + "–" + (days + 2) + " дня"}, оплата при получении.`);
    document.querySelector('link[rel="canonical"]').href = moscow ? "https://1avtochehol.ru/moskva/" : `https://1avtochehol.ru/dostavka/${cityKey}/`;
    crumbs.insertAdjacentHTML("beforeend", `<li><a href="delivery.html">Доставка</a></li><li>${e(name)}</li>`);
    h1.textContent = title;
    lead.textContent = moscow ? "Цех на улице Полярной: снимаем лекала, шьём и устанавливаем. Готовый комплект можно забрать в день пошива и сразу поставить в мастерской." : `Шьём по лекалам вашего автомобиля и отправляем ${where.replace("в ", "в ")} СДЭК или Boxberry. Оплата при получении, примерка в пункте выдачи.`;
    chips.innerHTML = Object.entries(CITY).map(([k, v]) => `<a class="chip${k === cityKey ? " is-selected" : ""}" href="collection.html?city=${k}">${e(v[0])}</a>`).join("");
    const box = (b, s) => `<div class="stat"><b style="font-size:1.375rem">${b}</b><span>${s}</span></div>`;
    info.innerHTML = `<div class="stat-row" style="margin-bottom:var(--gap)">${moscow ? box("в день пошива", "самовывоз с ул. Полярной") + box("1,5 часа", "установка в мастерской, 2 500 ₽") + box("на следующий день", "курьер по Москве, 300 ₽") + box("2 недели", "снимем лекало с вашей машины") : box(days + "–" + (days + 2) + " дня", "доставка после пошива") + box("от 350 ₽", "до пункта выдачи, от 10 000 ₽ — бесплатно") + box("при получении", "оплата после примерки") + box("1 день", "пошив готового комплекта")}</div>`;
    grid.innerHTML = cards(POP.slice(0, 10).map(s => A.BY_SLUG[s]), i => ["eco-black", "eco-beige", "alc-grey", "eco-grey", "jac-black"][i % 5]).join("") + A.customCard(null, true);
    seo.innerHTML = `<h2>Чехлы на сиденья ${e(where)}</h2><p>Автостиль шьёт модельные чехлы по лекалам с реальных сидений: 485 лекал на 41 марку. ${moscow ? "Производство находится в Москве на улице Полярной — здесь же можно забрать заказ и установить чехлы." : `Доставка ${e(where)} занимает ${days}–${days + 2} дня после пошива, оплата при получении.`}</p><p>Готовые комплекты — от 7 975 ₽ за весь салон, индивидуальный дизайн в конструкторе — 3 дня.</p>`;
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
    seo.innerHTML = `<h2>${e(c.t)}</h2><p>${e(c.lead)}</p><p>Все комплекты шьются по лекалам конкретного поколения и варианта салона: чехлы повторяют форму сидений, учитывают подлокотник, подголовники и подушки безопасности. Доставка по России, установка в Москве.</p>`;
  } else {
    setMeta("Подборки чехлов на сиденья: по материалу, типу авто и городу", "Подборки модельных чехлов: экокожа, алькантара, жаккард, ромб, для кроссоверов, 7-местных авто и такси. Доставка в 6 000 городов.");
    crumbs.insertAdjacentHTML("beforeend", "<li>Подборки</li>");
    h1.textContent = "Подборки чехлов"; lead.textContent = "Готовые комплекты, сгруппированные по материалу, типу автомобиля и задаче. Выберите подборку или сразу свою модель в каталоге.";
    chips.innerHTML = ""; info.innerHTML = `<div class="guides" style="margin-bottom:var(--gap)">${Object.entries(C).map(([k, v]) => `<a class="guide" href="collection.html?c=${k}"><b>${e(v.t)}</b><p>${e(v.lead)}</p><span class="link">Смотреть ${A.ICON.arrow}</span></a>`).join("")}</div>`;
    seo.innerHTML = `<h2>Доставка по городам</h2><p>${Object.entries(CITY).map(([k, v]) => `<a href="collection.html?city=${k}">Чехлы на сиденья ${e(v[1])}</a>`).join(" · ")}</p>`;
  }
  A.badges();
})();
