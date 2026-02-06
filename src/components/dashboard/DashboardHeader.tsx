import { Zap, RefreshCw, Download, Bell, Building2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DashboardHeaderProps {
  lastUpdated: string;
  selectedCustomer: string;
  onCustomerChange: (customer: string) => void;
}

// Preloaded customers - OEMs and CPOs
const customers = [
  { id: "all", name: "All Customers", type: "all" },
  { id: "evgo", name: "EVgo", type: "CPO" },
  { id: "chargepoint", name: "ChargePoint", type: "CPO" },
  { id: "electrify-america", name: "Electrify America", type: "CPO" },
  { id: "tesla", name: "Tesla", type: "OEM" },
  { id: "rivian", name: "Rivian", type: "OEM" },
  { id: "ford", name: "Ford", type: "OEM" },
  { id: "gm", name: "General Motors", type: "OEM" },
  { id: "bp-pulse", name: "BP Pulse", type: "CPO" },
];

export function DashboardHeader({ lastUpdated, selectedCustomer, onCustomerChange }: DashboardHeaderProps) {
  const currentCustomer = customers.find(c => c.id === selectedCustomer) || customers[0];

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                PM Campaign Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                EV Charging Network Health & Maintenance
              </p>
            </div>
          </div>

          {/* Customer Selector */}
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground hidden sm:block" />
            <Select value={selectedCustomer} onValueChange={onCustomerChange}>
              <SelectTrigger className="w-[180px] sm:w-[220px] bg-background border-primary/30 focus:ring-primary">
                <SelectValue placeholder="Select Customer" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border shadow-lg z-[100]">
                {customers.map((customer) => (
                  <SelectItem 
                    key={customer.id} 
                    value={customer.id}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span>{customer.name}</span>
                      {customer.type !== "all" && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          {customer.type}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Last updated: {lastUpdated}
            </span>
            <Button variant="outline" size="icon" className="relative">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-critical text-[10px] text-critical-foreground flex items-center justify-center">
                5
              </span>
            </Button>
            <Button variant="outline" size="icon">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button className="gap-2 hidden sm:flex">
              <Download className="w-4 h-4" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
