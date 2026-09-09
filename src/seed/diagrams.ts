import type { SlideElement } from "../domain/presentation";

const FONT = "Inter, sans-serif";
const INK = "#0f172a";
const MUTED = "#64748b";
const SLATE = "#475569";
const BORDER = "#e2e8f0";
const WHITE = "#ffffff";
const PANEL = "#f8fafc";
const SKY = "#0284c7";
const SKY_DARK = "#0369a1";
const SKY_DEEP = "#0ea5e9";
const TEAL = "#0e7490";
const GREEN = "#059669";
const SKY_LIGHT = "#e0f2fe";
const GREEN_LIGHT = "#ecfdf5";
const GREEN_INK = "#047857";
const SLATE_FILL = "#f1f5f9";
const SLATE_INK = "#334155";

export interface DiagramFrame {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface MappedFrame extends DiagramFrame {
  vw: number;
  vh: number;
}

export function containFrame(
  box: DiagramFrame,
  viewWidth: number,
  viewHeight: number,
): MappedFrame {
  const scale = Math.min(box.w / viewWidth, box.h / viewHeight);
  const width = viewWidth * scale;
  const height = viewHeight * scale;
  return {
    x: box.x + (box.w - width) / 2,
    y: box.y + (box.h - height) / 2,
    w: width,
    h: height,
    vw: viewWidth,
    vh: viewHeight,
  };
}

function rx(frame: MappedFrame, value: number): number {
  return frame.x + (value / frame.vw) * frame.w;
}

function ry(frame: MappedFrame, value: number): number {
  return frame.y + (value / frame.vh) * frame.h;
}

function rw(frame: MappedFrame, value: number): number {
  return (value / frame.vw) * frame.w;
}

function rh(frame: MappedFrame, value: number): number {
  return (value / frame.vh) * frame.h;
}

function rf(frame: MappedFrame, value: number): number {
  return Math.max(14, Math.round(value * (frame.h / frame.vh)));
}

function roundBox(x: number, y: number, w: number, h: number) {
  return {
    x: Math.round(x),
    y: Math.round(y),
    w: Math.max(1, Math.round(w)),
    h: Math.max(1, Math.round(h)),
  };
}

function txt(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  content: string,
  z: number,
  styles: Record<string, unknown> = {},
  animation?: SlideElement["animation"],
): SlideElement {
  return {
    id,
    type: "text",
    x,
    y,
    width: w,
    height: h,
    rotation: 0,
    zIndex: z,
    content,
    animation,
    styles: {
      fontFamily: FONT,
      color: INK,
      fontSize: 16,
      lineHeight: 1.3,
      ...styles,
    },
  };
}

function shp(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  z: number,
  styles: Record<string, unknown>,
): SlideElement {
  return {
    id,
    type: "shape",
    x,
    y,
    width: w,
    height: h,
    rotation: 0,
    zIndex: z,
    styles,
  };
}

function mappedBox(
  frame: MappedFrame,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  return roundBox(rx(frame, x), ry(frame, y), rw(frame, w), rh(frame, h));
}

function mappedText(
  frame: MappedFrame,
  x: number,
  baseline: number,
  w: number,
  fontSize: number,
  lines = 1,
) {
  const size = rf(frame, fontSize);
  const height = Math.round(size * 1.35 * lines);
  const top = ry(frame, baseline) - size;
  return roundBox(rx(frame, x), top, rw(frame, w), height);
}

interface DiagramResult {
  elements: SlideElement[];
  nextZ: number;
}

function collect(prefix: string, frame: MappedFrame, zStart: number) {
  let z = zStart;
  const elements: SlideElement[] = [];
  const next = () => {
    const current = z;
    z += 1;
    return current;
  };
  return {
    next,
    result: (): DiagramResult => ({ elements, nextZ: z }),
    rect(
      id: string,
      x: number,
      y: number,
      w: number,
      h: number,
      styles: Record<string, unknown>,
    ) {
      const box = mappedBox(frame, x, y, w, h);
      elements.push(shp(`${prefix}-${id}`, box.x, box.y, box.w, box.h, next(), styles));
    },
    label(
      id: string,
      x: number,
      baseline: number,
      w: number,
      fontSize: number,
      content: string,
      styles: Record<string, unknown> = {},
      lines = 1,
    ) {
      const box = mappedText(frame, x, baseline, w, fontSize, lines);
      elements.push(
        txt(`${prefix}-${id}`, box.x, box.y, box.w, box.h, content, next(), {
          fontSize: rf(frame, fontSize),
          ...styles,
        }, "fade-up"),
      );
    },
  };
}

export function schemaDiagram(prefix: string, box: DiagramFrame, zStart: number): DiagramResult {
  const frame = containFrame(box, 720, 620);
  const d = collect(prefix, frame, zStart);
  d.rect("bg", 0, 0, 720, 620, { fill: PANEL, borderRadius: 20 });
  d.rect("frame", 36, 36, 648, 548, { fill: "transparent", borderColor: BORDER, borderWidth: 2, borderRadius: 16 });
  d.label("kicker", 56, 72, 600, 13, "КОНТУР УПРАВЛЕНИЯ ТЭР · РБ", {
    fontWeight: 700,
    color: SKY,
  });
  d.rect("law", 56, 96, 608, 86, { fill: WHITE, borderColor: BORDER, borderWidth: 1, borderRadius: 12 });
  d.label("law-h", 76, 132, 560, 18, "Закон № 239-З · Департамент Госстандарта", { fontWeight: 700 });
  d.label("law-s", 76, 158, 560, 14, "Нормирование · надзор · графики обязательного аудита", { color: SLATE });
  d.rect("audit", 56, 198, 292, 150, { fill: WHITE, borderColor: BORDER, borderWidth: 1, borderRadius: 12 });
  d.rect("audit-bar", 56, 198, 6, 150, { fill: SKY, borderRadius: 3 });
  d.label("audit-k", 80, 236, 240, 12, "ЭНЕРГОАУДИТ", { fontWeight: 700, color: SKY });
  d.label("audit-h", 80, 266, 250, 16, "≥ 1 500 т у.т. / год", { fontWeight: 700 });
  d.label("audit-1", 80, 292, 250, 13, "Цикл ≤ 5 лет · ТЗ + паспорт", { color: SLATE });
  d.label("audit-2", 80, 316, 250, 13, "Баланс · ТЭО · CAPEX/OPEX", { color: SLATE });
  d.rect("senm", 364, 198, 300, 150, { fill: WHITE, borderColor: BORDER, borderWidth: 1, borderRadius: 12 });
  d.rect("senm-bar", 364, 198, 6, 150, { fill: GREEN, borderRadius: 3 });
  d.label("senm-k", 388, 236, 250, 12, "СЭнМ", { fontWeight: 700, color: GREEN });
  d.label("senm-h", 388, 266, 250, 16, "ГОСТ ISO 50001-2021", { fontWeight: 700 });
  d.label("senm-1", 388, 292, 250, 13, "PDCA · EnB · EnPI", { color: SLATE });
  d.label("senm-2", 388, 316, 250, 13, "Внутренний аудит ≥ 1 раз/год", { color: SLATE });
  d.rect("askue", 56, 364, 608, 96, { fill: WHITE, borderColor: BORDER, borderWidth: 1, borderRadius: 12 });
  d.label("askue-h", 76, 404, 560, 16, "АСКУЭ / АСТУЭ  →  нормы ТЭР  →  форма 4-энергосбережение", {
    fontWeight: 700,
  });
  d.label("askue-s", 76, 432, 560, 13, "Телеметрия нагрузок · удельные расходы · прогрессивные нормы 1-5 лет", {
    color: SLATE,
  });
  d.rect("goal", 56, 476, 186, 72, { fill: SKY_LIGHT, borderRadius: 10 });
  d.label("goal-k", 76, 508, 150, 12, "ЦЕЛЬ", { fontWeight: 700, color: SKY_DARK });
  d.label("goal-v", 76, 530, 150, 13, "Снижение уд. расхода", { fontWeight: 600 });
  d.rect("ctrl", 258, 476, 186, 72, { fill: GREEN_LIGHT, borderRadius: 10 });
  d.label("ctrl-k", 278, 508, 150, 12, "КОНТРОЛЬ", { fontWeight: 700, color: GREEN_INK });
  d.label("ctrl-v", 278, 530, 150, 13, "Лимиты и EnPI", { fontWeight: 600 });
  d.rect("res", 460, 476, 204, 72, { fill: SLATE_FILL, borderRadius: 10 });
  d.label("res-k", 480, 508, 170, 12, "РЕЗУЛЬТАТ", { fontWeight: 700, color: SLATE_INK });
  d.label("res-v", 480, 530, 170, 13, "Доля ТЭР в себестоимости", { fontWeight: 600 });
  return d.result();
}

export function legalHierarchy(prefix: string, box: DiagramFrame, zStart: number): DiagramResult {
  const frame = containFrame(box, 640, 280);
  const d = collect(prefix, frame, zStart);
  d.label("kicker", 0, 22, 400, 12, "ИЕРАРХИЯ ТНПА", { fontWeight: 700, color: SKY });
  d.rect("l1", 0, 40, 640, 48, { fill: SKY, borderRadius: 10 });
  d.label("l1-t", 20, 70, 600, 15, "Закон РБ 08.01.2015 № 239-З «Об энергосбережении»", {
    fontWeight: 700,
    color: WHITE,
  });
  d.rect("l2", 24, 100, 592, 44, { fill: SKY_DARK, borderRadius: 10 });
  d.label("l2-t", 40, 128, 560, 14, "Постановления СМ РБ № 216 (2016) и № 448 (03.09.2026)", {
    fontWeight: 600,
    color: WHITE,
  });
  d.rect("l3", 48, 156, 544, 44, { fill: SKY_DEEP, borderRadius: 10 });
  d.label("l3-t", 64, 184, 510, 14, "ГОСТ ISO 50001-2021 · СТБ 1774 · методика нормирования ТЭР", {
    fontWeight: 600,
    color: WHITE,
  });
  d.rect("l4", 72, 212, 496, 44, { fill: PANEL, borderColor: BORDER, borderWidth: 1, borderRadius: 10 });
  d.label("l4-t", 88, 240, 460, 14, "Локальные: энергополитика · EnPI · регламенты СЭнМ · АСКУЭ", {
    fontWeight: 600,
  });
  return d.result();
}

export function thresholdDiagram(prefix: string, box: DiagramFrame, zStart: number): DiagramResult {
  const frame = containFrame(box, 640, 220);
  const d = collect(prefix, frame, zStart);
  d.rect("bg", 0, 0, 640, 220, { fill: PANEL, borderRadius: 16 });
  d.label("kicker", 24, 36, 500, 12, "ПОРОГИ ПОТРЕБЛЕНИЯ ТЭР", { fontWeight: 700, color: SKY });
  d.rect("c1", 24, 56, 180, 140, { fill: WHITE, borderColor: BORDER, borderWidth: 1, borderRadius: 12 });
  d.label("c1-a", 40, 88, 150, 12, "< 300 т у.т.", { fontWeight: 700, color: MUTED });
  d.label("c1-b", 40, 118, 150, 14, "Нормы — при", { fontWeight: 700 });
  d.label("c1-c", 40, 138, 150, 14, "котле ≥ 0,5 Гкал/ч", { fontWeight: 700 });
  d.label("c1-d", 40, 168, 150, 12, "Аудит добровольный", { color: MUTED });
  d.rect("c2", 220, 56, 196, 140, { fill: WHITE, borderColor: BORDER, borderWidth: 1, borderRadius: 12 });
  d.rect("c2-bar", 220, 56, 6, 140, { fill: SKY });
  d.label("c2-a", 242, 88, 160, 12, "300-1 499 т у.т.", { fontWeight: 700, color: SKY });
  d.label("c2-b", 242, 118, 160, 14, "Нормирование ТЭР", { fontWeight: 700 });
  d.label("c2-c", 242, 138, 160, 14, "форма 4-энергосбережение", { fontWeight: 700 });
  d.label("c2-d", 242, 168, 160, 12, "Аудит — по решению / ТЗ", { color: MUTED });
  d.rect("c3", 432, 56, 184, 140, { fill: SKY, borderRadius: 12 });
  d.label("c3-a", 448, 88, 150, 12, "≥ 1 500 т у.т.", { fontWeight: 700, color: SKY_LIGHT });
  d.label("c3-b", 448, 118, 150, 15, "Обязательный", { fontWeight: 800, color: WHITE });
  d.label("c3-c", 448, 138, 150, 15, "энергоаудит", { fontWeight: 800, color: WHITE });
  d.label("c3-d", 448, 168, 150, 12, "не реже 1 раза / 5 лет", { color: SKY_LIGHT });
  return d.result();
}

export function processFlow(prefix: string, box: DiagramFrame, zStart: number): DiagramResult {
  const frame = containFrame(box, 1100, 150);
  const d = collect(prefix, frame, zStart);
  const stages = [
    { x: 0, fill: SKY, k: "ЭТАП 01", t: "Документарный", s: "баланс · договоры · динамика" },
    { x: 278, fill: SKY_DARK, k: "ЭТАП 02", t: "Инструментальный", s: "нагрузки · потери · cos φ" },
    { x: 556, fill: TEAL, k: "ЭТАП 03", t: "Энергобаланс", s: "факт vs нормативный" },
    { x: 834, fill: GREEN, k: "ЭТАП 04", t: "ТЭО мероприятий", s: "CAPEX / OPEX · PBP" },
  ] as const;
  stages.forEach((stage, index) => {
    d.rect(`st${index}`, stage.x, 24, 248, 102, { fill: stage.fill, borderRadius: 12 });
    d.label(`st${index}-k`, stage.x + 20, 58, 210, 12, stage.k, { fontWeight: 700, color: SKY_LIGHT });
    d.label(`st${index}-t`, stage.x + 20, 86, 210, 18, stage.t, { fontWeight: 700, color: WHITE });
    d.label(`st${index}-s`, stage.x + 20, 108, 210, 12, stage.s, { color: SKY_LIGHT });
  });
  return d.result();
}

export function instrumentsRow(prefix: string, box: DiagramFrame, zStart: number): DiagramResult {
  const frame = containFrame(box, 640, 180);
  const d = collect(prefix, frame, zStart);
  d.rect("bg", 0, 0, 640, 180, { fill: PANEL, borderRadius: 14 });
  const tools = [
    { x: 24, title: "IR / тепловизор", hint: "мостики холода" },
    { x: 176, title: "УЗ-расходомер", hint: "clamp-on, м³/ч" },
    { x: 328, title: "Газоанализ", hint: "O₂ · CO · α" },
    { x: 480, title: "PQ-анализатор", hint: "THD · cos φ" },
  ] as const;
  tools.forEach((tool, index) => {
    d.rect(`t${index}`, tool.x, 36, index === 3 ? 136 : 140, 108, {
      fill: WHITE,
      borderColor: BORDER,
      borderWidth: 1,
      borderRadius: 10,
    });
    d.label(`t${index}-h`, tool.x + 16, 108, 110, 13, tool.title, { fontWeight: 700 });
    d.label(`t${index}-s`, tool.x + 16, 128, 110, 11, tool.hint, { color: MUTED });
  });
  return d.result();
}

export function pdcaWheel(prefix: string, box: DiagramFrame, zStart: number): DiagramResult {
  const frame = containFrame(box, 420, 420);
  const d = collect(prefix, frame, zStart);
  d.rect("bg", 0, 0, 420, 420, { fill: PANEL, borderRadius: 20 });
  d.rect("ring", 82, 82, 256, 256, {
    fill: WHITE,
    borderColor: BORDER,
    borderWidth: 8,
    borderRadius: 128,
    shapeKind: "ellipse",
  });
  d.rect("core", 138, 138, 144, 144, {
    fill: WHITE,
    borderColor: BORDER,
    borderWidth: 1,
    borderRadius: 72,
    shapeKind: "ellipse",
  });
  d.label("core-h", 150, 204, 120, 20, "PDCA", { fontWeight: 800, textAlign: "center" });
  d.label("core-s", 150, 228, 120, 12, "ISO 50001", { color: MUTED, textAlign: "center" });
  d.label("plan", 150, 58, 120, 16, "PLAN", { fontWeight: 800, color: SKY, textAlign: "center" });
  d.label("do", 288, 216, 110, 16, "DO", { fontWeight: 800, color: SKY_DARK, textAlign: "center" });
  d.label("act", 150, 372, 120, 16, "ACT", { fontWeight: 800, color: GREEN, textAlign: "center" });
  d.label("check", 20, 216, 110, 16, "CHECK", { fontWeight: 800, color: TEAL, textAlign: "center" });
  return d.result();
}

export function paybackRow(prefix: string, box: DiagramFrame, zStart: number): DiagramResult {
  const frame = containFrame(box, 640, 200);
  const d = collect(prefix, frame, zStart);
  d.rect("bg", 0, 0, 640, 200, { fill: PANEL, borderRadius: 14 });
  d.label("kicker", 24, 32, 400, 12, "PBP · ГРАДАЦИЯ МЕР", { fontWeight: 700, color: SKY });
  d.rect("a", 24, 52, 184, 124, { fill: WHITE, borderColor: BORDER, borderWidth: 1, borderRadius: 12 });
  d.label("a-n", 40, 84, 70, 28, "≤ 1", { fontWeight: 800, color: GREEN });
  d.label("a-u", 88, 84, 90, 13, "год", { fontWeight: 700, color: MUTED });
  d.label("a-h", 40, 116, 150, 14, "OPEX / zero-cost", { fontWeight: 700 });
  d.label("a-s", 40, 140, 150, 12, "утечки · графики · уплотнения", { color: MUTED });
  d.rect("b", 224, 52, 184, 124, { fill: WHITE, borderColor: BORDER, borderWidth: 1, borderRadius: 12 });
  d.label("b-n", 240, 84, 80, 28, "1-3", { fontWeight: 800, color: SKY });
  d.label("b-u", 320, 84, 70, 13, "года", { fontWeight: 700, color: MUTED });
  d.label("b-h", 240, 116, 150, 14, "ЧРП · АСУ ИТП", { fontWeight: 700 });
  d.label("b-s", 240, 140, 150, 12, "среднезатратный CAPEX", { color: MUTED });
  d.rect("c", 424, 52, 192, 124, { fill: WHITE, borderColor: BORDER, borderWidth: 1, borderRadius: 12 });
  d.label("c-n", 440, 84, 80, 28, "3-5", { fontWeight: 800 });
  d.label("c-u", 530, 84, 70, 13, "лет", { fontWeight: 700, color: MUTED });
  d.label("c-h", 440, 116, 160, 14, "ВЭР · когенерация", { fontWeight: 700 });
  d.label("c-s", 440, 140, 160, 12, "рекуперация · CAPEX", { color: MUTED });
  return d.result();
}

export function orgChart(prefix: string, box: DiagramFrame, zStart: number): DiagramResult {
  const frame = containFrame(box, 640, 260);
  const d = collect(prefix, frame, zStart);
  d.rect("bg", 0, 0, 640, 260, { fill: PANEL, borderRadius: 16 });
  d.rect("dir", 196, 20, 248, 52, { fill: SKY, borderRadius: 10 });
  d.label("dir-t", 210, 52, 220, 15, "Директор / высшее руководство", {
    fontWeight: 700,
    color: WHITE,
    textAlign: "center",
  });
  d.rect("vline1", 318, 72, 4, 24, { fill: SKY });
  d.rect("chief", 170, 96, 300, 48, { fill: WHITE, borderColor: SKY, borderWidth: 1, borderRadius: 10 });
  d.label("chief-t", 180, 126, 280, 14, "Главный энергетик / энергоменеджер", {
    fontWeight: 700,
    textAlign: "center",
  });
  d.rect("vline2", 318, 144, 4, 24, { fill: "#94a3b8" });
  d.rect("hline", 90, 166, 460, 4, { fill: "#94a3b8" });
  d.rect("r1", 24, 176, 180, 64, { fill: WHITE, borderColor: BORDER, borderWidth: 1, borderRadius: 10 });
  d.label("r1-h", 34, 204, 160, 13, "Главный технолог", { fontWeight: 700, textAlign: "center" });
  d.label("r1-s", 34, 224, 160, 11, "удельные нормы", { color: MUTED, textAlign: "center" });
  d.rect("r2", 230, 176, 180, 64, { fill: WHITE, borderColor: BORDER, borderWidth: 1, borderRadius: 10 });
  d.label("r2-h", 240, 204, 160, 13, "Главный механик", { fontWeight: 700, textAlign: "center" });
  d.label("r2-s", 240, 224, 160, 11, "ЧРП · утечки · ремонт", { color: MUTED, textAlign: "center" });
  d.rect("r3", 436, 176, 180, 64, { fill: WHITE, borderColor: BORDER, borderWidth: 1, borderRadius: 10 });
  d.label("r3-h", 446, 204, 160, 13, "ПЭО / финансы", { fontWeight: 700, textAlign: "center" });
  d.label("r3-s", 446, 224, 160, 11, "CAPEX · PBP · ROI", { color: MUTED, textAlign: "center" });
  return d.result();
}

export function roadmap(prefix: string, box: DiagramFrame, zStart: number): DiagramResult {
  const frame = containFrame(box, 1100, 140);
  const d = collect(prefix, frame, zStart);
  d.rect("line", 40, 38, 1020, 4, { fill: SKY, borderRadius: 2 });
  const points = [
    { x: 70, m: "М1-М3", t: "Энергоаудит", s: "баланс · паспорт", color: SKY },
    { x: 340, m: "М4-М7", t: "Внедрение мер", s: "быстрые меры + ЧРП", color: SKY },
    { x: 620, m: "М8-М10", t: "Сертификация СЭнМ", s: "ГОСТ ISO 50001", color: SKY_DARK },
    { x: 900, m: "М11-М12", t: "АСКУЭ / АСТУЭ", s: "EnPI в реальном времени", color: GREEN },
  ] as const;
  points.forEach((point, index) => {
    d.rect(`dot${index}`, point.x - 10, 30, 20, 20, {
      fill: point.color,
      borderRadius: 10,
      shapeKind: "ellipse",
    });
    d.label(`m${index}`, point.x - 90, 78, 180, 12, point.m, {
      fontWeight: 700,
      color: point.color,
      textAlign: "center",
    });
    d.label(`t${index}`, point.x - 90, 100, 180, 14, point.t, { fontWeight: 700, textAlign: "center" });
    d.label(`s${index}`, point.x - 90, 120, 180, 11, point.s, { color: MUTED, textAlign: "center" });
  });
  return d.result();
}
