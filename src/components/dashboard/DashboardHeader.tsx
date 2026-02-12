import { Zap, RefreshCw, Download, Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DashboardHeaderProps {
  lastUpdated: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function DashboardHeader({ lastUpdated, searchQuery, onSearchChange }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
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
            <div className="hidden sm:flex items-center relative ml-4">
              <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search chargers..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 w-[240px] bg-background border-border"
              />
            </div>
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
