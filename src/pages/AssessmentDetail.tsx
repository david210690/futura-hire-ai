import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Clock, Target, FileText, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AssessmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: assessment, isLoading } = useQuery({
    queryKey: ["assessment", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: questions } = useQuery({
    queryKey: ["assessment-questions", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_questions")
        .select(`
          *,
          question_bank (*)
        `)
        .eq("assessment_id", id)
        .order("order_index");
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">Loading assessment...</div>
        </main>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">Assessment not found</div>
        </main>
      </div>
    );
  }

  const purposeColors: Record<string, string> = {
    screening: "bg-blue-500",
    skills: "bg-purple-500",
    culture: "bg-green-500",
    coding: "bg-orange-500",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/assessments")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Assessments
        </Button>

        <div className="space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-3xl">{assessment.name}</CardTitle>
                  {assessment.description && (
                    <CardDescription className="text-base">
                      {assessment.description}
                    </CardDescription>
                  )}
                </div>
                <Badge className={purposeColors[assessment.purpose] || ""}>
                  {assessment.purpose}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>{assessment.duration_minutes}</strong> minutes
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>{questions?.length || 0}</strong> questions
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>{assessment.total_points}</strong> total points
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    Passing score: <strong>{assessment.passing_score}%</strong>
                  </span>
                </div>
              </div>

              <Separator />

              <div className="flex gap-3">
                <Button>
                  <Share2 className="w-4 h-4 mr-2" />
                  Assign to Candidates
                </Button>
                <Button variant="outline">Preview Assessment</Button>
                <Button variant="outline">Edit</Button>
              </div>
            </CardContent>
          </Card>

          {/* Questions List */}
          <Card>
            <CardHeader>
              <CardTitle>Questions ({questions?.length || 0})</CardTitle>
              <CardDescription>
                Review the questions included in this assessment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {questions?.map((aq: any, index: number) => {
                const q = aq.question_bank;
                return (
                  <div key={aq.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3 flex-1">
                        <span className="font-semibold text-muted-foreground">
                          Q{index + 1}.
                        </span>
                        <div className="flex-1 space-y-2">
                          <p className="font-medium">{q.question}</p>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">{q.type}</Badge>
                            <Badge variant="outline">{q.difficulty}</Badge>
                            <Badge variant="secondary">{q.points} pts</Badge>
                            {q.skill_tags?.map((tag: string) => (
                              <Badge key={tag} variant="secondary">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {q.type === "mcq" && q.options && (
                      <div className="ml-8 space-y-1">
                        {JSON.parse(q.options as string).map((opt: string, i: number) => (
                          <div key={i} className="text-sm text-muted-foreground">
                            {String.fromCharCode(65 + i)}. {opt}
                          </div>
                        ))}
                      </div>
                    )}

                    {q.rubric && (
                      <div className="ml-8 text-sm">
                        <span className="font-medium">Rubric: </span>
                        <span className="text-muted-foreground">
                          {JSON.parse(q.rubric as string).criteria?.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {!questions || questions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No questions found in this assessment
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AssessmentDetail;
