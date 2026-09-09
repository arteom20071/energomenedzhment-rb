import type { Presentation, Slide, SlideElement } from "../../domain/presentation";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../domain/presentation";
import { parsePresentation } from "../../domain/presentation";
import {
  buildStyleAttribute,
  serializeBorder,
  serializeColor,
  serializeFontFamilyForCss,
  serializeFontWeight,
  serializeLineHeight,
  serializeObjectFit,
  serializePlainText,
  serializePosition,
  serializePxNumber,
  serializeRotation,
  serializeTextAlign,
  serializeZIndex,
} from "./cssSafety";
import { sanitizeHtmlFilename } from "./filenameSanitizer";
import {
  exportPresentationJson,
  type AssetResolver,
} from "./jsonExporter";

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

function renderElementShell(
  element: SlideElement,
  innerHtml: string,
): string {
  const style = buildStyleAttribute({
    left: serializePosition(element.x),
    top: serializePosition(element.y),
    width: serializePosition(element.width),
    height: serializePosition(element.height),
    transform: `rotate(${serializeRotation(element.rotation)})`,
    "z-index": serializeZIndex(element.zIndex),
  });
  return `<div class="element-outer ${element.type}" data-animation="${element.animation ?? ""}" style="${style}"><div class="element-inner">${innerHtml}</div></div>`;
}

function renderTextElement(element: SlideElement): string {
  const styles = element.styles as Record<string, unknown>;
  const innerStyle = buildStyleAttribute({
    "font-size": serializePxNumber(styles.fontSize, 32),
    color: serializeColor(styles.color, "#111827"),
    "font-family": serializeFontFamilyForCss(styles.fontFamily, "Inter, sans-serif"),
    "font-weight": serializeFontWeight(styles.fontWeight, "normal"),
    "text-align": serializeTextAlign(styles.textAlign, "left"),
    "line-height": serializeLineHeight(styles.lineHeight, 1.2),
    "white-space": "pre-wrap",
    overflow: "hidden",
    "word-break": "break-word",
  });
  const inner = `<div class="text-content" style="${innerStyle}">${escapeHtml(serializePlainText(element.content))}</div>`;
  return renderElementShell(element, inner);
}

function renderImageElement(element: SlideElement): string {
  const styles = element.styles as Record<string, unknown>;
  const src = serializePlainText(element.content);
  const innerStyle = buildStyleAttribute({
    width: "100%",
    height: "100%",
    "object-fit": serializeObjectFit(styles.objectFit, "cover"),
  });
  const inner = `<img src="${escapeHtml(src)}" alt="${escapeHtml(serializePlainText(styles.alt))}" style="${innerStyle}" />`;
  return renderElementShell(element, inner);
}

function renderShapeElement(element: SlideElement): string {
  const styles = element.styles as Record<string, unknown>;
  const isEllipse = styles.shapeKind === "ellipse" || styles.shapeKind === "circle";
  const innerStyle = buildStyleAttribute({
    width: "100%",
    height: "100%",
    background: serializeColor(styles.fill, "#6366f1"),
    "border-radius": isEllipse ? "50%" : serializePxNumber(styles.borderRadius, 0),
    border: serializeBorder(styles.border, "none"),
    "border-color": serializeColor(styles.borderColor, "transparent"),
    "border-width": serializePxNumber(styles.borderWidth, 0),
    "border-style": typeof styles.borderWidth === "number" && styles.borderWidth > 0 ? "solid" : "none",
  });
  const inner = `<div class="shape-content" style="${innerStyle}"></div>`;
  return renderElementShell(element, inner);
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

  return `<section class="slide" data-index="${index}" data-transition="${slide.transition}" style="${buildStyleAttribute({ background: serializeColor(slide.background, "#ffffff") })}">${elements}</section>`;
}

export function generateStandaloneHtmlFromResolved(presentation: Presentation): string {
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
    .slide { position: absolute; inset: 0; opacity: 0; pointer-events: none; transition: opacity 0.4s ease, transform 0.4s ease; transform: translateX(0) scale(1); }
    .slide.active { opacity: 1; pointer-events: auto; }
    .slide.active.transition-none { opacity: 1; transition: none; transform: none; pointer-events: auto; }
    .slide.stage-enter.transition-fade { opacity: 0; transform: translateX(0) scale(1); }
    .slide.stage-enter.transition-fade.stage-active { opacity: 1; transform: translateX(0) scale(1); }
    .slide.stage-enter.transition-slide { opacity: 0; transform: translateX(100%); }
    .slide.stage-enter.transition-slide.stage-active { opacity: 1; transform: translateX(0); }
    .slide.stage-enter.transition-zoom { opacity: 0; transform: scale(0.85); }
    .slide.stage-enter.transition-zoom.stage-active { opacity: 1; transform: scale(1); }
    .element-outer { position: absolute; }
    .element-inner { width: 100%; height: 100%; }
    .element-outer[data-animation="fade-up"] .element-inner { animation: fadeUp 0.6s ease both; }
    .element-outer[data-animation="scale"] .element-inner { animation: scaleIn 0.5s ease both; }
    .element-outer[data-animation="bounce"] .element-inner { animation: bounceIn 0.7s ease both; }
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
      function stageSlide(index) {
        var slide = slides[index];
        var transition = slide.getAttribute('data-transition') || 'fade';
        slides.forEach(function (item) {
          item.classList.remove('active', 'stage-enter', 'stage-active', 'transition-fade', 'transition-slide', 'transition-zoom', 'transition-none');
        });
        if (transition === 'none') {
          slide.classList.add('active', 'transition-none');
          return;
        }
        slide.classList.add('active', 'stage-enter');
        if (transition === 'fade') slide.classList.add('transition-fade');
        if (transition === 'slide') slide.classList.add('transition-slide');
        if (transition === 'zoom') slide.classList.add('transition-zoom');
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            slide.classList.add('stage-active');
          });
        });
      }
      function updateDots() {
        var dotButtons = dots.querySelectorAll('.dot');
        dotButtons.forEach(function (dot, index) {
          dot.classList.toggle('active', index === current);
        });
      }
      function goTo(index) {
        if (index < 0 || index >= slides.length || index === current) return;
        current = index;
        stageSlide(index);
        updateDots();
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
      stageSlide(0);
    })();
  </script>
</body>
</html>`;
}

export async function generateStandaloneHtml(
  presentation: Presentation,
  resolveAsset: AssetResolver,
): Promise<{ success: true; html: string; filename: string } | { success: false; error: string }> {
  const resolved = await exportPresentationJson(presentation, resolveAsset);
  if (!resolved.success) {
    return { success: false, error: resolved.error };
  }

  const parsed = parsePresentation(JSON.parse(resolved.json));
  if (!parsed.success) {
    const first = parsed.errors[0]!;
    return { success: false, error: `${first.path}: ${first.message}` };
  }

  return {
    success: true,
    html: generateStandaloneHtmlFromResolved(parsed.data),
    filename: sanitizeHtmlFilename(parsed.data.title),
  };
}

export function sanitizeFilename(title: string): string {
  return sanitizeHtmlFilename(title);
}
