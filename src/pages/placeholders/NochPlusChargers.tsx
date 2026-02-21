import { useState, useMemo } from "react";
import { Search, ArrowUpDown, Diamond, HardDrive, Users, Ticket, ClipboardCheck, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";

interface NochPlusCharger {
  id: string;
  serialNumber: string;
  brand: string;
  model: string;
  type: "L2" | "DCFC" | "HPCD";
  subscriber: string;
  enrollmentDate: string;
  assessmentCount: number;
  ticketCount: number;
  status: "active" | "inactive";
  lastAssessmentDate: string;
}

const MOCK_NOCH_CHARGERS: NochPlusCharger[] = [
  { id: "nc1", serialNumber: "BTC-2024-00142", brand: "BTC Power", model: "GEN3 180kW", type: "DCFC", subscriber: "ChargePoint Inc.", enrollmentDate: "2024-04-01", assessmentCount: 8, ticketCount: 3, status: "active", lastAssessmentDate: "2025-02-10" },
  { id: "nc2", serialNumber: "TRI-2023-01205", brand: "Tritium", model: "RT175-S", type: "DCFC", subscriber: "EVgo Services", enrollmentDate: "2024-05-15", assessmentCount: 6, ticketCount: 5, status: "active", lastAssessmentDate: "2025-01-28" },
  { id: "nc3", serialNumber: "ABB-2023-00891", brand: "ABB", model: "Terra 360", type: "HPCD", subscriber: "ChargePoint Inc.", enrollmentDate: "2024-04-01", assessmentCount: 7, ticketCount: 2, status: "active", lastAssessmentDate: "2025-02-05" },
  { id: "nc4", serialNumber: "BTC-2024-00561", brand: "BTC Power", model: "GEN3 180kW", type: "DCFC", subscriber: "Electrify America", enrollmentDate: "2024-07-01", assessmentCount: 4, ticketCount: 4, status: "active", lastAssessmentDate: "2025-01-15" },
  { id: "nc5", serialNumber: "ABB-2024-01003", brand: "ABB", model: "Terra 184", type: "DCFC", subscriber: "EVgo Services", enrollmentDate: "2024-06-10", assessmentCount: 5, ticketCount: 2, status: "active", lastAssessmentDate: "2025-02-15" },
  { id: "nc6", serialNumber: "CPI-2024-02398", brand: "ChargePoint", model: "CPE250", type: "DCFC", subscriber: "Volta Charging", enrollmentDate: "2024-05-20", assessmentCount: 9, ticketCount: 6, status: "active", lastAssessmentDate: "2025-02-18" },
  { id: "nc7", serialNumber: "BTC-2024-00289", brand: "BTC Power", model: "GEN2 60kW", type: "DCFC", subscriber: "FreeWire Tech", enrollmentDate: "2024-09-01", assessmentCount: 3, ticketCount: 1, status: "active", lastAssessmentDate: "2025-01-20" },
  { id: "nc8", serialNumber: "TRI-2023-01150", brand: "Tritium", model: "PKM150", type: "DCFC", subscriber: "SemaConnect", enrollmentDate: "2024-07-15", assessmentCount: 2, ticketCount: 1, status: "inactive", lastAssessmentDate: "2024-11-30" },
  { id: "nc9", serialNumber: "CPI-2024-02055", brand: "ChargePoint", model: "CT4025", type: "L2", subscriber: "Blink Charging", enrollmentDate: "2024-08-01", assessmentCount: 4, ticketCount: 2, status: "active", lastAssessmentDate: "2025-02-08" },
];

export default function NochPlusChargers() {
  const [search, setSearch] = useState("");
  const [subscriberFilter, setSubscriberFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"serial" | "assessments" | "tickets" | "recent">("serial");
  const [detailCharger, setDetailCharger] = useState<NochPlusCharger | null>(null);

  const subscribers = useMemo(() => [...new Set(MOCK_NOCH_CHARGERS.map(c => c.subscriber))], []);

  const filtered = useMemo(() => {
    let result = [...MOCK_NOCH_CHARGERS];
    if (subscriberFilter !== "all") result = result.filter(c => c.subscriber === subscriberFilter);
    if (statusFilter !== "all") result = result.filter(c => c.status === statusFilter);
    if (typeFilter !== "all") result = result.filter(c => c.type === typeFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c => c.serialNumber.toLowerCase().includes(q) || c.subscriber.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      switch (sortBy) {
        case "assessments": return b.assessmentCount - a.assessmentCount;
        case "tickets": return b.ticketCount - a.ticketCount;
        case "recent": return new Date(b.lastAssessmentDate).getTime() - new Date(a.lastAssessmentDate).getTime();
        default: return a.serialNumber.localeCompare(b.serialNumber);
      }
    });
    return result;
  }, [search, subscriberFilter, statusFilter, typeFilter, sortBy]);

  const stats = useMemo(() => ({
    totalEnrolled: MOCK_NOCH_CHARGERS.length,
    subscribers: subscribers.length,
    assessmentsThisMonth: 156,
    activeTickets: MOCK_NOCH_CHARGERS.reduce((s, c) => s + c.ticketCount, 0),
  }), [subscribers]);

  return (
    <div className="p-6 space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-purple-500"><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground flex items-center justify-center gap-1"><HardDrive className="h-3.5 w-3.5" />Enrolled Chargers</p><p className="text-2xl font-bold text-foreground">523</p></CardContent></Card>
        <Card className="border-l-4 border-l-primary"><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground flex items-center justify-center gap-1"><Users className="h-3.5 w-3.5" />Subscribers</p><p className="text-2xl font-bold text-primary">{stats.subscribers}</p></CardContent></Card>
        <Card className="border-l-4 border-l-optimal"><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground flex items-center justify-center gap-1"><ClipboardCheck className="h-3.5 w-3.5" />Assessments (Month)</p><p className="text-2xl font-bold text-optimal">{stats.assessmentsThisMonth}</p></CardContent></Card>
        <Card className="border-l-4 border-l-critical"><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground flex items-center justify-center gap-1"><Ticket className="h-3.5 w-3.5" />Active Tickets</p><p className="text-2xl font-bold text-critical">{stats.activeTickets}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search serial or subscriber..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={subscriberFilter} onValueChange={setSubscriberFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Subscriber" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subscribers</SelectItem>
            {subscribers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="L2">L2</SelectItem>
            <SelectItem value="DCFC">DCFC</SelectItem>
            <SelectItem value="HPCD">HPCD</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
          <SelectTrigger className="w-36"><ArrowUpDown className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="serial">Serial</SelectItem>
            <SelectItem value="assessments">Assessments</SelectItem>
            <SelectItem value="tickets">Tickets</SelectItem>
            <SelectItem value="recent">Recent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serial Number</TableHead>
                <TableHead>Brand / Model</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Subscriber</TableHead>
                <TableHead>Enrolled</TableHead>
                <TableHead className="text-right">Assessments</TableHead>
                <TableHead className="text-right">Tickets</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Assessment</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailCharger(c)}>
                  <TableCell className="font-mono text-sm font-medium">{c.serialNumber}</TableCell>
                  <TableCell><div className="text-sm font-medium">{c.brand}</div><div className="text-xs text-muted-foreground">{c.model}</div></TableCell>
                  <TableCell><Badge variant="outline">{c.type}</Badge></TableCell>
                  <TableCell className="text-sm">{c.subscriber}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(c.enrollmentDate), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right font-medium">{c.assessmentCount}</TableCell>
                  <TableCell className="text-right font-medium">{c.ticketCount}</TableCell>
                  <TableCell><Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(c.lastAssessmentDate), "MMM d, yyyy")}</TableCell>
                  <TableCell><Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!detailCharger} onOpenChange={o => { if (!o) setDetailCharger(null); }}>
        <DialogContent className="max-w-2xl">
          {detailCharger && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Diamond className="h-5 w-5 text-purple-500" />{detailCharger.serialNumber}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/30 rounded-lg p-4 border border-border/50">
                  <div><p className="text-xs text-muted-foreground">Brand / Model</p><p className="text-sm font-medium">{detailCharger.brand} {detailCharger.model}</p></div>
                  <div><p className="text-xs text-muted-foreground">Type</p><p className="text-sm font-medium">{detailCharger.type}</p></div>
                  <div><p className="text-xs text-muted-foreground">Subscriber</p><p className="text-sm font-medium">{detailCharger.subscriber}</p></div>
                  <div><p className="text-xs text-muted-foreground">Enrolled</p><p className="text-sm font-medium">{format(new Date(detailCharger.enrollmentDate), "MMM d, yyyy")}</p></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Assessments</p><p className="text-2xl font-bold">{detailCharger.assessmentCount}</p></CardContent></Card>
                  <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Tickets</p><p className="text-2xl font-bold">{detailCharger.ticketCount}</p></CardContent></Card>
                  <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Last Assessment</p><p className="text-lg font-bold">{format(new Date(detailCharger.lastAssessmentDate), "MMM d")}</p></CardContent></Card>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-2">Assessment History</h4>
                  <p className="text-sm text-muted-foreground">Assessment history will appear here when connected to live data.</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
