import { useState, useMemo } from "react";
import { Search, ArrowUpDown, Eye, Settings2, Plus } from "lucide-react";
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

interface Member {
  id: string;
  company: string;
  contactName: string;
  email: string;
  phone: string;
  plan: "Premium" | "Standard" | "Basic";
  monthlyCost: number;
  status: "active" | "cancelled" | "expired" | "trial";
  chargerCount: number;
  submissionsCount: number;
  ticketsCreated: number;
  totalRevenue: number;
  memberSince: string;
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

const MOCK_MEMBERS: Member[] = [
  { id: "m1", company: "ChargePoint Inc.", contactName: "Sarah Chen", email: "sarah.chen@chargepoint.com", phone: "(408) 555-0101", plan: "Premium", monthlyCost: 499, status: "active", chargerCount: 85, submissionsCount: 42, ticketsCreated: 18, totalRevenue: 5988, memberSince: "2024-03-01", city: "Phoenix", state: "AZ" },
  { id: "m2", company: "EVgo Services", contactName: "Marcus Johnson", email: "mjohnson@evgo.com", phone: "(213) 555-0202", plan: "Premium", monthlyCost: 499, status: "active", chargerCount: 72, submissionsCount: 35, ticketsCreated: 14, totalRevenue: 5988, memberSince: "2024-04-15", city: "Los Angeles", state: "CA" },
  { id: "m3", company: "Electrify America", contactName: "Lisa Park", email: "lpark@ea.com", phone: "(408) 555-0303", plan: "Standard", monthlyCost: 299, status: "active", chargerCount: 48, submissionsCount: 22, ticketsCreated: 9, totalRevenue: 2990, memberSince: "2024-06-01", city: "San Jose", state: "CA" },
  { id: "m4", company: "Blink Charging", contactName: "David Torres", email: "dtorres@blinkcharging.com", phone: "(305) 555-0404", plan: "Standard", monthlyCost: 299, status: "active", chargerCount: 35, submissionsCount: 16, ticketsCreated: 7, totalRevenue: 2392, memberSince: "2024-07-10", city: "Miami", state: "FL" },
  { id: "m5", company: "FreeWire Tech", contactName: "Amy Nguyen", email: "anguyen@freewire.com", phone: "(206) 555-0505", plan: "Basic", monthlyCost: 149, status: "active", chargerCount: 20, submissionsCount: 8, ticketsCreated: 3, totalRevenue: 1192, memberSince: "2024-08-20", city: "Seattle", state: "WA" },
  { id: "m6", company: "Volta Charging", contactName: "Jessica Rivera", email: "jrivera@volta.com", phone: "(212) 555-0606", plan: "Premium", monthlyCost: 499, status: "active", chargerCount: 65, submissionsCount: 30, ticketsCreated: 12, totalRevenue: 4491, memberSince: "2024-05-01", city: "New York", state: "NY" },
  { id: "m7", company: "SemaConnect", contactName: "Robert Kim", email: "rkim@sema.com", phone: "(312) 555-0707", plan: "Basic", monthlyCost: 149, status: "cancelled", chargerCount: 15, submissionsCount: 5, ticketsCreated: 2, totalRevenue: 894, memberSince: "2024-06-15", city: "Chicago", state: "IL" },
  { id: "m8", company: "TurnOnGreen", contactName: "Michael Scott", email: "mscott@turnongreen.com", phone: "(713) 555-0808", plan: "Standard", monthlyCost: 299, status: "trial", chargerCount: 28, submissionsCount: 3, ticketsCreated: 1, totalRevenue: 0, memberSince: "2025-02-01", city: "Houston", state: "TX" },
  { id: "m9", company: "Wallbox NA", contactName: "Elena Vasquez", email: "evasquez@wallbox.com", phone: "(404) 555-0909", plan: "Basic", monthlyCost: 149, status: "expired", chargerCount: 12, submissionsCount: 4, ticketsCreated: 1, totalRevenue: 596, memberSince: "2024-05-20", city: "Atlanta", state: "GA" },
];

export default function NochPlusMembers() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"company" | "revenue" | "chargers" | "recent">("company");
  const [formOpen, setFormOpen] = useState(false);

  const filtered = useMemo(() => {
    let result = [...MOCK_MEMBERS];
    if (statusFilter !== "all") result = result.filter(m => m.status === statusFilter);
    if (planFilter !== "all") result = result.filter(m => m.plan === planFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(m => m.company.toLowerCase().includes(q) || m.contactName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Members</h1>
          <p className="text-sm text-muted-foreground">{MOCK_MEMBERS.length} total members</p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Add Member</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search company, contact, or email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
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

      {/* Member List */}
      <div className="grid gap-3">
        {filtered.map(m => (
          <Card key={m.id} className="transition-all hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-foreground">{m.company}</span>
                    <Badge variant="outline" className={PLAN_STYLES[m.plan]}>{m.plan}</Badge>
                    <Badge variant="outline" className={STATUS_STYLES[m.status]}>{m.status}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    <span className="font-medium text-foreground">{m.contactName}</span>
                    <span>{m.email}</span>
                    <span>{m.phone}</span>
                    <span className="text-xs">{m.city}, {m.state}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    <span><strong className="text-foreground">{m.chargerCount}</strong> chargers</span>
                    <span><strong className="text-foreground">{m.submissionsCount}</strong> submissions</span>
                    <span><strong className="text-foreground">{m.ticketsCreated}</strong> tickets</span>
                    <span>Revenue: <strong className="text-foreground">${m.totalRevenue.toLocaleString()}</strong></span>
                    <span>${m.monthlyCost}/mo</span>
                    <span>Since {format(new Date(m.memberSince), "MMM yyyy")}</span>
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
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No members match your filters</p>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Member</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Company Name *</Label><Input placeholder="Company name" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Contact Name *</Label><Input placeholder="Primary contact" /></div>
              <div><Label>Phone</Label><Input placeholder="(555) 000-0000" /></div>
            </div>
            <div><Label>Email *</Label><Input type="email" placeholder="email@company.com" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>City</Label><Input placeholder="City" /></div>
              <div><Label>State</Label><Input placeholder="State" /></div>
            </div>
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
              <Button onClick={() => { toast.success("Member added"); setFormOpen(false); }}>Add Member</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
