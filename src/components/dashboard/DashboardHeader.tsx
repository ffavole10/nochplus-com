import { useEffect, useState } from "react";
import { RefreshCw, Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function DashboardHeader() {
  const { session } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState<string | null>(null);

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

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Campaign Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Network Health & Maintenance
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="relative">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-critical text-[10px] text-critical-foreground flex items-center justify-center">
                5
              </span>
            </Button>
            <Button variant="outline" size="icon">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Avatar className="h-9 w-9 cursor-pointer">
              <AvatarImage src={avatarUrl || undefined} alt="Profile" />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {initials || <User className="w-4 h-4" />}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}
