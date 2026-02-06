import { useState } from "react";
import { Charger } from "@/data/chargerData";
import { Search, Grid, List, FileText, Calendar, MapPin, X, Download, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import reportCover from "@/assets/report-cover.jpg";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ReportLibraryProps {
  chargers: Charger[];
}

export function ReportLibrary({ chargers }: ReportLibraryProps) {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedReport, setSelectedReport] = useState<Charger | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  const filteredChargers = chargers.filter(
    (c) =>
      c.charger_id.toLowerCase().includes(search.toLowerCase()) ||
      c.site_name.toLowerCase().includes(search.toLowerCase()) ||
      c.city.toLowerCase().includes(search.toLowerCase()) ||
      c.technician?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const styles = {
      Critical: "status-critical",
      Degraded: "status-degraded",
      Optimal: "status-optimal",
    };
    return styles[status as keyof typeof styles] || styles.Optimal;
  };

  return (
    <div className="dashboard-section">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <h2 className="dashboard-section-title">
          <FileText className="w-5 h-5" />
          Service Report Library
        </h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search reports..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-[200px]"
            />
          </div>
          <div className="flex border rounded-md">
            <Button
              variant="ghost"
              size="icon"
              className={cn(viewMode === "grid" && "bg-muted")}
              onClick={() => setViewMode("grid")}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(viewMode === "list" && "bg-muted")}
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredChargers.slice(0, 12).map((charger) => (
            <div
              key={charger.charger_id}
              className="metric-card p-0 overflow-hidden cursor-pointer group"
              onClick={() => {
                setSelectedReport(charger);
                setPhotoIndex(0);
              }}
            >
              <div className="aspect-video bg-muted relative overflow-hidden">
                <img
                  src={charger.photos?.[0] || "/placeholder.svg"}
                  alt={`Charger ${charger.charger_id}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span
                  className={cn(
                    "absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium",
                    getStatusBadge(charger.status)
                  )}
                >
                  {charger.status}
                </span>
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-sm font-semibold">
                    {charger.charger_id}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {charger.issues?.length || 0} issues
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {charger.site_name}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Calendar className="w-3 h-3" />
                  <span>{charger.start_date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="metric-card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Charger ID</th>
                  <th>Site</th>
                  <th>Status</th>
                  <th>Issues</th>
                  <th>Serviced</th>
                  <th>Technician</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredChargers.slice(0, 20).map((charger) => (
                  <tr key={charger.charger_id} className="hover:bg-muted/50">
                    <td className="font-mono font-semibold">{charger.charger_id}</td>
                    <td className="text-muted-foreground">
                      {charger.site_name}
                    </td>
                    <td>
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", getStatusBadge(charger.status))}>
                        {charger.status}
                      </span>
                    </td>
                    <td>{charger.issues?.length || 0}</td>
                    <td>{charger.start_date}</td>
                    <td className="text-muted-foreground">{charger.technician}</td>
                    <td>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedReport(charger);
                          setPhotoIndex(0);
                        }}
                      >
                        Open
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredChargers.length > 12 && viewMode === "grid" && (
        <p className="text-center text-sm text-muted-foreground mt-4">
          Showing 12 of {filteredChargers.length} reports
        </p>
      )}

      {/* Report Modal */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedReport && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="flex items-center gap-3">
                    <span className="font-mono">{selectedReport.charger_id}</span>
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", getStatusBadge(selectedReport.status))}>
                      {selectedReport.status}
                    </span>
                  </DialogTitle>
                </div>
              </DialogHeader>

              {/* Cover Header */}
              <div className="relative h-32 -mx-6 -mt-6 mb-6 overflow-hidden rounded-t-lg">
                <img
                  src={reportCover}
                  alt="Service Report Cover"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-primary/40" />
                <div className="absolute inset-0 flex items-center px-6">
                  <div className="text-white">
                    <p className="text-xs uppercase tracking-wider opacity-80">Service Report</p>
                    <h3 className="text-xl font-bold">Preventive Maintenance Inspection</h3>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Photo Gallery */}
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                  <img
                    src={selectedReport.photos?.[photoIndex] || "/placeholder.svg"}
                    alt={`Photo ${photoIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {selectedReport.photos && selectedReport.photos.length > 1 && (
                    <>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2"
                        onClick={() => setPhotoIndex((i) => (i === 0 ? (selectedReport.photos?.length || 1) - 1 : i - 1))}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => setPhotoIndex((i) => (i === (selectedReport.photos?.length || 1) - 1 ? 0 : i + 1))}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {selectedReport.photos.map((_, idx) => (
                          <span
                            key={idx}
                            className={cn(
                              "w-2 h-2 rounded-full transition-colors",
                              idx === photoIndex ? "bg-white" : "bg-white/50"
                            )}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Location</span>
                    <p className="font-medium">{selectedReport.site_name}</p>
                    <p className="text-muted-foreground">{selectedReport.address}</p>
                    <p className="text-muted-foreground">{selectedReport.city}, {selectedReport.state} {selectedReport.zip}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Service Details</span>
                    <p className="font-medium">Serviced: {selectedReport.start_date}</p>
                    <p className="text-muted-foreground">Technician: {selectedReport.technician}</p>
                    <p className="text-muted-foreground">Model: {selectedReport.model}</p>
                  </div>
                </div>

                {/* Summary */}
                <div>
                  <span className="text-sm text-muted-foreground">Inspection Notes</span>
                  <p className="mt-1">{selectedReport.summary}</p>
                </div>

                {/* Issues */}
                {selectedReport.issues && selectedReport.issues.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">Issues Found</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedReport.issues.map((issue, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-muted rounded-full text-sm"
                        >
                          {issue}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button className="gap-2" onClick={() => window.open(selectedReport.full_report_link, "_blank")}>
                    <ExternalLink className="w-4 h-4" />
                    Open Full Report
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <Download className="w-4 h-4" />
                    Download PDF
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
