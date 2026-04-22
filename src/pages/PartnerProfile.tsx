import { useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useCustomers, useUpdateCustomer, type Customer } from "@/hooks/useCustomers";
import { useContacts } from "@/hooks/useContacts";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useEstimates } from "@/hooks/useEstimates";
import { useLocations } from "@/hooks/useLocations";
import { CustomerLogo } from "@/components/CustomerLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  Pencil, Globe, ArrowLeft, Upload, Loader2, MapPin, Phone, Mail,
  Crosshair, Ticket, DollarSign, Users, Building2, ExternalLink
} from "lucide-react";
import { AccountMapTab } from "@/components/growth/AccountMapTab";
import { StakeholdersTab } from "@/components/growth/StakeholdersTab";
import { DealsTab } from "@/components/growth/DealsTab";

const CATEGORIES = ["OEM", "CSMS", "CPO", "Site Host", "Other"] as const;

export default function PartnerProfile() {
  const { partnerId } = useParams<{ partnerId: string }>();
  const navigate = useNavigate();
  const { data: customers = [], isLoading } = useCustomers();
  const { data: campaigns = [] } = useCampaigns();
  const { data: allEstimates = [] } = useEstimates(null);
  const { data: contacts = [] } = useContacts(partnerId || "");
  const { data: locations = [] } = useLocations();
  const updateCustomer = useUpdateCustomer();

  const partner = useMemo(() => customers.find(c => c.id === partnerId), [customers, partnerId]);
  usePageTitle(partner?.company || "Partner");

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Customer & { categories: string[] }>>({});
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const partnerCampaigns = useMemo(() =>
    campaigns.filter(c => (c as any).customer_id === partnerId || c.customer === partner?.company),
    [campaigns, partnerId, partner]
  );

  const partnerEstimates = useMemo(() =>
    allEstimates.filter((e: any) => e.company_id === partnerId),
    [allEstimates, partnerId]
  );

  const partnerLocations = useMemo(() =>
    locations.filter((l: any) => l.customer_id === partnerId),
    [locations, partnerId]
  );

  const startEditing = () => {
    if (!partner) return;
    setEditing(true);
    setEditForm({
      company: partner.company,
      contact_name: partner.contact_name,
      email: partner.email,
      phone: partner.phone,
      address: partner.address,
      notes: partner.notes,
      website_url: partner.website_url,
      logo_url: partner.logo_url,
      categories: ((partner as any).categories as string[]) || [],
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !partner) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image"); return; }
    setLogoUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `logos/${partner.id}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      setEditForm(prev => ({ ...prev, logo_url: `${urlData.publicUrl}?t=${Date.now()}` }));
      toast.success("Logo uploaded");
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleSave = () => {
    if (!partner) return;
    updateCustomer.mutate({
      id: partner.id,
      ...editForm,
    } as any, {
      onSuccess: () => {
        setEditing(false);
        toast.success("Partner updated");
      },
    });
  };

  const toggleStatus = () => {
    if (!partner) return;
    const newStatus = partner.status === "active" ? "inactive" : "active";
    updateCustomer.mutate({ id: partner.id, status: newStatus } as any);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>Partner not found.</p>
        <Button variant="link" onClick={() => navigate("/partners")}>← Back to Partners</Button>
      </div>
    );
  }

  const cats = ((partner as any).categories as string[]) || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/partners")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <CustomerLogo logoUrl={partner.logo_url} companyName={partner.company} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{partner.company}</h1>
            {cats.map(cat => (
              <Badge key={cat} variant="secondary">{cat}</Badge>
            ))}
            <Badge variant={partner.status === "active" ? "default" : "secondary"}>{partner.status}</Badge>
          </div>
          {partner.website_url && (
            <a
              href={partner.website_url.startsWith("http") ? partner.website_url : `https://${partner.website_url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1 mt-0.5"
            >
              <Globe className="h-3 w-3" />{partner.website_url}
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Active</Label>
            <Switch checked={partner.status === "active"} onCheckedChange={toggleStatus} />
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={startEditing}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="service">Service History</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {editing ? (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="relative group cursor-pointer" onClick={() => logoInputRef.current?.click()}>
                    <CustomerLogo logoUrl={editForm.logo_url} companyName={editForm.company || "?"} size="lg" />
                    <div className="absolute inset-0 rounded-md bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      {logoUploading ? <Loader2 className="h-4 w-4 text-white animate-spin" /> : <Upload className="h-4 w-4 text-white" />}
                    </div>
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Company Name</Label>
                    <Input value={editForm.company || ""} onChange={e => setEditForm(p => ({ ...p, company: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Website</Label>
                    <Input value={editForm.website_url || ""} onChange={e => setEditForm(p => ({ ...p, website_url: e.target.value }))} />
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
                    <Label className="text-xs">Address</Label>
                    <Input value={editForm.address || ""} onChange={e => setEditForm(p => ({ ...p, address: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Categories</Label>
                  <div className="flex gap-3 flex-wrap">
                    {CATEGORIES.map(cat => (
                      <label key={cat} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <Checkbox
                          checked={(editForm.categories || []).includes(cat)}
                          onCheckedChange={(checked) => {
                            setEditForm(p => ({
                              ...p,
                              categories: checked
                                ? [...(p.categories || []), cat]
                                : (p.categories || []).filter(c => c !== cat),
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
                  <Textarea value={editForm.notes || ""} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} rows={3} />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                  <Button onClick={handleSave} disabled={updateCustomer.isPending}>
                    {updateCustomer.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Company Info */}
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="text-base">Company Info</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-xs text-muted-foreground">Contact</p><p className="text-sm font-medium">{partner.contact_name || "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Email</p><p className="text-sm font-medium">{partner.email || "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Phone</p><p className="text-sm font-medium">{partner.phone || "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Address</p><p className="text-sm font-medium">{partner.address || "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Date Added</p><p className="text-sm font-medium">{format(new Date(partner.created_at), "MMM d, yyyy")}</p></div>
                    <div><p className="text-xs text-muted-foreground">Industry</p><p className="text-sm font-medium">{partner.industry || "—"}</p></div>
                    {partner.description && (
                      <div className="col-span-2"><p className="text-xs text-muted-foreground">Description</p><p className="text-sm">{partner.description}</p></div>
                    )}
                    {partner.notes && (
                      <div className="col-span-2"><p className="text-xs text-muted-foreground">Internal Notes</p><p className="text-sm bg-muted/30 rounded p-2">{partner.notes}</p></div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Relationship Summary */}
              <div className="space-y-3">
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Crosshair className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Campaigns</p>
                      <p className="text-lg font-bold">{partnerCampaigns.length}</p>
                    </div>
                    {partnerCampaigns.length > 0 && (
                      <Button variant="link" size="sm" className="text-xs" onClick={() => setActiveTab("campaigns")}>View →</Button>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Ticket className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Service Tickets</p>
                      <p className="text-lg font-bold">{partner.ticket_count}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Revenue</p>
                      <p className="text-lg font-bold">${Number(partner.total_revenue).toLocaleString()}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Users className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Contacts</p>
                      <p className="text-lg font-bold">{contacts.length}</p>
                    </div>
                    <Button variant="link" size="sm" className="text-xs" onClick={() => setActiveTab("contacts")}>View →</Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Locations</p>
                      <p className="text-lg font-bold">{partnerLocations.length}</p>
                    </div>
                    <Button variant="link" size="sm" className="text-xs" onClick={() => setActiveTab("locations")}>View →</Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Campaigns</CardTitle>
              <Button size="sm" onClick={() => navigate(`/campaigns?new=1&customer=${partner.company}`)}>
                + New Campaign
              </Button>
            </CardHeader>
            <CardContent>
              {partnerCampaigns.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No campaigns yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Chargers</TableHead>
                      <TableHead>Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partnerCampaigns.map(c => (
                      <TableRow key={c.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/campaigns/${c.id}/upload`)}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell><Badge variant="secondary" className="capitalize">{c.status || "draft"}</Badge></TableCell>
                        <TableCell>{c.total_chargers || 0}</TableCell>
                        <TableCell>{format(new Date(c.updated_at), "MMM d, yyyy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="service">
          <Card>
            <CardHeader><CardTitle className="text-base">Service History</CardTitle></CardHeader>
            <CardContent>
              {partnerEstimates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No estimates for this partner yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Estimate #</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partnerEstimates.map((e: any) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.estimate_number}</TableCell>
                        <TableCell><Badge variant="secondary">{e.status}</Badge></TableCell>
                        <TableCell>${Number(e.total || 0).toLocaleString()}</TableCell>
                        <TableCell>{format(new Date(e.created_at), "MMM d, yyyy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts">
          <Card>
            <CardHeader><CardTitle className="text-base">Contacts</CardTitle></CardHeader>
            <CardContent>
              {contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No contacts yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Primary</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((ct: any) => (
                      <TableRow key={ct.id}>
                        <TableCell className="font-medium">{ct.name}</TableCell>
                        <TableCell>{ct.role || "—"}</TableCell>
                        <TableCell>{ct.email}</TableCell>
                        <TableCell>{ct.phone}</TableCell>
                        <TableCell>{ct.is_primary ? <Badge>Primary</Badge> : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations">
          <Card>
            <CardHeader><CardTitle className="text-base">Locations</CardTitle></CardHeader>
            <CardContent>
              {partnerLocations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No locations yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>State</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partnerLocations.map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">{l.name}</TableCell>
                        <TableCell>{l.address || "—"}</TableCell>
                        <TableCell>{l.city || "—"}</TableCell>
                        <TableCell>{l.state || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
