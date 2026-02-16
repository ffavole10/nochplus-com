import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, DollarSign, Send, Clock, Database, CheckCircle } from "lucide-react";
import { useCampaignContext } from "@/contexts/CampaignContext";
import { useEstimates } from "@/hooks/useEstimates";
import { format } from "date-fns";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-muted" },
  sent: { label: "Sent", className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" },
  approved: { label: "Approved", className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" },
};

const Estimates = () => {
  const { selectedCampaignId } = useCampaignContext();
  const { data: estimates = [], isLoading } = useEstimates(selectedCampaignId || null);

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
                    <TableRow key={est.id}>
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
    </div>
  );
};

export default Estimates;
