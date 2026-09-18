(function () {
  "use strict";

  var CELL_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2", "D1", "D2"];

  // Reading-order page number for each cell — also the public JSON/.md key
  // (see PAGE_TO_CELL): the import/export format addresses pages by number
  // ("1".."8"), never by internal grid coordinate. Mirrors
  // foldbook/schema.py's PAGE_NUMBERS.
  var PAGE_NUMBERS = { A1: 8, A2: 7, B1: 1, B2: 6, C1: 2, C2: 5, D1: 3, D2: 4 };
  var PAGE_TO_CELL = {};
  CELL_ORDER.forEach(function (name) {
    PAGE_TO_CELL[String(PAGE_NUMBERS[name])] = name;
  });

  /* DEMO_CONTENT_START
  Keep this object byte-identical to ../examples/demo-content.json.
  It is duplicated here (rather than fetched) because fetch() is blocked
  against file:// URLs, and this editor must work opened directly from disk.
  */
  var DEMO_CONTENT = {
    "1": "Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris. Integer in mauris eu nibh euismod gravida.",
    "2": "Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat.",
    "3": "Vivamus vestibulum sagittis sapien. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Etiam ultricies nisi vel augue. Curabitur ullamcorper ultricies nisi. Pellentesque erat lorem.",
    "4": "Aliquam erat volutpat. Praesent ac massa at ligula laoreet iaculis. Vivamus a mi. Morbi neque. Aliquam erat volutpat. Nullam varius. Etiam dictum tincidunt diam. Vestibulum ante ipsum primis in faucibus orci luctus.",
    "5": "Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae. Mauris viverra diam vitae quam. Suspendisse potenti. Nullam porttitor lacus at turpis. Donec posuere vulputate arcu.",
    "6": "Quisque porta volutpat erat. Quisque erat eros, viverra eget, congue eget, semper rutrum, nulla. Nunc purus. Phasellus in felis. Donec semper sapien a libero. Nam dui mi, tincidunt quis, accumsan porttitor, facilisis luctus.",
    "7": "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    "8": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
  };
  /* DEMO_CONTENT_END */

  function cellEl(name) {
    return document.getElementById("cell-" + name);
  }

  function loadDemo() {
    CELL_ORDER.forEach(function (name) {
      cellEl(name).value = DEMO_CONTENT[String(PAGE_NUMBERS[name])] || "";
    });
    renderAllCells();
    refreshStaging();
  }

  function clearAll() {
    CELL_ORDER.forEach(function (name) {
      cellEl(name).value = "";
    });
    renderAllCells();
    refreshStaging();
  }

  // A "template" fills exactly the page currently selected in the staging
  // dropdown and blanks the rest, same as loadDemo but with generated
  // content instead of the fixed Lorem Ipsum.
  function applyTemplate(text) {
    var targetCell = document.getElementById("staging-cell").value;
    CELL_ORDER.forEach(function (name) {
      cellEl(name).value = name === targetCell ? text : "";
    });
    renderAllCells();
    refreshStaging();
  }

  // --- Print rendering: bold/italic/lists, mirrors foldbook/markdown_lite.py ---

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function inlineMd(escaped) {
    var text = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
    text = text.replace(/_(.+?)_/g, "<em>$1</em>");
    return text;
  }

  // Paragraphs and lists only (no dividers).
  function renderBlocks(text) {
    var lines = text.split(/\r\n|\r|\n/);
    var htmlParts = [];
    var paraBuffer = [];
    var listBuffer = [];
    var listType = null;

    function flushPara() {
      if (paraBuffer.length) {
        var joined = paraBuffer
          .map(function (l) {
            return inlineMd(escapeHtml(l));
          })
          .join("<br>");
        htmlParts.push("<p>" + joined + "</p>");
        paraBuffer = [];
      }
    }

    function flushList() {
      if (listBuffer.length) {
        var items = listBuffer
          .map(function (item) {
            return "<li>" + inlineMd(escapeHtml(item)) + "</li>";
          })
          .join("");
        htmlParts.push("<" + listType + ">" + items + "</" + listType + ">");
        listBuffer = [];
        listType = null;
      }
    }

    lines.forEach(function (raw) {
      var line = raw.replace(/\s+$/, "");
      var ulMatch = /^[-*]\s+(.*)$/.exec(line);
      var olMatch = /^\d+\.\s+(.*)$/.exec(line);
      if (ulMatch) {
        flushPara();
        if (listType !== "ul") {
          flushList();
          listType = "ul";
        }
        listBuffer.push(ulMatch[1]);
      } else if (olMatch) {
        flushPara();
        if (listType !== "ol") {
          flushList();
          listType = "ol";
        }
        listBuffer.push(olMatch[1]);
      } else if (line === "") {
        flushList();
        flushPara();
      } else {
        flushList();
        paraBuffer.push(line);
      }
    });
    flushList();
    flushPara();
    return htmlParts.join("");
  }

  // Splits on "---" dividers into a CSS grid of equal-height bordered rows
  // — the same technique (grid-auto-rows + a border per item) that divides
  // the sheet itself into its 8 pages.
  function renderRowGrid(text) {
    var segments = [[]];
    text.split(/\r\n|\r|\n/).forEach(function (raw) {
      if (/^-{3,}$/.test(raw.replace(/\s+$/, ""))) {
        segments.push([]);
      } else {
        segments[segments.length - 1].push(raw);
      }
    });
    var rows = segments
      .map(function (segment) {
        return '<div class="row-cell">' + renderBlocks(segment.join("\n")) + "</div>";
      })
      .join("");
    return '<div class="row-grid">' + rows + "</div>";
  }

  function renderMarkdownLite(text) {
    var hasDivider = text.split(/\r\n|\r|\n/).some(function (line) {
      return /^-{3,}$/.test(line.replace(/\s+$/, ""));
    });
    return hasDivider ? renderRowGrid(text) : renderBlocks(text);
  }

  function renderCell(name) {
    document.getElementById("print-" + name).innerHTML = renderMarkdownLite(cellEl(name).value);
  }

  function renderAllCells() {
    CELL_ORDER.forEach(renderCell);
  }

  // --- Edit/render toggle: a cell shows its rendered view by default; the
  // raw-markdown textarea appears only for the one cell currently being
  // edited. `currentEditingCell` plus a capture-phase document click
  // listener (below) are the primary mechanism, not focus/blur: the
  // rendered view is a plain non-focusable div, and blur is unreliable in
  // some embedding contexts. focus/blur are still wired up too, so
  // keyboard-driven focus changes (Tab) behave correctly in a normal
  // browser tab.

  var currentEditingCell = null;

  function enterEditMode(name) {
    currentEditingCell = name;
    cellEl(name).closest(".cell-inner").classList.add("editing");
  }

  function exitEditMode(name) {
    if (currentEditingCell === name) {
      currentEditingCell = null;
    }
    renderCell(name);
    cellEl(name).closest(".cell-inner").classList.remove("editing");
  }

  // The rendered view is a plain, non-focusable div, so a click on it can't
  // trigger the textarea's own focus event the way a click on the textarea
  // itself would. Show the textarea first, then focus it explicitly.
  function focusCellForEditing(name) {
    enterEditMode(name);
    cellEl(name).focus();
  }

  // --- Staging area: a normal, unrotated textarea for comfortable typing ---

  function stagingCellEl() {
    return document.getElementById("staging-cell");
  }

  function stagingTextEl() {
    return document.getElementById("staging-text");
  }

  function refreshStaging() {
    stagingTextEl().value = cellEl(stagingCellEl().value).value;
  }

  function applyStagingToCell() {
    var name = stagingCellEl().value;
    cellEl(name).value = stagingTextEl().value;
    renderCell(name);
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function mondayOf(date) {
    var d = new Date(date);
    var day = d.getDay(); // 0 = Sunday .. 6 = Saturday
    var diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  var WEEKDAY_ABBR = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  // 7 equal-height rows separated by dashed dividers (see markdown_lite's
  // "---" divider support), one per day: "Mon 09/14".
  function loadWeekTemplate() {
    var monday = mondayOf(new Date());
    var rows = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date(monday);
      d.setDate(monday.getDate() + i);
      rows.push(WEEKDAY_ABBR[i] + " " + pad2(d.getMonth() + 1) + "/" + pad2(d.getDate()));
    }
    applyTemplate(rows.join("\n---\n"));
  }

  // Monday-start weeks, padded with null on both ends so every row has 7 cells.
  function monthMatrix(year, monthIndex) {
    var first = new Date(year, monthIndex, 1);
    var daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    var startOffset = (first.getDay() + 6) % 7; // Monday = 0
    var cells = [];
    for (var i = 0; i < startOffset; i++) cells.push(null);
    for (var day = 1; day <= daysInMonth; day++) cells.push(day);
    while (cells.length % 7 !== 0) cells.push(null);
    var rows = [];
    for (var j = 0; j < cells.length; j += 7) rows.push(cells.slice(j, j + 7));
    return rows;
  }

  function loadMonthTemplate() {
    var now = new Date();
    var monthName = capitalize(now.toLocaleDateString("ru-RU", { month: "long" }));
    var year = now.getFullYear();
    var rows = monthMatrix(year, now.getMonth());
    var header = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].join(" ");
    var lines = [monthName + " " + year, "", header];
    rows.forEach(function (row) {
      lines.push(
        row
          .map(function (d) {
            return d === null ? "  " : String(d).padStart(2, " ");
          })
          .join(" ")
      );
    });
    applyTemplate(lines.join("\n"));
  }

  // Public content.json format: keys are page numbers "1".."8" (see
  // PAGE_TO_CELL), not grid coordinates. Integer-like string keys are
  // enumerated in ascending numeric order by JS, so JSON.stringify emits
  // them as 1..8 regardless of insertion order.
  function exportJson() {
    var data = {};
    CELL_ORDER.forEach(function (name) {
      data[String(PAGE_NUMBERS[name])] = cellEl(name).value;
    });
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "content.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Mirrors Import MD's heading convention ("## 1") so a round trip through
  // Export MD -> Import MD reproduces the same content.
  function exportMd() {
    var text =
      ["1", "2", "3", "4", "5", "6", "7", "8"]
        .map(function (page) {
          return "## " + page + "\n\n" + cellEl(PAGE_TO_CELL[page]).value;
        })
        .join("\n\n") + "\n";
    var blob = new Blob([text], { type: "text/markdown" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "content.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Reads a file as text, preferring UTF-8 but falling back to Windows-1252
  // ("ANSI") if the bytes aren't valid UTF-8. Plain reader.readAsText()
  // always assumes UTF-8 and silently turns every non-UTF-8 byte into "�",
  // which is exactly what happens to files saved by older Windows editors
  // (Notepad's pre-2019 default, many CSV/text exports) in the system's
  // legacy codepage — accented Latin letters (ë, é, etc.) are the first
  // casualty since they're the most common non-ASCII bytes in Western
  // European text.
  function readFileAsText(file, callback) {
    var reader = new FileReader();
    reader.onload = function () {
      var bytes = new Uint8Array(reader.result);
      var text;
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } catch (e) {
        text = new TextDecoder("windows-1252").decode(bytes);
      }
      callback(text);
    };
    reader.readAsArrayBuffer(file);
  }

  function importJsonFile(file) {
    readFileAsText(file, function (text) {
      var data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        alert("Not a valid JSON file: " + err.message);
        return;
      }
      if (typeof data !== "object" || data === null || Array.isArray(data)) {
        alert("content.json must contain a JSON object mapping page numbers (1-8) to text");
        return;
      }
      Object.keys(data).forEach(function (key) {
        var name = PAGE_TO_CELL[key];
        if (!name) {
          console.warn('Ignoring unknown page "' + key + '" in imported JSON');
          return;
        }
        cellEl(name).value = data[key] == null ? "" : String(data[key]);
      });
      renderAllCells();
      refreshStaging();
    });
  }

  // A .md file is split into pages by headings that name a page number, e.g.:
  //   ## 8
  //   text for the front cover
  //
  //   ## 1
  //   text for page 1
  // Anything before the first recognized heading is ignored.
  function parseMarkdownSections(text) {
    var result = {};
    var currentPage = null;
    var buffer = [];
    var headingRe = /^#{1,6}\s+([1-8])\s*$/;

    function flush() {
      if (currentPage) {
        result[currentPage] = buffer.join("\n").replace(/^\n+|\n+$/g, "");
      }
      buffer = [];
    }

    text.split(/\r\n|\r|\n/).forEach(function (line) {
      var match = headingRe.exec(line.trim());
      if (match) {
        flush();
        currentPage = match[1];
      } else if (currentPage) {
        buffer.push(line);
      }
    });
    flush();
    return result;
  }

  function importMdFile(file) {
    readFileAsText(file, function (text) {
      var sections = parseMarkdownSections(text);
      if (Object.keys(sections).length === 0) {
        alert(
          'No page headings found. Mark each section with a heading naming ' +
            'the page number, e.g. "## 1".'
        );
        return;
      }
      // Pages without a matching heading in the file are blanked, same as
      // the calendar templates: the .md file defines the whole booklet.
      CELL_ORDER.forEach(function (name) {
        cellEl(name).value = sections[String(PAGE_NUMBERS[name])] || "";
      });
      renderAllCells();
      refreshStaging();
    });
  }

  function init() {
    document.getElementById("btn-demo").addEventListener("click", loadDemo);
    document.getElementById("btn-template-week").addEventListener("click", loadWeekTemplate);
    document.getElementById("btn-template-month").addEventListener("click", loadMonthTemplate);
    document.getElementById("btn-clear").addEventListener("click", clearAll);
    document.getElementById("btn-export").addEventListener("click", exportJson);
    document.getElementById("btn-export-md").addEventListener("click", exportMd);
    document.getElementById("btn-print").addEventListener("click", function () {
      renderAllCells();
      window.print();
    });
    window.addEventListener("beforeprint", renderAllCells);

    CELL_ORDER.forEach(function (name) {
      cellEl(name).addEventListener("focus", function () {
        enterEditMode(name);
      });
      cellEl(name).addEventListener("blur", function () {
        exitEditMode(name);
      });
      document.getElementById("print-" + name).addEventListener("click", function () {
        focusCellForEditing(name);
      });
    });

    // Primary exit mechanism: any click outside the currently-editing cell
    // exits it. Capture phase so this runs before the click that entered a
    // *different* cell's edit mode (see focusCellForEditing above).
    document.addEventListener(
      "click",
      function (e) {
        if (!currentEditingCell) return;
        var wrapper = cellEl(currentEditingCell).closest(".cell-inner");
        if (!wrapper.contains(e.target)) {
          exitEditMode(currentEditingCell);
        }
      },
      true
    );

    var fileInput = document.getElementById("file-import");
    document.getElementById("btn-import").addEventListener("click", function () {
      fileInput.click();
    });
    fileInput.addEventListener("change", function () {
      if (fileInput.files && fileInput.files[0]) {
        importJsonFile(fileInput.files[0]);
      }
      fileInput.value = "";
    });

    var mdInput = document.getElementById("file-import-md");
    document.getElementById("btn-import-md").addEventListener("click", function () {
      mdInput.click();
    });
    mdInput.addEventListener("change", function () {
      if (mdInput.files && mdInput.files[0]) {
        importMdFile(mdInput.files[0]);
      }
      mdInput.value = "";
    });

    stagingCellEl().addEventListener("change", refreshStaging);
    document.getElementById("btn-staging-apply").addEventListener("click", function () {
      applyStagingToCell();
      refreshStaging();
    });

    loadDemo();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
