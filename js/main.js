/* ==========================================================
   main.js — спільна логіка для всіх сторінок:
   мобільне меню та рік у підвалі.
   Підключається після i18n.js (обидва з атрибутом defer).
   ========================================================== */
(function () {
  "use strict";

  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");

  /* ---------- Мобільне меню ---------- */
  // Підпис кнопки береться з i18n.js (ключі nav.openMenu / nav.closeMenu)
  function updateToggleLabel() {
    if (!toggle) return;
    var open = toggle.getAttribute("aria-expanded") === "true";
    var key = open ? "nav.closeMenu" : "nav.openMenu";
    if (window.I18n) toggle.setAttribute("aria-label", window.I18n.t(key));
  }

  function setMenu(open) {
    if (!toggle || !nav) return;
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    updateToggleLabel();
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });

    // Закриття по клавіші Esc
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        setMenu(false);
        toggle.focus();
      }
    });

    // Закриття по кліку на посилання в меню
    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) setMenu(false);
    });

    // Закриття по кліку поза меню
    document.addEventListener("click", function (event) {
      if (!event.target.closest(".site-header")) setMenu(false);
    });

    // Після зміни мови оновлюємо підпис кнопки меню
    document.addEventListener("i18n:change", updateToggleLabel);

    // Якщо вікно розширили до десктопу — скидаємо стан меню
    window
      .matchMedia("(min-width: 769px)")
      .addEventListener("change", function (e) {
        if (e.matches) setMenu(false);
      });
  }

  /* ---------- Поточний рік у підвалі ---------- */
  var year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());
})();
