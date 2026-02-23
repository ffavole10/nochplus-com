import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AssessmentCharger, Phase, PriorityLevel } from "@/types/assessment";
import { getPriorityColor } from "@/lib/assessmentParser";
import { MapPin, Wrench, CalendarDays, ClipboardList, AlertTriangle, Zap, Plug, Save, Ticket, Database } from "lucide-react";
import { toast } from "sonner";

interface ChargerDetailModalProps {
  charger: AssessmentCharger | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, updates: Partial<AssessmentCharger>) => void;
}

const PRIORITY_BADGE: Record<PriorityLevel, string> = {
  Critical: "bg-critical text-critical-foreground",
  High: "bg-degraded text-degraded-foreground",
  Medium: "bg-yellow-500 text-white",
  Low: "bg-optimal text-optimal-foreground",
};

const PHASES: Phase[] = ["Needs Assessment", "Scheduled", "In Progress", "Completed", "Deferred"];

export function ChargerDetailModal({ charger, open, onOpenChange, onUpdate }: ChargerDetailModalProps) {
  const [phase, setPhase] = useState<Phase>(charger?.phase || "Needs Assessment");
  const [assignedTo, setAssignedTo] = useState(charger?.assignedTo || "");
  const [scheduledDate, setScheduledDate] = useState(charger?.scheduledDate || "");
  const [notes, setNotes] = useState(charger?.notes || "");

  // Sync state when charger changes
  if (charger && phase !== charger.phase && !open) {
    setPhase(charger.phase);
    setAssignedTo(charger.assignedTo);
    setScheduledDate(charger.scheduledDate || "");
    setNotes(charger.notes);
  }

  if (!charger) return null;

  const age = charger.inServiceDate
    ? Math.floor((Date.now() - new Date(charger.inServiceDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const isExpired = (dateStr: string | null) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  const handleSave = () => {
    onUpdate(charger.id, { phase, assignedTo, scheduledDate: scheduledDate || null, notes });
    toast.success("Charger updated successfully");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 flex-wrap">
            <DialogTitle className="text-lg">{charger.assetName}</DialogTitle>
            <Badge variant="secondary" className="gap-1">
              {charger.assetRecordType === "DC | Level 3" ? <Zap className="h-3 w-3" /> : <Plug className="h-3 w-3" />}
              {charger.assetRecordType}
            </Badge>
            <Badge className={PRIORITY_BADGE[charger.priorityLevel]}>
              {charger.priorityLevel} ({charger.priorityScore})
            </Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="location" className="mt-2">
          <TabsList className="w-full flex-wrap">
            <TabsTrigger value="location" className="flex-1 gap-1">
              <MapPin className="h-3.5 w-3.5" /> Location
            </TabsTrigger>
            <TabsTrigger value="equipment" className="flex-1 gap-1">
              <Wrench className="h-3.5 w-3.5" /> Equipment
            </TabsTrigger>
            <TabsTrigger value="service" className="flex-1 gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> Service
            </TabsTrigger>
            {(charger.ticketId || charger.ticketCreatedDate) && (
              <TabsTrigger value="ticket" className="flex-1 gap-1">
                <Ticket className="h-3.5 w-3.5" /> Ticket
              </TabsTrigger>
            )}
            {Object.keys(charger.extraFields || {}).length > 0 && (
              <TabsTrigger value="extra" className="flex-1 gap-1">
                <Database className="h-3.5 w-3.5" /> All Data
              </TabsTrigger>
            )}
            <TabsTrigger value="project" className="flex-1 gap-1">
              <ClipboardList className="h-3.5 w-3.5" /> Project
            </TabsTrigger>
          </TabsList>

          <TabsContent value="location" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Account Name</Label>
                <p className="font-medium text-sm">{charger.accountName || "—"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">EVSE ID</Label>
                <p className="font-medium text-sm">{charger.evseId || "—"}</p>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Full Address</Label>
              <p className="font-medium text-sm flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                {charger.address}, {charger.city}, {charger.state} {charger.zip}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="equipment" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Asset Record Type</Label>
                <p className="font-medium text-sm">{charger.assetRecordType}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <p className="font-medium text-sm">{charger.status}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">EVSE ID</Label>
                <p className="font-medium text-sm">{charger.evseId || "—"}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="service" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">In-Service Date</Label>
                <p className="font-medium text-sm">{charger.inServiceDate || "—"}</p>
                {age !== null && <p className="text-xs text-muted-foreground">{age} years old</p>}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Parts Warranty End</Label>
                <p className="font-medium text-sm flex items-center gap-1">
                  {charger.partsWarrantyEndDate || "—"}
                  {isExpired(charger.partsWarrantyEndDate) && (
                    <AlertTriangle className="h-3.5 w-3.5 text-critical" />
                  )}
                </p>
                {isExpired(charger.partsWarrantyEndDate) && (
                  <p className="text-xs text-critical font-medium">Expired</p>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Service Contract End</Label>
                <p className="font-medium text-sm flex items-center gap-1">
                  {charger.serviceContractEndDate || "—"}
                  {isExpired(charger.serviceContractEndDate) && (
                    <AlertTriangle className="h-3.5 w-3.5 text-critical" />
                  )}
                </p>
                {isExpired(charger.serviceContractEndDate) && (
                  <p className="text-xs text-critical font-medium">Expired</p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Ticket Tab */}
          {(charger.ticketId || charger.ticketCreatedDate) && (
            <TabsContent value="ticket" className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Ticket ID</Label>
                  <p className="font-medium text-sm">{charger.ticketId || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge className={charger.hasOpenTicket ? "bg-critical text-critical-foreground" : "bg-optimal text-optimal-foreground"}>
                    {charger.hasOpenTicket ? "Open" : "Solved"}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Created Date</Label>
                  <p className="font-medium text-sm">{charger.ticketCreatedDate || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Solved Date</Label>
                  <p className="font-medium text-sm">{charger.ticketSolvedDate || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Ticket Group</Label>
                  <p className="font-medium text-sm">{charger.ticketGroup || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Reporting Source</Label>
                  <p className="font-medium text-sm">{charger.ticketReportingSource || "—"}</p>
                </div>
              </div>
              {charger.ticketSubject && (
                <div>
                  <Label className="text-xs text-muted-foreground">Subject</Label>
                  <p className="font-medium text-sm">{charger.ticketSubject}</p>
                </div>
              )}
            </TabsContent>
          )}

          {/* Extra Fields Tab */}
          {Object.keys(charger.extraFields || {}).length > 0 && (
            <TabsContent value="extra" className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(charger.extraFields).map(([key, value]) => (
                  <div key={key}>
                    <Label className="text-xs text-muted-foreground">{key}</Label>
                    <p className="font-medium text-sm truncate">{value != null ? String(value) : "—"}</p>
                  </div>
                ))}
              </div>
            </TabsContent>
          )}

          <TabsContent value="project" className="space-y-4 mt-4">
            <div>
              <Label>Phase</Label>
              <Select value={phase} onValueChange={(v) => setPhase(v as Phase)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PHASES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assigned To</Label>
              <Input className="mt-1" value={assignedTo} onChange={e => setAssignedTo(e.target.value)} placeholder="Technician name" />
            </div>
            <div>
              <Label>Scheduled Date</Label>
              <Input className="mt-1" type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea className="mt-1" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add notes..." rows={3} />
            </div>
            <p className="text-xs text-muted-foreground">
              Last Updated: {new Date(charger.lastUpdated).toLocaleString()}
            </p>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" /> Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
