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
  function render() {
    const t = norm(q.value.trim());
    let list = fams.filter(f => !t || norm(f.n).includes(t) || f.items.some(m => norm([m.g, m.v, m.ru].join(" ")).includes(t)));
    if (sort.value === "new") list = list.slice().sort((x, y) => (y.from || 0) - (x.from || 0) || y.items[0].yr - x.items[0].yr);
    else if (sort.value === "count") list = list.slice().sort((x, y) => y.items.length - x.items.length);
    cnt.textContent = `${list.length} из ${fams.length}`;
    box.innerHTML = list.map(A.famCard).join("") || `<div class="empty">Модель не найдена. <a class="link" href="custom.html">Закажите индивидуальный пошив</a> — снимем лекало.</div>`;
  }
  q.addEventListener("input", render); sort.addEventListener("change", render); render();
  document.getElementById("b-custom").innerHTML = A.customCard(null, true);
  document.getElementById("b-seo").innerHTML = `<h2>Чехлы на сиденья ${A.esc(b.n)} от производителя</h2><p>Автостиль шьёт модельные чехлы на ${fams.length} ${A.plural(fams.length, "модель", "модели", "моделей")} ${A.esc(b.n)}: ${fams.slice(0, 10).map(f => A.esc(f.n)).join(", ")}${fams.length > 10 ? " и другие" : ""}. Для каждого поколения и варианта салона — своё заводское лекало.</p><p>Комплекты из жаккарда, экокожи и алькантары — от ${A.fmt(min)} за весь салон. Своё сочетание цветов можно собрать в конструкторе. Доставка в 6 000 населённых пунктов России и СНГ.</p>`;
})();
