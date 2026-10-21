export function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-\(\)]/g, "");
}

export function isSudanesePhone(raw: string): boolean {
  const n = normalizePhone(raw);
  // Sudanese mobile: +2499XXXXXXXX (9 after +249) or 09XXXXXXXX or 9XXXXXXXX
  return /^(?:\+249|0)?9\d{8}$/.test(n);
}

export function toE164Sudanese(raw: string): string {
  const n = normalizePhone(raw);
  if (n.startsWith("+249")) return n;
  if (n.startsWith("0")) return `+249${n.slice(1)}`;
  if (/^9\d{8}$/.test(n)) return `+249${n}`;
  return n;
}

export function phoneError(raw: string): string | null {
  if (!raw.trim()) return "Guardian phone required — Sudanese number needed (e.g., +249 91 234 5678)";
  if (!isSudanesePhone(raw)) return "Invalid Sudanese phone — must be +249 9XXXXXXXX or 09XXXXXXXX";
  return null;
}
