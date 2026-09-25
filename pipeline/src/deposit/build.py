"""Write the app's data, data/built/deposit.json, from the checked pipeline.

    PYTHONPATH=pipeline/src python3 -m deposit.build

The app redoes the chase in the browser for the reader's own pay, saving and
deposit, so it gets the raw series rather than finished answers: every area's
lower-quartile and median price and pay for each year, and the savings rate.
The file also carries worked examples the app's tests must reproduce, so the
page and the write-up cannot drift apart.
"""

from __future__ import annotations

import json
import os
import sys

from . import study, verify
from .sources import ROOT, savings_rate

OUT = os.path.join(ROOT, "data", "built", "deposit.json")


def main() -> int:
    r = study.run()
    years = list(range(study.FIRST, study.LAST + 1))
    lq, md = study.areas("lower quartile"), study.areas("median")
    rates = savings_rate()
    check = next(c for c in verify.run() if not c.name.startswith("Twin"))
    twin = next(c for c in verify.run() if c.name.startswith("Twin"))

    def series(values: dict[int, float | None]) -> list[float | None]:
        return [values.get(y) for y in years]

    keep = [a for a in lq.values() if a.level in ("local authority", "country or region")]
    data = {
        "years": years,
        "rates": [round(rates[y], 4) for y in years],
        "areas": [
            {
                "code": a.code,
                "name": a.name,
                "region": a.region,
                "level": "la" if a.level == "local authority" else "region",
                "lq_price": series(a.price),
                "lq_pay": series(a.pay),
                "md_price": series(md[a.code].price),
                "md_pay": series(md[a.code].pay),
            }
            for a in sorted(keep, key=lambda a: (a.level != "country or region", a.name))
        ],
        "checks": {
            "ratios": check.detail["total"],
            "matched": check.detail["matched"],
            "suppressed": check.detail["suppressed"],
            "twin_matched": twin.detail["matched"],
            "twin_total": twin.detail["total"],
        },
        "examples": [],
    }
    # the chase for a few areas and plans, for the app's tests to reproduce
    for code in (study.ENGLAND_AND_WALES, study.LONDON, "E08000025"):
        for plan in (study.BASE, study.Plan(deposit=0.15, saving=0.12), study.Plan(interest=False)):
            area = (lq if plan.measure == "lower quartile" else md)[code]
            for start in (1997, 2008, 2015):
                c = study.chase(area, start, plan)
                if c is None:
                    continue
                data["examples"].append({
                    "code": code, "deposit": plan.deposit, "saving": plan.saving, "interest": plan.interest,
                    "start": start, "years": c.years, "bought": c.bought, "pot": round(c.pot, 6),
                })
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, separators=(",", ":"), ensure_ascii=False)
        f.write("\n")
    print(f"{OUT}: {os.path.getsize(OUT):,} bytes, {len(data['areas'])} areas")
    return 0


if __name__ == "__main__":
    sys.exit(main())
