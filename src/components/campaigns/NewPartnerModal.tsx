import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const CATEGORIES = ["OEM", "CSMS", "CPO", "Site Host", "Other"];

interface NewPartnerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (partner: { id: string; company: string }) => void;
}

export function NewPartnerModal({ open, onOpenChange, onCreated }: NewPartnerModalProps) {
  const [name, setName] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [creating, setCreating] = useState(false);
  const queryClient = useQueryClient();

  const toggleCategory = (cat: string) => {
    setCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const handleCreate = async () => {
    if (!name.trim() || categories.length === 0) {
      toast.error("Name and at least one category are required");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("customers" as any)
        .insert({
          company: name.trim(),
          contact_name: "",
          email: email || "",
          phone: phone || "",
          website_url: website || null,
          categories: categories,
          status: "active",
        } as any)
        .select()
        .single();
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success(`Partner "${name}" created`);
      onCreated?.({ id: (data as any).id, company: name.trim() });
      resetAndClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to create partner");
    } finally {
      setCreating(false);
    }
  };

  const resetAndClose = () => {
    setName("");
    setCategories([]);
    setWebsite("");
    setEmail("");
    setPhone("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-[400px] z-[250]">
        <DialogHeader>
          <DialogTitle>New Partner</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs">Company Name *</Label>
            <Input className="mt-1" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. EV Connect" autoFocus />
          </div>
          <div>
            <Label className="text-xs">Categories *</Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    categories.includes(cat)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs">Website</Label>
            <Input className="mt-1" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://" />
          </div>
          <div>
            <Label className="text-xs">Primary Contact Email</Label>
            <Input className="mt-1" value={email} onChange={e => setEmail(e.target.value)} placeholder="contact@company.com" />
          </div>
          <div>
            <Label className="text-xs">Primary Contact Phone</Label>
            <Input className="mt-1" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!name.trim() || categories.length === 0 || creating}>
            {creating ? "Creating..." : "Create Partner"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
