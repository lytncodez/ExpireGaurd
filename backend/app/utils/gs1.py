"""GS1 barcode parsing (GS1-128 / GS1 DataMatrix as found on medicine packs).

A plain EAN/UPC barcode identifies only the product. GS1 element strings can also carry the batch
and expiry, using Application Identifiers (AIs):

    (01) GTIN (14 digits)      (17) expiry YYMMDD      (10) batch/lot (variable, <=20)
    (21) serial (variable)     (11) production date    (15) best-before date

Accepted inputs: the human-readable form "(01)05012345678901(17)260930(10)ACT-5541-GH", and the raw
scanner form with FNC1 separators (ASCII 29 / "<GS>") and an optional symbology prefix like "]d2".
Pure functions, no I/O.
"""

from __future__ import annotations

import calendar
import re
from dataclasses import dataclass, field
from datetime import date

GS = "\x1d"
FIXED_LENGTH = {"00": 18, "01": 14, "02": 14, "11": 6, "12": 6, "13": 6, "15": 6, "16": 6, "17": 6, "20": 2}
VARIABLE_MAX = {"10": 20, "21": 20, "22": 20, "240": 30, "241": 30, "250": 30, "30": 8, "37": 8}
_PAREN_RE = re.compile(r"\((\d{2,4})\)([^(]*)")
_SYMBOLOGY_RE = re.compile(r"^\][A-Za-z]\d")


@dataclass
class GS1Result:
    is_gs1: bool
    raw: str
    gtin: str | None = None
    batch_number: str | None = None
    expiry_date: date | None = None
    production_date: date | None = None
    serial: str | None = None
    elements: dict[str, str] = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)


def gs1_date(value: str) -> date | None:
    """YYMMDD; DD=00 means the last day of the month. Years 51-99 -> 1900s (GS1 sliding window approx.)."""
    if not re.fullmatch(r"\d{6}", value):
        return None
    yy, mm, dd = int(value[:2]), int(value[2:4]), int(value[4:])
    year = 2000 + yy if yy <= 50 else 1900 + yy
    if not 1 <= mm <= 12:
        return None
    if dd == 0:
        dd = calendar.monthrange(year, mm)[1]
    try:
        return date(year, mm, dd)
    except ValueError:
        return None


def _gtin_valid(gtin: str) -> bool:
    if not re.fullmatch(r"\d{8}|\d{12}|\d{13}|\d{14}", gtin):
        return False
    digits = [int(c) for c in gtin]
    check = digits.pop()
    total = sum(d * (3 if i % 2 == 0 else 1) for i, d in enumerate(reversed(digits)))
    return (10 - total % 10) % 10 == check


def _parse_raw(body: str) -> dict[str, str]:
    """Raw element string: fixed-length AIs run on; variable ones end at GS or end of string."""
    out: dict[str, str] = {}
    i = 0
    while i < len(body):
        if body[i] == GS:
            i += 1
            continue
        ai = next((a for a in sorted({*FIXED_LENGTH, *VARIABLE_MAX}, key=len, reverse=True)
                   if body.startswith(a, i)), None)
        if ai is None:
            raise ValueError(f"Unknown Application Identifier at position {i}")
        i += len(ai)
        if ai in FIXED_LENGTH:
            n = FIXED_LENGTH[ai]
            value = body[i:i + n]
            if len(value) != n:
                raise ValueError(f"AI ({ai}) needs {n} characters")
            i += n
        else:
            end = body.find(GS, i)
            end = len(body) if end == -1 else end
            value = body[i:end][: VARIABLE_MAX[ai]]
            i = end
        out[ai] = value
    return out


def parse(code: str) -> GS1Result:
    raw = (code or "").strip()
    text = _SYMBOLOGY_RE.sub("", raw).replace("<GS>", GS).replace("{GS}", GS)
    result = GS1Result(is_gs1=False, raw=raw)
    try:
        if "(" in text:
            pairs = _PAREN_RE.findall(text)
            if not pairs:
                return result
            elements = {ai: value.strip() for ai, value in pairs}
        elif text.isdigit() and len(text) in (8, 12, 13):
            return result  # plain EAN-8 / UPC-A / EAN-13: identifies the product only
        elif text.startswith(("01", "02")) and len(text) >= 16 and text[2:16].isdigit():
            elements = _parse_raw(text)
        else:
            return result
    except ValueError as exc:
        result.errors.append(str(exc))
        return result

    result.is_gs1 = True
    result.elements = elements
    gtin = elements.get("01") or elements.get("02")
    if gtin:
        result.gtin = gtin
        if not _gtin_valid(gtin):
            result.errors.append("GTIN check digit is invalid; check the code was read correctly")
    if "10" in elements:
        result.batch_number = elements["10"].strip().upper() or None
    if "17" in elements:
        result.expiry_date = gs1_date(elements["17"])
        if result.expiry_date is None:
            result.errors.append("Expiry date (17) is not a valid YYMMDD date")
    elif "15" in elements:
        result.expiry_date = gs1_date(elements["15"])
    if "11" in elements:
        result.production_date = gs1_date(elements["11"])
    result.serial = elements.get("21")
    return result


def gtin_variants(gtin: str) -> list[str]:
    """A GTIN-14 with leading zeros is the same item as its EAN-13 / UPC-A barcode."""
    out = [gtin]
    stripped = gtin.lstrip("0")
    for n in (13, 12, 8):
        if len(stripped) <= n:
            out.append(stripped.zfill(n))
    return list(dict.fromkeys(out))
