/* Каталог: все марки, фильтр по букве и поиску (марки и модели) */
(function () {
  const A = window.AS, brands = A.BRANDS.slice().sort((a, b) => a.id.localeCompare(b.id)), L = b => b.id[0].toUpperCase();
  const box = document.getElementById("cat-brands"), fams = document.getElementById("cat-fams"), q = document.getElementById("cat-q"), alpha = document.getElementById("cat-alpha");
  const letters = [...new Set(brands.map(L))];
  alpha.innerHTML = `<button type="button" class="is-active" data-l="">Все</button>` + letters.map(l => `<button type="button" data-l="${l}">${l}</button>`).join("");
  let letter = "";
  const norm = s => s.toLowerCase().replace(/ё/g, "е");
  function render() {
    const t = norm(q.value.trim());
    const list = brands.filter(b => (!letter || L(b) === letter) && (!t || norm(b.n).includes(t) || norm(b.s).split(" ").some(x => x.startsWith(t))));
    box.innerHTML = list.map(b => `<a class="brand" href="${A.URL.brand(b.id)}"><img src="${A.brandLogo(b.id)}" alt="Логотип ${A.esc(b.n)}" loading="lazy" width="52" height="52"><span>${A.esc(b.n)}</span><small>${b.fams.length} ${A.plural(b.fams.length, "модель", "модели", "моделей")}</small></a>`).join("");
    const famList = t.length >= 2 ? Object.values(A.FAMILIES).filter(f => norm(f.n).includes(t) || (f.items[0].ru && norm(f.items[0].ru).includes(t))).slice(0, 12) : [];
    fams.hidden = !famList.length;
    fams.innerHTML = famList.map(A.famCard).join("");
    if (!list.length && !famList.length) box.innerHTML = `<div class="empty">Ничего не нашли. Попробуйте другое написание или <a class="link" href="custom.html">закажите индивидуальный пошив</a> — снимем лекало с вашего авто.</div>`;
  }
  q.addEventListener("input", render);
  alpha.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; letter = b.dataset.l; alpha.querySelectorAll("button").forEach(x => x.classList.toggle("is-active", x === b)); render(); });
  render();
  const pop = ["toyota-camry", "lada-vesta", "hyundai-solaris", "kia-rio", "renault-duster", "lada-granta", "kia-sportage", "hyundai-creta", "volkswagen-polo", "skoda-octavia", "nissan-qashqai", "mitsubishi-outlander"];
  document.getElementById("cat-popular").innerHTML = pop.map(id => A.FAMILIES[id]).filter(Boolean).map(A.famCard).join("");
  document.getElementById("cat-custom").innerHTML = A.customCard(null, true);
})();
