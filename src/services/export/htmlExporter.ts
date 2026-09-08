import type { Presentation, Slide, SlideElement } from "../../domain/presentation";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../domain/presentation";
import { parsePresentation } from "../../domain/presentation";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeScriptJson(json: string): string {
  return json.replace(/<\//g, "<\\/");
}

function renderTextElement(element: SlideElement): string {
  const styles = element.styles as Record<string, unknown>;
  const fontSize = typeof styles.fontSize === "number" ? `${styles.fontSize}px` : "32px";
  const color = typeof styles.color === "string" ? styles.color : "#111827";
  const fontFamily =
    typeof styles.fontFamily === "string" ? styles.fontFamily : "Inter, sans-serif";
  const fontWeight = typeof styles.fontWeight === "string" ? styles.fontWeight : "normal";
  const textAlign = typeof styles.textAlign === "string" ? styles.textAlign : "left";
  const lineHeight =
    typeof styles.lineHeight === "number" ? String(styles.lineHeight) : "1.2";

  return `<div class="element text" data-animation="${element.animation ?? ""}" style="left:${element.x}px;top:${element.y}px;width:${element.width}px;height:${element.height}px;transform:rotate(${element.rotation}deg);z-index:${element.zIndex};font-size:${fontSize};color:${escapeHtml(color)};font-family:${escapeHtml(fontFamily)};font-weight:${escapeHtml(fontWeight)};text-align:${escapeHtml(textAlign)};line-height:${lineHeight};">${escapeHtml(element.content ?? "")}</div>`;
}

function renderImageElement(element: SlideElement): string {
  const styles = element.styles as Record<string, unknown>;
  const objectFit = typeof styles.objectFit === "string" ? styles.objectFit : "cover";
  const alt = typeof styles.alt === "string" ? styles.alt : "";
  const src = element.content ?? "";

  return `<div class="element image" data-animation="${element.animation ?? ""}" style="left:${element.x}px;top:${element.y}px;width:${element.width}px;height:${element.height}px;transform:rotate(${element.rotation}deg);z-index:${element.zIndex};overflow:hidden;"><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" style="width:100%;height:100%;object-fit:${escapeHtml(objectFit)};" /></div>`;
}

function renderShapeElement(element: SlideElement): string {
  const styles = element.styles as Record<string, unknown>;
  const fill = typeof styles.fill === "string" ? styles.fill : "#6366f1";
  const borderRadius =
    typeof styles.borderRadius === "number" ? `${styles.borderRadius}px` : "0px";
  const border = typeof styles.border === "string" ? styles.border : "none";

  return `<div class="element shape" data-animation="${element.animation ?? ""}" style="left:${element.x}px;top:${element.y}px;width:${element.width}px;height:${element.height}px;transform:rotate(${element.rotation}deg);z-index:${element.zIndex};background:${escapeHtml(fill)};border-radius:${borderRadius};border:${escapeHtml(border)};"></div>`;
}

function renderElement(element: SlideElement): string {
  switch (element.type) {
    case "text":
      return renderTextElement(element);
    case "image":
      return renderImageElement(element);
    case "shape":
      return renderShapeElement(element);
    default:
      return "";
  }
}

function renderSlide(slide: Slide, index: number): string {
  const elements = [...slide.elements]
    .sort((a, b) => a.zIndex - b.zIndex)
    .map(renderElement)
    .join("\n");

  return `<section class="slide" data-index="${index}" data-transition="${slide.transition}" style="background:${escapeHtml(slide.background)};">${elements}</section>`;
}

export function generateStandaloneHtml(presentation: Presentation): string {
  const validated = parsePresentation(presentation);
  if (!validated.success) {
    throw new Error("Invalid presentation for HTML export");
  }

  const slidesHtml = validated.data.slides.map(renderSlide).join("\n");
  const jsonPayload = escapeScriptJson(JSON.stringify(validated.data));

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(validated.data.title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #0f172a; font-family: Inter, sans-serif; }
    #deck { position: relative; width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; }
    .viewport { position: relative; width: ${CANVAS_WIDTH}px; height: ${CANVAS_HEIGHT}px; transform-origin: center center; }
    .slide { position: absolute; inset: 0; opacity: 0; pointer-events: none; transition: opacity 0.4s ease, transform 0.4s ease; }
    .slide.active { opacity: 1; pointer-events: auto; }
    .slide.transition-slide.enter { transform: translateX(100%); }
    .slide.transition-slide.enter.active { transform: translateX(0); }
    .slide.transition-slide.exit { transform: translateX(-100%); }
    .slide.transition-zoom.enter { transform: scale(0.85); }
    .slide.transition-zoom.enter.active { transform: scale(1); }
    .element { position: absolute; }
    .element[data-animation="fade-up"] { animation: fadeUp 0.6s ease both; }
    .element[data-animation="scale"] { animation: scaleIn 0.5s ease both; }
    .element[data-animation="bounce"] { animation: bounceIn 0.7s ease both; }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
    @keyframes bounceIn { 0% { opacity: 0; transform: scale(0.3); } 50% { transform: scale(1.05); } 70% { transform: scale(0.95); } 100% { opacity: 1; transform: scale(1); } }
    .nav { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; z-index: 100; }
    .dot { width: 10px; height: 10px; border-radius: 50%; border: none; background: rgba(255,255,255,0.35); cursor: pointer; }
    .dot.active { background: #6366f1; }
    .hint { position: fixed; top: 16px; right: 16px; color: rgba(255,255,255,0.6); font-size: 14px; }
  </style>
</head>
<body>
  <div id="deck">
    <div class="viewport" id="viewport">${slidesHtml}</div>
  </div>
  <nav class="nav" id="dots" aria-label="Навигация по слайдам"></nav>
  <p class="hint">← → для навигации, Esc для выхода из полноэкранного режима</p>
  <script id="presentation-data" type="application/json">${jsonPayload}</script>
  <script>
    (function () {
      var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
      var current = 0;
      var dots = document.getElementById('dots');
      slides.forEach(function (_, index) {
        var button = document.createElement('button');
        button.className = 'dot' + (index === 0 ? ' active' : '');
        button.type = 'button';
        button.setAttribute('aria-label', 'Слайд ' + (index + 1));
        button.addEventListener('click', function () { goTo(index); });
        dots.appendChild(button);
      });
      function scaleViewport() {
        var viewport = document.getElementById('viewport');
        var scale = Math.min(window.innerWidth / ${CANVAS_WIDTH}, window.innerHeight / ${CANVAS_HEIGHT});
        viewport.style.transform = 'scale(' + scale + ')';
      }
      function applyTransition(from, to) {
        var next = slides[to];
        var transition = next.getAttribute('data-transition') || 'fade';
        slides.forEach(function (slide, index) {
          slide.classList.remove('active', 'enter', 'exit', 'transition-slide', 'transition-zoom');
          if (index === to) {
            slide.classList.add('active');
            if (transition === 'slide') slide.classList.add('transition-slide', 'enter', 'active');
            if (transition === 'zoom') slide.classList.add('transition-zoom', 'enter', 'active');
          }
        });
        current = to;
        updateDots();
      }
      function updateDots() {
        var dotButtons = dots.querySelectorAll('.dot');
        dotButtons.forEach(function (dot, index) {
          dot.classList.toggle('active', index === current);
        });
      }
      function goTo(index) {
        if (index < 0 || index >= slides.length || index === current) return;
        applyTransition(current, index);
      }
      function next() { goTo(Math.min(slides.length - 1, current + 1)); }
      function prev() { goTo(Math.max(0, current - 1)); }
      document.addEventListener('keydown', function (event) {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ') {
          event.preventDefault(); next();
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === 'PageUp') {
          event.preventDefault(); prev();
        } else if (event.key === 'Home') {
          event.preventDefault(); goTo(0);
        } else if (event.key === 'End') {
          event.preventDefault(); goTo(slides.length - 1);
        } else if (event.key === 'Escape') {
          if (document.fullscreenElement) document.exitFullscreen();
        } else if (event.key === 'f' || event.key === 'F') {
          var deck = document.getElementById('deck');
          if (deck.requestFullscreen) deck.requestFullscreen();
        }
      });
      window.addEventListener('resize', scaleViewport);
      scaleViewport();
      slides[0].classList.add('active');
    })();
  </script>
</body>
</html>`;
}

export function sanitizeFilename(title: string): string {
  const sanitized = [...title.trim()]
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 && !'<>:"/\\|?*'.includes(char);
    })
    .join("")
    .replace(/\s+/g, "-")
    .slice(0, 80);
  const base = sanitized.length > 0 ? sanitized : "presentation";
  return `${base}.html`;
}
