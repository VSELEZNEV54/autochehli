/* Отзывы (шаблон T12): опубликованные отзывы из Битрикса (js/reviews.js), фильтр по марке, «Показать ещё».
   Из адреса: ?b=toyota — марка (со страницы марки), ?f=honda-fit — модель (со страницы модели, если отзывов больше шести) */
(function () {
  const A = window.AS, e = A.esc, ALL = window.AS_REVIEWS || [], PAGE = 24;
  const box = document.getElementById("rv-list"), chips = document.getElementById("rv-brands"), more = document.getElementById("rv-more");
  const count = {};
  ALL.forEach(r => { if (A.BRAND[r.b]) count[r.b] = (count[r.b] || 0) + 1; });
  const brands = Object.keys(count).sort((a, b) => count[b] - count[a] || A.brandName(a).localeCompare(A.brandName(b)));
  const fam = A.FAMILIES[A.qs("f")], famN = fam ? ALL.filter(r => r.f === fam.id).length : 0;
  /* выбранный фильтр: "" — все, "toyota" — марка, "f:honda-fit" — модель */
  let sel = famN ? "f:" + fam.id : count[A.qs("b")] ? A.qs("b") : "", shown = PAGE;
  chips.innerHTML = [["", "Все", ALL.length]].concat(famN ? [["f:" + fam.id, A.brandName(fam.b) + " " + fam.n, famN]] : [])
    .concat(brands.map(id => [id, A.brandName(id), count[id]]))
    .map(([id, n, c]) => `<button type="button" class="chip" data-rf="${id}">${e(n)} <small>${c}</small></button>`).join("");

  function render() {
    const list = ALL.filter(r => !sel || (sel.startsWith("f:") ? r.f === sel.slice(2) : r.b === sel)), rest = list.length - shown;
    box.innerHTML = list.slice(0, shown).map(r => A.reviewCard(r)).join("");
    more.innerHTML = rest > 0 ? `<button type="button" class="btn btn--ghost">Показать ещё ${Math.min(PAGE, rest)}</button>` : "";
    chips.querySelectorAll("[data-rf]").forEach(c => c.classList.toggle("is-selected", c.dataset.rf === sel));
  }
  chips.addEventListener("click", ev => {
    const c = ev.target.closest("[data-rf]");
    if (!c) return;
    sel = c.dataset.rf; shown = PAGE;
    history.replaceState(null, "", A.href("reviews", sel.startsWith("f:") ? { f: sel.slice(2) } : { b: sel }));
    render();
  });
  more.addEventListener("click", ev => { if (!ev.target.closest(".btn")) return; shown += PAGE; render(); });
  render();
})();
