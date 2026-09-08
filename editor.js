const BLOCK_SEL = ".card,.chip,.author-card,.fact,.toc-item,.node,.step,.photo,.photo-banner,.photo-card,.kicker,h1,h2,.sub,.display";
const KEY = "enms-rb-deck-v3";
const slides = [...document.querySelectorAll(".slide")];
const originals = slides.map((s) => s.innerHTML);
const dots = document.getElementById("dots");
const page = document.getElementById("page");
const bar = document.getElementById("bar");
const overview = document.getElementById("overview");
const help = document.getElementById("help");
let i = 0;
let selected = null;
let drag = null;

function scale() {
  return document.getElementById("deck").getBoundingClientRect().width / 1920;
}
function deckXY(cx, cy) {
  const r = document.getElementById("deck").getBoundingClientRect();
  const s = r.width / 1920;
  return { x: (cx - r.left) / s, y: (cy - r.top) / s };
}
function fit() {
  const fs = !!document.fullscreenElement;
  const s = Math.min((window.innerWidth - (fs ? 0 : 32)) / 1920, (window.innerHeight - (fs ? 0 : 88)) / 1080);
  document.documentElement.style.setProperty("--s", s);
  document.documentElement.style.setProperty("--fw", `${1920 * s}px`);
  document.documentElement.style.setProperty("--fh", `${1080 * s}px`);
}
async function toggleFs() {
  if (document.fullscreenElement) await document.exitFullscreen();
  else await document.documentElement.requestFullscreen();
}
function renderDots() {
  dots.innerHTML = slides.map((_, n) => `<button type="button" class="${n === i ? "on" : ""}" data-n="${n}"></button>`).join("");
}
function go(n, fromDir) {
  if (n < 0 || n >= slides.length || n === i) return;
  unselect();
  const dir = fromDir ?? (n > i ? 1 : -1);
  slides[i].classList.remove("active");
  slides[i].classList.add(dir > 0 ? "leave-left" : "leave-right");
  const prev = slides[i];
  setTimeout(() => prev.classList.remove("leave-left", "leave-right"), 500);
  i = n;
  slides[i].classList.add("active");
  page.textContent = `${i + 1} / ${slides.length}`;
  bar.style.width = `${((i + 1) / slides.length) * 100}%`;
  renderDots();
  bindEditables();
}
function persist() {
  localStorage.setItem(KEY, JSON.stringify(slides.map((s) => s.innerHTML)));
}
function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!Array.isArray(saved) || saved.length !== slides.length) return;
    slides.forEach((s, n) => { s.innerHTML = saved[n]; });
  } catch {}
}
function unselect() {
  document.querySelectorAll(".block.selected").forEach((el) => el.classList.remove("selected"));
  document.querySelectorAll(".handles").forEach((h) => h.remove());
  selected = null;
}
function placeHandles() {
  if (!selected) return;
  let box = document.querySelector("#deck > .handles");
  if (!box) {
    box = handles();
    document.getElementById("deck").appendChild(box);
  }
  const r = selected.getBoundingClientRect();
  const p = deckXY(r.left, r.top);
  const s = scale();
  box.style.left = p.x - 8 + "px";
  box.style.top = p.y - 8 + "px";
  box.style.width = r.width / s + 16 + "px";
  box.style.height = r.height / s + 16 + "px";
}
function handles() {
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
  del.textContent = "×";
  del.title = "Удалить";
  del.onclick = (e) => { e.stopPropagation(); removeSelected(); };
  box.appendChild(del);
  return box;
}
function select(el) {
  if (!document.body.classList.contains("edit") || !el || !el.classList.contains("block")) return;
  unselect();
  selected = el;
  el.classList.add("selected");
  placeHandles();
}
function free(el) {
  if (el.dataset.free) return;
  const r = el.getBoundingClientRect();
  const p = deckXY(r.left, r.top);
  const s = scale();
  el.style.position = "absolute";
  el.style.left = p.x + "px";
  el.style.top = p.y + "px";
  el.style.width = r.width / s + "px";
  el.style.height = r.height / s + "px";
  el.style.margin = "0";
  el.style.maxWidth = "none";
  el.style.zIndex = "8";
  el.dataset.free = "1";
}
function removeSelected() {
  if (!selected) return;
  selected.remove();
  selected = null;
  persist();
}
function duplicate() {
  if (!selected) return;
  free(selected);
  const clone = selected.cloneNode(true);
  clone.querySelector(".handles")?.remove();
  clone.classList.remove("selected");
  selected.parentElement.appendChild(clone);
  clone.style.left = parseFloat(selected.style.left) + 24 + "px";
  clone.style.top = parseFloat(selected.style.top) + 24 + "px";
  clone.dataset.free = "1";
  bindBlock(clone);
  select(clone);
  persist();
}
function addCard() {
  const el = document.createElement("div");
  el.className = "card block";
  el.innerHTML = "<h3 data-edit>Новый блок</h3><p data-edit>Напишите текст. Перетащите и растяните за уголок.</p>";
  el.style.cssText = "position:absolute;left:80px;top:120px;width:420px;z-index:8";
  el.dataset.free = "1";
  slides[i].appendChild(el);
  bindBlock(el);
  bindEditables();
  select(el);
  persist();
}
function addText() {
  const el = document.createElement("p");
  el.className = "sub block";
  el.setAttribute("data-edit", "");
  el.textContent = "Новый текст";
  el.style.cssText = "position:absolute;left:80px;top:200px;width:640px;z-index:8";
  el.dataset.free = "1";
  slides[i].appendChild(el);
  bindBlock(el);
  bindEditables();
  select(el);
  persist();
}
function bindBlock(el) {
  el.classList.add("block");
  el.addEventListener("mousedown", onBlockDown);
  if (el.tagName === "IMG") {
    el.addEventListener("dblclick", (e) => {
      e.preventDefault();
      const inp = document.createElement("input");
      inp.type = "file";
      inp.accept = "image/*";
      inp.onchange = () => {
        const f = inp.files && inp.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => { el.src = reader.result; persist(); };
        reader.readAsDataURL(f);
      };
      inp.click();
    });
  }
}
function bindBlocks() {
  slides.forEach((slide) => {
    slide.querySelectorAll(BLOCK_SEL).forEach(bindBlock);
  });
}
function bindEditables() {
  document.querySelectorAll("[data-edit]").forEach((el) => {
    el.contentEditable = document.body.classList.contains("edit") ? "true" : "false";
    el.onblur = persist;
  });
}
function onBlockDown(e) {
  if (!document.body.classList.contains("edit")) return;
  if (e.target.closest(".handles")) return;
  const el = e.currentTarget;
  select(el);
  if (e.target.closest("[data-edit]") && e.target !== el) return;
  if (e.target.isContentEditable && e.target === el) return;
  const start = deckXY(e.clientX, e.clientY);
  drag = { el, mode: "move", x: start.x, y: start.y, left: 0, top: 0, w: 0, h: 0 };
}
document.addEventListener("mousedown", (e) => {
  if (!document.body.classList.contains("edit")) return;
  const h = e.target.closest(".handles i");
  if (!h || !selected) return;
  e.preventDefault();
  e.stopPropagation();
  free(selected);
  const r = selected.getBoundingClientRect();
  const s = scale();
  const p = deckXY(r.left, r.top);
  drag = { el: selected, mode: h.dataset.h, x: e.clientX, y: e.clientY, left: p.x, top: p.y, w: r.width / s, h: r.height / s };
}, true);
document.addEventListener("mousemove", (e) => {
  if (!drag) return;
  const el = drag.el;
  if (drag.mode === "move") {
    const p = deckXY(e.clientX, e.clientY);
    if (!el.dataset.free && (Math.abs(p.x - drag.x) > 3 || Math.abs(p.y - drag.y) > 3)) {
      free(el);
      drag.left = parseFloat(el.style.left);
      drag.top = parseFloat(el.style.top);
      drag.ox = p.x;
      drag.oy = p.y;
    }
    if (el.dataset.free) {
      const now = deckXY(e.clientX, e.clientY);
      const ox = drag.ox ?? drag.x;
      const oy = drag.oy ?? drag.y;
      el.style.left = (drag.left || parseFloat(el.style.left)) + (now.x - ox) + "px";
      el.style.top = (drag.top || parseFloat(el.style.top)) + (now.y - oy) + "px";
      drag.ox = now.x;
      drag.oy = now.y;
      drag.left = parseFloat(el.style.left);
      drag.top = parseFloat(el.style.top);
      placeHandles();
    }
    return;
  }
  const s = scale();
  const dx = (e.clientX - drag.x) / s;
  const dy = (e.clientY - drag.y) / s;
  let left = drag.left, top = drag.top, w = drag.w, h = drag.h;
  const m = drag.mode;
  if (m.includes("e")) w = Math.max(80, drag.w + dx);
  if (m.includes("s")) h = Math.max(40, drag.h + dy);
  if (m.includes("w")) { w = Math.max(80, drag.w - dx); left = drag.left + dx; }
  if (m.includes("n")) { h = Math.max(40, drag.h - dy); top = drag.top + dy; }
  el.style.left = left + "px";
  el.style.top = top + "px";
  el.style.width = w + "px";
  el.style.height = h + "px";
  placeHandles();
});
document.addEventListener("mouseup", () => { if (drag) persist(); drag = null; });
function toggleEdit(force) {
  const on = force ?? !document.body.classList.contains("edit");
  document.body.classList.toggle("edit", on);
  document.getElementById("btnEdit").textContent = on ? "Готово" : "Правка";
  if (!on) { unselect(); persist(); }
  bindEditables();
}
function buildOverview() {
  overview.innerHTML = `<div class="overview-grid">${slides.map((s, n) => `<button class="thumb ${n === i ? "on" : ""}" data-n="${n}"><b>${String(n + 1).padStart(2, "0")}</b>${s.dataset.title}</button>`).join("")}</div>`;
}

restore();
bindBlocks();
bindEditables();
fit();
renderDots();
bar.style.width = `${(1 / slides.length) * 100}%`;
window.addEventListener("resize", fit);
document.addEventListener("fullscreenchange", () => {
  document.body.classList.toggle("fs", !!document.fullscreenElement);
  fit();
});
document.getElementById("btnNext").onclick = () => go(i + 1, 1);
document.getElementById("btnPrev").onclick = () => go(i - 1, -1);
document.getElementById("btnEdit").onclick = () => toggleEdit();
document.getElementById("btnAddCard").onclick = addCard;
document.getElementById("btnAddText").onclick = addText;
document.getElementById("btnDup").onclick = duplicate;
document.getElementById("btnDel").onclick = removeSelected;
document.getElementById("btnReset").onclick = () => {
  if (!confirm("Вернуть исходный макет слайдов?")) return;
  slides.forEach((s, n) => { s.innerHTML = originals[n]; });
  localStorage.removeItem(KEY);
  unselect();
  bindBlocks();
  bindEditables();
};
dots.addEventListener("click", (e) => { const n = e.target.dataset.n; if (n) go(+n); });
document.addEventListener("keydown", (e) => {
  const typing = e.target.isContentEditable || ["INPUT", "TEXTAREA"].includes(e.target.tagName);
  if ((e.key === "f" || e.key === "F") && !typing) { e.preventDefault(); toggleFs(); return; }
  if (typing && ["ArrowLeft", "ArrowRight", " ", "PageDown", "PageUp"].includes(e.key)) return;
  if (document.body.classList.contains("edit") && selected && (e.key === "Delete" || e.key === "Backspace") && !typing) {
    e.preventDefault();
    removeSelected();
    return;
  }
  if (document.body.classList.contains("edit") && selected && (e.key === "d" || e.key === "D") && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    duplicate();
    return;
  }
  if (["ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); go(i + 1, 1); }
  if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); go(i - 1, -1); }
  if (e.key === "Home") go(0, -1);
  if (e.key === "End") go(slides.length - 1, 1);
  if ((e.key === "e" || e.key === "E") && !typing) toggleEdit();
  if ((e.key === "?" || e.key === "h" || e.key === "H") && !typing) help.classList.toggle("show");
  if (e.key === "Escape") {
    help.classList.remove("show");
    if (document.fullscreenElement) return;
    if (document.body.classList.contains("edit") && selected) { unselect(); return; }
    if (overview.classList.contains("show")) overview.classList.remove("show");
    else { buildOverview(); overview.classList.add("show"); }
  }
});
help.onclick = () => help.classList.remove("show");
overview.addEventListener("click", (e) => {
  const n = e.target.closest("[data-n]") && e.target.closest("[data-n]").dataset.n;
  if (n) { go(+n); overview.classList.remove("show"); }
  else overview.classList.remove("show");
});
document.querySelectorAll("[data-edit]").forEach((el) => {
  el.addEventListener("dblclick", () => { if (!document.body.classList.contains("edit")) toggleEdit(true); });
});
