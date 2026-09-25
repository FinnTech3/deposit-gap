"""Where the committed sources live, and the loaders for them.

The ONS's affordability workbook holds, for England and Wales, its regions,
counties and every local authority, from 1997 to 2025: the median and
lower-quartile house price (sales in the year to September), the median and
lower-quartile full-time earnings of people who work there (April), and the
ratio of one to the other. Ratios the ONS suppresses are "[x]".
"""

from __future__ import annotations

import csv
import datetime as dt
import functools
import os
from dataclasses import dataclass

from .sheets import read_xlsx

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
SOURCES = os.path.join(ROOT, "data", "sources")
WORKBOOK = os.path.join(SOURCES, "ons_affordability_workplace.xlsx")

# (house price table, earnings table, ratio table, level, measure)
TABLES = [
    ("1a", "1b", "1c", "country or region", "median"),
    ("2a", "2b", "2c", "country or region", "lower quartile"),
    ("3a", "3b", "3c", "county", "median"),
    ("4a", "4b", "4c", "county", "lower quartile"),
    ("5a", "5b", "5c", "local authority", "median"),
    ("6a", "6b", "6c", "local authority", "lower quartile"),
]


@dataclass(frozen=True)
class Table:
    """One of the workbook's tables: area code to {year: the cell's text}."""

    years: list[str]
    rows: dict[str, dict[str, str]]
    names: dict[str, str]
    regions: dict[str, str]


@functools.lru_cache(maxsize=None)
def _sheets() -> dict[str, list[list[str]]]:
    return read_xlsx(WORKBOOK)


@functools.lru_cache(maxsize=None)
def table(name: str) -> Table:
    rows = _sheets()[name]
    head = rows[1]
    by_la = head[0].startswith("Country/Region")
    first = 4 if by_la else 2
    # the ratio tables end with a five-year average column, which is not a year
    cols = [(i, h[-4:]) for i, h in enumerate(head) if i >= first and h[-4:].isdigit()]
    out, names, regions = {}, {}, {}
    for r in rows[2:]:
        code = (r[2] if by_la else r[0]).strip() if len(r) > first else ""
        if not code:
            continue
        out[code] = {y: (r[i].strip() if i < len(r) else "") for i, y in cols}
        names[code] = (r[3] if by_la else r[1]).strip()
        regions[code] = r[1].strip() if by_la else ""
    return Table([y for _, y in cols], out, names, regions)


def number(cell: str) -> float | None:
    """A cell as a number, or None where the ONS has suppressed it."""
    try:
        return float(cell)
    except ValueError:
        return None


@functools.lru_cache(maxsize=None)
def savings_rate() -> dict[int, float]:
    """The Bank of England's quoted rate on one-year fixed-rate bonds for households (IUMWTFA), per cent.

    The average of the twelve monthly figures for each calendar year, for years
    with all twelve.
    """
    months: dict[int, list[float]] = {}
    with open(os.path.join(SOURCES, "boe_iumwtfa.csv"), newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            d = dt.datetime.strptime(r["DATE"], "%d %b %Y").date()
            months.setdefault(d.year, []).append(float(r["IUMWTFA"]))
    return {y: sum(v) / len(v) for y, v in months.items() if len(v) == 12}
