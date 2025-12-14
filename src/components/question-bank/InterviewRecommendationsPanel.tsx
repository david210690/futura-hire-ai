import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
  Target,
  AlertCircle,
  Brain,
  Shield
} from "lucide-react";

interface RecommendedQuestion {
  question_id: string;
  question_text: string;
  why: string;
  role_dna_dimension: string;
  priority: "high" | "medium" | "low";
}

interface Recommendations {
  recommended_questions: RecommendedQuestion[];
  opening_script: string;
  nd_safe_notes_for_interviewer: string[];
}

interface InterviewRecommendationsPanelProps {
  jobId: string;
  candidateId: string;
  candidateName: string;
}

export function InterviewRecommendationsPanel({
  jobId,
  candidateId,
  candidateName
}: InterviewRecommendationsPanelProps) {
  const { toast } = useToast();
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchLatestRecommendations();
  }, [jobId, candidateId]);

  const fetchLatestRecommendations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('interview_question_recommendations')
        .select('*')
        .eq('job_twin_job_id', jobId)
        .eq('candidate_user_id', candidateId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        setRecommendations(data.recommendations_json as unknown as Recommendations);
      }
    } catch (error) {
      // No recommendations yet
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'generate-interview-recommendations',
        { body: { jobId, candidateId } }
      );

      if (error) throw error;

      setRecommendations(data.recommendations);
      toast({
        title: "Questions generated",
        description: "Interview questions have been personalized for this candidate."
      });
    } catch (error: any) {
      console.error("Error generating recommendations:", error);
      toast({
        title: "Generation failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
      case "medium": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
      case "low": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      default: return "";
    }
  };

  const getDimensionColor = (dimension: string) => {
    const colors: Record<string, string> = {
      cognitive_patterns: "bg-purple-100 text-purple-700",
      communication_style: "bg-blue-100 text-blue-700",
      execution_style: "bg-green-100 text-green-700",
      problem_solving_vectors: "bg-orange-100 text-orange-700",
      culture_alignment: "bg-pink-100 text-pink-700",
      success_signals: "bg-cyan-100 text-cyan-700"
    };
    return colors[dimension] || "bg-gray-100 text-gray-700";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!recommendations) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center">
          <MessageSquare className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <h4 className="font-medium mb-1">No Interview Questions Generated</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Generate personalized questions based on Role DNA and candidate signals.
          </p>
          <Button onClick={generateRecommendations} disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Question Set
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Recommended Interview Questions
            </CardTitle>
            <CardDescription>
              Personalized for {candidateName} • {recommendations.recommended_questions.length} questions
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={generateRecommendations} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Opening Script */}
        {recommendations.opening_script && (
          <div className="bg-primary/5 rounded-lg p-4">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Opening Script
            </h4>
            <p className="text-sm italic">{recommendations.opening_script}</p>
          </div>
        )}

        {/* ND-Safe Notes */}
        {recommendations.nd_safe_notes_for_interviewer?.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Brain className="h-4 w-4" />
              ND-Safe Interview Notes
            </h4>
            <ul className="text-sm space-y-1">
              {recommendations.nd_safe_notes_for_interviewer.map((note, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Questions */}
        <div className="space-y-2">
          {recommendations.recommended_questions.map((q, i) => (
            <Collapsible
              key={q.question_id || i}
              open={expandedQuestions.has(q.question_id)}
              onOpenChange={() => toggleQuestion(q.question_id)}
            >
              <div className="border rounded-lg">
                <CollapsibleTrigger className="w-full p-4 flex items-start justify-between text-left hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`text-xs ${getPriorityColor(q.priority)}`}>
                        {q.priority}
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${getDimensionColor(q.role_dna_dimension)}`}>
                        {q.role_dna_dimension.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium">{q.question_text}</p>
                  </div>
                  {expandedQuestions.has(q.question_id) ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 pt-0">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <h5 className="text-xs font-semibold text-muted-foreground mb-1">
                        Why this question?
                      </h5>
                      <p className="text-sm">{q.why}</p>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
          <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            These questions are suggestions. Always use your judgment and adapt based on the conversation flow.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
