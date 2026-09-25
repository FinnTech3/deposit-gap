"""Print every number the README quotes, in the order it quotes them.

    PYTHONPATH=pipeline/src python3 -m deposit.report

Refuses to print findings if the check has failed.
"""

from __future__ import annotations

import statistics
import sys

from . import study, verify
from .sources import savings_rate


def yrs(x: float) -> str:
    return f"{x:.1f}"


def main() -> int:
    print("Verification")
    for r in verify.run():
        twin = r.name.startswith("Twin")
        ok = r.passed != twin
        print(f"  [{'pass' if ok else 'FAIL'}] {r.name}: {r.summary}" + (" (a twin, so failing is the pass)" if twin else ""))
        if not ok:
            print("\nA check did not behave; nothing below would mean anything.", file=sys.stderr)
            return 1

    r = study.run()
    ew, london = r["england_and_wales"], r["london"]
    paper, chases = r["paper"], r["chases"]
    las = r["local_authorities"]
    print("\nThe saver: lower-quartile full-time pay, a tenth of it saved each year, a 10% deposit on a "
          "lower-quartile home, savings at the one-year bond rate")

    print("\nOn paper (years = the lower-quartile affordability ratio)")
    for area in (ew, london):
        print(f"  {area.name}: " + ", ".join(f"{y} {yrs(paper[area.code][y])}" for y in (1997, 2002, 2007, 2015, 2021, 2022, 2025)))
    since = max(y for y in range(study.FIRST, study.LAST) if paper[ew.code][y] <= paper[ew.code][study.LAST])
    print(f"  {ew.name} in 2025 is the lowest since {since} ({yrs(paper[ew.code][since])})")
    for y in (1997, 2025):
        v = sorted(paper[a.code][y] for a in las if paper[a.code][y] is not None)
        print(f"  local authorities, {y}: {len(v)} with data, median {yrs(statistics.median(v))}, "
              f"range {yrs(v[0])} to {yrs(v[-1])}, ten years or more: {sum(x >= 10 for x in v)}, under five: {sum(x < 5 for x in v)}")

    ranked = sorted((paper[a.code][study.LAST], a.name) for a in las if paper[a.code][study.LAST] is not None)
    print("  2025, quickest: " + "; ".join(f"{n} {yrs(v)}" for v, n in ranked[:3])
          + "; slowest: " + "; ".join(f"{n} {yrs(v)}" for v, n in ranked[-3:]))

    print("\nThe chase: how long it actually took, by the year saving started")
    for area in (ew, london):
        parts = []
        for y in (1997, 2000, 2005, 2010, 2015, 2019):
            c = chases[area.code][y]
            parts.append(f"{y} {c.years}" if c.bought else f"{y} still saving after {c.years}")
        print(f"  {area.name}: " + ", ".join(parts))
    for y in (1997, 2005, 2010, 2015):
        res = [chases[a.code][y] for a in las]
        known = [c for c in res if c]
        still = [c for c in known if not c.bought]
        bought = [c.years for c in known if c.bought]
        print(f"  local authorities, starting {y}: {len(known)} with data; still saving in 2025: {len(still)}; "
              f"median years for those who bought: {statistics.median(bought):g}")

    print("  starting 2015, still saving in 2025, by region:")
    regions: dict[str, list] = {}
    for a in las:
        c = chases[a.code][2015]
        if c:
            regions.setdefault(a.region, []).append(not c.bought)
    for region, flags in sorted(regions.items(), key=lambda kv: -sum(kv[1]) / len(kv[1])):
        print(f"    {region}: {sum(flags)} of {len(flags)}")

    print("\nThe same saver, other ways (England and Wales)")
    for name, cs in r["plan_chases"].items():
        print(f"  {name}: " + ", ".join(
            f"{y} {cs[y].years}" if cs[y].bought else f"{y} still after {cs[y].years}" for y in (1997, 2005, 2010, 2015)))
    base, flat = r["plan_chases"]["base"], r["plan_chases"]["no interest"]
    changed = [y for y in base if base[y] and (base[y].years, base[y].bought) != (flat[y].years, flat[y].bought)]
    print(f"  interest changes the answer for starts in: {', '.join(map(str, changed))}")
    rates = savings_rate()
    early = [rates[y] for y in range(1997, 2005)]
    print(f"  the one-year bond rate, 1997 to 2004: {min(early):.1f}% to {max(early):.1f}%; 2021: {rates[2021]:.2f}%; "
          f"2025: {rates[2025]:.2f}%")
    return 0


if __name__ == "__main__":
    sys.exit(main())
