import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { chase, type DepositFile, onPaper, planFor, readChoice, writeChoice } from "./deposit";

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
    expect(planFor(ew, pay / 120, 0.1).saving).toBeCloseTo(0.1, 12);
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
