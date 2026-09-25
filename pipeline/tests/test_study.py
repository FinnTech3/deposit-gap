"""The saver, on made-up numbers where the answer is known, and the findings pinned."""

import functools

import pytest

from deposit import study
from deposit.study import Area, Plan


def flat_area(price=100_000.0, pay=20_000.0, growth=0.0, pay_growth=0.0):
    years = range(study.FIRST, study.LAST + 1)
    return Area("X", "Test", "", "local authority",
                {y: price * (1 + growth) ** (y - study.FIRST) for y in years},
                {y: pay * (1 + pay_growth) ** (y - study.FIRST) for y in years})


def test_on_paper_is_the_ratio_when_deposit_and_saving_match():
    a = flat_area()
    assert study.on_paper(a, 2000) == pytest.approx(5.0)
    assert study.on_paper(a, 2000, Plan(saving=0.20)) == pytest.approx(2.5)


def test_with_nothing_moving_and_no_interest_the_chase_is_the_paper_figure():
    c = study.chase(flat_area(), 2000, Plan(interest=False))
    assert c.bought and c.years == 5


def test_rising_prices_make_the_chase_longer():
    # the target grows 3% a year from £10,927 while the pot grows £2,000 a year:
    # after six years £12,000 against £12,668, after seven £14,000 against £13,048
    c = study.chase(flat_area(growth=0.03), 2000, Plan(interest=False))
    assert c.bought and c.years == 7


def test_prices_that_outrun_saving_are_never_caught():
    c = study.chase(flat_area(growth=0.30), 1997, Plan(interest=False))
    assert not c.bought and c.years == 29


def test_a_gap_in_the_data_gives_no_answer():
    a = flat_area()
    a.price[2003] = None
    assert study.chase(a, 2001) is None


@functools.lru_cache(maxsize=None)
def result():
    return study.run()


def test_the_findings():
    r = result()
    ew, london = r["england_and_wales"].code, r["london"].code
    ch = r["chases"]
    assert (ch[ew][1997].years, ch[ew][2015].years) == (4, 9)
    assert ch[london][1997].years == 8 and not ch[london][2015].bought
    still = sum(1 for a in r["local_authorities"] if ch[a.code][2015] and not ch[a.code][2015].bought)
    assert still == 88
    assert r["paper"][ew][1997] == pytest.approx(3.54, abs=0.005)
    assert r["paper"][ew][2025] == pytest.approx(6.83, abs=0.005)


def test_the_paper_figure_is_the_published_lower_quartile_ratio():
    from deposit.sources import number, table
    r = result()
    ratios = table("6c")
    for a in r["local_authorities"]:
        cell = number(ratios.rows[a.code]["2025"])
        if cell is not None:
            assert r["paper"][a.code][2025] == pytest.approx(cell, abs=0.005)
