import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  FileText, 
  Clock, 
  Target, 
  AlertTriangle, 
  CheckCircle2,
  Shield,
  Printer
} from "lucide-react";

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

export default function InterviewKitPage() {
  const { jobId, candidateId } = useParams<{ jobId: string; candidateId: string }>();
  const navigate = useNavigate();
  const [kit, setKit] = useState<InterviewKit | null>(null);
  const [loading, setLoading] = useState(true);
  const [candidateName, setCandidateName] = useState<string>("");
  const [jobTitle, setJobTitle] = useState<string>("");

  useEffect(() => {
    if (jobId && candidateId) {
      fetchData();
    }
  }, [jobId, candidateId]);

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Fetch kit
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-interview-kit?jobId=${jobId}&candidateId=${candidateId}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      
      if (data.exists) {
        setKit(data.kit);
      }

      // Fetch job details
      const { data: jobData } = await supabase
        .from("job_twin_jobs")
        .select(`job_id, jobs:job_id (title)`)
        .eq("id", jobId!)
        .single();
      
      if (jobData) {
        setJobTitle((jobData as any).jobs?.title || "Unknown Job");
      }

      // Fetch candidate name
      const { data: userData } = await supabase
        .from("users")
        .select("name")
        .eq("id", candidateId!)
        .single();
      
      if (userData) {
        setCandidateName(userData.name || "Unknown Candidate");
      }

    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load interview kit");
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-destructive/10 text-destructive border-destructive/20";
      case "medium": return "bg-warning/10 text-warning border-warning/20";
      case "low": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getCategoryLabel = (category?: string) => {
    switch (category) {
      case "behavioral": return "Behavioral";
      case "role_specific": return "Role Specific";
      case "execution": return "Execution & Judgment";
      case "culture_nd_safe": return "Culture (ND-Safe)";
      default: return category || "General";
    }
  };

  const groupedQuestions = kit?.selected_questions?.reduce((acc, q) => {
    const cat = q.category || "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(q);
    return acc;
  }, {} as Record<string, SelectedQuestion[]>) || {};

  if (loading) {
    return (
      <SidebarLayout userRole="recruiter">
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </SidebarLayout>
    );
  }

  if (!kit) {
    return (
      <SidebarLayout userRole="recruiter">
        <div className="p-6 max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Interview Kit Found</h2>
              <p className="text-muted-foreground">
                Generate an interview kit from the Decision Room to see it here.
              </p>
            </CardContent>
          </Card>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout userRole="recruiter">
      <div className="p-6 max-w-4xl mx-auto print:p-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">{kit.kit_title}</h1>
          <p className="text-muted-foreground">
            Interview Kit for <span className="font-medium">{candidateName}</span> · {jobTitle}
          </p>
        </div>

        {/* ND-safe disclaimer */}
        <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg border border-primary/10 mb-6">
          <Shield className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="font-medium text-sm">Fair Interview Guidelines</p>
            <p className="text-sm text-muted-foreground">
              This kit is a structured guide to help you run a consistent, fair interview. 
              It is not a pass/fail tool. Focus on observable behaviors and evidence, 
              not assumptions.
            </p>
          </div>
        </div>

        {/* Opening Script */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Opening Script</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground italic">"{kit.opening_script}"</p>
          </CardContent>
        </Card>

        {/* Structure */}
        {kit.structure && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Interview Structure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {kit.structure.suggested_rounds?.map((round, idx) => (
                  <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{round.round}</span>
                      <Badge variant="outline">{round.minutes} min</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{round.focus}</p>
                  </div>
                ))}
              </div>
              {kit.structure.time_plan_notes?.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Tips</p>
                  <ul className="text-sm space-y-1">
                    {kit.structure.time_plan_notes.map((note, i) => (
                      <li key={i} className="text-muted-foreground">• {note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Questions grouped by category */}
        <div className="space-y-6 mb-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5" />
            Interview Questions ({kit.selected_questions?.length || 0})
          </h2>

          {Object.entries(groupedQuestions).map(([category, questions]) => (
            <Card key={category}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{getCategoryLabel(category)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {questions.map((q, idx) => (
                  <div key={q.question_id} className="border-b last:border-0 pb-4 last:pb-0">
                    <div className="flex items-start gap-3 mb-2">
                      <span className="text-sm font-medium text-muted-foreground w-6 flex-shrink-0">
                        {idx + 1}.
                      </span>
                      <div className="flex-1">
                        <p className="font-medium mb-2">{q.question_text}</p>
                        <div className="flex gap-2 flex-wrap mb-3">
                          <Badge variant="outline" className={getPriorityColor(q.priority)}>
                            {q.priority} priority
                          </Badge>
                          {q.nd_safe && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                              ND-safe
                            </Badge>
                          )}
                        </div>

                        {/* Why this question */}
                        <div className="mb-3">
                          <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
                            Why This Question
                          </p>
                          <p className="text-sm">{q.why_this_question}</p>
                        </div>

                        {/* What to listen for */}
                        {q.what_to_listen_for?.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-muted-foreground uppercase mb-1 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              What to Listen For
                            </p>
                            <ul className="text-sm space-y-1 ml-4">
                              {q.what_to_listen_for.map((item, i) => (
                                <li key={i} className="list-disc">{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Follow-ups */}
                        {q.suggested_followups?.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
                              Suggested Follow-ups
                            </p>
                            <ul className="text-sm space-y-1 ml-4">
                              {q.suggested_followups.map((item, i) => (
                                <li key={i} className="list-disc text-muted-foreground">{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Bias traps */}
                        {q.bias_traps_to_avoid?.length > 0 && (
                          <div className="bg-destructive/5 p-3 rounded-md">
                            <p className="text-xs font-medium text-destructive uppercase mb-1 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Bias Traps to Avoid
                            </p>
                            <ul className="text-sm space-y-1 ml-4">
                              {q.bias_traps_to_avoid.map((item, i) => (
                                <li key={i} className="list-disc text-muted-foreground">{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Rubric */}
                        {q.rubric?.what_good_looks_like?.length > 0 && (
                          <div className="mt-3 bg-muted/30 p-3 rounded-md">
                            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
                              Evaluation Rubric
                            </p>
                            <ul className="text-sm space-y-1 ml-4">
                              {q.rubric.what_good_looks_like.map((item, i) => (
                                <li key={i} className="list-disc">{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Explainability */}
        {kit.explainability && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">How This Kit Was Generated</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">What Was Evaluated</p>
                <p className="text-sm">{kit.explainability.what_was_evaluated}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Key Factors Considered</p>
                <ul className="text-sm ml-4">
                  {kit.explainability.key_factors_considered?.map((f, i) => (
                    <li key={i} className="list-disc">{f}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-green-500/5 p-3 rounded-md">
                <p className="text-xs font-medium text-green-600 uppercase">
                  Factors Explicitly NOT Considered
                </p>
                <p className="text-sm text-muted-foreground">
                  {kit.explainability.factors_not_considered?.join(" · ")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">Confidence Level:</p>
                <Badge variant="outline">
                  {kit.explainability.confidence_level}
                </Badge>
              </div>
              {kit.explainability.limitations?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Limitations</p>
                  <ul className="text-sm ml-4 text-muted-foreground">
                    {kit.explainability.limitations.map((l, i) => (
                      <li key={i} className="list-disc">{l}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </SidebarLayout>
  );
}
