import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Phone, MapPin, Clock, Briefcase, DollarSign } from "lucide-react";
import type { Technician } from "@/hooks/useTechnicians";
import { getLevelDisplay, getLevelColor, getStatusInfo } from "@/hooks/useTechnicians";

interface Props {
  technician: Technician | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TechnicianDetailModal({ technician, open, onOpenChange }: Props) {
  if (!technician) return null;
  const status = getStatusInfo(technician.status);
  const fullName = `${technician.first_name} ${technician.last_name}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-lg font-bold text-muted-foreground">
              {technician.first_name[0]}{technician.last_name[0]}
            </div>
            <div>
              <DialogTitle className="text-xl">{fullName}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getLevelColor(technician.level)}>{getLevelDisplay(technician.level)}</Badge>
                <span className={`text-sm ${status.className}`}>{status.icon} {status.label}</span>
                <Badge variant={technician.employee_type === "employee" ? "default" : "outline"}>
                  {technician.employee_type === "employee" ? "🟢 Employee" : "🟠 Subcontractor"}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="coverage">Coverage</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <Card>
              <CardContent className="pt-4 space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contact Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{technician.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{technician.phone || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{technician.home_base_city}, {technician.home_base_state}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Employment Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Hourly Rate:</span> <span className="font-medium">${technician.hourly_rate}/hr</span></div>
                  <div><span className="text-muted-foreground">Travel Rate:</span> <span className="font-medium">${technician.travel_rate}/hr</span></div>
                  <div><span className="text-muted-foreground">Charger Types:</span> <span className="font-medium">{(technician.charger_types || []).join(", ")}</span></div>
                  <div><span className="text-muted-foreground">Max Jobs/Day:</span> <span className="font-medium">{technician.max_jobs_per_day}</span></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Current Capacity</h3>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span>Active Jobs: <strong>{technician.active_jobs_count} / {technician.max_jobs_per_day}</strong></span>
                  </div>
                  <div>Available Slots: <strong>{Math.max(0, technician.max_jobs_per_day - technician.active_jobs_count)}</strong></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Jobs Done", value: technician.jobs_completed_30d, icon: Briefcase },
                { label: "Hours Worked", value: technician.hours_logged_30d, icon: Clock },
                { label: "Revenue", value: `$${technician.revenue_generated_30d.toLocaleString()}`, icon: DollarSign },
                { label: "Avg Job Time", value: technician.jobs_completed_30d > 0 ? `${(technician.hours_logged_30d / technician.jobs_completed_30d).toFixed(1)} hrs` : "—", icon: Clock },
              ].map(m => (
                <Card key={m.label}>
                  <CardContent className="pt-4 text-center">
                    <m.icon className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                    <div className="text-lg font-bold">{m.value}</div>
                    <div className="text-xs text-muted-foreground">{m.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">Performance data for the last 30 days</p>
          </TabsContent>

          <TabsContent value="coverage" className="space-y-4 mt-4">
            <Card>
              <CardContent className="pt-4 space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Service Coverage</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="text-muted-foreground">Home Base:</span> {technician.home_base_city}, {technician.home_base_state}</div>
                  <div><span className="text-muted-foreground">Radius:</span> {technician.coverage_radius_miles} miles</div>
                  <div>
                    <span className="text-muted-foreground">Regions:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(technician.service_regions || []).map(r => (
                        <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>
                      ))}
                      {(!technician.service_regions || technician.service_regions.length === 0) && <span className="text-muted-foreground">None assigned</span>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
