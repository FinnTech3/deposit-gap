"""How long a deposit takes: on paper, and chasing a moving target.

The saver in every calculation here is a first-time buyer on the area's
lower-quartile full-time pay, putting a tenth of it aside each year, towards a
10% deposit on the area's lower-quartile home. Lower quartile, because first
homes are cheaper than most and first-time buyers are paid less than most:
the ONS publishes its lower-quartile ratio for exactly that reason.

On paper, the years it takes are the deposit over a year's saving:

    years = deposit share x price / (saving share x pay)

With a 10% deposit and 10% of pay, that is the ONS's affordability ratio
itself: at a ratio of 7, seven years.

In life, prices and pay move while you save. The chase follows a saver who
starts in a given year: each year their pay is that year's local
lower-quartile pay, the year's saving goes in at the end of the year, the pot
earns the Bank of England's quoted one-year fixed-rate bond rate, and they
can buy in the first year the pot reaches 10% of that year's price. Anyone who
has not got there by 2025 is still saving.
"""

from __future__ import annotations

import functools
from dataclasses import dataclass

from . import verify
from .sources import number, savings_rate, table

FIRST, LAST = 1997, 2025
LEVELS = {
    "local authority": ("6a", "6b", "5a", "5b"),
    "county": ("4a", "4b", "3a", "3b"),
    "country or region": ("2a", "2b", "1a", "1b"),
}
ENGLAND_AND_WALES = "K04000001"
LONDON = "E12000007"


@dataclass(frozen=True)
class Plan:
    deposit: float = 0.10       # of the price
    saving: float = 0.10        # of gross pay, each year
    measure: str = "lower quartile"
    interest: bool = True


BASE = Plan()


@dataclass(frozen=True)
class Area:
    code: str
    name: str
    region: str
    level: str
    price: dict[int, float | None]
    pay: dict[int, float | None]


@functools.lru_cache(maxsize=None)
def areas(measure: str = "lower quartile") -> dict[str, Area]:
    out = {}
    for level, (lq_p, lq_e, md_p, md_e) in LEVELS.items():
        p_tab, e_tab = (lq_p, lq_e) if measure == "lower quartile" else (md_p, md_e)
        prices, pays = table(p_tab), table(e_tab)
        for code, row in prices.rows.items():
            out[code] = Area(
                code=code, name=prices.names[code], region=prices.regions[code], level=level,
                price={int(y): number(v) for y, v in row.items()},
                pay={int(y): number(v) for y, v in pays.rows[code].items()},
            )
    return out


def on_paper(area: Area, year: int, plan: Plan = BASE) -> float | None:
    """Years to save the deposit at that year's price and pay, if nothing moved."""
    p, e = area.price.get(year), area.pay.get(year)
    if p is None or e is None:
        return None
    return plan.deposit * p / (plan.saving * e)


@dataclass(frozen=True)
class Chase:
    start: int
    years: int          # years of saving: to the purchase, or so far if still saving
    bought: bool
    pot: float          # the pot when bought, or at the end of 2025
    target: float       # the deposit needed that year


def chase(area: Area, start: int, plan: Plan = BASE) -> Chase | None:
    """A saver who starts in `start`: when could they first buy? None if the data have a gap."""
    rates = savings_rate()
    pot = 0.0
    for t in range(start, LAST + 1):
        p, e = area.price.get(t), area.pay.get(t)
        if p is None or e is None:
            return None
        rate = rates[t] / 100 if plan.interest else 0.0
        pot = pot * (1 + rate) + plan.saving * e
        target = plan.deposit * p
        if pot >= target:
            return Chase(start, t - start + 1, True, pot, target)
    return Chase(start, LAST - start + 1, False, pot, target)


def local_authorities(measure: str = "lower quartile") -> list[Area]:
    return sorted((a for a in areas(measure).values() if a.level == "local authority"), key=lambda a: a.name)


def run() -> dict:
    checks = verify.gate()
    las = local_authorities()
    ew = areas()[ENGLAND_AND_WALES]
    london = areas()[LONDON]
    starts = list(range(FIRST, LAST + 1))
    plans = {
        "base": BASE,
        "median pay and price": Plan(measure="median"),
        # only deposit over saving matters, so a 5% deposit, a fifth of pay
        # and two earners are one case
        "twice the saving, or half the deposit": Plan(saving=0.20),
        "no interest": Plan(interest=False),
    }
    return {
        "checks": checks,
        "england_and_wales": ew,
        "london": london,
        "paper": {code: {y: on_paper(a, y) for y in starts} for code, a in areas().items()},
        "chases": {code: {y: chase(a, y) for y in starts} for code, a in areas().items()},
        "local_authorities": las,
        "plans": plans,
        "plan_chases": {
            name: {y: chase(areas(plan.measure)[ENGLAND_AND_WALES], y, plan) for y in starts}
            for name, plan in plans.items()
        },
    }
