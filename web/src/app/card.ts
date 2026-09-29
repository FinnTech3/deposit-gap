// The result as a 1080 by 1350 picture, the shape that fills a phone screen in
// a feed: the years, and how long it took by the year saving started. Drawn in
// the browser; nothing is uploaded anywhere.

export interface CardContent {
  lead: string;
  big: string;
  unit: string;
  lines: string[];
  bars: number[]; // years taken by start year; negative: still saving after that many
}

// The page's light theme, fixed, so the picture looks the same whoever saves it.
const PAPER = "#eeeae2";
const INK = "#1e2328";
const INK_2 = "#474e55";
const MUTED = "#636b73";
const RULE = "#d8d1c6";
const BRICK = "#a8564c";
const SLATE = "#4a5560";
const BOUGHT = "#2c6e49";
const STILL = "#a8202c";

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
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, 1080, 1350);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  // the seal and the series line
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(P + 34, P + 34, 34, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.font = 'italic 600 28px "IBM Plex Serif", serif';
  ctx.fillText("FL", P + 34, P + 44);
  ctx.textAlign = "left";
  ctx.fillStyle = MUTED;
  ctx.font = '400 24px "IBM Plex Mono", monospace';
  ctx.fillText("FINN LAKIN · NO. 5 OF 6", P + 90, P + 30);
  ctx.fillText("DEPOSITS", P + 90, P + 62);

  ctx.fillStyle = INK_2;
  ctx.font = '400 36px "IBM Plex Sans", sans-serif';
  let y = P + 180;
  for (const line of wrap(ctx, c.lead, inner)) {
    ctx.fillText(line, P, y);
    y += 46;
  }

  let size = 240;
  ctx.fillStyle = BRICK;
  do {
    ctx.font = `700 ${size}px "IBM Plex Sans Condensed", sans-serif`;
    if (ctx.measureText(c.big).width <= inner) break;
    size -= 10;
  } while (size > 110);
  y += size * 0.85;
  ctx.fillText(c.big, P - 6, y);
  ctx.fillStyle = INK;
  ctx.font = '600 46px "IBM Plex Serif", serif';
  y += 66;
  ctx.fillText(c.unit, P, y);
  y += 72;
  ctx.fillStyle = INK_2;
  ctx.font = '400 34px "IBM Plex Sans", sans-serif';
  for (const text of c.lines) {
    for (const line of wrap(ctx, text, inner)) {
      ctx.fillText(line, P, y);
      y += 44;
    }
    y += 10;
  }

  ctx.strokeStyle = RULE;
  ctx.lineWidth = 2;
  ctx.setLineDash([2, 10]);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(P, y - 8);
  ctx.lineTo(1080 - P, y - 8);
  ctx.stroke();
  ctx.setLineDash([]);

  // how long it took, by the year saving started, drawn as houses
  const base = 1350 - P - 90;
  const height = 190;
  const hi = Math.max(1, ...c.bars.map((v) => Math.abs(v)));
  const slot = inner / c.bars.length;
  c.bars.forEach((v, i) => {
    if (!v) return;
    const h = (Math.abs(v) / hi) * height;
    const x = P + i * slot + 2;
    const w = slot - 4;
    const roof = Math.min(h * 0.35, w * 0.9);
    const draw = () => {
      ctx.beginPath();
      ctx.moveTo(x, base);
      ctx.lineTo(x, base - h + roof);
      ctx.lineTo(x + w / 2, base - h);
      ctx.lineTo(x + w, base - h + roof);
      ctx.lineTo(x + w, base);
      ctx.closePath();
    };
    if (v > 0) {
      ctx.fillStyle = BOUGHT;
      draw();
      ctx.fill();
    } else {
      ctx.strokeStyle = STILL;
      ctx.lineWidth = 3;
      ctx.setLineDash([7, 5]);
      draw();
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });
  ctx.strokeStyle = SLATE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(P, base);
  ctx.lineTo(1080 - P, base);
  ctx.stroke();
  ctx.fillStyle = MUTED;
  ctx.font = '400 26px "IBM Plex Sans", sans-serif';
  ctx.fillText("years it took, by the year saving started; dashed: still saving in 2025", P, base + 40);
  ctx.font = '400 26px "IBM Plex Mono", monospace';
  ctx.fillText("finntech3.github.io/deposit-gap", P, 1350 - P + 10);
}
