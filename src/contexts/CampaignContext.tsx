import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface CampaignContextType {
  selectedCampaignName: string;
  setSelectedCampaignName: (name: string) => void;
}

const CampaignContext = createContext<CampaignContextType>({
  selectedCampaignName: "",
  setSelectedCampaignName: () => {},
});

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [selectedCampaignName, setSelectedCampaignName] = useState("");

  return (
    <CampaignContext.Provider value={{ selectedCampaignName, setSelectedCampaignName }}>
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaignContext() {
  return useContext(CampaignContext);
}
