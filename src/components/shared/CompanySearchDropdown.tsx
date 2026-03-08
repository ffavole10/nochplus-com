import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Search, Loader2, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Company {
  id: string;
  company: string;
}

interface CompanySearchDropdownProps {
  value: string;
  companyId: string | null;
  onChange: (companyName: string, companyId: string | null) => void;
  usePublicEndpoint?: boolean;
  error?: string;
}

export function CompanySearchDropdown({
  value,
  companyId,
  onChange,
  usePublicEndpoint = false,
  error,
}: CompanySearchDropdownProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newHqAddress, setNewHqAddress] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (value !== search && !showDropdown) {
      setSearch(value);
    }
  }, [value]);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      if (usePublicEndpoint) {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-companies`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setCompanies(data);
        }
      } else {
        const { data } = await supabase
          .from("customers")
          .select("id, company")
          .order("company", { ascending: true });
        setCompanies(data || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const filtered = companies.filter((c) =>
    c.company.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (c: Company) => {
    setSearch(c.company);
    onChange(c.company, c.id);
    setShowDropdown(false);
    setShowNewForm(false);
  };

  const handleCreateNew = () => {
    setShowNewForm(true);
    setShowDropdown(false);
  };

  const confirmNewCompany = async () => {
    const name = search.trim();
    if (!name) return;

    setSaving(true);
    try {
      if (usePublicEndpoint) {
        // For public forms, just pass name back without DB creation
        onChange(name, null);
        setShowNewForm(false);
        resetNewForm();
        return;
      }

      // Create customer in DB
      const { data: newCustomer, error: insertErr } = await supabase
        .from("customers" as any)
        .insert({
          company: name,
          contact_name: newContactName.trim() || name,
          email: newContactEmail.trim() || "",
          phone: newContactPhone.trim() || "",
          headquarters_address: newHqAddress.trim() || null,
        } as any)
        .select()
        .single();

      if (insertErr) throw insertErr;

      const created = newCustomer as any;

      // Create primary contact if name or email provided
      if (newContactName.trim() || newContactEmail.trim()) {
        await supabase.from("contacts").insert({
          customer_id: created.id,
          name: newContactName.trim() || name,
          email: newContactEmail.trim() || "",
          phone: newContactPhone.trim() || "",
          is_primary: true,
        });
      }

      // Update local list and select the new company
      setCompanies((prev) => [...prev, { id: created.id, company: created.company }].sort((a, b) => a.company.localeCompare(b.company)));
      onChange(created.company, created.id);
      setShowNewForm(false);
      resetNewForm();
      toast.success(`Company "${created.company}" created`);
    } catch (err: any) {
      console.error("Failed to create company:", err);
      toast.error(err.message || "Failed to create company");
    } finally {
      setSaving(false);
    }
  };

  const resetNewForm = () => {
    setNewContactName("");
    setNewContactEmail("");
    setNewContactPhone("");
    setNewHqAddress("");
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Label>Company / Property *</Label>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setShowDropdown(true);
            setShowNewForm(false);
            if (companyId) onChange(e.target.value, null);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder="Search or add company..."
          className="pl-9"
        />
        {loading && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}

      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filtered.length > 0 ? (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelect(c)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2"
              >
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {c.company}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">No companies found</div>
          )}
          <button
            type="button"
            onClick={handleCreateNew}
            className="w-full text-left px-3 py-2 text-sm font-medium text-primary hover:bg-accent transition-colors flex items-center gap-2 border-t border-border"
          >
            <Plus className="h-3.5 w-3.5" />
            Create New Company
          </button>
        </div>
      )}

      {showNewForm && (
        <div className="mt-3 p-3 border border-border rounded-lg bg-muted/30 space-y-3 min-w-[320px]">
          <p className="text-xs font-medium text-muted-foreground">
            New Company: <span className="text-foreground font-semibold">{search.trim() || "—"}</span>
          </p>
          <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Contact Name</Label>
              <Input
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                placeholder="Optional"
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Contact Email</Label>
              <Input
                type="email"
                value={newContactEmail}
                onChange={(e) => setNewContactEmail(e.target.value)}
                placeholder="Optional"
                className="text-sm"
              />
            </div>
            <div className="min-[400px]:col-span-2">
              <Label className="text-xs">Contact Phone</Label>
              <Input
                value={newContactPhone}
                onChange={(e) => setNewContactPhone(e.target.value)}
                placeholder="Optional"
                className="text-sm"
              />
            </div>
            <div className="min-[400px]:col-span-2">
              <Label className="text-xs">HQ Address</Label>
              <Input
                value={newHqAddress}
                onChange={(e) => setNewHqAddress(e.target.value)}
                placeholder="Optional"
                className="text-sm"
              />
            </div>
            <div className="min-[400px]:col-span-2">
              <Button type="button" size="sm" onClick={confirmNewCompany} disabled={!search.trim() || saving} className="w-full">
                {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Creating...</> : "Confirm Company"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export type { Company };
