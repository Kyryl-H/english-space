/* ==========================================================
   resources.js — бібліотека навчальних матеріалів (resources.html).

   Тут лише те, що специфічне для матеріалів: вигляд картки
   (тип, необов'язкові рівень і формат) та налаштування фільтрів
   (тип матеріалу, рівень).
   Завантаження, пошук, фільтри, стани й переклад — у catalog.js.
   Матеріал без рівня показується при будь-якому вибраному рівні.

   Залежить від: sheets.js, i18n.js, catalog.js.
   ========================================================== */
(function () {
  "use strict";

  var Catalog = window.Catalog;
  var I18n = window.I18n;
  if (!Catalog || !I18n) return;

  // Значення стовпця Type (у нижньому регістрі) → ключ перекладу назви типу
  var TYPE_KEYS = {
    textbooks: "type.textbooks",
    grammar: "type.grammar",
    dictionaries: "type.dictionaries",
    audio: "type.audio",
    "additional materials": "type.additional",
    "useful links": "type.links",
  };

  /* ---------- Картка матеріалу ---------- */
  function createCard(item) {
    var title = Catalog.pick(item.titleUa, item.titleEn);
    var description = Catalog.pick(item.descriptionUa, item.descriptionEn);

    var card = Catalog.make("article", "card");

    var meta = Catalog.make("div", "card-meta");
    meta.appendChild(Catalog.badge(I18n.t(TYPE_KEYS[item.type])));
    if (item.level)
      meta.appendChild(
        Catalog.badge(item.level.toUpperCase(), "badge--outline"),
      );
    if (item.format)
      meta.appendChild(Catalog.badge(item.format, "badge--outline"));
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
    link.textContent = I18n.t("resources.open");
    link.setAttribute(
      "aria-label",
      I18n.t("resources.openLabel", { title: title }),
    );
    action.appendChild(link);
    card.appendChild(action);

    return card;
  }

  Catalog.init({
    source: "resources",
    noItemsKey: "resources.noItems",
    filters: [
      { containerId: "type-filters", attribute: "type", field: "type" },
      { containerId: "level-filters", attribute: "level", field: "level" },
    ],
    createCard: createCard,
  });
})();
