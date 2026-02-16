import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, DollarSign, Send, Clock, Database, CheckCircle } from "lucide-react";
import { useCampaignContext } from "@/contexts/CampaignContext";
import { useEstimates, EstimateRecord } from "@/hooks/useEstimates";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-muted" },
  sent: { label: "Sent", className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" },
  approved: { label: "Approved", className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" },
};

/* ── Estimate Detail Modal ─────────────────────── */
function EstimateDetailModal({ estimate, open, onOpenChange }: { estimate: EstimateRecord | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  if (!estimate) return null;
  const isReadOnly = estimate.status === "approved";
  const lineItems = (estimate.line_items || []) as any[];
  const config = STATUS_CONFIG[estimate.status] || STATUS_CONFIG.draft;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[85vw] max-h-[85vh] overflow-y-auto p-0" onClick={(e) => e.stopPropagation()}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              {isReadOnly ? "View Estimate" : "Review Estimate"}
            </DialogTitle>
            <Badge variant="outline" className={config.className}>{config.label}</Badge>
          </div>
          <DialogDescription>
            {isReadOnly ? "This estimate has been approved." : "Review estimate details."}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/30 rounded-lg p-4 border border-border/50">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ticket</p>
              <p className="text-sm font-semibold text-foreground">#{estimate.ticket_id || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Site</p>
              <p className="text-sm font-semibold text-foreground">{estimate.site_name || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Customer Email</p>
              <p className="text-sm font-semibold text-foreground">{estimate.customer_email || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Account Manager</p>
              <p className="text-sm font-semibold text-foreground">{estimate.account_manager || "—"}</p>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Line Items</h3>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="py-2 px-3 text-left">Description</th>
                    <th className="py-2 px-3 text-right">Qty</th>
                    <th className="py-2 px-3 text-left">Unit</th>
                    <th className="py-2 px-3 text-right">Rate</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-border/50 last:border-0">
                      <td className="py-2 px-3">{item.description}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{item.qty}</td>
                      <td className="py-2 px-3">{item.unit}</td>
                      <td className="py-2 px-3 text-right tabular-nums">${Number(item.rate).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-semibold tabular-nums">${Number(item.amount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-72 space-y-2 bg-muted/30 rounded-lg p-4 border border-border/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium tabular-nums">${Number(estimate.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax ({(Number(estimate.tax_rate) * 100).toFixed(0)}%)</span>
                <span className="tabular-nums">${Number(estimate.tax).toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between text-base font-bold">
                <span>Total</span>
                <span className="text-primary tabular-nums">${Number(estimate.total).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {estimate.notes && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Notes</h3>
              <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 border border-border/50">{estimate.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main Page ─────────────────────────────────── */
const Estimates = () => {
  const { selectedCampaignId } = useCampaignContext();
  const { data: estimates = [], isLoading } = useEstimates(selectedCampaignId || null);
  const [selectedEstimate, setSelectedEstimate] = useState<EstimateRecord | null>(null);

  const stats = useMemo(() => {
    const drafts = estimates.filter(e => e.status === "draft").length;
    const sent = estimates.filter(e => e.status === "sent").length;
    const approved = estimates.filter(e => e.status === "approved").length;
    const totalValue = estimates.reduce((sum, e) => sum + Number(e.total), 0);
    return { total: estimates.length, drafts, sent, approved, totalValue };
  }, [estimates]);

  if (!selectedCampaignId) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Database className="h-12 w-12 text-muted-foreground/40 mx-auto" />
          <h2 className="text-lg font-medium text-muted-foreground">No Campaign Selected</h2>
          <p className="text-sm text-muted-foreground/70 max-w-xs">
            Select a partner and campaign from the sidebar to view estimates.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="metric-card">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Estimates</p>
            <p className="text-3xl font-bold text-foreground">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="metric-card border-l-4 border-l-muted-foreground/30">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Drafts</p>
            <p className="text-3xl font-bold text-muted-foreground">{stats.drafts}</p>
          </CardContent>
        </Card>
        <Card className="metric-card border-l-4 border-l-blue-500">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Sent</p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.sent}</p>
          </CardContent>
        </Card>
        <Card className="metric-card border-l-4 border-l-green-500">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Approved</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.approved}</p>
          </CardContent>
        </Card>
        <Card className="metric-card border-l-4 border-l-optimal">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Value</p>
            <p className="text-3xl font-bold text-optimal">
              ${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Estimates Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : estimates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <FileText className="h-12 w-12 text-muted-foreground/40" />
              <h3 className="text-lg font-medium text-muted-foreground">No Estimates Yet</h3>
              <p className="text-sm text-muted-foreground/70 max-w-sm text-center">
                Estimates created from the Tickets page will appear here.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Station / Site</TableHead>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Customer Email</TableHead>
                  <TableHead>Account Manager</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estimates.map((est) => {
                  const config = STATUS_CONFIG[est.status] || STATUS_CONFIG.draft;
                  return (
                    <TableRow
                      key={est.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedEstimate(est)}
                    >
                      <TableCell>
                        <div className="font-medium">{est.site_name || est.station_id || "—"}</div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {est.ticket_id || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {est.customer_email || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {est.account_manager || "—"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${Number(est.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={config.className}>{config.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(est.created_at), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <EstimateDetailModal
        estimate={selectedEstimate}
        open={!!selectedEstimate}
        onOpenChange={(o) => { if (!o) setSelectedEstimate(null); }}
      />
    </div>
  );
};

export default Estimates;
