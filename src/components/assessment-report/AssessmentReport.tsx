import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Shield, Wrench, User, FileText, DollarSign, Truck, AlertTriangle, Database,
  MapPin, Clock, CheckCircle, Star, Zap, Activity
} from "lucide-react";
import type { AssessmentReportData } from "./AssessmentReportData";

interface AssessmentReportProps {
  data: AssessmentReportData;
  compact?: boolean;
}

const RISK_STYLES: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  Critical: { bg: "bg-critical/10", border: "border-critical/30", text: "text-critical", badge: "bg-critical text-critical-foreground" },
  High: { bg: "bg-high/10", border: "border-high/30", text: "text-high", badge: "bg-high text-high-foreground" },
  Medium: { bg: "bg-medium/10", border: "border-medium/30", text: "text-medium", badge: "bg-medium text-medium-foreground" },
  Low: { bg: "bg-low/10", border: "border-low/30", text: "text-low", badge: "bg-low text-low-foreground" },
};

function SectionHeading({ icon: Icon, title, number }: { icon: React.ElementType; title: string; number: number }) {
  return (
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">{number}</span>
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">{title}</h3>
    </div>
  );
}

function InfoPair({ label, value, className = "" }: { label: string; value: string | number; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
      <p className="text-sm font-medium text-foreground">{String(value)}</p>
    </div>
  );
}

export function AssessmentReport({ data, compact }: AssessmentReportProps) {
  const risk = RISK_STYLES[data.riskLevel] || RISK_STYLES.Medium;

  return (
    <div className="assessment-report space-y-4 print:space-y-3">
      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between px-4 py-3 bg-card rounded-lg border border-border">
        <div className="flex items-center gap-3">
          <img src="/images/noch-power-logo.png" alt="Noch Power" className="h-8 object-contain" />
          <div className="border-l border-border pl-3">
            <h1 className="text-base font-bold text-foreground tracking-tight">AUTOHEAL™ ASSESSMENT</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Powered by AI • Professional Report</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-mono text-muted-foreground">{data.assessmentId}</p>
          <p className="text-[10px] text-muted-foreground">{format(new Date(data.generatedAt), "MMM d, yyyy • h:mm a")}</p>
        </div>
      </div>

      {/* META LINE */}
      <div className="flex items-center gap-4 px-4 text-[10px] text-muted-foreground flex-wrap">
        <span>Ticket: <strong className="text-foreground">{data.ticketId}</strong></span>
        <span>Customer: <strong className="text-foreground">{data.customer.company}</strong></span>
        <span>Charger: <strong className="text-foreground">{data.charger.serialNumber}</strong></span>
        <span>AI Model: <strong className="text-foreground">{data.aiModel}</strong></span>
      </div>

      {/* ═══ STATUS BANNER ═══ */}
      <div className={`px-4 py-3 rounded-lg border ${risk.bg} ${risk.border}`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Badge className={risk.badge}>{data.riskLevel} RISK</Badge>
            <span className={`text-sm font-semibold ${risk.text}`}>{data.statusBadge}</span>
          </div>
          {data.confidence > 0 && (
            <div className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">AI Confidence:</span>
              <span className={`text-sm font-bold ${data.confidence >= 85 ? "text-optimal" : data.confidence >= 70 ? "text-medium" : "text-degraded"}`}>
                {data.confidence}%
              </span>
            </div>
          )}
        </div>
        <p className="text-sm text-foreground mt-2 leading-relaxed">{data.summary}</p>
      </div>

      {/* ═══ 1: CHARGER INFORMATION ═══ */}
      <Card className="print:break-inside-avoid">
        <CardContent className="p-4">
          <SectionHeading icon={Zap} title="Charger Information" number={1} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <InfoPair label="Brand" value={data.charger.brand} />
            <InfoPair label="Model" value={data.charger.model} />
            <InfoPair label="Serial Number" value={data.charger.serialNumber} />
            <InfoPair label="Charger Type" value={data.charger.type} />
            <InfoPair label="Installation Date" value={data.charger.installationDate} />
            <InfoPair label="Age" value={`${data.charger.ageYears} years`} />
            <InfoPair label="Warranty" value={data.charger.warrantyStatus === "active" ? `Active${data.charger.warrantyExpiration ? ` (exp. ${data.charger.warrantyExpiration})` : ""}` : data.charger.warrantyStatus === "expired" ? "Expired" : "Unknown"} />
            <InfoPair label="Previous Repairs" value={data.charger.previousRepairs} />
          </div>
          {data.charger.knownIssues.length > 0 && (
            <div className="mt-3 p-2 bg-medium/5 border border-medium/20 rounded text-xs">
              <span className="font-semibold text-foreground">Known Issues: </span>
              <span className="text-muted-foreground">{data.charger.knownIssues.join("; ")}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ 2: CUSTOMER INFORMATION ═══ */}
      <Card className="print:break-inside-avoid">
        <CardContent className="p-4">
          <SectionHeading icon={User} title="Customer Information" number={2} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <InfoPair label="Name" value={data.customer.name} />
            <InfoPair label="Company" value={data.customer.company} />
            <InfoPair label="Location" value={data.customer.location} />
            <InfoPair label="Address" value={data.customer.address} />
          </div>
        </CardContent>
      </Card>

      {/* ═══ 3: DETAILED ASSESSMENT ═══ */}
      <Card className="print:break-inside-avoid">
        <CardContent className="p-4">
          <SectionHeading icon={FileText} title="Detailed Assessment" number={3} />
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{data.detailedAssessment}</p>
        </CardContent>
      </Card>

      {/* ═══ 4: RECOMMENDATION ═══ */}
      <Card className="print:break-inside-avoid">
        <CardContent className="p-4">
          <SectionHeading icon={CheckCircle} title="Recommendation & Expected Outcome" number={4} />
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg mb-3">
            <p className="text-sm text-foreground leading-relaxed">{data.recommendation}</p>
          </div>
          {data.expectedOutcome.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Expected Outcomes</p>
              <ul className="space-y-1">
                {data.expectedOutcome.map((o, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                    <CheckCircle className="h-3.5 w-3.5 text-optimal flex-shrink-0" />
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ 5: SWI MATCH ═══ */}
      <Card className="print:break-inside-avoid">
        <CardContent className="p-4">
          <SectionHeading icon={Wrench} title="Service Work Instruction (SWI)" number={5} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <InfoPair label="SWI Code" value={data.swi.code} />
            <InfoPair label="Title" value={data.swi.title} className="sm:col-span-2" />
            <InfoPair label="Confidence" value={`${data.swi.confidence}%`} />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <InfoPair label="Estimated Hours" value={data.swi.estimatedHours} />
            <InfoPair label="Skill Level" value={data.swi.skillLevel} />
          </div>
        </CardContent>
      </Card>

      {/* ═══ 6: PARTS REQUIRED ═══ */}
      {data.parts.length > 0 && (
        <Card className="print:break-inside-avoid">
          <CardContent className="p-4">
            <SectionHeading icon={Database} title="Required Parts" number={6} />
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 font-semibold text-muted-foreground">Part #</th>
                    <th className="text-left py-2 font-semibold text-muted-foreground">Description</th>
                    <th className="text-center py-2 font-semibold text-muted-foreground">Qty</th>
                    <th className="text-right py-2 font-semibold text-muted-foreground">Unit Cost</th>
                    <th className="text-right py-2 font-semibold text-muted-foreground">Total</th>
                    <th className="text-right py-2 font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.parts.map((p, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-1.5 font-mono">{p.partNumber}</td>
                      <td className="py-1.5">{p.description}</td>
                      <td className="py-1.5 text-center">{p.quantity}</td>
                      <td className="py-1.5 text-right">${p.unitCost.toFixed(2)}</td>
                      <td className="py-1.5 text-right font-medium">${p.totalCost.toFixed(2)}</td>
                      <td className="py-1.5 text-right">
                        <Badge variant="outline" className="text-[10px]">{p.availability}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="pt-2 text-right font-semibold">Parts Total:</td>
                    <td className="pt-2 text-right font-bold">${data.costs.partsTotal.toFixed(2)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ 7: COST BREAKDOWN ═══ */}
      <Card className="print:break-inside-avoid">
        <CardContent className="p-4">
          <SectionHeading icon={DollarSign} title="Cost Breakdown" number={7} />
          <div className="space-y-3">
            {/* Labor */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Labor</p>
              {data.costs.laborBreakdown.map((l, i) => (
                <div key={i} className="flex justify-between text-sm py-0.5">
                  <span className="text-muted-foreground">{l.description} ({l.hours}h × ${l.rate}/hr)</span>
                  <span className="font-medium">${l.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
            {/* Travel */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Travel</p>
              <div className="flex justify-between text-sm py-0.5">
                <span className="text-muted-foreground">Mileage ({data.costs.travelMileage} mi × $0.67/mi)</span>
                <span className="font-medium">${data.costs.travelMileageCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm py-0.5">
                <span className="text-muted-foreground">Travel Time ({data.costs.travelTimeHours}h × ${data.costs.travelTimeRate}/hr)</span>
                <span className="font-medium">${data.costs.travelTimeCost.toFixed(2)}</span>
              </div>
            </div>
            {/* Parts */}
            {data.costs.partsTotal > 0 && (
              <div className="flex justify-between text-sm py-0.5">
                <span className="text-muted-foreground">Parts Total</span>
                <span className="font-medium">${data.costs.partsTotal.toFixed(2)}</span>
              </div>
            )}
            {/* Totals */}
            <div className="border-t border-border pt-2 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">${data.costs.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax ({(data.costs.taxRate * 100).toFixed(0)}%)</span>
                <span className="font-medium">${data.costs.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t border-border pt-2 mt-1">
                <span>Estimated Total</span>
                <span className="text-primary">${data.costs.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══ 8: TECHNICIAN ASSIGNMENT ═══ */}
      <Card className="print:break-inside-avoid">
        <CardContent className="p-4">
          <SectionHeading icon={Truck} title="Technician & Travel" number={8} />
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                {data.technician.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{data.technician.name}</p>
                <p className="text-xs text-muted-foreground">{data.technician.level}</p>
              </div>
              <Badge variant="outline" className="ml-auto text-[10px]">{data.technician.availability}</Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mt-2">
              <div><span className="text-muted-foreground">Distance:</span> <span className="font-medium">{data.technician.distanceMiles} mi</span></div>
              <div><span className="text-muted-foreground">Travel:</span> <span className="font-medium">{data.technician.travelTimeHours}h each way</span></div>
              <div><span className="text-muted-foreground">Round Trip:</span> <span className="font-medium">{data.technician.roundTripDistance} mi</span></div>
              <div><span className="text-muted-foreground">Total Time:</span> <span className="font-medium">{data.technician.roundTripTime}h</span></div>
            </div>
          </div>
          {data.technician.alternatives && data.technician.alternatives.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Alternative Technicians</p>
              <div className="space-y-1.5">
                {data.technician.alternatives.map((alt, i) => (
                  <div key={i} className="flex items-center justify-between text-xs p-2 bg-muted/50 rounded">
                    <span className="font-medium text-foreground">{alt.name}</span>
                    <span className="text-muted-foreground">{alt.distance} mi — {alt.note}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ 9: SAFETY WARNINGS ═══ */}
      {(data.safetyWarnings.length > 0 || data.warrantyNotes.length > 0) && (
        <Card className="print:break-inside-avoid">
          <CardContent className="p-4">
            <SectionHeading icon={AlertTriangle} title="Safety & Compliance" number={9} />
            {data.safetyWarnings.length > 0 && (
              <div className="p-3 bg-critical/5 border border-critical/20 rounded-lg mb-3">
                <p className="text-xs font-semibold text-critical mb-1.5">⚠ Safety Warnings</p>
                <ul className="space-y-1">
                  {data.safetyWarnings.map((w, i) => (
                    <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                      <AlertTriangle className="h-3 w-3 text-critical mt-0.5 flex-shrink-0" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.warrantyNotes.length > 0 && (
              <div className="p-3 bg-medium/5 border border-medium/20 rounded-lg">
                <p className="text-xs font-semibold text-medium mb-1.5">📋 Warranty & Compliance Notes</p>
                <ul className="space-y-1">
                  {data.warrantyNotes.map((n, i) => (
                    <li key={i} className="text-xs text-foreground">{n}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══ 10: DATA SOURCES & FOOTER ═══ */}
      <Card className="print:break-inside-avoid">
        <CardContent className="p-4">
          <SectionHeading icon={Shield} title="Data Sources & Methodology" number={10} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Sources Consulted</p>
              <ul className="space-y-1">
                {data.dataSources.map((s, i) => (
                  <li key={i} className="text-xs text-foreground flex items-center gap-1.5">
                    <CheckCircle className="h-3 w-3 text-optimal flex-shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase">AI Engine</p>
              <p className="text-xs text-foreground">{data.generatedBy}</p>
              <p className="text-xs text-muted-foreground">Model: {data.aiModel}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══ FOOTER ═══ */}
      <div className="text-center text-[10px] text-muted-foreground py-2 border-t border-border">
        <p>Generated by {data.generatedBy} • {format(new Date(data.generatedAt), "MMMM d, yyyy")} • Assessment ID: {data.assessmentId}</p>
        <p className="mt-0.5">© {new Date().getFullYear()} Noch Power. Confidential — For authorized use only.</p>
      </div>
    </div>
  );
}
