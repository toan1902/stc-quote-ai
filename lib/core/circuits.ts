/** Parse a circuit label string as printed on M&E drawings, e.g. "13,14,15", "1,2 + 3,4", "45A, 46A", "Line 7,8,9". */
export function parseCircuits(s?: string): string[] {
  if (!s) return [];
  const cleaned = s.replace(/\(.*?\)/g, " ").replace(/line|mạch|l(?=\d)/gi, " ");
  const parts = cleaned.split(/[,+;/&\s]+/).map((p) => p.trim().toUpperCase()).filter((p) => /^\d+[A-Z]?$/.test(p));
  return [...new Set(parts)];
}

/** Number of gangs (buttons) needed for a switch position. */
export function gangsOf(circuits?: string): number {
  return Math.max(1, parseCircuits(circuits).length);
}

/** Split a gang count into catalog switch sizes (max 4 per plate). */
export function splitGangs(n: number): number[] {
  const out: number[] = [];
  while (n > 4) { out.push(4); n -= 4; }
  if (n > 0) out.push(n);
  return out;
}
