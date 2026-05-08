// Port of `tuitoweb/src/color.rs`.

export type Rgb = readonly [number, number, number];

export function isLight(bg: Rgb): boolean {
  const [r, g, b] = bg;
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  return y > 128.0;
}

export function blend(fg: Rgb, bg: Rgb, alpha: number): Rgb {
  const [fr, fg2, fb] = fg;
  const [br, bg2, bb] = bg;
  const a = Math.max(0, Math.min(alpha, 1));
  const r = fr * a + br * (1 - a);
  const g = fg2 * a + bg2 * (1 - a);
  const b = fb * a + bb * (1 - a);
  return [Math.round(r), Math.round(g), Math.round(b)];
}

function srgbToLinear(c: number): number {
  const x = c / 255.0;
  if (x <= 0.04045) return x / 12.92;
  return Math.pow((x + 0.055) / 1.055, 2.4);
}

function rgbToXyz(r: number, g: number, b: number): [number, number, number] {
  const rl = srgbToLinear(r);
  const gl = srgbToLinear(g);
  const bl = srgbToLinear(b);
  const x = rl * 0.4124 + gl * 0.3576 + bl * 0.1805;
  const y = rl * 0.2126 + gl * 0.7152 + bl * 0.0722;
  const z = rl * 0.0193 + gl * 0.1192 + bl * 0.9505;
  return [x, y, z];
}

function xyzToLab(x: number, y: number, z: number): [number, number, number] {
  const xr = x / 0.95047;
  const yr = y / 1.0;
  const zr = z / 1.08883;

  const f = (t: number) => {
    if (t > 0.008856) return Math.pow(t, 1 / 3);
    return 7.787 * t + 16 / 116;
  };

  const fx = f(xr);
  const fy = f(yr);
  const fz = f(zr);

  const l = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b2 = 200 * (fy - fz);
  return [l, a, b2];
}

// Perceptual color distance using CIE76 in Lab space (approximation).
export function perceptualDistance(a: Rgb, b: Rgb): number {
  const [x1, y1, z1] = rgbToXyz(a[0], a[1], a[2]);
  const [x2, y2, z2] = rgbToXyz(b[0], b[1], b[2]);
  const [l1, a1, b1] = xyzToLab(x1, y1, z1);
  const [l2, a2, b2] = xyzToLab(x2, y2, z2);
  const dl = l1 - l2;
  const da = a1 - a2;
  const db = b1 - b2;
  return Math.sqrt(dl * dl + da * da + db * db);
}
