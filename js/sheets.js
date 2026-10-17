/* ==========================================================
   sheets.js — завантаження даних з Google Sheets (CSV),
   перевірка й нормалізація записів.

   Залежить від: config.js, csvParser.js (підключати після них).

   Використання:
     Sheets.load('practice')   // аркуш Wordwall_Cards
       .then(function (result) {
         result.items   // правильні, опубліковані записи, відсортовані за Order
         result.issues  // пропущені/виправлені записи: [{ row, id, type, message }]
         result.total   // скільки непорожніх рядків даних було в таблиці
       })
       .catch(function (error) {
         error.code     // причина, див. нижче
       });

   Коди помилок (error.code):
     not-configured — у config.js ще заглушка замість посилання
     bad-url        — посилання не з дозволеного хоста або некоректне
     timeout        — Google не відповів вчасно
     network        — немає з'єднання / запит заблоковано
     http           — сервер відповів помилкою (error.detail — статус)
     not-csv        — замість CSV прийшла HTML-сторінка (таблицю не опубліковано)
     too-large      — файл завеликий
     parse          — CSV пошкоджений (наприклад, не закрито лапку)
     schema         — у таблиці немає обов'язкових стовпців (error.detail.missing)

   Усі значення тут — лише ТЕКСТ. Вставляти їх у сторінку слід
   через textContent (не innerHTML).
   ========================================================== */
(function () {
  "use strict";

  var config = window.SiteConfig;
  var parser = window.CsvParser;

  /* ---------- Схеми аркушів ---------- */
  // columns: назва поля в коді → назва стовпця в таблиці (регістр не важливий)
  var SCHEMAS = {
    practice: {
      columns: {
        id: "ID",
        titleUa: "Title_UA",
        titleEn: "Title_EN",
        category: "Category",
        level: "Level",
        descriptionUa: "Description_UA",
        descriptionEn: "Description_EN",
        url: "Wordwall_URL",
        imageUrl: "Image_URL",
        published: "Published",
        order: "Order",
      },
      required: ["id", "titleUa", "category", "level", "url", "published"],
      groupField: "category", // у результаті: item.category
      groupValues: config.practiceCategories,
      levelRequired: true,
    },
    resources: {
      columns: {
        id: "ID",
        titleUa: "Title_UA",
        titleEn: "Title_EN",
        type: "Type",
        level: "Level",
        descriptionUa: "Description_UA",
        descriptionEn: "Description_EN",
        url: "URL",
        format: "Format",
        published: "Published",
        order: "Order",
      },
      required: ["id", "titleUa", "type", "url", "published"],
      groupField: "type", // у результаті: item.type
      groupValues: config.materialTypes,
      levelRequired: false,
    },
  };

  var MAX = { id: 64, title: 150, description: 600, format: 20, url: 2048 };
  var TRUE_VALUES = ["true", "yes", "так", "1"];
  var FALSE_VALUES = ["false", "no", "ні", "0"];

  var inflight = {}; // запити, що вже виконуються (щоб не дублювати)

  function makeError(code, detail) {
    var error = new Error("[Sheets] " + code);
    error.name = "SheetsError";
    error.code = code;
    error.detail = detail === undefined ? null : detail;
    return error;
  }

  /* ---------- Перевірка адреси джерела ---------- */
  function checkSourceUrl(url) {
    var value = typeof url === "string" ? url.trim() : "";
    if (!value || value.indexOf("ВСТАВТЕ") !== -1)
      throw makeError("not-configured");

    var isAbsolute =
      /^[a-z][a-z0-9+.-]*:/i.test(value) || value.indexOf("//") === 0;
    if (!isAbsolute) return value; // відносний шлях (для локальної перевірки)

    var parsed;
    try {
      parsed = new URL(value);
    } catch (e) {
      throw makeError("bad-url");
    }
    var hostAllowed = config.allowedSourceHosts.indexOf(parsed.hostname) !== -1;
    if (parsed.protocol !== "https:" || !hostAllowed)
      throw makeError("bad-url");
    return parsed.href;
  }

  /* ---------- Мережа ---------- */
  async function fetchText(url) {
    var controller = new AbortController();
    var timer = setTimeout(function () {
      controller.abort();
    }, config.fetchTimeoutMs);
    var text;
    try {
      var response = await fetch(url, {
        signal: controller.signal,
        credentials: "omit",
        referrerPolicy: "no-referrer",
      });
      if (!response.ok) throw makeError("http", response.status);
      text = await response.text();
    } catch (error) {
      if (error && error.name === "SheetsError") throw error;
      throw makeError(
        error && error.name === "AbortError" ? "timeout" : "network",
      );
    } finally {
      clearTimeout(timer);
    }

    if (text.length > config.maxCsvChars) throw makeError("too-large");
    // Якщо таблицю не опубліковано, Google віддає HTML-сторінку замість CSV
    if (/^\s*<(!doctype|html|\?xml)/i.test(text)) throw makeError("not-csv");
    return text;
  }

  /* ---------- Допоміжні функції очищення ---------- */
  // Прибирає керуючі символи, зводить пробіли/переноси до одного пробілу
  function cleanText(value) {
    return String(value == null ? "" : value)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Повертає безпечний https-URL або '' (недопустимі: http, javascript:, data:, логін/пароль в адресі)
  function safeHttpsUrl(value) {
    var text = cleanText(value);
    if (!text || text.length > MAX.url) return "";
    var parsed;
    try {
      parsed = new URL(text);
    } catch (e) {
      return "";
    }
    if (parsed.protocol !== "https:" || parsed.username || parsed.password)
      return "";
    return parsed.href;
  }

  function parsePublished(value) {
    var text = cleanText(value).toLowerCase();
    if (text === "") return "empty";
    if (TRUE_VALUES.indexOf(text) !== -1) return "yes";
    if (FALSE_VALUES.indexOf(text) !== -1) return "no";
    return "invalid";
  }

  function lowerList(list) {
    return list.map(function (item) {
      return String(item).toLowerCase();
    });
  }

  /* ---------- Обробка одного рядка ---------- */
  function processRow(schema, cells, columnIndex, rowNumber, issues, seenIds) {
    var record = {};
    Object.keys(schema.columns).forEach(function (field) {
      var index = columnIndex[field];
      record[field] = index === undefined ? "" : cells[index] || "";
    });

    var id = cleanText(record.id).slice(0, MAX.id);
    function skip(message) {
      issues.push({
        row: rowNumber,
        id: id,
        type: "skipped",
        message: message,
      });
      return null;
    }
    function warn(message) {
      issues.push({
        row: rowNumber,
        id: id,
        type: "warning",
        message: message,
      });
    }

    // 1. Published: неопубліковані рядки ігноруємо повністю (чернетки можуть бути неповними)
    var published = parsePublished(record.published);
    if (published === "no") return null;
    if (published === "empty")
      return skip("Стовпець Published порожній (потрібно TRUE або FALSE)");
    if (published === "invalid")
      return skip(
        "Некоректне значення Published: «" +
          cleanText(record.published).slice(0, 30) +
          "» (потрібно TRUE або FALSE)",
      );

    // 2. ID
    if (!id) return skip("Порожній ID");
    if (seenIds[id])
      return skip("Повторний ID (використовується лише перший запис)");

    // 3. Назва: хоча б однією мовою
    var titleUa = cleanText(record.titleUa).slice(0, MAX.title);
    var titleEn = cleanText(record.titleEn).slice(0, MAX.title);
    if (!titleUa && !titleEn) return skip("Немає назви (Title_UA / Title_EN)");

    // 4. Категорія / тип
    var groupField = schema.groupField;
    var groupValue = cleanText(record[groupField]).toLowerCase();
    if (!groupValue)
      return skip("Порожнє значення стовпця " + schema.columns[groupField]);
    if (lowerList(schema.groupValues).indexOf(groupValue) === -1) {
      return skip(
        "Невідоме значення стовпця " +
          schema.columns[groupField] +
          ": «" +
          groupValue.slice(0, 40) +
          "»",
      );
    }

    // 5. Рівень
    var level = cleanText(record.level).toLowerCase();
    if (!level && schema.levelRequired) return skip("Порожній Level");
    if (level && lowerList(config.levels).indexOf(level) === -1) {
      return skip("Невідомий рівень: «" + level.slice(0, 20) + "»");
    }

    // 6. Основне посилання
    var url = safeHttpsUrl(record.url);
    if (!url) return skip("Некоректне посилання (потрібна адреса https://…)");

    // 7. Необов'язкові поля
    var item = {
      id: id,
      titleUa: titleUa,
      titleEn: titleEn,
      level: level,
      descriptionUa: cleanText(record.descriptionUa).slice(0, MAX.description),
      descriptionEn: cleanText(record.descriptionEn).slice(0, MAX.description),
      url: url,
      order: null,
    };
    item[groupField] = groupValue;

    if (schema.columns.imageUrl) {
      item.imageUrl = "";
      if (cleanText(record.imageUrl)) {
        item.imageUrl = safeHttpsUrl(record.imageUrl);
        if (!item.imageUrl)
          warn("Image_URL некоректний — зображення пропущено");
      }
    }
    if (schema.columns.format)
      item.format = cleanText(record.format).slice(0, MAX.format);

    var orderText = cleanText(record.order).replace(",", ".");
    if (orderText !== "") {
      var orderNumber = Number(orderText);
      if (isFinite(orderNumber)) item.order = orderNumber;
      else warn("Order не є числом — запис буде в кінці списку");
    }

    seenIds[id] = true;
    return item;
  }

  /* ---------- Побудова результату з розібраних рядків ---------- */
  function buildResult(schema, rows, sourceName) {
    var result = { items: [], issues: [], total: 0 };

    // Заголовок — перший непорожній рядок
    var headerIndex = -1;
    for (var h = 0; h < rows.length; h++) {
      if (
        rows[h].some(function (cell) {
          return cleanText(cell) !== "";
        })
      ) {
        headerIndex = h;
        break;
      }
    }
    if (headerIndex === -1) return result; // порожня таблиця — це не помилка

    var headerNames = rows[headerIndex].map(function (cell) {
      return cleanText(cell).toLowerCase();
    });
    var columnIndex = {};
    var missing = [];
    Object.keys(schema.columns).forEach(function (field) {
      var position = headerNames.indexOf(schema.columns[field].toLowerCase());
      if (position !== -1) columnIndex[field] = position;
      else if (schema.required.indexOf(field) !== -1)
        missing.push(schema.columns[field]);
    });
    if (missing.length) throw makeError("schema", { missing: missing });

    var seenIds = {};
    var accepted = [];
    for (var r = headerIndex + 1; r < rows.length; r++) {
      var cells = rows[r];
      if (
        !cells.some(function (cell) {
          return cleanText(cell) !== "";
        })
      )
        continue; // порожній рядок
      result.total++;
      var item = processRow(
        schema,
        cells,
        columnIndex,
        r + 1,
        result.issues,
        seenIds,
      );
      if (item) accepted.push({ item: item, position: accepted.length });
    }

    // Сортування: спочатку записи з Order (за зростанням), потім без нього; далі — порядок у таблиці
    accepted.sort(function (a, b) {
      var ao = a.item.order === null ? Infinity : a.item.order;
      var bo = b.item.order === null ? Infinity : b.item.order;
      if (ao !== bo) return ao < bo ? -1 : 1;
      return a.position - b.position;
    });
    result.items = accepted.map(function (entry) {
      return entry.item;
    });

    if (result.issues.length) {
      console.warn(
        "[Sheets] " +
          sourceName +
          ": проблемних записів — " +
          result.issues.length,
        result.issues,
      );
    }
    return result;
  }

  /* ---------- Публічний метод ---------- */
  async function run(name) {
    var schema = SCHEMAS[name];
    var source = config.sources[name];
    var url = checkSourceUrl(source && source.url);
    var text = await fetchText(url);

    var rows;
    try {
      rows = parser.parse(text);
    } catch (error) {
      throw makeError("parse", error.message);
    }
    return buildResult(schema, rows, name);
  }

  function load(name) {
    if (!Object.prototype.hasOwnProperty.call(SCHEMAS, name)) {
      return Promise.reject(makeError("unknown-source", name));
    }
    // Якщо такий самий запит уже виконується — повертаємо його ж, а не запускаємо другий
    if (inflight[name]) return inflight[name];
    inflight[name] = run(name).finally(function () {
      delete inflight[name];
    });
    return inflight[name];
  }

  window.Sheets = { load: load };
})();
