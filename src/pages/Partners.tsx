import { useState, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Plus, Search, ArrowUpDown, Users, Eye, Upload, Loader2, Building2, Trash2, AlertTriangle, Pencil, Check } from "lucide-react";
import { CustomerLogo } from "@/components/CustomerLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCustomers, useCreateCustomer, useDeleteCustomer, type Customer } from "@/hooks/useCustomers";
import { useCreateContact } from "@/hooks/useContacts";
import { useCampaigns } from "@/hooks/useCampaigns";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

const CATEGORIES = ["OEM", "CSMS", "CPO", "Site Host", "Other"] as const;

export default function Partners() {
  const [searchParams] = useSearchParams();
  const categoryFilter = searchParams.get("category") || "";
  usePageTitle("Partners");
  const navigate = useNavigate();
  const { data: customers = [], isLoading } = useCustomers();
  const { data: campaigns = [] } = useCampaigns();
  const createCustomer = useCreateCustomer();
  const createContact = useCreateContact();
  const deleteCustomer = useDeleteCustomer();
  const { confirm: confirmDialog, dialogProps } = useConfirmDialog();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "date" | "campaigns" | "tickets">("name");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(categoryFilter ? [categoryFilter] : []);
  const [formOpen, setFormOpen] = useState(false);
  const [duplicateMatch, setDuplicateMatch] = useState<Customer | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Add partner form state
  const [form, setForm] = useState({ company: "", contact_name: "", email: "", phone: "", address: "", notes: "", website_url: "", categories: [] as string[] });
  const [addLogoUrl, setAddLogoUrl] = useState<string | null>(null);
  const [addLogoUploading, setAddLogoUploading] = useState(false);
  const addLogoInputRef = useRef<HTMLInputElement>(null);

  // Compute campaign counts per customer
  const campaignCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    campaigns.forEach(c => {
      const cid = (c as any).customer_id;
      if (cid) counts[cid] = (counts[cid] || 0) + 1;
    });
    return counts;
  }, [campaigns]);

  const filtered = useMemo(() => {
    let result = [...customers];
    if (statusFilter !== "all") result = result.filter(c => c.status === statusFilter);
    if (selectedCategories.length > 0) {
      result = result.filter(c => {
        const cats = ((c as any).categories as string[]) || [];
        return selectedCategories.some(sc => cats.includes(sc));
      });
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.company.toLowerCase().includes(q) ||
        c.contact_name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      switch (sortBy) {
        case "date": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "campaigns": return (campaignCounts[b.id] || 0) - (campaignCounts[a.id] || 0);
        case "tickets": return b.ticket_count - a.ticket_count;
        default: return a.company.localeCompare(b.company);
      }
    });
    return result;
  }, [customers, search, statusFilter, sortBy, selectedCategories, campaignCounts]);

  const stats = useMemo(() => {
    const catBreakdown: Record<string, number> = {};
    customers.forEach(c => {
      const cats = ((c as any).categories as string[]) || [];
      cats.forEach(cat => { catBreakdown[cat] = (catBreakdown[cat] || 0) + 1; });
    });
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return {
      total: customers.length,
      active: customers.filter(c => c.status === "active").length,
      catBreakdown,
      newThisMonth: customers.filter(c => new Date(c.created_at) > thirtyDaysAgo).length,
    };
  }, [customers]);

  const catBreakdownStr = CATEGORIES
    .filter(c => stats.catBreakdown[c])
    .map(c => `${c}: ${stats.catBreakdown[c]}`)
    .join(" · ") || "None tagged";

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
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

  // Normalize a company name for fuzzy matching
  const normalizeName = (s: string) =>
    s.toLowerCase()
      .replace(/\b(inc|llc|ltd|corp|corporation|company|co|the)\b/g, "")
      .replace(/[^a-z0-9]/g, "")
      .trim();

  const findDuplicate = (companyName: string): Customer | null => {
    const target = normalizeName(companyName);
    if (!target) return null;
    for (const c of customers) {
      const existing = normalizeName(c.company);
      if (!existing) continue;
      // Exact normalized match, or one fully contains the other (and is at least 4 chars)
      if (existing === target) return c;
      if (target.length >= 4 && existing.length >= 4 && (existing.includes(target) || target.includes(existing))) {
        return c;
      }
    }
    return null;
  };

  const handleAdd = () => {
    if (!form.company.trim()) { toast.error("Company name is required"); return; }
    if (form.categories.length === 0) { toast.error("Select at least one category"); return; }

    // Block duplicates
    const existing = findDuplicate(form.company);
    if (existing) {
      setDuplicateMatch(existing);
      return;
    }

    createCustomer.mutate({
      company: form.company.trim(),
      contact_name: form.contact_name.trim(),
      email: form.email.trim(),
      phone: form.phone,
      address: form.address,
      notes: form.notes,
      website_url: form.website_url || "",
      logo_url: addLogoUrl || null,
      status: "active",
      pricing_type: "rate_card",
      categories: form.categories,
    } as any, {
      onSuccess: (newCustomer) => {
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
        setFormOpen(false);
        setForm({ company: "", contact_name: "", email: "", phone: "", address: "", notes: "", website_url: "", categories: [] });
        setAddLogoUrl(null);
        navigate(`/partners/${newCustomer?.id}`);
      },
    });
  };

  const handleDelete = async (c: Customer) => {
    const ok = await confirmDialog({
      title: "Delete Partner?",
      description: `This will permanently delete "${c.company}" and unlink any related tickets, submissions, and locations. This cannot be undone.`,
      confirmLabel: "Delete Partner",
    });
    if (!ok) return;
    deleteCustomer.mutate(c.id);
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
      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Partners</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-optimal">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Active Partners</p>
            <p className="text-2xl font-bold text-optimal">{stats.active}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-secondary">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">By Category</p>
            <p className="text-xs font-medium text-foreground mt-1">{catBreakdownStr}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-medium">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">New This Month</p>
            <p className="text-2xl font-bold text-medium">{stats.newThisMonth}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name, contact, email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="inactive">Inactive</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
            <SelectTrigger className="w-36">
              <ArrowUpDown className="h-3.5 w-3.5 mr-1" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="date">Date Added</SelectItem>
              <SelectItem value="campaigns">Campaigns</SelectItem>
              <SelectItem value="tickets">Tickets</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2 ml-auto">
            <Button
              variant={editMode ? "default" : "outline"}
              size="icon"
              onClick={() => setEditMode(v => !v)}
              aria-label={editMode ? "Done editing" : "Edit partner list"}
              title={editMode ? "Done" : "Edit list"}
            >
              {editMode ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            </Button>
            <Button onClick={() => setFormOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />Add Partner
            </Button>
          </div>
        </div>
        {/* Category pills */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <Badge
              key={cat}
              variant={selectedCategories.includes(cat) ? "default" : "outline"}
              className="cursor-pointer select-none"
              onClick={() => toggleCategory(cat)}
            >
              {cat}
            </Badge>
          ))}
          {selectedCategories.length > 0 && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => setSelectedCategories([])}>
              Clear
            </Badge>
          )}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[40vh] text-muted-foreground gap-4">
          <Building2 className="h-16 w-16 text-primary/40" />
          <p className="text-sm">No partners found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 font-medium">Partner</th>
                <th className="pb-2 font-medium">Categories</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium text-center">Campaigns</th>
                <th className="pb-2 font-medium text-center">Tickets</th>
                <th className="pb-2 font-medium">Contact</th>
                <th className="pb-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const cats = ((c as any).categories as string[]) || [];
                return (
                  <tr
                    key={c.id}
                    className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => navigate(`/partners/${c.id}`)}
                  >
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <CustomerLogo logoUrl={c.logo_url} companyName={c.company} size="sm" />
                        <div>
                          <p className="font-medium text-foreground">{c.company}</p>
                          <p className="text-xs text-muted-foreground">{c.contact_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1 flex-wrap">
                        {cats.map(cat => (
                          <Badge key={cat} variant="secondary" className="text-[10px] px-1.5 py-0">{cat}</Badge>
                        ))}
                        {cats.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </td>
                    <td className="py-3">
                      <Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge>
                    </td>
                    <td className="py-3 text-center font-medium">{campaignCounts[c.id] || 0}</td>
                    <td className="py-3 text-center font-medium">{c.ticket_count}</td>
                    <td className="py-3">
                      <div className="text-xs">
                        <p>{c.email}</p>
                        <p className="text-muted-foreground">{c.phone}</p>
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-xs"
                          onClick={(e) => { e.stopPropagation(); navigate(`/partners/${c.id}`); }}
                        >
                          <Eye className="h-3.5 w-3.5" />View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => { e.stopPropagation(); handleDelete(c); }}
                          aria-label={`Delete ${c.company}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Partner Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Partner</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative group cursor-pointer" onClick={() => addLogoInputRef.current?.click()}>
                <CustomerLogo logoUrl={addLogoUrl} companyName={form.company || "Logo"} size="lg" />
                <div className="absolute inset-0 rounded-md bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {addLogoUploading ? <Loader2 className="h-4 w-4 text-white animate-spin" /> : <Upload className="h-4 w-4 text-white" />}
                </div>
                <input ref={addLogoInputRef} type="file" accept="image/*" className="hidden" onChange={handleAddLogoUpload} />
              </div>
              <p className="text-xs text-muted-foreground">Click to upload logo</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Company Name *</Label>
                <Input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Website</Label>
                <Input value={form.website_url} onChange={e => setForm(p => ({ ...p, website_url: e.target.value }))} placeholder="e.g. evconnect.com" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Primary Contact Name</Label>
                <Input value={form.contact_name} onChange={e => setForm(p => ({ ...p, contact_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Primary Contact Email</Label>
                <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone</Label>
                <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Address</Label>
                <Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Categories *</Label>
              <div className="flex gap-3 flex-wrap">
                {CATEGORIES.map(cat => (
                  <label key={cat} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <Checkbox
                      checked={form.categories.includes(cat)}
                      onCheckedChange={(checked) => {
                        setForm(p => ({
                          ...p,
                          categories: checked
                            ? [...p.categories, cat]
                            : p.categories.filter(c => c !== cat),
                        }));
                      }}
                    />
                    {cat}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Internal Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={createCustomer.isPending}>
                {createCustomer.isPending ? "Adding..." : "Add Partner"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Duplicate Partner Dialog */}
      <Dialog open={!!duplicateMatch} onOpenChange={(open) => !open && setDuplicateMatch(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-medium" />
              Possible Duplicate Partner
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              A similar partner already exists. To keep the directory clean, we don't allow duplicates.
            </p>
            {duplicateMatch && (
              <div className="flex items-center gap-3 rounded-md border border-border p-3 bg-muted/30">
                <CustomerLogo logoUrl={duplicateMatch.logo_url} companyName={duplicateMatch.company} size="sm" />
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{duplicateMatch.company}</p>
                  <p className="text-xs text-muted-foreground truncate">{duplicateMatch.contact_name || duplicateMatch.email || "—"}</p>
                </div>
              </div>
            )}
            <div className="text-sm text-muted-foreground">
              Recommended: open the existing partner and add this contact, location, or note there instead of creating a new record.
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDuplicateMatch(null)}>
                Back to Form
              </Button>
              <Button
                onClick={() => {
                  if (duplicateMatch) {
                    const id = duplicateMatch.id;
                    setDuplicateMatch(null);
                    setFormOpen(false);
                    navigate(`/partners/${id}`);
                  }
                }}
              >
                Open Existing Partner
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
