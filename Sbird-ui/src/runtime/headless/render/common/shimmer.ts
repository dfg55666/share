// Phase 1: TUI -> Web semantic port of `shimmer.rs`.
//
// The upstream builds styled terminal `Span`s with RGB blending. In the browser
// we expose a model describing per-character intensity, leaving rendering to CSS.

export type ShimmerSpan = {
  text: string;
  intensity: number; // 0..1
  bold: boolean;
  dim: boolean;
};

const PROCESS_START_MS: number = Date.now();

function elapsedSinceStartMs(): number {
  return Date.now() - PROCESS_START_MS;
}

export function shimmer_spans(text: string): ShimmerSpan[] {
  const chars = Array.from(text);
  if (chars.length === 0) return [];

  const padding = 10;
  const period = chars.length + padding * 2;
  const sweepSeconds = 2.0;
  const posF =
    ((elapsedSinceStartMs() / 1000) % sweepSeconds) / sweepSeconds * period;
  const pos = Math.floor(posF);
  const bandHalfWidth = 5.0;

  const spans: ShimmerSpan[] = [];
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i]!;
    const iPos = i + padding;
    const dist = Math.abs(iPos - pos);

    const t =
      dist <= bandHalfWidth
        ? 0.5 * (1.0 + Math.cos(Math.PI * (dist / bandHalfWidth)))
        : 0.0;

    const intensity = Math.max(0, Math.min(1, t));
    const dim = intensity < 0.2;
    const bold = intensity >= 0.6;
    spans.push({ text: ch, intensity, bold, dim });
  }

  return spans;
}

