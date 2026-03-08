import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Loader2, LayoutDashboard, Map, CalendarDays, Database, BarChart3, Ticket, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AssessmentCharger, ViewMode } from "@/types/assessment";
import { parseAssessmentExcel } from "@/lib/assessmentParser";
import { toast } from "sonner";
import nochLogo from "@/assets/noch-logo-white.png";
import { CUSTOMER_LABELS } from "@/data/sampleCampaigns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface CampaignOption {
  id: string;
  name: string;
}

interface AssessmentHeaderProps {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onImport: (chargers: AssessmentCharger[]) => void;
  onExport: () => void;
  onClear: () => void;
  chargerCount: number;
  campaignOptions?: CampaignOption[];
  selectedCampaignId?: string;
  onCampaignChange?: (id: string) => void;
}

export function AssessmentHeader({ view, onViewChange, onImport, onExport, onClear, chargerCount, campaignOptions = [], selectedCampaignId, onCampaignChange }: AssessmentHeaderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { session } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase.
    from("profiles").
    select("avatar_url, display_name").
    eq("user_id", session.user.id).
    single().
    then(({ data }) => {
      if (data) {
        setAvatarUrl(data.avatar_url);
        if (data.display_name) {
          setInitials(data.display_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2));
        }
      }
    });
  }, [session?.user?.id]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    try {
      const chargers = await parseAssessmentExcel(file);
      onImport(chargers);
      toast.success(`✓ ${chargers.length} chargers imported successfully`);
    } catch (error) {
      console.error("Parse error:", error);
      toast.error("Failed to parse file. Check the format.");
    } finally {
      setIsLoading(false);
      e.target.value = "";
    }
  }, [onImport]);

  return (
    <div className="sticky top-0 z-30">
      {/* Top bar - slim */}
      <header className="border-b border-border bg-card px-6 py-2 flex items-center justify-between">
        <img src={nochLogo} alt="Noch Power" className="h-8 brightness-0 dark:brightness-100" />
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate("/")} className="gap-1.5">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Button>
          <Avatar className="h-8 w-8 cursor-pointer">
            <AvatarImage src={avatarUrl || undefined} alt="Profile" />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials || <User className="w-3.5 h-3.5" />}
            </AvatarFallback>
          </Avatar>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Sub-header: title left, tabs right */}
      <div className="bg-background px-6 py-3 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <h1 className="text-[1.35rem] font-semibold text-foreground">Tickets</h1>
          {chargerCount > 0 && (
            <Badge variant="secondary" className="text-xs">{chargerCount} Chargers</Badge>
          )}
        </div>
        <Tabs value={view} onValueChange={(v) => onViewChange(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="dataset" className="gap-1.5">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Dataset</span>
            </TabsTrigger>
            <TabsTrigger value="map" className="gap-1.5">
              <Map className="h-4 w-4" />
              <span className="hidden sm:inline">Map</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-1.5">
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Schedule</span>
            </TabsTrigger>
            <TabsTrigger value="tickets" className="gap-1.5">
              <Ticket className="h-4 w-4" />
              <span className="hidden sm:inline">Tickets</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>);

}