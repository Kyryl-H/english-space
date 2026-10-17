/* ==========================================================
   practice.js — каталог завдань Wordwall (сторінка practice.html).

   Тут лише те, що специфічне для практики: вигляд картки завдання
   та налаштування фільтрів (категорія, рівень).
   Завантаження, пошук, фільтри, стани й переклад — у catalog.js.

   Залежить від: sheets.js, i18n.js, catalog.js.
   ========================================================== */
(function () {
  "use strict";

  var Catalog = window.Catalog;
  var I18n = window.I18n;
  if (!Catalog || !I18n) return;

  function isHttps(url) {
    return typeof url === "string" && url.indexOf("https://") === 0;
  }

  // Адреси зображень, які не завантажились: їх не пробуємо знову при кожному
  // перемальовуванні (пошук, фільтри, зміна мови)
  var failedImages = {};

  /* ---------- Картка завдання ---------- */
  function createCard(item) {
    var title = Catalog.pick(item.titleUa, item.titleEn);
    var description = Catalog.pick(item.descriptionUa, item.descriptionEn);

    var card = Catalog.make("article", "card");

    // Необов'язкове зображення (декоративне, тому alt порожній: назва є в заголовку)
    if (isHttps(item.imageUrl) && !failedImages[item.imageUrl]) {
      var media = Catalog.make("div", "card-media");
      var img = document.createElement("img");
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      img.referrerPolicy = "no-referrer";
      img.addEventListener("error", function () {
        // не показуємо «битий» блок
        failedImages[item.imageUrl] = true;
        media.remove();
      });
      img.src = item.imageUrl;
      media.appendChild(img);
      card.appendChild(media);
    }

    var meta = Catalog.make("div", "card-meta");
    meta.appendChild(Catalog.badge(I18n.t("cat." + item.category)));
    meta.appendChild(Catalog.badge(item.level.toUpperCase(), "badge--outline"));
    card.appendChild(meta);

    var heading = Catalog.make("h2", "card-title");
    heading.textContent = title;
    card.appendChild(heading);

    if (description) {
      var text = Catalog.make("p", "card-text");
      text.textContent = description;
      card.appendChild(text);
    }

    var action = Catalog.make("div", "card-action");
    var link = Catalog.make("a", "btn btn--primary");
    link.href = item.url; // https-адресу вже перевірив sheets.js
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = I18n.t("practice.open");
    link.setAttribute(
      "aria-label",
      I18n.t("practice.openLabel", { title: title }),
    );
    action.appendChild(link);
    card.appendChild(action);

    return card;
  }

  Catalog.init({
    source: "practice",
    noItemsKey: "practice.noItems",
    filters: [
      {
        containerId: "category-filters",
        attribute: "category",
        field: "category",
      },
      { containerId: "level-filters", attribute: "level", field: "level" },
    ],
    createCard: createCard,
  });
})();
