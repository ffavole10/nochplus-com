import { useState, useMemo } from "react";
import { Plus, Search, ArrowUpDown, Diamond, Users, DollarSign, TrendingDown, Eye, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { NochPlusMap } from "@/components/noch-plus/NochPlusMap";

interface Subscriber {
  id: string;
  company: string;
  contactName: string;
  email: string;
  plan: "Premium" | "Standard" | "Basic";
  monthlyCost: number;
  status: "active" | "cancelled" | "expired" | "trial";
  chargerCount: number;
  submissionsCount: number;
  ticketsCreated: number;
  totalRevenue: number;
  memberSince: string;
  lat: number;
  lng: number;
  city: string;
  state: string;
}

const PLAN_STYLES: Record<string, string> = {
  Premium: "bg-primary/10 text-primary border-primary/20",
  Standard: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  Basic: "bg-muted text-muted-foreground border-border",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-optimal/10 text-optimal border-optimal/20",
  cancelled: "bg-critical/10 text-critical border-critical/20",
  expired: "bg-muted text-muted-foreground border-border",
  trial: "bg-medium/10 text-medium border-medium/20",
};

const MOCK_SUBSCRIBERS: Subscriber[] = [
  { id: "s1", company: "ChargePoint Inc.", contactName: "Sarah Chen", email: "sarah.chen@chargepoint.com", plan: "Premium", monthlyCost: 499, status: "active", chargerCount: 85, submissionsCount: 42, ticketsCreated: 18, totalRevenue: 5988, memberSince: "2024-03-01", lat: 33.4484, lng: -112.0740, city: "Phoenix", state: "AZ" },
  { id: "s2", company: "EVgo Services", contactName: "Marcus Johnson", email: "mjohnson@evgo.com", plan: "Premium", monthlyCost: 499, status: "active", chargerCount: 72, submissionsCount: 35, ticketsCreated: 14, totalRevenue: 5988, memberSince: "2024-04-15", lat: 34.0522, lng: -118.2437, city: "Los Angeles", state: "CA" },
  { id: "s3", company: "Electrify America", contactName: "Lisa Park", email: "lpark@ea.com", plan: "Standard", monthlyCost: 299, status: "active", chargerCount: 48, submissionsCount: 22, ticketsCreated: 9, totalRevenue: 2990, memberSince: "2024-06-01", lat: 37.3382, lng: -121.8863, city: "San Jose", state: "CA" },
  { id: "s4", company: "Blink Charging", contactName: "David Torres", email: "dtorres@blinkcharging.com", plan: "Standard", monthlyCost: 299, status: "active", chargerCount: 35, submissionsCount: 16, ticketsCreated: 7, totalRevenue: 2392, memberSince: "2024-07-10", lat: 25.7617, lng: -80.1918, city: "Miami", state: "FL" },
  { id: "s5", company: "FreeWire Tech", contactName: "Amy Nguyen", email: "anguyen@freewire.com", plan: "Basic", monthlyCost: 149, status: "active", chargerCount: 20, submissionsCount: 8, ticketsCreated: 3, totalRevenue: 1192, memberSince: "2024-08-20", lat: 47.6062, lng: -122.3321, city: "Seattle", state: "WA" },
  { id: "s6", company: "Volta Charging", contactName: "Jessica Rivera", email: "jrivera@volta.com", plan: "Premium", monthlyCost: 499, status: "active", chargerCount: 65, submissionsCount: 30, ticketsCreated: 12, totalRevenue: 4491, memberSince: "2024-05-01", lat: 40.7128, lng: -74.0060, city: "New York", state: "NY" },
  { id: "s7", company: "SemaConnect", contactName: "Robert Kim", email: "rkim@sema.com", plan: "Basic", monthlyCost: 149, status: "cancelled", chargerCount: 15, submissionsCount: 5, ticketsCreated: 2, totalRevenue: 894, memberSince: "2024-06-15", lat: 41.8781, lng: -87.6298, city: "Chicago", state: "IL" },
  { id: "s8", company: "TurnOnGreen", contactName: "Michael Scott", email: "mscott@turnongreen.com", plan: "Standard", monthlyCost: 299, status: "trial", chargerCount: 28, submissionsCount: 3, ticketsCreated: 1, totalRevenue: 0, memberSince: "2025-02-01", lat: 29.7604, lng: -95.3698, city: "Houston", state: "TX" },
  { id: "s9", company: "Wallbox NA", contactName: "Elena Vasquez", email: "evasquez@wallbox.com", plan: "Basic", monthlyCost: 149, status: "expired", chargerCount: 12, submissionsCount: 4, ticketsCreated: 1, totalRevenue: 596, memberSince: "2024-05-20", lat: 33.7490, lng: -84.3880, city: "Atlanta", state: "GA" },
];

export default function NochPlusDashboard() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"company" | "revenue" | "chargers" | "recent">("company");
  const [formOpen, setFormOpen] = useState(false);

  const filtered = useMemo(() => {
    let result = [...MOCK_SUBSCRIBERS];
    if (statusFilter !== "all") result = result.filter(s => s.status === statusFilter);
    if (planFilter !== "all") result = result.filter(s => s.plan === planFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s => s.company.toLowerCase().includes(q) || s.contactName.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      switch (sortBy) {
        case "revenue": return b.totalRevenue - a.totalRevenue;
        case "chargers": return b.chargerCount - a.chargerCount;
        case "recent": return new Date(b.memberSince).getTime() - new Date(a.memberSince).getTime();
        default: return a.company.localeCompare(b.company);
      }
    });
    return result;
  }, [search, statusFilter, planFilter, sortBy]);

  const stats = useMemo(() => ({
    activeSubscribers: MOCK_SUBSCRIBERS.filter(s => s.status === "active").length,
    totalChargers: MOCK_SUBSCRIBERS.reduce((s, c) => s + c.chargerCount, 0),
    monthlyRevenue: MOCK_SUBSCRIBERS.filter(s => s.status === "active").reduce((s, c) => s + c.monthlyCost, 0),
    churnRate: 2.1,
  }), []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-end">
        <Button onClick={() => setFormOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Add Subscriber</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-primary"><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground flex items-center justify-center gap-1"><Users className="h-3.5 w-3.5" />Active Subscribers</p><p className="text-2xl font-bold text-foreground">{stats.activeSubscribers}</p></CardContent></Card>
        <Card className="border-l-4 border-l-purple-500"><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground flex items-center justify-center gap-1"><Diamond className="h-3.5 w-3.5" />Enrolled Chargers</p><p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.totalChargers}</p></CardContent></Card>
        <Card className="border-l-4 border-l-optimal"><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground flex items-center justify-center gap-1"><DollarSign className="h-3.5 w-3.5" />Monthly Revenue</p><p className="text-2xl font-bold text-optimal">${stats.monthlyRevenue.toLocaleString()}</p></CardContent></Card>
        <Card className="border-l-4 border-l-medium"><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground flex items-center justify-center gap-1"><TrendingDown className="h-3.5 w-3.5" />Churn Rate</p><p className="text-2xl font-bold text-medium">{stats.churnRate}%</p></CardContent></Card>
      </div>

      {/* Map */}
      <NochPlusMap subscribers={MOCK_SUBSCRIBERS} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search company or contact..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
            <TabsTrigger value="expired">Expired</TabsTrigger>
            <TabsTrigger value="trial">Trial</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Plan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="Premium">Premium</SelectItem>
            <SelectItem value="Standard">Standard</SelectItem>
            <SelectItem value="Basic">Basic</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
          <SelectTrigger className="w-36"><ArrowUpDown className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="company">Company</SelectItem>
            <SelectItem value="revenue">Revenue</SelectItem>
            <SelectItem value="chargers">Chargers</SelectItem>
            <SelectItem value="recent">Recent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Subscriber List */}
      <div className="grid gap-3">
        {filtered.map(s => (
          <Card key={s.id} className="transition-all hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-foreground">{s.company}</span>
                    <Badge variant="outline" className={PLAN_STYLES[s.plan]}>{s.plan}</Badge>
                    <Badge variant="outline" className={STATUS_STYLES[s.status]}>{s.status}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    <span className="font-medium text-foreground">{s.contactName}</span>
                    <span>{s.email}</span>
                    <span className="text-xs">${s.monthlyCost}/mo</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    <span><strong className="text-foreground">{s.chargerCount}</strong> chargers</span>
                    <span><strong className="text-foreground">{s.submissionsCount}</strong> submissions</span>
                    <span><strong className="text-foreground">{s.ticketsCreated}</strong> tickets</span>
                    <span>Revenue: <strong className="text-foreground">${s.totalRevenue.toLocaleString()}</strong></span>
                    <span>Since {format(new Date(s.memberSince), "MMM yyyy")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs"><Eye className="h-3.5 w-3.5" />View</Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs"><Settings2 className="h-3.5 w-3.5" />Manage</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Subscriber Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Subscriber</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Company Name *</Label><Input placeholder="Company name" /></div>
            <div><Label>Contact Name *</Label><Input placeholder="Primary contact" /></div>
            <div><Label>Email *</Label><Input type="email" placeholder="email@company.com" /></div>
            <div>
              <Label>Plan *</Label>
              <Select defaultValue="Standard">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Premium">Premium — $499/mo</SelectItem>
                  <SelectItem value="Standard">Standard — $299/mo</SelectItem>
                  <SelectItem value="Basic">Basic — $149/mo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Start Date</Label><Input type="date" /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button onClick={() => { toast.success("Subscriber added"); setFormOpen(false); }}>Add Subscriber</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
