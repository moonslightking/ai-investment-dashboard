from __future__ import annotations

import json
import re
from pathlib import Path

from openpyxl import load_workbook


ROOT = Path(__file__).resolve().parents[1]
WORKBOOK_PATH = Path("/Users/moonlanner/Desktop/stocks analysis/L0-L2stocks.xlsx")
OUTPUT_PATH = ROOT / "src" / "industry-board" / "generatedIndustryData.js"

LAYER_META = {
    "L0": {"id": "l0", "name": "能源层", "nameEn": "Energy"},
    "L1": {"id": "l1", "name": "芯片层", "nameEn": "Semiconductors"},
    "L2": {"id": "l2", "name": "基础设施层", "nameEn": "Infrastructure"},
}

CN_NUM_MAP = {
    "一": 1,
    "二": 2,
    "三": 3,
    "四": 4,
    "五": 5,
    "六": 6,
    "七": 7,
    "八": 8,
    "九": 9,
    "十": 10,
}


def parse_number(value):
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return float(value)

    text = str(value).strip().replace(",", "")
    if not text:
        return None

    try:
        return float(text)
    except ValueError:
        return None


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "sector"


def normalize_rank_label(raw_label: str) -> str:
    text = raw_label.strip()
    if text.isdigit():
        return text

    if "_" in text:
        return text.replace("_", "-")

    if text in CN_NUM_MAP:
        return str(CN_NUM_MAP[text])

    return text


def prettify_sector_name(raw_name: str) -> str:
    text = raw_name.replace("_", " / ").strip()
    text = re.sub(r"([\u4e00-\u9fff])([A-Za-z])", r"\1 \2", text)
    text = re.sub(r"([A-Za-z])([\u4e00-\u9fff])", r"\1 \2", text)
    text = re.sub(r"\s+", " ", text).strip()

    def _title_token(match):
        token = match.group(0)
        return token if token.isupper() else token.title()

    return re.sub(r"[A-Za-z]+(?: [A-Za-z]+)*", _title_token, text)


def parse_sheet_meta(sheet_name: str):
    match = re.match(r"^(L\d)细分([0-9_]+|[一二三四五六七八九十]+)\s*(.*)$", sheet_name.strip())
    if not match:
        raise ValueError(f"Unrecognized sheet name format: {sheet_name}")

    layer_code, raw_rank, raw_name = match.groups()
    sector_name = prettify_sector_name(raw_name or sheet_name)
    rank_label = normalize_rank_label(raw_rank)
    sector_code = f"{layer_code}T{rank_label}"
    sector_id = f"{layer_code.lower()}-{slugify(rank_label)}-{slugify(sector_name)}"
    return layer_code, sector_code, sector_name, sector_id


def normalize_ticker(raw_ticker: str) -> str:
    market, _, symbol = raw_ticker.partition(".")
    market = market.upper()
    if not symbol:
        return raw_ticker

    if market == "US":
        return symbol
    if market in {"SH", "SZ", "HK", "KS"}:
        return f"{symbol}.{market}"
    return raw_ticker


def build_snapshot_trend(price, open_price, high, low, prev_close):
    if price is None or prev_close in (None, 0):
        return []

    points = [
        ("Prev", prev_close),
        ("Open", open_price),
        ("Low", low),
        ("High", high),
        ("Last", price),
    ]

    return [
        {"label": label, "value": (value / prev_close) * 100}
        for label, value in points
        if value is not None
    ]


def average_company_trends(companies):
    trends = [company["trend"] for company in companies if company.get("trend")]
    if not trends:
        return []

    labels = max(trends, key=len)
    averaged = []
    for index, point in enumerate(labels):
        values = [
            trend[index]["value"]
            for trend in trends
            if len(trend) > index and trend[index].get("value") is not None
        ]
        if values:
            averaged.append({"label": point["label"], "value": sum(values) / len(values)})

    return averaged


def build_company(row_values, rank: int):
    raw_ticker = (row_values[0] or "").strip()
    if not raw_ticker:
        return None

    company_name = row_values[1] or normalize_ticker(raw_ticker)
    price = parse_number(row_values[2])
    open_price = parse_number(row_values[5])
    prev_close = parse_number(row_values[6])
    high = parse_number(row_values[7])
    low = parse_number(row_values[8])
    daily_change = None
    if price is not None and prev_close not in (None, 0):
        daily_change = ((price - prev_close) / prev_close) * 100

    market = raw_ticker.split(".", 1)[0].upper()
    return {
        "rank": rank,
        "ticker": raw_ticker,
        "displayTicker": normalize_ticker(raw_ticker),
        "market": market,
        "name": str(company_name).strip() or normalize_ticker(raw_ticker),
        "price": price,
        "open": open_price,
        "prevClose": prev_close,
        "high": high,
        "low": low,
        "dailyChange": daily_change,
        "trend": build_snapshot_trend(price, open_price, high, low, prev_close),
    }


def build_sector(sheet):
    layer_code, sector_code, sector_name, sector_id = parse_sheet_meta(sheet.title)
    companies = []
    for idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=1):
        company = build_company(row, idx)
        if company:
            companies.append(company)

    valid_changes = [company["dailyChange"] for company in companies if company["dailyChange"] is not None]
    average_change = sum(valid_changes) / len(valid_changes) if valid_changes else 0.0
    movers = sorted(
        [company for company in companies if company["dailyChange"] is not None],
        key=lambda item: item["dailyChange"],
    )
    leader = movers[-1] if movers else None
    laggard = movers[0] if movers else None

    return layer_code, {
        "id": sector_id,
        "code": sector_code,
        "name": sector_name,
        "summary": f"{len(companies)} companies",
        "averageChange": average_change,
        "quoteCoverage": len(valid_changes),
        "leader": {
            "ticker": leader["displayTicker"],
            "change": leader["dailyChange"],
        } if leader else None,
        "laggard": {
            "ticker": laggard["displayTicker"],
            "change": laggard["dailyChange"],
        } if laggard else None,
        "trend": average_company_trends(companies),
        "companies": companies,
    }


def build_industry_chain():
    workbook = load_workbook(WORKBOOK_PATH, data_only=True)

    grouped_layers = {
        layer_code: {
            "id": meta["id"],
            "code": layer_code,
            "name": meta["name"],
            "nameEn": meta["nameEn"],
            "sectors": [],
        }
        for layer_code, meta in LAYER_META.items()
    }

    for sheet in workbook.worksheets:
        layer_code, sector = build_sector(sheet)
        grouped_layers[layer_code]["sectors"].append(sector)

    return [grouped_layers[layer_code] for layer_code in ("L0", "L1", "L2") if grouped_layers[layer_code]["sectors"]]


def main():
    industry_chain = build_industry_chain()
    payload = json.dumps(industry_chain, ensure_ascii=False, indent=2)
    content = (
        "// Auto-generated by scripts/sync_l0_l2_board_data.py.\n"
        f"// Source workbook: {WORKBOOK_PATH}\n\n"
        f"export const INDUSTRY_CHAIN = {payload};\n"
    )
    OUTPUT_PATH.write_text(content, encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
