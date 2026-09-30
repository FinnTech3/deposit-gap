import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { chase, type DepositFile, onPaper, payNow, planFrom, readChoice, shareOfPay, tenth, writeChoice } from "./deposit";

const d = JSON.parse(readFileSync(new URL("../../public/data/deposit.json", import.meta.url), "utf-8")) as DepositFile;
const byCode = new Map(d.areas.map((a) => [a.code, a]));

describe("the pipeline's worked examples", () => {
  it("are all reproduced exactly", () => {
    expect(d.examples.length).toBeGreaterThan(20);
    for (const ex of d.examples) {
      const c = chase(d, byCode.get(ex.code)!, ex.start, {
        deposit: ex.deposit,
        saving: ex.saving,
        interest: ex.interest,
      })!;
      expect([c.years, c.bought], `${ex.code} ${ex.start}`).toEqual([ex.years, ex.bought]);
      expect(c.pot).toBeCloseTo(ex.pot, 6);
    }
  });

  it("give the README's headline", () => {
    const base = { deposit: 0.1, saving: 0.1, interest: true };
    const ew = byCode.get("K04000001")!;
    expect(chase(d, ew, 1997, base)!.years).toBe(4);
    expect(chase(d, ew, 2015, base)!.years).toBe(9);
    const las = d.areas.filter((a) => a.level === "la");
    const still = las.filter((a) => {
      const c = chase(d, a, 2015, base);
      return c && !c.bought;
    });
    expect(still.length).toBe(88);
    expect(onPaper(d, ew, 2025, base)).toBeCloseTo(6.83, 2);
  });
});

describe("a reader's plan", () => {
  it("is a tenth of pay when they save a tenth of lower-quartile pay", () => {
    const ew = byCode.get("K04000001")!;
    const pay = ew.lq_pay[ew.lq_pay.length - 1]!;
    expect(shareOfPay(pay / 120, pay)).toBeCloseTo(0.1, 12);
  });
});

describe("the address", () => {
  const codes = new Set(d.areas.map((a) => a.code));
  it("leaves the defaults out and round-trips a choice", () => {
    expect(writeChoice({ area: "K04000001", monthly: null, deposit: 0.1 })).toBe("");
    const c = { area: "E09000019", monthly: 350, deposit: 0.05 };
    expect(readChoice(writeChoice(c), codes)).toEqual(c);
  });
  it("ignores what it does not know", () => {
    expect(readChoice("?a=nowhere&m=-5&d=33", codes)).toEqual({ area: "K04000001", monthly: null, deposit: 0.1 });
  });
});

describe("an area the ONS cannot publish pay for", () => {
  // Picking the Isles of Scilly used to take the page to a blank screen: with
  // no pay, a tenth of it is £0, the years on paper divide by zero, and a chart
  // axis of Infinity steps asks for an array of that length. It is the only
  // area this happens in, so the test names it and counts the rest.
  const scilly = d.areas.find((a) => a.name === "Isles of Scilly")!;

  it("is the one area of 330 with no published pay", () => {
    const none = d.areas.filter((a) => payNow(a) === null);
    expect(none.map((a) => a.name)).toEqual(["Isles of Scilly"]);
    expect(d.areas).toHaveLength(330);
    expect(payNow(scilly)).toBeNull();
    expect(tenth(scilly)).toBeNull();
    // its prices are published, which is why it is in the list at all
    expect(scilly.lq_price[scilly.lq_price.length - 1]).toBeGreaterThan(0);
  });

  it("gives every area a plan that saves something, and none that divides by nothing", () => {
    for (const a of d.areas) {
      for (const monthly of [null, 200]) {
        const plan = planFrom(a, monthly, 0.1);
        expect(plan.saving).toBeGreaterThan(0);
        expect(Number.isFinite(plan.saving)).toBe(true);
        for (const year of d.years) {
          const v = onPaper(d, a, year, plan);
          if (v !== null) expect(Number.isFinite(v)).toBe(true);
        }
      }
    }
  });

  it("answers the Isles of Scilly from what a reader saves, and nothing from its pay", () => {
    // its years on paper come from the price and the saving alone
    const price = scilly.lq_price[scilly.lq_price.length - 1]!;
    expect((0.1 * price) / (12 * 200)).toBeCloseTo(12.9, 1);
    // a typed figure cannot become a share of pay that is not published, so
    // the plan stays the page's own tenth rather than 240,000% of nothing
    const plan = planFrom(scilly, 200, 0.1);
    expect(plan.saving).toBe(0.1);
    // and nothing that needs its pay year by year comes back at all
    expect(d.years.filter((y) => onPaper(d, scilly, y, plan) !== null)).toEqual([1998]);
    expect(d.years.slice(0, -1).every((y) => chase(d, scilly, y, plan) === null)).toBe(true);
  });

  it("still keeps a tenth of pay for everywhere else", () => {
    const ew = d.areas.find((a) => a.code === "K04000001")!;
    expect(tenth(ew)).toBeGreaterThan(0);
    expect(planFrom(ew, null, 0.1).saving).toBeCloseTo(0.1, 3);
    // a tenth of pay is rounded to the nearest £5 a month before it becomes a
    // share again, so doubling the figure doubles that rounding with it
    expect(planFrom(ew, 2 * tenth(ew)!, 0.1).saving).toBeCloseTo(0.2, 2);
  });
});
