import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MapPin, Loader2 } from "lucide-react";
import { AddressAutocomplete } from "@/components/submissions/AddressAutocomplete";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  /** Callback for the location descriptor field */
  onDescriptorChange?: (descriptor: string) => void;
  /** Current descriptor value */
  descriptor?: string;
}

export function SiteSearchDropdown({
  companyId,
  selectedSiteId,
  onSiteChange,
  usePublicEndpoint = false,
  error,
  onDescriptorChange,
  descriptor = "",
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

  // Descriptor suggestions
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const descriptorRef = useRef<HTMLDivElement>(null);

  // Resolve the active location_id (either selected or confirmed new)
  const activeLocationId = selectedId && selectedId !== "__new__" && selectedId !== "__confirmed_new__" ? selectedId : null;

  useEffect(() => {
    if (companyId) {
      fetchSites(companyId);
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

  // Fetch descriptor suggestions when location changes
  useEffect(() => {
    if (activeLocationId) {
      fetchDescriptors(activeLocationId);
    } else {
      setSuggestions([]);
    }
  }, [activeLocationId]);

  // Filter suggestions as user types
  useEffect(() => {
    if (!descriptor.trim()) {
      setFilteredSuggestions(suggestions);
    } else {
      const lower = descriptor.toLowerCase();
      setFilteredSuggestions(suggestions.filter(s => s.toLowerCase().includes(lower)));
    }
  }, [descriptor, suggestions]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (descriptorRef.current && !descriptorRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

  const fetchDescriptors = async (locationId: string) => {
    try {
      if (usePublicEndpoint) {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-location-descriptors?location_id=${locationId}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data || []);
        }
      } else {
        const { data } = await supabase
          .from("charger_locations" as any)
          .select("descriptor")
          .eq("location_id", locationId)
          .order("descriptor");
        setSuggestions(((data || []) as any[]).map(d => d.descriptor));
      }
    } catch {
      setSuggestions([]);
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

  const handleDescriptorSelect = (value: string) => {
    onDescriptorChange?.(value);
    setShowSuggestions(false);
  };

  // Show descriptor field when a site is selected or confirmed
  const showDescriptor = !!(onDescriptorChange && (activeLocationId || selectedId === "__confirmed_new__"));

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
              <AddressAutocomplete
                value={newAddress}
                onChange={setNewAddress}
                onSelect={(parsed) => {
                  setNewAddress(parsed.street);
                  setNewCity(parsed.city);
                  setNewState(parsed.state);
                  setNewZip(parsed.zip);
                }}
                placeholder="Start typing an address..."
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

      {/* Specific Location / Descriptor field */}
      {showDescriptor && (
        <div className="mt-3" ref={descriptorRef}>
          <Label className="text-xs">Specific Location (Optional)</Label>
          <div className="relative mt-1">
            <Input
              value={descriptor}
              onChange={(e) => {
                onDescriptorChange?.(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder='e.g., Valet Level 1, Parking Garage B, 3rd Floor, Main Entrance'
              className="text-sm"
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-40 overflow-y-auto">
                {filteredSuggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleDescriptorSelect(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Where exactly is the charger located within this property?
          </p>
        </div>
      )}
    </div>
  );
}
