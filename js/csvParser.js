/* ==========================================================
   csvParser.js — розбір тексту CSV у масив рядків.

   Лише розбір, без мережі й без правил сайту.
   Підтримує за стандартом RFC 4180:
   - поля в лапках, що містять коми та переноси рядків;
   - подвоєні лапки ("") всередині поля;
   - різні переноси рядків (\n, \r\n, \r);
   - BOM на початку файлу.

   Використання: CsvParser.parse(text) → [ ['a','b'], ['1','2'] ]
   Якщо лапка не закрита — кидає помилку.
   ========================================================== */
(function () {
  "use strict";

  function parse(input) {
    var text = String(input == null ? "" : input);
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // BOM

    var rows = [];
    var row = [];
    var field = "";
    var inQuotes = false;
    var atFieldStart = true;

    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);

      if (inQuotes) {
        if (ch === '"') {
          if (text.charAt(i + 1) === '"') {
            field += '"'; // подвоєна лапка = одна лапка в тексті
            i++;
          } else {
            inQuotes = false; // закриваюча лапка
          }
        } else {
          field += ch;
        }
      } else if (ch === '"' && atFieldStart) {
        inQuotes = true;
        atFieldStart = false;
      } else if (ch === ",") {
        row.push(field);
        field = "";
        atFieldStart = true;
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text.charAt(i + 1) === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
        atFieldStart = true;
      } else {
        field += ch;
        atFieldStart = false;
      }
    }

    if (inQuotes) throw new Error("CSV: не закрито лапку");

    // Останній рядок без завершального переносу
    if (field !== "" || row.length > 0) {
      row.push(field);
      rows.push(row);
    }
    return rows;
  }

  window.CsvParser = { parse: parse };
})();
