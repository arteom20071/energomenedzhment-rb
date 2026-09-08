const KEY = "enms-rb-reveal-v1";
const BLOCK_SEL = ".card,.kpi,.legal-item,.chip,.kicker,.media-slot,.note,.title-layout,h1,h2";
const EDIT_SEL = "h1,h2,h3,p,li,.kicker,.chip,.norm-ref,.hint,.lbl,.val,.mo,.lvl,.note,.foot span,.payback,.idx";

const slidesRoot = document.querySelector(".reveal .slides");
const originals = [...document.querySelectorAll(".reveal .slides > section")].map((s) => s.innerHTML);

let selected = null;
let drag = null;

function sections() {
  return [...document.querySelectorAll(".reveal .slides > section")];
}

function persist() {
  localStorage.setItem(KEY, JSON.stringify(sections().map((s) => s.innerHTML)));
}

function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    const list = sections();
    if (!Array.isArray(saved) || saved.length !== list.length) return;
    list.forEach((s, n) => {
      s.innerHTML = saved[n];
    });
  } catch (_) {}
}

function currentSlide() {
  return document.querySelector(".reveal .slides > section.present") || sections()[0];
}

function unselect() {
  document.querySelectorAll(".block.selected").forEach((el) => el.classList.remove("selected"));
  document.querySelectorAll(".handles").forEach((h) => h.remove());
  selected = null;
}

function placeHandles() {
  if (!selected) return;
  let box = document.querySelector("body > .handles");
  if (!box) {
    box = makeHandles();
    document.body.appendChild(box);
  }
  const r = selected.getBoundingClientRect();
  box.style.left = r.left - 8 + "px";
  box.style.top = r.top - 8 + "px";
  box.style.width = r.width + 16 + "px";
  box.style.height = r.height + 16 + "px";
}

function makeHandles() {
  const box = document.createElement("div");
  box.className = "handles";
  ["nw", "n", "ne", "e", "se", "s", "sw", "w"].forEach((h) => {
    const iel = document.createElement("i");
    iel.dataset.h = h;
    box.appendChild(iel);
  });
  const del = document.createElement("button");
  del.type = "button";
  del.className = "btn-del";
  del.textContent = "x";
  del.title = "Delete";
  del.onclick = (e) => {
    e.stopPropagation();
    removeSelected();
  };
  box.appendChild(del);
  return box;
}

function select(el) {
  if (!document.body.classList.contains("edit") || !el) return;
  unselect();
  selected = el;
  el.classList.add("block", "selected");
  placeHandles();
}

function free(el) {
  if (el.dataset.free) return;
  const slide = el.closest("section");
  const sr = slide.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  el.style.position = "absolute";
  el.style.left = r.left - sr.left + "px";
  el.style.top = r.top - sr.top + "px";
  el.style.width = r.width + "px";
  el.style.height = r.height + "px";
  el.style.margin = "0";
  el.style.maxWidth = "none";
  el.style.zIndex = "8";
  el.dataset.free = "1";
}

function removeSelected() {
  if (!selected) return;
  selected.remove();
  selected = null;
  document.querySelectorAll(".handles").forEach((h) => h.remove());
  persist();
}

function duplicate() {
  if (!selected) return;
  free(selected);
  const clone = selected.cloneNode(true);
  clone.classList.remove("selected");
  selected.parentElement.appendChild(clone);
  clone.style.left = parseFloat(selected.style.left) + 24 + "px";
  clone.style.top = parseFloat(selected.style.top) + 24 + "px";
  clone.dataset.free = "1";
  bindBlock(clone);
  select(clone);
  bindEditables();
  persist();
}

function addCard() {
  const el = document.createElement("article");
  el.className = "card accent block";
  el.innerHTML = "<h3>\u041d\u043e\u0432\u044b\u0439 \u0431\u043b\u043e\u043a</h3><p>\u041d\u0430\u0436\u043c\u0438\u0442\u0435 \u0438 \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u0442\u0435\u043a\u0441\u0442. \u041f\u043e\u0442\u044f\u043d\u0438\u0442\u0435 \u0437\u0430 \u0443\u0433\u043e\u043b, \u0447\u0442\u043e\u0431\u044b \u0438\u0437\u043c\u0435\u043d\u0438\u0442\u044c \u0440\u0430\u0437\u043c\u0435\u0440.</p>";
  el.style.cssText = "position:absolute;left:80px;top:120px;width:420px;z-index:8";
  el.dataset.free = "1";
  currentSlide().appendChild(el);
  bindBlock(el);
  bindEditables();
  select(el);
  persist();
}

function addText() {
  const el = document.createElement("p");
  el.className = "note block";
  el.textContent = "\u041d\u043e\u0432\u044b\u0439 \u0442\u0435\u043a\u0441\u0442";
  el.style.cssText = "position:absolute;left:80px;top:200px;width:640px;z-index:8";
  el.dataset.free = "1";
  currentSlide().appendChild(el);
  bindBlock(el);
  bindEditables();
  select(el);
  persist();
}

function replaceImage(img) {
  const inp = document.createElement("input");
  inp.type = "file";
  inp.accept = "image/*";
  inp.onchange = () => {
    const f = inp.files && inp.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      img.src = reader.result;
      persist();
    };
    reader.readAsDataURL(f);
  };
  inp.click();
}

function bindBlock(el) {
  el.classList.add("block");
  el.addEventListener("mousedown", onBlockDown);
}

function bindBlocks() {
  sections().forEach((slide) => {
    slide.querySelectorAll(BLOCK_SEL).forEach(bindBlock);
    slide.querySelectorAll("img").forEach((img) => {
      img.addEventListener("dblclick", (e) => {
        if (!document.body.classList.contains("edit")) return;
        e.preventDefault();
        replaceImage(img);
      });
    });
  });
}

function bindEditables() {
  const on = document.body.classList.contains("edit");
  document.querySelectorAll(EDIT_SEL).forEach((el) => {
    el.contentEditable = on ? "true" : "false";
    el.onblur = persist;
  });
}

function onBlockDown(e) {
  if (!document.body.classList.contains("edit")) return;
  if (e.target.closest(".handles")) return;
  const el = e.currentTarget;
  select(el);
  if (e.target.isContentEditable && e.target !== el) return;
  const r = el.getBoundingClientRect();
  drag = {
    el,
    mode: "move",
    x: e.clientX,
    y: e.clientY,
    left: r.left,
    top: r.top,
    w: r.width,
    h: r.height
  };
}

document.addEventListener(
  "mousedown",
  (e) => {
    if (!document.body.classList.contains("edit")) return;
    const h = e.target.closest(".handles i");
    if (!h || !selected) return;
    e.preventDefault();
    e.stopPropagation();
    free(selected);
    const r = selected.getBoundingClientRect();
    const slide = selected.closest("section").getBoundingClientRect();
    drag = {
      el: selected,
      mode: h.dataset.h,
      x: e.clientX,
      y: e.clientY,
      left: r.left - slide.left,
      top: r.top - slide.top,
      w: r.width,
      h: r.height
    };
  },
  true
);

document.addEventListener("mousemove", (e) => {
  if (!drag) return;
  const el = drag.el;
  if (drag.mode === "move") {
    if (Math.abs(e.clientX - drag.x) > 4 || Math.abs(e.clientY - drag.y) > 4) {
      free(el);
    }
    if (el.dataset.free) {
      const sr = el.closest("section").getBoundingClientRect();
      const ox = drag.x - drag.left;
      const oy = drag.y - drag.top;
      el.style.left = e.clientX - sr.left - ox + "px";
      el.style.top = e.clientY - sr.top - oy + "px";
      placeHandles();
    }
    return;
  }
  const dx = e.clientX - drag.x;
  const dy = e.clientY - drag.y;
  let left = drag.left;
  let top = drag.top;
  let w = drag.w;
  let h = drag.h;
  const m = drag.mode;
  if (m.includes("e")) w = Math.max(80, drag.w + dx);
  if (m.includes("s")) h = Math.max(40, drag.h + dy);
  if (m.includes("w")) {
    w = Math.max(80, drag.w - dx);
    left = drag.left + dx;
  }
  if (m.includes("n")) {
    h = Math.max(40, drag.h - dy);
    top = drag.top + dy;
  }
  el.style.left = left + "px";
  el.style.top = top + "px";
  el.style.width = w + "px";
  el.style.height = h + "px";
  placeHandles();
});

document.addEventListener("mouseup", () => {
  if (drag) persist();
  drag = null;
});

function toggleEdit(force) {
  const on = force ?? !document.body.classList.contains("edit");
  document.body.classList.toggle("edit", on);
  const btn = document.getElementById("btnEdit");
  if (btn) {
    btn.textContent = on ? "\u0413\u043e\u0442\u043e\u0432\u043e" : "\u041f\u0440\u0430\u0432\u043a\u0430";
    btn.classList.toggle("primary", on);
  }
  if (!on) {
    unselect();
    persist();
  }
  bindEditables();
}

let nativeFs = false;

function nativeFullscreen() {
  return document.fullscreenElement || document.webkitFullscreenElement;
}

function setPresenting(on) {
  document.body.classList.toggle("fs", on);
  const bar = document.getElementById("editBar");
  if (bar) bar.hidden = on;
}

function syncFsClass() {
  const on = !!nativeFullscreen();
  if (on) {
    nativeFs = true;
    setPresenting(true);
  } else if (nativeFs) {
    nativeFs = false;
    setPresenting(false);
  }
}

async function exitPresenting() {
  setPresenting(false);
  const active = nativeFullscreen();
  if (!active) return;
  try {
    if (document.exitFullscreen) await document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  } catch (_) {}
}

async function toggleFs() {
  if (document.body.classList.contains("fs") || nativeFullscreen()) {
    await exitPresenting();
    return;
  }
  if (document.body.classList.contains("edit")) toggleEdit(false);
  unselect();
  setPresenting(true);
  const root = document.documentElement;
  try {
    if (root.requestFullscreen) await root.requestFullscreen();
    else if (root.webkitRequestFullscreen) await root.webkitRequestFullscreen();
  } catch (_) {}
}

function resetDeck() {
  if (!window.confirm("\u0412\u0435\u0440\u043d\u0443\u0442\u044c \u0438\u0441\u0445\u043e\u0434\u043d\u044b\u0439 \u043c\u0430\u043a\u0435\u0442 \u0441\u043b\u0430\u0439\u0434\u043e\u0432?")) return;
  sections().forEach((s, n) => {
    s.innerHTML = originals[n];
  });
  localStorage.removeItem(KEY);
  unselect();
  bindBlocks();
  bindEditables();
}

function downloadHtml() {
  persist();
  const blob = new Blob([document.documentElement.outerHTML], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "presentation.html";
  a.click();
  URL.revokeObjectURL(a.href);
}

function renderDots() {
  const nav = document.getElementById("slideDots");
  if (!nav || typeof Reveal === "undefined") return;
  const total = sections().length;
  const current = Reveal.getIndices().h;
  nav.innerHTML = "";
  for (let n = 0; n < total; n += 1) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = n === current ? "on" : "";
    btn.title = String(n + 1);
    btn.setAttribute("aria-label", "Slide " + (n + 1));
    btn.onclick = () => Reveal.slide(n);
    nav.appendChild(btn);
  }
}

function sizeDeck() {
  if (typeof Reveal === "undefined") return;
  Reveal.configure({
    width: window.innerWidth,
    height: window.innerHeight,
    margin: 0,
    minScale: 1,
    maxScale: 1
  });
}

function initEditor() {
  restore();
  bindBlocks();
  bindEditables();
  document.getElementById("btnEdit").onclick = () => toggleEdit();
  document.getElementById("btnAddCard").onclick = addCard;
  document.getElementById("btnAddText").onclick = addText;
  document.getElementById("btnDup").onclick = duplicate;
  document.getElementById("btnDel").onclick = removeSelected;
  document.getElementById("btnReset").onclick = resetDeck;
  document.getElementById("btnFs").onclick = toggleFs;
  document.getElementById("btnExitFs").onclick = () => exitPresenting();
  document.getElementById("btnDl").onclick = downloadHtml;

  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape" && document.body.classList.contains("fs")) {
        e.preventDefault();
        e.stopImmediatePropagation();
        exitPresenting();
      }
    },
    true
  );

  document.addEventListener("keydown", (e) => {
    const typing = e.target.isContentEditable || ["INPUT", "TEXTAREA"].includes(e.target.tagName);
    if ((e.key === "e" || e.key === "E") && !typing) {
      e.preventDefault();
      toggleEdit();
    }
    if (document.body.classList.contains("edit") && selected && (e.key === "Delete") && !typing) {
      e.preventDefault();
      removeSelected();
    }
    if (document.body.classList.contains("edit") && selected && (e.key === "d" || e.key === "D") && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      duplicate();
    }
  });

  renderDots();

  document.addEventListener("fullscreenchange", () => {
    syncFsClass();
    sizeDeck();
  });
  document.addEventListener("webkitfullscreenchange", () => {
    syncFsClass();
    sizeDeck();
  });

  window.addEventListener("resize", () => {
    sizeDeck();
    placeHandles();
  });
}

window.initEditor = initEditor;
window.sizeDeck = sizeDeck;
window.renderDots = renderDots;
