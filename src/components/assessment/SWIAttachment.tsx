import { useState } from "react";
import { FileText, Check, AlertCircle, Loader2, ExternalLink, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { SWIMatchResult } from "@/services/swiScanner";
import { SWIDocument } from "@/data/swiCatalog";

interface SWIAttachmentProps {
  ticket: { id?: string; ticketId?: string | null };
  swiMatch?: (SWIMatchResult & { swiDocument?: SWIDocument; manual_override?: boolean; matchedAt?: string }) | null;
  isMatching?: boolean;
  error?: string | null;
  onMatch: (ticket: SWIAttachmentProps["ticket"]) => void;
  onClear: (ticketId: string) => void;
}

export function SWIAttachment({ ticket, swiMatch, isMatching, error, onMatch, onClear }: SWIAttachmentProps) {
  const [showDetails, setShowDetails] = useState(false);

  const ticketId = ticket.id || ticket.ticketId || "";

  // No match yet
  if (!swiMatch && !isMatching && !error) {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border">
        <FileText className="w-5 h-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">No SWI attached</span>
        <button
          onClick={() => onMatch(ticket)}
          className="ml-auto px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
        >
          🤖 Find SWI
        </button>
      </div>
    );
  }

  // Matching in progress
  if (isMatching) {
    return (
      <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20 animate-pulse">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
        <div className="flex-1">
          <span className="text-sm font-medium text-primary">AI analyzing ticket...</span>
          <p className="text-xs text-primary/70 mt-0.5">Matching with SWI database</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center gap-3 p-3 bg-critical/5 rounded-lg border border-critical/20">
        <AlertCircle className="w-5 h-5 text-critical flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-critical">Matching failed</span>
          <p className="text-xs text-critical/80 mt-0.5 truncate">{error}</p>
        </div>
        <button
          onClick={() => onMatch(ticket)}
          className="px-3 py-1.5 text-sm bg-critical text-critical-foreground rounded-md hover:bg-critical/90 transition-colors font-medium flex-shrink-0"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!swiMatch) return null;

  const confidence = swiMatch.confidence || 0;
  const swiDoc = swiMatch.swiDocument;

  // Confidence-based styling using design tokens
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
      {/* Header */}
      <div className="p-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg bg-background/50 ${accentClass}`}>
            <FileText className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-semibold ${accentClass} truncate`}>
                📄 {swiDoc?.title || swiMatch.matched_swi_id || "Unknown SWI"}
              </span>
              {(swiMatch as any).manual_override && (
                <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
                  Manual
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-1 truncate">
              {swiDoc?.filename || "No filename"}
            </p>

            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <div className={`flex items-center gap-1.5 ${badgeClass} px-2 py-1 rounded-md`}>
                <Check className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">{confidence}% match</span>
              </div>

              {swiDoc?.estimatedTime && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>⏱️</span>
                  <span>{swiDoc.estimatedTime}</span>
                </div>
              )}

              {!(swiMatch as any).manual_override && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>🤖</span>
                  <span>AI matched</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-1 flex-shrink-0">
            {swiDoc?.driveUrl && (
              <a
                href={swiDoc.driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-2 rounded-md hover:bg-background/70 transition-colors ${accentClass}`}
                title="View in Google Drive"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <button
              onClick={() => setShowDetails(!showDetails)}
              className={`p-2 rounded-md hover:bg-background/70 transition-colors ${accentClass}`}
              title={showDetails ? "Hide details" : "Show details"}
            >
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <button
              onClick={() => onClear(ticketId)}
              className={`p-2 rounded-md hover:bg-background/70 transition-colors ${accentClass}`}
              title="Change SWI"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {showDetails && (
        <div className="border-t border-border/50 bg-background/30 p-3 space-y-3">
          {/* AI Reasoning */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-1">💡 AI Reasoning</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {swiMatch.reasoning || "No reasoning provided"}
            </p>
          </div>

          {/* Key Factors */}
          {swiMatch.key_factors?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-1.5">🎯 Key Factors</p>
              <div className="flex flex-wrap gap-1.5">
                {swiMatch.key_factors.map((factor, idx) => (
                  <span key={idx} className="text-xs px-2 py-1 bg-primary/5 text-primary rounded-md border border-primary/20">
                    {factor}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Required Parts */}
          {swiMatch.required_parts?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-1">🔧 Required Parts</p>
              <p className="text-xs text-muted-foreground">{swiMatch.required_parts.join(", ")}</p>
            </div>
          )}

          {/* Alternative SWIs */}
          {swiMatch.alternative_swis?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-1">📋 Alternatives</p>
              <p className="text-xs text-muted-foreground">{swiMatch.alternative_swis.join(", ")}</p>
            </div>
          )}

          {/* Warnings */}
          {swiMatch.warnings?.length > 0 && (
            <div className="p-2 bg-critical/5 border border-critical/20 rounded-md">
              <p className="text-xs font-semibold text-critical mb-1">⚠️ Important Notes</p>
              <ul className="space-y-1">
                {swiMatch.warnings.map((warning, idx) => (
                  <li key={idx} className="text-xs text-critical/80 flex items-start gap-1.5">
                    <span className="mt-0.5">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Matched: {new Date(swiMatch.timestamp || Date.now()).toLocaleString()}</span>
              {swiMatch.model_used && (
                <span className="font-mono">{swiMatch.model_used.includes("claude") ? "🤖 Claude" : "AI"}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
