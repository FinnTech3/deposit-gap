"""Draw the figures in docs/figures from the committed data.

    python3 scripts/make_figures.py

Every number comes from the same run the report prints, so a figure cannot
disagree with the text. CI regenerates them and fails on any difference. Each
figure comes in a light and a dark version, written as SVG directly: no
plotting library, nothing to install.
"""

from __future__ import annotations

import os
import sys
from xml.sax.saxutils import escape

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(ROOT, "pipeline", "src"))

from deposit.study import run  # noqa: E402

OUT = os.path.join(ROOT, "docs", "figures")
SANS = "'IBM Plex Sans', ui-sans-serif, system-ui, -apple-system, sans-serif"
MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace"

# A deep teal for the saver who got there, red for one still saving, grey for
# everything else. Teal and red stay distinct under the common colour-vision
# deficiencies and clear 3:1 against both backgrounds.
LIGHT = {"bg": "#fbfaf7", "ink": "#111110", "dim": "#52514e", "muted": "#6b6a65",
         "grid": "#e6e4dc", "axis": "#c3c2b7", "rest": "#cfccc3", "you": "#0f7b6c", "still": "#d63f3e"}
DARK = {"bg": "#161614", "ink": "#f3f2ee", "dim": "#c3c2b7", "muted": "#9a988f",
        "grid": "#2a2a27", "axis": "#3d3d3a", "rest": "#4b4a46", "you": "#3fb8a5", "still": "#e66767"}

W = 1120
LEFT = 64


class Svg:
    def __init__(self, h: int, p: dict, title: str, subtitle: str):
        self.p, self.h = p, h
        self.parts = [
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {h}" width="{W}" height="{h}" '
            f'role="img" aria-label="{escape(title)}">',
            f'<rect width="{W}" height="{h}" fill="{p["bg"]}"/>',
        ]
        self.text(LEFT, 44, title, 21, "ink", weight=600)
        self.text(LEFT, 70, subtitle, 14, "dim")

    def text(self, x, y, s, size=13, colour="ink", family=SANS, anchor="start", weight=400, halo=False):
        ring = f' stroke="{self.p["bg"]}" stroke-width="4" paint-order="stroke"' if halo else ""
        self.parts.append(
            f'<text x="{x:.1f}" y="{y:.1f}" font-family="{family}" font-size="{size}" '
            f'font-weight="{weight}" fill="{self.p[colour]}" text-anchor="{anchor}"{ring}>{escape(s)}</text>')

    def line(self, x1, y1, x2, y2, colour="grid", width=1.0, dash=None):
        extra = f' stroke-dasharray="{dash}"' if dash else ""
        self.parts.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
                          f'stroke="{self.p[colour]}" stroke-width="{width}"{extra}/>')

    def column(self, x, base, width, height, colour):
        """A column rounded at its data end and square at the baseline."""
        r = min(3.0, width / 2, abs(height))
        top = base - height
        self.parts.append(
            f'<path d="M{x:.1f},{base:.1f} V{top + r:.1f} Q{x:.1f},{top:.1f} {x + r:.1f},{top:.1f} '
            f'H{x + width - r:.1f} Q{x + width:.1f},{top:.1f} {x + width:.1f},{top + r:.1f} V{base:.1f} Z" '
            f'fill="{self.p[colour]}"/>')

    def bar(self, x, y, length, thick, colour):
        """A horizontal bar rounded at its data end."""
        r = min(3.0, thick / 2, length)
        self.parts.append(
            f'<path d="M{x:.1f},{y:.1f} H{x + length - r:.1f} Q{x + length:.1f},{y:.1f} {x + length:.1f},{y + r:.1f} '
            f'V{y + thick - r:.1f} Q{x + length:.1f},{y + thick:.1f} {x + length - r:.1f},{y + thick:.1f} '
            f'H{x:.1f} Z" fill="{self.p[colour]}"/>')

    def dot(self, x, y, colour, r=5.0):
        self.parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r + 2:.1f}" fill="{self.p["bg"]}"/>')
        self.parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="{self.p[colour]}"/>')

    def polyline(self, pts, colour, width=2.0, dash=None):
        d = " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
        extra = f' stroke-dasharray="{dash}"' if dash else ""
        self.parts.append(f'<polyline points="{d}" fill="none" stroke="{self.p[colour]}" '
                          f'stroke-width="{width}" stroke-linejoin="round" stroke-linecap="round"{extra}/>')

    def footnote(self, s):
        self.text(LEFT, self.h - 24, s, 12, "muted")

    def svg(self) -> str:
        return "\n".join(self.parts + ["</svg>"]) + "\n"



def fig_chase(r, p):
    s = Svg(620, p, "The deposit kept moving: how long saving actually took",
            "Years a lower-quartile earner saving a tenth of their pay took to reach a 10% deposit on a "
            "lower-quartile home, by the year they started")
    starts = list(range(1997, 2020))
    panels = [(r["england_and_wales"], 110, 300), (r["london"], 360, 550)]
    x0, x1 = LEFT + 40, W - 40
    slot = (x1 - x0) / len(starts)
    for area, top, base in panels:
        hi = 16
        y = lambda v: base - v / hi * (base - top)
        s.text(LEFT, top - 12, area.name, 14, "ink", SANS, "start", 600)
        for v in (0, 5, 10, 15):
            s.line(x0, y(v), x1, y(v), "axis" if v == 0 else "grid")
            s.text(x0 - 8, y(v) + 4, str(v), 12, "muted", MONO, "end")
        for i, start in enumerate(starts):
            c = r["chases"][area.code][start]
            xx = x0 + i * slot + 3
            w = slot - 6
            if c.bought:
                s.column(xx, base, w, base - y(c.years), "you")
            else:
                s.parts.append(f'<rect x="{xx:.1f}" y="{y(c.years):.1f}" width="{w:.1f}" height="{base - y(c.years):.1f}" '
                               f'fill="none" stroke="{p["still"]}" stroke-width="2" stroke-dasharray="4 3"/>')
            paper = r["paper"][area.code][start]
            s.line(xx - 1, y(paper), xx + w + 1, y(paper), "ink", 2)
            if start % 5 == 0 or start == 1997:
                s.text(xx + w / 2, base + 18, str(start), 11, "muted", MONO, "middle")
    ly = 588
    s.parts.append(f'<rect x="{LEFT}" y="{ly - 11}" width="12" height="12" rx="2" fill="{p["you"]}"/>')
    s.text(LEFT + 18, ly, "years it took", 12, "dim")
    s.parts.append(f'<rect x="{LEFT + 130}" y="{ly - 11}" width="12" height="12" fill="none" stroke="{p["still"]}" '
                   f'stroke-width="2" stroke-dasharray="4 3"/>')
    s.text(LEFT + 148, ly, "still saving in 2025", 12, "dim")
    s.line(LEFT + 300, ly - 5, LEFT + 318, ly - 5, "ink", 2)
    s.text(LEFT + 324, ly, "on paper: that year's price over that year's saving", 12, "dim")
    return s.svg()


def fig_regions(r, p):
    las = r["local_authorities"]
    groups: dict[str, list[bool]] = {}
    for a in las:
        c = r["chases"][a.code][2015]
        if c:
            groups.setdefault(a.region, []).append(not c.bought)
    rows = sorted(groups.items(), key=lambda kv: (-sum(kv[1]) / len(kv[1]), kv[0]))
    s = Svg(150 + 40 * len(rows), p, "Start saving in 2015 and in most of London you still would be",
            "Local authorities where a lower-quartile earner who started saving a tenth of their pay in 2015 "
            "had not reached a 10% deposit by 2025")
    x0 = LEFT + 230
    x = lambda v: x0 + v * (W - 160 - x0)
    top = 110
    for k, (region, flags) in enumerate(rows):
        yy = top + k * 40
        share = sum(flags) / len(flags)
        s.text(x0 - 12, yy + 17, region, 14, "ink", SANS, "end")
        s.parts.append(f'<rect x="{x0}" y="{yy + 4}" width="{x(1) - x0:.1f}" height="18" rx="3" fill="{p["grid"]}"/>')
        if share:
            s.bar(x0, yy + 4, x(share) - x0, 18, "still")
        s.text(x(1) + 10, yy + 18, f"{sum(flags)} of {len(flags)}", 13, "ink", MONO, "start", 600)
    return s.svg()


def fig_areas(r, p):
    las = r["local_authorities"]
    s = Svg(600, p, "Years to save a deposit on paper, every area, 1997 and 2025",
            "Lower-quartile house price over a tenth of lower-quartile pay: the ONS's lower-quartile ratio, one dot "
            "per local authority")
    x0, x1 = LEFT + 70, W - 60
    hi = 22
    x = lambda v: x0 + v / hi * (x1 - x0)
    step, rad = 5.4, 2.4
    for v in range(0, 23, 2):
        s.line(x(v), 100, x(v), 540, "grid")
        s.text(x(v), 560, f"{v}", 12, "muted", MONO, "middle")
    s.text(x1, 580, "years", 12, "muted", SANS, "end")
    for k, year in enumerate((1997, 2025)):
        base = 300 + k * 230
        vals = sorted(r["paper"][a.code][year] for a in las if r["paper"][a.code][year] is not None)
        s.text(LEFT, base - 6, str(year), 15, "ink", MONO, "start", 600)
        rows: list[list[float]] = []
        for v in vals:
            cx = x(v)
            row = 0
            while row < len(rows) and any(abs(cx - c) < step for c in rows[row]):
                row += 1
            if row == len(rows):
                rows.append([])
            rows[row].append(cx)
            s.parts.append(f'<circle cx="{cx:.1f}" cy="{base - rad - row * step:.1f}" r="{rad}" '
                           f'fill="{p["you"] if v >= 10 else p["rest"]}"/>')
        tens = sum(v >= 10 for v in vals)
        s.text(x1, base - 170, f"{tens} of {len(vals)} at ten years or more", 13, "you" if tens else "dim", SANS, "end", 600)
    return s.svg()


FIGURES = {
    "chase": fig_chase,
    "regions": fig_regions,
    "areas": fig_areas,
}


def main() -> int:
    r = run()
    os.makedirs(OUT, exist_ok=True)
    for name, fig in FIGURES.items():
        for mode, palette in (("light", LIGHT), ("dark", DARK)):
            with open(os.path.join(OUT, f"{name}-{mode}.svg"), "w") as f:
                f.write(fig(r, palette))
    print(f"wrote {len(FIGURES) * 2} figures to docs/figures")
    return 0


if __name__ == "__main__":
    sys.exit(main())
