import { useState, useCallback, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Upload, FileSpreadsheet, Loader2, CheckCircle, ChevronLeft, ChevronRight,
  Wrench, AlertTriangle, RefreshCw, Rocket,
} from "lucide-react";
import { parseAssessmentExcel, getAssessmentStats } from "@/lib/assessmentParser";
import { AssessmentCharger } from "@/types/assessment";
import { CampaignType, CAMPAIGN_TYPE_CONFIG } from "@/types/campaign";
import { usePartners } from "@/hooks/usePartners";
import { toast } from "sonner";

interface NewCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: {
    name: string;
    type: CampaignType;
    customer: string;
    chargers: AssessmentCharger[];
  }) => void;
}

const STEPS = [
  { number: 1, label: "Upload" },
  { number: 2, label: "Preview" },
  { number: 3, label: "Configure" },
];

export function NewCampaignModal({ open, onOpenChange, onComplete }: NewCampaignModalProps) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [chargers, setChargers] = useState<AssessmentCharger[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [campaignName, setCampaignName] = useState("");
  const [campaignType, setCampaignType] = useState<CampaignType>("preventive_maintenance");
  const [customer, setCustomer] = useState("");

  const { data: dbPartners = [] } = usePartners();
  const partnerCategories = useMemo(() => {
    const cats = ["CPOs", "OEMs", "CSMS"];
    return cats
      .map((cat) => ({ label: cat, partners: dbPartners.filter((p) => p.category === cat).sort((a, b) => a.label.localeCompare(b.label)) }))
      .filter((g) => g.partners.length > 0);
  }, [dbPartners]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsLoading(true);

    try {
      const parsed = await parseAssessmentExcel(selectedFile);
      setChargers(parsed);
      setCampaignName(selectedFile.name.replace(/\.(xlsx?|csv)$/i, ""));
      setStep(2);
      toast.success(`Parsed ${parsed.length} charger records`);
    } catch {
      toast.error("Failed to parse file. Check the format.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleComplete = useCallback(() => {
    if (!campaignName.trim()) {
      toast.error("Please enter a campaign name");
      return;
    }
    if (!customer) {
      toast.error("Please select a partner");
      return;
    }
    onComplete({ name: campaignName, type: campaignType, customer, chargers });
    handleClose();
  }, [campaignName, campaignType, customer, chargers, onComplete]);

  const handleClose = () => {
    setStep(1);
    setFile(null);
    setChargers([]);
    setCampaignName("");
    setCampaignType("preventive_maintenance");
    setCustomer("");
    onOpenChange(false);
  };

  const stats = chargers.length > 0 ? getAssessmentStats(chargers) : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            New Campaign
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Upload an Excel or CSV file with charger data."}
            {step === 2 && "Review the parsed data before proceeding."}
            {step === 3 && "Configure your campaign details."}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 py-2">
          {STEPS.map((s, i) => (
            <div key={s.number} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  step >= s.number
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s.number ? <CheckCircle className="h-4 w-4" /> : s.number}
              </div>
              <span className={`text-xs font-medium ${step >= s.number ? "text-foreground" : "text-muted-foreground"}`}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && <div className={`w-8 h-px ${step > s.number ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="py-4">
            <div className="border-2 border-dashed border-border rounded-lg p-10 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
                id="wizard-upload"
                disabled={isLoading}
              />
              <label htmlFor="wizard-upload" className="cursor-pointer block">
                {isLoading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Parsing file...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileSpreadsheet className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Drop file here or click to upload</p>
                      <p className="text-sm text-muted-foreground mt-1">Supports .xlsx, .xls, .csv</p>
                    </div>
                  </div>
                )}
              </label>
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 2 && stats && (
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileSpreadsheet className="h-4 w-4" />
              <span className="font-medium">{file?.name}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Chargers</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-critical">{stats.critical}</p>
                  <p className="text-xs text-muted-foreground">Critical</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-high">{stats.high}</p>
                  <p className="text-xs text-muted-foreground">High</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-low">{stats.low}</p>
                  <p className="text-xs text-muted-foreground">Low</p>
                </CardContent>
              </Card>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="text-sm font-medium mb-2">Charger Breakdown</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">DC | Level 3</span>
                  <p className="font-semibold">{stats.dcL3Count}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">AC | Level 2</span>
                  <p className="font-semibold">{stats.acL2Count}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Configure */}
        {step === 3 && (
          <div className="py-4 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="cname">Campaign Name</Label>
              <Input
                id="cname"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g. EVgo Q1 2026 California"
              />
            </div>

            <div className="space-y-2">
              <Label>Campaign Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(CAMPAIGN_TYPE_CONFIG) as [CampaignType, typeof CAMPAIGN_TYPE_CONFIG[CampaignType]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setCampaignType(key)}
                    className={`p-3 rounded-lg border text-center transition-all text-sm ${
                      campaignType === key
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <span className="text-lg block mb-1">{cfg.icon}</span>
                    <span className="font-medium text-foreground text-xs">{cfg.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {CAMPAIGN_TYPE_CONFIG[campaignType].description}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Partner</Label>
              <Select value={customer} onValueChange={setCustomer}>
                <SelectTrigger>
                  <SelectValue placeholder="Select partner" />
                </SelectTrigger>
                <SelectContent>
                  {partnerCategories.map((cat) => (
                    <SelectGroup key={cat.label}>
                      <SelectLabel className="text-xs font-semibold text-muted-foreground">{cat.label}</SelectLabel>
                      {cat.partners.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <div>
            {step > 1 && (
              <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            {step === 2 && (
              <Button onClick={() => setStep(3)}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 3 && (
              <Button onClick={handleComplete} disabled={!campaignName.trim() || !customer}>
                <Rocket className="h-4 w-4 mr-1" /> Create Campaign
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
