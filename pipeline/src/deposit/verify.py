"""Rebuild the ONS's affordability ratios before measuring anything new.

Every ratio in the workbook, for every area and year, is the house price
divided by the earnings in the same table pair, rounded to two decimal places.
The check recomputes all of them from their parts and requires every one to
match exactly. The ONS rounds halves up (119,500 / 20,000 = 5.975 is published
as 5.98), so the rebuild does too, in decimal arithmetic rather than binary.

The twin divides each year's price by the previous year's earnings, the
mistake a one-column slip makes, and must fail.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import ROUND_HALF_UP, Decimal

from .sources import TABLES, number, table


@dataclass
class Result:
    name: str
    passed: bool
    summary: str
    detail: dict = field(default_factory=dict)


def ratio(price: str, earnings: str) -> Decimal:
    return (Decimal(price) / Decimal(earnings)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def published(cell: str) -> Decimal:
    """The published ratio, as the two-place number the workbook's float stands for."""
    return Decimal(repr(float(cell))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def check_ratios(lag: int = 0, name: str = "Every published affordability ratio, rebuilt from its parts") -> Result:
    matched = total = suppressed = unpaired = 0
    misses = []
    for p, e, c, level, measure in TABLES:
        prices, earnings, ratios = table(p), table(e), table(c)
        years = ratios.years
        for code, row in ratios.rows.items():
            for i, year in enumerate(years):
                cell = row[year]
                if cell in ("[x]", ""):
                    suppressed += 1
                    continue
                if i - lag < 0:
                    continue
                price, pay = prices.rows[code][year], earnings.rows[code][years[i - lag]]
                if number(price) is None or number(pay) is None:
                    unpaired += 1
                    continue
                total += 1
                if ratio(price, pay) == published(cell):
                    matched += 1
                elif len(misses) < 20:
                    misses.append((c, code, year, price, pay, cell))
    return Result(name, matched == total,
                  f"{matched:,} of {total:,} ratios match to the published two decimal places "
                  f"({suppressed} suppressed by the ONS)",
                  {"matched": matched, "total": total, "suppressed": suppressed, "unpaired": unpaired,
                   "misses": misses})


def check_ratios_lagged() -> Result:
    """The twin: each year's prices over the previous year's earnings."""
    return check_ratios(lag=1, name="Twin: prices over the previous year's earnings")


def run() -> list[Result]:
    return [check_ratios(), check_ratios_lagged()]


def gate() -> list[Result]:
    results = [check_ratios()]
    failed = [r for r in results if not r.passed]
    if failed:
        raise SystemExit("verification failed: " + "; ".join(f"{r.name}: {r.summary}" for r in failed))
    return results
