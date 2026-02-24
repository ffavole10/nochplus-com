import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Play, Clock, Hash, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AgentPrompt } from "./AgentCard";

const TEST_CASES = [
  { label: "Simple L2 Power Issue", value: "simple-l2" },
  { label: "Complex DCFC Failure", value: "complex-dcfc" },
  { label: "Missing Data Scenario", value: "missing-data" },
  { label: "No SWI Match Case", value: "no-swi" },
];

const SAMPLE_INPUTS: Record<string, object> = {
  "simple-l2": {
    ticket_id: "TKT-2024-001",
    customer_name: "ChargePoint Inc.",
    charger_brand: "BTC Power",
    charger_type: "Level 2",
    serial_number: "BTC-L2-2024-0047",
    photos_count: 3,
    issue_description: "Level 2 charger at Site 47 displaying E-003 error code. Unit stopped charging mid-session. Customer reports intermittent failures over past 2 weeks.",
    warranty_status: "Active",
    charger_age_years: 1.5,
    service_count: 0,
  },
  "complex-dcfc": {
    ticket_id: "TKT-2024-002",
    customer_name: "EVConnect",
    charger_brand: "BTC Power",
    charger_type: "DCFC 180kW",
    serial_number: "BTC-DC180-2022-0112",
    photos_count: 5,
    issue_description: "DCFC unit making unusual buzzing sound from power cabinet. Output power fluctuating between 20-60kW instead of rated 180kW. Multiple CCS connector failures reported. Screen showing communication timeout errors.",
    warranty_status: "Expired",
    charger_age_years: 3.2,
    service_count: 4,
  },
  "missing-data": {
    ticket_id: "TKT-2024-003",
    customer_name: "Unknown",
    charger_brand: "",
    charger_type: "",
    serial_number: "",
    photos_count: 0,
    issue_description: "Charger not working.",
    warranty_status: "Unknown",
    charger_age_years: 0,
    service_count: 0,
  },
  "no-swi": {
    ticket_id: "TKT-2024-004",
    customer_name: "Volta Charging",
    charger_brand: "Volta",
    charger_type: "Level 2 (Non-BTC)",
    serial_number: "VLT-2023-9987",
    photos_count: 2,
    issue_description: "Proprietary Volta advertising display malfunction causing charger lockout. Custom firmware needs reflash. No BTC documentation available.",
    warranty_status: "Active",
    charger_age_years: 0.8,
    service_count: 1,
  },
};

interface AgentTestModalProps {
  agent: AgentPrompt | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgentTestModal({ agent, open, onOpenChange }: AgentTestModalProps) {
  const [input, setInput] = useState(JSON.stringify(SAMPLE_INPUTS["simple-l2"], null, 2));
  const [output, setOutput] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [tokensUsed, setTokensUsed] = useState<number | null>(null);

  const selectTestCase = (caseId: string) => {
    setInput(JSON.stringify(SAMPLE_INPUTS[caseId] || {}, null, 2));
    setOutput("");
    setExecutionTime(null);
    setTokensUsed(null);
  };

  const runTest = async () => {
    if (!agent) return;
    setRunning(true);
    setOutput("");
    const start = Date.now();

    try {
      let parsedInput: Record<string, any>;
      try {
        parsedInput = JSON.parse(input);
      } catch {
        toast.error("Invalid JSON input");
        setRunning(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          messages: [
            { role: "system", content: agent.template },
            { role: "user", content: `Analyze this input data:\n${JSON.stringify(parsedInput, null, 2)}` },
          ],
          temperature: agent.temperature,
          max_tokens: agent.max_tokens,
        },
      });

      const elapsed = Date.now() - start;
      setExecutionTime(elapsed);

      if (error) {
        setOutput(`Error: ${error.message}`);
        toast.error("Test failed: " + error.message);
      } else {
        const responseText = data?.content || data?.choices?.[0]?.message?.content || JSON.stringify(data, null, 2);
        setOutput(responseText);
        setTokensUsed(data?.usage?.total_tokens || null);
        toast.success("Test completed");
      }
    } catch (err: any) {
      setOutput(`Error: ${err.message}`);
      toast.error("Test failed");
    } finally {
      setRunning(false);
    }
  };

  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            Test: {agent.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Test case selector */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Select Test Case:</p>
            <div className="flex flex-wrap gap-2">
              {TEST_CASES.map((tc) => (
                <Button key={tc.value} variant="outline" size="sm" className="text-xs h-7" onClick={() => selectTestCase(tc.value)}>
                  {tc.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Test Input (JSON):</p>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="font-mono text-xs min-h-[200px]"
              placeholder="Paste JSON input data..."
            />
          </div>

          {/* Output */}
          {(output || running) && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Output:</p>
              {running ? (
                <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Running agent...</span>
                </div>
              ) : (
                <pre className="bg-muted/50 border border-border rounded-lg p-4 text-xs font-mono overflow-x-auto max-h-[300px] overflow-y-auto whitespace-pre-wrap">
                  {output}
                </pre>
              )}
            </div>
          )}

          {/* Metrics */}
          {executionTime !== null && (
            <div className="flex gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Execution: {(executionTime / 1000).toFixed(1)}s
              </div>
              {tokensUsed && (
                <div className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5" />
                  Tokens: {tokensUsed.toLocaleString()}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={runTest} disabled={running} className="gap-1.5">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {running ? "Running..." : "Run Test"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
