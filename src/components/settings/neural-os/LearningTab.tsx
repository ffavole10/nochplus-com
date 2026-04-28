import { MLSection } from "@/components/ai-agent/MLSection";
import { TrainingHistory } from "@/components/ai-agent/TrainingHistory";
import { DataQualitySection } from "@/components/ai-agent/DataQualitySection";
import { NeuralOsHeader } from "./NeuralOsHeader";

/**
 * Learning Layer | Neural OS
 *
 * Note: Regulatory Intelligence, External Sources (Web Search / Saved
 * Knowledge), and OEM SWI Expansion now live under Knowledge:
 *   - /knowledge/regulatory
 *   - /knowledge/external-sources
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
    </div>
  );
}
