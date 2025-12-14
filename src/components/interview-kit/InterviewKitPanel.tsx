import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, 
  ChevronDown, 
  ChevronRight, 
  Copy, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
  Shield
} from "lucide-react";

interface InterviewKitPanelProps {
  jobId: string;
  candidateId: string;
  candidateName?: string;
}

interface SelectedQuestion {
  question_id: string;
  question_text: string;
  priority: "high" | "medium" | "low";
  why_this_question: string;
  what_to_listen_for: string[];
  suggested_followups: string[];
  bias_traps_to_avoid: string[];
  category?: string;
  role_dna_dimension?: string;
  difficulty?: string;
  nd_safe?: boolean;
  rubric?: {
    what_good_looks_like: string[];
    followup_probes: string[];
    bias_traps_to_avoid: string[];
    notes_for_interviewer?: string;
  };
}

interface InterviewKit {
  kit_title: string;
  opening_script: string;
  selected_questions: SelectedQuestion[];
  structure: {
    suggested_rounds: { round: string; minutes: number; focus: string }[];
    time_plan_notes: string[];
  };
  explainability: {
    what_was_evaluated: string;
    key_factors_considered: string[];
    factors_not_considered: string[];
    confidence_level: "low" | "medium" | "high";
    limitations: string[];
  };
}

const FOCUS_MODES = [
  { value: "balanced", label: "Balanced" },
  { value: "execution", label: "Execution Focus" },
  { value: "communication", label: "Communication Focus" },
  { value: "problem_solving", label: "Problem Solving Focus" },
  { value: "leadership", label: "Leadership Focus" },
  { value: "culture", label: "Culture Focus" },
];

export function InterviewKitPanel({ jobId, candidateId, candidateName }: InterviewKitPanelProps) {
  const [kit, setKit] = useState<InterviewKit | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [focusMode, setFocusMode] = useState("balanced");
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [kitCreatedAt, setKitCreatedAt] = useState<string | null>(null);

  useEffect(() => {
    fetchKit();
  }, [jobId, candidateId]);

  const fetchKit = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke("get-interview-kit", {
        body: null,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      // Build URL with query params manually
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-interview-kit?jobId=${jobId}&candidateId=${candidateId}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      
      const data = await res.json();
      if (data.exists) {
        setKit(data.kit);
        setKitCreatedAt(data.createdAt);
        setFocusMode(data.focusMode || "balanced");
      }
    } catch (error) {
      console.error("Error fetching kit:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateKit = async () => {
    try {
      setGenerating(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in");
        return;
      }

      const response = await supabase.functions.invoke("generate-interview-kit", {
        body: { jobId, candidateId, focusMode },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      if (!data.success) {
        if (data.code === "NO_ROLE_DNA") {
          toast.error(data.message || "Generate Role DNA for this job first.");
        } else {
          toast.error(data.message || "Failed to generate kit");
        }
        return;
      }

      setKit(data.kit);
      setKitCreatedAt(new Date().toISOString());
      toast.success("Interview Kit generated successfully");
    } catch (error) {
      console.error("Error generating kit:", error);
      toast.error("Failed to generate Interview Kit");
    } finally {
      setGenerating(false);
    }
  };

  const toggleQuestion = (questionId: string) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-destructive/10 text-destructive border-destructive/20";
      case "medium": return "bg-warning/10 text-warning border-warning/20";
      case "low": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case "behavioral": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "role_specific": return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "execution": return "bg-green-500/10 text-green-600 border-green-500/20";
      case "culture_nd_safe": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Interview Kit
            </CardTitle>
            <CardDescription>
              {candidateName ? `For ${candidateName}` : "Generate personalized interview questions"}
            </CardDescription>
          </div>
          {kit && kitCreatedAt && (
            <span className="text-xs text-muted-foreground">
              Generated {new Date(kitCreatedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ND-safe disclaimer */}
        <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
          <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            This kit is a structured guide to help you run a consistent, fair interview. 
            It is not a pass/fail tool.
          </p>
        </div>

        {/* Focus mode selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">Focus Mode:</label>
          <Select value={focusMode} onValueChange={setFocusMode}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FOCUS_MODES.map(mode => (
                <SelectItem key={mode.value} value={mode.value}>
                  {mode.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={generateKit} 
            disabled={generating}
            variant={kit ? "outline" : "default"}
            size="sm"
          >
            {generating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : kit ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </>
            ) : (
              "Generate Interview Kit"
            )}
          </Button>
        </div>

        {kit && (
          <div className="space-y-6">
            {/* Title and opening script */}
            <div>
              <h3 className="font-semibold text-lg mb-2">{kit.kit_title}</h3>
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium mb-1">Opening Script</p>
                    <p className="text-sm text-muted-foreground">{kit.opening_script}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => copyToClipboard(kit.opening_script)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Interview structure */}
            {kit.structure && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Suggested Structure
                </h4>
                <div className="flex gap-3 flex-wrap">
                  {kit.structure.suggested_rounds?.map((round, idx) => (
                    <div key={idx} className="bg-muted/50 px-3 py-2 rounded-lg text-sm">
                      <span className="font-medium">{round.round}</span>
                      <span className="text-muted-foreground"> · {round.minutes}min</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{round.focus}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Questions */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Selected Questions ({kit.selected_questions?.length || 0})
              </h4>
              <div className="space-y-3">
                {kit.selected_questions?.map((q, idx) => (
                  <Collapsible 
                    key={q.question_id} 
                    open={expandedQuestions.has(q.question_id)}
                    onOpenChange={() => toggleQuestion(q.question_id)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                        <span className="text-sm font-medium text-muted-foreground w-6">
                          {idx + 1}.
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{q.question_text}</p>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            <Badge variant="outline" className={getPriorityColor(q.priority)}>
                              {q.priority}
                            </Badge>
                            {q.category && (
                              <Badge variant="outline" className={getCategoryColor(q.category)}>
                                {q.category.replace("_", " ")}
                              </Badge>
                            )}
                            {q.nd_safe && (
                              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                                ND-safe
                              </Badge>
                            )}
                          </div>
                        </div>
                        {expandedQuestions.has(q.question_id) ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-9 mt-2 space-y-3 p-3 border-l-2 border-primary/20">
                        {/* Why this question */}
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
                            Why This Question
                          </p>
                          <p className="text-sm">{q.why_this_question}</p>
                        </div>

                        {/* What to listen for */}
                        {q.what_to_listen_for?.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase mb-1 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              What to Listen For
                            </p>
                            <ul className="text-sm space-y-1">
                              {q.what_to_listen_for.map((item, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-primary">•</span>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Follow-ups */}
                        {q.suggested_followups?.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
                              Suggested Follow-ups
                            </p>
                            <ul className="text-sm space-y-1">
                              {q.suggested_followups.map((item, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-muted-foreground">→</span>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Bias traps */}
                        {q.bias_traps_to_avoid?.length > 0 && (
                          <div className="bg-destructive/5 p-2 rounded-md">
                            <p className="text-xs font-medium text-destructive uppercase mb-1 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Bias Traps to Avoid
                            </p>
                            <ul className="text-sm space-y-1">
                              {q.bias_traps_to_avoid.map((item, i) => (
                                <li key={i} className="text-muted-foreground">{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Rubric from question bank */}
                        {q.rubric && (
                          <div className="bg-muted/30 p-2 rounded-md">
                            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
                              Evaluation Rubric
                            </p>
                            {q.rubric.what_good_looks_like?.length > 0 && (
                              <div className="mb-2">
                                <p className="text-xs text-muted-foreground">What good looks like:</p>
                                <ul className="text-sm">
                                  {q.rubric.what_good_looks_like.map((item, i) => (
                                    <li key={i}>• {item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {q.rubric.notes_for_interviewer && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Note: {q.rubric.notes_for_interviewer}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </div>

            {/* Explainability */}
            {kit.explainability && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start text-sm">
                    <ChevronRight className="h-4 w-4 mr-2" />
                    How this kit was generated
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-4 bg-muted/30 rounded-lg space-y-3 mt-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase">What Was Evaluated</p>
                      <p className="text-sm">{kit.explainability.what_was_evaluated}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase">Key Factors Considered</p>
                      <ul className="text-sm">
                        {kit.explainability.key_factors_considered?.map((f, i) => (
                          <li key={i}>• {f}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-green-500/5 p-2 rounded">
                      <p className="text-xs font-medium text-green-600 uppercase">Factors NOT Considered</p>
                      <p className="text-sm text-muted-foreground">
                        {kit.explainability.factors_not_considered?.join(", ")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase">Confidence Level</p>
                      <Badge variant="outline" className={
                        kit.explainability.confidence_level === "high" 
                          ? "bg-green-500/10 text-green-600" 
                          : kit.explainability.confidence_level === "medium"
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-muted text-muted-foreground"
                      }>
                        {kit.explainability.confidence_level}
                      </Badge>
                    </div>
                    {kit.explainability.limitations?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase">Limitations</p>
                        <ul className="text-sm text-muted-foreground">
                          {kit.explainability.limitations.map((l, i) => (
                            <li key={i}>• {l}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
