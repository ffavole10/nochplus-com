import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Trash2, Save, X, Search } from "lucide-react";
import { toast } from "sonner";
import {
  useKnowledgeBase, useSeedKnowledgeBase,
  useAddKBItem, useUpdateKBItem, useDeleteKBItem,
  type KBItem,
} from "@/hooks/useKnowledgeBase";
import { KB_CATEGORIES, KB_CATEGORY_BADGE_CLASSES, type KBCategory } from "@/constants/nochPlusTiers";
import { cn } from "@/lib/utils";

type Filter = "All" | KBCategory;

export function KnowledgeBaseTab() {
  const { data: items = [], isLoading } = useKnowledgeBase();
  const seedKB = useSeedKnowledgeBase();
  const addItem = useAddKBItem();
  const updateItem = useUpdateKBItem();
  const deleteItem = useDeleteKBItem();

  const [filter, setFilter] = useState<Filter>("All");
  const [search, setSearch] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newCategory, setNewCategory] = useState<KBCategory>("Commercial");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");
  const [editCategory, setEditCategory] = useState<KBCategory>("Commercial");

  // Auto-seed if empty
  useEffect(() => {
    if (!isLoading && items.length === 0 && !seedKB.isPending) {
      seedKB.mutate(undefined, {
        onSuccess: () => toast.success("Knowledge Base loaded with the full Q&A library."),
      });
    }
  }, [isLoading, items.length]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: items.length };
    KB_CATEGORIES.forEach((cat) => { c[cat] = items.filter((i) => i.category === cat).length; });
    return c;
  }, [items]);

  const filtered = items.filter((item) => {
    if (filter !== "All" && item.category !== filter) return false;
    if (!search) return true;
    const lower = search.toLowerCase();
    return item.question.toLowerCase().includes(lower) || item.answer.toLowerCase().includes(lower);
  });

  const handleAdd = () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      toast.error("Both question and answer are required.");
      return;
    }
    addItem.mutate({ question: newQuestion, answer: newAnswer, category: newCategory }, {
      onSuccess: () => {
        setNewQuestion("");
        setNewAnswer("");
        toast.success("Q&A added to Knowledge Base.");
      },
    });
  };

  const startEdit = (item: KBItem) => {
    setEditingId(item.id);
    setEditQuestion(item.question);
    setEditAnswer(item.answer);
    setEditCategory(item.category);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    updateItem.mutate({ id: editingId, question: editQuestion, answer: editAnswer, category: editCategory }, {
      onSuccess: () => {
        setEditingId(null);
        toast.success("Q&A updated.");
      },
    });
  };

  const handleDelete = (id: string) => {
    deleteItem.mutate(id, {
      onSuccess: () => toast.success("Q&A removed."),
    });
  };

  const filterPills: Filter[] = ["All", ...KB_CATEGORIES];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {filterPills.map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
            className="text-xs"
          >
            {f} <span className="ml-1.5 opacity-70">({counts[f] ?? 0})</span>
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search questions and answers..."
          className="pl-10"
        />
      </div>

      {/* Add New */}
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add New Q&A
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3">
            <Input
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Question — e.g. What happens if you miss the response window?"
            />
            <Select value={newCategory} onValueChange={(v) => setNewCategory(v as KBCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {KB_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value)}
            placeholder="Answer — provide a clear, concise response..."
            rows={3}
          />
          <Button onClick={handleAdd} disabled={addItem.isPending}>
            <Plus className="h-4 w-4 mr-1" /> Add to Knowledge Base
          </Button>
        </CardContent>
      </Card>

      {/* Q&A List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{filtered.length} items</p>
        </div>
        {filtered.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4">
              {editingId === item.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3">
                    <Input value={editQuestion} onChange={(e) => setEditQuestion(e.target.value)} />
                    <Select value={editCategory} onValueChange={(v) => setEditCategory(v as KBCategory)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KB_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea value={editAnswer} onChange={(e) => setEditAnswer(e.target.value)} rows={3} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveEdit} disabled={updateItem.isPending}>
                      <Save className="h-3.5 w-3.5 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                      <X className="h-3.5 w-3.5 mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <Badge variant="outline" className={cn("text-[10px] font-medium", KB_CATEGORY_BADGE_CLASSES[item.category])}>
                          {item.category}
                        </Badge>
                        <p className="font-semibold text-sm">{item.question}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.answer}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(item)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
