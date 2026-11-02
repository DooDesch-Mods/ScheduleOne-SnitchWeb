// Rider identity: one bib number and one team colour per mod. The same rule runs on the dashboard, the phone
// remote and the in-game overlay, so a mod looks identical on every surface.

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

export function identityOf(mod: string, bibs: Map<string, number>): Identity {
  if (isUnattributed(mod)) return { bib: 0, color: UNATTRIBUTED_COLOR };
  return { bib: bibs.get(mod.toLowerCase()) ?? 0, color: teamColor(mod) };
}
