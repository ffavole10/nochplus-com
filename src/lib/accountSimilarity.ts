// Lightweight similarity helpers used for account duplicate detection (client-side)

export function normalizeName(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\b(inc|llc|ltd|corp|corporation|co|company|gmbh|sa|ag)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractDomain(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  // From email
  if (trimmed.includes("@")) {
    const after = trimmed.split("@")[1];
    if (after) return after.toLowerCase().replace(/\/.*$/, "");
  }
  // From URL
  try {
    const u = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

// Levenshtein distance
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) m[i][0] = i;
  for (let j = 0; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + cost);
    }
  }
  return m[a.length][b.length];
}

// Trigram-style similarity (Jaccard over 3-char shingles, mirrors pg_trgm-ish behavior)
function trigrams(s: string): Set<string> {
  const padded = `  ${s}  `;
  const set = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) set.add(padded.slice(i, i + 3));
  return set;
}

export function trigramSimilarity(a: string, b: string): number {
  const A = trigrams(normalizeName(a));
  const B = trigrams(normalizeName(b));
  if (!A.size && !B.size) return 0;
  let intersection = 0;
  A.forEach((g) => { if (B.has(g)) intersection++; });
  const union = A.size + B.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const tri = trigramSimilarity(na, nb);
  const lev = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  const levSim = maxLen === 0 ? 0 : 1 - lev / maxLen;
  return Math.max(tri, levSim);
}

export type AccountLike = {
  id: string;
  company: string;
  email?: string | null;
  domain?: string | null;
  duplicate_confirmed_distinct_of?: string[] | null;
};

export type MatchKind = "exact" | "similar";

export type AccountMatch<T extends AccountLike = AccountLike> = {
  account: T;
  score: number;
  kind: MatchKind;
  reason: string;
};

export function findAccountMatches<T extends AccountLike>(
  query: string,
  accounts: T[],
  opts: { excludeIds?: string[]; similarThreshold?: number; emailDomain?: string | null } = {}
): AccountMatch<T>[] {
  const q = normalizeName(query);
  if (!q) return [];
  const exclude = new Set(opts.excludeIds || []);
  const threshold = opts.similarThreshold ?? 0.6;
  const emailDom = opts.emailDomain ? opts.emailDomain.toLowerCase() : null;

  const out: AccountMatch<T>[] = [];
  for (const a of accounts) {
    if (exclude.has(a.id)) continue;
    const an = normalizeName(a.company);
    if (!an) continue;
    let kind: MatchKind | null = null;
    let reason = "";
    let score = 0;

    if (an === q || an.startsWith(q) || q.startsWith(an)) {
      kind = "exact";
      score = an === q ? 1 : 0.95;
      reason = an === q ? "Exact name match" : "Name starts with query";
    } else {
      const sim = nameSimilarity(q, an);
      if (sim >= threshold) {
        kind = "similar";
        score = sim;
        reason = `Name similarity ${(sim * 100).toFixed(0)}%`;
      } else if (levenshtein(q, an) <= 3) {
        kind = "similar";
        score = 0.7;
        reason = "Edit distance ≤ 3";
      }
    }

    // Email domain match (overrides "no match")
    if (!kind && emailDom) {
      const dom = (a.domain || extractDomain(a.email || "") || "").toLowerCase();
      if (dom && dom === emailDom) {
        kind = "similar";
        score = 0.85;
        reason = `Same email domain (${emailDom})`;
      }
    }

    if (kind) out.push({ account: a, score, kind, reason });
  }

  out.sort((x, y) => y.score - x.score);
  return out;
}
