import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { User, LogOut, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { NotificationBell } from "@/components/NotificationBell";
import { useCampaignContext } from "@/contexts/CampaignContext";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/dataset": "Dataset",
  "/kanban": "Kanban",
  "/tickets": "Tickets",
  "/schedule": "Schedule",
  "/settings": "Settings",
};

export function PlatformHeader() {
  const { session } = useAuth();
  const location = useLocation();
  const { selectedCampaignName, setSelectedCampaignName } = useCampaignContext();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const pageTitle = PAGE_TITLES[location.pathname] || "Dashboard";

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase
      .from("profiles")
      .select("avatar_url, display_name")
      .eq("user_id", session.user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setAvatarUrl(data.avatar_url);
          if (data.display_name) {
            setInitials(
              data.display_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
            );
          }
        }
      });
  }, [session?.user?.id]);

  const startEditing = () => {
    setEditValue(selectedCampaignName);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const confirmEdit = () => {
    if (editValue.trim()) {
      setSelectedCampaignName(editValue.trim());
    }
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/50">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold text-foreground whitespace-nowrap">{pageTitle}</h1>
          {selectedCampaignName && (
            <>
              <span className="text-lg text-muted-foreground font-light">|</span>
              {isEditing ? (
                <div className="flex items-center gap-1">
                  <Input
                    ref={inputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") confirmEdit();
                      if (e.key === "Escape") cancelEdit();
                    }}
                    className="h-7 text-sm w-[260px]"
                  />
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={confirmEdit}>
                    <Check className="h-3.5 w-3.5 text-primary" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelEdit}>
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ) : (
                <button
                  onClick={startEditing}
                  className="flex items-center gap-1.5 group min-w-0"
                >
                  <span className="text-sm text-muted-foreground truncate max-w-[300px]">
                    {selectedCampaignName}
                  </span>
                  <Pencil className="h-3 w-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell />
          <Avatar className="h-9 w-9 cursor-pointer">
            <AvatarImage src={avatarUrl || undefined} alt="Profile" />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {initials || <User className="w-4 h-4" />}
            </AvatarFallback>
          </Avatar>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
