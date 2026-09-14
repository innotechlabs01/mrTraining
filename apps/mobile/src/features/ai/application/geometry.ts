import type { Landmark } from '../domain/Landmark';

function toDeg(r: number): number { return (r * 180) / Math.PI; }

export function angleDeg(a: Landmark, b: Landmark, c: Landmark): number {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const dot = v1x * v2x + v1y * v2y;
  const m1 = Math.hypot(v1x, v1y);
  const m2 = Math.hypot(v2x, v2y);
  if (m1 === 0 || m2 === 0) return 180;
  const cos = Math.max(-1, Math.min(1, dot / (m1 * m2)));
  return toDeg(Math.acos(cos));
}

export function hipDropRatio(hip: Landmark, knee: Landmark, ankle: Landmark): number {
  const shin = ankle.y - knee.y;
  if (shin === 0) return 0;
  return (hip.y - knee.y) / shin + 1;
}

export function frameSpread(landmarks: Landmark[]): number {
  if (landmarks.length === 0) return 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const l of landmarks) {
    if (l.x < minX) minX = l.x;
    if (l.x > maxX) maxX = l.x;
    if (l.y < minY) minY = l.y;
    if (l.y > maxY) maxY = l.y;
  }
  const w = maxX - minX;
  const h = maxY - minY;
  return Math.max(w, h);
}

export function avgMid(
  a: Landmark,
  b: Landmark,
): { x: number; y: number } {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
