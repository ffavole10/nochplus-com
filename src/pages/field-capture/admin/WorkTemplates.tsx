import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Pencil, Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import {
  ISSUE_CATEGORY_LABELS,
  ROOT_CAUSE_LABELS,
  type ChargerIssueCategory,
  type ChargerRootCause,
} from "@/types/fieldCapture";

interface Template {
  id: string;
  issue_category: ChargerIssueCategory | null;
  root_cause: ChargerRootCause | null;
  template_text: string;
  is_active: boolean;
  is_fallback: boolean;
  priority: number;
  updated_at: string;
  updated_by: string | null;
}

const ISSUE_KEYS = Object.keys(ISSUE_CATEGORY_LABELS) as ChargerIssueCategory[];
const ROOT_KEYS = Object.keys(ROOT_CAUSE_LABELS) as ChargerRootCause[];

export default function WorkTemplates() {
  usePageTitle("Work Description Templates");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Template> | null>(null);
  const { confirm: confirmDialog, dialogProps: confirmDialogProps } = useConfirmDialog();

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("work_description_templates")
      .select("*")
      .order("is_fallback", { ascending: true })
      .order("issue_category", { ascending: true });
    if (error) {
      toast.error(error.message);
    } else {
      setTemplates((data as Template[]) ?? []);
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const fallback = templates.find((t) => t.is_fallback);
  const specific = templates.filter((t) => !t.is_fallback);

  const matrix = useMemo(() => {
    const m = new Map<string, Template>();
    for (const t of specific) {
      if (t.issue_category && t.root_cause && t.is_active) {
        m.set(`${t.issue_category}__${t.root_cause}`, t);
      }
    }
    return m;
  }, [specific]);

  async function save(t: Partial<Template>) {
    const text = (t.template_text ?? "").trim();
    if (text.length < 50) {
      toast.error("Template must be at least 50 characters");
      return;
    }
    if (!t.is_fallback && (!t.issue_category || !t.root_cause)) {
      toast.error("Issue Category and Root Cause are required");
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const payload = {
      issue_category: t.is_fallback ? null : t.issue_category!,
      root_cause: t.is_fallback ? null : t.root_cause!,
      template_text: text,
      is_active: t.is_active ?? true,
      is_fallback: !!t.is_fallback,
      priority: t.priority ?? 0,
      updated_by: userData.user?.id ?? null,
      updated_at: new Date().toISOString(),
    };
    const res = t.id
      ? await supabase
          .from("work_description_templates")
          .update(payload)
          .eq("id", t.id)
      : await supabase.from("work_description_templates").insert(payload);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success("Template saved");
    setEditing(null);
    load();
  }

  async function toggleActive(t: Template) {
    const { error } = await supabase
      .from("work_description_templates")
      .update({ is_active: !t.is_active })
      .eq("id", t.id);
    if (error) toast.error(error.message);
    else load();
  }

  async function remove(t: Template) {
    const ok = await confirmDialog({
      title: "Delete template?",
      description: "Delete this template? This cannot be undone.",
      confirmLabel: "Delete template",
      variant: "destructive",
    });
    if (!ok) return;
    const { error } = await supabase
      .from("work_description_templates")
      .delete()
      .eq("id", t.id);
    if (error) toast.error("Failed to delete template", { description: error.message });
    else {
      toast.success("Template deleted");
      load();
    }
  }

  return (
    <div className="p-6 space-y-8">
      <ConfirmDialog {...confirmDialogProps} />
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Work Description Templates</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Professional templates that auto-populate when technicians describe
            work performed.
          </p>
        </div>
        <Button
          onClick={() =>
            setEditing({
              template_text: "",
              is_active: true,
              is_fallback: false,
            })
          }
        >
          <Plus className="h-4 w-4 mr-1" /> Add Template
        </Button>
      </header>

      {/* Coverage Matrix */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Coverage Matrix</h2>
        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="bg-muted/40">Issue \ Root Cause</TableHead>
                {ROOT_KEYS.map((rc) => (
                  <TableHead key={rc} className="text-center text-xs">
                    {ROOT_CAUSE_LABELS[rc]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {ISSUE_KEYS.map((ic) => (
                <TableRow key={ic}>
                  <TableCell className="font-medium text-xs bg-muted/20">
                    {ISSUE_CATEGORY_LABELS[ic]}
                  </TableCell>
                  {ROOT_KEYS.map((rc) => {
                    const t = matrix.get(`${ic}__${rc}`);
                    return (
                      <TableCell
                        key={rc}
                        className="text-center cursor-pointer hover:bg-muted/40"
                        onClick={() =>
                          setEditing(
                            t ?? {
                              issue_category: ic,
                              root_cause: rc,
                              template_text: "",
                              is_active: true,
                              is_fallback: false,
                            },
                          )
                        }
                      >
                        {t ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                            <Check className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            Missing
                          </span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Templates list */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">All Templates</h2>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Issue</TableHead>
                  <TableHead>Root Cause</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {specific.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Badge variant="secondary">
                        {t.issue_category
                          ? ISSUE_CATEGORY_LABELS[t.issue_category]
                          : "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {t.root_cause ? ROOT_CAUSE_LABELS[t.root_cause] : "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-md">
                      {t.template_text.slice(0, 100)}
                      {t.template_text.length > 100 ? "…" : ""}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(t.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {t.is_active ? (
                        <Badge className="bg-emerald-600">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditing(t)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleActive(t)}
                        >
                          {t.is_active ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => remove(t)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {specific.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground text-sm py-8"
                    >
                      No templates yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Fallback */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Fallback Template</h2>
        <p className="text-xs text-muted-foreground">
          Used when no specific template matches the technician's selections.
        </p>
        <div className="border rounded-lg p-4 bg-muted/20">
          {fallback ? (
            <>
              <p className="text-sm whitespace-pre-wrap">
                {fallback.template_text}
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(fallback)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit Fallback
                </Button>
              </div>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() =>
                setEditing({
                  template_text: "",
                  is_active: true,
                  is_fallback: true,
                })
              }
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Create Fallback
            </Button>
          )}
        </div>
      </section>

      {/* Edit Modal */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? "Edit Template" : "New Template"}
            </DialogTitle>
            <DialogDescription>
              Write in the voice of a senior field engineer. Professional,
              clear, technical but accessible. Avoid fluff.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              {!editing.is_fallback && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Issue Category *</Label>
                    <Select
                      value={editing.issue_category ?? ""}
                      onValueChange={(v) =>
                        setEditing({
                          ...editing,
                          issue_category: v as ChargerIssueCategory,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {ISSUE_KEYS.map((k) => (
                          <SelectItem key={k} value={k}>
                            {ISSUE_CATEGORY_LABELS[k]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Root Cause *</Label>
                    <Select
                      value={editing.root_cause ?? ""}
                      onValueChange={(v) =>
                        setEditing({
                          ...editing,
                          root_cause: v as ChargerRootCause,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROOT_KEYS.map((k) => (
                          <SelectItem key={k} value={k}>
                            {ROOT_CAUSE_LABELS[k]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Template Text * (min 50 chars)</Label>
                <Textarea
                  value={editing.template_text ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, template_text: e.target.value })
                  }
                  className="min-h-[180px]"
                />
                <div className="text-xs text-muted-foreground">
                  {(editing.template_text ?? "").length} characters
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={editing.is_active ?? true}
                  onCheckedChange={(v) =>
                    setEditing({ ...editing, is_active: v })
                  }
                />
                <Label className="cursor-pointer">Active</Label>
              </div>

              {(editing.template_text ?? "").length > 0 && (
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    Technician preview
                  </div>
                  <p className="text-sm whitespace-pre-wrap">
                    {editing.template_text}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => editing && save(editing)}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
