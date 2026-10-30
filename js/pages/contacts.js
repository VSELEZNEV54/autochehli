/* Контакты: Яндекс.Карта на весь экран. Точки берутся из разметки ([data-pt] с data-c), координаты — со старой страницы 1avtochehol.ru/contact/.
   Новосибирск — отдел продаж и производство, остальные города — представительства */
(function () {
  const box = document.getElementById("cmap");
  if (!box) return;
  const e = window.AS.esc;
  const pts = [...document.querySelectorAll("[data-pt]")];
  const allBtn = document.querySelector("[data-map-all]");
  const card = document.querySelector(".cmap__card");
  const wide = () => matchMedia("(min-width: 1101px)").matches;
  const touch = matchMedia("(hover: none)").matches;
  let map, marks = [];

  const fail = () => { const l = box.querySelector(".cmap__load"); if (l) l.textContent = "Карта не загрузилась. Все адреса — в списке ниже."; };

  function load(cb) {
    if (window.ymaps) return ymaps.ready(cb);
    const s = document.createElement("script");
    s.src = "https://api-maps.yandex.ru/2.1/?lang=ru_RU";
    s.onload = () => window.ymaps ? ymaps.ready(cb) : fail();
    s.onerror = fail;
    document.head.appendChild(s);
  }

  /* Отступы [сверху, справа, снизу, слева]: на десктопе карточка контактов закрывает левую часть карты */
  function margins() {
    if (!wide() || !card) return [36, 36, 36, 36];
    return [56, 56, 56, card.getBoundingClientRect().right - box.getBoundingClientRect().left + 48];
  }

  function setActive(i) {
    pts.forEach((b, j) => b.classList.toggle("is-active", j === i));
    allBtn.hidden = i < 0;
  }

  function showAll() {
    map.balloon.close();
    map.setBounds(map.geoObjects.getBounds(), { checkZoomRange: true, zoomMargin: margins() });
    setActive(-1);
  }

  function focus(i) {
    const c = marks[i].geometry.getCoordinates(), zoom = 15, m = margins();
    const proj = map.options.get("projection");
    const px = proj.toGlobalPixels(c, zoom);
    const center = proj.fromGlobalPixels([px[0] - (m[3] - m[1]) / 2, px[1] - 60], zoom);
    map.setCenter(center, zoom, { duration: 450 }).then(() => marks[i].balloon.open());
    setActive(i);
  }

  load(function () {
    box.querySelector(".cmap__load")?.remove();
    map = new ymaps.Map(box, { center: [55.83, 85], zoom: 3, controls: [] }, { suppressMapOpenBlock: true, yandexMapDisablePoiInteractivity: true, avoidFractionalZoom: false });
    map.controls.add("zoomControl", { size: "small", position: { right: 16, top: 72 } });
    map.behaviors.disable("scrollZoom");
    if (touch) map.behaviors.disable("drag");

    const Pin = ymaps.templateLayoutFactory.createClass('<div class="ypin {{ properties.cls }}"></div>');
    pts.forEach((b, i) => {
      const d = b.dataset, hq = "hq" in d, c = d.c.split(",").map(Number);
      const addr = b.textContent.trim(), full = addr.startsWith(d.city) ? addr : `${d.city}, ${addr}`;
      const tel = d.tel ? `<a href="tel:${d.tel.replace(/[^\d+]/g, "")}">${e(d.tel)}</a><br>` : "";
      const pm = new ymaps.Placemark(c, {
        cls: hq ? "ypin--hq" : "",
        hintContent: d.title,
        balloonContentHeader: e(d.title),
        balloonContentBody: `<div class="yballoon">${e(full)}<br>${tel}<a href="https://yandex.ru/maps/?rtext=~${c.join(",")}&rtt=auto" target="_blank" rel="noopener">Построить маршрут</a></div>`
      }, {
        iconLayout: Pin,
        iconShape: { type: "Circle", coordinates: [0, 0], radius: hq ? 19 : 12 },
        zIndex: hq ? 800 : 700, zIndexHover: 900,
        balloonOffset: [0, hq ? -18 : -10],
        balloonAutoPanMargin: margins()
      });
      pm.events.add("click", () => setActive(i));
      pm.balloon.events.add("close", () => { if (pts[i].classList.contains("is-active")) setActive(-1); });
      map.geoObjects.add(pm);
      marks.push(pm);
    });
    showAll();

    pts.forEach((b, i) => b.addEventListener("click", () => {
      const top = box.getBoundingClientRect().top + scrollY - (parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 0);
      if (Math.abs(scrollY - top) > 4) scrollTo({ top, behavior: "smooth" });
      focus(i);
    }));
    allBtn.addEventListener("click", showAll);
    let t; addEventListener("resize", () => { clearTimeout(t); t = setTimeout(() => { map.container.fitToViewport(); if (allBtn.hidden) showAll(); }, 200); });
  });
})();
