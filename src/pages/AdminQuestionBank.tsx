import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Search, Archive, ArchiveRestore, Pencil, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { DEPARTMENTS, CATEGORIES, SENIORITY_LEVELS, ROLE_DNA_DIMENSIONS } from "@/lib/questionBank";
import QuestionBankEditModal from "@/components/admin/QuestionBankEditModal";

interface QuestionItem {
  question: {
    id: string;
    department: string;
    category: string;
    seniority: string;
    question_text: string;
    intent: string | null;
    role_dna_dimension: string;
    difficulty: string;
    nd_safe: boolean;
    is_archived: boolean;
    archived_at: string | null;
    created_at: string;
    updated_at: string;
    created_by_user_id: string | null;
  };
  rubric: {
    id: string;
    what_good_looks_like: string[];
    followup_probes: string[];
    bias_traps_to_avoid: string[];
    notes_for_interviewer: string | null;
  } | null;
}

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

export default function AdminQuestionBank() {
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
  const [items, setItems] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Filters
  const [department, setDepartment] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [seniority, setSeniority] = useState<string>("");
  const [roleDnaDimension, setRoleDnaDimension] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>("");
  const [ndSafeOnly, setNdSafeOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<QuestionItem | null>(null);

  // Check authorization
  useEffect(() => {
    if (!roleLoading && role !== 'admin' && role !== 'recruiter') {
      toast.error("Access denied. Admin or recruiter role required.");
      navigate('/');
    }
  }, [role, roleLoading, navigate]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in");
        return;
      }

      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('pageSize', '20');
      if (showArchived) params.set('includeArchived', 'true');
      if (department) params.set('department', department);
      if (category) params.set('category', category);
      if (seniority) params.set('seniority', seniority);
      if (roleDnaDimension) params.set('roleDnaDimension', roleDnaDimension);
      if (difficulty) params.set('difficulty', difficulty);
      if (ndSafeOnly) params.set('ndSafe', 'true');
      if (debouncedSearch) params.set('search', debouncedSearch);

      const response = await supabase.functions.invoke('admin-question-bank', {
        body: null,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Since invoke doesn't support GET with query params well, use fetch directly
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-question-bank?${params.toString()}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch questions');
      }

      setItems(data.items || []);
      setTotalPages(data.totalPages || 1);
      setTotalItems(data.totalItems || 0);
    } catch (error: any) {
      console.error('Fetch error:', error);
      toast.error(error.message || 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [page, department, category, seniority, roleDnaDimension, difficulty, ndSafeOnly, showArchived, debouncedSearch]);

  useEffect(() => {
    if (role === 'admin' || role === 'recruiter') {
      fetchQuestions();
    }
  }, [fetchQuestions, role]);

  const handleArchive = async (id: string, archive: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-question-bank/${id}/archive`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ archive }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(archive ? 'Question archived' : 'Question restored');
      fetchQuestions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to archive question');
    }
  };

  const handleEdit = (item: QuestionItem) => {
    setEditingItem(item);
    setEditModalOpen(true);
  };

  const handleCreate = () => {
    setEditingItem(null);
    setEditModalOpen(true);
  };

  const handleSave = async (questionData: any, rubricData: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const isEdit = !!editingItem;
      const url = isEdit 
        ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-question-bank/${editingItem.question.id}`
        : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-question-bank`;

      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: questionData, rubric: rubricData }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(isEdit ? 'Question updated' : 'Question created');
      setEditModalOpen(false);
      setEditingItem(null);
      fetchQuestions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save question');
    }
  };

  const resetFilters = () => {
    setDepartment("");
    setCategory("");
    setSeniority("");
    setRoleDnaDimension("");
    setDifficulty("");
    setNdSafeOnly(false);
    setShowArchived(false);
    setSearch("");
    setPage(1);
  };

  if (roleLoading) {
    return (
      <SidebarLayout userRole="recruiter">
        <div className="p-6">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </SidebarLayout>
    );
  }

  if (role !== 'admin' && role !== 'recruiter') {
    return null;
  }

  return (
    <SidebarLayout userRole="recruiter">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              Question Bank Library
            </h1>
            <p className="text-muted-foreground mt-1">
              Curate interview questions and rubrics aligned to Role DNA.
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Question
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Select value={department} onValueChange={(v) => { setDepartment(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {DEPARTMENTS.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={category} onValueChange={(v) => { setCategory(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={seniority} onValueChange={(v) => { setSeniority(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Seniority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {SENIORITY_LEVELS.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={roleDnaDimension} onValueChange={(v) => { setRoleDnaDimension(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Role DNA" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dimensions</SelectItem>
                {ROLE_DNA_DIMENSIONS.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={difficulty} onValueChange={(v) => { setDifficulty(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                {DIFFICULTIES.map(d => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="nd-safe"
                  checked={ndSafeOnly}
                  onCheckedChange={(v) => { setNdSafeOnly(v); setPage(1); }}
                />
                <Label htmlFor="nd-safe" className="text-sm">ND-safe only</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="show-archived"
                  checked={showArchived}
                  onCheckedChange={(v) => { setShowArchived(v); setPage(1); }}
                />
                <Label htmlFor="show-archived" className="text-sm">Show archived</Label>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Reset Filters
            </Button>
          </div>
        </div>

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          Showing {items.length} of {totalItems} questions
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Question</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Seniority</TableHead>
                <TableHead>Role DNA</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No questions found. Try adjusting your filters.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow 
                    key={item.question.id} 
                    className={`cursor-pointer hover:bg-muted/50 ${item.question.is_archived ? 'opacity-60' : ''}`}
                    onClick={() => handleEdit(item)}
                  >
                    <TableCell>
                      <div className="flex items-start gap-2">
                        <span className="line-clamp-2 text-sm">{item.question.question_text}</span>
                        {item.question.nd_safe && (
                          <Badge variant="outline" className="shrink-0 text-xs bg-green-500/10 text-green-600 border-green-500/20">
                            ND
                          </Badge>
                        )}
                        {item.question.is_archived && (
                          <Badge variant="secondary" className="shrink-0 text-xs">
                            Archived
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{item.question.department}</TableCell>
                    <TableCell className="text-sm capitalize">{item.question.category.replace('_', ' ')}</TableCell>
                    <TableCell className="text-sm capitalize">{item.question.seniority}</TableCell>
                    <TableCell className="text-sm capitalize">{item.question.role_dna_dimension.replace('_', ' ')}</TableCell>
                    <TableCell>
                      <Badge variant={
                        item.question.difficulty === 'hard' ? 'destructive' :
                        item.question.difficulty === 'medium' ? 'default' : 'secondary'
                      } className="text-xs capitalize">
                        {item.question.difficulty}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleArchive(item.question.id, !item.question.is_archived)}
                        >
                          {item.question.is_archived ? (
                            <ArchiveRestore className="h-4 w-4" />
                          ) : (
                            <Archive className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <QuestionBankEditModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        item={editingItem}
        onSave={handleSave}
      />
    </SidebarLayout>
  );
}
