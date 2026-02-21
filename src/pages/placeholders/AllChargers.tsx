import { useState, useMemo } from "react";
import { Search, ArrowUpDown, HardDrive, Crosshair, Diamond, MapPin, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

interface ChargerRecord {
  id: string;
  serialNumber: string;
  brand: string;
  model: string;
  type: "L2" | "DCFC" | "HPCD";
  campaign: string | null;
  nochPlusEnrolled: boolean;
  ticketCount: number;
  status: "Critical" | "High" | "Medium" | "Low";
  lastServiceDate: string;
  location: string;
}

const STATUS_STYLES: Record<string, string> = {
  Critical: "bg-critical text-critical-foreground",
  High: "bg-degraded text-degraded-foreground",
  Medium: "bg-medium text-medium-foreground",
  Low: "bg-optimal text-optimal-foreground",
};

const MOCK_CHARGERS: ChargerRecord[] = [
  { id: "ch1", serialNumber: "BTC-2024-00142", brand: "BTC Power", model: "GEN3 180kW", type: "DCFC", campaign: "BTC Portfolio Q1", nochPlusEnrolled: true, ticketCount: 3, status: "Medium", lastServiceDate: "2025-01-20", location: "Los Angeles, CA" },
  { id: "ch2", serialNumber: "BTC-2024-00387", brand: "BTC Power", model: "GEN3 180kW", type: "DCFC", campaign: "BTC Portfolio Q1", nochPlusEnrolled: false, ticketCount: 1, status: "Low", lastServiceDate: "2025-02-05", location: "San Diego, CA" },
  { id: "ch3", serialNumber: "TRI-2023-01205", brand: "Tritium", model: "RT175-S", type: "DCFC", campaign: "EVConnect Network", nochPlusEnrolled: true, ticketCount: 5, status: "Critical", lastServiceDate: "2024-12-10", location: "Phoenix, AZ" },
  { id: "ch4", serialNumber: "ABB-2023-00891", brand: "ABB", model: "Terra 360", type: "HPCD", campaign: null, nochPlusEnrolled: true, ticketCount: 2, status: "Low", lastServiceDate: "2025-01-30", location: "Austin, TX" },
  { id: "ch5", serialNumber: "CPI-2024-02104", brand: "ChargePoint", model: "CT4025", type: "L2", campaign: "ChargePoint Retail", nochPlusEnrolled: false, ticketCount: 0, status: "Low", lastServiceDate: "2025-02-10", location: "Seattle, WA" },
  { id: "ch6", serialNumber: "BTC-2024-00561", brand: "BTC Power", model: "GEN3 180kW", type: "DCFC", campaign: "BTC Portfolio Q1", nochPlusEnrolled: true, ticketCount: 4, status: "High", lastServiceDate: "2025-01-05", location: "Denver, CO" },
  { id: "ch7", serialNumber: "TRI-2023-01402", brand: "Tritium", model: "PKM150", type: "DCFC", campaign: null, nochPlusEnrolled: false, ticketCount: 1, status: "Medium", lastServiceDate: "2024-11-20", location: "Atlanta, GA" },
  { id: "ch8", serialNumber: "ABB-2024-01003", brand: "ABB", model: "Terra 184", type: "DCFC", campaign: "EVConnect Network", nochPlusEnrolled: true, ticketCount: 2, status: "Low", lastServiceDate: "2025-02-15", location: "Portland, OR" },
  { id: "ch9", serialNumber: "CPI-2024-02398", brand: "ChargePoint", model: "CPE250", type: "DCFC", campaign: "ChargePoint Retail", nochPlusEnrolled: true, ticketCount: 6, status: "Critical", lastServiceDate: "2024-10-30", location: "Chicago, IL" },
  { id: "ch10", serialNumber: "BTC-2024-00789", brand: "BTC Power", model: "GEN2 60kW", type: "DCFC", campaign: null, nochPlusEnrolled: false, ticketCount: 0, status: "Low", lastServiceDate: "2025-02-18", location: "Miami, FL" },
];

export default function AllChargers() {
  const [search, setSearch] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [nochFilter, setNochFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"serial" | "tickets" | "status" | "recent">("serial");

  const campaigns = useMemo(() => [...new Set(MOCK_CHARGERS.filter(c => c.campaign).map(c => c.campaign!))], []);

  const filtered = useMemo(() => {
    let result = [...MOCK_CHARGERS];
    if (campaignFilter !== "all") result = result.filter(c => c.campaign === campaignFilter);
    if (nochFilter !== "all") result = result.filter(c => nochFilter === "enrolled" ? c.nochPlusEnrolled : !c.nochPlusEnrolled);
    if (typeFilter !== "all") result = result.filter(c => c.type === typeFilter);
    if (statusFilter !== "all") result = result.filter(c => c.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c => c.serialNumber.toLowerCase().includes(q) || c.location.toLowerCase().includes(q) || c.brand.toLowerCase().includes(q));
    }
    const priorityOrder: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    result.sort((a, b) => {
      switch (sortBy) {
        case "tickets": return b.ticketCount - a.ticketCount;
        case "status": return (priorityOrder[a.status] ?? 4) - (priorityOrder[b.status] ?? 4);
        case "recent": return new Date(b.lastServiceDate).getTime() - new Date(a.lastServiceDate).getTime();
        default: return a.serialNumber.localeCompare(b.serialNumber);
      }
    });
    return result;
  }, [search, campaignFilter, nochFilter, typeFilter, statusFilter, sortBy]);

  const stats = useMemo(() => ({
    total: MOCK_CHARGERS.length,
    byCampaign: campaigns.length,
    nochPlus: MOCK_CHARGERS.filter(c => c.nochPlusEnrolled).length,
    activeTickets: MOCK_CHARGERS.reduce((s, c) => s + c.ticketCount, 0),
  }), [campaigns]);

  return (
    <div className="p-6 space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-primary"><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Total Chargers</p><p className="text-2xl font-bold text-foreground">5,487</p></CardContent></Card>
        <Card className="border-l-4 border-l-secondary"><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Campaigns</p><p className="text-2xl font-bold text-secondary">{stats.byCampaign}</p></CardContent></Card>
        <Card className="border-l-4 border-l-purple-500"><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Noch+ Enrolled</p><p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.nochPlus}</p></CardContent></Card>
        <Card className="border-l-4 border-l-critical"><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Active Tickets</p><p className="text-2xl font-bold text-critical">{stats.activeTickets}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search serial, location, brand..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={campaignFilter} onValueChange={setCampaignFilter}>
          <SelectTrigger className="w-44"><Crosshair className="h-3.5 w-3.5 mr-1" /><SelectValue placeholder="Campaign" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Campaigns</SelectItem>
            {campaigns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={nochFilter} onValueChange={setNochFilter}>
          <SelectTrigger className="w-40"><Diamond className="h-3.5 w-3.5 mr-1" /><SelectValue placeholder="Noch+" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="enrolled">Enrolled</SelectItem>
            <SelectItem value="not_enrolled">Not Enrolled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-32"><Zap className="h-3.5 w-3.5 mr-1" /><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="L2">L2</SelectItem>
            <SelectItem value="DCFC">DCFC</SelectItem>
            <SelectItem value="HPCD">HPCD</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Critical">Critical</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
          <SelectTrigger className="w-32"><ArrowUpDown className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="serial">Serial</SelectItem>
            <SelectItem value="tickets">Tickets</SelectItem>
            <SelectItem value="status">Status</SelectItem>
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
                <TableHead>Campaign</TableHead>
                <TableHead>Noch+</TableHead>
                <TableHead className="text-right">Tickets</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Service</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-mono text-sm font-medium">{c.serialNumber}</TableCell>
                  <TableCell><div className="text-sm font-medium">{c.brand}</div><div className="text-xs text-muted-foreground">{c.model}</div></TableCell>
                  <TableCell><Badge variant="outline">{c.type}</Badge></TableCell>
                  <TableCell className="text-sm">{c.campaign || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>{c.nochPlusEnrolled ? <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20" variant="outline"><Diamond className="h-3 w-3 mr-1" />Yes</Badge> : <span className="text-muted-foreground text-xs">No</span>}</TableCell>
                  <TableCell className="text-right font-medium">{c.ticketCount}</TableCell>
                  <TableCell><Badge className={STATUS_STYLES[c.status]}>{c.status}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(c.lastServiceDate), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.location}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
