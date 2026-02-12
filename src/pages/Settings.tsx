import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Shield, Trash2, UserCog, Users } from "lucide-react";
import { toast } from "sonner";
import nochLogo from "@/assets/noch-logo-white.png";
import { AvatarUpload } from "@/components/AvatarUpload";

type UserWithRole = {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  company: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-destructive text-destructive-foreground",
  admin: "bg-primary text-primary-foreground",
  manager: "bg-chart-4 text-primary-foreground",
  employee: "bg-secondary text-secondary-foreground",
  customer: "bg-muted text-muted-foreground",
  partner: "bg-accent text-accent-foreground",
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
  employee: "Employee",
  customer: "Customer",
  partner: "Partner",
};

const Settings = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newRole, setNewRole] = useState<string>("employee");
  const [creating, setCreating] = useState(false);

  const callManageUsers = async (body: any) => {
    const { data, error } = await supabase.functions.invoke("manage-users", {
      body,
    });
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
    if (!newEmail || !newPassword) {
      toast.error("Email and password are required");
      return;
    }
    setCreating(true);
    try {
      await callManageUsers({
        action: "create_user",
        email: newEmail,
        password: newPassword,
        display_name: newName,
        company: newCompany,
        role: newRole,
      });
      toast.success("User created successfully");
      setDialogOpen(false);
      setNewEmail("");
      setNewPassword("");
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

  const handleUpdateRole = async (userId: string, role: string) => {
    try {
      await callManageUsers({ action: "update_role", user_id: userId, role });
      toast.success("Role updated");
      loadUsers();
    } catch (err: any) {
      toast.error("Failed to update role: " + err.message);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (userId === session?.user.id) {
      toast.error("Cannot delete your own account");
      return;
    }
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return;
    try {
      await callManageUsers({ action: "delete_user", user_id: userId });
      toast.success("User deleted");
      loadUsers();
    } catch (err: any) {
      toast.error("Failed to delete user: " + err.message);
    }
  };

  useEffect(() => {
    checkAccess();
  }, [session]);

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-6 py-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-primary-foreground hover:bg-primary/80">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6" />
          <div>
            <h1 className="text-lg font-semibold">User Management</h1>
            <p className="text-xs text-primary-foreground/70">Manage employees & customer access</p>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {["super_admin", "admin", "manager", "employee", "customer", "partner"].map((role) => (
            <Card key={role}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {users.filter((u) => u.role === role).length}
                </p>
                <p className="text-xs text-muted-foreground">{ROLE_LABELS[role]}s</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                All Users
              </CardTitle>
              <CardDescription>{users.length} total users</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="user@company.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Password *</Label>
                    <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimum 6 characters" />
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
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="partner">Partner</SelectItem>
                      </SelectContent>
                    </Select>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Photo</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
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
                      </TableCell>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>{user.display_name || "—"}</TableCell>
                      <TableCell>{user.company || "—"}</TableCell>
                      <TableCell>
                        {user.user_id === session?.user.id ? (
                          <Badge className={ROLE_COLORS[user.role]}>{ROLE_LABELS[user.role]}</Badge>
                        ) : (
                          <Select value={user.role} onValueChange={(val) => handleUpdateRole(user.user_id, val)}>
                            <SelectTrigger className="w-[140px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="employee">Employee</SelectItem>
                              <SelectItem value="customer">Customer</SelectItem>
                              <SelectItem value="partner">Partner</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.user_id !== session?.user.id && (
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user.user_id, user.email)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Settings;
