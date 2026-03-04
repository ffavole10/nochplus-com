import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Users, Search, ArrowUpDown, Mail, Phone, DollarSign, Ticket, Eye, X, Building2, MapPin, StickyNote, FileText, CreditCard, ExternalLink, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format } from "date-fns";
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer, type Customer } from "@/hooks/useCustomers";
import { useRateCards } from "@/hooks/useQuotingSettings";
import { useCustomerRateSheetsList } from "@/hooks/useCustomerRateSheets";

export default function Customers() {
  const { data: customers = [], isLoading } = useCustomers();
  const { data: rateCards = [] } = useRateCards();
  const { data: rateSheets = [] } = useCustomerRateSheetsList();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "tickets" | "revenue" | "recent">("name");
  const [formOpen, setFormOpen] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [pricingConfirmOpen, setPricingConfirmOpen] = useState(false);
  const [pendingPricingType, setPendingPricingType] = useState<string | null>(null);

  const [form, setForm] = useState({ company: "", contact_name: "", email: "", phone: "", address: "", notes: "" });

  const filtered = useMemo(() => {
    let result = [...customers];
    if (statusFilter !== "all") result = result.filter(c => c.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c => c.company.toLowerCase().includes(q) || c.contact_name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      switch (sortBy) {
        case "tickets": return b.ticket_count - a.ticket_count;
        case "revenue": return b.total_revenue - a.total_revenue;
        case "recent": return new Date(b.last_service_date || 0).getTime() - new Date(a.last_service_date || 0).getTime();
        default: return a.company.localeCompare(b.company);
      }
    });
    return result;
  }, [customers, search, statusFilter, sortBy]);

  const stats = useMemo(() => ({
    total: customers.length,
    active: customers.filter(c => c.status === "active").length,
    totalRevenue: customers.reduce((s, c) => s + Number(c.total_revenue), 0),
    totalTickets: customers.reduce((s, c) => s + c.ticket_count, 0),
  }), [customers]);

  const handleAdd = () => {
    if (!form.company || !form.contact_name || !form.email) { toast.error("Fill required fields"); return; }
    createCustomer.mutate({ company: form.company, contact_name: form.contact_name, email: form.email, phone: form.phone, address: form.address, notes: form.notes, status: "active", pricing_type: "rate_card" }, {
      onSuccess: () => {
        setFormOpen(false);
        setForm({ company: "", contact_name: "", email: "", phone: "", address: "", notes: "" });
      },
    });
  };

  const handlePricingTypeChange = (newType: string) => {
    if (!detailCustomer || newType === detailCustomer.pricing_type) return;
    setPendingPricingType(newType);
    setPricingConfirmOpen(true);
  };

  const confirmPricingChange = () => {
    if (!detailCustomer || !pendingPricingType) return;
    updateCustomer.mutate({ id: detailCustomer.id, pricing_type: pendingPricingType }, {
      onSuccess: () => {
        setDetailCustomer(prev => prev ? { ...prev, pricing_type: pendingPricingType! } : null);
        setPricingConfirmOpen(false);
        setPendingPricingType(null);
      },
    });
  };

  const getCustomerRateSheets = (customerName: string) =>
    rateSheets.filter(rs => rs.customer_name.toLowerCase() === customerName.toLowerCase());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-primary"><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Total Customers</p><p className="text-2xl font-bold text-foreground">{stats.total}</p></CardContent></Card>
        <Card className="border-l-4 border-l-optimal"><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Active</p><p className="text-2xl font-bold text-optimal">{stats.active}</p></CardContent></Card>
        <Card className="border-l-4 border-l-secondary"><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Total Tickets</p><p className="text-2xl font-bold text-secondary">{stats.totalTickets}</p></CardContent></Card>
        <Card className="border-l-4 border-l-medium"><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Total Revenue</p><p className="text-2xl font-bold text-medium">${stats.totalRevenue.toLocaleString()}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-center">
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
        <Button onClick={() => setFormOpen(true)} className="gap-2 ml-auto"><Plus className="h-4 w-4" />Add Customer</Button>
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
                      <PricingTypeBadge pricingType={c.pricing_type} />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <span className="font-medium text-foreground">{c.contact_name}</span>
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm shrink-0">
                    <div className="text-center"><p className="text-xs text-muted-foreground">Tickets</p><p className="font-bold text-foreground">{c.ticket_count}</p></div>
                    <div className="text-center"><p className="text-xs text-muted-foreground">Revenue</p><p className="font-bold text-foreground">${Number(c.total_revenue).toLocaleString()}</p></div>
                    <div className="text-center"><p className="text-xs text-muted-foreground">Last Service</p><p className="font-medium text-foreground">{c.last_service_date ? format(new Date(c.last_service_date), "MMM d, yyyy") : "—"}</p></div>
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
            <div><Label>Contact Name *</Label><Input value={form.contact_name} onChange={e => setForm(p => ({ ...p, contact_name: e.target.value }))} /></div>
            <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
            <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={createCustomer.isPending}>{createCustomer.isPending ? "Adding..." : "Add Customer"}</Button>
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
                  <PricingTypeBadge pricingType={detailCustomer.pricing_type} />
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4 bg-muted/30 rounded-lg p-4 border border-border/50">
                  <div><p className="text-xs text-muted-foreground">Contact</p><p className="text-sm font-medium">{detailCustomer.contact_name}</p></div>
                  <div><p className="text-xs text-muted-foreground">Email</p><p className="text-sm font-medium">{detailCustomer.email}</p></div>
                  <div><p className="text-xs text-muted-foreground">Phone</p><p className="text-sm font-medium">{detailCustomer.phone}</p></div>
                  <div><p className="text-xs text-muted-foreground">Address</p><p className="text-sm font-medium">{detailCustomer.address}</p></div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Tickets</p><p className="text-2xl font-bold">{detailCustomer.ticket_count}</p></CardContent></Card>
                  <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Revenue</p><p className="text-2xl font-bold text-primary">${Number(detailCustomer.total_revenue).toLocaleString()}</p></CardContent></Card>
                  <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Last Service</p><p className="text-lg font-bold">{detailCustomer.last_service_date ? format(new Date(detailCustomer.last_service_date), "MMM d") : "—"}</p></CardContent></Card>
                </div>

                {/* Pricing Configuration */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4" /> Pricing Configuration
                  </h4>
                  <div className="space-y-3 bg-muted/30 rounded-lg p-4 border border-border/50">
                    <div className="space-y-2">
                      <Label className="text-xs">Pricing Type</Label>
                      <Select value={detailCustomer.pricing_type} onValueChange={handlePricingTypeChange}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rate_card">
                            <span className="flex items-center gap-1.5"><CreditCard className="h-3 w-3" /> Standard Rate Card</span>
                          </SelectItem>
                          <SelectItem value="rate_sheet">
                            <span className="flex items-center gap-1.5"><FileText className="h-3 w-3" /> Customer Rate Sheet</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {detailCustomer.pricing_type === "rate_card" && (
                      <div className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span>Uses the Rate Cards + Customer Overrides system. Manage rate card assignments in Settings → Quoting & Rates → Customer Overrides.</span>
                      </div>
                    )}

                    {detailCustomer.pricing_type === "rate_sheet" && (() => {
                      const sheets = getCustomerRateSheets(detailCustomer.company);
                      const activeSheet = sheets.find(s => s.status === "active");
                      if (sheets.length === 0) {
                        return (
                          <div className="flex items-center gap-3 p-3 bg-medium/10 border border-medium/20 rounded-md">
                            <AlertTriangle className="h-4 w-4 text-medium shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs font-medium text-foreground">No rate sheet found for this customer</p>
                              <p className="text-xs text-muted-foreground">Create one in Settings to enable scope-based pricing.</p>
                            </div>
                            <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => navigate("/settings")}>
                              <Plus className="h-3 w-3" /> Create Rate Sheet
                            </Button>
                          </div>
                        );
                      }
                      return (
                        <div className="space-y-2">
                          {sheets.map(rs => (
                            <div key={rs.id} className="flex items-center justify-between p-2 rounded-md border border-border/50 bg-background">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-foreground truncate">{rs.name}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Badge variant={rs.status === "active" ? "default" : "secondary"} className="text-[10px] h-4 px-1">{rs.status}</Badge>
                                    {rs.effective_date && <span>Effective: {format(new Date(rs.effective_date), "MMM d, yyyy")}</span>}
                                  </div>
                                </div>
                              </div>
                              <Button size="sm" variant="ghost" className="text-xs h-7 gap-1" onClick={() => navigate("/settings")}>
                                <ExternalLink className="h-3 w-3" /> View
                              </Button>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Notes */}
                {detailCustomer.notes && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-1"><StickyNote className="h-4 w-4" />Notes</h4>
                    <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 border border-border/50">{detailCustomer.notes}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Pricing Type Change Confirmation */}
      <AlertDialog open={pricingConfirmOpen} onOpenChange={setPricingConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Pricing Type</AlertDialogTitle>
            <AlertDialogDescription>
              Changing the pricing type affects how quotes are generated for this customer.
              {pendingPricingType === "rate_sheet"
                ? " Quotes will use scope-based pricing from the customer's rate sheet instead of the standard rate card."
                : " Quotes will use the standard rate card system instead of the scope-based rate sheet."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingPricingType(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPricingChange}>Confirm Change</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function PricingTypeBadge({ pricingType }: { pricingType: string }) {
  if (pricingType === "rate_sheet") {
    return (
      <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 border-primary/30 text-primary">
        <FileText className="h-2.5 w-2.5" /> Rate Sheet
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 border-muted-foreground/30 text-muted-foreground">
      <CreditCard className="h-2.5 w-2.5" /> Rate Card
    </Badge>
  );
}
