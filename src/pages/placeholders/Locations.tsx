import { useState, useMemo, useCallback } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Upload, Download, Users, MapPinned, Gauge, Clock, LayoutGrid, List, MoreHorizontal, Pencil, Trash2, Eye, MapPin, Mail, Phone } from "lucide-react";
import {
  useTechnicians, useServiceRegions, useCreateTechnician, useUpdateTechnician, useDeleteTechnician,
  useCreateRegion, useUpdateRegion, useDeleteRegion,
  getLevelDisplay, getLevelColor, getStatusInfo,
  type Technician, type ServiceRegion,
} from "@/hooks/useTechnicians";
import { TechnicianFormModal } from "@/components/technicians/TechnicianFormModal";
import { TechnicianDetailModal } from "@/components/technicians/TechnicianDetailModal";
import { RegionFormModal } from "@/components/technicians/RegionFormModal";
import { TechnicianMap } from "@/components/technicians/TechnicianMap";
import { toast } from "sonner";

type ViewMode = "card" | "list";
type TabFilter = "all" | "employee" | "subcontractor" | "available" | "on_job" | "inactive";

const Locations = () => {
  usePageTitle('Locations');
  const qc = useQueryClient();

  const { data: technicians = [], isLoading } = useTechnicians();
  const { data: regions = [] } = useServiceRegions();
  const createTech = useCreateTechnician();
  const updateTech = useUpdateTechnician();
  const deleteTech = useDeleteTechnician();
  const createRegion = useCreateRegion();
  const updateRegion = useUpdateRegion();
  const deleteRegion = useDeleteRegion();

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [tabFilter, setTabFilter] = useState<TabFilter>("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editTech, setEditTech] = useState<Technician | null>(null);
  const [detailTech, setDetailTech] = useState<Technician | null>(null);
  const [regionFormOpen, setRegionFormOpen] = useState(false);
  const [editRegion, setEditRegion] = useState<ServiceRegion | null>(null);
  const [newRegionPrompt, setNewRegionPrompt] = useState<{ city: string; state: string } | null>(null);
  const [newRegionName, setNewRegionName] = useState("");

  const [recalcRunning, setRecalcRunning] = useState(false);
  const [recalcProgress, setRecalcProgress] = useState<{ done: number; total: number } | null>(null);

  const filtered = useMemo(() => {
    let list = technicians;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        `${t.first_name} ${t.last_name}`.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.home_base_city.toLowerCase().includes(q)
      );
    }
    if (tabFilter === "employee") list = list.filter(t => t.employee_type === "employee");
    else if (tabFilter === "subcontractor") list = list.filter(t => t.employee_type === "subcontractor");
    else if (tabFilter === "available") list = list.filter(t => t.status === "available" && t.active);
    else if (tabFilter === "on_job") list = list.filter(t => t.status === "on_job");
    else if (tabFilter === "inactive") list = list.filter(t => !t.active);
    if (levelFilter !== "all") list = list.filter(t => t.level === levelFilter);
    if (regionFilter !== "all") list = list.filter(t => (t.service_regions || []).includes(regionFilter));
    return list;
  }, [technicians, search, tabFilter, levelFilter, regionFilter]);

  const stats = useMemo(() => {
    const active = technicians.filter(t => t.active);
    const employees = active.filter(t => t.employee_type === "employee").length;
    const subs = active.filter(t => t.employee_type === "subcontractor").length;
    const avgRadius = active.length > 0 ? Math.round(active.reduce((s, t) => s + t.coverage_radius_miles, 0) / active.length) : 0;
    return { total: active.length, employees, subs, regions: regions.length, avgRadius };
  }, [technicians, regions]);

  const counts = useMemo(() => ({
    all: technicians.length,
    employee: technicians.filter(t => t.employee_type === "employee").length,
    subcontractor: technicians.filter(t => t.employee_type === "subcontractor").length,
    available: technicians.filter(t => t.status === "available" && t.active).length,
    on_job: technicians.filter(t => t.status === "on_job").length,
    inactive: technicians.filter(t => !t.active).length,
  }), [technicians]);

  // Check if a city is already covered by any service region
  const isCityCovered = useCallback((city: string) => {
    return regions.some(r => (r.cities || []).some(c => c.toLowerCase() === city.toLowerCase()));
  }, [regions]);

  const handleSaveTech = (data: any) => {
    if (data.id) updateTech.mutate(data);
    else createTech.mutate(data);

    // Check if technician's city is new and not covered by any region
    const city = data.home_base_city?.trim();
    const state = data.home_base_state?.trim();
    if (city && !isCityCovered(city)) {
      setNewRegionName(`${city} Region`);
      setNewRegionPrompt({ city, state: state || "" });
    }
  };

  const handleConfirmNewRegion = () => {
    if (!newRegionPrompt || !newRegionName.trim()) return;
    createRegion.mutate({
      name: newRegionName.trim(),
      description: `Auto-created region for ${newRegionPrompt.city}, ${newRegionPrompt.state}`,
      cities: [newRegionPrompt.city],
      technician_ids: [],
    });
    toast.success(`Region "${newRegionName.trim()}" created`);
    setNewRegionPrompt(null);
    setNewRegionName("");
  };

  const availableRegionNames = useMemo(() => regions.map(r => r.name), [regions]);

  const { confirm: confirmDialog, dialogProps } = useConfirmDialog();

  const handleDeleteTech = async (t: Technician) => {
    const ok = await confirmDialog({
      title: "Delete Technician?",
      description: `Delete ${t.first_name} ${t.last_name}? This cannot be undone.`,
      confirmLabel: "Delete Technician",
    });
    if (!ok) return;
    deleteTech.mutate(t.id);
  };

  const handleSaveRegion = (data: any) => {
    if (data.id) {
      updateRegion.mutate(data);
    } else {
      createRegion.mutate(data);
    }
  };

  const TECH_GEOCODE_CACHE_KEY = "tech-geocode-cache-v1";

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const loadGeoCache = () => {
    try {
      const raw = localStorage.getItem(TECH_GEOCODE_CACHE_KEY);
      return raw ? (JSON.parse(raw) as Record<string, { lat: number; lng: number } | null>) : {};
    } catch {
      return {} as Record<string, { lat: number; lng: number } | null>;
    }
  };

  const saveGeoCache = (cache: Record<string, { lat: number; lng: number } | null>) => {
    try {
      localStorage.setItem(TECH_GEOCODE_CACHE_KEY, JSON.stringify(cache));
    } catch {
      // ignore
    }
  };

  const geoKey = (city: string, state: string) => `${city.trim().toLowerCase()}|${state.trim().toLowerCase()}`;

  const geocodeCityState = async (city: string, state: string) => {
    const q = `${city}, ${state}, USA`;
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&countrycodes=us&limit=1&q=${encodeURIComponent(q)}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    return null;
  };

  const handleRecalculateLocations = async () => {
    if (recalcRunning) return;
    const techs = technicians.filter(t => (t.home_base_city || "").trim() && (t.home_base_state || "").trim());
    if (techs.length === 0) return;

    setRecalcRunning(true);
    setRecalcProgress({ done: 0, total: techs.length });
    toast.message("Recalculating technician map locations…");

    try {
      const cache = loadGeoCache();

      // Geocode unique city/state combos (rate limit: 1 req/sec)
      const unique = new Map<string, { city: string; state: string }>();
      for (const t of techs) {
        const key = geoKey(t.home_base_city, t.home_base_state);
        if (!unique.has(key)) unique.set(key, { city: t.home_base_city, state: t.home_base_state });
      }

      const entries = Array.from(unique.entries());
      for (let i = 0; i < entries.length; i++) {
        const [key, loc] = entries[i];
        if (!(key in cache)) {
          cache[key] = await geocodeCityState(loc.city, loc.state);
          saveGeoCache(cache);
          if (i < entries.length - 1) await sleep(1100);
        }
      }

      // Apply results to each technician (overwrite to ensure accuracy)
      for (let i = 0; i < techs.length; i++) {
        const t = techs[i];
        const coords = cache[geoKey(t.home_base_city, t.home_base_state)];
        if (coords) {
          const { error } = await supabase
            .from("technicians")
            .update({ home_base_lat: coords.lat, home_base_lng: coords.lng })
            .eq("id", t.id);
          if (error) throw error;
        }
        setRecalcProgress({ done: i + 1, total: techs.length });
      }

      await qc.invalidateQueries({ queryKey: ["technicians"] });
      toast.success("Technician locations recalculated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to recalculate locations");
    } finally {
      setRecalcRunning(false);
      setRecalcProgress(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm"><Upload className="h-4 w-4 mr-1" /> Import</Button>
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Export</Button>
          <Button
            variant="outline"
            size="sm"
            disabled={recalcRunning}
            onClick={handleRecalculateLocations}
            title="Re-geocode all technicians from their city/state and refresh map pins"
          >
            <MapPin className="h-4 w-4 mr-1" />
            {recalcRunning && recalcProgress
              ? `Recalculating (${recalcProgress.done}/${recalcProgress.total})`
              : "Recalculate Map"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setEditRegion(null); setRegionFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Add Region
          </Button>
          <Button size="sm" onClick={() => { setEditTech(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Add Technician
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4 text-center">
            <Users className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Active Techs</div>
            <div className="text-xs text-muted-foreground mt-0.5">{stats.employees} Employees · {stats.subs} Subs</div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <MapPinned className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <div className="text-2xl font-bold">{stats.regions}</div>
            <div className="text-xs text-muted-foreground">Custom Regions</div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <Gauge className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <div className="text-2xl font-bold">{stats.avgRadius} mi</div>
            <div className="text-xs text-muted-foreground">Avg Coverage Radius</div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <Clock className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <div className="text-2xl font-bold">—</div>
            <div className="text-xs text-muted-foreground">Avg Response Time</div>
          </CardContent></Card>
        </div>

        {/* Coverage Map */}
        <TechnicianMap technicians={technicians} onTechSelect={setDetailTech} />

        {/* Filters */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, email, or city..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
            </div>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Levels" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="level_1">Level 1 - Field Techs</SelectItem>
                <SelectItem value="level_2">Level 2 - Senior</SelectItem>
                <SelectItem value="level_3">Level 3 - Lead</SelectItem>
                <SelectItem value="level_4">Level 4 - Master</SelectItem>
              </SelectContent>
            </Select>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Regions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {regions.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex border rounded-md">
              <Button variant={viewMode === "card" ? "secondary" : "ghost"} size="icon" className="h-9 w-9" onClick={() => setViewMode("card")}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon" className="h-9 w-9" onClick={() => setViewMode("list")}>
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Tabs value={tabFilter} onValueChange={v => setTabFilter(v as TabFilter)}>
            <TabsList>
              <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
              <TabsTrigger value="employee">Employees ({counts.employee})</TabsTrigger>
              <TabsTrigger value="subcontractor">Subcontractors ({counts.subcontractor})</TabsTrigger>
              <TabsTrigger value="available">Available ({counts.available})</TabsTrigger>
              <TabsTrigger value="on_job">On Job ({counts.on_job})</TabsTrigger>
              <TabsTrigger value="inactive">Inactive ({counts.inactive})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No technicians found. Add your first technician to get started.</p>
          </div>
        ) : viewMode === "card" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(tech => <TechCard key={tech.id} tech={tech} onView={setDetailTech} onEdit={t => { setEditTech(t); setFormOpen(true); }} onDelete={handleDeleteTech} />)}
          </div>
        ) : (
          <TechTable techs={filtered} onView={setDetailTech} onEdit={t => { setEditTech(t); setFormOpen(true); }} onDelete={handleDeleteTech} />
        )}

        {/* Regions Section */}
        {regions.length > 0 && (
          <div className="border-t border-border pt-6">
            <h2 className="text-lg font-bold mb-4">Service Regions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {regions.map(r => (
                <Card key={r.id}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold">{r.name}</h3>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditRegion(r); setRegionFormOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => {
                          const ok = await confirmDialog({
                            title: "Delete Region?",
                            description: `Delete region "${r.name}"? This cannot be undone.`,
                            confirmLabel: "Delete Region",
                          });
                          if (ok) deleteRegion.mutate(r.id);
                        }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {r.description && <p className="text-xs text-muted-foreground mt-1">{r.description}</p>}
                    {(r.cities || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {r.cities.map(c => <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <TechnicianFormModal open={formOpen} onOpenChange={setFormOpen} technician={editTech} onSave={handleSaveTech} availableRegions={availableRegionNames} />
      <TechnicianDetailModal technician={detailTech} open={!!detailTech} onOpenChange={open => !open && setDetailTech(null)} />
      <RegionFormModal open={regionFormOpen} onOpenChange={open => { setRegionFormOpen(open); if (!open) setEditRegion(null); }} region={editRegion} onSave={handleSaveRegion} />

      {/* New Region Naming Dialog */}
      <Dialog open={!!newRegionPrompt} onOpenChange={open => { if (!open) { setNewRegionPrompt(null); setNewRegionName(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New City Detected</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <strong>{newRegionPrompt?.city}, {newRegionPrompt?.state}</strong> isn't covered by any existing service region. Would you like to create one?
          </p>
          <div className="space-y-2">
            <Label>Region Name</Label>
            <Input value={newRegionName} onChange={e => setNewRegionName(e.target.value)} placeholder="e.g. Southern California" />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setNewRegionPrompt(null); setNewRegionName(""); }}>Skip</Button>
            <Button onClick={handleConfirmNewRegion} disabled={!newRegionName.trim()}>Create Region</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ─── Card Component ─── */
function TechCard({ tech, onView, onEdit, onDelete }: { tech: Technician; onView: (t: Technician) => void; onEdit: (t: Technician) => void; onDelete: (t: Technician) => void }) {
  const status = getStatusInfo(tech.status);
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            {tech.photo_url ? (
              <img src={tech.photo_url} alt={`${tech.first_name} ${tech.last_name}`} className="w-10 h-10 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
                {tech.first_name[0]}{tech.last_name[0]}
              </div>
            )}
            <div>
              <div className="font-semibold">{tech.first_name} {tech.last_name}</div>
              <Badge className={`${getLevelColor(tech.level)} text-xs mt-0.5`}>{getLevelDisplay(tech.level)}</Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(tech)}><Eye className="h-4 w-4 mr-2" /> View Details</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(tech)}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(tech)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-3 space-y-1.5 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" /> <span className="truncate">{tech.email}</span></div>
          <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" /> {tech.phone || "—"}</div>
          <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {tech.home_base_city}, {tech.home_base_state}</div>
        </div>

        <div className="mt-3 flex items-center justify-between text-sm">
          <span className={status.className}>{status.icon} {status.label}</span>
          <span className="text-muted-foreground">{tech.employee_type === "employee" ? "🟢 Employee" : "🟠 Subcontractor"}</span>
        </div>

        <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground space-y-1">
          <div>Coverage: {tech.coverage_radius_miles} mi radius</div>
          <div>Charger Types: {(tech.charger_types || []).join(", ")}</div>
          <div>Jobs (30d): {tech.jobs_completed_30d} · Active: {tech.active_jobs_count}/{tech.max_jobs_per_day}</div>
        </div>

        {(tech.service_regions || []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tech.service_regions.map(r => <Badge key={r} variant="outline" className="text-xs">{r}</Badge>)}
          </div>
        )}

        <div className="flex gap-2 mt-3">
          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => onView(tech)}>View Details</Button>
          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => onEdit(tech)}>Edit</Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Table Component ─── */
function TechTable({ techs, onView, onEdit, onDelete }: { techs: Technician[]; onView: (t: Technician) => void; onEdit: (t: Technician) => void; onDelete: (t: Technician) => void }) {
  return (
    <div className="border rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-medium">Name</th>
            <th className="text-left p-3 font-medium">Email</th>
            <th className="text-left p-3 font-medium">Location</th>
            <th className="text-left p-3 font-medium">Level</th>
            <th className="text-left p-3 font-medium">Type</th>
            <th className="text-left p-3 font-medium">Status</th>
            <th className="text-right p-3 font-medium">Jobs (30d)</th>
            <th className="text-right p-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {techs.map(tech => {
            const status = getStatusInfo(tech.status);
            return (
              <tr key={tech.id} className="border-b hover:bg-muted/30 transition-colors">
                <td className="p-3 font-medium">
                  <div className="flex items-center gap-2">
                    {tech.photo_url ? (
                      <img src={tech.photo_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                        {tech.first_name[0]}{tech.last_name[0]}
                      </div>
                    )}
                    {tech.first_name} {tech.last_name}
                  </div>
                </td>
                <td className="p-3 text-muted-foreground truncate max-w-[180px]">{tech.email}</td>
                <td className="p-3 text-muted-foreground">{tech.home_base_city}, {tech.home_base_state}</td>
                <td className="p-3"><Badge className={`${getLevelColor(tech.level)} text-xs`}>{getLevelDisplay(tech.level)}</Badge></td>
                <td className="p-3">{tech.employee_type === "employee" ? "🟢 Employee" : "🟠 Sub"}</td>
                <td className="p-3"><span className={status.className}>{status.icon} {status.label}</span></td>
                <td className="p-3 text-right">{tech.jobs_completed_30d}</td>
                <td className="p-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(tech)}><Eye className="h-4 w-4 mr-2" /> View</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(tech)}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete(tech)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LocationsPage() {
  return (
    <>
      <Locations />
    </>
  );
}

export default Locations;
