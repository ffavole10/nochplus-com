import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC"
];

interface Site {
  id: string;
  site_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

interface SiteSearchDropdownProps {
  companyId: string | null;
  selectedSiteId: string | null;
  onSiteChange: (site: { id: string | null; siteName: string; address: string; city: string; state: string; zip: string }) => void;
  /** If true, fetches via edge function (no auth needed). */
  usePublicEndpoint?: boolean;
  error?: string;
}

export function SiteSearchDropdown({
  companyId,
  selectedSiteId,
  onSiteChange,
  usePublicEndpoint = false,
  error,
}: SiteSearchDropdownProps) {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string>(selectedSiteId || "");

  // New site fields
  const [newSiteName, setNewSiteName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [newZip, setNewZip] = useState("");

  useEffect(() => {
    if (companyId) {
      fetchSites(companyId);
      // Reset selection when company changes
      setSelectedId("");
      setShowNewForm(false);
      onSiteChange({ id: null, siteName: "", address: "", city: "", state: "", zip: "" });
    } else {
      setSites([]);
      setSelectedId("");
      setShowNewForm(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (selectedSiteId && selectedSiteId !== selectedId) {
      setSelectedId(selectedSiteId);
    }
  }, [selectedSiteId]);

  const fetchSites = async (custId: string) => {
    setLoading(true);
    try {
      if (usePublicEndpoint) {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-locations?company_id=${custId}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setSites(data || []);
        }
      } else {
        const { data } = await supabase
          .from("locations" as any)
          .select("id, site_name, address, city, state, zip")
          .eq("customer_id", custId)
          .order("site_name");
        setSites((data || []) as unknown as Site[]);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSite = (siteId: string) => {
    if (siteId === "__new__") {
      setShowNewForm(true);
      setSelectedId("");
      onSiteChange({ id: null, siteName: "", address: "", city: "", state: "", zip: "" });
      return;
    }
    setShowNewForm(false);
    setSelectedId(siteId);
    const site = sites.find(s => s.id === siteId);
    if (site) {
      onSiteChange({
        id: site.id,
        siteName: site.site_name,
        address: site.address,
        city: site.city,
        state: site.state,
        zip: site.zip,
      });
    }
  };

  const confirmNewSite = () => {
    if (!newSiteName.trim()) return;
    onSiteChange({
      id: null,
      siteName: newSiteName.trim(),
      address: newAddress.trim(),
      city: newCity.trim(),
      state: newState,
      zip: newZip.trim(),
    });
    setShowNewForm(false);
    setSelectedId("__confirmed_new__");
  };

  if (!companyId) {
    return (
      <div>
        <Label>Site / Property Location *</Label>
        <p className="text-xs text-muted-foreground mt-1">Select a company first</p>
      </div>
    );
  }

  return (
    <div>
      <Label>Site / Property Location *</Label>
      <div className="relative mt-1">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading sites...
          </div>
        ) : (
          <Select value={selectedId} onValueChange={handleSelectSite}>
            <SelectTrigger>
              <SelectValue placeholder="Select a site or add new..." />
            </SelectTrigger>
            <SelectContent>
              {sites.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>{s.site_name}</span>
                    {s.city && <span className="text-muted-foreground text-xs">— {s.city}, {s.state}</span>}
                  </div>
                </SelectItem>
              ))}
              <SelectItem value="__new__">
                <div className="flex items-center gap-2 text-primary font-medium">
                  <Plus className="h-3.5 w-3.5" />
                  Add New Site
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}

      {showNewForm && (
        <div className="mt-3 p-3 border border-border rounded-lg bg-muted/30 space-y-3">
          <p className="text-xs font-medium text-muted-foreground">New Site Details</p>
          <div>
            <Label className="text-xs">Site Name *</Label>
            <Input
              value={newSiteName}
              onChange={(e) => setNewSiteName(e.target.value)}
              placeholder='e.g., "Valet Level 1", "Parking Garage B"'
              className="text-sm"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label className="text-xs">Street Address</Label>
              <Input
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="Optional"
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">City</Label>
              <Input
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                placeholder="Optional"
                className="text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">State</Label>
                <Select value={newState} onValueChange={setNewState}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="ST" /></SelectTrigger>
                  <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">ZIP</Label>
                <Input
                  value={newZip}
                  onChange={(e) => setNewZip(e.target.value)}
                  placeholder="ZIP"
                  className="text-sm"
                />
              </div>
            </div>
          </div>
          <Button size="sm" onClick={confirmNewSite} disabled={!newSiteName.trim()}>
            Confirm Site
          </Button>
        </div>
      )}
    </div>
  );
}
