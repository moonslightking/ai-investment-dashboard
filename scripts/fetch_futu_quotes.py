#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
import os
import re
import socket
import sys
from datetime import datetime
from pathlib import Path


BATCH_SIZE_DEFAULT = 400
BATCH_SIZE_HK = 20
CODE_PATTERN = re.compile(r"^(US|HK|SH|SZ|BJ|KS)\.[A-Za-z0-9._-]+$")


def is_finite_number(value) -> bool:
    return isinstance(value, (int, float)) and math.isfinite(value)


def parse_number(value):
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        number = float(value)
        return number if math.isfinite(number) else None
    try:
        number = float(str(value).replace(",", "").strip())
        return number if math.isfinite(number) else None
    except (TypeError, ValueError):
        return None


def normalize_code(value: str) -> str | None:
    code = str(value or "").strip().upper()
    if not code or not CODE_PATTERN.match(code):
        return None
    return code


def read_codes_from_stdin():
    raw = sys.stdin.read().strip()
    if not raw:
        return []
    payload = json.loads(raw)
    codes = payload.get("codes", []) if isinstance(payload, dict) else payload
    return codes if isinstance(codes, list) else []


def unique_codes(values):
    seen = set()
    result = []
    for value in values:
        code = normalize_code(value)
        if code and code not in seen:
            seen.add(code)
            result.append(code)
    return result


def chunk_codes(codes):
    hk_codes = [code for code in codes if code.startswith("HK.")]
    other_codes = [code for code in codes if not code.startswith("HK.")]

    for index in range(0, len(hk_codes), BATCH_SIZE_HK):
        yield hk_codes[index:index + BATCH_SIZE_HK]
    for index in range(0, len(other_codes), BATCH_SIZE_DEFAULT):
        yield other_codes[index:index + BATCH_SIZE_DEFAULT]


def row_get(row, key):
    if isinstance(row, dict):
        return row.get(key)
    try:
        return row[key]
    except Exception:
        return None


def row_to_quote(row):
    code = normalize_code(row_get(row, "code"))
    if not code:
        return None

    price = parse_number(row_get(row, "last_price"))
    prev_close = parse_number(row_get(row, "prev_close_price"))
    daily_change = parse_number(row_get(row, "change_rate"))
    if daily_change is None and is_finite_number(price) and is_finite_number(prev_close) and prev_close != 0:
        daily_change = ((price - prev_close) / prev_close) * 100

    quote = {
        "ticker": code,
        "name": str(row_get(row, "name") or "").strip(),
        "price": price,
        "open": parse_number(row_get(row, "open_price")),
        "high": parse_number(row_get(row, "high_price")),
        "low": parse_number(row_get(row, "low_price")),
        "prevClose": prev_close,
        "dailyChange": daily_change,
        "volume": parse_number(row_get(row, "volume")),
        "turnover": parse_number(row_get(row, "turnover")),
        "quoteSource": "futu-live",
        "quoteTime": row_get(row, "update_time"),
    }
    return {key: value for key, value in quote.items() if value not in (None, "")}


def fetch_futu_quotes(codes):
    log_home = os.getenv("FUTU_LOG_HOME") or "/private/tmp/futu-openapi-home"
    try:
        Path(log_home).mkdir(parents=True, exist_ok=True)
        os.environ["HOME"] = log_home
    except Exception:
        pass

    try:
        from futu import OpenQuoteContext, RET_OK
    except Exception as exc:
        return {}, {code: "futu-api package unavailable" for code in codes}, f"futu-api import failed: {exc}"

    quotes = {}
    missing = {}
    ctx = None

    def query_batch(batch):
        if not batch:
            return
        ret, data = ctx.get_market_snapshot(batch)
        if ret == RET_OK:
            returned = set()
            for row in data.to_dict("records"):
                quote = row_to_quote(row)
                if quote:
                    quotes[quote["ticker"]] = quote
                    returned.add(quote["ticker"])
            for code in batch:
                if code not in returned:
                    missing[code] = "not returned by Futu snapshot"
            return

        if len(batch) == 1:
            missing[batch[0]] = str(data)
            return

        midpoint = len(batch) // 2
        query_batch(batch[:midpoint])
        query_batch(batch[midpoint:])

    try:
        host = os.getenv("FUTU_OPEND_HOST", "127.0.0.1")
        port = int(os.getenv("FUTU_OPEND_PORT", "11111"))
        with socket.create_connection((host, port), timeout=2):
            pass
        ctx = OpenQuoteContext(host=host, port=port)
        for batch in chunk_codes(codes):
            query_batch(batch)
    except Exception as exc:
        return quotes, {code: missing.get(code, str(exc)) for code in codes if code not in quotes}, str(exc)
    finally:
        if ctx is not None:
            try:
                ctx.close()
            except Exception:
                pass

    return quotes, missing, None


def main():
    parser = argparse.ArgumentParser(description="Fetch Futu market snapshots as dashboard JSON.")
    parser.add_argument("codes", nargs="*", help="Futu security codes, e.g. US.NVDA HK.00700")
    args = parser.parse_args()

    try:
        requested_codes = read_codes_from_stdin() or args.codes
        codes = unique_codes(requested_codes)
    except Exception as exc:
        print(json.dumps({"ok": False, "error": f"invalid request payload: {exc}"}, ensure_ascii=False))
        return 2

    if not codes:
        print(json.dumps({"ok": False, "error": "no valid Futu security codes provided"}, ensure_ascii=False))
        return 2

    fetched_at = datetime.now().astimezone().isoformat(timespec="seconds")
    quotes, missing, error = fetch_futu_quotes(codes)
    payload = {
        "ok": error is None,
        "source": "futu",
        "fetchedAt": fetched_at,
        "requestedCount": len(codes),
        "quoteCoverage": len(quotes),
        "quoteSourceCounts": {"futu-live": len(quotes)},
        "quotes": quotes,
        "missing": missing,
    }
    if error:
        payload["error"] = error

    print(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
    return 0 if error is None else 2


if __name__ == "__main__":
    raise SystemExit(main())
