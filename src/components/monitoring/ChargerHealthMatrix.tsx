import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LayoutGrid, List, CheckCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props { timeRange: string; customer: string; }

// MOCK — replace with live OCPP data when integration is complete
const MOCK_CHARGERS = [
  { id: "1", serial: "NAS-DC-042", customer: "Fontainebleau", location: "Las Vegas", brand: "BTC Power", type: "DC Fast", cvs: 82, sessionRate: 94.2, thermal: "Normal", connector: "Good", firmware: "Current", comms: "Stable", lastError: "2h ago", predictedDays: 120, maxStatus: "Active" },
  { id: "2", serial: "FBL-AC-017", customer: "Fontainebleau", location: "Miami Beach", brand: "ChargePoint", type: "AC Level 2", cvs: 45, sessionRate: 67.1, thermal: "Elevated", connector: "Worn", firmware: "Outdated", comms: "Unstable", lastError: "20m ago", predictedDays: 18, maxStatus: "Monitoring" },
  { id: "3", serial: "HLT-DC-003", customer: "Hilton Hotels", location: "New York", brand: "ABB", type: "DC Fast", cvs: 91, sessionRate: 98.5, thermal: "Normal", connector: "Excellent", firmware: "Current", comms: "Stable", lastError: "3d ago", predictedDays: 200, maxStatus: "Idle" },
  { id: "4", serial: "MRT-AC-008", customer: "Marriott Corp", location: "Chicago", brand: "Eaton", type: "AC Level 2", cvs: 33, sessionRate: 52.3, thermal: "High", connector: "Poor", firmware: "Outdated", comms: "Degraded", lastError: "5m ago", predictedDays: 5, maxStatus: "Active" },
  { id: "5", serial: "NAS-DC-019", customer: "Fontainebleau", location: "Las Vegas", brand: "BTC Power", type: "DC Fast", cvs: 72, sessionRate: 88.0, thermal: "Normal", connector: "Good", firmware: "Current", comms: "Stable", lastError: "1h ago", predictedDays: 65, maxStatus: "Active" },
];

function cvsColor(cvs: number) {
  if (cvs >= 90) return "text-teal-500";
  if (cvs >= 75) return "text-emerald-500";
  if (cvs >= 60) return "text-amber-500";
  if (cvs >= 40) return "text-orange-500";
  return "text-red-500";
}

function cvsLabel(cvs: number) {
  if (cvs >= 90) return "Excellent";
  if (cvs >= 75) return "Good";
  if (cvs >= 60) return "Fair";
  if (cvs >= 40) return "Poor";
  return "Critical";
}

function failureColor(days: number) {
  if (days > 90) return "text-emerald-500";
  if (days > 30) return "text-amber-500";
  if (days > 7) return "text-orange-500";
  return "text-red-500";
}

function failureLabel(days: number) {
  if (days > 90) return `>${days}d`;
  return `~${days}d`;
}

function statusIcon(val: string) {
  if (val === "Normal" || val === "Good" || val === "Excellent" || val === "Current" || val === "Stable") return <CheckCircle className="h-3 w-3 text-emerald-500 inline ml-1" />;
  return <AlertTriangle className="h-3 w-3 text-amber-500 inline ml-1" />;
}

export function ChargerHealthMatrix({ timeRange, customer }: Props) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const sorted = [...MOCK_CHARGERS].sort((a, b) => a.cvs - b.cvs);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">Charger Health Matrix</CardTitle>
          <CardDescription>Component Vitality Score across all connected chargers</CardDescription>
        </div>
        <div className="flex items-center gap-1 border border-border rounded-md">
          <Button variant={view === "grid" ? "default" : "ghost"} size="sm" className="h-7 px-2" onClick={() => setView("grid")}><LayoutGrid className="h-3.5 w-3.5" /></Button>
          <Button variant={view === "list" ? "default" : "ghost"} size="sm" className="h-7 px-2" onClick={() => setView("list")}><List className="h-3.5 w-3.5" /></Button>
        </div>
      </CardHeader>
      <CardContent>
        {view === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {sorted.map(c => (
              <Card key={c.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={cn("text-3xl font-bold", cvsColor(c.cvs))}>{c.cvs}</span>
                  <Badge variant="outline" className={cn("text-[10px]", cvsColor(c.cvs))}>{cvsLabel(c.cvs)}</Badge>
                </div>
                <Progress value={c.cvs} className="h-1.5" />
                <div>
                  <div className="text-sm font-medium text-foreground">{c.location} · {c.serial}</div>
                  <div className="text-xs text-muted-foreground">{c.brand} {c.type}</div>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>Session Rate: <strong className="text-foreground">{c.sessionRate}%</strong></span>
                  <span>Thermal: {c.thermal}{statusIcon(c.thermal)}</span>
                  <span>Connector: {c.connector}{statusIcon(c.connector)}</span>
                  <span>Firmware: {c.firmware}{statusIcon(c.firmware)}</span>
                  <span>Comms: {c.comms}{statusIcon(c.comms)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border">
                  <span>Last Error: {c.lastError}</span>
                  <Badge variant="outline" className="text-[10px]">Max: {c.maxStatus}</Badge>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Charger</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>CVS</TableHead>
                <TableHead>Session Rate</TableHead>
                <TableHead>Last Error</TableHead>
                <TableHead>Predicted Failure</TableHead>
                <TableHead>Max Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.serial}</TableCell>
                  <TableCell>{c.customer}</TableCell>
                  <TableCell><span className={cn("font-bold", cvsColor(c.cvs))}>{c.cvs}</span></TableCell>
                  <TableCell>{c.sessionRate}%</TableCell>
                  <TableCell>{c.lastError}</TableCell>
                  <TableCell><span className={failureColor(c.predictedDays)}>{failureLabel(c.predictedDays)}</span></TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{c.maxStatus}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
