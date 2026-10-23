/* Подтверждение опасных действий и копирование ссылок (inline-скрипты запрещены политикой CSP) */
document.addEventListener("submit", e => {
  const msg = e.target.dataset.confirm;
  if (msg && !confirm(msg)) e.preventDefault();
});
document.addEventListener("click", e => {
  const b = e.target.closest("[data-copy]");
  if (!b) return;
  navigator.clipboard.writeText(b.dataset.copy).then(() => { const t = b.textContent; b.textContent = "Скопировано"; setTimeout(() => b.textContent = t, 1500); });
});
document.addEventListener("change", e => { if (e.target.matches("[data-autosubmit]")) e.target.form.submit(); });
