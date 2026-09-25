// Turns what a reader types into search terms and an optional year: "shiganshina 850" means
// "things matching Shiganshina that exist in 850". Pure, so it's unit-tested without a database.

const STOPWORDS = new Set(["a", "an", "and", "at", "in", "of", "on", "the", "to"]);

export interface ParsedQuery {
  /** Lower-case words that must all match, each with letters and digits only. */
  terms: string[];
  /** A year to restrict to, from a standalone number like `850` or `-1150`. */
  year: number | null;
}

export function parseQuery(input: string): ParsedQuery {
  const terms: string[] = [];
  let year: number | null = null;
  for (const raw of input.toLowerCase().split(/\s+/)) {
    if (/^-?\d{1,4}$/.test(raw)) {
      year = Number(raw);
      continue;
    }
    // Keep letters (any script) and digits; drop punctuation so terms are safe in tsquery.
    const term = raw.normalize("NFKD").replace(/[^\p{L}\p{N}]/gu, "");
    if (term.length >= 2 && !STOPWORDS.has(term) && !terms.includes(term)) terms.push(term);
  }
  return { terms: terms.slice(0, 6), year };
}
