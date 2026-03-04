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
  type: "AC | Level 2" | "DC | Level 3";
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

const CHARGERS: ChargerRecord[] = [];

export default function AllChargers() {
  const [search, setSearch] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [nochFilter, setNochFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"serial" | "tickets" | "status" | "recent">("serial");

  const campaigns = useMemo(() => [...new Set(CHARGERS.filter(c => c.campaign).map(c => c.campaign!))], []);

  const filtered = useMemo(() => {
    let result = [...CHARGERS];
    if (campaignFilter !== "all") result = result.filter(c => c.campaign === campaignFilter);
    if (nochFilter !== "all") result = result.filter(c => nochFilter === "enrolled" ? c.nochPlusEnrolled : !c.nochPlusEnrolled);
    if (typeFilter !== "all") result = result.filter(c => c.type === typeFilter);
    if (statusFilter !== "all") result = result.filter(c => c.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c => c.serialNumber.toLowerCase().includes(q) || c.location.toLowerCase().includes(q) || c.brand.toLowerCase().includes(q));
    }
    return result;
  }, [search, campaignFilter, nochFilter, typeFilter, statusFilter, sortBy]);

  const stats = useMemo(() => ({
    total: CHARGERS.length,
    byCampaign: campaigns.length,
    nochPlus: CHARGERS.filter(c => c.nochPlusEnrolled).length,
    activeTickets: CHARGERS.reduce((s, c) => s + c.ticketCount, 0),
  }), [campaigns]);

  return (
    <div className="p-6 space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-primary"><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Total Chargers</p><p className="text-2xl font-bold text-foreground">{stats.total}</p></CardContent></Card>
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
      </div>

      {/* Table or Empty State */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <HardDrive className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <h3 className="text-lg font-semibold text-foreground mb-1">No Chargers</h3>
              <p className="text-sm text-muted-foreground">Charger records will appear here once campaigns are uploaded or chargers are registered.</p>
            </div>
          ) : (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
