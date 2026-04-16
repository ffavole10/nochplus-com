import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Plus, RefreshCw, Eye, Trash2, CheckCircle, Globe, Search,
  FileText, AlertTriangle, Loader2, Shield
} from "lucide-react";
import { syncRegionRegulations, syncAllActiveRegions, seedDefaultRegions } from "@/services/regulatorySync";

const REGION_TYPE_STYLES: Record<string, string> = {
  federal: "bg-primary/10 text-primary",
  state: "bg-optimal/10 text-optimal",
  county: "bg-medium/10 text-medium",
  city: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

const CHANGE_TYPE_STYLES: Record<string, string> = {
  new: "bg-optimal/10 text-optimal",
  updated: "bg-medium/10 text-medium",
  repealed: "bg-critical/10 text-critical",
};

const ALL_CATEGORIES = [
  { value: "electrical_code", label: "Electrical Codes" },
  { value: "ev_specific", label: "EV-Specific Regulations" },
  { value: "ada_compliance", label: "ADA Compliance" },
  { value: "permitting", label: "Permitting Requirements" },
  { value: "utility_interconnection", label: "Utility Interconnection Rules" },
  { value: "contractor_licensing", label: "Contractor Licensing" },
  { value: "incentives_rebates", label: "Incentives & Rebates" },
  { value: "environmental", label: "Environmental Regulations" },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

const STATE_NAMES: Record<string, string> = {
  AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",
  CT:"Connecticut",DE:"Delaware",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",
  IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",
  ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",
  MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",
  NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",
  OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",
  TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",
  WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",
};

interface Region {
  id: string;
  region_type: string;
  name: string;
  state_code: string;
  county: string | null;
  city: string | null;
  is_active: boolean;
  last_synced_at: string | null;
  next_sync_at: string | null;
  created_at: string;
}

interface RegulatoryChange {
  id: string;
  region_id: string;
  document_id: string;
  change_type: string;
  change_summary: string | null;
  detected_at: string;
  reviewed: boolean;
}

interface RegulatoryDocument {
  id: string;
  region_id: string;
  category: string;
  title: string;
  source_url: string | null;
  source_name: string | null;
  content_summary: string | null;
  full_text: string | null;
  effective_date: string | null;
  fetched_at: string;
  is_current: boolean;
  region_name?: string;
}

export function RegionalRegulatoryIntelligence() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [changes, setChanges] = useState<(RegulatoryChange & { region_name?: string; category?: string })[]>([]);
  const [documents, setDocuments] = useState<(RegulatoryDocument & { region_name?: string })[]>([]);
  const [docCounts, setDocCounts] = useState<Record<string, number>>({});
  const [changeCounts, setChangeCounts] = useState<Record<string, number>>({});
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [lastSyncChanges, setLastSyncChanges] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncingRegion, setSyncingRegion] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [docSheetOpen, setDocSheetOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<RegulatoryDocument | null>(null);

  // Filters for document browser
  const [docRegionFilter, setDocRegionFilter] = useState("all");
  const [docCategoryFilter, setDocCategoryFilter] = useState("all");
  const [docSearch, setDocSearch] = useState("");

  // Add region form
  const [newRegionType, setNewRegionType] = useState("state");
  const [newStateCode, setNewStateCode] = useState("");
  const [newCounty, setNewCounty] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newCategories, setNewCategories] = useState<string[]>(
    ALL_CATEGORIES.slice(0, 7).map(c => c.value)
  );
  const [addingRegion, setAddingRegion] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);

    await seedDefaultRegions();

    const [regionsRes, changesRes, docsRes, syncLogRes] = await Promise.all([
      supabase.from("regulatory_regions").select("*").order("created_at"),
      supabase.from("regulatory_changes").select("*").eq("reviewed", false).order("detected_at", { ascending: false }).limit(20),
      supabase.from("regulatory_documents").select("*").eq("is_current", true).order("fetched_at", { ascending: false }),
      supabase.from("regulatory_sync_log").select("*").order("started_at", { ascending: false }).limit(1),
    ]);

    const regionsData = (regionsRes.data || []) as Region[];
    setRegions(regionsData);

    // Count docs per region
    const counts: Record<string, number> = {};
    for (const doc of docsRes.data || []) {
      counts[(doc as any).region_id] = (counts[(doc as any).region_id] || 0) + 1;
    }
    setDocCounts(counts);

    // Count unreviewed changes per region
    const chCounts: Record<string, number> = {};
    for (const ch of changesRes.data || []) {
      chCounts[(ch as any).region_id] = (chCounts[(ch as any).region_id] || 0) + 1;
    }
    setChangeCounts(chCounts);

    // Enrich changes with region name
    const regionMap = new Map(regionsData.map(r => [r.id, r.name]));
    const enrichedChanges = (changesRes.data || []).map((ch: any) => ({
      ...ch,
      region_name: regionMap.get(ch.region_id) || "Unknown",
    }));
    setChanges(enrichedChanges);

    // Enrich documents with region name
    const enrichedDocs = (docsRes.data || []).map((d: any) => ({
      ...d,
      region_name: regionMap.get(d.region_id) || "Unknown",
    }));
    setDocuments(enrichedDocs);

    if (syncLogRes.data?.[0]) {
      const log = syncLogRes.data[0] as any;
      setLastSync(log.completed_at || log.started_at);
      setLastSyncChanges(log.changes_detected || 0);
    }

    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      // Log the sync
      const { data: logEntry } = await supabase
        .from("regulatory_sync_log")
        .insert({ sync_type: "manual" })
        .select("id")
        .single();

      const result = await syncAllActiveRegions();

      if (logEntry) {
        await supabase
          .from("regulatory_sync_log")
          .update({
            completed_at: new Date().toISOString(),
            regions_updated: result.regionsUpdated,
            documents_added: result.documentsAdded,
            changes_detected: result.changesDetected,
            status: "completed",
          })
          .eq("id", logEntry.id);
      }

      toast.success(`Sync complete: ${result.documentsAdded} docs added, ${result.changesDetected} changes detected`);
      await loadData();
    } catch (err) {
      toast.error("Sync failed — check console for details");
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncRegion = async (regionId: string) => {
    setSyncingRegion(regionId);
    try {
      const result = await syncRegionRegulations(regionId);
      toast.success(`Region synced: ${result.documentsAdded} docs, ${result.changesDetected} changes`);
      await loadData();
    } catch (err) {
      toast.error("Region sync failed");
      console.error(err);
    } finally {
      setSyncingRegion(null);
    }
  };

  const { confirm: confirmDialog, dialogProps } = useConfirmDialog();

  const handleRemoveRegion = async (regionId: string) => {
    const ok = await confirmDialog({
      title: "Remove Region?",
      description: "Remove this region and all its documents? This cannot be undone.",
      confirmLabel: "Remove Region",
    });
    if (!ok) return;
    await supabase.from("regulatory_regions").delete().eq("id", regionId);
    toast.success("Region removed");
    await loadData();
  };

  const handleMarkReviewed = async (changeId: string) => {
    await supabase
      .from("regulatory_changes")
      .update({ reviewed: true, reviewed_at: new Date().toISOString() })
      .eq("id", changeId);
    setChanges(prev => prev.filter(c => c.id !== changeId));
    toast.success("Marked as reviewed");
  };

  const handleAddRegion = async () => {
    if (!newStateCode && newRegionType !== "federal") {
      toast.error("Please select a state");
      return;
    }
    setAddingRegion(true);
    try {
      const name = newRegionType === "city" && newCity
        ? `${newCity}, ${newStateCode}`
        : newRegionType === "county" && newCounty
          ? `${newCounty}, ${newStateCode}`
          : STATE_NAMES[newStateCode] || newStateCode;

      const { data: newRegion } = await supabase
        .from("regulatory_regions")
        .insert({
          region_type: newRegionType,
          name,
          state_code: newStateCode,
          county: newCounty || null,
          city: newCity || null,
        })
        .select("id")
        .single();

      if (newRegion) {
        // Trigger immediate sync
        await syncRegionRegulations(newRegion.id);
      }

      toast.success(`Added region: ${name}`);
      setAddModalOpen(false);
      setNewStateCode("");
      setNewCounty("");
      setNewCity("");
      await loadData();
    } catch (err) {
      toast.error("Failed to add region");
      console.error(err);
    } finally {
      setAddingRegion(false);
    }
  };

  const filteredDocs = documents.filter(d => {
    if (docRegionFilter !== "all" && d.region_id !== docRegionFilter) return false;
    if (docCategoryFilter !== "all" && d.category !== docCategoryFilter) return false;
    if (docSearch && !d.title.toLowerCase().includes(docSearch.toLowerCase())) return false;
    return true;
  });

  const getRegionStatus = (region: Region) => {
    if (syncingRegion === region.id) return "syncing";
    if (!region.last_synced_at) return "never";
    if (region.next_sync_at && new Date(region.next_sync_at) < new Date()) return "overdue";
    return "synced";
  };

  const uniqueRegions = regions.filter(r => r.is_active);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Regional Regulatory Intelligence
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Jurisdiction-specific EV regulations synced weekly and injected into Max's diagnostic context for every ticket.
        </p>
      </div>

      {/* Last sync status */}
      {lastSync && (
        <p className="text-xs text-muted-foreground">
          Last sync: {formatDistanceToNow(new Date(lastSync), { addSuffix: true })} — {lastSyncChanges} changes detected
        </p>
      )}

      {/* ═══ SUB-SECTION A: Region Manager ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Active Regions ({uniqueRegions.length})</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setAddModalOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Region
              </Button>
              <Button size="sm" onClick={handleSyncAll} disabled={syncing}>
                {syncing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                Sync All Now
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : regions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No regions configured yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Region</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="text-center">Documents</TableHead>
                  <TableHead>Last Synced</TableHead>
                  <TableHead className="text-center">Changes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regions.map(region => {
                  const status = getRegionStatus(region);
                  return (
                    <TableRow key={region.id}>
                      <TableCell className="font-medium">{region.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={REGION_TYPE_STYLES[region.region_type] || ""}>
                          {region.region_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{region.state_code}</TableCell>
                      <TableCell className="text-center">{docCounts[region.id] || 0}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {region.last_synced_at
                          ? formatDistanceToNow(new Date(region.last_synced_at), { addSuffix: true })
                          : "Never"}
                      </TableCell>
                      <TableCell className="text-center">
                        {(changeCounts[region.id] || 0) > 0 ? (
                          <Badge variant="destructive" className="text-xs">{changeCounts[region.id]}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {status === "syncing" && (
                          <span className="flex items-center gap-1 text-xs text-primary"><Loader2 className="h-3 w-3 animate-spin" />Syncing...</span>
                        )}
                        {status === "synced" && (
                          <span className="flex items-center gap-1 text-xs text-optimal"><CheckCircle className="h-3 w-3" />Synced</span>
                        )}
                        {status === "overdue" && (
                          <span className="flex items-center gap-1 text-xs text-medium"><AlertTriangle className="h-3 w-3" />Overdue</span>
                        )}
                        {status === "never" && (
                          <span className="text-xs text-muted-foreground">Not synced</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleSyncRegion(region.id)}
                            disabled={syncingRegion === region.id}
                          >
                            {syncingRegion === region.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <RefreshCw className="h-3.5 w-3.5" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveRegion(region.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ═══ SUB-SECTION B: Recent Changes ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Changes</CardTitle>
          <CardDescription>Regulations that changed in the last sync cycle</CardDescription>
        </CardHeader>
        <CardContent>
          {changes.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-optimal/40" />
              <p className="text-sm text-muted-foreground">No regulatory changes detected in the last sync cycle. All regions are current ✓</p>
            </div>
          ) : (
            <div className="space-y-3">
              {changes.map(change => (
                <div key={change.id} className="border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={CHANGE_TYPE_STYLES[change.change_type] || ""}>
                      {change.change_type.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{change.region_name}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{change.change_summary}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Detected {formatDistanceToNow(new Date(change.detected_at), { addSuffix: true })}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => handleMarkReviewed(change.id)}
                      >
                        Mark Reviewed
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => {
                          const doc = documents.find(d => d.id === change.document_id);
                          if (doc) {
                            setSelectedDoc(doc);
                            setDocSheetOpen(true);
                          }
                        }}
                      >
                        View Document
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ SUB-SECTION C: Document Browser ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Regulatory Document Library</CardTitle>
          <CardDescription>
            {filteredDocs.length} documents across {uniqueRegions.length} regions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={docRegionFilter} onValueChange={setDocRegionFilter}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {regions.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={docCategoryFilter} onValueChange={setDocCategoryFilter}>
              <SelectTrigger className="w-[200px] h-8 text-xs">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {ALL_CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={docSearch}
                onChange={e => setDocSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>

          {filteredDocs.length === 0 ? (
            <div className="text-center py-6">
              <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No documents found. Sync regions to fetch regulatory data.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDocs.slice(0, 20).map(doc => (
                <div
                  key={doc.id}
                  className="border border-border rounded-lg p-3 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => { setSelectedDoc(doc); setDocSheetOpen(true); }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground">{doc.region_name}</span>
                    <Badge variant="outline" className="text-[10px] h-5">
                      {ALL_CATEGORIES.find(c => c.value === doc.category)?.label || doc.category}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-foreground">{doc.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {doc.source_name && <span>Source: {doc.source_name}</span>}
                    {doc.effective_date && <span>Effective: {doc.effective_date}</span>}
                  </div>
                  {doc.content_summary && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{doc.content_summary}</p>
                  )}
                </div>
              ))}
              {filteredDocs.length > 20 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Showing 20 of {filteredDocs.length} documents
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Region Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Region</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Region Type</Label>
              <Select value={newRegionType} onValueChange={setNewRegionType}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="state">State</SelectItem>
                  <SelectItem value="county">County</SelectItem>
                  <SelectItem value="city">City</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">State</Label>
              <Select value={newStateCode} onValueChange={setNewStateCode}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select state..." />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map(s => (
                    <SelectItem key={s} value={s}>{STATE_NAMES[s]} ({s})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newRegionType === "county" && (
              <div>
                <Label className="text-xs">County</Label>
                <Input value={newCounty} onChange={e => setNewCounty(e.target.value)} placeholder="e.g. King County" className="h-9" />
              </div>
            )}
            {newRegionType === "city" && (
              <div>
                <Label className="text-xs">City</Label>
                <Input value={newCity} onChange={e => setNewCity(e.target.value)} placeholder="e.g. Seattle" className="h-9" />
              </div>
            )}
            <div>
              <Label className="text-xs mb-2 block">Categories to Track</Label>
              <div className="space-y-2">
                {ALL_CATEGORIES.map(cat => (
                  <div key={cat.value} className="flex items-center gap-2">
                    <Checkbox
                      id={cat.value}
                      checked={newCategories.includes(cat.value)}
                      onCheckedChange={(checked) => {
                        setNewCategories(prev =>
                          checked ? [...prev, cat.value] : prev.filter(c => c !== cat.value)
                        );
                      }}
                    />
                    <label htmlFor={cat.value} className="text-sm">{cat.label}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddRegion} disabled={addingRegion}>
              {addingRegion ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
              Add Region
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Side Panel */}
      <Sheet open={docSheetOpen} onOpenChange={setDocSheetOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="text-base">{selectedDoc?.title || "Document"}</SheetTitle>
          </SheetHeader>
          {selectedDoc && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">{selectedDoc.region_name}</Badge>
                <Badge variant="outline" className="text-xs">
                  {ALL_CATEGORIES.find(c => c.value === selectedDoc.category)?.label || selectedDoc.category}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                {selectedDoc.source_name && <p>Source: {selectedDoc.source_name}</p>}
                {selectedDoc.effective_date && <p>Effective: {selectedDoc.effective_date}</p>}
                {selectedDoc.source_url && (
                  <a href={selectedDoc.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                    <Globe className="h-3 w-3" /> View Source
                  </a>
                )}
              </div>
              <ScrollArea className="h-[calc(100vh-250px)]">
                <div className="prose prose-sm max-w-none text-sm text-foreground whitespace-pre-wrap">
                  {selectedDoc.full_text || selectedDoc.content_summary || "No content available."}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground italic">
                This document is injected into Max's context for tickets in {selectedDoc.region_name}.
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
    <ConfirmDialog {...dialogProps} />
    </>
  );
}
