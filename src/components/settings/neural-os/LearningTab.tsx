import { MLSection } from "@/components/ai-agent/MLSection";
import { TrainingHistory } from "@/components/ai-agent/TrainingHistory";
import { DataQualitySection } from "@/components/ai-agent/DataQualitySection";
import { NeuralOsHeader } from "./NeuralOsHeader";

/**
 * Learning Layer | Neural OS
 *
 * NOTE: The following sections from the legacy Deep Learning page are intentionally
 * hidden here and TO BE MOVED TO KNOWLEDGE SECTION IN BATCH 5:
 *   - RegionalRegulatoryIntelligence (Regional Regulatory Intelligence)
 *   - Regulatory Document Library
 *   - WebSearchSection (External Knowledge Sources / Web Search Integration / Saved Knowledge)
 *   - OEM SWI Expansion
 *
 * Do not delete those components — they are still rendered on the legacy
 * /autoheal/deep-learning page until Batch 5 migrates them.
 */
export function LearningTab() {
  return (
    <div className="space-y-6">
      <NeuralOsHeader
        title="Learning Layer | Neural OS"
        description="The Learning layer compounds intelligence from every outcome. Upload field reports to train the system."
      />

      <MLSection />

      <div className="border-t border-border pt-8">
        <TrainingHistory />
      </div>

      <div className="border-t border-border pt-8">
        <DataQualitySection />
      </div>

      {/* TO BE MOVED TO KNOWLEDGE SECTION IN BATCH 5 — RegionalRegulatoryIntelligence */}
      {/* TO BE MOVED TO KNOWLEDGE SECTION IN BATCH 5 — Regulatory Document Library */}
      {/* TO BE MOVED TO KNOWLEDGE SECTION IN BATCH 5 — WebSearchSection (External Knowledge / Saved Knowledge) */}
      {/* TO BE MOVED TO KNOWLEDGE SECTION IN BATCH 5 — OEM SWI Expansion */}
    </div>
  );
}
