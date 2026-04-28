import { useState, useEffect } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Crown, Pencil, Users, UserPlus, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AvatarUpload } from "@/components/AvatarUpload";
import { CampaignManagement } from "@/components/settings/CampaignManagement";
import { PartnerManagement } from "@/components/settings/PartnerManagement";
import { DataManagement, DuplicateTicketCleanup } from "@/components/settings/DataManagement";
import { AnalyticsTab } from "@/components/settings/AnalyticsTab";
import { RateCardsTab } from "@/components/settings/RateCardsTab";
import { QuoteRulesTab } from "@/components/settings/QuoteRulesTab";
import { CustomerOverridesTab } from "@/components/settings/CustomerOverridesTab";
import { CustomerRateSheetsTab } from "@/components/settings/CustomerRateSheetsTab";
import { QuoteFlowDiagram } from "@/components/settings/QuoteFlowDiagram";
import { AccessControlTab } from "@/components/settings/AccessControlTab";
import { NeuralOSTab } from "@/components/settings/NeuralOSTab";
import { Switch } from "@/components/ui/switch";
import { SECTION_KEYS, SECTION_LABELS, type SectionKey } from "@/hooks/useSectionAccess";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useRateCards, useQuoteRules, useCustomerOverrides } from "@/hooks/useQuotingSettings";
import { useCustomerRateSheetsList } from "@/hooks/useCustomerRateSheets";

type UserWithRole = {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  company: string | null;
  avatar_url: string | null;
  role: string;
  roles: string[];
  created_at: string;
  last_sign_in_at: string | null;
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-destructive text-destructive-foreground",
  admin: "bg-primary text-primary-foreground",
  manager: "bg-primary text-primary-foreground",
  employee: "bg-secondary text-secondary-foreground",
  customer: "bg-muted text-muted-foreground",
  partner: "bg-accent text-accent-foreground",
  dispatcher: "bg-muted-foreground text-background",
  technician: "bg-sky-500 text-white",
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "super admin",
  admin: "admin",
  manager: "manager",
  employee: "employee",
  customer: "customer",
  partner: "partner",
  technician: "technician",
};

const ROLE_ICONS: Record<string, string> = {
  super_admin: "👑",
  admin: "🛡️",
  manager: "👤",
  employee: "🔧",
  customer: "📋",
  partner: "🤝",
  technician: "🔌",
};

const ASSIGNABLE_ROLES = ["admin", "manager", "employee", "customer", "partner", "technician"];

type SettingsTab = "neural-os" | "campaigns" | "data" | "partners" | "users" | "access" | "quoting" | "analytics";

const TABS: { value: SettingsTab; label: string; tooltip?: string }[] = [
  { value: "neural-os", label: "Neural OS" },
  { value: "campaigns", label: "Campaigns" },
  { value: "data", label: "Data Management" },
  { value: "partners", label: "Partners", tooltip: "Moved to Business → Accounts (Partner filter)" },
  { value: "quoting", label: "Quoting & Rates" },
  { value: "users", label: "Users" },
  { value: "access", label: "Access Control" },
  { value: "analytics", label: "Analytics" },
];

const DEFAULT_ACCESS_BY_ROLE: Record<string, Record<SectionKey, boolean>> = {
  admin: { campaigns: true, service_desk: true, noch_plus: true, partners: true, autoheal: true, growth: true, field_capture: true },
  manager: { campaigns: true, service_desk: true, noch_plus: true, partners: true, autoheal: false, growth: true, field_capture: true },
  employee: { campaigns: false, service_desk: false, noch_plus: true, partners: false, autoheal: false, growth: false, field_capture: false },
  customer: { campaigns: false, service_desk: false, noch_plus: true, partners: false, autoheal: false, growth: false, field_capture: false },
  partner: { campaigns: false, service_desk: false, noch_plus: true, partners: true, autoheal: false, growth: false, field_capture: false },
  technician: { campaigns: false, service_desk: false, noch_plus: false, partners: false, autoheal: false, growth: false, field_capture: true },
};

function QuotingAndRatesSection() {
  const { data: cards = [] } = useRateCards();
  const { data: rules = [] } = useQuoteRules();
  const { data: overrides = [] } = useCustomerOverrides();
  const { data: rateSheets = [] } = useCustomerRateSheetsList();
  const [quotingTab, setQuotingTab] = useState("rate-cards");

  return (
    <div className="space-y-4">
      <Tabs value={quotingTab} onValueChange={setQuotingTab}>
        <TabsList>
          <TabsTrigger value="rate-cards" className="gap-1.5">
            Rate Cards <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">{cards.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="quote-rules" className="gap-1.5">
            Quote Rules <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">{rules.filter(r => r.is_active).length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="customer-overrides" className="gap-1.5">
            Customer Overrides <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">{overrides.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="customer-rate-sheets" className="gap-1.5">
            Customer Rate Sheets <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">{rateSheets.length}</Badge>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="rate-cards"><RateCardsTab /></TabsContent>
        <TabsContent value="quote-rules"><QuoteRulesTab /></TabsContent>
        <TabsContent value="customer-overrides"><CustomerOverridesTab /></TabsContent>
        <TabsContent value="customer-rate-sheets"><CustomerRateSheetsTab /></TabsContent>
      </Tabs>
      <QuoteFlowDiagram />
    </div>
  );
}

const Settings = () => {
  usePageTitle('Settings');
  const navigate = useNavigate();
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("neural-os");
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  
  const [newName, setNewName] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newRole, setNewRole] = useState<string>("employee");
  const [newAccess, setNewAccess] = useState<Record<SectionKey, boolean>>(
    DEFAULT_ACCESS_BY_ROLE.employee,
  );
  const [creating, setCreating] = useState(false);

  // Reset access defaults when role changes
  useEffect(() => {
    setNewAccess(DEFAULT_ACCESS_BY_ROLE[newRole] || DEFAULT_ACCESS_BY_ROLE.employee);
  }, [newRole]);
  // Per-user "add role" selector state
  const [addRoleSelections, setAddRoleSelections] = useState<Record<string, string>>({});

  const callManageUsers = async (body: any) => {
    const { data, error } = await supabase.functions.invoke("manage-users", { body });
    if (error) throw error;
    return data;
  };

  const checkAccess = async () => {
    if (!session) return;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "super_admin");

    if (data && data.length > 0) {
      setIsSuperAdmin(true);
      loadUsers();
    } else {
      toast.error("Access denied. Super Admin only.");
      navigate("/");
    }
  };

  const loadUsers = async () => {
    try {
      const data = await callManageUsers({ action: "list_users" });
      setUsers(data.users || []);
    } catch (err: any) {
      toast.error("Failed to load users: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newEmail) {
      toast.error("Email is required");
      return;
    }
    setCreating(true);
    try {
      await callManageUsers({
        action: "create_user",
        email: newEmail,
        display_name: newName,
        company: newCompany,
        role: newRole,
        section_access: newAccess,
      });
      toast.success("User created — invite email sent with setup link");
      setDialogOpen(false);
      setNewEmail("");
      
      setNewName("");
      setNewCompany("");
      setNewRole("employee");
      loadUsers();
    } catch (err: any) {
      toast.error("Failed to create user: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleAddRole = async (userId: string) => {
    const role = addRoleSelections[userId];
    if (!role) return;
    try {
      await callManageUsers({ action: "add_role", user_id: userId, role });
      toast.success("Role added");
      setAddRoleSelections((prev) => ({ ...prev, [userId]: "" }));
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to add role");
    }
  };

  const handleRemoveRole = async (userId: string, role: string) => {
    const user = users.find((u) => u.user_id === userId);
    if (!user) return;
    if (user.roles.length <= 1) {
      toast.error("User must have at least one role");
      return;
    }
    try {
      await callManageUsers({ action: "remove_role", user_id: userId, role });
      toast.success("Role removed");
      loadUsers();
    } catch (err: any) {
      toast.error("Failed to remove role: " + err.message);
    }
  };

  const { confirm: confirmDialog, dialogProps } = useConfirmDialog();

  const handleDeleteUser = async (userId: string, email: string) => {
    if (userId === session?.user.id) {
      toast.error("Cannot delete your own account");
      return;
    }
    const ok = await confirmDialog({
      title: "Delete User?",
      description: `This will permanently delete user "${email}". This action cannot be undone.`,
      confirmLabel: "Delete User",
    });
    if (!ok) return;
    try {
      await callManageUsers({ action: "delete_user", user_id: userId });
      toast.success("User deleted");
      loadUsers();
    } catch (err: any) {
      toast.error("Failed to delete user: " + err.message);
    }
  };

  const handleSendReset = async (email: string) => {
    try {
      await callManageUsers({ action: "send_reset", email });
      toast.success(`Password reset sent to ${email}`);
    } catch (err: any) {
      toast.error("Failed to send reset: " + err.message);
    }
  };

  useEffect(() => {
    checkAccess();
  }, [session]);

  const getInitials = (name: string | null, email: string) => {
    if (name) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    return email.slice(0, 2).toUpperCase();
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Tab Toggle */}
      <div className="border-b border-border bg-muted/30">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="flex gap-1 py-2">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                title={tab.tooltip}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors inline-flex items-center gap-1.5 ${
                  activeTab === tab.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {tab.label}
                {tab.tooltip && (
                  <span className="px-1 py-0 rounded text-[8px] font-semibold tracking-wider border border-current/30 opacity-70">
                    MOVED
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        {activeTab === "neural-os" && <NeuralOSTab />}
        {activeTab === "campaigns" && <CampaignManagement />}
        {activeTab === "data" && (
          <div className="space-y-6">
            <DataManagement />
            <DuplicateTicketCleanup />
          </div>
        )}
        {activeTab === "partners" && <PartnerManagement />}
        {activeTab === "quoting" && <QuotingAndRatesSection />}
        {activeTab === "analytics" && <AnalyticsTab />}
        {activeTab === "access" && <AccessControlTab users={users.map(u => ({
          user_id: u.user_id,
          email: u.email,
          display_name: u.display_name,
          avatar_url: u.avatar_url,
          roles: u.roles || [],
        }))} />}
        {activeTab === "users" && (
          <>
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Crown className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-foreground">Settings</h1>
                  <Badge variant="outline" className="text-xs font-medium">Super Admin</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Manage users and access permissions</p>
              </div>
            </div>

            {/* User Management Card */}
            <Card className="border-border/60">
              <CardHeader className="flex flex-row items-center justify-between pb-6">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <UserPlus className="h-5 w-5" />
                    User Management
                  </CardTitle>
                  <CardDescription>
                    Assign roles to control what each user can see and do in the application.
                  </CardDescription>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <UserPlus className="h-4 w-4" />
                      Create User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New User</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Email *</Label>
                        <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="user@company.com" />
                      </div>
                      <div className="space-y-2">
                        <Label>Display Name</Label>
                        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="John Doe" />
                      </div>
                      <div className="space-y-2">
                        <Label>Company</Label>
                        <Input value={newCompany} onChange={(e) => setNewCompany(e.target.value)} placeholder="Company name" />
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={newRole} onValueChange={setNewRole}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ASSIGNABLE_ROLES.map((r) => (
                              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 pt-2 border-t border-border">
                        <Label className="text-sm font-semibold">Section Access</Label>
                        <p className="text-xs text-muted-foreground">
                          Choose which platform sections this user can see. Defaults are based on role.
                        </p>
                        <div className="space-y-2 pt-1 max-h-56 overflow-y-auto">
                          {SECTION_KEYS.map((s) => (
                            <div key={s} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                              <span className="text-sm text-foreground">{SECTION_LABELS[s]}</span>
                              <Switch
                                checked={newAccess[s]}
                                onCheckedChange={(v) =>
                                  setNewAccess((prev) => ({ ...prev, [s]: v }))
                                }
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleCreateUser} disabled={creating}>
                        {creating ? "Creating..." : "Create User"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : (
                  <div className="space-y-0">
                    {/* Table Header */}
                    <div className="grid grid-cols-[1fr_100px_180px_200px_120px] gap-4 px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
                      <span>User</span>
                      <span>Status</span>
                      <span>Current Roles</span>
                      <span>Add Role</span>
                      <span className="text-right">Actions</span>
                    </div>

                    {/* User Rows */}
                    {users.map((user) => {
                      const userRoles = user.roles || [user.role];
                      const availableRoles = ASSIGNABLE_ROLES.filter((r) => !userRoles.includes(r));

                      return (
                        <div
                          key={user.user_id}
                          className="grid grid-cols-[1fr_100px_180px_200px_120px] gap-4 px-4 py-4 items-center border-b border-border/50 hover:bg-muted/30 transition-colors"
                        >
                          {/* User info */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative group">
                              <AvatarUpload
                                userId={user.user_id}
                                avatarUrl={user.avatar_url}
                                displayName={user.display_name}
                                size="sm"
                                onUploaded={(url) => {
                                  setUsers((prev) =>
                                    prev.map((u) =>
                                      u.user_id === user.user_id ? { ...u, avatar_url: url } : u
                                    )
                                  );
                                }}
                              />
                              <div className="absolute -top-1 -right-1 bg-background rounded-full p-0.5 shadow-sm border border-border opacity-0 group-hover:opacity-100 transition-opacity">
                                <Pencil className="h-2.5 w-2.5 text-muted-foreground" />
                              </div>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {user.display_name || user.email.split("@")[0]}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            </div>
                          </div>

                          {/* Status */}
                          <div>
                            {user.last_sign_in_at ? (
                              <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 text-xs font-medium">
                                Active
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/20 text-xs font-medium">
                                Invited
                              </Badge>
                            )}
                          </div>

                          {/* Current Roles */}
                          <div className="flex flex-wrap gap-1.5">
                            {userRoles.map((r) => (
                              <Badge
                                key={r}
                                className={`${ROLE_COLORS[r] || "bg-muted text-muted-foreground"} text-xs gap-1 pr-1`}
                              >
                                <span>{ROLE_ICONS[r] || "👤"}</span>
                                <span>{ROLE_LABELS[r] || r}</span>
                                {user.user_id !== session?.user.id && userRoles.length > 1 && (
                                  <button
                                    onClick={() => handleRemoveRole(user.user_id, r)}
                                    className="ml-0.5 hover:bg-background/20 rounded px-0.5 text-xs leading-none"
                                    title="Remove role"
                                  >
                                    ×
                                  </button>
                                )}
                              </Badge>
                            ))}
                          </div>

                          {/* Add Role */}
                          <div className="flex items-center gap-1.5">
                            <Select
                              value={addRoleSelections[user.user_id] || ""}
                              onValueChange={(val) =>
                                setAddRoleSelections((prev) => ({ ...prev, [user.user_id]: val }))
                              }
                            >
                              <SelectTrigger className="h-8 text-xs flex-1">
                                <SelectValue placeholder={availableRoles.length ? "Select" : "All assigned"} />
                              </SelectTrigger>
                              <SelectContent>
                                {availableRoles.map((r) => (
                                  <SelectItem key={r} value={r}>
                                    {ROLE_ICONS[r]} {ROLE_LABELS[r]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 text-xs gap-1"
                              disabled={!addRoleSelections[user.user_id]}
                              onClick={() => handleAddRole(user.user_id)}
                            >
                              <UserPlus className="h-3 w-3" />
                              Add
                            </Button>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-end gap-1">
                            {user.user_id !== session?.user.id && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={`h-8 w-8 ${user.last_sign_in_at ? "text-muted-foreground hover:text-primary" : "text-amber-600 hover:text-amber-700"}`}
                                  title={user.last_sign_in_at ? "Send password reset" : "Resend invite"}
                                  onClick={() => handleSendReset(user.email)}
                                >
                                  <Send className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  title="Delete user"
                                  onClick={() => handleDeleteUser(user.user_id, user.email)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
      <ConfirmDialog {...dialogProps} />
    </div>
  );
};

export default Settings;
