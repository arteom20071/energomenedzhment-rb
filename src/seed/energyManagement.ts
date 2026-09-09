import type { Presentation, Slide, SlideElement } from "../domain/presentation";
import {
  instrumentsRow,
  legalHierarchy,
  orgChart,
  paybackRow,
  pdcaWheel,
  processFlow,
  roadmap,
  schemaDiagram,
  thresholdDiagram,
} from "./diagrams";

const FONT = "Inter, sans-serif";
const INK = "#0f172a";
const MUTED = "#64748b";
const ACCENT = "#4f46e5";
const ACCENT_LIGHT = "#eef2ff";
const EMERALD = "#059669";
const EMERALD_LIGHT = "#ecfdf5";
const BORDER = "#e2e8f0";

type Anim = SlideElement["animation"];

/** Resolves a serializable seed asset path against Vite/GitHub Pages BASE_URL. */
export function resolveSeedAssetUrl(relativePath: string, baseUrl = "/"): string {
  const path = relativePath.replace(/^\//, "");
  if (!baseUrl || baseUrl === "/") {
    return `/${path}`;
  }
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBase}/${path}`;
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
  animation?: Anim,
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
      fontSize: 18,
      lineHeight: 1.35,
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
  animation?: Anim,
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
    animation,
    styles,
  };
}

function headerBlock(
  prefix: string,
  kicker: string,
  title: string,
  normRef: string,
  startZ: number,
): SlideElement[] {
  return [
    txt(`${prefix}-kicker`, 80, 48, 1200, 28, kicker, startZ, {
      fontSize: 14,
      fontWeight: 600,
      color: ACCENT,
      letterSpacing: "0.06em",
    }, "fade-up"),
    txt(`${prefix}-title`, 80, 82, 1180, 72, title, startZ + 1, {
      fontSize: 36,
      fontWeight: 700,
      lineHeight: 1.15,
    }, "fade-up"),
    txt(`${prefix}-norm`, 1520, 52, 320, 80, normRef, startZ + 2, {
      fontSize: 14,
      color: MUTED,
      textAlign: "right",
      lineHeight: 1.4,
    }, "fade-up"),
  ];
}

function footerBlock(
  prefix: string,
  left: string,
  right: string,
  z: number,
): SlideElement[] {
  return [
    shp(`${prefix}-foot-line`, 80, 1010, 1760, 1, z, { fill: BORDER }),
    txt(`${prefix}-foot-l`, 80, 1020, 800, 36, left, z + 1, {
      fontSize: 13,
      color: MUTED,
    }),
    txt(`${prefix}-foot-r`, 1120, 1020, 720, 36, right, z + 2, {
      fontSize: 13,
      color: MUTED,
      textAlign: "right",
    }),
  ];
}

function card(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  z: number,
  fill: string,
): SlideElement {
  return shp(`${id}-bg`, x, y, w, h, z, {
    fill,
    borderRadius: 12,
    borderColor: BORDER,
    borderWidth: 1,
  });
}

function legalItem(
  prefix: string,
  y: number,
  h: number,
  label: string,
  main: string,
  detail: string,
  z: number,
): SlideElement[] {
  return [
    card(`${prefix}`, 80, y, 820, h, z, "#ffffff"),
    txt(`${prefix}-lbl`, 96, y + 10, 120, 22, label, z + 1, {
      fontSize: 11,
      fontWeight: 700,
      color: ACCENT,
    }, "fade-up"),
    txt(`${prefix}-main`, 96, y + 30, 788, h - 52, main, z + 2, {
      fontSize: 12,
      lineHeight: 1.35,
    }, "fade-up"),
    txt(`${prefix}-detail`, 96, y + h - 34, 788, 28, detail, z + 3, {
      fontSize: 11,
      color: MUTED,
      lineHeight: 1.3,
    }, "fade-up"),
  ];
}

function slide1(): Slide {
  const p = "em-s01";
  const diagram = schemaDiagram(`${p}-dia`, { x: 1020, y: 140, w: 820, h: 720 }, 10);
  return {
    id: "em-slide-01",
    background: "#ffffff",
    transition: "fade",
    elements: [
      shp(`${p}-accent`, 0, 0, 8, 1080, 0, { fill: ACCENT }),
      txt(`${p}-kicker`, 80, 120, 900, 32, "Аналитический доклад · производственный сектор", 1, {
        fontSize: 15,
        fontWeight: 600,
        color: ACCENT,
      }, "fade-up"),
      txt(
        `${p}-title`,
        80,
        168,
        900,
        200,
        "Цели, задачи и организация энергоменеджмента и энергоаудита на предприятии",
        2,
        { fontSize: 40, fontWeight: 800, lineHeight: 1.12 },
        "fade-up",
      ),
      txt(
        `${p}-sub`,
        80,
        380,
        880,
        72,
        "Практическая реализация в правовом и экономическом поле Республики Беларусь",
        3,
        { fontSize: 20, color: MUTED, lineHeight: 1.4 },
        "fade-up",
      ),
      shp(`${p}-chip1-bg`, 80, 480, 260, 44, 4, { fill: ACCENT_LIGHT, borderRadius: 22 }),
      txt(`${p}-chip1`, 96, 488, 228, 28, "СТБ / ГОСТ ISO 50001", 5, {
        fontSize: 14,
        fontWeight: 600,
      }, "fade-up"),
      shp(`${p}-chip2-bg`, 352, 480, 300, 44, 6, { fill: ACCENT_LIGHT, borderRadius: 22 }),
      txt(`${p}-chip2`, 368, 488, 268, 28, "Закон РБ 08.01.2015 № 239-З", 7, {
        fontSize: 14,
        fontWeight: 600,
      }, "fade-up"),
      shp(`${p}-chip3-bg`, 664, 480, 320, 44, 8, { fill: ACCENT_LIGHT, borderRadius: 22 }),
      txt(`${p}-chip3`, 680, 488, 288, 28, "Департамент по энергоэффективности", 9, {
        fontSize: 13,
        fontWeight: 600,
      }, "fade-up"),
      ...diagram.elements,
      ...footerBlock(p, "Республика Беларусь · производственный сектор", "239-З · Госстандарт · ISO 50001", diagram.nextZ),
    ],
  };
}

function slide2(): Slide {
  const p = "em-s02";
  const diagram = legalHierarchy(`${p}-dia`, { x: 940, y: 162, w: 900, h: 260 }, 19);
  return {
    id: "em-slide-02",
    background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    transition: "slide",
    elements: [
      ...headerBlock(
        p,
        "Нормативная база",
        "Нормативно-правовой базис энергоэффективности в РБ",
        "Закон № 239-З\nпост. СМ РБ № 216 / № 448",
        0,
      ),
      ...legalItem(
        `${p}-law1`,
        162,
        108,
        "Закон",
        "Закон Республики Беларусь от 08.01.2015 № 239-З «Об энергосбережении» (изм. № 111-З от 24.05.2021, № 128-З от 31.12.2025).",
        "Ст. 10–14 — энергоаудит; ст. 16–18 — нормирование ТЭР; ст. 19 — планы энергосбережения.",
        3,
      ),
      ...legalItem(
        `${p}-law2`,
        278,
        96,
        "Регулятор",
        "Департамент по энергоэффективности Государственного комитета по стандартизации РБ.",
        "Политика, графики обследований, согласование ТЗ, надзор за нормами расхода ТЭР, energoeffect.gov.by.",
        7,
      ),
      ...legalItem(
        `${p}-law3`,
        382,
        120,
        "ТНПА",
        "ГОСТ ISO 50001-2021 (с 01.06.2021, взамен СТБ ISO 50001-2013). Положение об энергоаудите — пост. СМ РБ от 18.03.2016 № 216 (изм. № 448 от 03.09.2026). СТБ 1774 — энергетический паспорт.",
        "Примерная форма паспорта объекта обследования утверждается Советом Министров.",
        11,
      ),
      ...legalItem(
        `${p}-law4`,
        510,
        108,
        "Отчёт",
        "Форма 4-энергосбережение (Госстандарт): выполнение мероприятий по экономии ТЭР и росту местных ТЭР.",
        "Нормирование удельных расходов — с 300 т у.т./год и/или при теплоисточнике ≥ 0,5 Гкал/ч (ст. 17).",
        15,
      ),
      ...diagram.elements,
      card(`${p}-oblig`, 940, 438, 900, 280, diagram.nextZ, ACCENT_LIGHT),
      txt(`${p}-oblig-h`, 964, 454, 852, 28, "Обязательства субъекта хозяйствования", diagram.nextZ + 1, {
        fontSize: 18,
        fontWeight: 700,
      }, "fade-up"),
      txt(
        `${p}-oblig-1`,
        964,
        488,
        852,
        28,
        "• Разработка и защита удельных норм расхода ТЭР.",
        diagram.nextZ + 2,
        { fontSize: 14, lineHeight: 1.45 },
        "fade-up",
      ),
      txt(
        `${p}-oblig-2`,
        964,
        518,
        852,
        56,
        "• План мероприятий по энергосбережению: гос. организации от 300 т у.т.; иные юрлица — от 1 500 т у.т. (ст. 19).",
        diagram.nextZ + 3,
        { fontSize: 14, lineHeight: 1.45 },
        "fade-up",
      ),
      txt(
        `${p}-oblig-3`,
        964,
        578,
        852,
        28,
        "• Ежегодная статистическая отчётность по форме 4-энергосбережение.",
        diagram.nextZ + 4,
        { fontSize: 14, lineHeight: 1.45 },
        "fade-up",
      ),
      ...footerBlock(p, "Нормативно-правовой базис", "Слайд 2 / 9", diagram.nextZ + 5),
    ],
  };
}

function slide3(): Slide {
  const p = "em-s03";
  const diagram = thresholdDiagram(`${p}-dia`, { x: 80, y: 330, w: 820, h: 210 }, 19);
  const z = diagram.nextZ;
  const kpi = (suffix: string, x: number, lbl: string, val: string, hint: string, z: number) => [
    card(`${p}-kpi-${suffix}`, x, 162, 420, 156, z, "#ffffff"),
    txt(`${p}-kpi-${suffix}-l`, x + 16, 174, 388, 22, lbl, z + 1, {
      fontSize: 12,
      color: MUTED,
      fontWeight: 600,
    }, "fade-up"),
    txt(`${p}-kpi-${suffix}-v`, x + 16, 198, 388, 44, val, z + 2, {
      fontSize: 34,
      fontWeight: 800,
      color: ACCENT,
    }, "scale"),
    txt(`${p}-kpi-${suffix}-h`, x + 16, 246, 388, 60, hint, z + 3, {
      fontSize: 11,
      color: MUTED,
      lineHeight: 1.35,
    }, "fade-up"),
  ];
  return {
    id: "em-slide-03",
    background: "#ffffff",
    transition: "zoom",
    elements: [
      ...headerBlock(
        p,
        "Обязательный энергоаудит",
        "Критерии обязательности и периодичность",
        "ст. 11 Закона № 239-З\nпост. СМ РБ № 448",
        0,
      ),
      ...kpi(
        "a",
        80,
        "Порог обязательности",
        "1 500",
        "т у.т. суммарного годового потребления ТЭР и выше — юрлицо в графике обязательного обследования",
        3,
      ),
      ...kpi(
        "b",
        520,
        "Цикл обследования",
        "5 лет",
        "не реже одного раза; графики РОГУ, облисполкомов и Мингорисполкома согласовывает Департамент",
        7,
      ),
      ...kpi(
        "c",
        960,
        "Штат аудитора",
        "≥ 3",
        "аттестованных экспертов-энергоаудиторов и поверенная приборная база",
        11,
      ),
      ...kpi(
        "d",
        1400,
        "СЭнМ-преференция",
        "3 г.",
        "ГОСТ ISO 50001-2021: облегчённый отчёт — анализ эффективности ТЭР за 3 года",
        15,
      ),
      ...diagram.elements,
      card(`${p}-proc`, 940, 330, 900, 400, z, EMERALD_LIGHT),
      txt(`${p}-proc-h`, 964, 346, 852, 28, "Процедурные условия (ст. 11–13)", z + 1, {
        fontSize: 18,
        fontWeight: 700,
        color: EMERALD,
      }, "fade-up"),
      txt(
        `${p}-proc-1`,
        964,
        380,
        852,
        48,
        "• Основание — техническое задание, согласованное с территориальным органом Департамента.",
        z + 2,
        { fontSize: 13, lineHeight: 1.4 },
        "fade-up",
      ),
      txt(
        `${p}-proc-2`,
        964,
        430,
        852,
        48,
        "• После модернизации основного технологического оборудования (≤ 3 лет) — экспресс-энергоаудит.",
        z + 3,
        { fontSize: 13, lineHeight: 1.4 },
        "fade-up",
      ),
      txt(
        `${p}-proc-3`,
        964,
        480,
        852,
        48,
        "• Ниже 1 500 т у.т. — добровольно, в том числе в формате экспресс-обследования.",
        z + 4,
        { fontSize: 13, lineHeight: 1.4 },
        "fade-up",
      ),
      txt(
        `${p}-proc-4`,
        964,
        530,
        852,
        56,
        "• Сертификат ГОСТ ISO 50001-2021: отчёт из трёх блоков — эффективность за 3 года, факт мероприятий, план экономии.",
        z + 5,
        { fontSize: 13, lineHeight: 1.4 },
        "fade-up",
      ),
      txt(
        `${p}-proc-5`,
        964,
        590,
        852,
        56,
        "• Оплата услуги — за счёт обследуемого лица. Результат — паспорт, мероприятия, предложения по прогрессивным нормам.",
        z + 6,
        { fontSize: 13, lineHeight: 1.4 },
        "fade-up",
      ),
      ...footerBlock(p, "Критерии обязательности", "Слайд 3 / 9", z + 7),
    ],
  };
}

function slide4(): Slide {
  const p = "em-s04";
  const diagram = processFlow(`${p}-dia`, { x: 80, y: 158, w: 1760, h: 148 }, 3);
  const z = diagram.nextZ;
  const stage = (n: string, x: number, title: string, body: string, z: number, emerald = false) => [
    card(`${p}-st${n}`, x, 330, 420, 250, z, emerald ? EMERALD_LIGHT : ACCENT_LIGHT),
    txt(`${p}-st${n}-idx`, x + 16, 342, 48, 32, n, z + 1, {
      fontSize: 20,
      fontWeight: 800,
      color: emerald ? EMERALD : ACCENT,
    }, "fade-up"),
    txt(`${p}-st${n}-h`, x + 16, 376, 388, 28, title, z + 2, {
      fontSize: 16,
      fontWeight: 700,
    }, "fade-up"),
    txt(`${p}-st${n}-b`, x + 16, 408, 388, 160, body, z + 3, {
      fontSize: 12,
      lineHeight: 1.35,
    }, "fade-up"),
  ];
  return {
    id: "em-slide-04",
    background: "#ffffff",
    transition: "fade",
    elements: [
      ...headerBlock(
        p,
        "Методика обследования",
        "Задачи и поэтапный алгоритм энергоаудита",
        "ст. 10 Закона № 239-З\nпотенциал · паспорт · нормы",
        0,
      ),
      ...diagram.elements,
      ...stage(
        "1",
        80,
        "Документарный анализ",
        "Динамика потребления ТЭР (не менее 36 мес.), договоры энергоснабжения, тарифы, структура топливно-энергетического баланса, режимы, ремонты, данные АСКУЭ.",
        z,
      ),
      ...stage(
        "2",
        520,
        "Инструментальное обследование",
        "Замеры фактических нагрузок, расход теплоносителей, качество электроэнергии, выявление необоснованных потерь, утечек, сверхнормативных холостых ходов.",
        z + 4,
      ),
      ...stage(
        "3",
        960,
        "Энергетический баланс",
        "Фактический баланс vs нормативный. Сведение прихода/расхода по видам ТЭР, выделение ВЭР, коммерческих и технологических потерь, неучтенного расхода.",
        z + 8,
      ),
      ...stage(
        "4",
        1400,
        "ТЭО мероприятий",
        "Пакет мер с CAPEX/OPEX, сроком окупаемости PBP, NPV при необходимости. Включение в план энергосбережения; предложения по прогрессивным нормам (ст. 14).",
        z + 12,
        true,
      ),
      txt(
        `${p}-note`,
        80,
        596,
        1760,
        72,
        "Выходные документы: отчёт об энергетическом обследовании, энергетический паспорт объекта, перечень энергосберегающих мероприятий, обоснование перехода на прогрессивные нормы расхода ТЭР (≥ 1 500 т у.т.).",
        z + 16,
        { fontSize: 13, color: MUTED },
        "fade-up",
      ),
      ...footerBlock(p, "Алгоритм энергоаудита", "Слайд 4 / 9", z + 17),
    ],
  };
}

function slide5(): Slide {
  const p = "em-s05";
  const diagram = instrumentsRow(`${p}-dia`, { x: 80, y: 158, w: 820, h: 168 }, 3);
  const z = diagram.nextZ;
  const tool = (code: string, x: number, title: string, body: string, z: number) => [
    card(`${p}-tl-${code}`, x, 400, 420, 220, z, "#ffffff"),
    txt(`${p}-tl-${code}-c`, x + 16, 412, 60, 28, code, z + 1, {
      fontSize: 16,
      fontWeight: 800,
      color: ACCENT,
    }, "fade-up"),
    txt(`${p}-tl-${code}-h`, x + 16, 444, 388, 28, title, z + 2, {
      fontSize: 15,
      fontWeight: 700,
    }, "fade-up"),
    txt(`${p}-tl-${code}-b`, x + 16, 476, 388, 132, body, z + 3, {
      fontSize: 12,
      lineHeight: 1.35,
    }, "fade-up"),
  ];
  return {
    id: "em-slide-05",
    background: "linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)",
    transition: "slide",
    elements: [
      ...headerBlock(
        p,
        "Средства измерений",
        "Инструментальный парк и контрольные замеры",
        "поверенный парк СИ\nне менее 3 экспертов",
        0,
      ),
      ...diagram.elements,
      card(`${p}-req`, 940, 158, 900, 168, z, ACCENT_LIGHT),
      txt(`${p}-req-h`, 964, 174, 852, 28, "Требование к аудиторской организации", z + 1, {
        fontSize: 18,
        fontWeight: 700,
      }, "fade-up"),
      txt(
        `${p}-req-b`,
        964,
        206,
        852,
        108,
        "Штат ≥ 3 профильных аттестованных экспертов; средства измерений в сфере законодательной метрологии — с действующей поверкой. Протоколы замеров входят в отчёт и паспорт.",
        z + 2,
        { fontSize: 14, lineHeight: 1.45 },
        "fade-up",
      ),
      ...tool(
        "IR",
        80,
        "Тепловизионная съёмка",
        "Ограждающие конструкции, теплотрассы, футеровка печей. Детекция мостиков холода, дефектов изоляции, присосов, перегрева контактных соединений.",
        z + 3,
      ),
      ...tool(
        "US",
        520,
        "Ультразвуковая расходометрия",
        "Безнарезной (clamp-on) учёт расхода жидкостей в тепловых и технологических сетях. Сверка коммерческого и технического учёта, поиск неучтённого расхода.",
        z + 7,
      ),
      ...tool(
        "GA",
        960,
        "Газоанализ котлоагрегатов",
        "Состав уходящих дымовых газов: O₂, CO, CO₂, температура. Оптимизация коэффициента избытка воздуха α, снижение q₂ и химического недожога.",
        z + 11,
      ),
      ...tool(
        "PQ",
        1400,
        "Электроизмерительные комплексы",
        "Качество электроэнергии (ГОСТ 32144), реактивная мощность, cos φ, THD, несимметрия. База для ЧРП, компенсации Q и исключения штрафных составляющих.",
        z + 15,
      ),
      ...footerBlock(p, "Инструментальный парк", "Слайд 5 / 9", z + 19),
    ],
  };
}

function slide6(): Slide {
  const p = "em-s06";
  const diagram = pdcaWheel(`${p}-dia`, { x: 80, y: 158, w: 880, h: 430 }, 3);
  const z = diagram.nextZ;
  const pdca = (code: string, label: string, x: number, y: number, body: string, z: number, emerald = false) => [
    card(`${p}-pd-${code}`, x, y, 420, 220, z, emerald ? EMERALD_LIGHT : ACCENT_LIGHT),
    txt(`${p}-pd-${code}-h`, x + 16, y + 12, 388, 32, `${code} · ${label}`, z + 1, {
      fontSize: 16,
      fontWeight: 700,
      color: emerald ? EMERALD : ACCENT,
    }, "fade-up"),
    txt(`${p}-pd-${code}-b`, x + 16, y + 48, 388, 156, body, z + 2, {
      fontSize: 12,
      lineHeight: 1.35,
    }, "fade-up"),
  ];
  return {
    id: "em-slide-06",
    background: "#ffffff",
    transition: "zoom",
    elements: [
      ...headerBlock(
        p,
        "Система энергетического менеджмента",
        "СЭнМ по ГОСТ ISO 50001-2021 (взамен СТБ ISO 50001)",
        "PDCA · EnB · EnPI\nвнутренний аудит ≥ 1 / год",
        0,
      ),
      ...diagram.elements,
      ...pdca(
        "Plan",
        "Планирование",
        1000,
        158,
        "Энергополитика высшего руководства. Энергетический анализ. Значимое энергоиспользование (SEU). Базовые линии EnB. Показатели результативности EnPI. Цели, задачи, планы действий.",
        z,
      ),
      ...pdca(
        "Do",
        "Внедрение",
        1420,
        158,
        "Регламенты эксплуатации и обслуживания энергоёмкого оборудования. Компетентность и обучение персонала. Операционное управление SEU. Закупки с учётом энергоэффективности.",
        z + 3,
      ),
      ...pdca(
        "Check",
        "Контроль",
        1000,
        394,
        "Мониторинг EnPI против EnB. Внутренний аудит СЭнМ — минимум 1 раз в год. Инструментальный мониторинг, анализ отклонений, несоответствия.",
        z + 6,
      ),
      ...pdca(
        "Act",
        "Анализ руководством",
        1420,
        394,
        "Корректирующие действия. Пересмотр целей и EnPI. В РБ сертификат даёт облегчённый формат обязательного энергоаудита (анализ за 3 года + приоритеты экономии).",
        z + 9,
        true,
      ),
      txt(`${p}-pdca-tag`, 80, 608, 400, 24, "PDCA · цикл непрерывного улучшения", z + 12, {
        fontSize: 13,
        fontWeight: 600,
        color: MUTED,
      }, "fade-up"),
      ...footerBlock(p, "СЭнМ ISO 50001", "Слайд 6 / 9", z + 13),
    ],
  };
}

function slide7(): Slide {
  const p = "em-s07";
  const diagram = paybackRow(`${p}-dia`, { x: 1020, y: 158, w: 820, h: 200 }, 9);
  const z = diagram.nextZ;
  const measure = (payback: string, x: number, title: string, body: string, z: number) => [
    card(`${p}-ms-${payback}`, x, 640, 560, 180, z, "#ffffff"),
    shp(`${p}-pb-${payback}`, x + 16, 656, 72, 32, z + 1, { fill: ACCENT, borderRadius: 8 }),
    txt(`${p}-pb-${payback}-t`, x + 16, 662, 72, 20, payback, z + 2, {
      fontSize: 12,
      fontWeight: 700,
      color: "#ffffff",
      textAlign: "center",
    }, "fade-up"),
    txt(`${p}-ms-${payback}-h`, x + 100, 654, 440, 28, title, z + 3, {
      fontSize: 16,
      fontWeight: 700,
    }, "fade-up"),
    txt(`${p}-ms-${payback}-b`, x + 16, 694, 528, 112, body, z + 4, {
      fontSize: 12,
      lineHeight: 1.35,
    }, "fade-up"),
  ];
  return {
    id: "em-slide-07",
    background: "#ffffff",
    transition: "none",
    elements: [
      ...headerBlock(
        p,
        "Нормы ТЭР и портфель мер",
        "Нормирование ТЭР и классификация мероприятий",
        "ст. 16–18 Закона № 239-З\nЕ-Паслуга · пост. № 448",
        0,
      ),
      card(`${p}-norms`, 80, 158, 900, 340, 3, ACCENT_LIGHT),
      txt(`${p}-norms-h`, 104, 172, 852, 28, "Расчёт и защита удельных норм", 4, {
        fontSize: 18,
        fontWeight: 700,
      }, "fade-up"),
      txt(
        `${p}-norms-1`,
        104,
        206,
        852,
        28,
        "• Текущие нормы — на период до 1 года.",
        5,
        { fontSize: 13, lineHeight: 1.4 },
        "fade-up",
      ),
      txt(
        `${p}-norms-2`,
        104,
        236,
        852,
        48,
        "• Прогрессивные нормы — ряд на 1–5 лет для потребителей ≥ 1 500 т у.т., в том числе по результатам энергоаудита.",
        6,
        { fontSize: 13, lineHeight: 1.4 },
        "fade-up",
      ),
      txt(
        `${p}-norms-b`,
        104,
        288,
        852,
        96,
        "• С 2026 г.: Департамент устанавливает нормы для ≥ 50 тыс. т у.т. и для < 300 т у.т. с теплоисточником ≥ 0,5 Гкал/ч (единые нормы — публикация до 1 ноября). Диапазон 300–50 000 т у.т. — областные и Минское городское управления по надзору.",
        7,
        { fontSize: 12, lineHeight: 1.4 },
        "fade-up",
      ),
      txt(
        `${p}-norms-4`,
        104,
        388,
        852,
        28,
        "• Подача — в электронном виде через портал «Е-Паслуга».",
        8,
        { fontSize: 13, lineHeight: 1.4 },
        "fade-up",
      ),
      ...diagram.elements,
      ...measure(
        "≤ 1 г.",
        80,
        "Беззатратные / низкозатратные",
        "Уплотнение контуров, оптимизация графиков пуска, исключение утечек сжатого воздуха, отключение холостого хода, гидравлическая наладка, режимная наладка котлов (α).",
        z,
      ),
      ...measure(
        "1–3 г.",
        680,
        "Среднезатратные",
        "ЧРП на насосах и тягодутьевых механизмах, автоматизация ИТП, компенсация реактивной мощности, замена освещения и теплоизоляции трубопроводов.",
        z + 5,
      ),
      ...measure(
        "3–5 л.",
        1280,
        "CAPEX / ВЭР",
        "Когенерация, утилизация вторичных энергоресурсов, рекуперация тепла уходящих газов и стоков, модернизация теплогенерирующих установок.",
        z + 10,
      ),
      ...footerBlock(p, "Нормирование и мероприятия", "Слайд 7 / 9", z + 15),
    ],
  };
}

function slide8(): Slide {
  const p = "em-s08";
  const diagram = orgChart(`${p}-dia`, { x: 80, y: 158, w: 820, h: 280 }, 3);
  const z = diagram.nextZ;
  const role = (suffix: string, y: number, title: string, body: string, z: number, accent = false) => [
    card(`${p}-role-${suffix}`, 940, y, 900, 130, z, accent ? ACCENT_LIGHT : "#ffffff"),
    txt(`${p}-role-${suffix}-h`, 964, y + 14, 852, 28, title, z + 1, {
      fontSize: 17,
      fontWeight: 700,
    }, "fade-up"),
    txt(`${p}-role-${suffix}-b`, 964, y + 46, 852, 72, body, z + 2, {
      fontSize: 13,
      lineHeight: 1.35,
    }, "fade-up"),
  ];
  return {
    id: "em-slide-08",
    background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
    transition: "fade",
    elements: [
      ...headerBlock(
        p,
        "Институт ответственности",
        "Организационная структура энергослужбы предприятия",
        "СЭнМ · АСКУЭ · АСТУЭ\nкросс-функциональный контур",
        0,
      ),
      ...diagram.elements,
      ...role(
        "chief",
        158,
        "Главный энергетик / энергоменеджер",
        "Оперативное управление энергохозяйством, контроль лимитов и удельных норм, координация СЭнМ, взаимодействие с Департаментом, ведение EnPI/EnB, подготовка 4-энергосбережение.",
        z,
        true,
      ),
      ...role(
        "comm",
        304,
        "Энергетическая комиссия",
        "Кросс-функциональная группа: главный технолог (нормы на единицу продукции), главный механик (состояние оборудования), финансово-экономический блок (CAPEX, PBP, включение в инвестпрограмму). Утверждение приоритетов SEU.",
        z + 3,
      ),
      ...role(
        "auto",
        450,
        "Автоматизация учёта",
        "АСКУЭ — автоматизированная система контроля и учёта электроэнергии. АСТУЭ — автоматизированная система технического учёта энергоресурсов (тепло, пар, газ, сжатый воздух). Телеметрия в реальном времени как источник EnPI и доказательная база аудита.",
        z + 6,
      ),
      txt(
        `${p}-cross`,
        80,
        462,
        820,
        40,
        "Кросс-функциональный контур: производство · финансы · эксплуатация · IT",
        z + 9,
        { fontSize: 13, color: MUTED },
        "fade-up",
      ),
      ...footerBlock(p, "Энергослужба предприятия", "Слайд 8 / 9", z + 10),
    ],
  };
}

function slide9(): Slide {
  const p = "em-s09";
  const diagram = roadmap(`${p}-dia`, { x: 80, y: 314, w: 1760, h: 132 }, 15);
  const z = diagram.nextZ;
  const kpi = (suffix: string, x: number, lbl: string, val: string, hint: string, z: number) => [
    card(`${p}-k-${suffix}`, x, 158, 560, 140, z, "#ffffff"),
    txt(`${p}-k-${suffix}-l`, x + 16, 170, 528, 22, lbl, z + 1, {
      fontSize: 12,
      color: MUTED,
      fontWeight: 600,
    }, "fade-up"),
    txt(`${p}-k-${suffix}-v`, x + 16, 196, 528, 40, val, z + 2, {
      fontSize: 30,
      fontWeight: 800,
      color: ACCENT,
    }, "scale"),
    txt(`${p}-k-${suffix}-h`, x + 16, 240, 528, 48, hint, z + 3, {
      fontSize: 11,
      color: MUTED,
      lineHeight: 1.35,
    }, "fade-up"),
  ];
  const phase = (mo: string, x: number, title: string, body: string, z: number, emerald = false) => [
    card(`${p}-ph-${mo}`, x, 520, 420, 180, z, emerald ? EMERALD_LIGHT : ACCENT_LIGHT),
    txt(`${p}-ph-${mo}-m`, x + 16, 532, 388, 22, `Месяцы ${mo}`, z + 1, {
      fontSize: 12,
      fontWeight: 700,
      color: emerald ? EMERALD : ACCENT,
    }, "fade-up"),
    txt(`${p}-ph-${mo}-h`, x + 16, 558, 388, 28, title, z + 2, {
      fontSize: 16,
      fontWeight: 700,
    }, "fade-up"),
    txt(`${p}-ph-${mo}-b`, x + 16, 590, 388, 96, body, z + 3, {
      fontSize: 12,
      lineHeight: 1.35,
    }, "fade-up"),
  ];
  return {
    id: "em-slide-09",
    background: "#ffffff",
    transition: "slide",
    elements: [
      ...headerBlock(
        p,
        "Результативность · 12 месяцев",
        "Итоговые показатели эффективности и дорожная карта",
        "уд. расход ТЭР · ROI\nаудит → СЭнМ → учёт",
        0,
      ),
      ...kpi(
        "dq",
        80,
        "Ключевые KPI",
        "Δq",
        "Снижение удельного расхода ТЭР на единицу продукции, %/год. Соблюдение установленных текущих и прогрессивных норм. Доля ВЭР и местных ТЭР.",
        3,
      ),
      ...kpi(
        "roi",
        680,
        "Финансовый результат",
        "ROI",
        "Снижение доли энергозатрат в себестоимости. PBP портфеля мер. NPV CAPEX-проектов 3–5 лет. Исключение сверхнормативного потребления.",
        7,
      ),
      ...kpi(
        "iso",
        1280,
        "Институциональный эффект",
        "ISO",
        "Сертификация ГОСТ ISO 50001-2021 → облегчённый энергоаудит. Готовность паспорта и плана мероприятий к включению в госпрограммы.",
        11,
      ),
      ...diagram.elements,
      ...phase(
        "1–3",
        80,
        "Энергоаудит",
        "ТЗ, согласование с территориальным органом, документарный и инструментальный этапы, баланс, паспорт.",
        z,
      ),
      ...phase(
        "4–7",
        520,
        "Внедрение рекомендаций",
        "Quick wins (PBP ≤ 1 года), запуск ЧРП/ИТП, фиксация экономии в форме 4-энергосбережение.",
        z + 4,
      ),
      ...phase(
        "8–10",
        960,
        "Сертификация СЭнМ",
        "Энергополитика, EnB/EnPI, внутренний аудит, анализ руководством, орган по сертификации ГОСТ ISO 50001.",
        z + 8,
      ),
      ...phase(
        "11–12",
        1400,
        "Автоматизация учёта",
        "АСКУЭ/АСТУЭ, дашборд EnPI, постановка мониторинга отклонений от норм расхода ТЭР.",
        z + 12,
        true,
      ),
      ...footerBlock(p, "KPI и дорожная карта", "Слайд 9 / 9", z + 16),
    ],
  };
}

export const energyManagementPresentation: Presentation = {
  id: "em-pres",
  title: "Энергоменеджмент и энергоаудит на предприятии · Республика Беларусь",
  aspectRatio: "16:9",
  slides: [slide1(), slide2(), slide3(), slide4(), slide5(), slide6(), slide7(), slide8(), slide9()],
};
