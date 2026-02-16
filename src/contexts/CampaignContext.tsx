import { createContext, useContext, useState, type ReactNode } from "react";

interface CampaignContextType {
  selectedCampaignName: string;
  setSelectedCampaignName: (name: string) => void;
  selectedCampaignId: string;
  setSelectedCampaignId: (id: string) => void;
  selectedCustomer: string;
  setSelectedCustomer: (customer: string) => void;
}

const CampaignContext = createContext<CampaignContextType>({
  selectedCampaignName: "",
  setSelectedCampaignName: () => {},
  selectedCampaignId: "",
  setSelectedCampaignId: () => {},
  selectedCustomer: "",
  setSelectedCustomer: () => {},
});

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [selectedCampaignName, setSelectedCampaignName] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");

  return (
    <CampaignContext.Provider value={{
      selectedCampaignName,
      setSelectedCampaignName,
      selectedCampaignId,
      setSelectedCampaignId,
      selectedCustomer,
      setSelectedCustomer,
    }}>
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaignContext() {
  return useContext(CampaignContext);
}
