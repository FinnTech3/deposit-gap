// The result as a 1080 by 1350 picture, drawn in the browser; nothing is uploaded.

export interface CardContent {
  lead: string;
  big: string;
  unit: string;
  lines: string[];
  bars: number[]; // years taken by start year; negative: still saving after that many
}

const INK = "#161614";
const TEXT = "#f3f2ee";
const SOFT = "#c3c2b7";
const MUTED = "#9a988f";
const REST = "#4b4a46";
const BOUGHT = "#3fb8a5";
const STILL = "#e66767";

const FONTS = [
  '700 260px "IBM Plex Sans Condensed"',
  '700 44px "IBM Plex Sans Condensed"',
  '600 44px "IBM Plex Sans"',
  '400 40px "IBM Plex Sans"',
  '400 32px "IBM Plex Mono"',
];

export async function fontsReady(): Promise<void> {
  try {
    await Promise.all(FONTS.map((f) => document.fonts.load(f)));
  } catch {
    // The card still draws in the fallback fonts.
  }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export function drawCard(canvas: HTMLCanvasElement, c: CardContent): void {
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const P = 84;
  const inner = 1080 - 2 * P;
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, 1080, 1350);

  // the mark: a pot filling up
  [12, 18, 24, 30, 34].forEach((h, i) => {
    ctx.fillStyle = i === 4 ? TEXT : REST;
    ctx.fillRect(P + i * 14, P + 40 - h, 10, h);
  });
  ctx.fillStyle = TEXT;
  ctx.font = '700 44px "IBM Plex Sans Condensed", sans-serif';
  ctx.fillText("Deposit gap", P + 84, P + 40);

  ctx.fillStyle = SOFT;
  ctx.font = '400 40px "IBM Plex Sans", sans-serif';
  let y = P + 150;
  for (const line of wrap(ctx, c.lead, inner)) {
    ctx.fillText(line, P, y);
    y += 52;
  }

  let size = 240;
  ctx.fillStyle = TEXT;
  do {
    ctx.font = `700 ${size}px "IBM Plex Sans Condensed", sans-serif`;
    if (ctx.measureText(c.big).width <= inner) break;
    size -= 10;
  } while (size > 110);
  y += size * 0.85;
  ctx.fillText(c.big, P - 6, y);
  ctx.font = '600 44px "IBM Plex Sans", sans-serif';
  y += 70;
  ctx.fillText(c.unit, P, y);
  y += 80;
  ctx.font = '400 38px "IBM Plex Sans", sans-serif';
  for (const text of c.lines) {
    for (const line of wrap(ctx, text, inner)) {
      ctx.fillText(line, P, y);
      y += 50;
    }
    y += 14;
  }

  // how long it took, by the year saving started
  const base = 1350 - P - 90;
  const height = 190;
  const hi = Math.max(1, ...c.bars.map((v) => Math.abs(v)));
  const slot = inner / c.bars.length;
  c.bars.forEach((v, i) => {
    if (!v) return;
    const h = (Math.abs(v) / hi) * height;
    const x = P + i * slot + 2;
    if (v > 0) {
      ctx.fillStyle = BOUGHT;
      ctx.fillRect(x, base - h, slot - 4, h);
    } else {
      ctx.strokeStyle = STILL;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(x + 1.5, base - h, slot - 7, h);
      ctx.setLineDash([]);
    }
  });
  ctx.fillStyle = MUTED;
  ctx.font = '400 26px "IBM Plex Sans", sans-serif';
  ctx.fillText("years it took, by the year saving started; dashed: still saving in 2025", P, base + 44);
  ctx.font = '400 32px "IBM Plex Mono", monospace';
  ctx.fillText("finntech3.github.io/deposit-gap", P, 1350 - P);
}
