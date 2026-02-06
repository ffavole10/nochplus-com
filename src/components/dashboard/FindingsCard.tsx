import { useState } from "react";
import { ChevronDown, ChevronUp, MapPin, Calendar, DollarSign, Clock, FileText, Image, User } from "lucide-react";
import { Charger } from "@/data/chargerData";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FindingsCardProps {
  charger: Charger;
  onShowOnMap: (charger: Charger) => void;
}

export function FindingsCard({ charger, onShowOnMap }: FindingsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusStyles = {
    Critical: "card-critical border-critical/40",
    Degraded: "card-degraded border-degraded/40",
    Optimal: "card-optimal border-optimal/40",
  };

  const statusColors = {
    Critical: "text-critical",
    Degraded: "text-degraded",
    Optimal: "text-optimal",
  };

  const badgeStyles = {
    Critical: "status-critical",
    Degraded: "status-degraded",
    Optimal: "status-optimal",
  };

  return (
    <div
      className={cn(
        "rounded-xl border-2 overflow-hidden transition-all duration-300",
        statusStyles[charger.status],
        isExpanded ? "shadow-lg" : "shadow-sm"
      )}
    >
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-start justify-between text-left hover:bg-black/5 transition-colors"
      >
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", badgeStyles[charger.status])}>
              {charger.status}
            </span>
            <span className="font-mono text-sm font-semibold">{charger.charger_id}</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
            <MapPin className="w-3.5 h-3.5" />
            <span>{charger.site_name}</span>
          </div>
          <p className="text-sm line-clamp-2">{charger.summary}</p>
        </div>
        <div className="ml-4 flex-shrink-0">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 animate-fade-in border-t border-current/10">
          {/* Full Description */}
          <div className="pt-4">
            <h4 className="text-sm font-medium mb-2">Full Issue Description</h4>
            <p className="text-sm text-muted-foreground">{charger.summary}</p>
          </div>

          {/* Issues List */}
          {charger.issues && charger.issues.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Issues Found</h4>
              <div className="flex flex-wrap gap-2">
                {charger.issues.map((issue, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-background/50 rounded text-xs font-medium"
                  >
                    {issue}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Impact Warning */}
          {charger.status === "Critical" && (
            <div className="p-3 bg-critical/10 rounded-lg border border-critical/20">
              <p className="text-sm font-medium text-critical">
                ⚠️ Revenue loss risk • Driver dissatisfaction • Safety concern
              </p>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>{charger.city}, {charger.state}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>Serviced: {charger.start_date}</span>
            </div>
            {charger.estimated_cost && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span>Est. Cost: ${charger.estimated_cost.toLocaleString()}</span>
              </div>
            )}
            {charger.timeline && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{charger.timeline}</span>
              </div>
            )}
            {charger.technician && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>{charger.technician}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => window.open(charger.full_report_link, "_blank")}
            >
              <FileText className="w-4 h-4" />
              View Full Report
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Image className="w-4 h-4" />
              View Photos
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => onShowOnMap(charger)}
            >
              <MapPin className="w-4 h-4" />
              Show on Map
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
