(function () {
  "use strict";

  var CELL_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2", "D1", "D2"];

  /* DEMO_CONTENT_START
  Keep this object byte-identical to ../examples/demo-content.json.
  It is duplicated here (rather than fetched) because fetch() is blocked
  against file:// URLs, and this editor must work opened directly from disk.
  */
  var DEMO_CONTENT = {
    "A1": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    "A2": "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    "B1": "Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris. Integer in mauris eu nibh euismod gravida.",
    "B2": "Quisque porta volutpat erat. Quisque erat eros, viverra eget, congue eget, semper rutrum, nulla. Nunc purus. Phasellus in felis. Donec semper sapien a libero. Nam dui mi, tincidunt quis, accumsan porttitor, facilisis luctus.",
    "C1": "Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat.",
    "C2": "Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae. Mauris viverra diam vitae quam. Suspendisse potenti. Nullam porttitor lacus at turpis. Donec posuere vulputate arcu.",
    "D1": "Vivamus vestibulum sagittis sapien. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Etiam ultricies nisi vel augue. Curabitur ullamcorper ultricies nisi. Pellentesque erat lorem.",
    "D2": "Aliquam erat volutpat. Praesent ac massa at ligula laoreet iaculis. Vivamus a mi. Morbi neque. Aliquam erat volutpat. Nullam varius. Etiam dictum tincidunt diam. Vestibulum ante ipsum primis in faucibus orci luctus."
  };
  /* DEMO_CONTENT_END */

  function cellEl(name) {
    return document.getElementById("cell-" + name);
  }

  function loadDemo() {
    CELL_ORDER.forEach(function (name) {
      cellEl(name).value = DEMO_CONTENT[name] || "";
    });
  }

  function clearAll() {
    CELL_ORDER.forEach(function (name) {
      cellEl(name).value = "";
    });
  }

  function exportJson() {
    var data = {};
    CELL_ORDER.forEach(function (name) {
      data[name] = cellEl(name).value;
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

  function importJsonFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var data;
      try {
        data = JSON.parse(reader.result);
      } catch (err) {
        alert("Not a valid JSON file: " + err.message);
        return;
      }
      if (typeof data !== "object" || data === null || Array.isArray(data)) {
        alert("content.json must contain a JSON object mapping cell names to text");
        return;
      }
      Object.keys(data).forEach(function (key) {
        if (CELL_ORDER.indexOf(key) === -1) {
          console.warn('Ignoring unknown cell "' + key + '" in imported JSON');
          return;
        }
        cellEl(key).value = data[key] == null ? "" : String(data[key]);
      });
    };
    reader.readAsText(file);
  }

  function init() {
    document.getElementById("btn-demo").addEventListener("click", loadDemo);
    document.getElementById("btn-clear").addEventListener("click", clearAll);
    document.getElementById("btn-export").addEventListener("click", exportJson);
    document.getElementById("btn-print").addEventListener("click", function () {
      window.print();
    });

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

    loadDemo();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
