import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { Lock, Crosshair, Ticket, Diamond, Handshake, Zap, History, ShieldCheck, TrendingUp, Wrench } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { SECTION_KEYS, SECTION_LABELS, type SectionKey } from "@/hooks/useSectionAccess";

const SECTION_ICONS: Record<SectionKey, React.ElementType> = {
  campaigns: Crosshair,
  service_desk: Ticket,
  noch_plus: Diamond,
  partners: Handshake,
  autoheal: Zap,
  growth: TrendingUp,
  field_capture: Wrench,
};

type UserRow = {
  user_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  roles: string[];
};

type AccessRow = { user_id: string; section_key: SectionKey; has_access: boolean };
type AuditRow = {
  id: string;
  actor_name: string | null;
  target_user_id: string;
  target_name: string | null;
  section_key: string;
  action: "granted" | "revoked";
  created_at: string;
};

export function AccessControlTab({ users }: { users: UserRow[] }) {
  const { session } = useAuth();
  const [accessRows, setAccessRows] = useState<AccessRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actorName, setActorName] = useState<string>("Admin");
  const [copyFromUser, setCopyFromUser] = useState<string>("");
  const [copyToUser, setCopyToUser] = useState<string>("");
  const { confirm, dialogProps } = useConfirmDialog();

  // Identify super admin user_ids (locked to full access)
  const superAdminIds = useMemo(
    () => new Set(users.filter((u) => u.roles?.includes("super_admin")).map((u) => u.user_id)),
    [users],
  );

  // Identify technician user_ids — Field Capture is locked ON, all other sections locked OFF
  const technicianIds = useMemo(
    () => new Set(users.filter((u) => u.roles?.includes("technician")).map((u) => u.user_id)),
    [users],
  );

  const loadAll = async () => {
    setLoading(true);
    const [accessRes, auditRes] = await Promise.all([
      supabase.from("user_section_access").select("user_id, section_key, has_access"),
      supabase.from("access_audit_log").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setAccessRows((accessRes.data as AccessRow[]) || []);
    setAudit((auditRes.data as AuditRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    // capture caller display name for audit log
    if (session?.user?.id) {
      supabase
        .from("profiles")
        .select("display_name, email")
        .eq("user_id", session.user.id)
        .single()
        .then(({ data }) => setActorName(data?.display_name || data?.email || "Admin"));
    }
  }, [session?.user?.id]);

  // Build a quick lookup: user_id -> section_key -> bool
  const accessMap = useMemo(() => {
    const m: Record<string, Partial<Record<SectionKey, boolean>>> = {};
    for (const r of accessRows) {
      if (!m[r.user_id]) m[r.user_id] = {};
      m[r.user_id][r.section_key] = r.has_access;
    }
    return m;
  }, [accessRows]);

  const hasAccess = (userId: string, section: SectionKey) => {
    if (superAdminIds.has(userId)) return true;
    if (technicianIds.has(userId)) return section === "field_capture";
    return accessMap[userId]?.[section] === true;
  };

  const isLocked = (userId: string, section: SectionKey) => {
    if (superAdminIds.has(userId)) return true;
    if (technicianIds.has(userId)) return true; // every column locked for technicians
    return false;
  };

  const sectionUsers = (section: SectionKey) =>
    users.filter((u) => hasAccess(u.user_id, section));

  const writeAudit = async (target: UserRow, section: SectionKey, granted: boolean) => {
    await supabase.from("access_audit_log").insert({
      actor_user_id: session?.user?.id,
      actor_name: actorName,
      target_user_id: target.user_id,
      target_name: target.display_name || target.email,
      section_key: section,
      action: granted ? "granted" : "revoked",
    });
  };

  const setSingleAccess = async (target: UserRow, section: SectionKey, value: boolean) => {
    if (superAdminIds.has(target.user_id)) return;
    // optimistic update
    setAccessRows((prev) => {
      const others = prev.filter((r) => !(r.user_id === target.user_id && r.section_key === section));
      return [...others, { user_id: target.user_id, section_key: section, has_access: value }];
    });

    const { error } = await supabase
      .from("user_section_access")
      .upsert(
        {
          user_id: target.user_id,
          section_key: section,
          has_access: value,
          granted_by: session?.user?.id,
        },
        { onConflict: "user_id,section_key" },
      );
    if (error) {
      toast.error(`Failed to update access: ${error.message}`);
      loadAll();
      return;
    }
    await writeAudit(target, section, value);
    toast.success(
      `Updated access for ${target.display_name || target.email}: ${SECTION_LABELS[section]} ${value ? "enabled" : "disabled"}`,
    );
    // refresh audit
    const { data: a } = await supabase
      .from("access_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setAudit((a as AuditRow[]) || []);
  };

  const grantAllForSection = async (section: SectionKey) => {
    const targets = users.filter((u) => !superAdminIds.has(u.user_id));
    const rows = targets.map((t) => ({
      user_id: t.user_id,
      section_key: section,
      has_access: true,
      granted_by: session?.user?.id,
    }));
    const { error } = await supabase
      .from("user_section_access")
      .upsert(rows, { onConflict: "user_id,section_key" });
    if (error) {
      toast.error(`Failed: ${error.message}`);
      return;
    }
    await Promise.all(targets.map((t) => writeAudit(t, section, true)));
    toast.success(`Granted ${SECTION_LABELS[section]} to all users`);
    loadAll();
  };

  const revokeAllForSection = async (section: SectionKey) => {
    const ok = await confirm({
      title: `Revoke ${SECTION_LABELS[section]} access?`,
      description: `This will revoke ${SECTION_LABELS[section]} access for all non-super-admin users. Continue?`,
      confirmLabel: "Revoke All",
    });
    if (!ok) return;
    const targets = users.filter((u) => !superAdminIds.has(u.user_id));
    const rows = targets.map((t) => ({
      user_id: t.user_id,
      section_key: section,
      has_access: false,
      granted_by: session?.user?.id,
    }));
    const { error } = await supabase
      .from("user_section_access")
      .upsert(rows, { onConflict: "user_id,section_key" });
    if (error) {
      toast.error(`Failed: ${error.message}`);
      return;
    }
    await Promise.all(targets.map((t) => writeAudit(t, section, false)));
    toast.success(`Revoked ${SECTION_LABELS[section]} from all users`);
    loadAll();
  };

  const copyAccess = async () => {
    if (!copyFromUser || !copyToUser || copyFromUser === copyToUser) {
      toast.error("Pick two different users");
      return;
    }
    const target = users.find((u) => u.user_id === copyToUser);
    if (!target) return;
    if (superAdminIds.has(target.user_id)) {
      toast.error("Cannot overwrite a super admin's access");
      return;
    }
    const sourceMap = accessMap[copyFromUser] || {};
    const rows = SECTION_KEYS.map((s) => ({
      user_id: copyToUser,
      section_key: s,
      has_access:
        superAdminIds.has(copyFromUser) ? true : sourceMap[s] === true,
      granted_by: session?.user?.id,
    }));
    const { error } = await supabase
      .from("user_section_access")
      .upsert(rows, { onConflict: "user_id,section_key" });
    if (error) {
      toast.error(`Failed: ${error.message}`);
      return;
    }
    toast.success(`Copied access to ${target.display_name || target.email}`);
    setCopyFromUser("");
    setCopyToUser("");
    loadAll();
  };

  const getInitials = (u: UserRow) => {
    const base = u.display_name || u.email;
    return base.split(/[ @]/).map((p) => p[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Access Control</h1>
            <p className="text-sm text-muted-foreground">
              Control which platform sections each user can see and access.
            </p>
          </div>
        </div>

        {/* Section overview cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {SECTION_KEYS.map((section) => {
            const Icon = SECTION_ICONS[section];
            const sUsers = sectionUsers(section);
            return (
              <Card key={section} className="border-border/60">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">
                        {SECTION_LABELS[section]}
                      </div>
                      <div className="text-xs text-muted-foreground">{sUsers.length} users</div>
                    </div>
                  </div>
                  <div className="flex -space-x-2">
                    {sUsers.slice(0, 5).map((u) => (
                      <Avatar key={u.user_id} className="h-7 w-7 border-2 border-background">
                        {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                        <AvatarFallback className="text-[10px]">{getInitials(u)}</AvatarFallback>
                      </Avatar>
                    ))}
                    {sUsers.length > 5 && (
                      <div className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                        +{sUsers.length - 5}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick actions */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Bulk grant, revoke, or copy access between users.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Grant All</div>
              <Select onValueChange={(v) => grantAllForSection(v as SectionKey)}>
                <SelectTrigger className="w-44 h-9 text-xs"><SelectValue placeholder="Pick section" /></SelectTrigger>
                <SelectContent>
                  {SECTION_KEYS.map((s) => (
                    <SelectItem key={s} value={s}>{SECTION_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Revoke All</div>
              <Select onValueChange={(v) => revokeAllForSection(v as SectionKey)}>
                <SelectTrigger className="w-44 h-9 text-xs"><SelectValue placeholder="Pick section" /></SelectTrigger>
                <SelectContent>
                  {SECTION_KEYS.map((s) => (
                    <SelectItem key={s} value={s}>{SECTION_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Copy access from</div>
              <Select value={copyFromUser} onValueChange={setCopyFromUser}>
                <SelectTrigger className="w-52 h-9 text-xs"><SelectValue placeholder="Source user" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>{u.display_name || u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Copy to</div>
              <Select value={copyToUser} onValueChange={setCopyToUser}>
                <SelectTrigger className="w-52 h-9 text-xs"><SelectValue placeholder="Target user" /></SelectTrigger>
                <SelectContent>
                  {users
                    .filter((u) => !superAdminIds.has(u.user_id))
                    .map((u) => (
                      <SelectItem key={u.user_id} value={u.user_id}>{u.display_name || u.email}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={copyAccess} disabled={!copyFromUser || !copyToUser}>
              Copy Access
            </Button>
          </CardContent>
        </Card>

        {/* Access matrix */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">User Access Matrix</CardTitle>
            <CardDescription>Toggles auto-save. Super admins are locked to full access.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                      <th className="text-left font-medium py-2 pr-4">User</th>
                      {SECTION_KEYS.map((s) => (
                        <th key={s} className="text-center font-medium py-2 px-3">{SECTION_LABELS[s]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const isSuper = superAdminIds.has(u.user_id);
                      return (
                        <tr key={u.user_id} className="border-b border-border/40 hover:bg-muted/30">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-8 w-8">
                                {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                                <AvatarFallback className="text-[10px]">{getInitials(u)}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-foreground truncate flex items-center gap-1.5">
                                  {u.display_name || u.email.split("@")[0]}
                                  {isSuper && (
                                    <Badge className="bg-destructive text-destructive-foreground text-[9px] px-1.5 py-0">SUPER</Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          {SECTION_KEYS.map((s) => {
                            const checked = hasAccess(u.user_id, s);
                            return (
                              <td key={s} className="text-center py-3 px-3">
                                {isSuper ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="inline-flex items-center gap-1.5 opacity-70 cursor-not-allowed">
                                        <Switch checked disabled />
                                        <Lock className="h-3 w-3 text-muted-foreground" />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>Super admins have full access</TooltipContent>
                                  </Tooltip>
                                ) : (
                                  <Switch
                                    checked={checked}
                                    onCheckedChange={(v) => setSingleAccess(u, s, v)}
                                  />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Audit log */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" />
              Recent Activity
            </CardTitle>
            <CardDescription>Last 50 access changes.</CardDescription>
          </CardHeader>
          <CardContent>
            {audit.length === 0 ? (
              <p className="text-sm text-muted-foreground">No access changes recorded yet.</p>
            ) : (
              <ul className="space-y-2 max-h-72 overflow-y-auto">
                {audit.map((a) => (
                  <li key={a.id} className="text-sm flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
                    <Badge
                      className={
                        a.action === "granted"
                          ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20"
                          : "bg-amber-500/15 text-amber-600 border-amber-500/20"
                      }
                    >
                      {a.action}
                    </Badge>
                    <span className="text-foreground">
                      <strong>{a.actor_name || "Admin"}</strong> {a.action}{" "}
                      <strong>{a.target_name || "a user"}</strong>{" "}
                      access to <strong>{SECTION_LABELS[a.section_key as SectionKey] || a.section_key}</strong>
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <ConfirmDialog {...dialogProps} />
      </div>
    </TooltipProvider>
  );
}
