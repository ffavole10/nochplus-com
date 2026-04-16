import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, ResponsiveContainer } from "recharts";
import { Users, Clock, LogIn, Trophy, Activity, ChevronRight } from "lucide-react";
import { formatDistanceToNow, subDays, startOfDay, format } from "date-fns";

type TimeRange = "today" | "7d" | "30d" | "90d";

type ActivityLog = {
  id: string;
  user_id: string;
  event_type: string;
  page_path: string | null;
  page_title: string | null;
  action_name: string | null;
  session_id: string | null;
  duration_seconds: number | null;
  metadata: any;
  created_at: string;
};

type UserProfile = {
  user_id: string;
  email: string;
  display_name: string | null;
};

function getRangeStart(range: TimeRange): Date {
  const now = new Date();
  switch (range) {
    case "today": return startOfDay(now);
    case "7d": return subDays(now, 7);
    case "30d": return subDays(now, 30);
    case "90d": return subDays(now, 90);
  }
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function getStatusBadge(lastLogin: Date | null) {
  if (!lastLogin) return <Badge variant="outline" className="text-muted-foreground">No data</Badge>;
  const days = Math.floor((Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 7) return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20">Active</Badge>;
  if (days <= 30) return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/20">Inactive</Badge>;
  return <Badge className="bg-red-500/15 text-red-600 border-red-500/20">Dormant</Badge>;
}

function featureFromPath(path: string): string {
  if (path.includes("partnership-hub")) return "Partnership Hub";
  if (path.includes("service-tickets")) return "Service Desk";
  if (path.includes("campaigns")) return "Campaigns";
  if (path.includes("noch-plus")) return "Noch+";
  if (path.includes("settings")) return "Settings";
  if (path.includes("schedule")) return "Schedule";
  if (path.includes("parts")) return "Parts";
  if (path.includes("estimates")) return "Estimates";
  if (path.includes("submissions")) return "Submissions";
  if (path.includes("dashboard")) return "Dashboard";
  if (path.includes("monitoring")) return "Monitoring";
  return path;
}

export function AnalyticsTab() {
  const [range, setRange] = useState<TimeRange>("7d");
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetailLogs, setUserDetailLogs] = useState<ActivityLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const rangeStart = useMemo(() => getRangeStart(range), [range]);

  useEffect(() => {
    loadData();
  }, [range]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [logsRes, profilesRes] = await Promise.all([
        supabase
          .from("user_activity_logs")
          .select("*")
          .gte("created_at", rangeStart.toISOString())
          .order("created_at", { ascending: false })
          .limit(5000),
        supabase.from("profiles").select("user_id, email, display_name"),
      ]);
      setLogs((logsRes.data as ActivityLog[]) || []);
      setProfiles((profilesRes.data as UserProfile[]) || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const profileMap = useMemo(() => {
    const m = new Map<string, UserProfile>();
    profiles.forEach((p) => m.set(p.user_id, p));
    return m;
  }, [profiles]);

  // KPIs
  const activeUsersToday = useMemo(() => {
    const today = startOfDay(new Date()).toISOString();
    const ids = new Set(logs.filter((l) => l.event_type === "login" && l.created_at >= today).map((l) => l.user_id));
    return ids.size;
  }, [logs]);

  const avgSessionDuration = useMemo(() => {
    const durations = logs.filter((l) => l.duration_seconds && l.duration_seconds > 0).map((l) => l.duration_seconds!);
    if (!durations.length) return "0m";
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    return formatDuration(Math.round(avg));
  }, [logs]);

  const totalLoginsThisWeek = useMemo(() => {
    const weekAgo = subDays(new Date(), 7).toISOString();
    return logs.filter((l) => l.event_type === "login" && l.created_at >= weekAgo).length;
  }, [logs]);

  const mostActiveUser = useMemo(() => {
    const counts = new Map<string, number>();
    logs.forEach((l) => counts.set(l.user_id, (counts.get(l.user_id) || 0) + 1));
    let maxId = "";
    let maxCount = 0;
    counts.forEach((c, id) => { if (c > maxCount) { maxCount = c; maxId = id; } });
    const p = profileMap.get(maxId);
    return p ? (p.display_name || p.email?.split("@")[0] || "Unknown") : "—";
  }, [logs, profileMap]);

  // Daily Active Users chart
  const dauData = useMemo(() => {
    const days = range === "today" ? 1 : range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const data: { date: string; users: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dayStr = format(d, "yyyy-MM-dd");
      const dayLabel = format(d, "MMM d");
      const ids = new Set(
        logs.filter((l) => l.created_at.startsWith(dayStr)).map((l) => l.user_id)
      );
      data.push({ date: dayLabel, users: ids.size });
    }
    return data;
  }, [logs, range]);

  // Most Visited Pages chart
  const pageData = useMemo(() => {
    const counts = new Map<string, number>();
    logs
      .filter((l) => l.event_type === "page_view" && l.page_path && l.action_name !== "page_exit")
      .forEach((l) => {
        const feature = featureFromPath(l.page_path!);
        counts.set(feature, (counts.get(feature) || 0) + 1);
      });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([page, visits]) => ({ page, visits }));
  }, [logs]);

  // User activity table
  const userRows = useMemo(() => {
    const userMap = new Map<string, { logins: ActivityLog[]; all: ActivityLog[]; totalDuration: number }>();
    logs.forEach((l) => {
      if (!userMap.has(l.user_id)) userMap.set(l.user_id, { logins: [], all: [], totalDuration: 0 });
      const u = userMap.get(l.user_id)!;
      u.all.push(l);
      if (l.event_type === "login") u.logins.push(l);
      if (l.duration_seconds) u.totalDuration += l.duration_seconds;
    });

    return Array.from(userMap.entries()).map(([userId, data]) => {
      const profile = profileMap.get(userId);
      const sessions = new Set(data.all.filter((l) => l.session_id).map((l) => l.session_id)).size;
      const lastLogin = data.logins.length ? new Date(data.logins[0].created_at) : null;

      // Most used feature
      const featureCounts = new Map<string, number>();
      data.all
        .filter((l) => l.page_path)
        .forEach((l) => {
          const f = featureFromPath(l.page_path!);
          featureCounts.set(f, (featureCounts.get(f) || 0) + 1);
        });
      let topFeature = "—";
      let topCount = 0;
      featureCounts.forEach((c, f) => { if (c > topCount) { topCount = c; topFeature = f; } });

      return {
        userId,
        name: profile?.display_name || profile?.email?.split("@")[0] || "Unknown",
        email: profile?.email || "",
        lastLogin,
        sessions,
        totalDuration: data.totalDuration,
        topFeature,
      };
    }).sort((a, b) => (b.lastLogin?.getTime() || 0) - (a.lastLogin?.getTime() || 0));
  }, [logs, profileMap]);

  // User detail
  const openUserDetail = async (userId: string) => {
    setSelectedUserId(userId);
    setDetailLoading(true);
    const { data } = await supabase
      .from("user_activity_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    setUserDetailLogs((data as ActivityLog[]) || []);
    setDetailLoading(false);
  };

  const selectedProfile = selectedUserId ? profileMap.get(selectedUserId) : null;

  const detailPages = useMemo(() => {
    const counts = new Map<string, { visits: number; duration: number }>();
    userDetailLogs
      .filter((l) => l.page_path)
      .forEach((l) => {
        const p = l.page_path!;
        if (!counts.has(p)) counts.set(p, { visits: 0, duration: 0 });
        const c = counts.get(p)!;
        c.visits++;
        if (l.duration_seconds) c.duration += l.duration_seconds;
      });
    return Array.from(counts.entries())
      .map(([path, d]) => ({ path, ...d }))
      .sort((a, b) => b.visits - a.visits);
  }, [userDetailLogs]);

  const dauChartConfig = { users: { label: "Active Users", color: "hsl(var(--primary))" } };
  const pageChartConfig = { visits: { label: "Visits", color: "hsl(var(--primary))" } };

  return (
    <div className="space-y-6">
      {/* Header with filter */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Platform Analytics
          </h2>
          <p className="text-sm text-muted-foreground">User activity and usage insights</p>
        </div>
        <Select value={range} onValueChange={(v) => setRange(v as TimeRange)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{activeUsersToday}</p>
                    <p className="text-xs text-muted-foreground">Active Users Today</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{avgSessionDuration}</p>
                    <p className="text-xs text-muted-foreground">Avg. Session Duration</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <LogIn className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalLoginsThisWeek}</p>
                    <p className="text-xs text-muted-foreground">Logins This Week</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold truncate max-w-[140px]">{mostActiveUser}</p>
                    <p className="text-xs text-muted-foreground">Most Active User</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Daily Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={dauChartConfig} className="h-[250px] w-full">
                  <LineChart data={dauData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Most Visited Features</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={pageChartConfig} className="h-[250px] w-full">
                  <BarChart data={pageData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="page" tick={{ fontSize: 11 }} width={120} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="visits" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* User Activity Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">User Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Sessions</TableHead>
                    <TableHead>Total Time</TableHead>
                    <TableHead>Most Used Feature</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No activity data yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    userRows.map((row) => (
                      <TableRow
                        key={row.userId}
                        className="cursor-pointer"
                        onClick={() => openUserDetail(row.userId)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{row.name}</p>
                            <p className="text-xs text-muted-foreground">{row.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.lastLogin ? formatDistanceToNow(row.lastLogin, { addSuffix: true }) : "—"}
                        </TableCell>
                        <TableCell className="text-sm">{row.sessions}</TableCell>
                        <TableCell className="text-sm">{formatDuration(row.totalDuration)}</TableCell>
                        <TableCell className="text-sm">{row.topFeature}</TableCell>
                        <TableCell>{getStatusBadge(row.lastLogin)}</TableCell>
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* User Detail Modal */}
      <Dialog open={!!selectedUserId} onOpenChange={(open) => !open && setSelectedUserId(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {selectedProfile?.display_name || selectedProfile?.email?.split("@")[0] || "User"} — Activity Detail
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold">{userDetailLogs.filter((l) => l.event_type === "login").length}</p>
                    <p className="text-xs text-muted-foreground">Logins</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold">
                      {new Set(userDetailLogs.filter((l) => l.session_id).map((l) => l.session_id)).size}
                    </p>
                    <p className="text-xs text-muted-foreground">Sessions</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold">
                      {formatDuration(userDetailLogs.reduce((s, l) => s + (l.duration_seconds || 0), 0))}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Time</p>
                  </CardContent>
                </Card>
              </div>

              {/* Pages visited */}
              {detailPages.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Pages Visited</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Page</TableHead>
                        <TableHead>Visits</TableHead>
                        <TableHead>Total Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailPages.slice(0, 15).map((p) => (
                        <TableRow key={p.path}>
                          <TableCell className="text-sm font-mono">{p.path}</TableCell>
                          <TableCell className="text-sm">{p.visits}</TableCell>
                          <TableCell className="text-sm">{formatDuration(p.duration)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Recent Activity Timeline */}
              <div>
                <h3 className="text-sm font-medium mb-2">Recent Activity (Last 50 Events)</h3>
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {userDetailLogs.map((l) => (
                    <div key={l.id} className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-muted/50 text-sm">
                      <span className="text-xs text-muted-foreground w-[130px] shrink-0">
                        {format(new Date(l.created_at), "MMM d, HH:mm:ss")}
                      </span>
                      <Badge variant="outline" className="text-xs w-[80px] justify-center shrink-0">
                        {l.event_type}
                      </Badge>
                      <span className="truncate text-muted-foreground">
                        {l.action_name || l.page_path || "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
