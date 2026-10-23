/* Фотогалерея [data-photos]: лента «Наши чехлы» на «О компании» и фото в статьях блога — листание и просмотр на весь экран */
(function () {
  const A = window.AS, $ = A.$, $$ = A.$$;
  const ICO = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;

  $$("[data-photos]").forEach(box => {
    const rail = $("[data-photos-rail]", box), prev = $("[data-photos-prev]", box), next = $("[data-photos-next]", box);
    const figs = $$(".photo", rail);
    if (!rail || !figs.length) return;

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

    /* просмотр на весь экран */
    const lb = document.createElement("div");
    lb.className = "lightbox";
    lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true"); lb.setAttribute("aria-label", "Наши чехлы");
    lb.innerHTML = `<button type="button" class="lightbox__close" aria-label="Закрыть">${ICO("M6 6l12 12M18 6 6 18")}</button>
      <button type="button" class="lightbox__prev" aria-label="Предыдущее фото">${ICO("M15 6l-6 6 6 6")}</button>
      <figure class="lightbox__fig"><img alt=""><figcaption><span class="lightbox__cap"></span><span class="lightbox__count"></span></figcaption></figure>
      <button type="button" class="lightbox__next" aria-label="Следующее фото">${ICO("M9 6l6 6-6 6")}</button>`;
    document.body.appendChild(lb);
    const big = $("img", lb);
    let cur = 0;
    const show = i => {
      cur = (i + figs.length) % figs.length;
      const img = $("img", figs[cur]);
      big.src = img.currentSrc || img.src; big.alt = img.alt;
      $(".lightbox__cap", lb).textContent = $("figcaption", figs[cur]).textContent;
      $(".lightbox__count", lb).textContent = `${cur + 1} / ${figs.length}`;
    };
    const open = i => { show(i); lb.classList.add("is-open"); document.body.style.overflow = "hidden"; $(".lightbox__close", lb).focus(); };
    const close = () => {
      if (!lb.classList.contains("is-open")) return;
      lb.classList.remove("is-open"); document.body.style.overflow = "";
      rail.scrollTo({ left: figs[cur].offsetLeft - figs[0].offsetLeft, behavior: "instant" });
      $(".photo__btn", figs[cur]).focus({ preventScroll: true });
    };
    figs.forEach((f, i) => $(".photo__btn", f).addEventListener("click", () => open(i)));
    $(".lightbox__close", lb).addEventListener("click", close);
    $(".lightbox__prev", lb).addEventListener("click", () => show(cur - 1));
    $(".lightbox__next", lb).addEventListener("click", () => show(cur + 1));
    lb.addEventListener("click", e => { if (e.target === lb) close(); });
    document.addEventListener("keydown", e => {
      if (!lb.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(cur - 1);
      else if (e.key === "ArrowRight") show(cur + 1);
    });
    let x0 = null;
    lb.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) show(dx < 0 ? cur + 1 : cur - 1); x0 = null; });
  });
})();
