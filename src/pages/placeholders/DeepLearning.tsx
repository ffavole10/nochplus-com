import { usePageTitle } from "@/hooks/usePageTitle";
import { MLSection } from "@/components/ai-agent/MLSection";
import { WebSearchSection } from "@/components/ai-agent/WebSearchSection";

const DeepLearning = () => {
  usePageTitle("Deep Learning");

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Deep Learning</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Neural training data and external knowledge sources that power AutoHeal™ diagnostics
          </p>
        </div>

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
