import type { Presentation, Slide, SlideElement } from "../domain/presentation";

const FONT = "Inter, sans-serif";
const INK = "#0f172a";
const MUTED = "#64748b";
const ACCENT = "#4f46e5";
const ACCENT_LIGHT = "#eef2ff";
const EMERALD = "#059669";
const EMERALD_LIGHT = "#ecfdf5";
const BORDER = "#e2e8f0";

type Anim = SlideElement["animation"];

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

function img(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  src: string,
  z: number,
  animation?: Anim,
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
    animation,
    styles: { objectFit: "contain", alt: "" },
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
      textTransform: "uppercase",
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

function slide1(): Slide {
  const p = "em-s01";
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
      img(`${p}-diagram`, 1020, 140, 820, 720, "/assets/images/slide-1-schema.svg", 10, "scale"),
      ...footerBlock(p, "Республика Беларусь · производственный сектор", "239-З · Госстандарт · ISO 50001", 11),
    ],
  };
}

function slide2(): Slide {
  const p = "em-s02";
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
      card(`${p}-law1`, 80, 170, 820, 118, 3, "#ffffff"),
      txt(`${p}-law1-lbl`, 96, 182, 120, 24, "Закон", 4, { fontSize: 12, fontWeight: 700, color: ACCENT }, "fade-up"),
      txt(
        `${p}-law1-txt`,
        96,
        208,
        788,
        68,
        "Закон РБ от 08.01.2015 № 239-З «Об энергосбережении». Ст. 10–14 — энергоаудит; ст. 16–18 — нормирование ТЭР.",
        5,
        { fontSize: 14 },
        "fade-up",
      ),
      card(`${p}-law2`, 80, 298, 820, 96, 6, "#ffffff"),
      txt(`${p}-law2-lbl`, 96, 310, 120, 24, "Регулятор", 7, { fontSize: 12, fontWeight: 700, color: ACCENT }, "fade-up"),
      txt(
        `${p}-law2-txt`,
        96,
        334,
        788,
        52,
        "Департамент по энергоэффективности Госстандарта РБ — политика, графики, надзор, energoeffect.gov.by.",
        8,
        { fontSize: 14 },
        "fade-up",
      ),
      card(`${p}-law3`, 80, 404, 820, 118, 9, "#ffffff"),
      txt(`${p}-law3-lbl`, 96, 416, 80, 24, "ТНПА", 10, { fontSize: 12, fontWeight: 700, color: ACCENT }, "fade-up"),
      txt(
        `${p}-law3-txt`,
        96,
        442,
        788,
        68,
        "ГОСТ ISO 50001-2021 (с 01.06.2021). Положение об энергоаудите — пост. СМ РБ № 216. СТБ 1774 — энергопаспорт.",
        11,
        { fontSize: 14 },
        "fade-up",
      ),
      card(`${p}-law4`, 80, 534, 820, 96, 12, "#ffffff"),
      txt(`${p}-law4-lbl`, 96, 546, 80, 24, "Отчёт", 13, { fontSize: 12, fontWeight: 700, color: ACCENT }, "fade-up"),
      txt(
        `${p}-law4-txt`,
        96,
        570,
        788,
        52,
        "Форма 4-энергосбережение: выполнение мероприятий по экономии ТЭР. Нормирование — с 300 т у.т./год.",
        14,
        { fontSize: 14 },
        "fade-up",
      ),
      img(`${p}-hierarchy`, 940, 170, 900, 280, "/assets/images/slide-2-legal.svg", 15, "scale"),
      card(`${p}-oblig`, 940, 470, 900, 260, 16, ACCENT_LIGHT),
      txt(`${p}-oblig-h`, 964, 488, 852, 32, "Обязательства субъекта хозяйствования", 17, {
        fontSize: 20,
        fontWeight: 700,
      }, "fade-up"),
      txt(
        `${p}-oblig-b`,
        964,
        528,
        852,
        180,
        "• Разработка и защита удельных норм расхода ТЭР.\n• План мероприятий: гос. организации от 300 т у.т.; иные — от 1 500 т у.т. (ст. 19).\n• Ежегодная отчётность по форме 4-энергосбережение.",
        18,
        { fontSize: 15, lineHeight: 1.5 },
        "fade-up",
      ),
      ...footerBlock(p, "Нормативно-правовой базис", "Слайд 2 / 9", 19),
    ],
  };
}

function slide3(): Slide {
  const p = "em-s03";
  const kpi = (suffix: string, x: number, lbl: string, val: string, hint: string, z: number) => [
    card(`${p}-kpi-${suffix}`, x, 170, 420, 150, z, "#ffffff"),
    txt(`${p}-kpi-${suffix}-l`, x + 20, 182, 380, 24, lbl, z + 1, {
      fontSize: 13,
      color: MUTED,
      fontWeight: 600,
    }, "fade-up"),
    txt(`${p}-kpi-${suffix}-v`, x + 20, 218, 380, 48, val, z + 2, {
      fontSize: 36,
      fontWeight: 800,
      color: ACCENT,
    }, "scale"),
    txt(`${p}-kpi-${suffix}-h`, x + 20, 270, 380, 44, hint, z + 3, {
      fontSize: 12,
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
      ...kpi("a", 80, "Порог обязательности", "1 500", "т у.т. суммарного годового потребления ТЭР и выше", 3),
      ...kpi("b", 520, "Цикл обследования", "5 лет", "не реже одного раза; графики согласовывает Департамент", 7),
      ...kpi("c", 960, "Штат аудитора", "≥ 3", "аттестованных экспертов-энергоаудиторов и поверенная база", 11),
      ...kpi("d", 1400, "СЭнМ-преференция", "3 г.", "ГОСТ ISO 50001-2021: облегчённый отчёт за 3 года", 15),
      img(`${p}-chart`, 80, 340, 820, 210, "/assets/images/slide-3-threshold.svg", 19, "scale"),
      card(`${p}-proc`, 940, 340, 900, 380, 20, EMERALD_LIGHT),
      txt(`${p}-proc-h`, 964, 358, 852, 32, "Процедурные условия (ст. 11–13)", 21, {
        fontSize: 20,
        fontWeight: 700,
        color: EMERALD,
      }, "fade-up"),
      txt(
        `${p}-proc-b`,
        964,
        398,
        852,
        300,
        "• ТЗ, согласованное с территориальным органом Департамента.\n• После модернизации оборудования (≤ 3 лет) — экспресс-энергоаудит.\n• Ниже 1 500 т у.т. — добровольно.\n• Сертификат ГОСТ ISO 50001-2021: отчёт из трёх блоков.\n• Оплата — за счёт обследуемого; результат — паспорт и мероприятия.",
        22,
        { fontSize: 14, lineHeight: 1.45 },
        "fade-up",
      ),
      ...footerBlock(p, "Критерии обязательности", "Слайд 3 / 9", 23),
    ],
  };
}

function slide4(): Slide {
  const p = "em-s04";
  const stage = (n: string, x: number, title: string, body: string, z: number, emerald = false) => [
    card(`${p}-st${n}`, x, 360, 420, 220, z, emerald ? EMERALD_LIGHT : ACCENT_LIGHT),
    txt(`${p}-st${n}-idx`, x + 20, 372, 48, 36, n, z + 1, {
      fontSize: 22,
      fontWeight: 800,
      color: emerald ? EMERALD : ACCENT,
    }, "fade-up"),
    txt(`${p}-st${n}-h`, x + 20, 412, 380, 32, title, z + 2, {
      fontSize: 17,
      fontWeight: 700,
    }, "fade-up"),
    txt(`${p}-st${n}-b`, x + 20, 448, 380, 120, body, z + 3, {
      fontSize: 13,
      lineHeight: 1.4,
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
      img(`${p}-flow`, 80, 168, 1760, 148, "/assets/images/slide-4-process.svg", 3, "scale"),
      ...stage("1", 80, "Документарный анализ", "Динамика потребления ТЭР (≥ 36 мес.), договоры, тарифы, баланс, данные АСКУЭ.", 7),
      ...stage("2", 520, "Инструментальное обследование", "Замеры нагрузок, расход теплоносителей, качество электроэнергии, выявление потерь.", 11),
      ...stage("3", 960, "Энергетический баланс", "Фактический vs нормативный баланс; ВЭР, коммерческие и технологические потери.", 15),
      ...stage("4", 1400, "ТЭО мероприятий", "Пакет мер с CAPEX/OPEX, PBP, NPV. Включение в план энергосбережения (ст. 14).", 19, true),
      txt(
        `${p}-note`,
        80,
        600,
        1760,
        80,
        "Выходные документы: отчёт об энергетическом обследовании, энергопаспорт, перечень мероприятий, обоснование прогрессивных норм (≥ 1 500 т у.т.).",
        23,
        { fontSize: 14, color: MUTED, fontStyle: "italic" },
        "fade-up",
      ),
      ...footerBlock(p, "Алгоритм энергоаудита", "Слайд 4 / 9", 24),
    ],
  };
}

function slide5(): Slide {
  const p = "em-s05";
  const tool = (code: string, x: number, title: string, body: string, z: number) => [
    card(`${p}-tl-${code}`, x, 420, 420, 200, z, "#ffffff"),
    txt(`${p}-tl-${code}-c`, x + 20, 432, 60, 32, code, z + 1, {
      fontSize: 18,
      fontWeight: 800,
      color: ACCENT,
    }, "fade-up"),
    txt(`${p}-tl-${code}-h`, x + 20, 468, 380, 32, title, z + 2, {
      fontSize: 16,
      fontWeight: 700,
    }, "fade-up"),
    txt(`${p}-tl-${code}-b`, x + 20, 504, 380, 100, body, z + 3, {
      fontSize: 13,
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
      img(`${p}-tools`, 80, 168, 820, 168, "/assets/images/slide-5-instruments.svg", 3, "scale"),
      card(`${p}-req`, 940, 168, 900, 168, 4, ACCENT_LIGHT),
      txt(`${p}-req-h`, 964, 186, 852, 32, "Требование к аудиторской организации", 5, {
        fontSize: 20,
        fontWeight: 700,
      }, "fade-up"),
      txt(
        `${p}-req-b`,
        964,
        224,
        852,
        96,
        "Штат ≥ 3 профильных аттестованных экспертов; средства измерений с действующей поверкой. Протоколы замеров входят в отчёт и паспорт.",
        6,
        { fontSize: 15, lineHeight: 1.45 },
        "fade-up",
      ),
      ...tool("IR", 80, "Тепловизионная съёмка", "Ограждающие конструкции, теплотрассы, футеровка. Детекция мостиков холода и перегрева.", 7),
      ...tool("US", 520, "Ультразвуковая расходометрия", "Clamp-on учёт жидкостей в тепловых сетях. Сверка коммерческого и технического учёта.", 11),
      ...tool("GA", 960, "Газоанализ котлоагрегатов", "O₂, CO, CO₂, температура. Оптимизация α, снижение q₂ и недожога.", 15),
      ...tool("PQ", 1400, "Электроизмерительные комплексы", "Качество электроэнергии (ГОСТ 32144), cos φ, THD. База для ЧРП и компенсации Q.", 19),
      ...footerBlock(p, "Инструментальный парк", "Слайд 5 / 9", 23),
    ],
  };
}

function slide6(): Slide {
  const p = "em-s06";
  const pdca = (code: string, label: string, x: number, y: number, body: string, z: number, emerald = false) => [
    card(`${p}-pd-${code}`, x, y, 420, 200, z, emerald ? EMERALD_LIGHT : ACCENT_LIGHT),
    txt(`${p}-pd-${code}-h`, x + 20, y + 16, 380, 36, `${code} · ${label}`, z + 1, {
      fontSize: 17,
      fontWeight: 700,
      color: emerald ? EMERALD : ACCENT,
    }, "fade-up"),
    txt(`${p}-pd-${code}-b`, x + 20, y + 56, 380, 128, body, z + 2, {
      fontSize: 13,
      lineHeight: 1.4,
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
      img(`${p}-pdca`, 80, 168, 880, 430, "/assets/images/slide-6-pdca.svg", 3, "scale"),
      ...pdca("Plan", "Планирование", 1000, 168, "Энергополитика, SEU, базовые линии EnB, показатели EnPI, цели и планы действий.", 4),
      ...pdca("Do", "Внедрение", 1420, 168, "Регламенты эксплуатации SEU, компетентность персонала, закупки с учётом энергоэффективности.", 7),
      ...pdca("Check", "Контроль", 1000, 388, "Мониторинг EnPI против EnB. Внутренний аудит СЭнМ — минимум 1 раз в год.", 10),
      ...pdca(
        "Act",
        "Анализ руководством",
        1420,
        388,
        "Корректирующие действия. В РБ сертификат даёт облегчённый формат обязательного энергоаудита.",
        13,
        true,
      ),
      txt(`${p}-pdca-tag`, 80, 620, 400, 28, "PDCA · цикл непрерывного улучшения", 16, {
        fontSize: 14,
        fontWeight: 600,
        color: MUTED,
      }, "fade-up"),
      ...footerBlock(p, "СЭнМ ISO 50001", "Слайд 6 / 9", 17),
    ],
  };
}

function slide7(): Slide {
  const p = "em-s07";
  const measure = (payback: string, x: number, title: string, body: string, z: number) => [
    card(`${p}-ms-${payback}`, x, 520, 560, 200, z, "#ffffff"),
    shp(`${p}-pb-${payback}`, x + 20, 540, 72, 36, z + 1, { fill: ACCENT, borderRadius: 8 }),
    txt(`${p}-pb-${payback}-t`, x + 20, 546, 72, 24, payback, z + 2, {
      fontSize: 13,
      fontWeight: 700,
      color: "#ffffff",
      textAlign: "center",
    }, "fade-up"),
    txt(`${p}-ms-${payback}-h`, x + 108, 538, 420, 32, title, z + 3, {
      fontSize: 17,
      fontWeight: 700,
    }, "fade-up"),
    txt(`${p}-ms-${payback}-b`, x + 20, 584, 520, 120, body, z + 4, {
      fontSize: 13,
      lineHeight: 1.4,
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
      card(`${p}-norms`, 80, 168, 900, 280, 3, ACCENT_LIGHT),
      txt(`${p}-norms-h`, 104, 186, 852, 32, "Расчёт и защита удельных норм", 4, {
        fontSize: 20,
        fontWeight: 700,
      }, "fade-up"),
      txt(
        `${p}-norms-b`,
        104,
        226,
        852,
        200,
        "• Текущие нормы — до 1 года.\n• Прогрессивные — на 1–5 лет для потребителей ≥ 1 500 т у.т.\n• С 2026 г.: единые нормы для ≥ 50 тыс. т у.т. и < 300 т у.т. с теплоисточником ≥ 0,5 Гкал/ч.\n• Подача через портал «Е-Паслуга».",
        5,
        { fontSize: 14, lineHeight: 1.45 },
        "fade-up",
      ),
      img(`${p}-payback`, 1020, 168, 820, 200, "/assets/images/slide-7-measures.svg", 6, "scale"),
      ...measure("≤ 1 г.", 80, "Беззатратные / низкозатратные", "Уплотнение контуров, оптимизация графиков, исключение утечек сжатого воздуха, режимная наладка.", 7),
      ...measure("1–3 г.", 680, "Среднезатратные", "ЧРП на насосах, автоматизация ИТП, компенсация реактивной мощности, замена освещения и изоляции.", 12),
      ...measure("3–5 л.", 1280, "CAPEX / ВЭР", "Когенерация, утилизация ВЭР, рекуперация тепла, модернизация теплогенерирующих установок.", 17),
      ...footerBlock(p, "Нормирование и мероприятия", "Слайд 7 / 9", 22),
    ],
  };
}

function slide8(): Slide {
  const p = "em-s08";
  const role = (suffix: string, y: number, title: string, body: string, z: number, accent = false) => [
    card(`${p}-role-${suffix}`, 940, y, 900, 130, z, accent ? ACCENT_LIGHT : "#ffffff"),
    txt(`${p}-role-${suffix}-h`, 964, y + 16, 852, 32, title, z + 1, {
      fontSize: 18,
      fontWeight: 700,
    }, "fade-up"),
    txt(`${p}-role-${suffix}-b`, 964, y + 52, 852, 68, body, z + 2, {
      fontSize: 14,
      lineHeight: 1.4,
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
      img(`${p}-org`, 80, 168, 820, 280, "/assets/images/slide-8-org.svg", 3, "scale"),
      ...role("chief", 168, "Главный энергетик / энергоменеджер", "Оперативное управление энергохозяйством, контроль норм, координация СЭнМ, ведение EnPI/EnB, подготовка 4-энергосбережение.", 4, true),
      ...role("comm", 318, "Энергетическая комиссия", "Кросс-функциональная группа: технолог, механик, финансовый блок. Утверждение приоритетов SEU.", 7),
      ...role("auto", 468, "Автоматизация учёта", "АСКУЭ — учёт электроэнергии. АСТУЭ — учёт тепла, пара, газа. Телеметрия EnPI в реальном времени.", 10),
      txt(`${p}-cross`, 80, 480, 820, 48, "Кросс-функциональный контур: производство · финансы · эксплуатация · IT", 13, {
        fontSize: 14,
        color: MUTED,
        fontStyle: "italic",
      }, "fade-up"),
      ...footerBlock(p, "Энергослужба предприятия", "Слайд 8 / 9", 14),
    ],
  };
}

function slide9(): Slide {
  const p = "em-s09";
  const kpi = (suffix: string, x: number, lbl: string, val: string, hint: string, z: number) => [
    card(`${p}-k-${suffix}`, x, 168, 560, 140, z, "#ffffff"),
    txt(`${p}-k-${suffix}-l`, x + 20, 180, 520, 24, lbl, z + 1, {
      fontSize: 13,
      color: MUTED,
      fontWeight: 600,
    }, "fade-up"),
    txt(`${p}-k-${suffix}-v`, x + 20, 210, 520, 44, val, z + 2, {
      fontSize: 32,
      fontWeight: 800,
      color: ACCENT,
    }, "scale"),
    txt(`${p}-k-${suffix}-h`, x + 20, 258, 520, 40, hint, z + 3, {
      fontSize: 12,
      color: MUTED,
      lineHeight: 1.35,
    }, "fade-up"),
  ];
  const phase = (mo: string, x: number, title: string, body: string, z: number, emerald = false) => [
    card(`${p}-ph-${mo}`, x, 520, 420, 180, z, emerald ? EMERALD_LIGHT : ACCENT_LIGHT),
    txt(`${p}-ph-${mo}-m`, x + 20, 532, 380, 24, `Месяцы ${mo}`, z + 1, {
      fontSize: 13,
      fontWeight: 700,
      color: emerald ? EMERALD : ACCENT,
    }, "fade-up"),
    txt(`${p}-ph-${mo}-h`, x + 20, 560, 380, 32, title, z + 2, {
      fontSize: 17,
      fontWeight: 700,
    }, "fade-up"),
    txt(`${p}-ph-${mo}-b`, x + 20, 596, 380, 88, body, z + 3, {
      fontSize: 13,
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
      ...kpi("dq", 80, "Ключевые KPI", "Δq", "Снижение удельного расхода ТЭР на единицу продукции, %/год. Соблюдение норм.", 3),
      ...kpi("roi", 680, "Финансовый результат", "ROI", "Снижение доли энергозатрат. PBP портфеля мер. NPV CAPEX-проектов 3–5 лет.", 7),
      ...kpi("iso", 1280, "Институциональный эффект", "ISO", "Сертификация ГОСТ ISO 50001-2021 → облегчённый энергоаудит.", 11),
      img(`${p}-road`, 80, 330, 1760, 132, "/assets/images/slide-9-roadmap.svg", 15, "scale"),
      ...phase("1–3", 80, "Энергоаудит", "ТЗ, согласование, документарный и инструментальный этапы, баланс, паспорт.", 16),
      ...phase("4–7", 520, "Внедрение рекомендаций", "Quick wins (PBP ≤ 1 года), ЧРП/ИТП, фиксация экономии в форме 4-энергосбережение.", 20),
      ...phase("8–10", 960, "Сертификация СЭнМ", "Энергополитика, EnB/EnPI, внутренний аудит, анализ руководством, сертификация ISO 50001.", 24),
      ...phase("11–12", 1400, "Автоматизация учёта", "АСКУЭ/АСТУЭ, дашборд EnPI, мониторинг отклонений от норм расхода ТЭР.", 28, true),
      ...footerBlock(p, "KPI и дорожная карта", "Слайд 9 / 9", 32),
    ],
  };
}

export const energyManagementPresentation: Presentation = {
  id: "em-pres",
  title: "Энергоменеджмент и энергоаудит на предприятии · Республика Беларусь",
  aspectRatio: "16:9",
  slides: [slide1(), slide2(), slide3(), slide4(), slide5(), slide6(), slide7(), slide8(), slide9()],
};
