import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Download, AlertTriangle, Diamond } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

type PublicReport = {
  id: string;
  report_name: string;
  intro_note: string | null;
  sections_included: string[];
  snapshot_data: {
    totalChargers: number;
    serviced: number;
    healthScore: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    customerName: string;
    campaignName: string;
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
  };
  ai_executive_summary: string | null;
  require_email_to_view: boolean;
  customer_name: string | null;
  created_at: string;
  created_by_name: string | null;
  created_by_email: string | null;
  pdf_url: string | null;
};

const RISK_COLORS: Record<string, string> = {
  critical: "bg-[hsl(var(--critical))]",
  high: "bg-[hsl(var(--high))]",
  medium: "bg-[hsl(var(--medium))]",
  low: "bg-[hsl(var(--low))]",
};

function getSessionId() {
  let s = sessionStorage.getItem("nochplus-report-session");
  if (!s) {
    s = crypto.randomUUID();
    sessionStorage.setItem("nochplus-report-session", s);
  }
  return s;
}

function emailKey(token: string) {
  return `nochplus-report-email-${token}`;
}

export default function PublicReport() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<PublicReport | null>(null);
  const [errorState, setErrorState] = useState<"not_found" | "expired" | "revoked" | null>(null);
  const [needsEmail, setNeedsEmail] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  // Tracking refs
  const sessionStartRef = useRef<number>(Date.now());
  const sectionsTimeRef = useRef<Record<string, number>>({});
  const currentSectionRef = useRef<string | null>(null);
  const lastTickRef = useRef<number>(Date.now());
  const maxScrollRef = useRef<number>(0);

  useEffect(() => {
    document.title = report?.report_name
      ? `${report.report_name} · Noch+`
      : "Noch+ Report";
  }, [report?.report_name]);

  // Load report
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-public-report?token=${encodeURIComponent(token)}`;
        const r = await fetch(url, {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        });
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          if (body?.error === "expired") setErrorState("expired");
          else if (body?.error === "revoked") setErrorState("revoked");
          else setErrorState("not_found");
          setLoading(false);
          return;
        }
        const data = (await r.json()) as PublicReport;
        setReport(data);

        // Email gate?
        const storedEmail = localStorage.getItem(emailKey(token));
        if (data.require_email_to_view && !storedEmail) {
          setNeedsEmail(true);
        }
        setLoading(false);
      } catch (e) {
        console.error(e);
        setErrorState("not_found");
        setLoading(false);
      }
    })();
  }, [token]);

  // Track init view
  useEffect(() => {
    if (!report || !token || needsEmail) return;
    const sessionId = getSessionId();
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-report-view`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ token, session_id: sessionId, event: "init" }),
    }).catch(() => {});
  }, [report, token, needsEmail]);

  // IntersectionObserver for sections + scroll depth + heartbeat
  useEffect(() => {
    if (!report || !token || needsEmail) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            // Switch active section, accumulate time on previous
            const newSection = (entry.target as HTMLElement).dataset.section || null;
            const now = Date.now();
            if (currentSectionRef.current && currentSectionRef.current !== newSection) {
              const delta = (now - lastTickRef.current) / 1000;
              sectionsTimeRef.current[currentSectionRef.current] =
                (sectionsTimeRef.current[currentSectionRef.current] || 0) + delta;
              lastTickRef.current = now;
            }
            currentSectionRef.current = newSection;
          }
        });
      },
      { threshold: [0.5] }
    );

    document.querySelectorAll<HTMLElement>("[data-section]").forEach((el) => {
      observer.observe(el);
    });

    const onScroll = () => {
      const doc = document.documentElement;
      const scrollTop = window.scrollY;
      const winH = window.innerHeight;
      const docH = doc.scrollHeight - winH;
      if (docH > 0) {
        const pct = Math.min(100, Math.round((scrollTop / docH) * 100));
        if (pct > maxScrollRef.current) maxScrollRef.current = pct;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const sendHeartbeat = (event: "heartbeat" | "download" = "heartbeat") => {
      // Accumulate active section time
      const now = Date.now();
      if (currentSectionRef.current) {
        const delta = (now - lastTickRef.current) / 1000;
        sectionsTimeRef.current[currentSectionRef.current] =
          (sectionsTimeRef.current[currentSectionRef.current] || 0) + delta;
      }
      lastTickRef.current = now;

      const sessionId = getSessionId();
      const duration = Math.round((now - sessionStartRef.current) / 1000);
      const payload = {
        token,
        session_id: sessionId,
        event,
        session_duration_seconds: duration,
        sections_viewed: sectionsTimeRef.current,
        max_scroll_depth_percent: maxScrollRef.current,
      };

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-report-view`;
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      // Use sendBeacon when leaving (no apikey needed for beacon — function accepts public)
      if (event === "heartbeat" && "sendBeacon" in navigator) {
        try {
          navigator.sendBeacon(url, blob);
          return;
        } catch {}
      }
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    };

    const interval = setInterval(() => sendHeartbeat("heartbeat"), 10000);
    const onUnload = () => sendHeartbeat("heartbeat");
    window.addEventListener("beforeunload", onUnload);
    window.addEventListener("pagehide", onUnload);

    return () => {
      observer.disconnect();
      clearInterval(interval);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("pagehide", onUnload);
      sendHeartbeat("heartbeat");
    };
  }, [report, token, needsEmail]);

  const submitEmail = async () => {
    if (!emailInput.trim() || !token) return;
    localStorage.setItem(emailKey(token), emailInput.trim());
    setNeedsEmail(false);
    // Send email event
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-report-view`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        token,
        session_id: getSessionId(),
        event: "email",
        viewer_email: emailInput.trim(),
      }),
    }).catch(() => {});
  };

  const handleDownload = () => {
    if (!report?.pdf_url || !token) return;
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-report-view`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        token,
        session_id: getSessionId(),
        event: "download",
      }),
    }).catch(() => {});
    window.open(report.pdf_url, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (errorState) {
    const messages = {
      expired: "This report has expired and is no longer available.",
      revoked: "This report link has been revoked.",
      not_found: "This report could not be found.",
    };
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <AlertTriangle className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Report unavailable</h1>
          <p className="text-muted-foreground">{messages[errorState]}</p>
          <p className="text-sm text-muted-foreground pt-4">
            Please contact your Noch+ representative for an updated link.
          </p>
        </div>
      </div>
    );
  }

  if (needsEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-sm w-full space-y-5">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1 text-primary font-bold tracking-widest">
              <Diamond className="h-4 w-4" /> NOCH+
            </div>
            <h1 className="text-xl font-semibold text-foreground">
              This report is shared privately
            </h1>
            <p className="text-sm text-muted-foreground">
              Please enter your email to continue.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="viewer-email">Email</Label>
            <Input
              id="viewer-email"
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitEmail();
              }}
              placeholder="you@company.com"
              autoFocus
            />
            <Button onClick={submitEmail} className="w-full">
              View report
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const s = report.snapshot_data;
  const t = s.ticketStats;
  const flaggedPct = s.totalChargers
    ? Math.round(((s.critical + s.high) / s.totalChargers) * 100)
    : 0;
  const sections = report.sections_included;
  const summaryParas = (report.ai_executive_summary || "")
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/50">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-bold tracking-widest text-sm">
            <Diamond className="h-4 w-4" /> NOCH+
          </div>
          {report.pdf_url && (
            <Button onClick={handleDownload} size="sm" variant="outline">
              <Download className="h-4 w-4 mr-2" /> Download PDF
            </Button>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12 grid lg:grid-cols-[180px_1fr] gap-10">
        {/* Side nav */}
        <nav className="hidden lg:block">
          <div className="sticky top-24 space-y-1 text-sm">
            <a href="#summary" className="block py-1.5 text-muted-foreground hover:text-foreground">
              Summary
            </a>
            {sections.includes("dashboard") && (
              <a href="#dashboard" className="block py-1.5 text-muted-foreground hover:text-foreground">
                Network Health
              </a>
            )}
            {sections.includes("dataset") && (
              <a href="#dataset" className="block py-1.5 text-muted-foreground hover:text-foreground">
                Dataset
              </a>
            )}
            {sections.includes("flagged") && (
              <a href="#flagged" className="block py-1.5 text-muted-foreground hover:text-foreground">
                Flagged Tickets
              </a>
            )}
            <a href="#closing" className="block py-1.5 text-muted-foreground hover:text-foreground">
              Next Steps
            </a>
          </div>
        </nav>

        <main className="space-y-16 min-w-0">
          {/* Cover / title */}
          <section data-section="cover" className="space-y-3 pb-8 border-b border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">
              Prepared for {report.customer_name || s.customerName}
            </p>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
              {report.report_name}
            </h1>
            <p className="text-lg text-muted-foreground">{s.campaignName}</p>
            <p className="text-sm text-muted-foreground pt-2">
              Generated{" "}
              {new Date(report.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              · by {report.created_by_name || report.created_by_email || "Noch+ Team"}
            </p>
          </section>

          {/* Executive summary */}
          <section data-section="summary" id="summary" className="space-y-6">
            <SectionHeader title="Executive Summary" />
            {report.intro_note && (
              <div className="p-4 bg-primary/5 border-l-4 border-primary text-foreground">
                {report.intro_note}
              </div>
            )}
            {summaryParas.length > 0 ? (
              summaryParas.map((p, i) => (
                <p key={i} className="text-foreground leading-relaxed">
                  {p}
                </p>
              ))
            ) : (
              <p className="text-foreground leading-relaxed">
                This report summarizes the current state of the {s.customerName} fleet.
              </p>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
              <Stat value={s.totalChargers.toLocaleString()} label="Total Chargers" accent />
              <Stat value={`${flaggedPct}%`} label="Flagged High/Critical" />
              <Stat value={s.healthScore.toString()} label="Health Score" />
              <Stat value={(t?.slaBreached ?? 0).toString()} label="SLA Breached" />
            </div>
          </section>

          {/* Dashboard */}
          {sections.includes("dashboard") && (
            <section data-section="dashboard" id="dashboard" className="space-y-6">
              <SectionHeader title="Network Health" />
              <p className="text-muted-foreground">
                Current asset distribution across the fleet, by health classification.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <RiskTile count={s.critical} label="CRITICAL" tone="critical" />
                <RiskTile count={s.high} label="HIGH" tone="high" />
                <RiskTile count={s.medium} label="MEDIUM" tone="medium" />
                <RiskTile count={s.low} label="HEALTHY" tone="low" />
              </div>

              {s.topRiskSites && s.topRiskSites.length > 0 && (
                <div className="pt-4">
                  <h3 className="font-semibold text-foreground mb-3">High Risk Areas</h3>
                  <div className="border border-border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <Th>Site</Th>
                          <Th>Location</Th>
                          <Th align="right">Issues</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.topRiskSites.slice(0, 8).map((site, i) => (
                          <tr key={i} className="border-t border-border">
                            <Td>{site.site_name}</Td>
                            <Td className="text-muted-foreground">
                              {site.city}, {site.state}
                            </Td>
                            <Td align="right" className="font-bold text-[hsl(var(--critical))]">
                              {site.count}
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Dataset */}
          {sections.includes("dataset") && (
            <section data-section="dataset" id="dataset" className="space-y-6">
              <SectionHeader title="Dataset" />
              <p className="text-muted-foreground">
                Asset breakdown and chargers requiring assessment.
              </p>
              <div className="grid grid-cols-3 gap-3">
                <Stat value={s.totalChargers.toLocaleString()} label="Total Chargers" accent />
                <Stat value={s.serviced.toString()} label="Serviced to Date" />
                <Stat value={(s.totalChargers - s.serviced).toString()} label="Remaining" />
              </div>

              {s.topPriorityChargers && s.topPriorityChargers.length > 0 && (
                <div className="pt-4">
                  <h3 className="font-semibold text-foreground mb-3">Top Priority Chargers</h3>
                  <div className="border border-border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <Th>Charger ID</Th>
                          <Th>Site</Th>
                          <Th>Type</Th>
                          <Th>Priority</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.topPriorityChargers.slice(0, 14).map((c, i) => (
                          <tr key={i} className="border-t border-border">
                            <Td className="font-mono text-xs">{c.station_id}</Td>
                            <Td>{c.site_name}</Td>
                            <Td className="text-muted-foreground">{c.type}</Td>
                            <Td>
                              <PriorityBadge priority={c.priority} />
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Flagged */}
          {sections.includes("flagged") && t && (
            <section data-section="flagged" id="flagged" className="space-y-6">
              <SectionHeader title="Flagged Tickets" />
              <p className="text-muted-foreground">
                Open service tickets, SLA performance, and aging breakdown.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat value={t.open.toString()} label="Open Tickets" accent />
                <Stat value={t.solved.toString()} label="Solved" />
                <Stat
                  value={t.slaBreached.toString()}
                  label="SLA Breached"
                  toneClass="text-[hsl(var(--critical))]"
                />
                <Stat
                  value={t.over90Days.toString()}
                  label="> 90 Days"
                  toneClass="text-[hsl(var(--high))]"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <RiskTile count={t.p1} label="P1" tone="critical" />
                <RiskTile count={t.p2} label="P2" tone="high" />
                <RiskTile count={t.p3} label="P3" tone="medium" />
                <RiskTile count={t.p4} label="P4" tone="low" />
              </div>

              {t.over90Days > 0 && t.open > 0 && (
                <div className="p-4 bg-[hsl(var(--medium-muted))] border-l-4 border-[hsl(var(--medium))] rounded-r">
                  <p className="text-xs font-bold text-[hsl(var(--medium))] tracking-widest mb-1">
                    KEY INSIGHT
                  </p>
                  <p className="text-foreground">
                    {Math.round((t.over90Days / Math.max(t.open, 1)) * 100)}% of open tickets are
                    over 90 days old — a strong signal that current dispatch cadence is not keeping
                    pace with incoming demand.
                  </p>
                </div>
              )}

              {s.geoDistribution && s.geoDistribution.length > 0 && (
                <div className="pt-4">
                  <h3 className="font-semibold text-foreground mb-3">Geographic Distribution</h3>
                  <div className="border border-border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <Th>State</Th>
                          <Th align="right">Tickets</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.geoDistribution.slice(0, 10).map((g, i) => (
                          <tr key={i} className="border-t border-border">
                            <Td>{g.state || "—"}</Td>
                            <Td align="right" className="font-semibold">
                              {g.count}
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Closing */}
          <section data-section="closing" id="closing" className="space-y-6 pt-8 border-t border-border">
            <SectionHeader title="How Noch+ Helps" />
            <ul className="space-y-3">
              {[
                "AI-driven reliability — every charger is monitored, scored, and prioritized automatically.",
                "Rapid dispatch — a national network of certified field technicians, mobilized in days.",
                "Certified technicians — OEM-trained for every major charger brand.",
                "Transparent reporting — live dashboards, branded customer reports, full audit trail.",
              ].map((b, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-primary font-bold">●</span>
                  <span className="text-foreground">{b}</span>
                </li>
              ))}
            </ul>

            <div className="p-5 bg-muted rounded-lg">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                Your contact
              </p>
              <p className="font-bold text-foreground">
                {report.created_by_name || report.created_by_email || "Noch+ Team"}
              </p>
              {report.created_by_email && (
                <p className="text-sm text-muted-foreground">{report.created_by_email}</p>
              )}
            </div>

            <div className="p-5 bg-primary text-primary-foreground rounded-lg">
              <p className="font-bold text-lg">Ready to move forward? Let's talk.</p>
            </div>
          </section>

          <footer className="pt-8 pb-4 border-t border-border text-xs text-muted-foreground text-center">
            Prepared by Noch+ ·{" "}
            {new Date(report.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </footer>
        </main>
      </div>
    </div>
  );
}

// ---------- Sub-components ----------
function SectionHeader({ title }: { title: string }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground">{title}</h2>
      <div className="w-9 h-1 bg-primary mt-2" />
    </div>
  );
}

function Stat({
  value,
  label,
  accent,
  toneClass,
}: {
  value: string;
  label: string;
  accent?: boolean;
  toneClass?: string;
}) {
  return (
    <div className="p-4 bg-muted/50 rounded-md">
      <div
        className={`text-2xl font-bold ${
          toneClass || (accent ? "text-primary" : "text-foreground")
        }`}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
        {label}
      </div>
    </div>
  );
}

function RiskTile({
  count,
  label,
  tone,
}: {
  count: number;
  label: string;
  tone: "critical" | "high" | "medium" | "low";
}) {
  return (
    <div className={`p-4 rounded-md text-white ${RISK_COLORS[tone]}`}>
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-[10px] tracking-widest mt-1 opacity-90">{label}</div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    Critical: "text-[hsl(var(--critical))]",
    High: "text-[hsl(var(--high))]",
    Medium: "text-[hsl(var(--medium))]",
    Low: "text-[hsl(var(--low))]",
  };
  return <span className={`font-semibold ${map[priority] || ""}`}>{priority}</span>;
}

function Th({
  children,
  align,
}: {
  children: React.ReactNode;
  align?: "right" | "left";
}) {
  return (
    <th
      className={`px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
  className = "",
}: {
  children: React.ReactNode;
  align?: "right" | "left";
  className?: string;
}) {
  return (
    <td
      className={`px-3 py-2.5 ${align === "right" ? "text-right" : ""} ${className}`}
    >
      {children}
    </td>
  );
}
