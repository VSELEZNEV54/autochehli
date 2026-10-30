/* Информация для клиентов: поиск по плашкам (заголовок, текст, ключевые слова data-k) и статьям блога */
(function () {
  const A = window.AS;
  const q = document.querySelector("[data-info-q]"), grid = document.querySelector("[data-info-guides]");
  if (!q || !grid) return;
  const status = document.querySelector("[data-info-status]"), postsBox = document.querySelector("[data-info-posts]");
  const guides = [...grid.querySelectorAll(".guide")];
  const norm = s => String(s || "").toLowerCase().replace(/ё/g, "е");
  /* служебные слова и «чехлы» не ищем — они есть почти везде */
  const STOP = new Set(["для", "как", "что", "про", "мой", "моя", "мои", "наш", "ваш", "где", "или", "это"]), STOP_ROOT = /^(чехл|чехол|авточехл)/;
  const stems = query => norm(query).split(/[^a-zа-я0-9]+/).filter(w => w.length > 2 && !STOP.has(w) && !STOP_ROOT.test(w)).map(w => (w.length > 5 ? w.slice(0, w.length - 2) : w));
  const score = (text, st) => st.reduce((n, s) => n + (text.includes(s) ? 1 : 0), 0);
  const guideText = g => norm(g.textContent + " " + g.dataset.k);
  const posts = window.AS_POSTS || [];
  function run() {
    const st = stems(q.value);
    document.querySelectorAll("[data-info-chip]").forEach(c => c.classList.toggle("is-selected", norm(c.textContent) === norm(q.value.trim())));
    if (!st.length) {
      guides.forEach(g => { g.hidden = false; g.style.order = ""; });
      grid.classList.remove("is-search"); status.hidden = true; postsBox.hidden = true; return;
    }
    let found = 0;
    guides.forEach(g => { const s = score(guideText(g), st); g.hidden = !s; g.style.order = s ? String(10 - s) : ""; if (s) found++; });
    grid.classList.add("is-search");
    const hit = posts.map(p => ({ p, s: score(norm([p.title, p.lead, p.tag].join(" ")), st) })).filter(x => x.s).sort((a, b) => b.s - a.s).slice(0, 3);
    postsBox.hidden = !hit.length;
    postsBox.querySelector(".posts").innerHTML = hit.map(x => window.AS_postCard(x.p)).join("");
    status.hidden = false;
    status.innerHTML = found || hit.length
      ? `Найдено: ${found} ${A.plural(found, "материал", "материала", "материалов")}${hit.length ? ` и ${hit.length} ${A.plural(hit.length, "статья", "статьи", "статей")} в блоге` : ""}`
      : `Ничего не нашли по запросу «${A.esc(q.value.trim())}». <a href="#ask">Задайте вопрос</a> — ответим в рабочее время.`;
  }
  q.addEventListener("input", run);
  document.querySelectorAll("[data-info-chip]").forEach(c => c.addEventListener("click", () => { q.value = c.classList.contains("is-selected") ? "" : c.textContent; run(); }));
  const pre = A.qs("q"); if (pre) { q.value = pre; run(); }
})();
