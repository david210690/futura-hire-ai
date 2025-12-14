import { useState, useEffect } from "react";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Plus,
  Brain,
  MessageSquare,
  AlertTriangle
} from "lucide-react";
import {
  DEPARTMENTS,
  CATEGORIES,
  SENIORITY_LEVELS,
  ROLE_DNA_DIMENSIONS
} from "@/lib/questionBank";

interface Question {
  id: string;
  department: string;
  category: string;
  seniority: string;
  question_text: string;
  intent: string;
  role_dna_dimension: string;
  difficulty: string;
  nd_safe: boolean;
  question_bank_answer_rubrics?: Array<{
    what_good_looks_like: any;
    followup_probes: any;
    bias_traps_to_avoid: any;
  }>;
}

export default function QuestionBankLibrary() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [department, setDepartment] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [seniority, setSeniority] = useState<string>("all");
  const [roleDnaDimension, setRoleDnaDimension] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setUser(user);
      await fetchQuestions();
    };
    init();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchQuestions();
    }
  }, [department, category, seniority, roleDnaDimension, user]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('question_bank_questions')
        .select(`
          *,
          question_bank_answer_rubrics (
            what_good_looks_like,
            followup_probes,
            bias_traps_to_avoid
          )
        `, { count: 'exact' });

      if (department !== "all") {
        query = query.eq('department', department);
      }
      if (category !== "all") {
        query = query.eq('category', category);
      }
      if (seniority !== "all") {
        query = query.eq('seniority', seniority);
      }
      if (roleDnaDimension !== "all") {
        query = query.eq('role_dna_dimension', roleDnaDimension);
      }

      query = query.order('department').order('category').limit(100);

      const { data, error, count } = await query;

      if (error) throw error;

      setQuestions(data || []);
      setTotal(count || 0);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestion = (id: string) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedQuestions(newExpanded);
  };

  const filteredQuestions = questions.filter(q =>
    searchQuery === "" ||
    q.question_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.intent.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'behavioral': return 'bg-blue-100 text-blue-700';
      case 'role_specific': return 'bg-purple-100 text-purple-700';
      case 'execution': return 'bg-green-100 text-green-700';
      case 'culture_nd_safe': return 'bg-pink-100 text-pink-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'low': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      case 'high': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <SidebarLayout userRole="recruiter" userName={user?.user_metadata?.name}>
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />
            Question Bank Library
          </h1>
          <p className="text-muted-foreground">
            Browse and manage interview questions across departments, aligned with Role DNA dimensions.
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Select value={department} onValueChange={setDepartment}>
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

              <Select value={category} onValueChange={setCategory}>
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

              <Select value={seniority} onValueChange={setSeniority}>
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

              <Select value={roleDnaDimension} onValueChange={setRoleDnaDimension}>
                <SelectTrigger>
                  <SelectValue placeholder="Role DNA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dimensions</SelectItem>
                  {ROLE_DNA_DIMENSIONS.map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            Showing {filteredQuestions.length} of {total} questions
          </p>
        </div>

        {/* Questions List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : filteredQuestions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-medium mb-1">No questions found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your filters or add new questions.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredQuestions.map((q) => (
              <Collapsible
                key={q.id}
                open={expandedQuestions.has(q.id)}
                onOpenChange={() => toggleQuestion(q.id)}
              >
                <Card>
                  <CollapsibleTrigger className="w-full text-left">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 pr-4">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge variant="outline">{q.department}</Badge>
                            <Badge className={getCategoryColor(q.category)}>
                              {q.category.replace('_', ' ')}
                            </Badge>
                            <Badge variant="secondary">{q.seniority}</Badge>
                            <Badge className={getDifficultyColor(q.difficulty)}>
                              {q.difficulty}
                            </Badge>
                            {q.nd_safe && (
                              <Badge variant="outline" className="text-green-600 border-green-300">
                                ND-Safe
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium">{q.question_text}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            <Brain className="inline h-3 w-3 mr-1" />
                            {q.role_dna_dimension.replace(/_/g, ' ')} • {q.intent}
                          </p>
                        </div>
                        {expandedQuestions.has(q.id) ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                        )}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      {q.question_bank_answer_rubrics?.[0] && (
                        <div className="grid md:grid-cols-3 gap-4 mt-2">
                          <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3">
                            <h4 className="text-xs font-semibold text-green-700 dark:text-green-300 mb-2">
                              What Good Looks Like
                            </h4>
                            <ul className="text-sm space-y-1">
                              {q.question_bank_answer_rubrics[0].what_good_looks_like?.map((item, i) => (
                                <li key={i}>• {item}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3">
                            <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">
                              Follow-up Probes
                            </h4>
                            <ul className="text-sm space-y-1">
                              {q.question_bank_answer_rubrics[0].followup_probes?.map((item, i) => (
                                <li key={i}>• {item}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3">
                            <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Bias Traps to Avoid
                            </h4>
                            <ul className="text-sm space-y-1">
                              {q.question_bank_answer_rubrics[0].bias_traps_to_avoid?.map((item, i) => (
                                <li key={i}>• {item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        )}
      </main>
    </SidebarLayout>
  );
}
