import { SWIDocumentManagement } from "@/components/settings/SWIDocumentManagement";
import { usePageTitle } from "@/hooks/usePageTitle";

const SWILibrary = () => {
  usePageTitle('SWI Library');
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <SWIDocumentManagement />
    </div>
  );
};

export default SWILibrary;
