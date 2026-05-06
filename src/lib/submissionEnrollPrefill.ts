/**
 * Cross-page handoff for "Enroll from Submission" flow.
 * Stored in sessionStorage so a navigation to the account Membership tab
 * can auto-open the enrollment modal with submission-derived defaults.
 */

export type EnrollPrefillLine = {
  charger_type: "ac_level_2" | "dc_level_3" | "ac_level_1";
  connector_count: number;
  notes: string;
};

export type EnrollPrefill = {
  account_id: string;
  source_submission_id: string;
  source_submission_display_id: string;
  lines: EnrollPrefillLine[];
  notes: string;
  billing_contact_email?: string | null;
  billing_contact_name?: string | null;
  /** If set: open the "add lines" mode instead of fresh enrollment. */
  mode: "enroll" | "add_lines";
};

const KEY = "noch_enroll_prefill_v1";

export function setEnrollPrefill(p: EnrollPrefill) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
}

export function consumeEnrollPrefill(accountId: string): EnrollPrefill | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as EnrollPrefill;
    if (p.account_id !== accountId) return null;
    sessionStorage.removeItem(KEY);
    return p;
  } catch {
    return null;
  }
}

export function mapSubmissionChargerTypeToLine(
  chargerType: string
): EnrollPrefillLine["charger_type"] {
  const t = chargerType.toLowerCase();
  if (t.includes("dc") || t.includes("level 3") || t.includes("level3")) return "dc_level_3";
  if (t.includes("level 1") || t.includes("level1")) return "ac_level_1";
  return "ac_level_2";
}
