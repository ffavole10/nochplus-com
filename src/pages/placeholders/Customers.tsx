import { useState, useMemo } from "react";
import { Plus, Users, Search, ArrowUpDown, Mail, Phone, DollarSign, Ticket, Eye, X, Building2, MapPin, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format } from "date-fns";

interface Customer {
  id: string;
  company: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  ticketCount: number;
  totalRevenue: number;
  lastServiceDate: string;
  status: "active" | "inactive";
  createdAt: string;
}

const MOCK_CUSTOMERS: Customer[] = [
  { id: "c1", company: "ChargePoint Inc.", contactName: "Sarah Chen", email: "sarah.chen@chargepoint.com", phone: "(415) 555-0101", address: "240 E Hacienda Ave, Campbell, CA 95008", notes: "Premium partner. Quarterly maintenance.", ticketCount: 34, totalRevenue: 127500, lastServiceDate: "2025-01-15", status: "active", createdAt: "2024-03-10" },
  { id: "c2", company: "EVgo Services", contactName: "Marcus Johnson", email: "mjohnson@evgo.com", phone: "(213) 555-0202", address: "11835 W Olympic Blvd, Los Angeles, CA 90064", notes: "West coast fleet.", ticketCount: 28, totalRevenue: 98200, lastServiceDate: "2025-02-01", status: "active", createdAt: "2024-04-22" },
  { id: "c3", company: "Electrify America", contactName: "Lisa Park", email: "lpark@ea.com", phone: "(703) 555-0303", address: "1950 Opportunity Way, Reston, VA 20190", notes: "", ticketCount: 19, totalRevenue: 72000, lastServiceDate: "2025-01-28", status: "active", createdAt: "2024-06-15" },
  { id: "c4", company: "Blink Charging", contactName: "David Torres", email: "dtorres@blinkcharging.com", phone: "(305) 555-0404", address: "605 Lincoln Rd, Miami Beach, FL 33139", notes: "Expanding network Q2 2025.", ticketCount: 12, totalRevenue: 45800, lastServiceDate: "2024-12-20", status: "active", createdAt: "2024-07-01" },
  { id: "c5", company: "FreeWire Technologies", contactName: "Amy Nguyen", email: "anguyen@freewire.com", phone: "(510) 555-0505", address: "1933 Davis St, San Leandro, CA 94577", notes: "Battery-integrated chargers. Special handling.", ticketCount: 8, totalRevenue: 31200, lastServiceDate: "2024-11-15", status: "active", createdAt: "2024-08-10" },
  { id: "c6", company: "SemaConnect", contactName: "Robert Kim", email: "rkim@semaconnect.com", phone: "(301) 555-0606", address: "4961 Tesla Dr, Bowie, MD 20715", notes: "", ticketCount: 3, totalRevenue: 9800, lastServiceDate: "2024-09-30", status: "inactive", createdAt: "2024-05-20" },
  { id: "c7", company: "Volta Charging", contactName: "Jessica Rivera", email: "jrivera@voltacharging.com", phone: "(415) 555-0707", address: "155 De Haro St, San Francisco, CA 94103", notes: "Media display chargers — handle screens carefully.", ticketCount: 15, totalRevenue: 56700, lastServiceDate: "2025-01-10", status: "active", createdAt: "2024-04-05" },
];

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "tickets" | "revenue" | "recent">("name");
  const [formOpen, setFormOpen] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);

  // Form state
  const [form, setForm] = useState({ company: "", contactName: "", email: "", phone: "", address: "", notes: "" });

  const filtered = useMemo(() => {
    let result = [...customers];
    if (statusFilter !== "all") result = result.filter(c => c.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c => c.company.toLowerCase().includes(q) || c.contactName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      switch (sortBy) {
        case "tickets": return b.ticketCount - a.ticketCount;
        case "revenue": return b.totalRevenue - a.totalRevenue;
        case "recent": return new Date(b.lastServiceDate).getTime() - new Date(a.lastServiceDate).getTime();
        default: return a.company.localeCompare(b.company);
      }
    });
    return result;
  }, [customers, search, statusFilter, sortBy]);

  const stats = useMemo(() => ({
    total: customers.length,
    active: customers.filter(c => c.status === "active").length,
    totalRevenue: customers.reduce((s, c) => s + c.totalRevenue, 0),
    totalTickets: customers.reduce((s, c) => s + c.ticketCount, 0),
  }), [customers]);

  const handleAdd = () => {
    if (!form.company || !form.contactName || !form.email) { toast.error("Fill required fields"); return; }
    const newCustomer: Customer = {
      id: `c-${Date.now()}`, ...form, ticketCount: 0, totalRevenue: 0,
      lastServiceDate: "", status: "active", createdAt: new Date().toISOString(),
    };
    setCustomers(prev => [newCustomer, ...prev]);
    toast.success(`${form.company} added`);
    setFormOpen(false);
    setForm({ company: "", contactName: "", email: "", phone: "", address: "", notes: "" });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end">
        <Button onClick={() => setFormOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Add Customer</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-primary"><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Total Customers</p><p className="text-2xl font-bold text-foreground">{stats.total}</p></CardContent></Card>
        <Card className="border-l-4 border-l-optimal"><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Active</p><p className="text-2xl font-bold text-optimal">{stats.active}</p></CardContent></Card>
        <Card className="border-l-4 border-l-secondary"><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Total Tickets</p><p className="text-2xl font-bold text-secondary">{stats.totalTickets}</p></CardContent></Card>
        <Card className="border-l-4 border-l-medium"><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Total Revenue</p><p className="text-2xl font-bold text-medium">${stats.totalRevenue.toLocaleString()}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, company, email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="active">Active</TabsTrigger><TabsTrigger value="inactive">Inactive</TabsTrigger></TabsList>
        </Tabs>
        <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
          <SelectTrigger className="w-36"><ArrowUpDown className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="tickets">Tickets</SelectItem>
            <SelectItem value="revenue">Revenue</SelectItem>
            <SelectItem value="recent">Recent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[40vh] text-muted-foreground gap-4">
          <Users className="h-16 w-16 text-primary/40" /><p className="text-sm">No customers found.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(c => (
            <Card key={c.id} className="transition-all hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground">{c.company}</span>
                      <Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <span className="font-medium text-foreground">{c.contactName}</span>
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm shrink-0">
                    <div className="text-center"><p className="text-xs text-muted-foreground">Tickets</p><p className="font-bold text-foreground">{c.ticketCount}</p></div>
                    <div className="text-center"><p className="text-xs text-muted-foreground">Revenue</p><p className="font-bold text-foreground">${c.totalRevenue.toLocaleString()}</p></div>
                    <div className="text-center"><p className="text-xs text-muted-foreground">Last Service</p><p className="font-medium text-foreground">{c.lastServiceDate ? format(new Date(c.lastServiceDate), "MMM d, yyyy") : "—"}</p></div>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setDetailCustomer(c)}><Eye className="h-3.5 w-3.5" />View</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Customer Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Customer</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Company Name *</Label><Input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} /></div>
            <div><Label>Contact Name *</Label><Input value={form.contactName} onChange={e => setForm(p => ({ ...p, contactName: e.target.value }))} /></div>
            <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
            <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd}>Add Customer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Detail Modal */}
      <Dialog open={!!detailCustomer} onOpenChange={o => { if (!o) setDetailCustomer(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailCustomer && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />{detailCustomer.company}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4 bg-muted/30 rounded-lg p-4 border border-border/50">
                  <div><p className="text-xs text-muted-foreground">Contact</p><p className="text-sm font-medium">{detailCustomer.contactName}</p></div>
                  <div><p className="text-xs text-muted-foreground">Email</p><p className="text-sm font-medium">{detailCustomer.email}</p></div>
                  <div><p className="text-xs text-muted-foreground">Phone</p><p className="text-sm font-medium">{detailCustomer.phone}</p></div>
                  <div><p className="text-xs text-muted-foreground">Address</p><p className="text-sm font-medium">{detailCustomer.address}</p></div>
                </div>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Tickets</p><p className="text-2xl font-bold">{detailCustomer.ticketCount}</p></CardContent></Card>
                  <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Revenue</p><p className="text-2xl font-bold text-primary">${detailCustomer.totalRevenue.toLocaleString()}</p></CardContent></Card>
                  <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Last Service</p><p className="text-lg font-bold">{detailCustomer.lastServiceDate ? format(new Date(detailCustomer.lastServiceDate), "MMM d") : "—"}</p></CardContent></Card>
                </div>
                {/* Notes */}
                {detailCustomer.notes && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-1"><StickyNote className="h-4 w-4" />Notes</h4>
                    <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 border border-border/50">{detailCustomer.notes}</p>
                  </div>
                )}
                {/* Service History Placeholder */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Service History</h4>
                  <p className="text-sm text-muted-foreground">Service history timeline will appear here when connected to live data.</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
