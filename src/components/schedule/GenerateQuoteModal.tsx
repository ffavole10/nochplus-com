import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, DollarSign } from "lucide-react";
import { useRateCards, RateCard } from "@/hooks/useQuotingSettings";
import { format, addDays } from "date-fns";

interface GenerateQuoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (rateCardId: string | null, validUntil: string) => void;
  generating: boolean;
  customerPricingType?: string;
}

export function GenerateQuoteModal({
  open,
  onOpenChange,
  onGenerate,
  generating,
  customerPricingType,
}: GenerateQuoteModalProps) {
  const { data: rateCards = [] } = useRateCards();
  const defaultCard = rateCards.find(c => c.is_default);
  const [selectedRateCardId, setSelectedRateCardId] = useState<string>("");
  const [validUntil, setValidUntil] = useState(() => format(addDays(new Date(), 30), "yyyy-MM-dd"));

  useEffect(() => {
    if (defaultCard && !selectedRateCardId) {
      setSelectedRateCardId(defaultCard.id);
    }
  }, [defaultCard, selectedRateCardId]);

  const handleGenerate = () => {
    onGenerate(selectedRateCardId || null, validUntil);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Generate Quote
          </DialogTitle>
          <DialogDescription>
            Select a rate card and generate a priced quote from the optimized schedule.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs">Rate Card</Label>
            <Select value={selectedRateCardId} onValueChange={setSelectedRateCardId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select rate card..." />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {rateCards.map(card => (
                  <SelectItem key={card.id} value={card.id}>
                    {card.name} {card.is_default ? "(Default)" : ""}
                  </SelectItem>
                ))}
                {customerPricingType === "rate_sheet" && (
                  <SelectItem value="rate_sheet">Use Customer Rate Sheet</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Quote Valid Until</Label>
            <Input
              type="date"
              className="mt-1"
              value={validUntil}
              onChange={e => setValidUntil(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={generating || !selectedRateCardId}>
            {generating ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              "Generate"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
