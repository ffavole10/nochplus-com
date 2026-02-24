import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, Upload, Download, Users, MapPinned, Gauge, Clock, LayoutGrid, List, MoreHorizontal, Pencil, Trash2, Eye, MapPin, Mail, Phone } from "lucide-react";
import {
  useTechnicians, useServiceRegions, useCreateTechnician, useUpdateTechnician, useDeleteTechnician,
  useCreateRegion, useDeleteRegion,
  getLevelDisplay, getLevelColor, getStatusInfo,
  type Technician, type ServiceRegion,
} from "@/hooks/useTechnicians";
import { TechnicianFormModal } from "@/components/technicians/TechnicianFormModal";
import { TechnicianDetailModal } from "@/components/technicians/TechnicianDetailModal";
import { RegionFormModal } from "@/components/technicians/RegionFormModal";
import { TechnicianMap } from "@/components/technicians/TechnicianMap";

type ViewMode = "card" | "list";
type TabFilter = "all" | "employee" | "subcontractor" | "available" | "on_job" | "inactive";

const Locations = () => {
  const { data: technicians = [], isLoading } = useTechnicians();
  const { data: regions = [] } = useServiceRegions();
  const createTech = useCreateTechnician();
  const updateTech = useUpdateTechnician();
  const deleteTech = useDeleteTechnician();
  const createRegion = useCreateRegion();
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

  const handleSaveTech = (data: any) => {
    if (data.id) updateTech.mutate(data);
    else createTech.mutate(data);
  };

  const handleDeleteTech = (t: Technician) => {
    if (!confirm(`Delete ${t.first_name} ${t.last_name}?`)) return;
    deleteTech.mutate(t.id);
  };

  const handleSaveRegion = (data: any) => {
    if (data.id) {
      // No update hook yet, just re-create approach or add one
    } else {
      createRegion.mutate(data);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm"><Upload className="h-4 w-4 mr-1" /> Import</Button>
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Export</Button>
          <Button variant="outline" size="sm" onClick={() => setRegionFormOpen(true)}>
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
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm(`Delete region "${r.name}"?`)) deleteRegion.mutate(r.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
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

      <TechnicianFormModal open={formOpen} onOpenChange={setFormOpen} technician={editTech} onSave={handleSaveTech} />
      <TechnicianDetailModal technician={detailTech} open={!!detailTech} onOpenChange={open => !open && setDetailTech(null)} />
      <RegionFormModal open={regionFormOpen} onOpenChange={setRegionFormOpen} region={null} onSave={handleSaveRegion} />
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
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
              {tech.first_name[0]}{tech.last_name[0]}
            </div>
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
                <td className="p-3 font-medium">{tech.first_name} {tech.last_name}</td>
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

export default Locations;
