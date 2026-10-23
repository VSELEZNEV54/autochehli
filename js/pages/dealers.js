/* Дилерам: каталог базовых решений — те же «Чехлы на популярные модели», что на главной */
(function () {
  const A = window.AS;
  const box = document.getElementById("dealer-hits");
  if (box) box.innerHTML = A.HITS.filter(([s, v]) => A.BY_SLUG[s] && A.VAR[v]).map(([s, v]) => A.coverCard(A.BY_SLUG[s], A.VAR[v], { logo: true })).join("");
  A.badges();
})();
