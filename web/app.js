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
  // Anything before the first recognized heading is ignored.
  function parseMarkdownSections(text) {
    var result = {};
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
      // Pages without a matching heading in the file are blanked — the .md
      // file defines the whole booklet.
      SLOTS.forEach(function (slot) {
        var page = String(PAGE_NUMBERS[slot.side][slot.name]);
        cellEl(slot.side, slot.name).value = sections[page] || "";
      });
      renderAllCells();
      refreshStaging();
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

    loadDemo();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
