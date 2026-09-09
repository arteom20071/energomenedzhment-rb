import type { Presentation, Slide, SlideElement } from "../domain/presentation";

const FONT = "Inter, sans-serif";
const INK = "#0f172a";
const MUTED = "#64748b";
const ACCENT = "#4f46e5";
const ACCENT_LIGHT = "#eef2ff";
const EMERALD = "#059669";
const EMERALD_LIGHT = "#ecfdf5";
const BORDER = "#e2e8f0";
const TITLE_NAVY = "#0b1d3a";
const SLIDE_TOTAL = 11;
const CARD_TOP = 188;
const CARD_H = 270;
const CARD_ROW2 = 478;
const COL3_H = 552;
const PHOTO_Y = 760;
const PHOTO_H = 230;

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
      fontSize: 32,
      lineHeight: 1.25,
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

function photo(
  id: string,
  src: string,
  x: number,
  y: number,
  w: number,
  h: number,
  z: number,
  alt: string,
  styles: Record<string, unknown> = {},
): SlideElement {
  return {
    id,
    type: "image",
    x,
    y,
    width: w,
    height: h,
    rotation: 0,
    zIndex: z,
    content: src,
    animation: "fade-up",
    styles: {
      objectFit: "cover",
      objectPosition: "50% 50%",
      alt,
      borderRadius: 16,
      ...styles,
    },
  };
}

function headerBlock(prefix: string, kicker: string, title: string, startZ: number): SlideElement[] {
  return [
    txt(`${prefix}-kicker`, 80, 32, 1760, 40, kicker, startZ, {
      fontSize: 30,
      fontWeight: 600,
      color: ACCENT,
    }, "fade-up"),
    txt(`${prefix}-title`, 80, 78, 1760, 88, title, startZ + 1, {
      fontSize: 52,
      fontWeight: 700,
      lineHeight: 1.1,
    }, "fade-up"),
  ];
}

function footerBlock(prefix: string, left: string, n: number, z: number): SlideElement[] {
  return [
    shp(`${prefix}-foot-line`, 80, 1010, 1760, 1, z, { fill: BORDER }),
    txt(`${prefix}-foot-l`, 80, 1020, 1000, 40, left, z + 1, {
      fontSize: 20,
      color: MUTED,
    }),
    txt(`${prefix}-foot-r`, 1200, 1020, 640, 40, `Слайд ${n} / ${SLIDE_TOTAL}`, z + 2, {
      fontSize: 20,
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
    borderRadius: 16,
    borderColor: BORDER,
    borderWidth: 1,
  });
}

function pointCard(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  z: number,
  title: string,
  body: string,
  fill = "#ffffff",
): SlideElement[] {
  return [
    card(id, x, y, w, h, z, fill),
    txt(`${id}-h`, x + 32, y + 28, w - 64, 64, title, z + 1, {
      fontSize: 40,
      fontWeight: 700,
    }, "fade-up"),
    txt(`${id}-b`, x + 32, y + 104, w - 64, h - 140, body, z + 2, {
      fontSize: 34,
      lineHeight: 1.25,
    }, "fade-up"),
  ];
}

function photoStrip(
  prefix: string,
  src: string,
  alt: string,
  z: number,
): SlideElement {
  return photo(`${prefix}-photo`, src, 80, PHOTO_Y, 1760, PHOTO_H, z, alt);
}

function titleSlide(): Slide {
  const p = "em-s00";
  return {
    id: "em-slide-00",
    background: TITLE_NAVY,
    transition: "fade",
    elements: [
      photo(
        `${p}-bg`,
        "assets/images/title-campus.jpg",
        0,
        0,
        1920,
        1080,
        0,
        "Кампус университета",
        { borderRadius: 0 },
      ),
      shp(`${p}-veil`, 0, 0, 1920, 1080, 1, { fill: TITLE_NAVY, opacity: 0.32 }),
      shp(`${p}-card`, 140, 80, 1640, 920, 2, {
        fill: "#ffffff",
        opacity: 0.86,
        borderRadius: 28,
      }),
      txt(
        `${p}-uni`,
        200,
        120,
        1520,
        110,
        "Учреждение образования\n«Белорусский государственный медицинский университет»",
        3,
        {
          fontSize: 34,
          fontWeight: 600,
          color: ACCENT,
          textAlign: "center",
          lineHeight: 1.3,
        },
        "fade-up",
      ),
      shp(`${p}-rule`, 860, 250, 200, 5, 4, { fill: ACCENT, borderRadius: 2 }),
      txt(
        `${p}-title`,
        200,
        280,
        1520,
        250,
        "Цели, задачи и организация энергоменеджмента и энергоаудита на предприятии",
        5,
        {
          fontSize: 52,
          fontWeight: 800,
          textAlign: "center",
          lineHeight: 1.15,
        },
        "fade-up",
      ),
      txt(
        `${p}-place`,
        220,
        550,
        1480,
        50,
        "Республика Беларусь",
        6,
        {
          fontSize: 34,
          color: MUTED,
          textAlign: "center",
        },
        "fade-up",
      ),
      txt(
        `${p}-author`,
        220,
        630,
        1480,
        180,
        "Подготовила: студентка\nстоматологического факультета\nЛасица Я.В., группа 7108",
        7,
        {
          fontSize: 34,
          textAlign: "center",
          lineHeight: 1.35,
        },
        "fade-up",
      ),
      txt(`${p}-year`, 220, 860, 1480, 50, "2026", 8, {
        fontSize: 32,
        color: MUTED,
        textAlign: "center",
      }),
    ],
  };
}

function slide1(): Slide {
  const p = "em-s01";
  return {
    id: "em-slide-01",
    background: "#ffffff",
    transition: "fade",
    elements: [
      shp(`${p}-accent`, 0, 0, 8, 1080, 0, { fill: ACCENT }),
      ...headerBlock(p, "Цели", "Зачем предприятию энергоменеджмент", 1),
      ...pointCard(
        `${p}-g1`,
        80,
        CARD_TOP,
        560,
        COL3_H,
        3,
        "1. Тратить меньше",
        "Снизить удельный расход ТЭР на единицу продукции и убрать лишние потери.",
        ACCENT_LIGHT,
      ),
      ...pointCard(
        `${p}-g2`,
        680,
        CARD_TOP,
        560,
        COL3_H,
        6,
        "2. Пройти аудит",
        "Получить паспорт объекта, список мер и понять, куда уходит топливо и электричество.",
      ),
      ...pointCard(
        `${p}-g3`,
        1280,
        CARD_TOP,
        560,
        COL3_H,
        9,
        "3. Собрать службу",
        "Чтобы нормы, учёт и отчёт 4-энергосбережение не висели на одном человеке.",
        EMERALD_LIGHT,
      ),
      photoStrip(p, "assets/images/photo-overview.jpg", "Энергетическое хозяйство предприятия", 12),
      ...footerBlock(p, "Цели доклада", 2, 13),
    ],
  };
}

function slide2(): Slide {
  const p = "em-s02";
  return {
    id: "em-slide-02",
    background: "#f8fafc",
    transition: "slide",
    elements: [
      ...headerBlock(p, "Нормативная база", "Какие документы действуют в Беларуси", 0),
      ...pointCard(
        `${p}-law1`,
        80,
        CARD_TOP,
        860,
        CARD_H,
        3,
        "Закон № 239-З",
        "Закон «Об энергосбережении» от 08.01.2015. Правки: № 111-З (2021) и № 128-З (2025). Аудит, нормы ТЭР, планы.",
      ),
      ...pointCard(
        `${p}-law2`,
        980,
        CARD_TOP,
        860,
        CARD_H,
        6,
        "Департамент",
        "Департамент по энергоэффективности Госстандарта. Графики аудита, нормы, energoeffect.gov.by.",
        ACCENT_LIGHT,
      ),
      ...pointCard(
        `${p}-law3`,
        80,
        CARD_ROW2,
        860,
        CARD_H,
        9,
        "ГОСТ ISO 50001 и СТБ 1774",
        "СЭнМ с 01.06.2021. Паспорт: СТБ 1774. Аудит: пост. Совмина № 216, правка № 448 от 03.09.2026.",
      ),
      ...pointCard(
        `${p}-law4`,
        980,
        CARD_ROW2,
        860,
        CARD_H,
        12,
        "Форма 4-энергосбережение",
        "Ежегодный отчёт Госстандарту: какие меры сделали и сколько ТЭР сэкономили.",
        EMERALD_LIGHT,
      ),
      photoStrip(p, "assets/images/photo-legal.jpg", "Документы по энергосбережению", 15),
      ...footerBlock(p, "Документы", 3, 16),
    ],
  };
}

function slideDuties(): Slide {
  const p = "em-s10";
  return {
    id: "em-slide-10",
    background: "#ffffff",
    transition: "fade",
    elements: [
      ...headerBlock(p, "Задачи предприятия", "Что нужно делать по закону", 0),
      ...pointCard(
        `${p}-d1`,
        80,
        CARD_TOP,
        560,
        COL3_H,
        3,
        "Считать нормы ТЭР",
        "Разработать и защитить удельные нормы расхода. С 300 т у.т. в год или если есть котёл от 0,5 Гкал/ч.",
        ACCENT_LIGHT,
      ),
      ...pointCard(
        `${p}-d2`,
        680,
        CARD_TOP,
        560,
        COL3_H,
        6,
        "Держать план",
        "Госорганизации: от 300 т у.т. Остальные юрлица: от 1 500 т у.т. (ст. 19 Закона № 239-З).",
      ),
      ...pointCard(
        `${p}-d3`,
        1280,
        CARD_TOP,
        560,
        COL3_H,
        9,
        "Сдавать отчёт",
        "Форма 4-энергосбережение: что сделали и какая экономия вышла.",
        EMERALD_LIGHT,
      ),
      photoStrip(p, "assets/images/photo-legal.jpg", "Документы по энергосбережению", 12),
      ...footerBlock(p, "Обязанности", 4, 13),
    ],
  };
}

function slide3(): Slide {
  const p = "em-s03";
  const kpi = (suffix: string, x: number, y: number, lbl: string, val: string, hint: string, z: number) => [
    card(`${p}-kpi-${suffix}`, x, y, 860, CARD_H, z, "#ffffff"),
    txt(`${p}-kpi-${suffix}-l`, x + 36, y + 16, 788, 40, lbl, z + 1, {
      fontSize: 30,
      color: MUTED,
      fontWeight: 600,
    }, "fade-up"),
    txt(`${p}-kpi-${suffix}-v`, x + 36, y + 56, 788, 90, val, z + 2, {
      fontSize: 72,
      fontWeight: 800,
      color: ACCENT,
    }, "scale"),
    txt(`${p}-kpi-${suffix}-h`, x + 36, y + 156, 788, 96, hint, z + 3, {
      fontSize: 34,
      lineHeight: 1.25,
    }, "fade-up"),
  ];
  return {
    id: "em-slide-03",
    background: "#ffffff",
    transition: "zoom",
    elements: [
      ...headerBlock(p, "Обязательный энергоаудит", "Когда аудит уже не добровольный", 0),
      ...kpi("a", 80, CARD_TOP, "Порог", "1 500", "т у.т. в год и выше: юрлицо ставят в график обследования", 3),
      ...kpi("b", 980, CARD_TOP, "Как часто", "5 лет", "Не реже. Графики областей и Минска смотрит Департамент", 7),
      ...kpi("c", 80, CARD_ROW2, "У аудитора", "от 3", "аттестованных экспертов и поверенные приборы", 11),
      ...kpi("d", 980, CARD_ROW2, "Если есть ISO", "3 г.", "Сертификат ГОСТ ISO 50001: короткий отчёт за 3 года", 15),
      photoStrip(p, "assets/images/photo-threshold.jpg", "Учёт потребления ТЭР", 19),
      ...footerBlock(p, "Пороги", 5, 20),
    ],
  };
}

function slide4(): Slide {
  const p = "em-s04";
  return {
    id: "em-slide-04",
    background: "#ffffff",
    transition: "fade",
    elements: [
      ...headerBlock(p, "Задачи аудита", "Как проводят обследование", 0),
      ...pointCard(
        `${p}-st1`,
        80,
        CARD_TOP,
        860,
        CARD_H,
        3,
        "1. Документы",
        "Расход ТЭР за 36 месяцев, договоры, тарифы, данные АСКУЭ.",
      ),
      ...pointCard(
        `${p}-st2`,
        980,
        CARD_TOP,
        860,
        CARD_H,
        6,
        "2. Замеры",
        "Нагрузки, тепло, потери, утечки, холостой ход.",
        ACCENT_LIGHT,
      ),
      ...pointCard(
        `${p}-st3`,
        80,
        CARD_ROW2,
        860,
        CARD_H,
        9,
        "3. Баланс",
        "Факт против нормы. Где коммерческие потери и неучтенный расход.",
      ),
      ...pointCard(
        `${p}-st4`,
        980,
        CARD_ROW2,
        860,
        CARD_H,
        12,
        "4. Меры",
        "Стоимость, окупаемость, паспорт. Нормы для тех, кто от 1 500 т у.т.",
        EMERALD_LIGHT,
      ),
      photoStrip(p, "assets/images/photo-audit.jpg", "Энергоаудитор на объекте", 15),
      ...footerBlock(p, "Этапы аудита", 6, 16),
    ],
  };
}

function slide5(): Slide {
  const p = "em-s05";
  return {
    id: "em-slide-05",
    background: "#f8fafc",
    transition: "slide",
    elements: [
      ...headerBlock(p, "Приборы", "Чем измеряют на обследовании", 0),
      ...pointCard(
        `${p}-ir`,
        80,
        CARD_TOP,
        860,
        CARD_H,
        3,
        "Тепловизор",
        "Стены, трубы, печи. Ищут мостики холода и дырявую изоляцию.",
      ),
      ...pointCard(
        `${p}-us`,
        980,
        CARD_TOP,
        860,
        CARD_H,
        6,
        "УЗ-расходомер",
        "Clamp-on на трубе. Сверяют коммерческий учёт и факт.",
        ACCENT_LIGHT,
      ),
      ...pointCard(
        `${p}-ga`,
        80,
        CARD_ROW2,
        860,
        CARD_H,
        9,
        "Газоанализ",
        "O₂, CO, температура дыма. Настраивают котёл, чтобы не жечь лишнее.",
      ),
      ...pointCard(
        `${p}-pq`,
        980,
        CARD_ROW2,
        860,
        CARD_H,
        12,
        "Электрика",
        "cos φ, THD, перекос фаз. База для ЧРП и компенсации. У фирмы: от 3 экспертов и приборы с действующей поверкой.",
        EMERALD_LIGHT,
      ),
      photoStrip(p, "assets/images/photo-instruments.jpg", "Приборы энергетического обследования", 15),
      ...footerBlock(p, "Замеры", 7, 16),
    ],
  };
}

function slide6(): Slide {
  const p = "em-s06";
  return {
    id: "em-slide-06",
    background: "#ffffff",
    transition: "zoom",
    elements: [
      ...headerBlock(p, "Организация системы", "СЭнМ по ГОСТ ISO 50001-2021", 0),
      ...pointCard(
        `${p}-plan`,
        80,
        CARD_TOP,
        860,
        CARD_H,
        3,
        "Plan. Политика и цели",
        "Энергополитика, значимое потребление, базовые линии EnB и показатели EnPI.",
        ACCENT_LIGHT,
      ),
      ...pointCard(
        `${p}-do`,
        980,
        CARD_TOP,
        860,
        CARD_H,
        6,
        "Do. Как работают каждый день",
        "Регламенты, обучение, закупки с учётом расхода энергии.",
      ),
      ...pointCard(
        `${p}-check`,
        80,
        CARD_ROW2,
        860,
        CARD_H,
        9,
        "Check. Сверка раз в год",
        "Сравнивают EnPI с базой. Внутренний аудит системы не реже раза в год.",
        ACCENT_LIGHT,
      ),
      ...pointCard(
        `${p}-act`,
        980,
        CARD_ROW2,
        860,
        CARD_H,
        12,
        "Act. Разбор у руководства",
        "Правят цели. Сертификат даёт короткий обязательный аудит: анализ за 3 года.",
        EMERALD_LIGHT,
      ),
      photoStrip(p, "assets/images/photo-pdca.jpg", "Цикл СЭнМ", 15),
      ...footerBlock(p, "СЭнМ", 8, 16),
    ],
  };
}

function slide7(): Slide {
  const p = "em-s07";
  return {
    id: "em-slide-07",
    background: "#ffffff",
    transition: "none",
    elements: [
      ...headerBlock(p, "Нормы и меры", "Как нормируют ТЭР и какие меры берут", 0),
      ...pointCard(
        `${p}-n1`,
        80,
        CARD_TOP,
        860,
        CARD_H,
        3,
        "Текущие и прогрессивные",
        "Текущие нормы: до 1 года. Прогрессивные: ряд на 1-5 лет, если потребление от 1 500 т у.т.",
        ACCENT_LIGHT,
      ),
      ...pointCard(
        `${p}-n2`,
        980,
        CARD_TOP,
        860,
        CARD_H,
        6,
        "Кто утверждает с 2026",
        "От 50 тыс. т у.т. и мелкие с котлом от 0,5 Гкал/ч: Департамент. От 300 до 50 000: области и Минск. Подача через «Е-Паслуга».",
      ),
      ...pointCard(
        `${p}-m1`,
        80,
        CARD_ROW2,
        860,
        CARD_H,
        9,
        "До 3 лет",
        "До года: утечки, холостой ход, наладка котла. 1-3 года: ЧРП, автоматика ИТП, свет, изоляция.",
        EMERALD_LIGHT,
      ),
      ...pointCard(
        `${p}-m2`,
        980,
        CARD_ROW2,
        860,
        CARD_H,
        12,
        "3-5 лет",
        "Когенерация, тепло уходящих газов, крупные ВЭР. Берут, если окупаемость ещё приемлема.",
        ACCENT_LIGHT,
      ),
      photoStrip(p, "assets/images/photo-measures.jpg", "Меры по энергосбережению", 15),
      ...footerBlock(p, "Нормы и меры", 9, 16),
    ],
  };
}

function slide8(): Slide {
  const p = "em-s08";
  return {
    id: "em-slide-08",
    background: "#f8fafc",
    transition: "fade",
    elements: [
      ...headerBlock(p, "Организация", "Кто за что отвечает на предприятии", 0),
      ...pointCard(
        `${p}-chief`,
        80,
        CARD_TOP,
        860,
        CARD_H,
        3,
        "Главный энергетик",
        "Лимиты, нормы, СЭнМ, связь с Департаментом, форма 4-энергосбережение.",
        ACCENT_LIGHT,
      ),
      ...pointCard(
        `${p}-comm`,
        980,
        CARD_TOP,
        860,
        CARD_H,
        6,
        "Энергетическая комиссия",
        "Технолог (нормы на изделие), механик (оборудование), финансист (деньги и окупаемость).",
      ),
      ...pointCard(
        `${p}-auto`,
        80,
        CARD_ROW2,
        1760,
        CARD_H,
        9,
        "АСКУЭ и АСТУЭ",
        "АСКУЭ считает электричество. АСТУЭ считает тепло, пар, газ и сжатый воздух. Без приборов нормы и отчёт не собрать.",
        EMERALD_LIGHT,
      ),
      photoStrip(p, "assets/images/photo-org.jpg", "Команда энергослужбы", 12),
      ...footerBlock(p, "Служба", 10, 13),
    ],
  };
}

function slide9(): Slide {
  const p = "em-s09";
  return {
    id: "em-slide-09",
    background: "#ffffff",
    transition: "slide",
    elements: [
      ...headerBlock(p, "Год работы", "Что считать результатом", 0),
      ...pointCard(
        `${p}-dq`,
        80,
        CARD_TOP,
        560,
        COL3_H,
        3,
        "Δq",
        "Удельный расход ТЭР на изделие падает. Нормы держатся, а не живут только на бумаге.",
        ACCENT_LIGHT,
      ),
      ...pointCard(
        `${p}-roi`,
        680,
        CARD_TOP,
        560,
        COL3_H,
        6,
        "Деньги",
        "Доля энергии в себестоимости меньше. Меры окупаются в срок, который утвердили.",
      ),
      ...pointCard(
        `${p}-iso`,
        1280,
        CARD_TOP,
        560,
        COL3_H,
        9,
        "ISO",
        "Сертификат ГОСТ ISO 50001-2021. Тогда обязательный аудит короткий, а паспорт уже собран.",
        EMERALD_LIGHT,
      ),
      photoStrip(p, "assets/images/photo-roadmap.jpg", "Предприятие после года работы", 12),
      ...footerBlock(p, "Итог года", 11, 13),
    ],
  };
}

export const energyManagementPresentation: Presentation = {
  id: "em-pres",
  title: "Цели, задачи и организация энергоменеджмента и энергоаудита на предприятии",
  aspectRatio: "16:9",
  slides: [
    titleSlide(),
    slide1(),
    slide2(),
    slideDuties(),
    slide3(),
    slide4(),
    slide5(),
    slide6(),
    slide7(),
    slide8(),
    slide9(),
  ],
};
