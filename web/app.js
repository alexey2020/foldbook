(function () {
  "use strict";

  var SIDES = ["front", "back"];
  var CELL_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2", "D1", "D2"];

  // Reading-order page number for each (side, cell) — also the public .md
  // heading key (see PAGE_TO_SLOT): Import/Export MD address pages by
  // number ("1".."16"), never by internal grid coordinate. The back side
  // continues the same spiral pattern as the front, offset by 8; validated
  // against a physical duplex test print (see README's "Double-sided
  // printing" section).
  var PAGE_NUMBERS = {
    front: { A1: 8, A2: 7, B1: 1, B2: 6, C1: 2, C2: 5, D1: 3, D2: 4 },
    back: { A1: 16, A2: 15, B1: 9, B2: 14, C1: 10, C2: 13, D1: 11, D2: 12 },
  };

  // All 16 (side, cell) slots, front first, each side in CELL_ORDER.
  var SLOTS = [];
  SIDES.forEach(function (side) {
    CELL_ORDER.forEach(function (name) {
      SLOTS.push({ side: side, name: name });
    });
  });

  // "1".."16" -> {side, name}
  var PAGE_TO_SLOT = {};
  SLOTS.forEach(function (slot) {
    PAGE_TO_SLOT[String(PAGE_NUMBERS[slot.side][slot.name])] = slot;
  });

  // A little pocket almanac — 16 original short poems, one per page,
  // demonstrating markdown formatting (bold title) instead of filler text.
  var DEMO_CONTENT = {
    "1": "**Folding**\nA flat white field,\nfour creases, then a fifth —\nsuddenly a house\nsmall enough to keep.",
    "2": "**Pockets**\nWhat we carry close\nweighs less than what we carry\nin the open hand.",
    "3": "**Morning Light**\nThe kettle sings\nbefore the window does;\nsteam climbs the glass\nslower than the sun.",
    "4": "**Rain**\nEvery drop forgets\nthe cloud it came from\nthe moment it lands\nand calls the ground home.",
    "5": "**A Walk**\nGravel, then grass,\nthen nothing marked at all —\nthe best paths\nrarely know their names.",
    "6": "**Old Letters**\nInk fades to brown,\nbut folds keep their shape —\nsome creases\noutlive the hand that made them.",
    "7": "**Winter Window**\nFrost draws maps\nof countries no one visits,\nborders melting\nby noon.",
    "8": "**Tea**\nTwo minutes steeping\nis a small kind of patience\nthe whole day\ncould learn from.",
    "9": "**City Night**\nA thousand windows,\neach one a different hour —\nsomeone, somewhere,\nis just waking up.",
    "10": "**A Garden**\nWeeds don't know\nthey weren't invited;\nthey grow anyway,\nstubborn and green.",
    "11": "**First Snow**\nThe world holds still\nfor exactly one hour\nbefore the first boot\nwrites its sentence.",
    "12": "**The Sea**\nIt keeps no calendar,\nonly the moon's short memory,\nin and out,\nnever quite finished.",
    "13": "**An Old Clock**\nIt still keeps time,\njust not this century's —\nten minutes slow\nfeels almost honest.",
    "14": "**Autumn Leaves**\nEach one lets go\nat a slightly different angle —\nno two goodbyes\nfall the same way.",
    "15": "**A Quiet Room**\nDust turns in the light\nlike something thinking it over,\nno hurry\nto land anywhere.",
    "16": "**Closing the Book**\nFold it shut,\nslip it in your pocket —\nsixteen small rooms,\ncarried like one."
  };

  function cellEl(side, name) {
    return document.getElementById("cell-" + side + "-" + name);
  }

  function loadDemo() {
    SLOTS.forEach(function (slot) {
      var page = String(PAGE_NUMBERS[slot.side][slot.name]);
      cellEl(slot.side, slot.name).value = DEMO_CONTENT[page] || "";
    });
    renderAllCells();
    refreshStaging();
  }

  function clearAll() {
    SLOTS.forEach(function (slot) {
      cellEl(slot.side, slot.name).value = "";
    });
    renderAllCells();
    refreshStaging();
  }

  // --- Print rendering: bold/italic/lists, dividers ---

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function inlineMd(escaped) {
    var text = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
    text = text.replace(/_(.+?)_/g, "<em>$1</em>");
    return text;
  }

  // --- Page presets ---
  //
  // A preset is a single directive line in the page's markdown, e.g.
  // "{{grid}}" or "{{calendar 2026-11}}". It renders as a block that fills
  // whatever height is left on the page below any text above it. Keeping
  // presets as plain text means they survive Export/Import MD unchanged and
  // can be edited by hand like the rest of the page.

  var DIRECTIVE_RE = /^\{\{\s*([a-z]+)(?:\s+(.*?))?\s*\}\}$/i;

  // Inline SVG ids are document-global, so every rendered wheel needs its
  // own ids (16 pages can each hold one).
  var idSeq = 0;

  function uiLang() {
    return navigator.language || "en";
  }

  function pad2(n) {
    return (n < 10 ? "0" : "") + n;
  }

  // Page-sized ruling, drawn as plain vector lines/dots with mm coordinates
  // (SVG x/y/r accept units). Deliberately not an SVG <pattern>: Chrome
  // rasterizes pattern fills when printing, so they come out blurry in the
  // PDF. The marks cover the largest possible page (75 x 105mm) and the
  // SVG clips whatever doesn't fit.
  var RULE_COLOR = "#a8a8a8";

  function rulingSvg(inner) {
    return '<svg class="preset-svg" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">' + inner + "</svg>";
  }

  function hLine(yMm) {
    return '<line x1="0" x2="100%" y1="' + yMm + 'mm" y2="' + yMm + 'mm"/>';
  }

  function vLine(xMm) {
    return '<line y1="0" y2="100%" x1="' + xMm + 'mm" x2="' + xMm + 'mm"/>';
  }

  function presetBlock(kind, inner) {
    return '<div class="preset preset-' + kind + '">' + inner + "</div>";
  }

  // "YYYY-MM" -> {year, month(0-11)}; anything else -> the current month.
  function parseMonth(arg) {
    var m = /^(\d{4})-(\d{1,2})$/.exec(arg || "");
    if (m && +m[2] >= 1 && +m[2] <= 12) return { year: +m[1], month: +m[2] - 1 };
    var now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }

  // 1 = Monday ... 7 = Sunday, from the browser's locale where supported.
  function firstDayOfWeek(lang) {
    try {
      var loc = new Intl.Locale(lang);
      var info = loc.getWeekInfo ? loc.getWeekInfo() : loc.weekInfo;
      if (info && info.firstDay) return info.firstDay;
    } catch (e) {}
    return 1;
  }

  function renderCalendar(arg) {
    var lang = uiLang();
    var ym = parseMonth(arg);
    var first = new Date(ym.year, ym.month, 1);
    var daysInMonth = new Date(ym.year, ym.month + 1, 0).getDate();
    var monthName = new Intl.DateTimeFormat(lang, { month: "long" }).format(first);
    var title = monthName.charAt(0).toUpperCase() + monthName.slice(1) + " " + ym.year;

    var startDay = firstDayOfWeek(lang) % 7; // JS getDay(): 0 = Sunday
    var weekdayFmt = new Intl.DateTimeFormat(lang, { weekday: "short" });
    var head = "";
    for (var i = 0; i < 7; i++) {
      // 2023-01-01 was a Sunday, so day (1 + n) has getDay() === n.
      var wd = (startDay + i) % 7;
      var weekend = wd === 0 || wd === 6 ? " cal-weekend" : "";
      head += '<div class="cal-head' + weekend + '">' + escapeHtml(weekdayFmt.format(new Date(2023, 0, 1 + wd))) + "</div>";
    }

    var lead = (first.getDay() - startDay + 7) % 7;
    var total = Math.ceil((lead + daysInMonth) / 7) * 7;
    var cells = "";
    for (var c = 0; c < total; c++) {
      var day = c - lead + 1;
      var dow = (startDay + c) % 7;
      var cls = "cal-day" + (dow === 0 || dow === 6 ? " cal-weekend" : "");
      cells += day >= 1 && day <= daysInMonth
        ? '<div class="' + cls + '">' + day + "</div>"
        : '<div class="' + cls + ' cal-empty"></div>';
    }
    return presetBlock(
      "calendar",
      '<div class="cal-title">' + escapeHtml(title) + "</div>" +
        '<div class="cal-grid" style="grid-template-rows:auto repeat(' + total / 7 + ',1fr)">' + head + cells + "</div>"
    );
  }

  function renderGrid() {
    var lines = "";
    for (var y = 0; y <= 105; y += 5) lines += hLine(y + 0.1);
    for (var x = 0; x <= 75; x += 5) lines += vLine(x + 0.1);
    return presetBlock("grid", rulingSvg('<g stroke="' + RULE_COLOR + '" stroke-width="0.2mm">' + lines + "</g>"));
  }

  function renderDots() {
    var dots = "";
    for (var y = 2.5; y < 105; y += 5) {
      for (var x = 2.5; x < 75; x += 5) dots += '<circle cx="' + x + 'mm" cy="' + y + 'mm" r="0.3mm"/>';
    }
    return presetBlock("dots", rulingSvg('<g fill="#8a8a8a">' + dots + "</g>"));
  }

  function renderLines() {
    var lines = "";
    for (var y = 7; y <= 105; y += 7) lines += hLine(y - 0.1);
    return presetBlock("lines", rulingSvg('<g stroke="' + RULE_COLOR + '" stroke-width="0.2mm">' + lines + "</g>"));
  }

  // Rows sit in a grid of fixed-height tracks: repeat(auto-fill, ...) makes
  // only as many tracks as fit whole, and surplus rows land in 0-height
  // implicit tracks and are clipped — so the page never ends on half a box.
  function renderChecklist() {
    var rows = "";
    for (var i = 0; i < 30; i++) {
      rows += '<div class="check-row"><div class="check-line"><span class="check-box"></span></div></div>';
    }
    return presetBlock("checklist", rows);
  }

  var WHEEL_LABELS = {
    ru: ["Здоровье", "Карьера", "Финансы", "Отношения", "Семья", "Друзья", "Развитие", "Отдых"],
    en: ["Health", "Career", "Money", "Love", "Family", "Friends", "Growth", "Fun"],
  };

  function defaultWheelLabels() {
    return WHEEL_LABELS[uiLang().slice(0, 2).toLowerCase()] || WHEEL_LABELS.en;
  }

  // A wheel of life: one sector per label, 10 concentric rings to shade in
  // a 1-10 score per area. Labels are a comma-separated directive argument.
  function renderWheel(arg) {
    var labels = (arg || "")
      .split(",")
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
    if (labels.length < 3) labels = defaultWheelLabels();
    var R = 80;
    var n = labels.length;
    var wheelId = "fb-wheel-" + ++idSeq;
    var svg = "";
    for (var ring = 1; ring <= 10; ring++) {
      var outer = ring === 10;
      svg += '<circle r="' + (R * ring) / 10 + '" fill="none" stroke="' + (outer ? "#555" : "#c8c8c8") +
        '" stroke-width="' + (outer ? 1.2 : 0.6) + '"/>';
    }
    for (var i = 0; i < n; i++) {
      // Sector boundaries start at 12 o'clock; labels sit mid-sector.
      var a = (2 * Math.PI * i) / n - Math.PI / 2;
      svg += '<line x1="0" y1="0" x2="' + (R * Math.cos(a)).toFixed(2) + '" y2="' + (R * Math.sin(a)).toFixed(2) +
        '" stroke="#555" stroke-width="0.8"/>';
      // Each label follows an arc just outside its sector. Upper-half arcs
      // run clockwise with the baseline on the arc; lower-half arcs run
      // counter-clockwise (so the text still reads left to right, upright)
      // on a larger radius, since there the glyphs hang toward the centre.
      var a0 = a + 0.04;
      var a1 = a + (2 * Math.PI) / n - 0.04;
      var lower = Math.sin(a + Math.PI / n) > 0;
      var r = lower ? R + 11 : R + 3;
      var from = lower ? a1 : a0;
      var to = lower ? a0 : a1;
      var pid = wheelId + "-" + i;
      svg += '<path id="' + pid + '" fill="none" d="M' + (r * Math.cos(from)).toFixed(2) + " " + (r * Math.sin(from)).toFixed(2) +
        "A" + r + " " + r + " 0 0 " + (lower ? 0 : 1) + " " + (r * Math.cos(to)).toFixed(2) + " " + (r * Math.sin(to)).toFixed(2) + '"/>';
      svg += '<text text-anchor="middle"><textPath href="#' + pid + '" startOffset="50%">' + escapeHtml(labels[i]) +
        "</textPath></text>";
    }
    var half = R + 14;
    return presetBlock(
      "wheel",
      '<svg class="preset-svg" xmlns="http://www.w3.org/2000/svg" viewBox="' + -half + " " + -half + " " + 2 * half + " " + 2 * half +
        '" preserveAspectRatio="xMidYMid meet">' + svg + "</svg>"
    );
  }

  var DIRECTIVES = {
    calendar: renderCalendar,
    grid: renderGrid,
    dots: renderDots,
    lines: renderLines,
    checklist: renderChecklist,
    wheel: renderWheel,
  };

  // The text a preset puts on a page (what "Apply preset" inserts).
  var PRESETS = {
    calendar: function () {
      var now = new Date();
      return "{{calendar " + now.getFullYear() + "-" + pad2(now.getMonth() + 1) + "}}";
    },
    grid: function () {
      return "{{grid}}";
    },
    dots: function () {
      return "{{dots}}";
    },
    lines: function () {
      return "{{lines}}";
    },
    checklist: function () {
      return "{{checklist}}";
    },
    wheel: function () {
      return "{{wheel " + defaultWheelLabels().join(", ") + "}}";
    },
  };

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
      var directive = DIRECTIVE_RE.exec(line.trim());
      if (directive && DIRECTIVES[directive[1].toLowerCase()]) {
        flushList();
        flushPara();
        htmlParts.push(DIRECTIVES[directive[1].toLowerCase()](directive[2] || ""));
        return;
      }
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

  function printEl(side, name) {
    return document.getElementById("print-" + side + "-" + name);
  }

  function renderCell(side, name) {
    printEl(side, name).innerHTML = renderMarkdownLite(cellEl(side, name).value);
  }

  function renderAllCells() {
    SLOTS.forEach(function (slot) {
      renderCell(slot.side, slot.name);
    });
  }

  // --- Edit/render toggle: a cell shows its rendered view by default; the
  // raw-markdown textarea appears only for the one cell currently being
  // edited. `currentEditingSlot` plus a capture-phase document click
  // listener (below) are the primary mechanism, not focus/blur: the
  // rendered view is a plain non-focusable div, and blur is unreliable in
  // some embedding contexts. focus/blur are still wired up too, so
  // keyboard-driven focus changes (Tab) behave correctly in a normal
  // browser tab.

  var currentEditingSlot = null;

  function enterEditMode(side, name) {
    currentEditingSlot = { side: side, name: name };
    cellEl(side, name).closest(".cell-inner").classList.add("editing");
  }

  function exitEditMode(side, name) {
    if (currentEditingSlot && currentEditingSlot.side === side && currentEditingSlot.name === name) {
      currentEditingSlot = null;
    }
    renderCell(side, name);
    cellEl(side, name).closest(".cell-inner").classList.remove("editing");
  }

  // The rendered view is a plain, non-focusable div, so a click on it can't
  // trigger the textarea's own focus event the way a click on the textarea
  // itself would. Show the textarea first, then focus it explicitly.
  function focusCellForEditing(side, name) {
    enterEditMode(side, name);
    cellEl(side, name).focus();
  }

  // --- Staging area: a normal, unrotated textarea for comfortable typing ---

  function stagingCellEl() {
    return document.getElementById("staging-cell");
  }

  function stagingTextEl() {
    return document.getElementById("staging-text");
  }

  // The <select> value is "side:name", e.g. "front:A1" or "back:B1".
  function stagingSlot() {
    var parts = stagingCellEl().value.split(":");
    return { side: parts[0], name: parts[1] };
  }

  function refreshStaging() {
    var slot = stagingSlot();
    stagingTextEl().value = cellEl(slot.side, slot.name).value;
  }

  function applyStagingToCell() {
    var slot = stagingSlot();
    cellEl(slot.side, slot.name).value = stagingTextEl().value;
    renderCell(slot.side, slot.name);
  }

  // Replaces the staging-selected page's text with the chosen preset.
  function applyPresetToCell() {
    var key = document.getElementById("preset-select").value;
    if (!PRESETS[key]) return;
    var slot = stagingSlot();
    var el = cellEl(slot.side, slot.name);
    var pageLabel = stagingCellEl().selectedOptions[0].text;
    if (el.value.trim() && !confirm("Replace the current text on " + pageLabel + " with this preset?")) return;
    el.value = PRESETS[key]();
    renderCell(slot.side, slot.name);
    refreshStaging();
  }

  // Mirrors Import MD's heading convention ("## 1") so a round trip through
  // Export MD -> Import MD reproduces the same content.
  function exportMd() {
    var pages = [];
    for (var n = 1; n <= 16; n++) pages.push(String(n));
    var text =
      pages
        .map(function (page) {
          var slot = PAGE_TO_SLOT[page];
          return "## " + page + "\n\n" + cellEl(slot.side, slot.name).value;
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

  // A .md file is split into pages by headings that name a page number, e.g.:
  //   ## 8
  //   text for the front cover
  //
  //   ## 1
  //   text for page 1
  // Anything before the first recognized heading is ignored. If the same
  // page number appears more than once, the last section wins; the repeated
  // numbers are listed in result.duplicates so the caller can warn about it.
  function parseMarkdownSections(text) {
    var result = {};
    var duplicates = [];
    var currentPage = null;
    var buffer = [];
    var headingRe = /^#{1,6}\s+(1[0-6]|[1-9])\s*$/;

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
        if (result.hasOwnProperty(currentPage) && duplicates.indexOf(currentPage) === -1) {
          duplicates.push(currentPage);
        }
      } else if (currentPage) {
        buffer.push(line);
      }
    });
    flush();
    return { sections: result, duplicates: duplicates };
  }

  function importMdFile(file) {
    readFileAsText(file, function (text) {
      var parsed = parseMarkdownSections(text);
      var sections = parsed.sections;
      if (Object.keys(sections).length === 0) {
        alert(
          'No page headings found. Mark each section with a heading naming ' +
            'the page number, e.g. "## 1".'
        );
        return;
      }
      // Pages without a matching heading in the file are blanked — the .md
      // file defines the whole booklet.
      SLOTS.forEach(function (slot) {
        var page = String(PAGE_NUMBERS[slot.side][slot.name]);
        cellEl(slot.side, slot.name).value = sections[page] || "";
      });
      renderAllCells();
      refreshStaging();
      if (parsed.duplicates.length) {
        alert(
          "Some page numbers appear more than once: " +
            parsed.duplicates.map(function (n) { return "## " + n; }).join(", ") +
            ".\nOnly the last section with each number was used; the earlier " +
            "ones were dropped. Check the page numbering in the file."
        );
      }
    });
  }

  function init() {
    document.getElementById("btn-demo").addEventListener("click", loadDemo);
    document.getElementById("btn-clear").addEventListener("click", clearAll);
    document.getElementById("btn-export-md").addEventListener("click", exportMd);
    document.getElementById("btn-print").addEventListener("click", function () {
      renderAllCells();
      window.print();
    });
    window.addEventListener("beforeprint", renderAllCells);

    var showPageNumbers = document.getElementById("show-page-numbers");
    function syncPageNumberVisibility() {
      document.body.classList.toggle("hide-page-numbers", !showPageNumbers.checked);
    }
    showPageNumbers.addEventListener("change", syncPageNumberVisibility);
    // Sync on load too: browsers sometimes restore a checkbox's checked
    // state from before a reload, overriding the HTML's `checked`
    // attribute, so the display could otherwise start out of sync with
    // whatever the checkbox actually shows.
    syncPageNumberVisibility();

    SLOTS.forEach(function (slot) {
      cellEl(slot.side, slot.name).addEventListener("focus", function () {
        enterEditMode(slot.side, slot.name);
      });
      cellEl(slot.side, slot.name).addEventListener("blur", function () {
        exitEditMode(slot.side, slot.name);
      });
      printEl(slot.side, slot.name).addEventListener("click", function () {
        focusCellForEditing(slot.side, slot.name);
      });
    });

    // Primary exit mechanism: any click outside the currently-editing cell
    // exits it. Capture phase so this runs before the click that entered a
    // *different* cell's edit mode (see focusCellForEditing above).
    document.addEventListener(
      "click",
      function (e) {
        if (!currentEditingSlot) return;
        var wrapper = cellEl(currentEditingSlot.side, currentEditingSlot.name).closest(".cell-inner");
        if (!wrapper.contains(e.target)) {
          exitEditMode(currentEditingSlot.side, currentEditingSlot.name);
        }
      },
      true
    );

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
    document.getElementById("btn-preset-apply").addEventListener("click", applyPresetToCell);

    loadDemo();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
