/* ==========================================================
   config.js — ЄДИНЕ місце налаштувань джерел даних.

   Тут ви замінюєте посилання на свою Google-таблицю.
   Більше нічого в коді міняти не потрібно.

   Як отримати посилання — див. README (розділ «Google Sheets»):
   Файл → Поділитися → Опублікувати в інтернеті → обрати АРКУШ →
   формат «Значення, розділені комами (.csv)» → Опублікувати.

   Для перевірки без Google можна тимчасово вказати шлях до зразка:
     'sample-data/wordwall_cards.csv'   (потрібен Live Server)
   ========================================================== */
window.SiteConfig = {
  sources: {
    // Аркуш 1: Wordwall_Cards (сторінка «Практика»)
    practice: {
      url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS58oJ03IhP5i88wZN8t4zgpncfT6Fl0En7e1Rq4-md5DPDEGa04aTa-CPvLfwF5uyQJ3DHDDvaPL0u/pub?gid=488009635&single=true&output=csv",
    },
    // Аркуш 2: Materials (сторінка «Матеріали»)
    resources: {
      url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS58oJ03IhP5i88wZN8t4zgpncfT6Fl0En7e1Rq4-md5DPDEGa04aTa-CPvLfwF5uyQJ3DHDDvaPL0u/pub?gid=1384392219&single=true&output=csv",
    },
  },

  // Абсолютні адреси джерел дозволені лише з цих хостів (https)
  allowedSourceHosts: ["docs.google.com"],

  // Скільки чекати відповіді від Google (мілісекунди)
  fetchTimeoutMs: 10000,

  // Максимальний розмір CSV (символів) — захист від випадково величезного файлу
  maxCsvChars: 2000000,

  // Допустимі значення стовпців таблиці (регістр не важливий)
  levels: ["A1", "A2", "B1", "B2"],
  practiceCategories: [
    "Grammar",
    "Vocabulary",
    "Speaking",
    "Listening",
    "Reading",
  ],
  materialTypes: [
    "Textbooks",
    "Grammar",
    "Dictionaries",
    "Audio",
    "Additional Materials",
    "Useful Links",
  ],
};
