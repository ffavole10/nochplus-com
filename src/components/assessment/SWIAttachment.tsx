import { useState } from "react";
import { FileText, Check, AlertCircle, Loader2, ExternalLink, RefreshCw, ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { SWIMatchResult } from "@/services/swiScanner";
import { SWIDocument } from "@/data/swiCatalog";
import { AssessmentCharger } from "@/types/assessment";
import { EnrichedSWIMatch } from "@/hooks/useSWIMatching";
import { SWISearchDialog } from "./SWISearchDialog";

interface SWIAttachmentProps {
  ticket: AssessmentCharger;
  swiMatches: EnrichedSWIMatch[];
  isMatching?: boolean;
  error?: string | null;
  onMatch: (ticket: AssessmentCharger) => void;
  onRemove: (ticketId: string, swiId: string) => void;
  onAddManual: (ticketId: string, swi: SWIDocument) => void;
}

function SWICard({ match, onRemove, ticketId }: { match: EnrichedSWIMatch; onRemove: (ticketId: string, swiId: string) => void; ticketId: string }) {
  const [showDetails, setShowDetails] = useState(false);
  const confidence = match.confidence || 0;
  const swiDoc = match.swiDocument;

  let containerClass: string;
  let accentClass: string;
  let badgeClass: string;

  if (confidence >= 90) {
    containerClass = "bg-optimal/5 border-optimal/20";
    accentClass = "text-optimal";
    badgeClass = "bg-optimal/10 text-optimal";
  } else if (confidence >= 70) {
    containerClass = "bg-degraded/5 border-degraded/20";
    accentClass = "text-degraded";
    badgeClass = "bg-degraded/10 text-degraded";
  } else {
    containerClass = "bg-critical/5 border-critical/20";
    accentClass = "text-critical";
    badgeClass = "bg-critical/10 text-critical";
  }

  return (
    <div className={`rounded-lg border overflow-hidden ${containerClass}`}>
      <div className="p-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg bg-background/50 ${accentClass}`}>
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-semibold ${accentClass} truncate`}>
                📄 {swiDoc?.title || match.matched_swi_id || "Unknown SWI"}
              </span>
              {match.manual_override && (
                <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">Manual</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">{swiDoc?.filename || "No filename"}</p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <div className={`flex items-center gap-1.5 ${badgeClass} px-2 py-1 rounded-md`}>
                <Check className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">{confidence}% match</span>
              </div>
              {swiDoc?.estimatedTime && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>⏱️</span><span>{swiDoc.estimatedTime}</span>
                </div>
              )}
              {!match.manual_override && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>🤖</span><span>AI matched</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {swiDoc?.driveUrl && (
              <a href={swiDoc.driveUrl} target="_blank" rel="noopener noreferrer"
                className={`p-2 rounded-md hover:bg-background/70 transition-colors ${accentClass}`} title="View in Google Drive">
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button onClick={() => setShowDetails(!showDetails)}
              className={`p-2 rounded-md hover:bg-background/70 transition-colors ${accentClass}`} title={showDetails ? "Hide details" : "Show details"}>
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button onClick={() => onRemove(ticketId, match.matched_swi_id || "")}
              className="p-2 rounded-md hover:bg-critical/10 transition-colors text-critical" title="Remove SWI">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showDetails && (
        <div className="border-t border-border/50 bg-background/30 p-3 space-y-3">
          <div>
            <p className="text-xs font-semibold text-foreground mb-1">💡 AI Reasoning</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{match.reasoning || "No reasoning provided"}</p>
          </div>
          {match.key_factors?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-1.5">🎯 Key Factors</p>
              <div className="flex flex-wrap gap-1.5">
                {match.key_factors.map((factor, idx) => (
                  <span key={idx} className="text-xs px-2 py-1 bg-primary/5 text-primary rounded-md border border-primary/20">{factor}</span>
                ))}
              </div>
            </div>
          )}
          {match.required_parts?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-1">🔧 Required Parts</p>
              <p className="text-xs text-muted-foreground">{match.required_parts.join(", ")}</p>
            </div>
          )}
          {match.alternative_swis?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-1">📋 Alternatives</p>
              <p className="text-xs text-muted-foreground">{match.alternative_swis.join(", ")}</p>
            </div>
          )}
          {match.warnings?.length > 0 && (
            <div className="p-2 bg-critical/5 border border-critical/20 rounded-md">
              <p className="text-xs font-semibold text-critical mb-1">⚠️ Important Notes</p>
              <ul className="space-y-1">
                {match.warnings.map((warning, idx) => (
                  <li key={idx} className="text-xs text-critical/80 flex items-start gap-1.5">
                    <span className="mt-0.5">•</span><span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Matched: {new Date(match.timestamp || Date.now()).toLocaleString()}</span>
              {match.model_used && (
                <span className="font-mono">{match.model_used === "manual" ? "✋ Manual" : match.model_used.includes("claude") ? "🤖 Claude" : "AI"}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SWIAttachment({ ticket, swiMatches, isMatching, error, onMatch, onRemove, onAddManual }: SWIAttachmentProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const ticketId = ticket.id || ticket.ticketId || "";
  const excludeIds = swiMatches.map(m => m.matched_swi_id).filter(Boolean) as string[];

  return (
    <div className="space-y-2">
      {/* Existing SWI cards */}
      {swiMatches.map((match, idx) => (
        <SWICard key={match.matched_swi_id || idx} match={match} onRemove={onRemove} ticketId={ticketId} />
      ))}

      {/* Matching in progress */}
      {isMatching && (
        <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20 animate-pulse">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <div className="flex-1">
            <span className="text-sm font-medium text-primary">AI analyzing ticket...</span>
            <p className="text-xs text-primary/70 mt-0.5">Matching with SWI database</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 p-3 bg-critical/5 rounded-lg border border-critical/20">
          <AlertCircle className="w-5 h-5 text-critical flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-critical">Matching failed</span>
            <p className="text-xs text-critical/80 mt-0.5 truncate">{error}</p>
          </div>
          <button onClick={() => onMatch(ticket)}
            className="px-3 py-1.5 text-sm bg-critical text-critical-foreground rounded-md hover:bg-critical/90 transition-colors font-medium flex-shrink-0">
            Retry
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {!isMatching && (
          <button onClick={() => onMatch(ticket)}
            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium flex items-center gap-1.5">
            🤖 {swiMatches.length > 0 ? "AI Match Another" : "Find SWI"}
          </button>
        )}
        <button onClick={() => setSearchOpen(true)}
          className="px-3 py-1.5 text-sm bg-muted text-foreground rounded-md hover:bg-muted/80 transition-colors font-medium flex items-center gap-1.5 border border-border">
          <Plus className="w-3.5 h-3.5" />
          Add SWI Manually
        </button>
      </div>

      <SWISearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelect={(swi) => onAddManual(ticketId, swi)}
        excludeIds={excludeIds}
      />
    </div>
  );
}
