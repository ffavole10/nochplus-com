import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";

Font.registerHyphenationCallback((word) => [word]);

const COLORS = {
  brand: "#25b3a5",
  ink: "#0f172a",
  muted: "#64748b",
  soft: "#f1f5f9",
  border: "#e2e8f0",
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: COLORS.ink,
    lineHeight: 1.45,
  },
  coverPage: {
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 56,
    fontFamily: "Helvetica",
    color: COLORS.ink,
  },
  brand: {
    fontSize: 15,
    fontWeight: "bold",
    color: COLORS.brand,
  },
  coverTitle: {
    marginTop: 28,
    fontSize: 30,
    fontWeight: "bold",
    lineHeight: 1.2,
  },
  coverSub: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.muted,
  },
  coverBlock: {
    marginTop: 48,
    paddingTop: 18,
    borderTopWidth: 2,
    borderTopColor: COLORS.brand,
  },
  coverLabel: {
    marginTop: 12,
    marginBottom: 3,
    fontSize: 8,
    color: COLORS.muted,
  },
  coverValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  heroStat: {
    marginTop: 42,
    padding: 20,
    backgroundColor: COLORS.soft,
    borderRadius: 6,
  },
  heroNumber: {
    fontSize: 44,
    fontWeight: "bold",
    color: COLORS.brand,
  },
  heroLabel: {
    marginTop: 4,
    fontSize: 11,
    color: COLORS.muted,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 6,
  },
  sectionRule: {
    width: 34,
    height: 3,
    backgroundColor: COLORS.brand,
    marginBottom: 16,
  },
  paragraph: {
    marginBottom: 10,
    fontSize: 10,
    lineHeight: 1.5,
  },
  callout: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#f0fdfa",
    borderLeftWidth: 3,
    borderLeftColor: COLORS.brand,
  },
  statsRow: {
    flexDirection: "row",
    marginTop: 8,
    marginBottom: 16,
  },
  statsGap: {
    width: 10,
  },
  statCard: {
    flex: 1,
    padding: 12,
    backgroundColor: COLORS.soft,
    borderRadius: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
  },
  statValueBrand: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.brand,
  },
  statLabel: {
    marginTop: 4,
    fontSize: 8,
    color: COLORS.muted,
  },
  riskRow: {
    flexDirection: "row",
    marginTop: 10,
    marginBottom: 16,
  },
  riskGap: {
    width: 8,
  },
  riskCard: {
    flex: 1,
    padding: 10,
    borderRadius: 4,
  },
  riskValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
  },
  riskLabel: {
    marginTop: 2,
    fontSize: 8,
    color: "#ffffff",
  },
  table: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: COLORS.soft,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  thText: {
    fontSize: 8,
    fontWeight: "bold",
    color: COLORS.muted,
  },
  tdText: {
    fontSize: 9,
    color: COLORS.ink,
  },
  insight: {
    marginTop: 18,
    padding: 12,
    backgroundColor: "#fef3c7",
    borderLeftWidth: 3,
    borderLeftColor: COLORS.medium,
  },
  insightLabel: {
    marginBottom: 4,
    fontSize: 8,
    fontWeight: "bold",
    color: "#92400e",
  },
  insightText: {
    fontSize: 10,
    color: "#78350f",
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  bulletMark: {
    width: 12,
    color: COLORS.brand,
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.5,
  },
  contactBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: COLORS.soft,
    borderRadius: 6,
  },
  cta: {
    marginTop: 20,
    padding: 14,
    borderRadius: 6,
    backgroundColor: COLORS.brand,
  },
  ctaText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerText: {
    fontSize: 8,
    color: COLORS.muted,
  },
});

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

const CHAR_REPLACEMENTS: Record<string, string> = {
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
};

function sanitizeText(value: string): string {
  return value
    .replace(/[—–·•●’‘“”…≥≤]/g, (char) => CHAR_REPLACEMENTS[char] ?? "")
    .normalize("NFKD")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .replace(/ {2,}/g, " ")
    .trim();
}

function sanitizeValue<T>(value: T): T {
  if (typeof value === "string") return sanitizeText(value) as T;
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item)) as T;
  if (value instanceof Date || value instanceof Blob || value == null) return value;
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, sanitizeValue(nested)])
    ) as T;
  }
  return value;
}

function formatDate(date: Date) {
  return sanitizeText(
    date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  );
}

function safeParagraphs(text: string) {
  const clean = sanitizeText(text);
  return clean
    .split(/\n\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function Footer({ customer }: { customer: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>Noch+ Campaign Report | {customer}</Text>
      <Text
        style={styles.footerText}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </View>
  );
}

function Spacer({ width }: { width: number }) {
  return <View style={{ width }} />;
}

function StatCard({ value, label, brand = false }: { value: string | number; label: string; brand?: boolean }) {
  return (
    <View style={styles.statCard}>
      <Text style={brand ? styles.statValueBrand : styles.statValue}>{sanitizeText(String(value))}</Text>
      <Text style={styles.statLabel}>{sanitizeText(label)}</Text>
    </View>
  );
}

function CoverPage(props: ReportProps) {
  const { reportName, snapshot, preparedBy, generatedAt } = props;

  return (
    <Page size="LETTER" style={styles.coverPage}>
      <Text style={styles.brand}>NOCH+</Text>
      <Text style={styles.coverTitle}>{sanitizeText(reportName)}</Text>
      <Text style={styles.coverSub}>{sanitizeText(snapshot.campaignName)}</Text>

      <View style={styles.coverBlock}>
        <Text style={styles.coverLabel}>Prepared for</Text>
        <Text style={styles.coverValue}>{sanitizeText(snapshot.customerName)}</Text>

        <Text style={styles.coverLabel}>Prepared by</Text>
        <Text style={styles.coverValue}>{sanitizeText(preparedBy.name || preparedBy.email)}</Text>

        <Text style={styles.coverLabel}>Date</Text>
        <Text style={styles.coverValue}>{formatDate(generatedAt)}</Text>
      </View>

      <View style={styles.heroStat}>
        <Text style={styles.heroNumber}>{sanitizeText(snapshot.totalChargers.toLocaleString())}</Text>
        <Text style={styles.heroLabel}>chargers analyzed across the fleet</Text>
      </View>
    </Page>
  );
}

function SummaryPage(props: ReportProps) {
  const { snapshot, aiSummary, introNote } = props;
  const flaggedPct = snapshot.totalChargers
    ? Math.round(((snapshot.critical + snapshot.high) / snapshot.totalChargers) * 100)
    : 0;
  const paragraphs = safeParagraphs(aiSummary);

  return (
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.sectionTitle}>Executive Summary</Text>
      <View style={styles.sectionRule} />

      {introNote ? (
        <View style={styles.callout}>
          <Text style={styles.paragraph}>{sanitizeText(introNote)}</Text>
        </View>
      ) : null}

      {paragraphs.length > 0 ? (
        paragraphs.map((paragraph, index) => (
          <Text key={index} style={styles.paragraph}>
            {paragraph}
          </Text>
        ))
      ) : (
        <Text style={styles.paragraph}>
          {sanitizeText(`This report summarizes the current state of the ${snapshot.customerName} fleet based on the most recent campaign data.`)}
        </Text>
      )}

      <View style={styles.statsRow}>
        <StatCard value={snapshot.totalChargers.toLocaleString()} label="Total Chargers" brand />
        <Spacer width={10} />
        <StatCard value={`${flaggedPct}%`} label="Flagged High or Critical" />
        <Spacer width={10} />
        <StatCard value={snapshot.healthScore} label="Health Score" />
        <Spacer width={10} />
        <StatCard value={snapshot.ticketStats?.slaBreached ?? 0} label="SLA Breached" />
      </View>

      <Footer customer={snapshot.customerName} />
    </Page>
  );
}

function HealthPage({ snapshot }: { snapshot: ReportSnapshot }) {
  const sites = snapshot.topRiskSites ?? [];

  return (
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.sectionTitle}>Network Health</Text>
      <View style={styles.sectionRule} />
      <Text style={styles.paragraph}>Current asset distribution across the fleet by health classification.</Text>

      <View style={styles.riskRow}>
        <View style={[styles.riskCard, { backgroundColor: COLORS.critical }]}>
          <Text style={styles.riskValue}>{snapshot.critical}</Text>
          <Text style={styles.riskLabel}>CRITICAL</Text>
        </View>
        <Spacer width={8} />
        <View style={[styles.riskCard, { backgroundColor: COLORS.high }]}>
          <Text style={styles.riskValue}>{snapshot.high}</Text>
          <Text style={styles.riskLabel}>HIGH</Text>
        </View>
        <Spacer width={8} />
        <View style={[styles.riskCard, { backgroundColor: COLORS.medium }]}>
          <Text style={styles.riskValue}>{snapshot.medium}</Text>
          <Text style={styles.riskLabel}>MEDIUM</Text>
        </View>
        <Spacer width={8} />
        <View style={[styles.riskCard, { backgroundColor: COLORS.low }]}>
          <Text style={styles.riskValue}>{snapshot.low}</Text>
          <Text style={styles.riskLabel}>HEALTHY</Text>
        </View>
      </View>

      {sites.length > 0 ? (
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.thText, { flex: 3 }]}>Site</Text>
            <Text style={[styles.thText, { flex: 2 }]}>Location</Text>
            <Text style={[styles.thText, { flex: 1, textAlign: "right" }]}>Issues</Text>
          </View>
          {sites.slice(0, 8).map((site, index) => (
            <View
              key={`${site.site_name}-${index}`}
              style={[styles.tableRow, index === Math.min(sites.length, 8) - 1 ? styles.tableRowLast : null]}
            >
              <Text style={[styles.tdText, { flex: 3 }]}>{sanitizeText(site.site_name)}</Text>
              <Text style={[styles.tdText, { flex: 2 }]}>{sanitizeText(`${site.city}, ${site.state}`)}</Text>
              <Text style={[styles.tdText, { flex: 1, textAlign: "right", color: COLORS.critical, fontWeight: "bold" }]}>
                {site.count}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <Footer customer={snapshot.customerName} />
    </Page>
  );
}

function DatasetPage({ snapshot }: { snapshot: ReportSnapshot }) {
  const chargers = snapshot.topPriorityChargers ?? [];
  const remaining = Math.max(snapshot.totalChargers - snapshot.serviced, 0);

  return (
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.sectionTitle}>Dataset</Text>
      <View style={styles.sectionRule} />
      <Text style={styles.paragraph}>Asset breakdown and chargers requiring assessment.</Text>

      <View style={styles.statsRow}>
        <StatCard value={snapshot.totalChargers.toLocaleString()} label="Total Chargers" brand />
        <Spacer width={10} />
        <StatCard value={snapshot.serviced} label="Serviced to Date" />
        <Spacer width={10} />
        <StatCard value={remaining} label="Remaining" />
      </View>

      {chargers.length > 0 ? (
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.thText, { flex: 2 }]}>Charger ID</Text>
            <Text style={[styles.thText, { flex: 3 }]}>Site</Text>
            <Text style={[styles.thText, { flex: 1.5 }]}>Type</Text>
            <Text style={[styles.thText, { flex: 1 }]}>Priority</Text>
          </View>
          {chargers.slice(0, 14).map((charger, index) => {
            const color =
              charger.priority === "Critical"
                ? COLORS.critical
                : charger.priority === "High"
                ? COLORS.high
                : charger.priority === "Medium"
                ? COLORS.medium
                : COLORS.low;

            return (
              <View
                key={`${charger.station_id}-${index}`}
                style={[styles.tableRow, index === Math.min(chargers.length, 14) - 1 ? styles.tableRowLast : null]}
              >
                <Text style={[styles.tdText, { flex: 2 }]}>{sanitizeText(charger.station_id)}</Text>
                <Text style={[styles.tdText, { flex: 3 }]}>{sanitizeText(charger.site_name)}</Text>
                <Text style={[styles.tdText, { flex: 1.5 }]}>{sanitizeText(charger.type)}</Text>
                <Text style={[styles.tdText, { flex: 1, color, fontWeight: "bold" }]}>{sanitizeText(charger.priority)}</Text>
              </View>
            );
          })}
        </View>
      ) : null}

      <Footer customer={snapshot.customerName} />
    </Page>
  );
}

function FlaggedPage({ snapshot }: { snapshot: ReportSnapshot }) {
  const ticketStats = snapshot.ticketStats;
  const geo = snapshot.geoDistribution ?? [];

  return (
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.sectionTitle}>Flagged Tickets</Text>
      <View style={styles.sectionRule} />
      <Text style={styles.paragraph}>Open service tickets, SLA performance, and aging breakdown.</Text>

      {ticketStats ? (
        <>
          <View style={styles.statsRow}>
            <StatCard value={ticketStats.open} label="Open Tickets" brand />
            <Spacer width={10} />
            <StatCard value={ticketStats.solved} label="Solved" />
            <Spacer width={10} />
            <StatCard value={ticketStats.slaBreached} label="SLA Breached" />
            <Spacer width={10} />
            <StatCard value={ticketStats.over90Days} label="> 90 Days" />
          </View>

          <View style={styles.riskRow}>
            <View style={[styles.riskCard, { backgroundColor: COLORS.critical }]}>
              <Text style={styles.riskValue}>{ticketStats.p1}</Text>
              <Text style={styles.riskLabel}>P1</Text>
            </View>
            <Spacer width={8} />
            <View style={[styles.riskCard, { backgroundColor: COLORS.high }]}>
              <Text style={styles.riskValue}>{ticketStats.p2}</Text>
              <Text style={styles.riskLabel}>P2</Text>
            </View>
            <Spacer width={8} />
            <View style={[styles.riskCard, { backgroundColor: COLORS.medium }]}>
              <Text style={styles.riskValue}>{ticketStats.p3}</Text>
              <Text style={styles.riskLabel}>P3</Text>
            </View>
            <Spacer width={8} />
            <View style={[styles.riskCard, { backgroundColor: COLORS.low }]}>
              <Text style={styles.riskValue}>{ticketStats.p4}</Text>
              <Text style={styles.riskLabel}>P4</Text>
            </View>
          </View>

          {ticketStats.over90Days > 0 && ticketStats.open > 0 ? (
            <View style={styles.insight}>
              <Text style={styles.insightLabel}>KEY INSIGHT</Text>
              <Text style={styles.insightText}>
                {sanitizeText(`${Math.round((ticketStats.over90Days / Math.max(ticketStats.open, 1)) * 100)}% of open tickets are over 90 days old. This suggests dispatch cadence is not keeping pace with incoming demand.`)}
              </Text>
            </View>
          ) : null}
        </>
      ) : null}

      {geo.length > 0 ? (
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.thText, { flex: 3 }]}>State</Text>
            <Text style={[styles.thText, { flex: 1, textAlign: "right" }]}>Tickets</Text>
          </View>
          {geo.slice(0, 10).map((item, index) => (
            <View
              key={`${item.state}-${index}`}
              style={[styles.tableRow, index === Math.min(geo.length, 10) - 1 ? styles.tableRowLast : null]}
            >
              <Text style={[styles.tdText, { flex: 3 }]}>{sanitizeText(item.state || "-")}</Text>
              <Text style={[styles.tdText, { flex: 1, textAlign: "right", fontWeight: "bold" }]}>{item.count}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Footer customer={snapshot.customerName} />
    </Page>
  );
}

function ClosingPage({ preparedBy, snapshot }: ReportProps) {
  const bullets = [
    "AI-driven reliability so issues surface before they become outages.",
    "Rapid dispatch through a national field technician network.",
    "Certified technicians with broad charger brand coverage.",
    "Transparent reporting with shareable customer-ready output.",
  ];

  return (
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.sectionTitle}>How Noch+ Helps</Text>
      <View style={styles.sectionRule} />

      {bullets.map((bullet, index) => (
        <View key={index} style={styles.bulletRow}>
          <Text style={styles.bulletMark}>-</Text>
          <Text style={styles.bulletText}>{sanitizeText(bullet)}</Text>
        </View>
      ))}

      <View style={styles.contactBox}>
        <Text style={styles.coverLabel}>Your contact</Text>
        <Text style={[styles.coverValue, { marginBottom: 4 }]}>{sanitizeText(preparedBy.name || preparedBy.email)}</Text>
        <Text style={styles.tdText}>{sanitizeText(preparedBy.email)}</Text>
      </View>

      <View style={styles.cta}>
        <Text style={styles.ctaText}>Ready to move forward? Let's talk.</Text>
      </View>

      <Footer customer={snapshot.customerName} />
    </Page>
  );
}

export function CampaignReportDocument(props: ReportProps) {
  const safeProps = sanitizeValue(props);
  const sections = safeProps.sectionsIncluded;

  return (
    <Document
      title={sanitizeText(safeProps.reportName)}
      author="Noch+"
      subject="Campaign Report"
    >
      <CoverPage {...safeProps} />
      <SummaryPage {...safeProps} />
      {sections.includes("dashboard") ? <HealthPage snapshot={safeProps.snapshot} /> : null}
      {sections.includes("dataset") ? <DatasetPage snapshot={safeProps.snapshot} /> : null}
      {sections.includes("flagged") ? <FlaggedPage snapshot={safeProps.snapshot} /> : null}
      <ClosingPage {...safeProps} />
    </Document>
  );
}

export async function renderCampaignReportPdf(props: ReportProps): Promise<Blob> {
  const safeProps = sanitizeValue(props);
  return pdf(<CampaignReportDocument {...safeProps} />).toBlob();
}
