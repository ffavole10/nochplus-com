import { usePageTitle } from "@/hooks/usePageTitle";
import { MLSection } from "@/components/ai-agent/MLSection";
import { WebSearchSection } from "@/components/ai-agent/WebSearchSection";
import { TrainingHistory } from "@/components/ai-agent/TrainingHistory";
import { DataQualitySection } from "@/components/ai-agent/DataQualitySection";

const DeepLearning = () => {
  usePageTitle("Deep Learning");

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 max-w-5xl space-y-8">
        <MLSection />

        <div className="border-t border-border pt-8">
          <TrainingHistory />
        </div>

        <div className="border-t border-border pt-8">
          <DataQualitySection />
        </div>

        <div className="border-t border-border pt-8">
          <WebSearchSection />
        </div>
      </div>
    </div>
  );
};

export default DeepLearning;
