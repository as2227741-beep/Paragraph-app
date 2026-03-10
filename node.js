const editor = document.getElementById("editor");

// ── EXEC ──
function exec(cmd, val = null) {
  editor.focus();
  document.execCommand(cmd, false, val);
  updateToolbar();
  onInput();
}

function formatBlock(tag) {
  if (!tag) return;
  exec("formatBlock", tag === "pre" ? "pre" : tag);
}

function setFontSize(size) {
  if (!size) return;
  exec("fontSize", size);
}

function insertLink() {
  const sel = window.getSelection().toString().trim();
  const url = prompt("Enter URL:", "https://");
  if (url) exec("createLink", url);
}

// ── KEYBOARD SHORTCUTS ──
function onKeyDown(e) {
  if (e.metaKey || e.ctrlKey) {
    if (e.key === "f") {
      e.preventDefault();
      toggleFind();
    }
    if (e.key === "z" && e.shiftKey) {
      e.preventDefault();
      document.execCommand("redo");
    }
  }
  if (e.key === "Tab") {
    e.preventDefault();
    exec(e.shiftKey ? "outdent" : "indent");
  }
}

// ── TOOLBAR STATE ──
function updateToolbar() {
  [
    "bold",
    "italic",
    "underline",
    "strikeThrough",
    "justifyLeft",
    "justifyCenter",
    "justifyRight",
    "justifyFull",
  ].forEach((cmd) => {
    const btn = document.getElementById("btn-" + cmd);
    if (btn) btn.classList.toggle("active", document.queryCommandState(cmd));
  });

  // selection word count
  const sel = window.getSelection();
  const selText = sel ? sel.toString() : "";
  const statSel = document.getElementById("stat-sel");
  if (selText.trim()) {
    statSel.style.display = "block";
    document.getElementById("stat-sel-count").textContent =
      selText.trim().split(/\s+/).length + " words";
  } else {
    statSel.style.display = "none";
  }
}

// ── STATS ──
function onInput() {
  const text = editor.innerText || "";
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.replace(/\n/g, "").length;
  const lines = text.split("\n").filter((l) => l.trim()).length;
  document.getElementById("stat-words").textContent = words;
  document.getElementById("stat-chars").textContent = chars;
  document.getElementById("stat-lines").textContent = lines;
  updateOutline();
}

// ── OUTLINE ──
let panelOpen = false;
function togglePanel() {
  panelOpen = !panelOpen;
  document.getElementById("panel").classList.toggle("open", panelOpen);
  updateOutline();
}

function updateOutline() {
  if (!panelOpen) return;
  const body = document.getElementById("outline-body");
  const headings = editor.querySelectorAll("h1,h2,h3");
  if (!headings.length) {
    body.innerHTML =
      "<div style=\"color:var(--text-muted);font-size:12px;font-family:'IBM Plex Mono',monospace;\">No headings yet.</div>";
    return;
  }
  body.innerHTML = [...headings]
    .map((h, i) => {
      const lvl = h.tagName.toLowerCase();
      return `<div class="outline-item ${lvl}" onclick="scrollToHeading(${i})">${h.innerText.slice(0, 40)}</div>`;
    })
    .join("");
}

function scrollToHeading(i) {
  const headings = editor.querySelectorAll("h1,h2,h3");
  if (headings[i])
    headings[i].scrollIntoView({ behavior: "smooth", block: "center" });
}

// ── FIND & REPLACE ──
let findMatches = [];
let findIndex = 0;
let findOpen = false;

function toggleFind() {
  findOpen = !findOpen;
  const bar = document.getElementById("find-bar");
  bar.classList.toggle("open", findOpen);
  if (findOpen) document.getElementById("find-input").focus();
  else clearHighlights();
}

function closeFind() {
  findOpen = false;
  document.getElementById("find-bar").classList.remove("open");
  clearHighlights();
}

function findKey(e) {
  if (e.key === "Escape") closeFind();
  if (e.key === "Enter") findNext(1);
}
function replaceKey(e) {
  if (e.key === "Enter") doReplace();
}

function doFind() {
  clearHighlights();
  const term = document.getElementById("find-input").value;
  if (!term) {
    document.getElementById("find-count").textContent = "0 / 0";
    return;
  }
  const text = editor.innerHTML;
  // Simple highlight via mark
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  editor.innerHTML = editor.innerHTML.replace(
    new RegExp(escaped, "gi"),
    (match) => `<mark class="search-highlight">${match}</mark>`,
  );
  findMatches = [...editor.querySelectorAll("mark.search-highlight")];
  findIndex = 0;
  if (findMatches.length) {
    findMatches[0].classList.add("current");
    findMatches[0].scrollIntoView({ behavior: "smooth", block: "center" });
  }
  document.getElementById("find-count").textContent =
    `${findMatches.length ? 1 : 0} / ${findMatches.length}`;
}

function findNext(dir) {
  if (!findMatches.length) return;
  findMatches[findIndex].classList.remove("current");
  findIndex = (findIndex + dir + findMatches.length) % findMatches.length;
  findMatches[findIndex].classList.add("current");
  findMatches[findIndex].scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
  document.getElementById("find-count").textContent =
    `${findIndex + 1} / ${findMatches.length}`;
}

function clearHighlights() {
  editor.querySelectorAll("mark.search-highlight").forEach((m) => {
    m.replaceWith(document.createTextNode(m.textContent));
  });
  editor.normalize();
  findMatches = [];
}

function doReplace() {
  if (!findMatches.length) return;
  const rep = document.getElementById("replace-input").value;
  const cur = findMatches[findIndex];
  cur.replaceWith(document.createTextNode(rep));
  findMatches.splice(findIndex, 1);
  if (findIndex >= findMatches.length) findIndex = 0;
  document.getElementById("find-count").textContent =
    `${findMatches.length ? findIndex + 1 : 0} / ${findMatches.length}`;
  if (findMatches.length) {
    findMatches[findIndex].classList.add("current");
  }
  onInput();
}

function doReplaceAll() {
  const term = document.getElementById("find-input").value;
  const rep = document.getElementById("replace-input").value;
  if (!term) return;
  clearHighlights();
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  editor.innerHTML = editor.innerHTML.replace(new RegExp(escaped, "gi"), rep);
  document.getElementById("find-count").textContent = "0 / 0";
  onInput();
}

// ── EXPORT ──
function exportTxt() {
  const text = editor.innerText;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  a.download = "folio-document.txt";
  a.click();
}

function copyAll() {
  navigator.clipboard.writeText(editor.innerText).then(() => {
    const btn = document.querySelector(".btn-accent");
    btn.textContent = "Copied!";
    setTimeout(() => (btn.textContent = "Copy"), 1400);
  });
}

// ── INIT ──
editor.focus();
onInput();
