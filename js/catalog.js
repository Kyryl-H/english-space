/* ==========================================================
   catalog.js — спільна логіка каталогів (practice.html, resources.html).

   Робить усе, що однакове для обох сторінок:
   - завантажує дані: Sheets.load(source);
   - пошук за назвою та описом (обома мовами, усі слова запиту);
   - фільтри (кнопки-чіпи), що комбінуються між собою та з пошуком;
   - лічильник результатів;
   - стани: завантаження, помилка (з повтором), «нічого не знайдено»;
   - перемальовування карток після зміни мови (подія i18n:change).

   Сторінка (practice.js / resources.js) передає лише те, що відрізняється:
     Catalog.init({
       source: 'practice',                 // назва аркуша для Sheets.load
       noItemsKey: 'practice.noItems',     // повідомлення, коли таблиця порожня
       filters: [                          // групи фільтрів
         { containerId: 'category-filters', attribute: 'category', field: 'category' }
       ],                                  // attribute — data-атрибут кнопки,
                                           // field — поле запису, з яким він порівнюється
       createCard: function (item) { ... } // повертає DOM-елемент картки
     });

   Продуктивність:
   - картка створюється один раз і використовується повторно (кеш на запис
     для поточної мови), тож пошук/фільтри не будують DOM заново;
   - у великих списках (понад BIG_LIST записів) пошук запускається з невеликою
     затримкою, щоб не перемальовувати сторінку на кожну літеру;
   - діагностика: додайте до адреси ?debug (наприклад, practice.html?debug) —
     у консолі з'являться тривалість завантаження та перемальовування.

   Правило фільтра: запис без значення в полі (наприклад, матеріал без рівня)
   підходить до будь-якого вибраного значення цього фільтра.

   Очікувані елементи на сторінці (id): cards-grid, search-input, results-count,
   state-loading, state-error, state-empty, error-detail, empty-message, retry-btn.

   Для сторінок також доступні допоміжні функції:
   Catalog.make, Catalog.pick, Catalog.badge.

   Залежить від: sheets.js, i18n.js.
   ========================================================== */
(function () {
  'use strict';

  var Sheets = window.Sheets;
  var I18n = window.I18n;

  var BIG_LIST = 150;        // від цієї кількості записів пошук має затримку
  var SEARCH_DELAY_MS = 120;
  var DEBUG = /[?&]debug(?:[=&]|$)/.test(window.location.search);

  function log(message, value) {
    if (DEBUG) console.info('[Catalog] ' + message + ': ' + Math.round(value) + ' мс');
  }

  // Код помилки з sheets.js → ключ повідомлення в i18n.js
  var ERROR_KEYS = {
    'not-configured': 'error.notConfigured',
    'bad-url': 'error.format',
    'schema': 'error.format',
    'parse': 'error.format',
    'not-csv': 'error.format',
    'too-large': 'error.format',
    'timeout': 'error.timeout',
    'network': 'error.network',
    'http': 'error.http'
  };

  /* ---------- Допоміжні функції (також для сторінок) ---------- */
  function make(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  // Текст мовою інтерфейсу; якщо його немає — з іншої мови
  function pick(ua, en) {
    return I18n.getLang() === 'en' ? (en || ua) : (ua || en);
  }

  function badge(text, extraClass) {
    var node = make('span', extraClass ? 'badge ' + extraClass : 'badge');
    node.textContent = text;
    return node;
  }

  function normalize(text) {
    return String(text).toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function searchText(item) {
    return normalize([item.titleUa, item.titleEn, item.descriptionUa, item.descriptionEn].join(' '));
  }

  /* ---------- Каталог ---------- */
  function init(options) {
    if (!Sheets || !I18n) return;

    var grid = document.getElementById('cards-grid');
    var searchInput = document.getElementById('search-input');
    var countEl = document.getElementById('results-count');
    var stateLoading = document.getElementById('state-loading');
    var stateError = document.getElementById('state-error');
    var stateEmpty = document.getElementById('state-empty');
    var errorDetail = document.getElementById('error-detail');
    var emptyMessage = document.getElementById('empty-message');
    var retryBtn = document.getElementById('retry-btn');

    var state = { items: [], loaded: false, errorCode: null, query: '' };

    // Кожна група фільтрів пам'ятає вибране значення ('all' = без фільтра)
    var filters = options.filters.map(function (filter) {
      return {
        container: document.getElementById(filter.containerId),
        attribute: filter.attribute,
        field: filter.field,
        selected: 'all'
      };
    });

    function showOnly(which) {
      stateLoading.hidden = which !== 'loading';
      stateError.hidden = which !== 'error';
      countEl.hidden = which !== 'results';
    }

    function matches(item) {
      for (var i = 0; i < filters.length; i++) {
        var value = item[filters[i].field];
        if (filters[i].selected !== 'all' && value && value !== filters[i].selected) return false;
      }
      if (!state.query) return true;
      // Усі слова запиту мають зустрічатися в назві чи описі
      return state.query.split(' ').every(function (word) { return item.search.indexOf(word) !== -1; });
    }

    // Картка створюється один раз на мову й використовується повторно
    function cardFor(item) {
      var lang = I18n.getLang();
      if (!item.card || item.cardLang !== lang) {
        item.card = options.createCard(item);
        item.cardLang = lang;
      }
      return item.card;
    }

    function renderResults() {
      var started = performance.now();
      var visible = state.items.filter(matches);

      // replaceChildren очищає сітку перед малюванням — дублікатів бути не може
      var fragment = document.createDocumentFragment();
      visible.forEach(function (item) { fragment.appendChild(cardFor(item)); });
      grid.replaceChildren(fragment);

      countEl.setAttribute('data-i18n-vars', JSON.stringify({ count: visible.length }));
      countEl.textContent = I18n.t('results.found', { count: visible.length });

      var key = state.items.length === 0 ? options.noItemsKey : 'state.empty';
      emptyMessage.setAttribute('data-i18n', key);
      emptyMessage.textContent = I18n.t(key);
      stateEmpty.hidden = visible.length !== 0;

      showOnly('results');
      log('перемальовування (' + visible.length + ' карток)', performance.now() - started);
    }

    function renderError() {
      var key = ERROR_KEYS[state.errorCode] || 'error.unknown';
      errorDetail.setAttribute('data-i18n', key);
      errorDetail.textContent = I18n.t(key);
      stateEmpty.hidden = true;
      grid.replaceChildren();
      showOnly('error');
    }

    function render() {
      if (state.errorCode) renderError();
      else if (state.loaded) renderResults();
    }

    function load() {
      state.loaded = false;
      state.errorCode = null;
      stateEmpty.hidden = true;
      grid.replaceChildren();
      showOnly('loading');

      var loadStarted = performance.now();
      Sheets.load(options.source)
        .then(function (result) {
          log('отримано й перевірено дані (' + result.items.length + ' записів)', performance.now() - loadStarted);
          state.items = result.items.map(function (item) {
            item.search = searchText(item);
            return item;
          });
          state.loaded = true;
          render();
          log('від початку завантаження до карток', performance.now() - loadStarted);
        })
        .catch(function (error) {
          console.error('[Catalog:' + options.source + '] Не вдалося завантажити дані:',
            error && error.code, error && error.detail, error);
          state.errorCode = (error && error.code) || 'unknown';
          render();
        });
    }

    /* ---------- Події ---------- */
    var searchTimer = null;

    function applySearch() {
      clearTimeout(searchTimer);
      searchTimer = null;
      state.query = normalize(searchInput.value);
      render();
    }

    searchInput.addEventListener('input', function () {
      clearTimeout(searchTimer);
      if (state.items.length > BIG_LIST) searchTimer = setTimeout(applySearch, SEARCH_DELAY_MS);
      else applySearch();
    });

    // Один обробник на групу кнопок-фільтрів (делегування)
    filters.forEach(function (filter) {
      filter.container.addEventListener('click', function (event) {
        var button = event.target.closest('.chip');
        if (!button || !filter.container.contains(button)) return;
        if (searchTimer !== null) applySearch(); // не втрачаємо запит, що ще чекає на затримку
        filter.selected = button.getAttribute('data-' + filter.attribute);
        filter.container.querySelectorAll('.chip').forEach(function (chip) {
          chip.setAttribute('aria-pressed', String(chip === button));
        });
        render();
      });
    });

    retryBtn.addEventListener('click', load);
    document.addEventListener('i18n:change', render);

    // Браузер може відновити текст у полі пошуку після оновлення сторінки
    state.query = normalize(searchInput.value);
    load();
  }

  window.Catalog = { init: init, make: make, pick: pick, badge: badge };
})();