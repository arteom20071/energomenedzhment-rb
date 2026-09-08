import type { SlideElement } from "../../domain/presentation";
import {
  createImageElement,
  createShapeElement,
  createTextElement,
} from "../../domain/factories";

const INDIGO = "#6366f1";
const SLATE_50 = "#f8fafc";
const SLATE_300 = "#cbd5e1";
const SLATE_700 = "#334155";
const SLATE_900 = "#0f172a";

export function buildTitleElements(occupiedIds: Set<string>): SlideElement[] {
  const elements: SlideElement[] = [];

  const accent = createShapeElement(elements, {
    x: 120,
    y: 120,
    width: 80,
    height: 8,
    styles: { fill: INDIGO, borderRadius: 4 },
  }, occupiedIds);
  elements.push(accent);
  occupiedIds.add(accent.id);

  const title = createTextElement(elements, {
    x: 120,
    y: 180,
    width: 1680,
    height: 140,
    content: "Заголовок презентации",
    styles: {
      fontSize: 72,
      fontWeight: 700,
      color: SLATE_50,
      textAlign: "left",
      fontFamily: "Inter, sans-serif",
    },
  }, occupiedIds);
  elements.push(title);
  occupiedIds.add(title.id);

  const subtitle = createTextElement(elements, {
    x: 120,
    y: 340,
    width: 1200,
    height: 80,
    content: "Краткий подзаголовок для ключевой идеи слайда",
    styles: {
      fontSize: 32,
      color: SLATE_300,
      fontFamily: "Inter, sans-serif",
    },
  }, occupiedIds);
  elements.push(subtitle);
  occupiedIds.add(subtitle.id);

  const hero = createImageElement(elements, {
    x: 120,
    y: 480,
    width: 1680,
    height: 480,
    content: "",
    styles: {
      objectFit: "cover",
      alt: "Область для изображения",
      borderRadius: 16,
      backgroundColor: SLATE_700,
    },
  }, occupiedIds);
  elements.push(hero);
  occupiedIds.add(hero.id);

  return elements;
}

export function buildTwoColumnsElements(occupiedIds: Set<string>): SlideElement[] {
  const elements: SlideElement[] = [];

  const heading = createTextElement(elements, {
    x: 120,
    y: 80,
    width: 1680,
    height: 80,
    content: "Две колонки",
    styles: {
      fontSize: 48,
      fontWeight: 700,
      color: SLATE_50,
      fontFamily: "Inter, sans-serif",
    },
  }, occupiedIds);
  elements.push(heading);
  occupiedIds.add(heading.id);

  const leftAccent = createShapeElement(elements, {
    x: 120,
    y: 200,
    width: 780,
    height: 6,
    styles: { fill: INDIGO, borderRadius: 3 },
  }, occupiedIds);
  elements.push(leftAccent);
  occupiedIds.add(leftAccent.id);

  const rightAccent = createShapeElement(elements, {
    x: 1020,
    y: 200,
    width: 780,
    height: 6,
    styles: { fill: INDIGO, borderRadius: 3 },
  }, occupiedIds);
  elements.push(rightAccent);
  occupiedIds.add(rightAccent.id);

  const leftTitle = createTextElement(elements, {
    x: 120,
    y: 230,
    width: 780,
    height: 60,
    content: "Левая колонка",
    styles: {
      fontSize: 32,
      fontWeight: 600,
      color: SLATE_50,
      fontFamily: "Inter, sans-serif",
    },
  }, occupiedIds);
  elements.push(leftTitle);
  occupiedIds.add(leftTitle.id);

  const rightTitle = createTextElement(elements, {
    x: 1020,
    y: 230,
    width: 780,
    height: 60,
    content: "Правая колонка",
    styles: {
      fontSize: 32,
      fontWeight: 600,
      color: SLATE_50,
      fontFamily: "Inter, sans-serif",
    },
  }, occupiedIds);
  elements.push(rightTitle);
  occupiedIds.add(rightTitle.id);

  const leftBody = createTextElement(elements, {
    x: 120,
    y: 310,
    width: 780,
    height: 640,
    content: "Опишите первую часть материала: преимущества, контекст или детали.",
    styles: {
      fontSize: 24,
      color: SLATE_300,
      lineHeight: 1.5,
      fontFamily: "Inter, sans-serif",
    },
  }, occupiedIds);
  elements.push(leftBody);
  occupiedIds.add(leftBody.id);

  const rightBody = createTextElement(elements, {
    x: 1020,
    y: 310,
    width: 780,
    height: 640,
    content: "Опишите вторую часть материала: выводы, шаги или сравнение.",
    styles: {
      fontSize: 24,
      color: SLATE_300,
      lineHeight: 1.5,
      fontFamily: "Inter, sans-serif",
    },
  }, occupiedIds);
  elements.push(rightBody);
  occupiedIds.add(rightBody.id);

  return elements;
}

export function buildMetricsGridElements(occupiedIds: Set<string>): SlideElement[] {
  const elements: SlideElement[] = [];

  const heading = createTextElement(elements, {
    x: 120,
    y: 80,
    width: 1680,
    height: 80,
    content: "Ключевые показатели",
    styles: {
      fontSize: 48,
      fontWeight: 700,
      color: SLATE_50,
      fontFamily: "Inter, sans-serif",
    },
  }, occupiedIds);
  elements.push(heading);
  occupiedIds.add(heading.id);

  const cards = [
    { value: "24%", label: "Экономия энергии", x: 120, y: 220 },
    { value: "12", label: "Внедрённых мер", x: 1020, y: 220 },
    { value: "3.2", label: "Срок окупаемости, лет", x: 120, y: 620 },
    { value: "98%", label: "Выполнение плана", x: 1020, y: 620 },
  ];

  for (const card of cards) {
    const background = createShapeElement(elements, {
      x: card.x,
      y: card.y,
      width: 780,
      height: 340,
      styles: {
        fill: SLATE_900,
        borderRadius: 20,
        borderColor: INDIGO,
        borderWidth: 2,
      },
    }, occupiedIds);
    elements.push(background);
    occupiedIds.add(background.id);

    const value = createTextElement(elements, {
      x: card.x + 40,
      y: card.y + 60,
      width: 700,
      height: 120,
      content: card.value,
      styles: {
        fontSize: 72,
        fontWeight: 700,
        color: INDIGO,
        fontFamily: "Inter, sans-serif",
      },
    }, occupiedIds);
    elements.push(value);
    occupiedIds.add(value.id);

    const label = createTextElement(elements, {
      x: card.x + 40,
      y: card.y + 200,
      width: 700,
      height: 80,
      content: card.label,
      styles: {
        fontSize: 28,
        color: SLATE_300,
        fontFamily: "Inter, sans-serif",
      },
    }, occupiedIds);
    elements.push(label);
    occupiedIds.add(label.id);
  }

  return elements;
}

export function buildTimelineElements(occupiedIds: Set<string>): SlideElement[] {
  const elements: SlideElement[] = [];

  const heading = createTextElement(elements, {
    x: 120,
    y: 80,
    width: 1680,
    height: 80,
    content: "Дорожная карта",
    styles: {
      fontSize: 48,
      fontWeight: 700,
      color: SLATE_50,
      fontFamily: "Inter, sans-serif",
    },
  }, occupiedIds);
  elements.push(heading);
  occupiedIds.add(heading.id);

  const line = createShapeElement(elements, {
    x: 160,
    y: 520,
    width: 1600,
    height: 4,
    styles: { fill: INDIGO, borderRadius: 2 },
  }, occupiedIds);
  elements.push(line);
  occupiedIds.add(line.id);

  const milestones = [
    {
      date: "Q1 2026",
      title: "Аудит",
      description: "Сбор данных и базовая линия потребления.",
      x: 160,
    },
    {
      date: "Q2 2026",
      title: "План",
      description: "Приоритизация мероприятий и бюджет.",
      x: 560,
    },
    {
      date: "Q3 2026",
      title: "Внедрение",
      description: "Реализация ключевых технических решений.",
      x: 960,
    },
    {
      date: "Q4 2026",
      title: "Контроль",
      description: "Мониторинг эффекта и корректировка.",
      x: 1360,
    },
  ];

  for (const milestone of milestones) {
    const dot = createShapeElement(elements, {
      x: milestone.x,
      y: 504,
      width: 32,
      height: 32,
      styles: { fill: INDIGO, borderRadius: 16 },
    }, occupiedIds);
    elements.push(dot);
    occupiedIds.add(dot.id);

    const date = createTextElement(elements, {
      x: milestone.x - 40,
      y: 560,
      width: 200,
      height: 40,
      content: milestone.date,
      styles: {
        fontSize: 20,
        fontWeight: 600,
        color: INDIGO,
        textAlign: "center",
        fontFamily: "Inter, sans-serif",
      },
    }, occupiedIds);
    elements.push(date);
    occupiedIds.add(date.id);

    const title = createTextElement(elements, {
      x: milestone.x - 80,
      y: 300,
      width: 280,
      height: 60,
      content: milestone.title,
      styles: {
        fontSize: 28,
        fontWeight: 600,
        color: SLATE_50,
        textAlign: "center",
        fontFamily: "Inter, sans-serif",
      },
    }, occupiedIds);
    elements.push(title);
    occupiedIds.add(title.id);

    const description = createTextElement(elements, {
      x: milestone.x - 80,
      y: 370,
      width: 280,
      height: 120,
      content: milestone.description,
      styles: {
        fontSize: 18,
        color: SLATE_300,
        textAlign: "center",
        lineHeight: 1.4,
        fontFamily: "Inter, sans-serif",
      },
    }, occupiedIds);
    elements.push(description);
    occupiedIds.add(description.id);
  }

  return elements;
}
