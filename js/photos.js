/* Фотогалерея [data-photos]: лента «Наши чехлы» (partials/our-photos.html — «О компании», главная, «Индивидуальный пошив») и фото в статьях блога.
   Лента листается стрелками и пальцем, нажатие на фото открывает просмотр на весь экран с приближением — то же окно, что у фото товара (AS.viewer в app.js) */
(function () {
  const A = window.AS, $ = A.$, $$ = A.$$;

  $$("[data-photos]").forEach(box => {
    const rail = $("[data-photos-rail]", box), prev = $("[data-photos-prev]", box), next = $("[data-photos-next]", box);
    const figs = rail ? $$(".photo", rail) : [];
    if (!figs.length) return;

    /* лента: стрелки листают на ширину видимых карточек, на краях гаснут */
    const gap = () => parseFloat(getComputedStyle(rail).columnGap) || 0;
    const step = () => figs[0].getBoundingClientRect().width + gap();
    /* N карточек и N−1 промежутков = ширина ленты, поэтому делим (ширина + промежуток) на шаг */
    const page = dir => rail.scrollBy({ left: dir * Math.max(1, Math.floor((rail.clientWidth + gap() + 2) / step())) * step(), behavior: "smooth" });
    const sync = () => { if (!prev) return; prev.disabled = rail.scrollLeft < 4; next.disabled = rail.scrollLeft + rail.clientWidth > rail.scrollWidth - 4; };
    prev && prev.addEventListener("click", () => page(-1));
    next && next.addEventListener("click", () => page(1));
    rail.addEventListener("scroll", sync, { passive: true });
    addEventListener("resize", sync);
    sync();

    /* просмотр на весь экран: после закрытия лента стоит на последнем просмотренном фото */
    const list = () => figs.map(f => { const img = $("img", f); return { src: img.currentSrc || img.src, cap: ($("figcaption", f) || {}).textContent || "" }; });
    const back = i => {
      rail.scrollTo({ left: figs[i].offsetLeft - figs[0].offsetLeft, behavior: "instant" });
      $(".photo__btn", figs[i]).focus({ preventScroll: true });
    };
    figs.forEach((f, i) => $(".photo__btn", f).addEventListener("click", () => A.viewer(list(), i, back, { label: box.dataset.photos || "Фото наших работ", cls: "lightbox--photos" })));
  });
})();
