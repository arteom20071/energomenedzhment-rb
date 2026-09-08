# ASCII-only generator: writes UTF-8 SVG assets with Cyrillic via unicode escapes.
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "assets" / "images"
ROOT.mkdir(parents=True, exist_ok=True)


def w(name: str, svg: str) -> None:
    (ROOT / name).write_text(svg.strip() + "\n", encoding="utf-8")


# Labels
L = {
    "kontur": "\u041a\u041e\u041d\u0422\u0423\u0420 \u0423\u041f\u0420\u0410\u0412\u041b\u0415\u041d\u0418\u042f \u0422\u042d\u0420 \u00b7 \u0420\u0411",
    "law": "\u0417\u0430\u043a\u043e\u043d \u2116 239-\u0417 \u00b7 \u0414\u0435\u043f\u0430\u0440\u0442\u0430\u043c\u0435\u043d\u0442 \u0413\u043e\u0441\u0441\u0442\u0430\u043d\u0434\u0430\u0440\u0442\u0430",
    "law_sub": "\u041d\u043e\u0440\u043c\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u00b7 \u043d\u0430\u0434\u0437\u043e\u0440 \u00b7 \u0433\u0440\u0430\u0444\u0438\u043a\u0438 \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e\u0433\u043e \u0430\u0443\u0434\u0438\u0442\u0430",
    "audit": "\u042d\u041d\u0415\u0420\u0413\u041e\u0410\u0423\u0414\u0418\u0422",
    "tce": "\u2265 1 500 \u0442 \u0443.\u0442. / \u0433\u043e\u0434",
    "cycle": "\u0426\u0438\u043a\u043b \u2264 5 \u043b\u0435\u0442 \u00b7 \u0422\u0417 + \u043f\u0430\u0441\u043f\u043e\u0440\u0442",
    "balance": "\u0411\u0430\u043b\u0430\u043d\u0441 \u00b7 \u0422\u042d\u041e \u00b7 CAPEX/OPEX",
    "sem": "\u0421\u042d\u043d\u041c",
    "gost": "\u0413\u041e\u0421\u0422 ISO 50001-2021",
    "pdca": "PDCA \u00b7 EnB \u00b7 EnPI",
    "ia": "\u0412\u043d\u0443\u0442\u0440\u0435\u043d\u043d\u0438\u0439 \u0430\u0443\u0434\u0438\u0442 \u2265 1 \u0440\u0430\u0437/\u0433\u043e\u0434",
    "askue": "\u0410\u0421\u041a\u0423\u042d / \u0410\u0421\u0422\u0423\u042d  \u2192  \u043d\u043e\u0440\u043c\u044b \u0422\u042d\u0420  \u2192  \u0444\u043e\u0440\u043c\u0430 4-\u044d\u043d\u0435\u0440\u0433\u043e\u0441\u0431\u0435\u0440\u0435\u0436\u0435\u043d\u0438\u0435",
    "tele": "\u0422\u0435\u043b\u0435\u043c\u0435\u0442\u0440\u0438\u044f \u043d\u0430\u0433\u0440\u0443\u0437\u043e\u043a \u00b7 \u0443\u0434\u0435\u043b\u044c\u043d\u044b\u0435 \u0440\u0430\u0441\u0445\u043e\u0434\u044b \u00b7 \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441\u0438\u0432\u043d\u044b\u0435 \u043d\u043e\u0440\u043c\u044b 1\u20135 \u043b\u0435\u0442",
    "goal": "\u0426\u0415\u041b\u042c",
    "goal2": "\u0421\u043d\u0438\u0436\u0435\u043d\u0438\u0435 \u0443\u0434. \u0440\u0430\u0441\u0445\u043e\u0434\u0430",
    "ctrl": "\u041a\u041e\u041d\u0422\u0420\u041e\u041b\u042c",
    "ctrl2": "\u041b\u0438\u043c\u0438\u0442\u044b \u0438 EnPI",
    "res": "\u0420\u0415\u0417\u0423\u041b\u042c\u0422\u0410\u0422",
    "res2": "\u0414\u043e\u043b\u044f \u0422\u042d\u0420 \u0432 \u0441\u0435\u0431\u0435\u0441\u0442\u043e\u0438\u043c\u043e\u0441\u0442\u0438",
    "hier": "\u0418\u0415\u0420\u0410\u0420\u0425\u0418\u042f \u0422\u041d\u041f\u0410",
    "l1": "\u0417\u0430\u043a\u043e\u043d \u0420\u0411 08.01.2015 \u2116 239-\u0417 \u00ab\u041e\u0431 \u044d\u043d\u0435\u0440\u0433\u043e\u0441\u0431\u0435\u0440\u0435\u0436\u0435\u043d\u0438\u0438\u00bb",
    "l2": "\u041f\u043e\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u044f \u0421\u041c \u0420\u0411 \u2116 216 (2016) \u0438 \u2116 448 (03.09.2026)",
    "l3": "\u0413\u041e\u0421\u0422 ISO 50001-2021 \u00b7 \u0421\u0422\u0411 1774 \u00b7 \u043c\u0435\u0442\u043e\u0434\u0438\u043a\u0430 \u043d\u043e\u0440\u043c\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u044f \u0422\u042d\u0420",
    "l4": "\u041b\u043e\u043a\u0430\u043b\u044c\u043d\u044b\u0435: \u044d\u043d\u0435\u0440\u0433\u043e\u043f\u043e\u043b\u0438\u0442\u0438\u043a\u0430 \u00b7 EnPI \u00b7 \u0440\u0435\u0433\u043b\u0430\u043c\u0435\u043d\u0442\u044b \u0421\u042d\u043d\u041c \u00b7 \u0410\u0421\u041a\u0423\u042d",
    "thr": "\u041f\u041e\u0420\u041e\u0413\u0418 \u041f\u041e\u0422\u0420\u0415\u0411\u041b\u0415\u041d\u0418\u042f \u0422\u042d\u0420",
    "lt300": "&lt; 300 \u0442 \u0443.\u0442.",
    "norms_if": "\u041d\u043e\u0440\u043c\u044b \u2014 \u043f\u0440\u0438",
    "boiler": "\u043a\u043e\u0442\u043b\u0435 \u2265 0,5 \u0413\u043a\u0430\u043b/\u0447",
    "vol": "\u0410\u0443\u0434\u0438\u0442 \u0434\u043e\u0431\u0440\u043e\u0432\u043e\u043b\u044c\u043d\u044b\u0439",
    "mid": "300 \u2013 1 499 \u0442 \u0443.\u0442.",
    "norm": "\u041d\u043e\u0440\u043c\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u0422\u042d\u0420",
    "f4": "\u0444\u043e\u0440\u043c\u0430 4-\u044d\u043d\u0435\u0440\u0433\u043e\u0441\u0431\u0435\u0440\u0435\u0436\u0435\u043d\u0438\u0435",
    "tz": "\u0410\u0443\u0434\u0438\u0442 \u2014 \u043f\u043e \u0440\u0435\u0448\u0435\u043d\u0438\u044e / \u0422\u0417",
    "ge1500": "\u2265 1 500 \u0442 \u0443.\u0442.",
    "obl": "\u041e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0439",
    "ea": "\u044d\u043d\u0435\u0440\u0433\u043e\u0430\u0443\u0434\u0438\u0442",
    "once5": "\u043d\u0435 \u0440\u0435\u0436\u0435 1 \u0440\u0430\u0437\u0430 / 5 \u043b\u0435\u0442",
    "e1": "\u042d\u0422\u0410\u041f 01",
    "e1t": "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430\u0440\u043d\u044b\u0439",
    "e1s": "\u0431\u0430\u043b\u0430\u043d\u0441 \u00b7 \u0434\u043e\u0433\u043e\u0432\u043e\u0440\u044b \u00b7 \u0434\u0438\u043d\u0430\u043c\u0438\u043a\u0430",
    "e2": "\u042d\u0422\u0410\u041f 02",
    "e2t": "\u0418\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u0430\u043b\u044c\u043d\u044b\u0439",
    "e2s": "\u043d\u0430\u0433\u0440\u0443\u0437\u043a\u0438 \u00b7 \u043f\u043e\u0442\u0435\u0440\u0438 \u00b7 cos \u03c6",
    "e3": "\u042d\u0422\u0410\u041f 03",
    "e3t": "\u042d\u043d\u0435\u0440\u0433\u043e\u0431\u0430\u043b\u0430\u043d\u0441",
    "e3s": "\u0444\u0430\u043a\u0442 vs \u043d\u043e\u0440\u043c\u0430\u0442\u0438\u0432\u043d\u044b\u0439",
    "e4": "\u042d\u0422\u0410\u041f 04",
    "e4t": "\u0422\u042d\u041e \u043c\u0435\u0440\u043e\u043f\u0440\u0438\u044f\u0442\u0438\u0439",
    "e4s": "CAPEX / OPEX \u00b7 PBP",
    "ir": "IR / \u0442\u0435\u043f\u043b\u043e\u0432\u0438\u0437\u043e\u0440",
    "ir2": "\u043c\u043e\u0441\u0442\u0438\u043a\u0438 \u0445\u043e\u043b\u043e\u0434\u0430",
    "us": "\u0423\u0417-\u0440\u0430\u0441\u0445\u043e\u0434\u043e\u043c\u0435\u0440",
    "us2": "clamp-on, \u043c\u00b3/\u0447",
    "ga": "\u0413\u0430\u0437\u043e\u0430\u043d\u0430\u043b\u0438\u0437",
    "ga2": "O\u2082 \u00b7 CO \u00b7 \u03b1",
    "pq": "PQ-\u0430\u043d\u0430\u043b\u0438\u0437\u0430\u0442\u043e\u0440",
    "pq2": "THD \u00b7 cos \u03c6",
    "pbp": "PBP \u00b7 \u0413\u0420\u0410\u0414\u0410\u0426\u0418\u042f \u041c\u0415\u0420",
    "y": "\u0433\u043e\u0434",
    "ys": "\u0433\u043e\u0434\u0430",
    "yl": "\u043b\u0435\u0442",
    "zcost": "OPEX / zero-cost",
    "zcost2": "\u0443\u0442\u0435\u0447\u043a\u0438 \u00b7 \u0433\u0440\u0430\u0444\u0438\u043a\u0438 \u00b7 \u0443\u043f\u043b\u043e\u0442\u043d\u0435\u043d\u0438\u044f",
    "vfd": "\u0427\u0420\u041f \u00b7 \u0410\u0421\u0423 \u0418\u0422\u041f",
    "vfd2": "\u0441\u0440\u0435\u0434\u043d\u0435\u0437\u0430\u0442\u0440\u0430\u0442\u043d\u044b\u0439 CAPEX",
    "wer": "\u0412\u042d\u0420 \u00b7 \u043a\u043e\u0433\u0435\u043d\u0435\u0440\u0430\u0446\u0438\u044f",
    "wer2": "\u0440\u0435\u043a\u0443\u043f\u0435\u0440\u0430\u0446\u0438\u044f \u00b7 CAPEX",
    "dir": "\u0414\u0438\u0440\u0435\u043a\u0442\u043e\u0440 / \u0432\u044b\u0441\u0448\u0435\u0435 \u0440\u0443\u043a\u043e\u0432\u043e\u0434\u0441\u0442\u0432\u043e",
    "em": "\u0413\u043b\u0430\u0432\u043d\u044b\u0439 \u044d\u043d\u0435\u0440\u0433\u0435\u0442\u0438\u043a / \u044d\u043d\u0435\u0440\u0433\u043e\u043c\u0435\u043d\u0435\u0434\u0436\u0435\u0440",
    "tech": "\u0413\u043b\u0430\u0432\u043d\u044b\u0439 \u0442\u0435\u0445\u043d\u043e\u043b\u043e\u0433",
    "tech2": "\u0443\u0434\u0435\u043b\u044c\u043d\u044b\u0435 \u043d\u043e\u0440\u043c\u044b",
    "mech": "\u0413\u043b\u0430\u0432\u043d\u044b\u0439 \u043c\u0435\u0445\u0430\u043d\u0438\u043a",
    "mech2": "\u0427\u0420\u041f \u00b7 \u0443\u0442\u0435\u0447\u043a\u0438 \u00b7 \u0440\u0435\u043c\u043e\u043d\u0442",
    "fin": "\u041f\u042d\u041e / \u0444\u0438\u043d\u0430\u043d\u0441\u044b",
    "fin2": "CAPEX \u00b7 PBP \u00b7 ROI",
    "m13": "\u041c1\u2013\u041c3",
    "m13t": "\u042d\u043d\u0435\u0440\u0433\u043e\u0430\u0443\u0434\u0438\u0442",
    "m13s": "\u0431\u0430\u043b\u0430\u043d\u0441 \u00b7 \u043f\u0430\u0441\u043f\u043e\u0440\u0442",
    "m47": "\u041c4\u2013\u041c7",
    "m47t": "\u0412\u043d\u0435\u0434\u0440\u0435\u043d\u0438\u0435 \u043c\u0435\u0440",
    "m47s": "quick wins + \u0427\u0420\u041f",
    "m810": "\u041c8\u2013\u041c10",
    "m810t": "\u0421\u0435\u0440\u0442\u0438\u0444\u0438\u043a\u0430\u0446\u0438\u044f \u0421\u042d\u043d\u041c",
    "m810s": "\u0413\u041e\u0421\u0422 ISO 50001",
    "m1112": "\u041c11\u2013\u041c12",
    "m1112t": "\u0410\u0421\u041a\u0423\u042d / \u0410\u0421\u0422\u0423\u042d",
    "m1112s": "EnPI \u0432 \u0440\u0435\u0430\u043b\u044c\u043d\u043e\u043c \u0432\u0440\u0435\u043c\u0435\u043d\u0438",
}


def text(x, y, fill, size, weight, content, anchor="start", extra=""):
    return (
        f'<text x="{x}" y="{y}" fill="{fill}" font-family="Inter, Roboto, sans-serif" '
        f'font-size="{size}" font-weight="{weight}" text-anchor="{anchor}"{extra}>{content}</text>'
    )


w(
    "slide-1-schema.svg",
    f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 620" fill="none">
  <rect width="720" height="620" rx="20" fill="#F8FAFC"/>
  <rect x="36" y="36" width="648" height="548" rx="16" stroke="#E2E8F0" stroke-dasharray="6 6"/>
  {text(56, 72, "#0284C7", 13, 700, L["kontur"], extra=' letter-spacing="1.6"')}
  <rect x="56" y="96" width="608" height="86" rx="12" fill="#FFFFFF" stroke="#E2E8F0"/>
  {text(76, 132, "#0F172A", 18, 700, L["law"])}
  {text(76, 158, "#475569", 14, 500, L["law_sub"])}
  <rect x="56" y="198" width="292" height="150" rx="12" fill="#FFFFFF" stroke="#E2E8F0"/>
  <rect x="56" y="198" width="6" height="150" rx="3" fill="#0284C7"/>
  {text(80, 236, "#0284C7", 12, 700, L["audit"])}
  {text(80, 266, "#0F172A", 16, 700, L["tce"])}
  {text(80, 292, "#475569", 13, 500, L["cycle"])}
  {text(80, 316, "#475569", 13, 500, L["balance"])}
  <rect x="364" y="198" width="300" height="150" rx="12" fill="#FFFFFF" stroke="#E2E8F0"/>
  <rect x="364" y="198" width="6" height="150" rx="3" fill="#059669"/>
  {text(388, 236, "#059669", 12, 700, L["sem"])}
  {text(388, 266, "#0F172A", 16, 700, L["gost"])}
  {text(388, 292, "#475569", 13, 500, L["pdca"])}
  {text(388, 316, "#475569", 13, 500, L["ia"])}
  <rect x="56" y="364" width="608" height="96" rx="12" fill="#FFFFFF" stroke="#E2E8F0"/>
  {text(76, 404, "#0F172A", 16, 700, L["askue"])}
  {text(76, 432, "#475569", 13, 500, L["tele"])}
  <rect x="56" y="476" width="186" height="72" rx="10" fill="#E0F2FE"/>
  {text(76, 508, "#0369A1", 12, 700, L["goal"])}
  {text(76, 530, "#0F172A", 13, 600, L["goal2"])}
  <rect x="258" y="476" width="186" height="72" rx="10" fill="#ECFDF5"/>
  {text(278, 508, "#047857", 12, 700, L["ctrl"])}
  {text(278, 530, "#0F172A", 13, 600, L["ctrl2"])}
  <rect x="460" y="476" width="204" height="72" rx="10" fill="#F1F5F9"/>
  {text(480, 508, "#334155", 12, 700, L["res"])}
  {text(480, 530, "#0F172A", 13, 600, L["res2"])}
</svg>''',
)

w(
    "slide-2-legal.svg",
    f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 280" fill="none">
  {text(0, 22, "#0284C7", 12, 700, L["hier"], extra=' letter-spacing="2"')}
  <rect x="0" y="40" width="640" height="48" rx="10" fill="#0284C7"/>
  {text(20, 70, "#FFFFFF", 15, 700, L["l1"])}
  <rect x="24" y="100" width="592" height="44" rx="10" fill="#0369A1"/>
  {text(40, 128, "#FFFFFF", 14, 600, L["l2"])}
  <rect x="48" y="156" width="544" height="44" rx="10" fill="#0EA5E9"/>
  {text(64, 184, "#FFFFFF", 14, 600, L["l3"])}
  <rect x="72" y="212" width="496" height="44" rx="10" fill="#F8FAFC" stroke="#E2E8F0"/>
  {text(88, 240, "#0F172A", 14, 600, L["l4"])}
</svg>''',
)

w(
    "slide-3-threshold.svg",
    f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 220" fill="none">
  <rect width="640" height="220" rx="16" fill="#F8FAFC"/>
  {text(24, 36, "#0284C7", 12, 700, L["thr"], extra=' letter-spacing="1.8"')}
  <rect x="24" y="56" width="180" height="140" rx="12" fill="#FFFFFF" stroke="#E2E8F0"/>
  {text(40, 88, "#64748B", 12, 700, L["lt300"])}
  {text(40, 118, "#0F172A", 14, 700, L["norms_if"])}
  {text(40, 138, "#0F172A", 14, 700, L["boiler"])}
  {text(40, 168, "#64748B", 12, 500, L["vol"])}
  <rect x="220" y="56" width="196" height="140" rx="12" fill="#FFFFFF" stroke="#E2E8F0"/>
  <rect x="220" y="56" width="6" height="140" fill="#0284C7"/>
  {text(242, 88, "#0284C7", 12, 700, L["mid"])}
  {text(242, 118, "#0F172A", 14, 700, L["norm"])}
  {text(242, 138, "#0F172A", 14, 700, L["f4"])}
  {text(242, 168, "#64748B", 12, 500, L["tz"])}
  <rect x="432" y="56" width="184" height="140" rx="12" fill="#0284C7"/>
  {text(448, 88, "#E0F2FE", 12, 700, L["ge1500"])}
  {text(448, 118, "#FFFFFF", 15, 800, L["obl"])}
  {text(448, 138, "#FFFFFF", 15, 800, L["ea"])}
  {text(448, 168, "#E0F2FE", 12, 500, L["once5"])}
</svg>''',
)

w(
    "slide-4-process.svg",
    f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 150" fill="none">
  <rect x="0" y="24" width="248" height="102" rx="12" fill="#0284C7"/>
  {text(20, 58, "#E0F2FE", 12, 700, L["e1"])}
  {text(20, 86, "#FFFFFF", 18, 700, L["e1t"])}
  {text(20, 108, "#E0F2FE", 12, 500, L["e1s"])}
  <polygon points="248,50 268,75 248,100" fill="#0284C7"/>
  <rect x="278" y="24" width="248" height="102" rx="12" fill="#0369A1"/>
  {text(298, 58, "#E0F2FE", 12, 700, L["e2"])}
  {text(298, 86, "#FFFFFF", 18, 700, L["e2t"])}
  {text(298, 108, "#E0F2FE", 12, 500, L["e2s"])}
  <polygon points="526,50 546,75 526,100" fill="#0369A1"/>
  <rect x="556" y="24" width="248" height="102" rx="12" fill="#0E7490"/>
  {text(576, 58, "#E0F2FE", 12, 700, L["e3"])}
  {text(576, 86, "#FFFFFF", 18, 700, L["e3t"])}
  {text(576, 108, "#E0F2FE", 12, 500, L["e3s"])}
  <polygon points="804,50 824,75 804,100" fill="#0E7490"/>
  <rect x="834" y="24" width="248" height="102" rx="12" fill="#059669"/>
  {text(854, 58, "#D1FAE5", 12, 700, L["e4"])}
  {text(854, 86, "#FFFFFF", 18, 700, L["e4t"])}
  {text(854, 108, "#D1FAE5", 12, 500, L["e4s"])}
</svg>''',
)

w(
    "slide-5-instruments.svg",
    f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 180" fill="none">
  <rect width="640" height="180" rx="14" fill="#F8FAFC"/>
  <g transform="translate(24,36)">
    <rect width="140" height="108" rx="10" fill="#FFFFFF" stroke="#E2E8F0"/>
    <rect x="16" y="16" width="44" height="32" rx="4" fill="#0284C7"/>
    <rect x="22" y="22" width="32" height="20" rx="2" fill="#E0F2FE"/>
    {text(16, 72, "#0F172A", 13, 700, L["ir"])}
    {text(16, 92, "#64748B", 11, 500, L["ir2"])}
  </g>
  <g transform="translate(176,36)">
    <rect width="140" height="108" rx="10" fill="#FFFFFF" stroke="#E2E8F0"/>
    <circle cx="38" cy="32" r="16" stroke="#0284C7" stroke-width="3"/>
    <path d="M38 20 v24 M26 32 h24" stroke="#0284C7" stroke-width="2"/>
    {text(16, 72, "#0F172A", 13, 700, L["us"])}
    {text(16, 92, "#64748B", 11, 500, L["us2"])}
  </g>
  <g transform="translate(328,36)">
    <rect width="140" height="108" rx="10" fill="#FFFFFF" stroke="#E2E8F0"/>
    <rect x="18" y="16" width="12" height="36" rx="2" fill="#059669"/>
    <rect x="34" y="28" width="12" height="24" rx="2" fill="#0284C7"/>
    <rect x="50" y="22" width="12" height="30" rx="2" fill="#94A3B8"/>
    {text(16, 72, "#0F172A", 13, 700, L["ga"])}
    {text(16, 92, "#64748B", 11, 500, L["ga2"])}
  </g>
  <g transform="translate(480,36)">
    <rect width="136" height="108" rx="10" fill="#FFFFFF" stroke="#E2E8F0"/>
    <path d="M18 40 L34 28 L50 44 L66 18" stroke="#0284C7" stroke-width="3" fill="none"/>
    {text(16, 72, "#0F172A", 13, 700, L["pq"])}
    {text(16, 92, "#64748B", 11, 500, L["pq2"])}
  </g>
</svg>''',
)

w(
    "slide-6-pdca.svg",
    '''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 420" fill="none">
  <rect width="420" height="420" rx="20" fill="#F8FAFC"/>
  <circle cx="210" cy="210" r="128" stroke="#E2E8F0" stroke-width="28"/>
  <circle cx="210" cy="210" r="128" stroke="#0284C7" stroke-width="28" stroke-dasharray="201 603" transform="rotate(-90 210 210)"/>
  <circle cx="210" cy="210" r="128" stroke="#0369A1" stroke-width="28" stroke-dasharray="201 603" transform="rotate(0 210 210)"/>
  <circle cx="210" cy="210" r="128" stroke="#0E7490" stroke-width="28" stroke-dasharray="201 603" transform="rotate(90 210 210)"/>
  <circle cx="210" cy="210" r="128" stroke="#059669" stroke-width="28" stroke-dasharray="201 603" transform="rotate(180 210 210)"/>
  <circle cx="210" cy="210" r="72" fill="#FFFFFF" stroke="#E2E8F0"/>
  <text x="210" y="204" text-anchor="middle" fill="#0F172A" font-family="Inter, sans-serif" font-size="20" font-weight="800">PDCA</text>
  <text x="210" y="228" text-anchor="middle" fill="#64748B" font-family="Inter, sans-serif" font-size="12">ISO 50001</text>
  <text x="210" y="58" text-anchor="middle" fill="#0284C7" font-family="Inter, sans-serif" font-size="16" font-weight="800">PLAN</text>
  <text x="348" y="216" text-anchor="middle" fill="#0369A1" font-family="Inter, sans-serif" font-size="16" font-weight="800">DO</text>
  <text x="210" y="372" text-anchor="middle" fill="#059669" font-family="Inter, sans-serif" font-size="16" font-weight="800">ACT</text>
  <text x="72" y="216" text-anchor="middle" fill="#0E7490" font-family="Inter, sans-serif" font-size="16" font-weight="800">CHECK</text>
</svg>''',
)

w(
    "slide-7-measures.svg",
    f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 200" fill="none">
  <rect width="640" height="200" rx="14" fill="#F8FAFC"/>
  {text(24, 32, "#0284C7", 12, 700, L["pbp"], extra=' letter-spacing="1.6"')}
  <rect x="24" y="52" width="184" height="124" rx="12" fill="#FFFFFF" stroke="#E2E8F0"/>
  {text(40, 84, "#059669", 28, 800, "\u2264 1")}
  {text(88, 84, "#64748B", 13, 700, L["y"])}
  {text(40, 116, "#0F172A", 14, 700, L["zcost"])}
  {text(40, 140, "#64748B", 12, 500, L["zcost2"])}
  <rect x="224" y="52" width="184" height="124" rx="12" fill="#FFFFFF" stroke="#E2E8F0"/>
  {text(240, 84, "#0284C7", 28, 800, "1\u20133")}
  {text(320, 84, "#64748B", 13, 700, L["ys"])}
  {text(240, 116, "#0F172A", 14, 700, L["vfd"])}
  {text(240, 140, "#64748B", 12, 500, L["vfd2"])}
  <rect x="424" y="52" width="192" height="124" rx="12" fill="#FFFFFF" stroke="#E2E8F0"/>
  {text(440, 84, "#0F172A", 28, 800, "3\u20135")}
  {text(530, 84, "#64748B", 13, 700, L["yl"])}
  {text(440, 116, "#0F172A", 14, 700, L["wer"])}
  {text(440, 140, "#64748B", 12, 500, L["wer2"])}
</svg>''',
)

w(
    "slide-8-org.svg",
    f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 260" fill="none">
  <rect width="640" height="260" rx="16" fill="#F8FAFC"/>
  <rect x="196" y="20" width="248" height="52" rx="10" fill="#0284C7"/>
  {text(320, 52, "#FFFFFF", 15, 700, L["dir"], "middle")}
  <line x1="320" y1="72" x2="320" y2="96" stroke="#0284C7" stroke-width="2"/>
  <rect x="170" y="96" width="300" height="48" rx="10" fill="#FFFFFF" stroke="#0284C7"/>
  {text(320, 126, "#0F172A", 14, 700, L["em"], "middle")}
  <line x1="320" y1="144" x2="320" y2="168" stroke="#94A3B8" stroke-width="2"/>
  <line x1="90" y1="168" x2="550" y2="168" stroke="#94A3B8" stroke-width="2"/>
  <rect x="24" y="176" width="180" height="64" rx="10" fill="#FFFFFF" stroke="#E2E8F0"/>
  {text(114, 204, "#0F172A", 13, 700, L["tech"], "middle")}
  {text(114, 224, "#64748B", 11, 500, L["tech2"], "middle")}
  <rect x="230" y="176" width="180" height="64" rx="10" fill="#FFFFFF" stroke="#E2E8F0"/>
  {text(320, 204, "#0F172A", 13, 700, L["mech"], "middle")}
  {text(320, 224, "#64748B", 11, 500, L["mech2"], "middle")}
  <rect x="436" y="176" width="180" height="64" rx="10" fill="#FFFFFF" stroke="#E2E8F0"/>
  {text(526, 204, "#0F172A", 13, 700, L["fin"], "middle")}
  {text(526, 224, "#64748B", 11, 500, L["fin2"], "middle")}
</svg>''',
)

w(
    "slide-9-roadmap.svg",
    f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 140" fill="none">
  <line x1="40" y1="40" x2="1060" y2="40" stroke="#E2E8F0" stroke-width="4"/>
  <line x1="40" y1="40" x2="1060" y2="40" stroke="#0284C7" stroke-width="4"/>
  <circle cx="70" cy="40" r="10" fill="#0284C7"/>
  <circle cx="340" cy="40" r="10" fill="#0284C7"/>
  <circle cx="620" cy="40" r="10" fill="#0369A1"/>
  <circle cx="900" cy="40" r="10" fill="#059669"/>
  {text(70, 78, "#0284C7", 12, 700, L["m13"], "middle")}
  {text(70, 100, "#0F172A", 14, 700, L["m13t"], "middle")}
  {text(70, 120, "#64748B", 11, 500, L["m13s"], "middle")}
  {text(340, 78, "#0284C7", 12, 700, L["m47"], "middle")}
  {text(340, 100, "#0F172A", 14, 700, L["m47t"], "middle")}
  {text(340, 120, "#64748B", 11, 500, L["m47s"], "middle")}
  {text(620, 78, "#0369A1", 12, 700, L["m810"], "middle")}
  {text(620, 100, "#0F172A", 14, 700, L["m810t"], "middle")}
  {text(620, 120, "#64748B", 11, 500, L["m810s"], "middle")}
  {text(900, 78, "#059669", 12, 700, L["m1112"], "middle")}
  {text(900, 100, "#0F172A", 14, 700, L["m1112t"], "middle")}
  {text(900, 120, "#64748B", 11, 500, L["m1112s"], "middle")}
</svg>''',
)

print("wrote", len(list(ROOT.glob("slide-*.svg"))), "svg files")
