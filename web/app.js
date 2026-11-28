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

  // Pictures added to the booklet, "img-1" -> data URL. Page text refers to
  // them as "![caption][img-1]" so the text stays short and readable; Export
  // MD appends them as markdown reference definitions ("[img-1]: data:...").
  var images = {};

  function addImage(dataUrl) {
    var n = 1;
    while (images["img-" + n]) n++;
    images["img-" + n] = dataUrl;
    return "img-" + n;
  }

  function loadDemo() {
    images = {};
    SLOTS.forEach(function (slot) {
      var page = String(PAGE_NUMBERS[slot.side][slot.name]);
      cellEl(slot.side, slot.name).value = DEMO_CONTENT[page] || "";
    });
    renderAllCells();
  }

  function clearAll() {
    images = {};
    SLOTS.forEach(function (slot) {
      cellEl(slot.side, slot.name).value = "";
    });
    renderAllCells();
  }

  // --- Print rendering: bold/italic/lists, dividers ---

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // {red}text{/red}: colored text within one line. Repeated so a color can
  // sit inside another one ({red}a {blue}b{/blue} c{/red}).
  var COLORS = ["red", "orange", "yellow", "green", "blue", "purple", "pink", "gray"];
  var COLOR_RE = new RegExp("\\{(" + COLORS.join("|") + ")\\}(.+?)\\{\\/\\1\\}", "g");

  function inlineMd(escaped) {
    var text = escaped;
    var prev;
    do {
      prev = text;
      text = text.replace(COLOR_RE, '<span class="ink-$1">$2</span>');
    } while (text !== prev);
    text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
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

  // --- Site language: English (the text in the page), Russian or
  // Esperanto. It sets the interface, the help and the words presets print
  // (month names, titles, the Yatzy sheet).
  var LANGS = ["en", "ru", "eo"];
  var siteLang = "en";

  function uiLang() {
    return siteLang;
  }

  // English text -> the current language; "{n}" gets n.
  function t(text, n) {
    var table = (window.FOLDLET_I18N || {})[siteLang] || {};
    var out = table.hasOwnProperty(text) ? table[text] : text;
    return n === undefined ? out : out.replace("{n}", n);
  }

  // Chrome has no Esperanto date names, so Esperanto gets its own
  // formatter for the few formats Foldlet uses; other languages use Intl.
  var EO_MONTHS = ["januaro", "februaro", "marto", "aprilo", "majo", "junio", "julio", "aŭgusto",
    "septembro", "oktobro", "novembro", "decembro"];
  var EO_DAYS = ["dimanĉo", "lundo", "mardo", "merkredo", "ĵaŭdo", "vendredo", "sabato"];

  function dateFmt(lang, opts) {
    if (lang !== "eo") return new Intl.DateTimeFormat(lang, opts);
    function format(d) {
      var day = EO_DAYS[d.getDay()];
      var month = EO_MONTHS[d.getMonth()];
      if (opts.weekday && opts.day) return day + ", " + d.getDate() + "-a de " + month;
      if (opts.weekday === "long") return day;
      if (opts.weekday === "narrow") return day.charAt(0).toUpperCase();
      if (opts.weekday) return day.slice(0, 2);
      if (opts.day) return d.getDate() + "-a de " + month + (opts.year ? " " + d.getFullYear() : "");
      if (opts.month === "short") return month.slice(0, 3);
      return month;
    }
    return {
      format: format,
      formatRange: function (a, b) {
        if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return a.getDate() + "–" + format(b);
        if (a.getFullYear() === b.getFullYear()) return a.getDate() + "-a de " + EO_MONTHS[a.getMonth()] + " – " + format(b);
        return format(a) + " – " + format(b);
      },
    };
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

  // 1 = Monday ... 7 = Sunday, from the browser's locale where supported.
  function firstDayOfWeek(lang) {
    try {
      var loc = new Intl.Locale(lang);
      var info = loc.getWeekInfo ? loc.getWeekInfo() : loc.weekInfo;
      if (info && info.firstDay) return info.firstDay;
    } catch (e) {}
    return 1;
  }

  // {{calendar [period] [month|3months|week|year] [mon|sun]}}, words in any
  // order. The period is YYYY, YYYY-MM or YYYY-MM-DD (any day of the
  // week); missing = today. The view defaults to month (year if only a
  // year is given); the first day of the week to the browser's locale.
  var CAL_VIEWS = ["month", "3months", "week", "year"];

  function parseCalendarArgs(arg) {
    var now = new Date();
    var o = { view: "", year: now.getFullYear(), month: now.getMonth(), day: now.getDate(), start: 0 };
    var yearOnly = false;
    (arg || "").split(/\s+/).filter(Boolean).forEach(function (w) {
      var lw = w.toLowerCase();
      var m;
      if (CAL_VIEWS.indexOf(lw) !== -1) o.view = lw;
      else if (lw === "mon") o.start = 1;
      else if (lw === "sun") o.start = 7;
      else if ((m = /^(\d{4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?$/.exec(w))) {
        o.year = +m[1];
        yearOnly = !m[2];
        o.month = m[2] && +m[2] >= 1 && +m[2] <= 12 ? +m[2] - 1 : 0;
        var dim = new Date(o.year, o.month + 1, 0).getDate();
        o.day = m[3] && +m[3] >= 1 && +m[3] <= dim ? +m[3] : 1;
      }
    });
    if (!o.view) o.view = yearOnly ? "year" : "month";
    return o;
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function isWeekend(dow) {
    return dow === 0 || dow === 6;
  }

  // One month: its title and a 7-column grid. startDay uses getDay()
  // numbering (0 = Sunday). sixRows pads every month to 6 week rows so the
  // months of a year line up.
  function monthBlock(year, month, startDay, lang, opts) {
    var first = new Date(year, month, 1);
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var monthName = dateFmt(lang, { month: "long" }).format(first);
    var title = capitalize(monthName) + (opts.noYear ? "" : " " + year);
    var weekdayFmt = dateFmt(lang, { weekday: opts.narrow ? "narrow" : "short" });
    var head = "";
    for (var i = 0; i < 7; i++) {
      // 2023-01-01 was a Sunday, so day (1 + n) has getDay() === n.
      var wd = (startDay + i) % 7;
      head += '<div class="cal-head' + (isWeekend(wd) ? " cal-weekend" : "") + '">' +
        escapeHtml(weekdayFmt.format(new Date(2023, 0, 1 + wd))) + "</div>";
    }
    var lead = (first.getDay() - startDay + 7) % 7;
    var total = opts.sixRows ? 42 : Math.ceil((lead + daysInMonth) / 7) * 7;
    var cells = "";
    for (var c = 0; c < total; c++) {
      var day = c - lead + 1;
      var cls = "cal-day" + (isWeekend((startDay + c) % 7) ? " cal-weekend" : "");
      cells += day >= 1 && day <= daysInMonth
        ? '<div class="' + cls + '">' + day + "</div>"
        : '<div class="' + cls + ' cal-empty"></div>';
    }
    return '<div class="cal-month">' +
      '<div class="cal-title">' + escapeHtml(title) + "</div>" +
      '<div class="cal-grid" style="grid-template-rows:auto repeat(' + total / 7 + ',1fr)">' + head + cells + "</div></div>";
  }

  // A week: one row per day, room to write in each.
  function weekBlock(o, startDay, lang) {
    var anchor = new Date(o.year, o.month, o.day);
    var first = new Date(o.year, o.month, o.day - ((anchor.getDay() - startDay + 7) % 7));
    var last = new Date(first.getFullYear(), first.getMonth(), first.getDate() + 6);
    var rangeFmt = dateFmt(lang, { day: "numeric", month: "long", year: "numeric" });
    var title = rangeFmt.formatRange ? rangeFmt.formatRange(first, last) : rangeFmt.format(first) + " – " + rangeFmt.format(last);
    var dayFmt = dateFmt(lang, { weekday: "long", day: "numeric", month: "long" });
    var rows = "";
    for (var i = 0; i < 7; i++) {
      var d = new Date(first.getFullYear(), first.getMonth(), first.getDate() + i);
      rows += '<div class="cal-wday' + (isWeekend(d.getDay()) ? " cal-weekend" : "") + '">' +
        escapeHtml(capitalize(dayFmt.format(d))) + "</div>";
    }
    return '<div class="cal-title">' + escapeHtml(title) + '</div><div class="cal-week">' + rows + "</div>";
  }

  function renderCalendar(arg) {
    var lang = uiLang();
    var o = parseCalendarArgs(arg);
    var startDay = (o.start || firstDayOfWeek(navigator.language || "en")) % 7; // JS getDay(): 0 = Sunday
    var inner;
    if (o.view === "week") {
      inner = weekBlock(o, startDay, lang);
    } else if (o.view === "3months") {
      inner = '<div class="cal-months">';
      for (var k = -1; k <= 1; k++) {
        var d = new Date(o.year, o.month + k, 1);
        inner += monthBlock(d.getFullYear(), d.getMonth(), startDay, lang, {});
      }
      inner += "</div>";
    } else if (o.view === "year") {
      inner = '<div class="cal-title">' + o.year + '</div><div class="cal-year">';
      for (var m = 0; m < 12; m++) {
        inner += monthBlock(o.year, m, startDay, lang, { noYear: true, narrow: true, sixRows: true });
      }
      inner += "</div>";
    } else {
      inner = monthBlock(o.year, o.month, startDay, lang, {});
    }
    return presetBlock("calendar cal-view-" + o.view, inner);
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
    eo: ["Sano", "Kariero", "Mono", "Amo", "Familio", "Amikoj", "Kresko", "Amuzo"],
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

  // --- Mandala to color in ---
  //
  // {{mandala 483920}}: the number seeds a random generator, so the same
  // line always draws the same mandala (it survives re-rendering and
  // Export/Import), while each Apply picks a new number. Any text works as
  // a seed too. Rings are drawn from the outside in, every shape filled
  // white, so each ring's shapes neatly cover the one before: the result
  // is a set of closed regions to color.

  function seededRandom(seedText) {
    var h = 2166136261;
    for (var i = 0; i < seedText.length; i++) h = Math.imul(h ^ seedText.charCodeAt(i), 16777619);
    var a = h >>> 0;
    return function () {
      // mulberry32
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function renderMandala(arg) {
    var seed = String(arg || "1").trim();
    var rand = seededRandom(seed);
    var pick = function (list) {
      return list[Math.floor(rand() * list.length)];
    };
    var between = function (lo, hi) {
      return lo + rand() * (hi - lo);
    };
    var f = function (n) {
      return n.toFixed(2);
    };
    var pt = function (r, a) {
      return f(r * Math.cos(a)) + " " + f(r * Math.sin(a));
    };
    var circle = function (r) {
      return '<circle r="' + f(r) + '"/>';
    };

    // Ring boundaries: a centre disc, then 5-7 rings of varied width.
    var R = 96;
    var centre = between(6, 10);
    var count = 5 + Math.floor(rand() * 3);
    var weights = [];
    var sum = 0;
    for (var i = 0; i < count; i++) {
      weights.push(between(0.7, 1.6));
      sum += weights[i];
    }
    var edges = [centre];
    for (i = 0; i < count; i++) edges.push(edges[i] + ((R - centre) * weights[i]) / sum);

    var base = pick([8, 10, 12, 16]);
    var svg = "";

    // Each motif fills the ring r0..r1 with m copies around the circle.
    var MOTIFS = {
      // Pointed petals, often with a smaller petal inside.
      petals: function (r0, r1, m, off) {
        var out = "";
        var w = (Math.PI / m) * between(0.75, 1);
        var inner = rand() < 0.6;
        for (var k = 0; k < m; k++) {
          var a = (2 * Math.PI * k) / m + off;
          out += petalPath(r0, r1, a, w);
          if (inner) out += petalPath(r0 + (r1 - r0) * 0.22, r1 - (r1 - r0) * 0.25, a, w * 0.45);
        }
        return out;
      },
      // Rounded lobes; at full width they touch and make a scalloped ring.
      lobes: function (r0, r1, m, off) {
        var out = "";
        var w = (Math.PI / m) * pick([1, 1, 0.85]);
        var inner = rand() < 0.5;
        for (var k = 0; k < m; k++) {
          var a = (2 * Math.PI * k) / m + off;
          out += lobePath(r0, r1, a, w);
          if (inner) out += lobePath(r0, r0 + (r1 - r0) * 0.55, a, w * 0.55);
        }
        return out;
      },
      // A ring of circles, sometimes with a dot or a second circle inside.
      beads: function (r0, r1, m, off) {
        var out = "";
        var rm = (r0 + r1) / 2;
        var c = Math.min((r1 - r0) / 2, rm * Math.sin(Math.PI / m)) * 0.92;
        var inner = pick([0, 0.5, 0.22]);
        for (var k = 0; k < m; k++) {
          var a = (2 * Math.PI * k) / m + off;
          var x = f(rm * Math.cos(a));
          var y = f(rm * Math.sin(a));
          out += '<circle cx="' + x + '" cy="' + y + '" r="' + f(c) + '"/>';
          if (inner) out += '<circle cx="' + x + '" cy="' + y + '" r="' + f(c * inner) + '"/>';
        }
        return out;
      },
      // A star of triangular teeth, sometimes doubled.
      teeth: function (r0, r1, m, off) {
        var star = function (rIn, rOut, shift) {
          var d = "";
          for (var k = 0; k < m; k++) {
            var a = (2 * Math.PI * k) / m + off + shift;
            d += (k ? "L" : "M") + pt(rIn, a - Math.PI / m) + "L" + pt(rOut, a);
          }
          return '<path d="' + d + 'Z"/>';
        };
        var out = star(r0, r1, 0);
        if (rand() < 0.5) out += star(r0, r0 + (r1 - r0) * 0.55, Math.PI / m);
        return out;
      },
      // Diamonds standing on the ring, with a smaller one inside.
      diamonds: function (r0, r1, m, off) {
        var out = "";
        var rm = (r0 + r1) / 2;
        var w = (Math.PI / m) * 0.8;
        for (var k = 0; k < m; k++) {
          var a = (2 * Math.PI * k) / m + off;
          out += '<path d="M' + pt(r0, a) + "L" + pt(rm, a - w) + "L" + pt(r1, a) + "L" + pt(rm, a + w) + 'Z"/>';
          out += '<path d="M' + pt(r0 + (r1 - r0) * 0.25, a) + "L" + pt(rm, a - w * 0.45) + "L" +
            pt(r1 - (r1 - r0) * 0.25, a) + "L" + pt(rm, a + w * 0.45) + 'Z"/>';
        }
        return out;
      },
    };

    function petalPath(r0, r1, a, w) {
      var d = r1 - r0;
      return '<path d="M' + pt(r0, a) +
        "C" + pt(r0 + d * 0.35, a - w) + " " + pt(r0 + d * 0.85, a - w * 0.55) + " " + pt(r1, a) +
        "C" + pt(r0 + d * 0.85, a + w * 0.55) + " " + pt(r0 + d * 0.35, a + w) + " " + pt(r0, a) + 'Z"/>';
    }

    function lobePath(r0, r1, a, w) {
      var top = r1 + (r1 - r0) * 0.12;
      return '<path d="M' + pt(r0, a - w) + "C" + pt(top, a - w) + " " + pt(top, a + w) + " " + pt(r0, a + w) + 'Z"/>';
    }

    var names = Object.keys(MOTIFS);
    var last = "";
    for (i = count - 1; i >= 0; i--) {
      var r0 = edges[i];
      var r1 = edges[i + 1];
      var rm = (r0 + r1) / 2;
      // Outer rings are longer, so they can hold more copies.
      var m = rm > 45 && rand() < 0.5 ? base * 2 : rm < 22 && base >= 12 ? base / 2 : base;
      var name;
      do {
        name = pick(names);
      } while (name === last);
      last = name;
      var off = rand() < 0.5 ? 0 : Math.PI / m;
      svg += circle(r1);
      // Sometimes a second, offset layer peeks out from behind.
      if ((name === "petals" || name === "lobes") && rand() < 0.4) {
        svg += MOTIFS[name](r0, r1 - (r1 - r0) * 0.2, m, off + Math.PI / m);
      }
      svg += MOTIFS[name](r0, r1, m, off);
    }

    // Centre: a disc with a small flower.
    svg += circle(centre);
    var cn = pick([5, 6, 8]);
    for (i = 0; i < cn; i++) svg += petalPath(centre * 0.25, centre * 0.9, (2 * Math.PI * i) / cn, Math.PI / cn);
    svg += circle(centre * 0.25);

    return presetBlock(
      "mandala",
      '<div class="mandala-title">' + ({ ru: "Мандала ", eo: "Mandalo " }[uiLang()] || "Mandala ") + escapeHtml(seed) + "</div>" +
      '<svg class="preset-svg" xmlns="http://www.w3.org/2000/svg" viewBox="-98 -98 196 196" preserveAspectRatio="xMidYMid meet">' +
        '<g fill="#fff" stroke="#222" stroke-width="0.7" stroke-linejoin="round">' + svg + "</g></svg>"
    );
  }

  // --- Sudoku ---
  //
  // {{sudoku 483920 medium 4}}: seed, level (easy / medium / hard) and how
  // many puzzles share the page (1, 2, 4 or 6). Like the mandala, the seed
  // makes the same line always produce the same puzzles. Every puzzle has
  // exactly one solution. The levels differ in what it takes to solve:
  //   easy   - ~38 givens; "only one digit fits this cell" all the way;
  //   medium - ~30 givens; also "this digit fits only one cell in a row,
  //            column or box";
  //   hard   - as few givens as uniqueness allows, and those two rules
  //            alone are not enough.

  var SUDOKU_LEVELS = { easy: 38, medium: 30, hard: 0 };
  var SUDOKU_COUNTS = [1, 2, 4, 6];
  var SUDOKU_LAYOUT = { 1: [1, 1], 2: [1, 2], 4: [2, 2], 6: [2, 3] }; // columns, rows

  function shuffled(list, rand) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  // A random full grid: the classic pattern, with rows shuffled within
  // bands, bands shuffled, the same for columns, and the digits relabelled.
  function sudokuSolution(rand) {
    var order = function () {
      var out = [];
      shuffled([0, 1, 2], rand).forEach(function (band) {
        shuffled([0, 1, 2], rand).forEach(function (r) {
          out.push(band * 3 + r);
        });
      });
      return out;
    };
    var rows = order();
    var cols = order();
    var digits = shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9], rand);
    var grid = [];
    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        grid.push(digits[(3 * (rows[r] % 3) + Math.floor(rows[r] / 3) + cols[c]) % 9]);
      }
    }
    return grid;
  }

  var SUDOKU_UNITS = (function () {
    var units = [];
    for (var i = 0; i < 9; i++) {
      var row = [];
      var col = [];
      var box = [];
      for (var j = 0; j < 9; j++) {
        row.push(i * 9 + j);
        col.push(j * 9 + i);
        box.push((Math.floor(i / 3) * 3 + Math.floor(j / 3)) * 9 + (i % 3) * 3 + (j % 3));
      }
      units.push(row, col, box);
    }
    return units;
  })();

  // Bit mask of the digits that can still go in cell i (bit d = digit d).
  function sudokuCandidates(grid, i) {
    var r = Math.floor(i / 9);
    var c = i % 9;
    var used = 0;
    for (var k = 0; k < 9; k++) {
      used |= 1 << grid[r * 9 + k];
      used |= 1 << grid[k * 9 + c];
    }
    var br = r - (r % 3);
    var bc = c - (c % 3);
    for (var dr = 0; dr < 3; dr++) {
      for (var dc = 0; dc < 3; dc++) used |= 1 << grid[(br + dr) * 9 + bc + dc];
    }
    return ~used & 0x3fe;
  }

  function bitCount(m) {
    var n = 0;
    for (; m; m &= m - 1) n++;
    return n;
  }

  // Number of solutions, stopping at `limit`.
  function sudokuCount(grid, limit) {
    var best = -1;
    var bestMask = 0;
    var bestN = 10;
    for (var i = 0; i < 81; i++) {
      if (grid[i]) continue;
      var m = sudokuCandidates(grid, i);
      var n = bitCount(m);
      if (n < bestN) {
        best = i;
        bestMask = m;
        bestN = n;
        if (n < 2) break;
      }
    }
    if (best === -1) return 1;
    var count = 0;
    for (var d = 1; d <= 9 && count < limit; d++) {
      if (!(bestMask & (1 << d))) continue;
      grid[best] = d;
      count += sudokuCount(grid, limit - count);
    }
    grid[best] = 0;
    return count;
  }

  // Solves with naked singles (and, if `hidden`, hidden singles) only;
  // true if that fills the whole grid.
  function sudokuSinglesSolve(puzzle, hidden) {
    var grid = puzzle.slice();
    var progress = true;
    while (progress) {
      progress = false;
      for (var i = 0; i < 81; i++) {
        if (grid[i]) continue;
        var m = sudokuCandidates(grid, i);
        if (!m) return false;
        if (bitCount(m) === 1) {
          grid[i] = Math.log2(m);
          progress = true;
        }
      }
      if (progress || !hidden) continue;
      for (var u = 0; u < SUDOKU_UNITS.length && !progress; u++) {
        for (var d = 1; d <= 9 && !progress; d++) {
          var spot = -1;
          var spots = 0;
          var unit = SUDOKU_UNITS[u];
          for (var k = 0; k < 9; k++) {
            if (grid[unit[k]] === d) {
              spots = -1;
              break;
            }
            if (!grid[unit[k]] && sudokuCandidates(grid, unit[k]) & (1 << d)) {
              spot = unit[k];
              spots++;
            }
          }
          if (spots === 1) {
            grid[spot] = d;
            progress = true;
          }
        }
      }
    }
    return grid.indexOf(0) === -1;
  }

  // Takes givens away (in symmetric pairs) while the puzzle keeps a unique
  // solution and stays solvable with the level's techniques.
  function sudokuPuzzle(rand, level) {
    var target = SUDOKU_LEVELS[level];
    var solution = sudokuSolution(rand);
    var puzzle = solution.slice();
    var clues = 81;
    var cells = shuffled(Array.apply(null, Array(41)).map(function (_, i) { return i; }), rand);
    for (var k = 0; k < cells.length && clues > target; k++) {
      var a = cells[k];
      var b = 80 - a;
      var saved = [puzzle[a], puzzle[b]];
      puzzle[a] = 0;
      puzzle[b] = 0;
      var ok = sudokuCount(puzzle.slice(), 2) === 1 &&
        (level === "hard" || sudokuSinglesSolve(puzzle, level === "medium"));
      if (ok) {
        clues -= a === b ? 1 : 2;
      } else {
        puzzle[a] = saved[0];
        puzzle[b] = saved[1];
      }
    }
    // Hard: then single cells too, giving up symmetry for fewer givens.
    if (level === "hard") {
      shuffled(Array.apply(null, Array(81)).map(function (_, i) { return i; }), rand).forEach(function (i) {
        if (!puzzle[i]) return;
        var d = puzzle[i];
        puzzle[i] = 0;
        if (sudokuCount(puzzle.slice(), 2) !== 1) puzzle[i] = d;
      });
    }
    return puzzle;
  }

  var sudokuCache = {};

  function sudokuFor(seed, level) {
    var key = seed + " " + level;
    if (!sudokuCache[key]) {
      var rand = seededRandom(key);
      var puzzle = sudokuPuzzle(rand, level);
      // A "hard" puzzle that the simple rules can still crack is redrawn
      // (a few tries; random removal usually gets there).
      for (var t = 0; level === "hard" && t < 20 && sudokuSinglesSolve(puzzle, true); t++) {
        puzzle = sudokuPuzzle(rand, level);
      }
      sudokuCache[key] = puzzle;
    }
    return sudokuCache[key];
  }

  var SUDOKU_TEXT = {
    ru: { title: "Судоку", easy: "лёгкий", medium: "средний", hard: "сложный" },
    en: { title: "Sudoku", easy: "easy", medium: "medium", hard: "hard" },
    eo: { title: "Sudoko", easy: "facila", medium: "meza", hard: "malfacila" },
  };

  function parseSudokuArgs(arg) {
    var opts = { seed: "1", level: "medium", count: 1 };
    var seedSet = false;
    (arg || "").split(/\s+/).filter(Boolean).forEach(function (w) {
      var lw = w.toLowerCase();
      if (SUDOKU_LEVELS.hasOwnProperty(lw)) opts.level = lw;
      else if (/^\d$/.test(w) && SUDOKU_COUNTS.indexOf(+w) !== -1) opts.count = +w;
      else if (!seedSet) {
        opts.seed = w;
        seedSet = true;
      }
    });
    return opts;
  }

  // All the page's puzzles in one SVG (90 units per grid), so they scale
  // together to whatever room the page has.
  function renderSudoku(arg) {
    var opts = parseSudokuArgs(arg);
    var txt = (SUDOKU_TEXT[uiLang()] || SUDOKU_TEXT.en);
    var layout = SUDOKU_LAYOUT[opts.count];
    var gap = 9;
    var size = 90;
    var svg = "";
    for (var n = 0; n < opts.count; n++) {
      var puzzle = sudokuFor(opts.seed + (n ? "-" + (n + 1) : ""), opts.level);
      var ox = (n % layout[0]) * (size + gap);
      var oy = Math.floor(n / layout[0]) * (size + gap);
      var g = '<g transform="translate(' + ox + " " + oy + ')">';
      for (var i = 0; i < 81; i++) {
        if (!puzzle[i]) continue;
        g += '<text x="' + ((i % 9) * 10 + 5) + '" y="' + (Math.floor(i / 9) * 10 + 5) + '">' + puzzle[i] + "</text>";
      }
      var thin = "";
      var thick = "";
      for (var k = 1; k < 9; k++) {
        var line = '<path d="M' + k * 10 + " 0V90M0 " + k * 10 + 'H90"/>';
        if (k % 3) thin += line;
        else thick += line;
      }
      g += '<g class="sudoku-thin">' + thin + '</g><g class="sudoku-thick">' + thick +
        '<rect width="90" height="90" fill="none"/></g>';
      if (opts.count > 1) g += '<text class="sudoku-num" x="0" y="-2">' + (n + 1) + "</text>";
      svg += g + "</g>";
    }
    var top = opts.count > 1 ? 5 : 1;
    var w = layout[0] * size + (layout[0] - 1) * gap;
    var h = layout[1] * size + (layout[1] - 1) * gap;
    return presetBlock(
      "sudoku",
      '<div class="sudoku-title">' + txt.title + " · " + txt[opts.level] + " · " + escapeHtml(opts.seed) + "</div>" +
        '<svg class="preset-svg" xmlns="http://www.w3.org/2000/svg" viewBox="-1 ' + -top + " " + (w + 2) + " " + (h + top + 1) +
        '" preserveAspectRatio="xMidYMin meet">' + svg + "</svg>"
    );
  }

  // --- 100 hours / 100 days tracker ---
  //
  // {{hours 2026-11-25 14:30 squares marks hints}}
  // {{days 2026-11-25 circles marks}}
  // Words after the name go in any order:
  //   date [+ time]      the start (days ignore the time); without a date
  //                      the Start/End fields print blank, to fill by hand
  //   squares | circles  cell shape (default squares)
  //   marks              hours: mark the cell each midnight falls in, with
  //                      the new day's date; days: mark each 1st of the
  //                      month, with the month's short name
  //   hints              in every cell, the moment to shade it in: for
  //                      hours the time that hour ends (15:30, 16:30, ...),
  //                      for days the day itself (25, 26, ...)
  // hours: End = start + 100 real hours (so across a DST change the
  //        wall-clock end shifts by an hour, which is correct).
  // days:  day 1 is the start date, End is day 100 (start + 99 days).
  // Either way the 100th cell's hint is the End.

  var TRACKER_TEXT = {
    ru: { start: "Начало", end: "Конец" },
    en: { start: "Start", end: "End" },
    eo: { start: "Komenco", end: "Fino" },
  };

  function trackerText() {
    return TRACKER_TEXT[uiLang().slice(0, 2).toLowerCase()] || TRACKER_TEXT.en;
  }

  function parseTrackerArgs(arg) {
    var opts = { start: null, shape: "squares", marks: false, hints: false };
    var date = null;
    var time = [0, 0];
    (arg || "").split(/\s+/).forEach(function (tok) {
      var d = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(tok);
      var t = /^(\d{1,2}):(\d{2})$/.exec(tok);
      var word = tok.toLowerCase();
      if (d) date = [+d[1], +d[2] - 1, +d[3]];
      else if (t) time = [+t[1], +t[2]];
      else if (word === "circles" || word === "squares") opts.shape = word;
      else if (word === "marks") opts.marks = true;
      else if (word === "hints") opts.hints = true;
    });
    if (date) {
      var start = new Date(date[0], date[1], date[2], time[0], time[1]);
      if (!isNaN(start.getTime())) opts.start = start;
    }
    return opts;
  }

  function formatDate(d) {
    var wd = dateFmt(uiLang(), { weekday: "short" }).format(d);
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()) + " (" + wd + ")";
  }

  function formatDateTime(d) {
    var wd = dateFmt(uiLang(), { weekday: "short" }).format(d);
    return (
      d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()) +
      " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + " (" + wd + ")"
    );
  }

  // What differs between the two trackers: the start, the end, the format,
  // each cell's hint (lines of text) and which cells get a mark (returns
  // the mark's label, or null).
  var TRACKER_UNITS = {
    hours: {
      start: function (s) {
        return s;
      },
      end: function (s) {
        return new Date(s.getTime() + 100 * 3600e3);
      },
      format: formatDateTime,
      // The time cell i's hour is done, as two rows: "11" over "23".
      hint: function (s, i) {
        var t = new Date(s.getTime() + (i + 1) * 3600e3);
        return [pad2(t.getHours()), pad2(t.getMinutes())];
      },
      // Cell i covers [start + i h, start + (i+1) h): the midnight in it.
      mark: function (s, i) {
        var from = new Date(s.getTime() + i * 3600e3);
        var to = new Date(s.getTime() + (i + 1) * 3600e3);
        var m = new Date(from.getFullYear(), from.getMonth(), from.getDate());
        if (m < from) m = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1);
        return m < to ? String(m.getDate()) : null;
      },
    },
    days: {
      start: function (s) {
        return new Date(s.getFullYear(), s.getMonth(), s.getDate());
      },
      end: function (s) {
        return new Date(s.getFullYear(), s.getMonth(), s.getDate() + 99);
      },
      format: formatDate,
      // Cell i is day start + i: its day of the month.
      hint: function (s, i) {
        return [String(new Date(s.getFullYear(), s.getMonth(), s.getDate() + i).getDate())];
      },
      // Cell i is day start + i: marked when it's the 1st of a month.
      mark: function (s, i) {
        var d = new Date(s.getFullYear(), s.getMonth(), s.getDate() + i);
        if (d.getDate() !== 1) return null;
        return dateFmt(uiLang(), { month: "short" }).format(d).replace(/\.$/, "");
      },
    },
  };

  function textAt(cls, x, y, text) {
    return '<text class="' + cls + '" x="' + x + '" y="' + y + '">' + escapeHtml(text) + "</text>";
  }

  function renderTracker(unitName, arg) {
    var unit = TRACKER_UNITS[unitName];
    var o = parseTrackerArgs(arg);
    var txt = trackerText();
    var start = o.start ? unit.start(o.start) : null;
    var end = start ? unit.end(start) : null;

    function field(label, date) {
      return (
        '<div class="tracker-field"><span class="tracker-label">' + escapeHtml(label) + "</span>" +
        (date
          ? '<span class="tracker-value">' + escapeHtml(unit.format(date)) + "</span>"
          : '<span class="tracker-blank"></span>') +
        "</div>"
      );
    }

    // Drawn in ~mm viewBox units: 10 x 10 cells of 6.
    var S = 6;
    var circles = o.shape === "circles";
    var cells = "";
    var marks = "";
    for (var i = 0; i < 100; i++) {
      var x = (i % 10) * S;
      var y = Math.floor(i / 10) * S;
      var mark = o.marks && start ? unit.mark(start, i) : null;
      if (circles) {
        cells += '<circle cx="' + (x + S / 2) + '" cy="' + (y + S / 2) + '" r="2.45"' +
          (mark ? ' class="tracker-mark-outline"' : "") + "/>";
      } else {
        cells += '<rect x="' + x + '" y="' + y + '" width="' + S + '" height="' + S + '"/>';
        if (mark) {
          marks += '<line class="tracker-mark-line" x1="' + x + '" y1="' + y + '" x2="' + x + '" y2="' + (y + S) + '"/>';
        }
      }
      var hint = o.hints && start ? unit.hint(start, i) : null;
      var cx = x + S / 2;
      if (hint && mark && circles) {
        // No room for a corner label in a circle: the mark takes the top
        // row and the hint squeezes into one row below it.
        marks += textAt("tracker-mark tracker-mark-mid", cx, y + 2.8, mark);
        marks += textAt("tracker-hint tracker-hint-tight", cx, y + 4.5, hint.join(":"));
      } else {
        if (hint) {
          // Squares sit a bit lower, clear of the corner mark label.
          var base = circles ? 0 : 0.25;
          var rows = hint.length === 2 ? [y + 2.75 + base, y + 4.45 + base] : [y + 3.6 + base];
          for (var r = 0; r < hint.length; r++) marks += textAt("tracker-hint", cx, rows[r], hint[r]);
        }
        if (mark) {
          marks += circles
            ? textAt("tracker-mark tracker-mark-mid", cx, y + S / 2 + 0.5, mark)
            : textAt("tracker-mark", x + 0.7, y + 1.7, mark);
        }
      }
    }

    return presetBlock(
      "tracker",
      '<div class="tracker-title">100 ' + unitName + " challenge</div>" +
        '<div class="tracker-fields">' + field(txt.start, start) + field(txt.end, end) + "</div>" +
        '<svg class="tracker-grid" xmlns="http://www.w3.org/2000/svg" viewBox="-0.3 -0.3 60.6 60.6"' +
        ' preserveAspectRatio="xMidYMin meet"><g class="tracker-cells">' + cells + "</g>" + marks + "</svg>"
    );
  }

  // Yatzy score sheet (Scandinavian rules): {{yatzy N}}, N = 1-6 player
  // columns. Each row says how it scores, in small grey print.
  var YATZY_ROWS = {
    ru: [
      ["Единицы", "сумма 1"], ["Двойки", "сумма 2"], ["Тройки", "сумма 3"],
      ["Четвёрки", "сумма 4"], ["Пятёрки", "сумма 5"], ["Шестёрки", "сумма 6"],
      ["Сумма", "", "sum"], ["Бонус", "63+ → 50", "sum"],
      ["Пара", "2 одинак."], ["Две пары", "2 + 2"], ["Тройка", "3 одинак."],
      ["Каре", "4 одинак."], ["Малый стрит", "1–5 = 15"], ["Большой стрит", "2–6 = 20"],
      ["Фулл-хаус", "3 + 2"], ["Шанс", "все кубики"], ["Yatzy", "5 одинак. = 50"],
      ["Итого", "", "total"],
    ],
    en: [
      ["Ones", "sum of 1s"], ["Twos", "sum of 2s"], ["Threes", "sum of 3s"],
      ["Fours", "sum of 4s"], ["Fives", "sum of 5s"], ["Sixes", "sum of 6s"],
      ["Sum", "", "sum"], ["Bonus", "63+ → 50", "sum"],
      ["One pair", "2 alike"], ["Two pairs", "2 + 2"], ["Three of a kind", "3 alike"],
      ["Four of a kind", "4 alike"], ["Small straight", "1–5 = 15"], ["Large straight", "2–6 = 20"],
      ["Full house", "3 + 2"], ["Chance", "all dice"], ["Yatzy", "5 alike = 50"],
      ["Total", "", "total"],
    ],
    eo: [
      ["Unuoj", "sumo de 1"], ["Duoj", "sumo de 2"], ["Trioj", "sumo de 3"],
      ["Kvaroj", "sumo de 4"], ["Kvinoj", "sumo de 5"], ["Sesoj", "sumo de 6"],
      ["Sumo", "", "sum"], ["Premio", "63+ → 50", "sum"],
      ["Paro", "2 samaj"], ["Du paroj", "2 + 2"], ["Triopo", "3 samaj"],
      ["Kvaropo", "4 samaj"], ["Malgranda vico", "1–5 = 15"], ["Granda vico", "2–6 = 20"],
      ["Plena domo", "3 + 2"], ["Ŝanco", "ĉiuj kuboj"], ["Yatzy", "5 samaj = 50"],
      ["Entute", "", "total"],
    ],
  };

  function parseYatzyPlayers(arg) {
    var n = parseInt(arg, 10);
    return n >= 1 && n <= 6 ? n : 4;
  }

  function renderYatzy(arg) {
    var players = parseYatzyPlayers(arg);
    var lang = YATZY_ROWS[uiLang()] ? uiLang() : "en";
    var blank = "";
    for (var p = 0; p < players; p++) blank += "<td></td>";
    var html = '<table class="yatzy-table"><colgroup><col class="yatzy-label-col">' +
      new Array(players + 1).join("<col>") + '</colgroup><tr class="yatzy-names"><th>' +
      ({ ru: "Игрок", eo: "Ludanto" }[lang] || "Player") + "</th>" + blank.replace(/td>/g, "th>") + "</tr>";
    YATZY_ROWS[lang].forEach(function (r) {
      html += '<tr' + (r[2] ? ' class="yatzy-' + r[2] + '"' : "") + "><th>" + escapeHtml(r[0]) +
        (r[1] ? '<span class="yatzy-hint">' + escapeHtml(r[1]) + "</span>" : "") + "</th>" + blank + "</tr>";
    });
    return presetBlock("yatzy", '<div class="yatzy-title">Yatzy</div>' + html + "</table>");
  }

  var DIRECTIVES = {
    hours: function (arg) {
      return renderTracker("hours", arg);
    },
    days: function (arg) {
      return renderTracker("days", arg);
    },
    calendar: renderCalendar,
    grid: renderGrid,
    dots: renderDots,
    lines: renderLines,
    checklist: renderChecklist,
    wheel: renderWheel,
    mandala: renderMandala,
    sudoku: renderSudoku,
    yatzy: renderYatzy,
  };

  // The text a preset puts on a page (what "Apply preset" inserts).
  var PRESETS = {
    calendar: calendarDirective,
    yatzy: function () {
      return "{{yatzy " + document.getElementById("yatzy-players").value + "}}";
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
    mandala: function () {
      // A new random seed each time: every Apply draws a new mandala.
      return "{{mandala " + (100000 + Math.floor(Math.random() * 900000)) + "}}";
    },
    sudoku: function () {
      // A new seed each time, like the mandala; level and count from the panel.
      return "{{sudoku " + (100000 + Math.floor(Math.random() * 900000)) + " " +
        document.getElementById("sudoku-level").value + " " + document.getElementById("sudoku-count").value + "}}";
    },
    tracker: trackerDirective,
  };

  // Builds {{calendar ...}} from the panel: the view, its period (a month,
  // a year or any day of the week) and the first day of the week.
  var CAL_PERIOD_INPUT = { month: "cal-month", "3months": "cal-month", year: "cal-year", week: "cal-date" };

  function calendarDirective() {
    var view = document.getElementById("cal-view").value;
    var period = document.getElementById(CAL_PERIOD_INPUT[view]).value.trim();
    return "{{calendar " + (period ? period + " " : "") + view + " " + document.getElementById("cal-start").value + "}}";
  }

  // The three period inputs show the same moment, so switching the view
  // keeps the period.
  function setCalendarInputs(year, month, day) {
    document.getElementById("cal-month").value = year + "-" + pad2(month + 1);
    document.getElementById("cal-year").value = String(year);
    document.getElementById("cal-date").value = year + "-" + pad2(month + 1) + "-" + pad2(day);
  }

  function calendarInputChanged(e) {
    var v = e.target.value;
    var m;
    if (e.target.id === "cal-month" && (m = /^(\d{4})-(\d{2})$/.exec(v))) setCalendarInputs(+m[1], +m[2] - 1, 1);
    else if (e.target.id === "cal-date" && (m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v))) setCalendarInputs(+m[1], +m[2] - 1, +m[3]);
    else if (e.target.id === "cal-year" && /^\d{4}$/.test(v)) {
      var d = /^\d{4}-(\d{2})-(\d{2})$/.exec(document.getElementById("cal-date").value) || [0, "01", "01"];
      setCalendarInputs(+v, +d[1] - 1, Math.min(+d[2], new Date(+v, +d[1], 0).getDate()));
    }
  }

  function localeWeekStart() {
    return firstDayOfWeek(navigator.language || "en") === 7 ? "sun" : "mon";
  }

  // Builds {{hours ...}} / {{days ...}} from the editor's tracker options.
  function trackerDirective() {
    var unit = document.getElementById("tracker-unit").value;
    var parts = [unit];
    if (unit === "hours") {
      var dt = document.getElementById("tracker-start-time").value; // "YYYY-MM-DDTHH:MM" or ""
      if (dt) parts.push(dt.slice(0, 10), dt.slice(11, 16));
    } else {
      var d = document.getElementById("tracker-start-date").value; // "YYYY-MM-DD" or ""
      if (d) parts.push(d);
    }
    parts.push(document.getElementById("tracker-shape").value);
    if (document.getElementById("tracker-marks").checked) parts.push("marks");
    if (document.getElementById("tracker-hints").checked) parts.push("hints");
    return "{{" + parts.join(" ") + "}}";
  }

  // The tracker options row is shown only while the tracker preset is
  // picked. Hours take a date and time, days just a date; both default to
  // now until the user edits them (clearing one gives blank fields).
  function syncPresetOptions() {
    var key = document.getElementById("preset-select").value;
    document.getElementById("tracker-options").hidden = key !== "tracker";
    document.getElementById("mandala-options").hidden = key !== "mandala";
    document.getElementById("sudoku-options").hidden = key !== "sudoku";
    document.getElementById("yatzy-options").hidden = key !== "yatzy";
    syncApplyButton();
    document.getElementById("calendar-options").hidden = key !== "calendar";
    var calInput = CAL_PERIOD_INPUT[document.getElementById("cal-view").value];
    ["cal-month", "cal-year", "cal-date"].forEach(function (id) {
      document.getElementById(id).hidden = id !== calInput;
    });
    var hours = document.getElementById("tracker-unit").value === "hours";
    var timeInput = document.getElementById("tracker-start-time");
    var dateInput = document.getElementById("tracker-start-date");
    timeInput.hidden = !hours;
    dateInput.hidden = hours;
    document.getElementById("tracker-marks-text").textContent = t(hours ? "Day marks" : "Month marks");
    var now = new Date();
    var today = now.getFullYear() + "-" + pad2(now.getMonth() + 1) + "-" + pad2(now.getDate());
    if (!timeInput.dataset.touched) timeInput.value = today + "T" + pad2(now.getHours()) + ":" + pad2(now.getMinutes());
    if (!dateInput.dataset.touched) dateInput.value = today;
  }

  // --- Tables: markdown pipe tables ---
  //
  //   | Name | Qty |      <- header row, if the next line is a separator
  //   |:-----|----:|      <- optional; colons set the column alignment
  //   | Tea  | 2   |
  //
  // Without a separator line every row is a plain body row.

  var TABLE_SEP_RE = /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?$/;

  function splitTableRow(line) {
    return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(function (c) {
      return c.trim();
    });
  }

  function renderTable(lines) {
    var header = null;
    var aligns = [];
    var body = lines.map(splitTableRow);
    if (lines.length > 1 && TABLE_SEP_RE.test(lines[1].trim())) {
      header = body[0];
      aligns = body[1].map(function (c) {
        var left = c.charAt(0) === ":";
        var right = c.charAt(c.length - 1) === ":";
        return left && right ? "center" : right ? "right" : left ? "left" : "";
      });
      body = body.slice(2);
    }
    var cols = Math.max.apply(null, [header ? header.length : 0].concat(body.map(function (r) {
      return r.length;
    })));
    function row(cells, tag) {
      var html = "";
      for (var i = 0; i < cols; i++) {
        var style = aligns[i] ? ' style="text-align:' + aligns[i] + '"' : "";
        html += "<" + tag + style + ">" + inlineMd(escapeHtml(cells[i] || "")) + "</" + tag + ">";
      }
      return "<tr>" + html + "</tr>";
    }
    return (
      '<table class="md-table">' +
      (header ? "<thead>" + row(header, "th") + "</thead>" : "") +
      "<tbody>" + body.map(function (r) {
        return row(r, "td");
      }).join("") + "</tbody></table>"
    );
  }

  // --- Images: a line of its own holding "![caption][img-1]" (a picture
  // added to the booklet) or "![caption](https://...)" (a web address). ---

  var IMAGE_LINE_RE = /^!\[([^\]]*)\](?:\[([^\]]+)\]|\(([^)\s]+)\))$/;

  function imageSrc(ref) {
    if (images[ref]) return images[ref];
    if (/^(https?:\/\/|data:image\/)/i.test(ref)) return ref;
    return null;
  }

  function renderImage(match) {
    var src = imageSrc(match[2] || match[3]);
    if (!src) return null;
    var alt = escapeHtml(match[1]).replace(/"/g, "&quot;");
    return '<img class="md-img" src="' + escapeHtml(src).replace(/"/g, "&quot;") + '" alt="' + alt + '">';
  }

  // Paragraphs, lists, tables, images and presets (no dividers).
  function renderBlocks(text) {
    var lines = text.split(/\r\n|\r|\n/);
    var htmlParts = [];
    var paraBuffer = [];
    var listBuffer = [];
    var listType = null;
    var tableBuffer = [];

    function flushTable() {
      if (tableBuffer.length) {
        htmlParts.push(renderTable(tableBuffer));
        tableBuffer = [];
      }
    }

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
      if (/^\s*\|/.test(line)) {
        flushList();
        flushPara();
        tableBuffer.push(line);
        return;
      }
      flushTable();
      if (directive && DIRECTIVES[directive[1].toLowerCase()]) {
        flushList();
        flushPara();
        htmlParts.push(DIRECTIVES[directive[1].toLowerCase()](directive[2] || ""));
        return;
      }
      var imageMatch = IMAGE_LINE_RE.exec(line.trim());
      var image = imageMatch && renderImage(imageMatch);
      if (image) {
        flushList();
        flushPara();
        htmlParts.push(image);
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
    flushTable();
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
    syncPresetSelect();
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
    // The page you click becomes the target of the Preset panel too.
    selectPage(side, name);
    syncPresetSelect();
    cellEl(side, name).closest(".cell-inner").classList.add("editing");
  }

  function exitEditMode(side, name) {
    if (currentEditingSlot && currentEditingSlot.side === side && currentEditingSlot.name === name) {
      currentEditingSlot = null;
    }
    renderCell(side, name);
    cellEl(side, name).closest(".cell-inner").classList.remove("editing");
    syncPresetSelect();
  }

  // The rendered view is a plain, non-focusable div, so a click on it can't
  // trigger the textarea's own focus event the way a click on the textarea
  // itself would. Show the textarea first, then focus it explicitly.
  function focusCellForEditing(side, name) {
    enterEditMode(side, name);
    cellEl(side, name).focus();
  }

  // --- Selected page: the last page clicked. Presets and the formatting
  // buttons (when no page is open) work on it; it gets a highlight ring
  // and its number shows in the Preset panel's heading.

  var selected = { side: "front", name: "B1" };

  function selectedSlot() {
    return selected;
  }

  function pageLabel(slot) {
    return t("page {n}", PAGE_NUMBERS[slot.side][slot.name]);
  }

  function selectPage(side, name) {
    selected = { side: side, name: name };
    document.querySelectorAll(".cell.selected").forEach(function (el) {
      el.classList.remove("selected");
    });
    cellEl(side, name).closest(".cell").classList.add("selected");
    document.getElementById("preset-target").textContent = "· " + pageLabel(selected);
  }

  // Replaces the selected page's text with the chosen preset.
  // There is no Apply button: picking a preset (or changing its options)
  // puts it on the selected page right away. A page holding nothing but a
  // preset line is replaced without asking, so trying presets or tweaking
  // tracker options doesn't nag; for a page with text of its own, the View
  // panel's "Ask before replacing text" decides.
  function applyPresetToCell() {
    var key = document.getElementById("preset-select").value;
    if (!PRESETS[key]) return;
    var slot = selectedSlot();
    var el = cellEl(slot.side, slot.name);
    var onlyPreset = DIRECTIVE_RE.test(el.value.trim());
    if (el.value.trim() && !onlyPreset && document.getElementById("ask-replace").checked &&
        !confirm(t("Replace the current text on page {n} with this preset?", PAGE_NUMBERS[slot.side][slot.name]))) {
      syncPresetSelect();
      return;
    }
    el.value = PRESETS[key]();
    renderCell(slot.side, slot.name);
    syncApplyButton();
  }

  // "Apply to page N" shows when a preset is chosen but the selected page
  // doesn't have it yet (picking the same menu entry again isn't a change).
  function syncApplyButton() {
    var key = document.getElementById("preset-select").value;
    var slot = selectedSlot();
    var btn = document.getElementById("btn-apply-preset");
    btn.hidden = !key || presetKeyOf(cellEl(slot.side, slot.name).value) === key;
    btn.textContent = t("Apply to page {n}", PAGE_NUMBERS[slot.side][slot.name]);
  }

  // Which preset (if any) the page's text is: the preset menu shows it, so
  // picking any other entry is a change, and so applies.
  var DIRECTIVE_PRESET = { hours: "tracker", days: "tracker" };

  function presetKeyOf(text) {
    var m = DIRECTIVE_RE.exec(text.trim());
    if (!m) return "";
    var name = m[1].toLowerCase();
    return DIRECTIVE_PRESET[name] || (PRESETS[name] ? name : "");
  }

  function syncPresetSelect() {
    var slot = selectedSlot();
    var text = cellEl(slot.side, slot.name).value;
    var key = presetKeyOf(text);
    // A page with a preset shows it; a page without one keeps the current
    // choice, so the same preset can go onto several pages in a row.
    if (key) document.getElementById("preset-select").value = key;
    // Show the page's own sudoku settings.
    if (key === "sudoku") {
      var opts = parseSudokuArgs(DIRECTIVE_RE.exec(text.trim())[2]);
      document.getElementById("sudoku-level").value = opts.level;
      document.getElementById("sudoku-count").value = String(opts.count);
    }
    if (key === "calendar") {
      var cal = parseCalendarArgs(DIRECTIVE_RE.exec(text.trim())[2]);
      document.getElementById("cal-view").value = cal.view;
      document.getElementById("cal-start").value = cal.start ? (cal.start === 7 ? "sun" : "mon") : localeWeekStart();
      setCalendarInputs(cal.year, cal.month, cal.day);
    }
    if (key === "yatzy") {
      document.getElementById("yatzy-players").value = String(parseYatzyPlayers(DIRECTIVE_RE.exec(text.trim())[2]));
    }
    syncPresetOptions();
  }

  // --- Formatting buttons: wrap the selection in the page being edited
  // (or, if none is, the last page clicked), e.g. "**" ... "**" or
  // "{red}" ... "{/red}". With nothing selected, insert an empty pair with
  // the cursor inside it.
  function wrapSelection(open, close) {
    var ta = editTarget();
    var start = ta.selectionStart;
    var end = ta.selectionEnd;
    var inner = start + open.length;
    replaceRange(ta, start, end, open + ta.value.slice(start, end) + close, inner, inner + (end - start));
  }

  function editTarget() {
    if (!currentEditingSlot) {
      var slot = selectedSlot();
      focusCellForEditing(slot.side, slot.name);
    }
    return cellEl(currentEditingSlot.side, currentEditingSlot.name);
  }

  // Replaces ta's [start, end) with text, keeping undo history where the
  // browser allows it, then selects [selStart, selEnd).
  function replaceRange(ta, start, end, text, selStart, selEnd) {
    ta.focus();
    ta.setSelectionRange(start, end);
    if (!document.execCommand || !document.execCommand("insertText", false, text)) {
      ta.setRangeText(text, start, end, "end");
    }
    ta.setSelectionRange(selStart, selEnd);
  }

  var LIST_PREFIX_RE = { ul: /^[-*]\s+/, ol: /^\d+\.\s+/ };

  // Turns every line touched by the selection into a list item, or, if they
  // already all are items of that kind, back into plain lines. Switching
  // between bullets and numbers replaces the old marker.
  function toggleList(kind) {
    var ta = editTarget();
    var value = ta.value;
    // Whole lines from the selection's first to its last; a selection that
    // ends right after a line break doesn't take in the next line.
    var start = value.lastIndexOf("\n", ta.selectionStart - 1) + 1;
    var selEnd = ta.selectionEnd;
    if (selEnd > ta.selectionStart && value.charAt(selEnd - 1) === "\n") selEnd--;
    var endNl = value.indexOf("\n", selEnd);
    var end = endNl === -1 ? value.length : endNl;
    var lines = value.slice(start, end).split("\n");
    var isItem = function (l) {
      return LIST_PREFIX_RE[kind].test(l);
    };
    var allItems = lines.every(function (l) {
      return l.trim() === "" || isItem(l);
    }) && lines.some(isItem);
    var n = 0;
    var out = lines.map(function (l) {
      var bare = l.replace(LIST_PREFIX_RE.ul, "").replace(LIST_PREFIX_RE.ol, "");
      if (allItems) return bare;
      if (l.trim() === "" && lines.length > 1) return l;
      n++;
      return (kind === "ul" ? "- " : n + ". ") + bare;
    }).join("\n");
    replaceRange(ta, start, end, out, start, start + out.length);
  }

  // Inserts `block` (one or more lines) on lines of its own at `pos`, and
  // puts the cursor right after it. A page textarea that isn't being edited
  // any more (e.g. after a file dialog) is updated and re-rendered.
  function insertLines(ta, pos, block) {
    var value = ta.value;
    var before = pos > 0 && value.charAt(pos - 1) !== "\n" ? "\n" : "";
    var after = pos < value.length && value.charAt(pos) !== "\n" ? "\n" : "";
    if (pos === value.length) after = "\n";
    var text = before + block + after;
    var caret = pos + text.length;
    if (document.activeElement === ta) {
      replaceRange(ta, pos, pos, text, caret, caret);
    } else {
      ta.value = value.slice(0, pos) + text + value.slice(pos);
      ta.setSelectionRange(caret, caret);
    }
    var inner = ta.closest(".cell-inner");
    if (inner && !inner.classList.contains("editing")) {
      var slot = slotOfCell(ta);
      renderCell(slot.side, slot.name);
    }
  }

  function slotOfCell(ta) {
    var parts = ta.id.split("-"); // "cell-front-A1"
    return { side: parts[1], name: parts[2] };
  }

  function insertDivider() {
    var ta = editTarget();
    insertLines(ta, ta.selectionEnd, "---");
  }

  function insertTable() {
    var ta = editTarget();
    insertLines(ta, ta.selectionEnd, ["| A | B | C |", "|---|---|---|", "|   |   |   |", "|   |   |   |"].join("\n"));
  }

  // Pictures are scaled down to at most this many pixels on the long side:
  // a page is ~74 x 105 mm, so this is still ~300 dpi at full page size,
  // and keeps the exported .md reasonably small.
  var IMAGE_MAX_PX = 1400;

  function readImageFile(file, callback) {
    var reader = new FileReader();
    reader.onload = function () {
      var dataUrl = reader.result;
      if (file.type === "image/svg+xml" || file.type === "image/gif") return callback(dataUrl);
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, IMAGE_MAX_PX / Math.max(img.naturalWidth, img.naturalHeight));
        if (scale === 1 && file.size < 400 * 1024) return callback(dataUrl);
        var canvas = document.createElement("canvas");
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        var ctx = canvas.getContext("2d");
        // PNG keeps transparency (drawings, logos); photos go to JPEG.
        var png = file.type === "image/png";
        if (!png) {
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        callback(png ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.88));
      };
      img.onerror = function () {
        alert(t("Couldn't read this image: ") + file.name);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  function imageFiles(list) {
    return Array.prototype.filter.call(list || [], function (f) {
      return /^image\//.test(f.type);
    });
  }

  // Image button: remember where to insert before the file dialog takes
  // focus away (the page being edited closes when it loses focus).
  var imageTarget = null;

  function pickImage() {
    var ta = editTarget();
    imageTarget = { ta: ta, pos: ta.selectionEnd };
    document.getElementById("image-file").click();
  }

  // Adds the pictures to the booklet and inserts one "![][img-N]" line per
  // picture into `ta` at `pos`, in order.
  function insertImages(ta, pos, files) {
    var refs = [];
    var pending = files.length;
    files.forEach(function (file, i) {
      readImageFile(file, function (dataUrl) {
        refs[i] = "![][" + addImage(dataUrl) + "]";
        if (--pending === 0) insertLines(ta, pos, refs.filter(Boolean).join("\n"));
      });
    });
  }

  // --- Tabs, help language and view options ---

  function showTab(name) {
    document.querySelectorAll(".tab").forEach(function (tab) {
      var on = tab.dataset.tab === name;
      tab.classList.toggle("active", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
    });
    document.getElementById("tab-editor").hidden = name !== "editor";
    document.getElementById("tab-help").hidden = name !== "help";
  }

  function readPref(key) {
    try {
      return localStorage.getItem("foldlet." + key);
    } catch (e) {
      return null;
    }
  }

  function writePref(key, value) {
    try {
      localStorage.setItem("foldlet." + key, value);
    } catch (e) {
      /* private mode etc.: just don't remember */
    }
  }

  // Interface text in the top bar, the panel and the side headings is
  // translated in place: each text node and title/aria-label keeps its
  // English original, so switching back and forth always starts from it.
  // Text that app.js sets itself (the page in the Preset heading, the
  // Apply button, the marks label) is redone by its own code.
  var DYNAMIC_TEXT = { "preset-target": 1, "btn-apply-preset": 1, "tracker-marks-text": 1 };

  function translateStatic() {
    document.querySelectorAll(".topbar, .panel, .sheet-label").forEach(function (root) {
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      var node;
      while ((node = walker.nextNode())) {
        if (node.parentNode && DYNAMIC_TEXT[node.parentNode.id]) continue;
        if (node.enText === undefined) {
          if (!node.nodeValue.trim()) continue;
          node.enText = node.nodeValue;
        }
        var key = node.enText.trim();
        node.nodeValue = node.enText.replace(key, t(key));
      }
      root.querySelectorAll("[title], [aria-label]").forEach(function (el) {
        ["title", "aria-label"].forEach(function (attr) {
          if (!el.hasAttribute(attr)) return;
          var prop = attr === "title" ? "enTitle" : "enAria";
          if (el[prop] === undefined) el[prop] = el.getAttribute(attr);
          el.setAttribute(attr, t(el[prop]));
        });
      });
    });
  }

  function setLanguage(lang) {
    siteLang = LANGS.indexOf(lang) !== -1 ? lang : "en";
    document.documentElement.lang = siteLang;
    document.getElementById("site-lang").value = siteLang;
    writePref("lang", siteLang);
    translateStatic();
    document.querySelectorAll(".help-body").forEach(function (el) {
      el.hidden = el.dataset.lang !== siteLang;
    });
    // Redo the text app.js sets, and redraw the pages: presets print
    // month names and titles in the site language.
    selectPage(selected.side, selected.name);
    renderAllCells();
  }

  function initChrome() {
    document.querySelectorAll(".tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        showTab(tab.dataset.tab);
      });
    });

    document.getElementById("site-lang").addEventListener("change", function (e) {
      setLanguage(e.target.value);
    });

    document.querySelectorAll("[data-keep-edit]").forEach(function (btn) {
      // Keep focus (and the selection) in the textarea being edited.
      btn.addEventListener("mousedown", function (e) {
        e.preventDefault();
      });
      btn.addEventListener("click", function () {
        if (btn.dataset.list) toggleList(btn.dataset.list);
        else if (btn.dataset.insert === "divider") insertDivider();
        else if (btn.dataset.insert === "table") insertTable();
        else if (btn.dataset.insert === "image") pickImage();
        else if (btn.dataset.color) wrapSelection("{" + btn.dataset.color + "}", "{/" + btn.dataset.color + "}");
        else wrapSelection(btn.dataset.wrap, btn.dataset.wrap);
      });
    });

    var imageInput = document.getElementById("image-file");
    imageInput.addEventListener("change", function () {
      var files = imageFiles(imageInput.files);
      if (files.length && imageTarget) insertImages(imageTarget.ta, imageTarget.pos, files);
      imageInput.value = "";
    });

    // Paste (Ctrl+V) a picture into a page being edited.
    var textareas = SLOTS.map(function (s) {
      return cellEl(s.side, s.name);
    });
    textareas.forEach(function (ta) {
      ta.addEventListener("paste", function (e) {
        var files = imageFiles(e.clipboardData && e.clipboardData.files);
        if (!files.length) return;
        e.preventDefault();
        insertImages(ta, ta.selectionStart, files);
      });
    });

    // Drop picture files onto a page: added at the cursor if the page is
    // being edited, otherwise at the end of its text.
    function hasFiles(e) {
      return e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types, "Files") !== -1;
    }
    document.querySelectorAll(".cell").forEach(function (el) {
      el.addEventListener("dragover", function (e) {
        if (!hasFiles(e)) return;
        e.preventDefault();
        el.classList.add("drop-target");
      });
      el.addEventListener("dragleave", function () {
        el.classList.remove("drop-target");
      });
      el.addEventListener("drop", function (e) {
        el.classList.remove("drop-target");
        var files = imageFiles(e.dataTransfer && e.dataTransfer.files);
        if (!files.length) return;
        e.preventDefault();
        var ta = el.querySelector("textarea");
        var editing = ta.closest(".cell-inner").classList.contains("editing");
        var pos = editing ? ta.selectionStart : ta.value.length;
        insertImages(ta, pos, files);
      });
    });

    var zoom = document.getElementById("zoom-select");
    var savedZoom = readPref("zoom");
    if (savedZoom && zoom.querySelector('option[value="' + savedZoom + '"]')) zoom.value = savedZoom;
    function syncZoom() {
      document.querySelector(".pages").style.setProperty("--zoom", zoom.value);
      writePref("zoom", zoom.value);
    }
    zoom.addEventListener("change", syncZoom);
    syncZoom();
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
    // Pictures the pages refer to, as markdown reference definitions: any
    // markdown viewer shows them, and Import MD reads them back.
    var used = {};
    text.replace(/\]\[(img-\d+)\]|\]\((img-\d+)\)/g, function (m, a, b) {
      used[a || b] = true;
    });
    var defs = Object.keys(used)
      .filter(function (id) {
        return images[id];
      })
      .map(function (id) {
        return "[" + id + "]: " + images[id];
      });
    if (defs.length) text += "\n" + defs.join("\n\n") + "\n";
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
      // Picture definitions ("[img-1]: data:image/...") are taken out before
      // the split into pages, wherever they are in the file.
      var newImages = {};
      text = text
        .split(/\r\n|\r|\n/)
        .filter(function (line) {
          var def = /^\[(img-\d+)\]:\s*(data:image\/\S+)\s*$/.exec(line.trim());
          if (def) newImages[def[1]] = def[2];
          return !def;
        })
        .join("\n");
      var parsed = parseMarkdownSections(text);
      var sections = parsed.sections;
      if (Object.keys(sections).length === 0) {
        alert(t('No page headings found. Mark each section with a heading naming the page number, e.g. "## 1".'));
        return;
      }
      // Pages without a matching heading in the file are blanked — the .md
      // file defines the whole booklet.
      images = newImages;
      SLOTS.forEach(function (slot) {
        var page = String(PAGE_NUMBERS[slot.side][slot.name]);
        cellEl(slot.side, slot.name).value = sections[page] || "";
      });
      renderAllCells();
      if (parsed.duplicates.length) {
        alert(
          t("Some page numbers appear more than once: ") +
            parsed.duplicates.map(function (n) { return "## " + n; }).join(", ") +
            t(".\nOnly the last section with each number was used; the earlier ones were dropped. Check the page numbering in the file.")
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

    // Without the back side, pages 9-16 are hidden on screen and not
    // printed (one A4 page). Their text is kept, and Export MD still saves it.
    var showBack = document.getElementById("show-back");
    if (readPref("showBack") === "0") showBack.checked = false;
    function syncBackSide() {
      document.body.classList.toggle("no-back", !showBack.checked);
      if (!showBack.checked && selected.side === "back") {
        selectPage("front", "B1");
        syncPresetSelect();
      }
    }
    showBack.addEventListener("change", function () {
      writePref("showBack", showBack.checked ? "1" : "0");
      syncBackSide();
    });
    syncBackSide();

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
        // Formatting buttons act on the page being edited, so they keep it open.
        if (e.target.closest("[data-keep-edit]")) return;
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

    document.getElementById("preset-select").addEventListener("change", function () {
      syncPresetOptions();
      applyPresetToCell();
    });
    selectPage(selected.side, selected.name);
    document.getElementById("btn-apply-preset").addEventListener("click", applyPresetToCell);
    document.getElementById("btn-new-mandala").addEventListener("click", applyPresetToCell);
    document.getElementById("btn-new-sudoku").addEventListener("click", applyPresetToCell);
    ["sudoku-level", "sudoku-count", "yatzy-players"].forEach(function (id) {
      document.getElementById(id).addEventListener("change", applyPresetToCell);
    });
    var today = new Date();
    setCalendarInputs(today.getFullYear(), today.getMonth(), today.getDate());
    document.getElementById("cal-start").value = localeWeekStart();
    ["cal-view", "cal-start", "cal-month", "cal-year", "cal-date"].forEach(function (id) {
      document.getElementById(id).addEventListener("change", function (e) {
        calendarInputChanged(e);
        syncPresetOptions();
        applyPresetToCell();
      });
    });
    ["tracker-start-time", "tracker-start-date"].forEach(function (id) {
      document.getElementById(id).addEventListener("input", function (e) {
        e.target.dataset.touched = "1";
      });
    });
    // Tracker options re-apply the tracker as they change.
    ["tracker-unit", "tracker-shape", "tracker-start-time", "tracker-start-date", "tracker-marks", "tracker-hints"].forEach(function (id) {
      document.getElementById(id).addEventListener("change", function () {
        syncPresetOptions();
        applyPresetToCell();
      });
    });
    var askReplace = document.getElementById("ask-replace");
    if (readPref("askReplace") === "0") askReplace.checked = false;
    askReplace.addEventListener("change", function () {
      writePref("askReplace", askReplace.checked ? "1" : "0");
    });
    initChrome();

    loadDemo();
    setLanguage(readPref("lang") || "en");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
