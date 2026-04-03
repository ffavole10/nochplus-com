import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, FileText, Clock, Search } from "lucide-react";
import { toast } from "sonner";
import type { FieldReport } from "@/hooks/useCampaignLaunch";

interface Tech {
  technician_id: string;
  name: string;
}

interface Props {
  reports: FieldReport[];
  techs: Tech[];
  campaignId: string;
  onAddReport: (report: Omit<FieldReport, "id" | "created_at" | "updated_at">) => void;
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  completed: { label: "Completed", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  issue_found: { label: "Issue Found", className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  escalation: { label: "Escalation Required", className: "bg-red-500/20 text-red-400 border-red-500/30" },
  parts_needed: { label: "Parts Needed", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
};

export function LaunchFieldReportsTab({ reports, techs, campaignId, onAddReport }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [techFilter, setTechFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [formTech, setFormTech] = useState("");
  const [formSite, setFormSite] = useState("");
  const [formStatus, setFormStatus] = useState("completed");
  const [formWork, setFormWork] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formArrival, setFormArrival] = useState("");
  const [formDeparture, setFormDeparture] = useState("");

  const filtered = reports.filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (techFilter !== "all" && r.technician_id !== techFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !r.site_name.toLowerCase().includes(q) &&
        !r.notes.toLowerCase().includes(q) &&
        !(r.charger_ids || []).some(id => id.toLowerCase().includes(q))
      )
        return false;
    }
    return true;
  });

  function handleSubmit() {
    if (!formTech || !formSite) {
      toast.error("Please fill in technician and site name");
      return;
    }
    const arrival = formArrival ? new Date(formArrival).toISOString() : null;
    const departure = formDeparture ? new Date(formDeparture).toISOString() : null;
    let hours = 0;
    if (arrival && departure) {
      hours = Math.round(((new Date(departure).getTime() - new Date(arrival).getTime()) / 3600000) * 100) / 100;
    }

    onAddReport({
      campaign_id: campaignId,
      technician_id: formTech,
      site_name: formSite,
      charger_ids: [],
      status: formStatus,
      work_performed: formWork,
      arrival_time: arrival,
      departure_time: departure,
      hours_logged: hours,
      notes: formNotes,
      photo_urls: [],
      is_unscheduled: false,
    });

    setShowModal(false);
    setFormTech("");
    setFormSite("");
    setFormStatus("completed");
    setFormWork("");
    setFormNotes("");
    setFormArrival("");
    setFormDeparture("");
    toast.success("Field report added");
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search reports..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="issue_found">Issue Found</SelectItem>
            <SelectItem value="escalation">Escalation</SelectItem>
            <SelectItem value="parts_needed">Parts Needed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={techFilter} onValueChange={setTechFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Technician" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Technicians</SelectItem>
            {techs.map(t => (
              <SelectItem key={t.technician_id} value={t.technician_id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setShowModal(true)} size="sm">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Report
        </Button>
      </div>

      {/* Reports list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No field reports yet.</p>
          <p className="text-xs mt-1">Add a report using the button above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(report => {
            const tech = techs.find(t => t.technician_id === report.technician_id);
            const badge = STATUS_BADGES[report.status] || STATUS_BADGES.completed;
            return (
              <Card key={report.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-sm">{report.site_name || "Unknown Site"}</div>
                      <div className="text-xs text-muted-foreground">
                        {tech?.name || "Unknown Tech"} · {new Date(report.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    </div>
                    <Badge variant="outline" className={badge.className}>{badge.label}</Badge>
                  </div>
                  {report.work_performed && (
                    <p className="text-sm">{report.work_performed}</p>
                  )}
                  {(report.arrival_time || report.departure_time) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {report.arrival_time && `Arrived: ${new Date(report.arrival_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
                      {report.arrival_time && report.departure_time && " · "}
                      {report.departure_time && `Departed: ${new Date(report.departure_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
                      {report.hours_logged > 0 && ` · ${report.hours_logged}h`}
                    </div>
                  )}
                  {report.notes && (
                    <p className="text-xs text-muted-foreground border-t pt-2 mt-2">{report.notes}</p>
                  )}
                  {report.is_unscheduled && (
                    <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-400">Unscheduled</Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Report Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Field Report</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Technician</Label>
              <Select value={formTech} onValueChange={setFormTech}>
                <SelectTrigger><SelectValue placeholder="Select technician" /></SelectTrigger>
                <SelectContent>
                  {techs.map(t => (
                    <SelectItem key={t.technician_id} value={t.technician_id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Site Name</Label>
              <Input value={formSite} onChange={e => setFormSite(e.target.value)} placeholder="e.g. Vernon Ford" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="issue_found">Issue Found</SelectItem>
                  <SelectItem value="escalation">Escalation Required</SelectItem>
                  <SelectItem value="parts_needed">Parts Needed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Work Performed</Label>
              <Textarea value={formWork} onChange={e => setFormWork(e.target.value)} placeholder="Describe work done..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Arrival Time</Label>
                <Input type="datetime-local" value={formArrival} onChange={e => setFormArrival(e.target.value)} />
              </div>
              <div>
                <Label>Departure Time</Label>
                <Input type="datetime-local" value={formDeparture} onChange={e => setFormDeparture(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Additional notes..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Save Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
