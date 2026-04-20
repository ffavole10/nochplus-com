import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Font,
} from "@react-pdf/renderer";

// Disable hyphenation to avoid font-internal lookups on long strings
// that can trigger "Cannot read properties of undefined (reading 'unitsPerEm')".
// Do NOT call Font.register() for built-in PDF fonts (Helvetica, Times-Roman,
// Courier) — `src` must be a real URL. Built-ins work automatically when
// referenced via `fontFamily` + `fontWeight: "bold"`.
Font.registerHyphenationCallback((word) => [word]);

// ---------- Brand tokens ----------
const TEAL = "#25b3a5";
const TEAL_DARK = "#1d8e83";
const INK = "#0f172a";
const MUTED = "#64748b";
const SOFT = "#f1f5f9";
const BORDER = "#e2e8f0";

const RISK = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
};

const PDF_CHAR_REPLACEMENTS: Record<string, string> = {
  "—": " - ",
  "–": " - ",
  "·": " | ",
  "•": "-",
  "●": "-",
  "’": "'",
  "‘": "'",
  "“": '"',
  "”": '"',
  "…": "...",
  "≥": ">=",
  "≤": "<=",
  "•": "-",
};

function sanitizePdfString(value: string): string {
  const replaced = value.replace(/[—–·•●’‘“”…≥≤]/g, (char) => PDF_CHAR_REPLACEMENTS[char] ?? "");
  return replaced
    .normalize("NFKD")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .replace(/ {2,}/g, " ")
    .trim();
}

function sanitizePdfValue<T>(value: T): T {
  if (typeof value === "string") {
    return sanitizePdfString(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizePdfValue(item)) as T;
  }

  if (value instanceof Date || value instanceof Blob || value == null) {
    return value;
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, sanitizePdfValue(nested)])
    ) as T;
  }

  return value;
}

const styles = StyleSheet.create({
  page: {
    padding: 56, // ~0.78"
    fontSize: 11,
    fontFamily: "Helvetica",
    color: INK,
    lineHeight: 1.55,
  },
  // Cover
  coverPage: { padding: 64, color: INK, fontFamily: "Helvetica" },
  coverBrand: { color: TEAL, fontSize: 16, fontWeight: "bold", letterSpacing: 2 },
  coverTitle: {
    fontSize: 38,
    fontWeight: "bold",
    marginTop: 40,
    color: INK,
    lineHeight: 1.15,
  },
  coverSub: { fontSize: 14, color: MUTED, marginTop: 14 },
  coverBlock: {
    marginTop: 80,
    paddingTop: 24,
    borderTop: `2px solid ${TEAL}`,
  },
  coverLabel: {
    fontSize: 9,
    color: MUTED,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  coverValue: { fontSize: 16, fontWeight: "bold", color: INK, marginBottom: 18 },
  heroStat: {
    marginTop: 60,
    padding: 28,
    backgroundColor: SOFT,
    borderRadius: 8,
  },
  heroNumber: { fontSize: 56, fontWeight: "bold", color: TEAL },
  heroLabel: { fontSize: 12, color: MUTED, marginTop: 4 },

  // Sections
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: INK,
    marginBottom: 6,
  },
  sectionRule: {
    width: 36,
    height: 3,
    backgroundColor: TEAL,
    marginBottom: 18,
  },
  para: { fontSize: 11, color: INK, marginBottom: 10, lineHeight: 1.6 },
  introCallout: {
    padding: 14,
    backgroundColor: "#f0fdfa",
    borderLeft: `3px solid ${TEAL}`,
    marginBottom: 22,
    fontSize: 11,
    color: INK,
  },

  // Stat row
  statRow: { flexDirection: "row", marginTop: 18, marginBottom: 18, gap: 12 },
  statBox: {
    flex: 1,
    padding: 14,
    backgroundColor: SOFT,
    borderRadius: 6,
  },
  statNum: { fontSize: 24, fontWeight: "bold", color: INK },
  statNumTeal: { fontSize: 24, fontWeight: "bold", color: TEAL },
  statLabel: { fontSize: 9, color: MUTED, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 },

  // Risk row
  riskRow: { flexDirection: "row", marginTop: 12, gap: 8 },
  riskChip: { flex: 1, padding: 10, borderRadius: 4 },
  riskChipNum: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  riskChipLabel: { fontSize: 8, color: "rgba(255,255,255,0.9)", marginTop: 2, letterSpacing: 0.5 },

  // Tables
  table: { marginTop: 14 },
  th: {
    flexDirection: "row",
    backgroundColor: SOFT,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottom: `1px solid ${BORDER}`,
  },
  thText: { fontSize: 9, fontWeight: "bold", color: MUTED, textTransform: "uppercase", letterSpacing: 0.5 },
  tr: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottom: `1px solid ${BORDER}`,
  },
  tdText: { fontSize: 10, color: INK },

  // Insight callout
  insight: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "#fef3c7",
    borderLeft: `3px solid #eab308`,
    borderRadius: 4,
  },
  insightLabel: {
    fontSize: 8,
    color: "#92400e",
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 4,
  },
  insightText: { fontSize: 11, color: "#78350f" },

  // Closing
  closingTitle: { fontSize: 28, fontWeight: "bold", color: INK, marginBottom: 6 },
  bullet: { flexDirection: "row", marginBottom: 10 },
  bulletDot: { color: TEAL, fontSize: 11, marginRight: 8 },
  bulletText: { fontSize: 11, color: INK, flex: 1, lineHeight: 1.5 },
  contactBox: {
    marginTop: 36,
    padding: 20,
    backgroundColor: SOFT,
    borderRadius: 8,
  },
  cta: {
    marginTop: 28,
    padding: 18,
    backgroundColor: TEAL,
    borderRadius: 8,
    color: "#fff",
  },
  ctaText: { color: "#fff", fontSize: 14, fontWeight: "bold" },

  // Footer
  footer: {
    position: "absolute",
    bottom: 28,
    left: 56,
    right: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTop: `1px solid ${BORDER}`,
  },
  footerText: { fontSize: 8, color: MUTED },
});

// ---------- Types ----------
export type ReportSnapshot = {
  totalChargers: number;
  serviced: number;
  healthScore: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  ticketStats?: {
    open: number;
    solved: number;
    p1: number;
    p2: number;
    p3: number;
    p4: number;
    slaBreached: number;
    over90Days: number;
  };
  topRiskSites?: { site_name: string; city: string; state: string; count: number }[];
  topPriorityChargers?: {
    station_id: string;
    site_name: string;
    type: string;
    priority: string;
    location: string;
  }[];
  geoDistribution?: { state: string; count: number }[];
  customerName: string;
  campaignName: string;
};

export type ReportProps = {
  reportName: string;
  introNote: string | null;
  sectionsIncluded: string[];
  snapshot: ReportSnapshot;
  aiSummary: string;
  preparedBy: { name: string; email: string };
  generatedAt: Date;
};

// ---------- Components ----------
const Footer = ({ customer, totalPages }: { customer: string; totalPages?: number }) => (
  <View style={styles.footer} fixed>
    <Text style={styles.footerText}>
      Noch+ Campaign Report | {customer}
    </Text>
    <Text
      style={styles.footerText}
      render={({ pageNumber, totalPages: tp }) =>
        `Page ${pageNumber} of ${totalPages || tp}`
      }
    />
  </View>
);

function CoverPage({ snapshot, reportName, generatedAt, preparedBy }: ReportProps) {
  return (
    <Page size="LETTER" style={styles.coverPage}>
      <Text style={styles.coverBrand}>NOCH+</Text>
      <Text style={styles.coverTitle}>{reportName}</Text>
      <Text style={styles.coverSub}>{snapshot.campaignName}</Text>

      <View style={styles.coverBlock}>
        <Text style={styles.coverLabel}>Prepared for</Text>
        <Text style={styles.coverValue}>{snapshot.customerName}</Text>

        <Text style={styles.coverLabel}>Prepared by</Text>
        <Text style={styles.coverValue}>{preparedBy.name || preparedBy.email}</Text>

        <Text style={styles.coverLabel}>Date</Text>
        <Text style={styles.coverValue}>
          {generatedAt.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </Text>
      </View>

      <View style={styles.heroStat}>
        <Text style={styles.heroNumber}>{snapshot.totalChargers.toLocaleString()}</Text>
        <Text style={styles.heroLabel}>chargers analyzed across the fleet</Text>
      </View>
    </Page>
  );
}

function ExecSummaryPage(props: ReportProps) {
  const { snapshot, aiSummary, introNote } = props;
  const flaggedPct = snapshot.totalChargers
    ? Math.round(((snapshot.critical + snapshot.high) / snapshot.totalChargers) * 100)
    : 0;

  const paragraphs = (aiSummary || "")
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.sectionTitle}>Executive Summary</Text>
      <View style={styles.sectionRule} />

      {introNote && <Text style={styles.introCallout}>{introNote}</Text>}

      {paragraphs.length > 0 ? (
        paragraphs.map((p, i) => (
          <Text key={i} style={styles.para}>
            {p}
          </Text>
        ))
      ) : (
        <Text style={styles.para}>
          This report summarizes the current state of the {snapshot.customerName} fleet
          based on the most recent assessment data.
        </Text>
      )}

      <View style={styles.statRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumTeal}>{snapshot.totalChargers.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total Chargers</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{flaggedPct}%</Text>
          <Text style={styles.statLabel}>Flagged High/Critical</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{snapshot.healthScore}</Text>
          <Text style={styles.statLabel}>Health Score</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{snapshot.ticketStats?.slaBreached ?? 0}</Text>
          <Text style={styles.statLabel}>SLA Breached</Text>
        </View>
      </View>

      <Footer customer={snapshot.customerName} />
    </Page>
  );
}

function DashboardPage({ snapshot }: ReportProps) {
  return (
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.sectionTitle}>Network Health</Text>
      <View style={styles.sectionRule} />

      <Text style={styles.para}>
        Current asset distribution across the fleet, by health classification.
      </Text>

      <View style={styles.riskRow}>
        <View style={[styles.riskChip, { backgroundColor: RISK.critical }]}>
          <Text style={styles.riskChipNum}>{snapshot.critical}</Text>
          <Text style={styles.riskChipLabel}>CRITICAL</Text>
        </View>
        <View style={[styles.riskChip, { backgroundColor: RISK.high }]}>
          <Text style={styles.riskChipNum}>{snapshot.high}</Text>
          <Text style={styles.riskChipLabel}>HIGH</Text>
        </View>
        <View style={[styles.riskChip, { backgroundColor: RISK.medium }]}>
          <Text style={styles.riskChipNum}>{snapshot.medium}</Text>
          <Text style={styles.riskChipLabel}>MEDIUM</Text>
        </View>
        <View style={[styles.riskChip, { backgroundColor: RISK.low }]}>
          <Text style={styles.riskChipNum}>{snapshot.low}</Text>
          <Text style={styles.riskChipLabel}>HEALTHY</Text>
        </View>
      </View>

      {snapshot.topRiskSites && snapshot.topRiskSites.length > 0 && (
        <>
          <Text style={[styles.para, { marginTop: 28, fontWeight: "bold" }]}>
            High Risk Areas
          </Text>
          <View style={styles.table}>
            <View style={styles.th}>
              <Text style={[styles.thText, { flex: 3 }]}>Site</Text>
              <Text style={[styles.thText, { flex: 2 }]}>Location</Text>
              <Text style={[styles.thText, { flex: 1, textAlign: "right" }]}>Issues</Text>
            </View>
            {snapshot.topRiskSites.slice(0, 8).map((s, i) => (
              <View style={styles.tr} key={i}>
                <Text style={[styles.tdText, { flex: 3 }]}>{s.site_name}</Text>
                <Text style={[styles.tdText, { flex: 2 }]}>
                  {s.city}, {s.state}
                </Text>
                <Text style={[styles.tdText, { flex: 1, textAlign: "right", color: RISK.critical, fontWeight: "bold" }]}>
                  {s.count}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      <Footer customer={snapshot.customerName} />
    </Page>
  );
}

function DatasetPage({ snapshot }: ReportProps) {
  return (
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.sectionTitle}>Dataset</Text>
      <View style={styles.sectionRule} />

      <Text style={styles.para}>
        Asset breakdown and chargers requiring assessment.
      </Text>

      <View style={styles.statRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumTeal}>{snapshot.totalChargers.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total Chargers</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{snapshot.serviced}</Text>
          <Text style={styles.statLabel}>Serviced to Date</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>
            {snapshot.totalChargers - snapshot.serviced}
          </Text>
          <Text style={styles.statLabel}>Remaining</Text>
        </View>
      </View>

      {snapshot.topPriorityChargers && snapshot.topPriorityChargers.length > 0 && (
        <>
          <Text style={[styles.para, { marginTop: 24, fontWeight: "bold" }]}>
            Top Priority Chargers
          </Text>
          <View style={styles.table}>
            <View style={styles.th}>
              <Text style={[styles.thText, { flex: 2 }]}>Charger ID</Text>
              <Text style={[styles.thText, { flex: 3 }]}>Site</Text>
              <Text style={[styles.thText, { flex: 1.5 }]}>Type</Text>
              <Text style={[styles.thText, { flex: 1 }]}>Priority</Text>
            </View>
            {snapshot.topPriorityChargers.slice(0, 14).map((c, i) => (
              <View style={styles.tr} key={i}>
                <Text style={[styles.tdText, { flex: 2 }]}>{c.station_id}</Text>
                <Text style={[styles.tdText, { flex: 3 }]}>{c.site_name}</Text>
                <Text style={[styles.tdText, { flex: 1.5 }]}>{c.type}</Text>
                <Text
                  style={[
                    styles.tdText,
                    {
                      flex: 1,
                      fontWeight: "bold",
                      color:
                        c.priority === "Critical"
                          ? RISK.critical
                          : c.priority === "High"
                          ? RISK.high
                          : c.priority === "Medium"
                          ? RISK.medium
                          : RISK.low,
                    },
                  ]}
                >
                  {c.priority}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      <Footer customer={snapshot.customerName} />
    </Page>
  );
}

function FlaggedPage({ snapshot }: ReportProps) {
  const t = snapshot.ticketStats;
  return (
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.sectionTitle}>Flagged Tickets</Text>
      <View style={styles.sectionRule} />

      <Text style={styles.para}>
        Open service tickets, SLA performance, and aging breakdown.
      </Text>

      {t && (
        <>
          <View style={styles.statRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumTeal}>{t.open}</Text>
              <Text style={styles.statLabel}>Open Tickets</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{t.solved}</Text>
              <Text style={styles.statLabel}>Solved</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: RISK.critical }]}>{t.slaBreached}</Text>
              <Text style={styles.statLabel}>SLA Breached</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: RISK.high }]}>{t.over90Days}</Text>
              <Text style={styles.statLabel}>&gt; 90 Days</Text>
            </View>
          </View>

          <View style={styles.riskRow}>
            <View style={[styles.riskChip, { backgroundColor: RISK.critical }]}>
              <Text style={styles.riskChipNum}>{t.p1}</Text>
              <Text style={styles.riskChipLabel}>P1</Text>
            </View>
            <View style={[styles.riskChip, { backgroundColor: RISK.high }]}>
              <Text style={styles.riskChipNum}>{t.p2}</Text>
              <Text style={styles.riskChipLabel}>P2</Text>
            </View>
            <View style={[styles.riskChip, { backgroundColor: RISK.medium }]}>
              <Text style={styles.riskChipNum}>{t.p3}</Text>
              <Text style={styles.riskChipLabel}>P3</Text>
            </View>
            <View style={[styles.riskChip, { backgroundColor: RISK.low }]}>
              <Text style={styles.riskChipNum}>{t.p4}</Text>
              <Text style={styles.riskChipLabel}>P4</Text>
            </View>
          </View>

          {t.over90Days > 0 && t.open > 0 && (
            <View style={styles.insight}>
              <Text style={styles.insightLabel}>KEY INSIGHT</Text>
              <Text style={styles.insightText}>
                {Math.round((t.over90Days / Math.max(t.open, 1)) * 100)}% of open
                tickets are over 90 days old - a strong signal that current dispatch
                cadence is not keeping pace with incoming demand.
              </Text>
            </View>
          )}
        </>
      )}

      {snapshot.geoDistribution && snapshot.geoDistribution.length > 0 && (
        <>
          <Text style={[styles.para, { marginTop: 22, fontWeight: "bold" }]}>
            Geographic Distribution
          </Text>
          <View style={styles.table}>
            <View style={styles.th}>
              <Text style={[styles.thText, { flex: 3 }]}>State</Text>
              <Text style={[styles.thText, { flex: 1, textAlign: "right" }]}>Tickets</Text>
            </View>
            {snapshot.geoDistribution.slice(0, 10).map((g, i) => (
              <View style={styles.tr} key={i}>
                <Text style={[styles.tdText, { flex: 3 }]}>{g.state || "-"}</Text>
                <Text style={[styles.tdText, { flex: 1, textAlign: "right", fontWeight: "bold" }]}>
                  {g.count}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      <Footer customer={snapshot.customerName} />
    </Page>
  );
}

function ClosingPage({ snapshot, preparedBy }: ReportProps) {
  return (
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.closingTitle}>How Noch+ Helps</Text>
      <View style={styles.sectionRule} />

      {[
        "AI-driven reliability - every charger is monitored, scored, and prioritized automatically so issues surface before they become outages.",
        "Rapid dispatch - a national network of certified field technicians, mobilized in days, not weeks.",
        "Certified technicians - OEM-trained for every major charger brand, with full diagnostic and repair coverage.",
        "Transparent reporting - live dashboards, branded customer reports, and full audit trail on every action.",
      ].map((b, i) => (
        <View style={styles.bullet} key={i}>
          <Text style={styles.bulletDot}>-</Text>
          <Text style={styles.bulletText}>{b}</Text>
        </View>
      ))}

      <View style={styles.contactBox}>
        <Text style={styles.coverLabel}>Your contact</Text>
        <Text style={[styles.coverValue, { marginBottom: 4 }]}>
          {preparedBy.name || preparedBy.email}
        </Text>
        <Text style={[styles.tdText, { color: MUTED }]}>{preparedBy.email}</Text>
      </View>

      <View style={styles.cta}>
        <Text style={styles.ctaText}>Ready to move forward? Let's talk.</Text>
      </View>

      <Footer customer={snapshot.customerName} />
    </Page>
  );
}

export function CampaignReportDocument(props: ReportProps) {
  const sections = props.sectionsIncluded;
  return (
    <Document
      title={props.reportName}
      author="Noch+"
      subject="Campaign Report"
    >
      <CoverPage {...props} />
      <ExecSummaryPage {...props} />
      {sections.includes("dashboard") && <DashboardPage {...props} />}
      {sections.includes("dataset") && <DatasetPage {...props} />}
      {sections.includes("flagged") && <FlaggedPage {...props} />}
      <ClosingPage {...props} />
    </Document>
  );
}

export async function renderCampaignReportPdf(props: ReportProps): Promise<Blob> {
  const safeProps = sanitizePdfValue(props);
  const blob = await pdf(<CampaignReportDocument {...safeProps} />).toBlob();
  return blob;
}
          <Text style={styles.riskChipNum}>{snapshot.high}</Text>
          <Text style={styles.riskChipLabel}>HIGH</Text>
        </View>
        <View style={[styles.riskChip, { backgroundColor: RISK.medium }]}>
          <Text style={styles.riskChipNum}>{snapshot.medium}</Text>
          <Text style={styles.riskChipLabel}>MEDIUM</Text>
        </View>
        <View style={[styles.riskChip, { backgroundColor: RISK.low }]}>
          <Text style={styles.riskChipNum}>{snapshot.low}</Text>
          <Text style={styles.riskChipLabel}>HEALTHY</Text>
        </View>
      </View>

      {snapshot.topRiskSites && snapshot.topRiskSites.length > 0 && (
        <>
          <Text style={[styles.para, { marginTop: 28, fontWeight: "bold" }]}>
            High Risk Areas
          </Text>
          <View style={styles.table}>
            <View style={styles.th}>
              <Text style={[styles.thText, { flex: 3 }]}>Site</Text>
              <Text style={[styles.thText, { flex: 2 }]}>Location</Text>
              <Text style={[styles.thText, { flex: 1, textAlign: "right" }]}>Issues</Text>
            </View>
            {snapshot.topRiskSites.slice(0, 8).map((s, i) => (
              <View style={styles.tr} key={i}>
                <Text style={[styles.tdText, { flex: 3 }]}>{s.site_name}</Text>
                <Text style={[styles.tdText, { flex: 2 }]}>
                  {s.city}, {s.state}
                </Text>
                <Text style={[styles.tdText, { flex: 1, textAlign: "right", color: RISK.critical, fontWeight: "bold" }]}>
                  {s.count}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      <Footer customer={snapshot.customerName} />
    </Page>
  );
}

function DatasetPage({ snapshot }: ReportProps) {
  return (
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.sectionTitle}>Dataset</Text>
      <View style={styles.sectionRule} />

      <Text style={styles.para}>
        Asset breakdown and chargers requiring assessment.
      </Text>

      <View style={styles.statRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumTeal}>{snapshot.totalChargers.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total Chargers</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{snapshot.serviced}</Text>
          <Text style={styles.statLabel}>Serviced to Date</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>
            {snapshot.totalChargers - snapshot.serviced}
          </Text>
          <Text style={styles.statLabel}>Remaining</Text>
        </View>
      </View>

      {snapshot.topPriorityChargers && snapshot.topPriorityChargers.length > 0 && (
        <>
          <Text style={[styles.para, { marginTop: 24, fontWeight: "bold" }]}>
            Top Priority Chargers
          </Text>
          <View style={styles.table}>
            <View style={styles.th}>
              <Text style={[styles.thText, { flex: 2 }]}>Charger ID</Text>
              <Text style={[styles.thText, { flex: 3 }]}>Site</Text>
              <Text style={[styles.thText, { flex: 1.5 }]}>Type</Text>
              <Text style={[styles.thText, { flex: 1 }]}>Priority</Text>
            </View>
            {snapshot.topPriorityChargers.slice(0, 14).map((c, i) => (
              <View style={styles.tr} key={i}>
                <Text style={[styles.tdText, { flex: 2 }]}>{c.station_id}</Text>
                <Text style={[styles.tdText, { flex: 3 }]}>{c.site_name}</Text>
                <Text style={[styles.tdText, { flex: 1.5 }]}>{c.type}</Text>
                <Text
                  style={[
                    styles.tdText,
                    {
                      flex: 1,
                      fontWeight: "bold",
                      color:
                        c.priority === "Critical"
                          ? RISK.critical
                          : c.priority === "High"
                          ? RISK.high
                          : c.priority === "Medium"
                          ? RISK.medium
                          : RISK.low,
                    },
                  ]}
                >
                  {c.priority}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      <Footer customer={snapshot.customerName} />
    </Page>
  );
}

function FlaggedPage({ snapshot }: ReportProps) {
  const t = snapshot.ticketStats;
  return (
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.sectionTitle}>Flagged Tickets</Text>
      <View style={styles.sectionRule} />

      <Text style={styles.para}>
        Open service tickets, SLA performance, and aging breakdown.
      </Text>

      {t && (
        <>
          <View style={styles.statRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumTeal}>{t.open}</Text>
              <Text style={styles.statLabel}>Open Tickets</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{t.solved}</Text>
              <Text style={styles.statLabel}>Solved</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: RISK.critical }]}>{t.slaBreached}</Text>
              <Text style={styles.statLabel}>SLA Breached</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: RISK.high }]}>{t.over90Days}</Text>
              <Text style={styles.statLabel}>&gt; 90 Days</Text>
            </View>
          </View>

          <View style={styles.riskRow}>
            <View style={[styles.riskChip, { backgroundColor: RISK.critical }]}>
              <Text style={styles.riskChipNum}>{t.p1}</Text>
              <Text style={styles.riskChipLabel}>P1</Text>
            </View>
            <View style={[styles.riskChip, { backgroundColor: RISK.high }]}>
              <Text style={styles.riskChipNum}>{t.p2}</Text>
              <Text style={styles.riskChipLabel}>P2</Text>
            </View>
            <View style={[styles.riskChip, { backgroundColor: RISK.medium }]}>
              <Text style={styles.riskChipNum}>{t.p3}</Text>
              <Text style={styles.riskChipLabel}>P3</Text>
            </View>
            <View style={[styles.riskChip, { backgroundColor: RISK.low }]}>
              <Text style={styles.riskChipNum}>{t.p4}</Text>
              <Text style={styles.riskChipLabel}>P4</Text>
            </View>
          </View>

          {t.over90Days > 0 && t.open > 0 && (
            <View style={styles.insight}>
              <Text style={styles.insightLabel}>KEY INSIGHT</Text>
              <Text style={styles.insightText}>
                {Math.round((t.over90Days / Math.max(t.open, 1)) * 100)}% of open
                tickets are over 90 days old — a strong signal that current dispatch
                cadence is not keeping pace with incoming demand.
              </Text>
            </View>
          )}
        </>
      )}

      {snapshot.geoDistribution && snapshot.geoDistribution.length > 0 && (
        <>
          <Text style={[styles.para, { marginTop: 22, fontWeight: "bold" }]}>
            Geographic Distribution
          </Text>
          <View style={styles.table}>
            <View style={styles.th}>
              <Text style={[styles.thText, { flex: 3 }]}>State</Text>
              <Text style={[styles.thText, { flex: 1, textAlign: "right" }]}>Tickets</Text>
            </View>
            {snapshot.geoDistribution.slice(0, 10).map((g, i) => (
              <View style={styles.tr} key={i}>
                <Text style={[styles.tdText, { flex: 3 }]}>{g.state || "—"}</Text>
                <Text style={[styles.tdText, { flex: 1, textAlign: "right", fontWeight: "bold" }]}>
                  {g.count}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      <Footer customer={snapshot.customerName} />
    </Page>
  );
}

function ClosingPage({ snapshot, preparedBy }: ReportProps) {
  return (
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.closingTitle}>How Noch+ Helps</Text>
      <View style={styles.sectionRule} />

      {[
        "AI-driven reliability — every charger is monitored, scored, and prioritized automatically so issues surface before they become outages.",
        "Rapid dispatch — a national network of certified field technicians, mobilized in days, not weeks.",
        "Certified technicians — OEM-trained for every major charger brand, with full diagnostic and repair coverage.",
        "Transparent reporting — live dashboards, branded customer reports, and full audit trail on every action.",
      ].map((b, i) => (
        <View style={styles.bullet} key={i}>
          <Text style={styles.bulletDot}>●</Text>
          <Text style={styles.bulletText}>{b}</Text>
        </View>
      ))}

      <View style={styles.contactBox}>
        <Text style={styles.coverLabel}>Your contact</Text>
        <Text style={[styles.coverValue, { marginBottom: 4 }]}>
          {preparedBy.name || preparedBy.email}
        </Text>
        <Text style={[styles.tdText, { color: MUTED }]}>{preparedBy.email}</Text>
      </View>

      <View style={styles.cta}>
        <Text style={styles.ctaText}>Ready to move forward? Let's talk.</Text>
      </View>

      <Footer customer={snapshot.customerName} />
    </Page>
  );
}

export function CampaignReportDocument(props: ReportProps) {
  const sections = props.sectionsIncluded;
  return (
    <Document
      title={props.reportName}
      author="Noch+"
      subject="Campaign Report"
    >
      <CoverPage {...props} />
      <ExecSummaryPage {...props} />
      {sections.includes("dashboard") && <DashboardPage {...props} />}
      {sections.includes("dataset") && <DatasetPage {...props} />}
      {sections.includes("flagged") && <FlaggedPage {...props} />}
      <ClosingPage {...props} />
    </Document>
  );
}

export async function renderCampaignReportPdf(props: ReportProps): Promise<Blob> {
  const blob = await pdf(<CampaignReportDocument {...props} />).toBlob();
  return blob;
}
