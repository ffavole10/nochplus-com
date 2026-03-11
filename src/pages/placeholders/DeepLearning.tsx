import { usePageTitle } from "@/hooks/usePageTitle";
import { MLSection } from "@/components/ai-agent/MLSection";
import { WebSearchSection } from "@/components/ai-agent/WebSearchSection";

const DeepLearning = () => {
  usePageTitle("Deep Learning");

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
        {/* ML Section */}
        <MLSection />

        {/* External Knowledge Sources */}
        <div className="border-t border-border pt-8">
          <WebSearchSection />
        </div>
      </div>
    </div>
  );
};

export default DeepLearning;
