/* ==========================================================
   i18n.js — двомовність інтерфейсу (UA / EN).

   Як це працює:
   1. Тексти в HTML позначені атрибутами:
        data-i18n="ключ"                    → замінює textContent
        data-i18n-attr="атрибут:ключ;..."   → замінює атрибути
                                              (placeholder, aria-label, content)
        data-i18n-vars='{"count":0}'        → значення для {count} у тексті
   2. Словник нижче: translations.ua та translations.en.
   3. Вибрана мова зберігається в localStorage; за замовчуванням — українська.
   4. Після перемикання сторінка не перезавантажується: оновлюються
      тексти, атрибут <html lang> і кнопки UA / EN, а на document
      надсилається подія "i18n:change" — її слухатимуть скрипти
      каталогів (practice.js, resources.js), щоб перемалювати картки.

   Для інших скриптів доступно: I18n.t(ключ, {змінні}), I18n.getLang(), I18n.setLang(мова).

   Увага: перекладається лише інтерфейс сайту, а не вміст ігор Wordwall
   чи файлів Google Drive.
   ========================================================== */
(function () {
  "use strict";

  var STORAGE_KEY = "englishSpace.lang";
  var DEFAULT_LANG = "ua";
  // Значення атрибута <html lang> для кожної мови
  var HTML_LANG = { ua: "uk", en: "en" };

  var translations = {
    ua: {
      // Загальне
      skip: "Перейти до змісту",
      "nav.main": "Основна навігація",
      "nav.home": "Головна",
      "nav.practice": "Практика",
      "nav.resources": "Матеріали",
      "nav.openMenu": "Відкрити меню",
      "nav.closeMenu": "Закрити меню",
      "lang.label": "Мова інтерфейсу",

      // Підвал
      "footer.about": "Освітній ресурс для вивчення англійської мови.",
      "footer.navLabel": "Навігація в підвалі",
      "footer.sections": "Розділи",
      "footer.contacts": "Контакти",
      "footer.address": "вул. Небесної сотні, 37, Житомир, Україна, 1030",
      "footer.social": "Соціальні мережі",
      "footer.instagram": "Instagram (відкриється в новій вкладці)",
      "footer.facebook": "Facebook (відкриється в новій вкладці)",

      // Метадані сторінок
      "meta.home.title":
        "English Space — твій простір для вивчення англійської",
      "meta.home.desc":
        "English Space — освітній ресурс з англійської мови: інтерактивні завдання та навчальні матеріали.",
      "meta.practice.title": "Практика — English Space",
      "meta.practice.desc":
        "Каталог інтерактивних завдань Wordwall з англійської мови.",
      "meta.resources.title": "Матеріали — English Space",
      "meta.resources.desc":
        "Бібліотека навчальних матеріалів з англійської мови.",

      // Головна: hero
      "home.h1": "English Space — твій простір для вивчення англійської",
      "home.lead":
        "Інтерактивні завдання та навчальні матеріали з англійської мови в одному місці.",
      "home.btnPractice": "Почати практику",
      "home.btnResources": "Навчальні матеріали",
      "home.imagePlaceholder": "Місце для зображення",

      // Головна: напрями навчання
      "dir.title": "Напрями навчання",
      "dir.grammar": "Граматика",
      "dir.grammar.text": "Правила та вправи для впевненого письма й мовлення.",
      "dir.vocabulary": "Лексика",
      "dir.vocabulary.text":
        "Нові слова, вирази та закріплення через практику.",
      "dir.speaking": "Говоріння",
      "dir.speaking.text": "Підготовка до діалогів і розмовної практики.",
      "dir.listening": "Аудіювання",
      "dir.listening.text": "Розвиток розуміння англійської на слух.",

      // Головна: про ресурс
      "about.title": "Про освітній ресурс",
      "about.lead":
        "Сайт об'єднує інтерактивні завдання та навчальні матеріали з англійської мови. Контент оновлюють викладачі без редагування коду.",
      "about.f1.title": "Інтерактивні завдання",
      "about.f1.text":
        "Каталог завдань Wordwall із пошуком і фільтрами за категорією та рівнем.",
      "about.f2.title": "Навчальні матеріали",
      "about.f2.text":
        "Підручники, граматика, словники, аудіо та корисні посилання.",
      "about.f3.title": "Українська та англійська",
      "about.f3.text": "Інтерфейс сайту доступний двома мовами.",

      // Головна: викладачі (заглушки)
      "teachers.title": "Викладачі",
      "teacher.photoAlt": "Заглушка для фотографії викладача",
      "teacher.photo": "Фото",
      "teacher.name": "Ім'я Прізвище",
      "teacher.role": "Посада (заглушка)",
      "teacher.specLabel": "Спеціалізація:",
      "teacher.specValue": "буде додано.",
      "teacher.bio": "Короткий опис викладача буде додано.",

      // Практика
      "practice.h1": "Практика",
      "practice.lead":
        "Інтерактивні завдання Wordwall з англійської мови. Оберіть категорію й рівень або скористайтеся пошуком.",
      "practice.searchLabel": "Пошук завдань",
      "practice.loading": "Завантаження завдань…",
      "practice.error": "Не вдалося завантажити завдання.",
      "practice.open": "Відкрити завдання",
      "practice.openLabel": "Відкрити завдання «{title}» у новій вкладці",
      "practice.noItems": "Завдань поки немає.",

      // Матеріали
      "resources.h1": "Навчальні матеріали",
      "resources.lead":
        "Підручники, граматика, словники, аудіо та корисні посилання. Оберіть тип і рівень або скористайтеся пошуком.",
      "resources.searchLabel": "Пошук матеріалів",
      "resources.loading": "Завантаження матеріалів…",
      "resources.error": "Не вдалося завантажити матеріали.",
      "resources.open": "Відкрити",
      "resources.openLabel": "Відкрити матеріал «{title}» у новій вкладці",
      "resources.noItems": "Матеріалів поки немає.",

      // Пошук, фільтри, стани (спільні)
      "search.placeholder": "Пошук за назвою або описом",
      "filter.category": "Категорія",
      "filter.level": "Рівень",
      "filter.type": "Тип матеріалу",
      "results.found": "Знайдено: {count}",
      "state.retry": "Спробувати ще раз",
      "state.empty": "Нічого не знайдено. Змініть запит або фільтри.",

      // Помилки завантаження даних (спільні для «Практики» і «Матеріалів»)
      "error.notConfigured":
        "Каталог ще не налаштовано. Зверніться до адміністратора сайту.",
      "error.format":
        "Дані каталогу мають неправильний формат. Повідомте викладача або адміністратора сайту.",
      "error.timeout":
        "Сервер не відповів вчасно. Перевірте з'єднання та спробуйте ще раз.",
      "error.network":
        "Не вдалося з'єднатися із сервером. Перевірте інтернет і спробуйте ще раз.",
      "error.http": "Сервер повернув помилку. Спробуйте пізніше.",
      "error.unknown": "Сталася неочікувана помилка. Спробуйте ще раз.",

      // Категорії завдань
      "cat.all": "Усі",
      "cat.grammar": "Граматика",
      "cat.vocabulary": "Лексика",
      "cat.speaking": "Говоріння",
      "cat.listening": "Аудіювання",
      "cat.reading": "Читання",

      // Рівні
      "level.all": "Усі",

      // Типи матеріалів
      "type.all": "Усі",
      "type.textbooks": "Підручники",
      "type.grammar": "Граматика",
      "type.dictionaries": "Словники",
      "type.audio": "Аудіо",
      "type.additional": "Додаткові матеріали",
      "type.links": "Корисні посилання",
    },

    en: {
      // Загальне
      skip: "Skip to content",
      "nav.main": "Main navigation",
      "nav.home": "Home",
      "nav.practice": "Practice",
      "nav.resources": "Resources",
      "nav.openMenu": "Open menu",
      "nav.closeMenu": "Close menu",
      "lang.label": "Interface language",

      // Підвал
      "footer.about": "An educational resource for learning English.",
      "footer.navLabel": "Footer navigation",
      "footer.sections": "Sections",
      "footer.contacts": "Contacts",
      "footer.address": "37 Nebesnoi Sotni St., Zhytomyr, 1030, Ukraine",
      "footer.social": "Social media",
      "footer.instagram": "Instagram (opens in a new tab)",
      "footer.facebook": "Facebook (opens in a new tab)",

      // Метадані сторінок
      "meta.home.title": "English Space — Your Space to Learn English",
      "meta.home.desc":
        "English Space — an educational resource for English: interactive exercises and learning materials.",
      "meta.practice.title": "Practice — English Space",
      "meta.practice.desc":
        "A catalog of interactive Wordwall exercises for learning English.",
      "meta.resources.title": "Resources — English Space",
      "meta.resources.desc": "A library of English learning materials.",

      // Головна: hero
      "home.h1": "English Space — Your Space to Learn English",
      "home.lead":
        "Interactive exercises and learning materials for English, all in one place.",
      "home.btnPractice": "Start Practicing",
      "home.btnResources": "Learning Resources",
      "home.imagePlaceholder": "Image placeholder",

      // Головна: напрями навчання
      "dir.title": "Learning areas",
      "dir.grammar": "Grammar",
      "dir.grammar.text":
        "Rules and exercises for confident writing and speaking.",
      "dir.vocabulary": "Vocabulary",
      "dir.vocabulary.text":
        "New words, expressions, and reinforcement through practice.",
      "dir.speaking": "Speaking",
      "dir.speaking.text": "Preparation for dialogues and speaking practice.",
      "dir.listening": "Listening",
      "dir.listening.text":
        "Building your ability to understand spoken English.",

      // Головна: про ресурс
      "about.title": "About this resource",
      "about.lead":
        "The site brings together interactive exercises and English learning materials. Teachers update the content without editing any code.",
      "about.f1.title": "Interactive exercises",
      "about.f1.text":
        "A catalog of Wordwall exercises with search and filters by category and level.",
      "about.f2.title": "Learning materials",
      "about.f2.text":
        "Textbooks, grammar, dictionaries, audio, and useful links.",
      "about.f3.title": "Ukrainian and English",
      "about.f3.text": "The site interface is available in two languages.",

      // Головна: викладачі (заглушки)
      "teachers.title": "Teachers",
      "teacher.photoAlt": "Placeholder for teacher photo",
      "teacher.photo": "Photo",
      "teacher.name": "First Last Name",
      "teacher.role": "Position (placeholder)",
      "teacher.specLabel": "Specialization:",
      "teacher.specValue": "to be added.",
      "teacher.bio": "A short teacher bio will be added.",

      // Практика
      "practice.h1": "Practice",
      "practice.lead":
        "Interactive Wordwall exercises for English. Choose a category and level, or use search.",
      "practice.searchLabel": "Search exercises",
      "practice.loading": "Loading exercises…",
      "practice.error": "Could not load the exercises.",
      "practice.open": "Open exercise",
      "practice.openLabel": "Open exercise “{title}” in a new tab",
      "practice.noItems": "There are no exercises yet.",

      // Матеріали
      "resources.h1": "Learning Resources",
      "resources.lead":
        "Textbooks, grammar, dictionaries, audio, and useful links. Choose a type and level, or use search.",
      "resources.searchLabel": "Search materials",
      "resources.loading": "Loading materials…",
      "resources.error": "Could not load the materials.",
      "resources.open": "Open",
      "resources.openLabel": "Open material “{title}” in a new tab",
      "resources.noItems": "There are no materials yet.",

      // Пошук, фільтри, стани (спільні)
      "search.placeholder": "Search by title or description",
      "filter.category": "Category",
      "filter.level": "Level",
      "filter.type": "Material type",
      "results.found": "Found: {count}",
      "state.retry": "Try again",
      "state.empty": "Nothing found. Try changing your search or filters.",

      // Помилки завантаження даних (спільні для «Практики» і «Матеріалів»)
      "error.notConfigured":
        "The catalog has not been set up yet. Please contact the site administrator.",
      "error.format":
        "The catalog data has an invalid format. Please let your teacher or the site administrator know.",
      "error.timeout":
        "The server did not respond in time. Check your connection and try again.",
      "error.network":
        "Could not connect to the server. Check your internet and try again.",
      "error.http": "The server returned an error. Please try again later.",
      "error.unknown": "An unexpected error occurred. Please try again.",

      // Категорії завдань
      "cat.all": "All",
      "cat.grammar": "Grammar",
      "cat.vocabulary": "Vocabulary",
      "cat.speaking": "Speaking",
      "cat.listening": "Listening",
      "cat.reading": "Reading",

      // Рівні
      "level.all": "All",

      // Типи матеріалів
      "type.all": "All",
      "type.textbooks": "Textbooks",
      "type.grammar": "Grammar",
      "type.dictionaries": "Dictionaries",
      "type.audio": "Audio",
      "type.additional": "Additional Materials",
      "type.links": "Useful Links",
    },
  };

  var currentLang = DEFAULT_LANG;

  function hasLang(lang) {
    return Object.prototype.hasOwnProperty.call(translations, lang);
  }

  function readStoredLang() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      return hasLang(stored) ? stored : null;
    } catch (e) {
      return null; // localStorage може бути недоступним (приватний режим тощо)
    }
  }

  function storeLang(lang) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      /* нічого страшного: мова просто не збережеться */
    }
  }

  /* Переклад за ключем. Якщо ключа немає в поточній мові — беремо українську,
     якщо немає й там — повертаємо сам ключ і пишемо попередження в консоль. */
  function t(key, vars) {
    var text = translations[currentLang][key];
    if (text === undefined) text = translations[DEFAULT_LANG][key];
    if (text === undefined) {
      console.warn("[i18n] Немає перекладу для ключа:", key);
      return key;
    }
    if (vars) {
      text = text.replace(/\{(\w+)\}/g, function (match, name) {
        return Object.prototype.hasOwnProperty.call(vars, name)
          ? String(vars[name])
          : match;
      });
    }
    return text;
  }

  function readVars(node) {
    var raw = node.getAttribute("data-i18n-vars");
    if (!raw) return undefined;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return undefined;
    }
  }

  /* Застосовує переклад до всієї сторінки. Тільки textContent та атрибути —
     жодного innerHTML. */
  function apply() {
    document.documentElement.lang = HTML_LANG[currentLang];

    document.querySelectorAll("[data-i18n]").forEach(function (node) {
      node.textContent = t(node.getAttribute("data-i18n"), readVars(node));
    });

    document.querySelectorAll("[data-i18n-attr]").forEach(function (node) {
      node
        .getAttribute("data-i18n-attr")
        .split(";")
        .forEach(function (pair) {
          var index = pair.indexOf(":");
          if (index < 1) return;
          node.setAttribute(
            pair.slice(0, index).trim(),
            t(pair.slice(index + 1).trim()),
          );
        });
    });

    document.querySelectorAll(".lang-btn").forEach(function (btn) {
      var active = btn.getAttribute("data-lang") === currentLang;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
  }

  function setLang(lang) {
    if (!hasLang(lang)) return;
    currentLang = lang;
    storeLang(lang);
    apply();
    document.dispatchEvent(
      new CustomEvent("i18n:change", { detail: { lang: lang } }),
    );
  }

  function init() {
    currentLang = readStoredLang() || DEFAULT_LANG;
    apply();
    // Переклад застосовано — показуємо сторінку (див. скрипт у <head>)
    document.documentElement.classList.remove("lang-pending");

    document.querySelectorAll(".lang-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setLang(btn.getAttribute("data-lang"));
      });
    });
  }

  window.I18n = {
    t: t,
    getLang: function () {
      return currentLang;
    },
    setLang: setLang,
  };

  init();
})();
