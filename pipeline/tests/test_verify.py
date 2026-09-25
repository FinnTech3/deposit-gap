"""The ONS's ratios, rebuilt, and the twin that shows the check can fail."""

import functools

from deposit import verify


@functools.lru_cache(maxsize=None)
def results():
    return {r.name: r for r in verify.run()}


def test_every_ratio_rebuilds_exactly():
    r = next(r for n, r in results().items() if n.startswith("Every published"))
    assert r.passed, r.summary
    assert r.detail["matched"] == r.detail["total"] == 20021
    assert r.detail["suppressed"] == 337


def test_twin_lagged_earnings_fails():
    r = next(r for n, r in results().items() if n.startswith("Twin"))
    assert not r.passed
    assert r.detail["matched"] < r.detail["total"] / 50


def test_halves_round_up_as_the_ons_does():
    # 119,500 / 20,000 = 5.975, published 5.98; binary rounding would give 5.97
    assert str(verify.ratio("119500", "20000")) == "5.98"
    assert round(119500 / 20000, 2) == 5.97
