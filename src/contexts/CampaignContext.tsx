import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface CampaignContextType {
  selectedCampaignName: string;
  setSelectedCampaignName: (name: string) => void;
  selectedCampaignId: string;
  setSelectedCampaignId: (id: string) => void;
  selectedCustomer: string;
  setSelectedCustomer: (customer: string) => void;
}

const STORAGE_KEY = "selected-campaign";

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
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
  const stored = loadStored();
  const [selectedCampaignName, setSelectedCampaignName] = useState(stored.name || "");
  const [selectedCampaignId, setSelectedCampaignId] = useState(stored.id || "");
  const [selectedCustomer, setSelectedCustomer] = useState(stored.customer || "");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      name: selectedCampaignName,
      id: selectedCampaignId,
      customer: selectedCustomer,
    }));
  }, [selectedCampaignName, selectedCampaignId, selectedCustomer]);

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
