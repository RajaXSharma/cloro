/**
 * Presence colors are derived from a user's email and land anywhere on the wheel,
 * so no single foreground works on all of them: white fails on yellow, near-black
 * fails on blue. Both the roster chip and the remote-caret name label pick their
 * label color from here instead of hardcoding one.
 */
export function readableTextOn(color: string): string {
  const match = /hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/.exec(color);
  const black = "var(--background)";
  const white = "#ffffff";
  if (!match) return white;

  const h = Number(match[1]);
  const s = Number(match[2]) / 100;
  const l = Number(match[3]) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];

  const channel = (v: number) => {
    const t = v + m;
    return t <= 0.03928 ? t / 12.92 : ((t + 0.055) / 1.055) ** 2.4;
  };

  const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  const onBlack = (luminance + 0.05) / 0.05366; // against --background #0b0c0e
  const onWhite = 1.05 / (luminance + 0.05); // against #ffffff

  return onBlack >= onWhite ? black : white;
}
