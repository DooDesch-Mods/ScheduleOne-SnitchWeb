// Bib numbers and team colours per mod, for the dashboard and the phone remote. Snitch's in-game overlay computes
// the same values in Standings.cs.

export const UNATTRIBUTED = "(unattributed)";
export const UNATTRIBUTED_COLOR = "#5B6573";

export const TEAM = [
  "#0F8B8D", // teal
  "#6A4C93", // violet
  "#E07A1F", // orange
  "#2F6FDE", // blue
  "#B5179E", // magenta
  "#8C5A3C", // brown
  "#3A86A8", // cyan
  "#6B8E23", // olive
] as const;

/** FNV-1a, 32 bit, over the UTF-8 bytes of the string. */
export function fnv1a32(s: string): number {
  let hash = 2166136261;
  for (const b of new TextEncoder().encode(s)) {
    hash ^= b;
    // Math.imul keeps the multiplication inside 32 bits; >>> 0 turns it back into an unsigned value.
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

export interface Identity {
  bib: number;
  color: string;
}

export const isUnattributed = (mod: string) => mod.trim() === "" || mod.trim().toLowerCase() === UNATTRIBUTED;

/** Team colour of a mod, derived from its lower-cased name. */
export function teamColor(mod: string): string {
  if (isUnattributed(mod)) return UNATTRIBUTED_COLOR;
  return TEAM[fnv1a32(mod.toLowerCase()) % TEAM.length];
}

/**
 * Bib numbers for a set of known mod names: sorted ordinally and case-insensitively, bib = index + 1.
 * Bib 0 is reserved for the unattributed rider and is never part of the numbering. Keyed by lower-cased name.
 */
export function buildBibs(mods: Iterable<string>): Map<string, number> {
  const names = new Set<string>();
  for (const m of mods) if (!isUnattributed(m)) names.add(m.toLowerCase());
  const sorted = [...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return new Map(sorted.map((n, i) => [n, i + 1]));
}

const lin = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
};

/** Bib digit colour: white or navy, whichever has the higher contrast against the team colour. */
export function inkOn(color: string): string {
  const l = luminance(color);
  const white = 1.05 / (l + 0.05);
  const navy = (l + 0.05) / (luminance("#14213D") + 0.05);
  return white >= navy ? "#FFFFFF" : "#14213D";
}

/**
 * Identity of one mod. A name missing from `bibs` gets the next free number after the numbered mods (size + 1),
 * never 0, which is reserved for the unattributed rider.
 */
export function identityOf(mod: string, bibs: Map<string, number>): Identity {
  if (isUnattributed(mod)) return { bib: 0, color: UNATTRIBUTED_COLOR };
  return { bib: bibs.get(mod.toLowerCase()) ?? bibs.size + 1, color: teamColor(mod) };
}
