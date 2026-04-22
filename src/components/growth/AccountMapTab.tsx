import { useState, useEffect } from "react";
import {
  GROWTH_TIERS, GROWTH_MOTIONS, MOTION_LABELS, NETWORK_TYPES,
  NOCHPLUS_TIMINGS, SERVICE_OPTIONS,
} from "@/types/growth";
import { usePartnerMeta, useUpsertPartnerMeta } from "@/hooks/usePartnerMeta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  partnerId: string;
}

export function AccountMapTab({ partnerId }: Props) {
  const { data: meta, isLoading } = usePartnerMeta(partnerId);
  const upsert = useUpsertPartnerMeta();

  const [form, setForm] = useState<any>({});
  const [hardwareInput, setHardwareInput] = useState("");
  const [regionInput, setRegionInput] = useState("");

  useEffect(() => {
    if (meta) {
      setForm({
        tier: meta.tier ?? "",
        motion: meta.motion ?? "",
        network_type: meta.network_type ?? "",
        charger_footprint_estimate: meta.charger_footprint_estimate ?? "",
        charger_footprint_notes: meta.charger_footprint_notes ?? "",
        hardware_brands: meta.hardware_brands || [],
        regions: meta.regions || [],
        annual_run_rate: meta.annual_run_rate ?? "",
        share_of_wallet_pct: meta.share_of_wallet_pct ?? "",
        services_provided: meta.services_provided || [],
        services_not_provided: meta.services_not_provided || [],
        expansion_thesis: meta.expansion_thesis ?? "",
        white_space_notes: meta.white_space_notes ?? "",
        nochplus_fit_score: meta.nochplus_fit_score ?? 5,
        nochplus_timing: meta.nochplus_timing ?? "",
        strategic_notes: meta.strategic_notes ?? "",
      });
    } else if (!isLoading) {
      setForm({
        hardware_brands: [], regions: [], services_provided: [], services_not_provided: [],
        nochplus_fit_score: 5,
      });
    }
  }, [meta, isLoading]);

  const handleSave = () => {
    const payload = {
      partner_id: partnerId,
      tier: form.tier || null,
      motion: form.motion || null,
      network_type: form.network_type || null,
      charger_footprint_estimate: form.charger_footprint_estimate ? Number(form.charger_footprint_estimate) : null,
      charger_footprint_notes: form.charger_footprint_notes || null,
      hardware_brands: form.hardware_brands || [],
      regions: form.regions || [],
      annual_run_rate: form.annual_run_rate ? Number(form.annual_run_rate) : null,
      share_of_wallet_pct: form.share_of_wallet_pct ? Number(form.share_of_wallet_pct) : null,
      services_provided: form.services_provided || [],
      services_not_provided: form.services_not_provided || [],
      expansion_thesis: form.expansion_thesis || null,
      white_space_notes: form.white_space_notes || null,
      nochplus_fit_score: form.nochplus_fit_score ?? null,
      nochplus_timing: form.nochplus_timing || null,
      strategic_notes: form.strategic_notes || null,
    };
    upsert.mutate(payload, {
      onSuccess: () => toast.success("Account map saved"),
      onError: (e: any) => toast.error("Save failed: " + e.message),
    });
  };

  const addTag = (field: "hardware_brands" | "regions", value: string, clear: () => void) => {
    const v = value.trim();
    if (!v) return;
    if ((form[field] || []).includes(v)) { clear(); return; }
    setForm((p: any) => ({ ...p, [field]: [...(p[field] || []), v] }));
    clear();
  };

  const removeTag = (field: "hardware_brands" | "regions", value: string) => {
    setForm((p: any) => ({ ...p, [field]: (p[field] || []).filter((x: string) => x !== value) }));
  };

  const toggleService = (field: "services_provided" | "services_not_provided", svc: string, checked: boolean) => {
    setForm((p: any) => ({
      ...p,
      [field]: checked ? [...(p[field] || []), svc] : (p[field] || []).filter((x: string) => x !== svc),
    }));
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {/* Account Overview */}
      <Card>
        <CardHeader><CardTitle className="text-base">Account Overview</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Tier</Label>
            <Select value={form.tier || ""} onValueChange={(v) => setForm((p: any) => ({ ...p, tier: v }))}>
              <SelectTrigger><SelectValue placeholder="Select tier" /></SelectTrigger>
              <SelectContent>{GROWTH_TIERS.map(t => <SelectItem key={t} value={t}>Tier {t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Motion</Label>
            <Select value={form.motion || ""} onValueChange={(v) => setForm((p: any) => ({ ...p, motion: v }))}>
              <SelectTrigger><SelectValue placeholder="Select motion" /></SelectTrigger>
              <SelectContent>{GROWTH_MOTIONS.map(m => <SelectItem key={m} value={m}>{MOTION_LABELS[m]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Network Type</Label>
            <Select value={form.network_type || ""} onValueChange={(v) => setForm((p: any) => ({ ...p, network_type: v }))}>
              <SelectTrigger><SelectValue placeholder="Select network" /></SelectTrigger>
              <SelectContent>{NETWORK_TYPES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Charger Footprint Estimate</Label>
            <Input type="number" placeholder="e.g. 50000" value={form.charger_footprint_estimate ?? ""}
              onChange={e => setForm((p: any) => ({ ...p, charger_footprint_estimate: e.target.value }))} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs">Footprint Notes (regions, etc.)</Label>
            <Input placeholder="e.g. across 48 states" value={form.charger_footprint_notes ?? ""}
              onChange={e => setForm((p: any) => ({ ...p, charger_footprint_notes: e.target.value }))} />
          </div>

          <div className="space-y-1.5 md:col-span-3">
            <Label className="text-xs">Hardware Brands</Label>
            <div className="flex gap-2">
              <Input value={hardwareInput} onChange={e => setHardwareInput(e.target.value)}
                placeholder="Add a brand and press Enter"
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag("hardware_brands", hardwareInput, () => setHardwareInput("")); }}} />
              <Button type="button" variant="outline" size="sm" onClick={() => addTag("hardware_brands", hardwareInput, () => setHardwareInput(""))}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(form.hardware_brands || []).map((b: string) => (
                <Badge key={b} variant="secondary" className="gap-1">
                  {b}
                  <button onClick={() => removeTag("hardware_brands", b)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 md:col-span-3">
            <Label className="text-xs">Primary Regions</Label>
            <div className="flex gap-2">
              <Input value={regionInput} onChange={e => setRegionInput(e.target.value)}
                placeholder="Add a region and press Enter"
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag("regions", regionInput, () => setRegionInput("")); }}} />
              <Button type="button" variant="outline" size="sm" onClick={() => addTag("regions", regionInput, () => setRegionInput(""))}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(form.regions || []).map((r: string) => (
                <Badge key={r} variant="secondary" className="gap-1">
                  {r}
                  <button onClick={() => removeTag("regions", r)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue & Position */}
      <Card>
        <CardHeader><CardTitle className="text-base">Revenue & Position</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Annual Run-Rate with Noch ($)</Label>
            <Input type="number" step="0.01" value={form.annual_run_rate ?? ""}
              onChange={e => setForm((p: any) => ({ ...p, annual_run_rate: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Estimated Share of Wallet (%)</Label>
            <Input type="number" step="0.1" min={0} max={100} value={form.share_of_wallet_pct ?? ""}
              onChange={e => setForm((p: any) => ({ ...p, share_of_wallet_pct: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Services We Provide Today</Label>
            <div className="grid grid-cols-2 gap-2 p-3 border border-border rounded-md">
              {SERVICE_OPTIONS.map(svc => (
                <label key={svc} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={(form.services_provided || []).includes(svc)}
                    onCheckedChange={c => toggleService("services_provided", svc, !!c)} />
                  {svc}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Services We Do NOT Yet Provide</Label>
            <div className="grid grid-cols-2 gap-2 p-3 border border-border rounded-md">
              {SERVICE_OPTIONS.map(svc => (
                <label key={svc} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={(form.services_not_provided || []).includes(svc)}
                    onCheckedChange={c => toggleService("services_not_provided", svc, !!c)} />
                  {svc}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expansion Thesis */}
      <Card>
        <CardHeader><CardTitle className="text-base">Expansion Thesis</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Expansion Thesis</Label>
            <Textarea rows={2} placeholder="One sentence: We win this account by ___"
              value={form.expansion_thesis ?? ""}
              onChange={e => setForm((p: any) => ({ ...p, expansion_thesis: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">White Space Notes</Label>
            <Textarea rows={3} placeholder="Regions, sites, or services we could expand into"
              value={form.white_space_notes ?? ""}
              onChange={e => setForm((p: any) => ({ ...p, white_space_notes: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">NOCH+ Fit Score: {form.nochplus_fit_score ?? 5}/10</Label>
              <Slider min={1} max={10} step={1} value={[form.nochplus_fit_score ?? 5]}
                onValueChange={(v) => setForm((p: any) => ({ ...p, nochplus_fit_score: v[0] }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">NOCH+ Timing</Label>
              <Select value={form.nochplus_timing || ""} onValueChange={(v) => setForm((p: any) => ({ ...p, nochplus_timing: v }))}>
                <SelectTrigger><SelectValue placeholder="Select timing" /></SelectTrigger>
                <SelectContent>{NOCHPLUS_TIMINGS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strategic Notes */}
      <Card>
        <CardHeader><CardTitle className="text-base">Strategic Notes</CardTitle></CardHeader>
        <CardContent>
          <Textarea rows={5} placeholder="Ongoing strategic notes about this account..."
            value={form.strategic_notes ?? ""}
            onChange={e => setForm((p: any) => ({ ...p, strategic_notes: e.target.value }))} />
        </CardContent>
      </Card>

      <div className="flex justify-end sticky bottom-4">
        <Button onClick={handleSave} disabled={upsert.isPending} size="lg" className="shadow-lg">
          {upsert.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Save Account Map"}
        </Button>
      </div>
    </div>
  );
}
