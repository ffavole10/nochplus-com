import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Clock, Shield, Wrench, Package, CalendarCheck, Car, HeadphonesIcon,
  FileText, ClipboardCheck, AlertTriangle, Ticket, BarChart3,
  Phone, DollarSign, Users, MapPin, Search, MessageSquare,
} from "lucide-react";
import {
  TierName, TIER_LABELS, TIER_BADGE_CLASSES, TIER_BORDER_COLORS,
  calcSiteMonthlyCost,
} from "@/constants/nochPlusTiers";
import type { PartnerInfo, SiteConfig } from "@/hooks/usePartnershipHub";
import { useKnowledgeBase, type KBItem } from "@/hooks/useKnowledgeBase";

interface PresentTabProps {
  partnerInfo: PartnerInfo;
  sites: SiteConfig[];
  summary: {
    totalL2: number; totalDC: number; totalChargers: number;
    monthlyTotal: number; annualTotal: number; estimatedSavings: number;
  };
}

const BENEFITS = [
  { icon: Clock, title: "Guaranteed Response SLA", desc: "24 to 72 hour onsite response with credit-back if we miss it" },
  { icon: Shield, title: "Priority Dispatch Queue", desc: "NOCH+ members jump ahead of non-members in the service queue" },
  { icon: DollarSign, title: "Labor Rate Discounts", desc: "10% to 20% off standard labor rates on every service call" },
  { icon: Package, title: "Parts Discounts", desc: "5% to 15% off parts pricing with expedited sourcing" },
  { icon: CalendarCheck, title: "Preventative Maintenance", desc: "50% off PM visits (Priority) or 1 visit/yr included (Elite)" },
  { icon: Car, title: "Travel Fee Waivers", desc: "1 to unlimited waivers per year within NOCH service areas" },
  { icon: HeadphonesIcon, title: "Dedicated Support", desc: "From shared ticket queue up to a dedicated Account Manager" },
  { icon: FileText, title: "Annual Site Health Report", desc: "Reliability scorecard with uptime data and recommendations" },
  { icon: ClipboardCheck, title: "Onboarding Site Assessment", desc: "Complimentary evaluation at signup; unlimited for new installs on Elite" },
  { icon: AlertTriangle, title: "Emergency Parts Priority", desc: "Priority and Elite members get first access to our parts inventory" },
  { icon: Ticket, title: "Direct Ticket Submission", desc: "Open service tickets directly in our system for fast response" },
  { icon: BarChart3, title: "Quarterly Business Review", desc: "Strategic review of service performance and recommendations (Elite)" },
  { icon: Phone, title: "After-Hours Emergency Line", desc: "Direct emergency contact outside coverage hours (Elite)" },
  { icon: DollarSign, title: "SLA Credit-Back Guarantee", desc: "10% to 20% credit on monthly fee if we miss the response window" },
  { icon: Users, title: "W2 In-House Technicians", desc: "Our own certified technicians, not contractors. We control quality." },
  { icon: MapPin, title: "Multi-State Coverage", desc: "In-house technicians plus vetted partners for nationwide reach" },
];

const QUICK_QUESTIONS = [
  "What if you're late?",
  "Too expensive",
  "Already have a partner",
  "What states?",
  "Can we try it free?",
  "Who are your techs?",
  "OEM warranty?",
  "How fast to onboard?",
];

export function PresentTab({ partnerInfo, sites, summary }: PresentTabProps) {
  const { data: kbItems = [] } = useKnowledgeBase();
  const [query, setQuery] = useState("");
  const [matchedAnswer, setMatchedAnswer] = useState<KBItem | null>(null);
  const [history, setHistory] = useState<{ q: string; a: KBItem }[]>([]);

  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });

  const searchKB = (q: string) => {
    const lower = q.toLowerCase();
    const words = lower.split(/\s+/).filter((w) => w.length > 2);
    let best: KBItem | null = null;
    let bestScore = 0;
    for (const item of kbItems) {
      const combined = (item.question + " " + item.answer).toLowerCase();
      const score = words.filter((w) => combined.includes(w)).length;
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }
    if (best && bestScore > 0) {
      setMatchedAnswer(best);
      setHistory((prev) => [{ q, a: best! }, ...prev]);
    } else {
      setMatchedAnswer(null);
    }
  };

  const handleSearch = () => {
    if (!query.trim()) return;
    searchKB(query);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Hero Banner */}
      <div className="rounded-xl bg-gradient-to-r from-sidebar to-sidebar/80 p-8 text-sidebar-foreground">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center font-bold text-primary-foreground text-sm">N+</div>
          <span className="text-sm font-medium text-sidebar-foreground/70 uppercase tracking-wider">NOCH+ Membership Program</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold mb-2">
          Custom Reliability Plan for {partnerInfo.companyName || "Your Organization"}
        </h2>
        <p className="text-sidebar-foreground/70 max-w-2xl">
          Guaranteed response times, priority dispatch, and discounted service for a flat monthly fee per charger.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{summary.totalChargers}</p>
            <p className="text-xs text-muted-foreground">{summary.totalL2} L2 + {summary.totalDC} DC</p>
            <p className="text-sm font-medium mt-1">Total Chargers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{fmt(summary.monthlyTotal)}</p>
            <p className="text-xs text-muted-foreground">per month</p>
            <p className="text-sm font-medium mt-1">Monthly Investment</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{fmt(summary.annualTotal)}</p>
            <p className="text-xs text-muted-foreground">per year</p>
            <p className="text-sm font-medium mt-1">Annual Investment</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/30">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{fmt(summary.estimatedSavings)}</p>
            <p className="text-xs text-muted-foreground">estimated</p>
            <p className="text-sm font-medium mt-1">Annual Savings</p>
          </CardContent>
        </Card>
      </div>

      {/* Site Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Site Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sites.map((site) => {
            const monthly = calcSiteMonthlyCost(site.l2Count, site.dcCount, site.tier);
            return (
              <div key={site.id} className={`flex items-center justify-between p-3 rounded-lg border-l-4 bg-muted/30 ${TIER_BORDER_COLORS[site.tier]}`}>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{site.name}</span>
                  <span className="text-sm text-muted-foreground">{site.l2Count} L2 · {site.dcCount} DC</span>
                  <Badge className={TIER_BADGE_CLASSES[site.tier]}>{TIER_LABELS[site.tier]}</Badge>
                </div>
                <span className="font-semibold">{fmt(monthly)}/mo</span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Benefits */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">What's Included in Your Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {BENEFITS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-3 p-3 rounded-lg bg-muted/30">
                <Icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Q&A Assistant */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> NOCH+ Q&A Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. What happens if you guys are late?"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-1" /> Get Answer
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_QUESTIONS.map((q) => (
              <Button key={q} variant="outline" size="sm" className="text-xs" onClick={() => { setQuery(q); searchKB(q); }}>
                {q}
              </Button>
            ))}
          </div>
          {matchedAnswer && (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm font-semibold mb-1">Q: {matchedAnswer.question}</p>
              <p className="text-sm text-muted-foreground">{matchedAnswer.answer}</p>
            </div>
          )}
          {!matchedAnswer && query && (
            <p className="text-sm text-muted-foreground italic">
              I don't have a specific answer for that in our Knowledge Base yet. You can add it in the Knowledge Base tab.
            </p>
          )}
          {history.length > 1 && (
            <>
              <Separator />
              <p className="text-xs font-medium text-muted-foreground">Previous Questions</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {history.slice(1).map((h, i) => (
                  <button key={i} className="w-full text-left p-2 rounded hover:bg-muted/50 text-xs" onClick={() => setMatchedAnswer(h.a)}>
                    {h.q}
                  </button>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
