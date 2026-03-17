import { useState, useMemo, useRef, useCallback } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useNavigate } from "react-router-dom";
import { Plus, Users, Search, ArrowUpDown, Mail, Phone, DollarSign, Ticket, Eye, X, Building2, MapPin, StickyNote, FileText, CreditCard, ExternalLink, AlertTriangle, Info, Pencil, Upload, Globe, Loader2, Trash2 } from "lucide-react";
import { CustomerLogo } from "@/components/CustomerLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer, type Customer } from "@/hooks/useCustomers";
import { useRateCards } from "@/hooks/useQuotingSettings";
import { useCustomerRateSheetsList, useCreateCustomerRateSheet } from "@/hooks/useCustomerRateSheets";
import { useCreateContact } from "@/hooks/useContacts";

export default function Customers() {
  usePageTitle('Customers');
  const { data: customers = [], isLoading } = useCustomers();
  const { data: rateCards = [] } = useRateCards();
  const { data: rateSheets = [] } = useCustomerRateSheetsList();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const createContact = useCreateContact();
  const [deleteConfirm, setDeleteConfirm] = useState<Customer | null>(null);
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "tickets" | "revenue" | "recent">("name");
  const [formOpen, setFormOpen] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Customer>>({});
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const addLogoInputRef = useRef<HTMLInputElement>(null);
  const [addLogoUrl, setAddLogoUrl] = useState<string | null>(null);
  const [addLogoUploading, setAddLogoUploading] = useState(false);

  const [form, setForm] = useState({ company: "", contact_name: "", email: "", phone: "", address: "", notes: "", website_url: "", industry: "", description: "", headquarters_address: "", pricing_type: "rate_card" as string });
  const [newRateSheetName, setNewRateSheetName] = useState("");
  const [newRateSheetDesc, setNewRateSheetDesc] = useState("");
  const createRateSheet = useCreateCustomerRateSheet();

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

  const defaultForm = { company: "", contact_name: "", email: "", phone: "", address: "", notes: "", website_url: "", industry: "", description: "", headquarters_address: "", pricing_type: "rate_card" };

  const resetAddForm = () => {
    setForm(defaultForm);
    setAddLogoUrl(null);
    setNewRateSheetName("");
    setNewRateSheetDesc("");
  };

  const handleAdd = () => {
    if (!form.company || !form.contact_name || !form.email) { toast.error("Fill required fields"); return; }
    if (form.pricing_type === "rate_sheet" && !newRateSheetName.trim()) { toast.error("Rate sheet name is required"); return; }
    createCustomer.mutate({
      company: form.company, contact_name: form.contact_name, email: form.email,
      phone: form.phone, address: form.address, notes: form.notes,
      website_url: form.website_url || "", industry: form.industry || null,
      description: form.description || null, headquarters_address: form.headquarters_address || null,
      logo_url: addLogoUrl || null,
      status: "active", pricing_type: form.pricing_type,
    } as any, {
      onSuccess: (newCustomer) => {
        // Create a primary contact from the customer info
        if (newCustomer?.id && form.contact_name.trim()) {
          createContact.mutate({
            customer_id: newCustomer.id,
            name: form.contact_name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            role: null,
            is_primary: true,
          });
        }
        if (form.pricing_type === "rate_sheet" && newRateSheetName.trim()) {
          createRateSheet.mutate({
            customer_name: form.company,
            name: newRateSheetName.trim(),
            description: newRateSheetDesc.trim() || "",
            effective_date: null,
            expiration_date: null,
            status: "draft",
          });
        }
        setFormOpen(false);
        resetAddForm();
      },
    });
  };

  const handleAddLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }
    setAddLogoUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `logos/new-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      setAddLogoUrl(`${urlData.publicUrl}?t=${Date.now()}`);
      toast.success("Logo uploaded");
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setAddLogoUploading(false);
      if (addLogoInputRef.current) addLogoInputRef.current.value = "";
    }
  };

  const [pricingConfirm, setPricingConfirm] = useState<{ open: boolean; newType: string }>({ open: false, newType: "" });

  const handlePricingTypeChange = (newType: string) => {
    if (!detailCustomer || newType === detailCustomer.pricing_type) return;
    setPricingConfirm({ open: true, newType });
  };

  const confirmPricingChange = useCallback(() => {
    if (!detailCustomer) return;
    updateCustomer.mutate({ id: detailCustomer.id, pricing_type: pricingConfirm.newType }, {
      onSuccess: () => {
        setDetailCustomer(prev => prev ? { ...prev, pricing_type: pricingConfirm.newType } : null);
      },
    });
    setPricingConfirm({ open: false, newType: "" });
  }, [detailCustomer, pricingConfirm.newType, updateCustomer]);

  const getCustomerRateSheets = (customerName: string) =>
    rateSheets.filter(rs => rs.customer_name.toLowerCase() === customerName.toLowerCase());

  const startEditing = (c: Customer) => {
    setEditing(true);
    setEditForm({
      company: c.company,
      contact_name: c.contact_name,
      email: c.email,
      phone: c.phone,
      address: c.address,
      notes: c.notes,
      website_url: c.website_url,
      industry: c.industry || "",
      description: c.description || "",
      headquarters_address: c.headquarters_address || "",
      logo_url: c.logo_url,
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !detailCustomer) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }

    setLogoUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `logos/${detailCustomer.id}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setEditForm(prev => ({ ...prev, logo_url: publicUrl }));
      toast.success("Logo uploaded");
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleSaveEdit = () => {
    if (!detailCustomer) return;
    const { company, contact_name, email, phone, address, notes, website_url, industry, description, headquarters_address, logo_url } = editForm;
    if (!company?.trim()) { toast.error("Company name is required"); return; }
    updateCustomer.mutate({
      id: detailCustomer.id,
      company, contact_name, email, phone, address, notes,
      website_url: website_url || "",
      industry: industry || null,
      description: description || null,
      headquarters_address: headquarters_address || null,
      logo_url: logo_url || null,
    } as any, {
      onSuccess: () => {
        setDetailCustomer(prev => prev ? { ...prev, ...editForm } as Customer : null);
        setEditing(false);
        toast.success("Customer updated");
      },
    });
  };

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
                  <CustomerLogo logoUrl={c.logo_url} companyName={c.company} size="md" />
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
      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) resetAddForm(); setFormOpen(open); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Add Customer</DialogTitle></DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="relative group cursor-pointer" onClick={() => addLogoInputRef.current?.click()}>
              <CustomerLogo logoUrl={addLogoUrl} companyName={form.company || "Logo"} size="lg" />
              <div className="absolute inset-0 rounded-md bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {addLogoUploading ? <Loader2 className="h-4 w-4 text-white animate-spin" /> : <Upload className="h-4 w-4 text-white" />}
              </div>
              <input ref={addLogoInputRef} type="file" accept="image/*" className="hidden" onChange={handleAddLogoUpload} />
            </div>
            <div className="text-xs text-muted-foreground">Click to upload logo</div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Company Name *</Label>
                <Input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Website URL</Label>
                <Input value={form.website_url} onChange={e => setForm(p => ({ ...p, website_url: e.target.value }))} placeholder="e.g. evconnect.com" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Contact Name *</Label>
                <Input value={form.contact_name} onChange={e => setForm(p => ({ ...p, contact_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email *</Label>
                <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone</Label>
                <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Industry</Label>
                <Input value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Address</Label>
                <Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Headquarters Address</Label>
                <Input value={form.headquarters_address} onChange={e => setForm(p => ({ ...p, headquarters_address: e.target.value }))} />
              </div>
            </div>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-1.5"><CreditCard className="h-4 w-4" /> Pricing Type</h4>
              <Select value={form.pricing_type} onValueChange={v => setForm(p => ({ ...p, pricing_type: v }))}>
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
              {form.pricing_type === "rate_sheet" && (
                <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                  <p className="text-xs text-muted-foreground">A draft rate sheet will be created for this customer. You can configure scopes and pricing later in Settings.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Rate Sheet Name *</Label>
                      <Input value={newRateSheetName} onChange={e => setNewRateSheetName(e.target.value)} placeholder={`${form.company || "Customer"} Rate Sheet`} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Description</Label>
                      <Input value={newRateSheetDesc} onChange={e => setNewRateSheetDesc(e.target.value)} placeholder="Optional description" />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { resetAddForm(); setFormOpen(false); }}>Cancel</Button>
              <Button onClick={handleAdd} disabled={createCustomer.isPending}>{createCustomer.isPending ? "Adding..." : "Add Customer"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Detail Modal */}
      <Dialog open={!!detailCustomer} onOpenChange={o => { if (!o) { setDetailCustomer(null); setEditing(false); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailCustomer && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {editing ? (
                    <div className="relative group cursor-pointer" onClick={() => logoInputRef.current?.click()}>
                      <CustomerLogo logoUrl={editForm.logo_url} companyName={editForm.company || "?"} size="lg" />
                      <div className="absolute inset-0 rounded-md bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        {logoUploading ? <Loader2 className="h-4 w-4 text-white animate-spin" /> : <Upload className="h-4 w-4 text-white" />}
                      </div>
                      <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </div>
                  ) : (
                    <CustomerLogo logoUrl={detailCustomer.logo_url} companyName={detailCustomer.company} size="lg" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span>{detailCustomer.company}</span>
                      <PricingTypeBadge pricingType={detailCustomer.pricing_type} />
                    </div>
                    {detailCustomer.website_url && !editing && (
                      <a href={detailCustomer.website_url.startsWith("http") ? detailCustomer.website_url : `https://${detailCustomer.website_url}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5">
                        <Globe className="h-3 w-3" />{detailCustomer.website_url}
                      </a>
                    )}
                  </div>
                  {!editing && (
                    <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => startEditing(detailCustomer)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {editing ? (
                  <>
                    {/* Editable Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Company Name *</Label>
                        <Input value={editForm.company || ""} onChange={e => setEditForm(p => ({ ...p, company: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Website URL</Label>
                        <Input value={editForm.website_url || ""} onChange={e => setEditForm(p => ({ ...p, website_url: e.target.value }))} placeholder="e.g. evconnect.com" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Contact Name</Label>
                        <Input value={editForm.contact_name || ""} onChange={e => setEditForm(p => ({ ...p, contact_name: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Email</Label>
                        <Input value={editForm.email || ""} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Phone</Label>
                        <Input value={editForm.phone || ""} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Industry</Label>
                        <Input value={editForm.industry || ""} onChange={e => setEditForm(p => ({ ...p, industry: e.target.value }))} />
                      </div>
                      <div className="sm:col-span-2 space-y-1.5">
                        <Label className="text-xs">Description</Label>
                        <Textarea value={editForm.description || ""} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} className="min-h-[60px] resize-y" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Address</Label>
                        <Input value={editForm.address || ""} onChange={e => setEditForm(p => ({ ...p, address: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Headquarters Address</Label>
                        <Input value={editForm.headquarters_address || ""} onChange={e => setEditForm(p => ({ ...p, headquarters_address: e.target.value }))} />
                      </div>
                      <div className="sm:col-span-2 space-y-1.5">
                        <Label className="text-xs">Notes</Label>
                        <Textarea value={editForm.notes || ""} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} className="min-h-[60px] resize-y" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-border">
                      <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                      <Button onClick={handleSaveEdit} disabled={updateCustomer.isPending}>
                        {updateCustomer.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* View Mode */}
                    <div className="grid grid-cols-2 gap-4 bg-muted/30 rounded-lg p-4 border border-border/50">
                      <div><p className="text-xs text-muted-foreground">Contact</p><p className="text-sm font-medium">{detailCustomer.contact_name}</p></div>
                      <div><p className="text-xs text-muted-foreground">Email</p><p className="text-sm font-medium">{detailCustomer.email}</p></div>
                      <div><p className="text-xs text-muted-foreground">Phone</p><p className="text-sm font-medium">{detailCustomer.phone}</p></div>
                      <div><p className="text-xs text-muted-foreground">Address</p><p className="text-sm font-medium">{detailCustomer.address}</p></div>
                      {detailCustomer.industry && <div><p className="text-xs text-muted-foreground">Industry</p><p className="text-sm font-medium">{detailCustomer.industry}</p></div>}
                      {detailCustomer.headquarters_address && <div><p className="text-xs text-muted-foreground">HQ Address</p><p className="text-sm font-medium">{detailCustomer.headquarters_address}</p></div>}
                      {detailCustomer.description && <div className="col-span-2"><p className="text-xs text-muted-foreground">Description</p><p className="text-sm font-medium">{detailCustomer.description}</p></div>}
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
                            <SelectContent className="pointer-events-auto z-[2200]">
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


                    {/* Delete */}
                    <Separator />
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => setDeleteConfirm(detailCustomer)}>
                        <Trash2 className="h-3.5 w-3.5" /> Delete Customer
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={pricingConfirm.open} onOpenChange={(open) => !open && setPricingConfirm({ open: false, newType: "" })}>
        <AlertDialogContent className="z-[2200]">
          <AlertDialogHeader>
            <AlertDialogTitle>Change Pricing Type</AlertDialogTitle>
            <AlertDialogDescription>
              {pricingConfirm.newType === "rate_sheet"
                ? "Quotes will use scope-based pricing from the customer's rate sheet instead of the standard rate card."
                : "Quotes will use the standard rate card system instead of the scope-based rate sheet."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPricingChange}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Customer Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <AlertDialogContent className="z-[2200]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{deleteConfirm?.company}</span>? This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirm) {
                  deleteCustomer.mutate(deleteConfirm.id, {
                    onSuccess: () => {
                      setDeleteConfirm(null);
                      setDetailCustomer(null);
                    },
                  });
                }
              }}
            >
              Delete
            </AlertDialogAction>
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
