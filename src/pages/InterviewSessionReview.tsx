import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Trophy, Target, TrendingUp, CheckCircle, XCircle, Loader2, ArrowLeft, Play, Calendar
} from "lucide-react";
import { format } from "date-fns";

interface Session {
  id: string;
  role_title: string;
  mode: string;
  difficulty: string;
  status: string;
  total_questions: number | null;
  completed_questions: number | null;
  overall_score: number | null;
  feedback_summary: string | null;
  created_at: string;
}

interface Question {
  id: string;
  question_index: number;
  question_text: string;
  question_type: string;
  ideal_answer_points: string | null;
}

interface Answer {
  id: string;
  question_id: string;
  transcript: string | null;
  score: number | null;
  feedback: string | null;
}

export default function InterviewSessionReview() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Load session
      const { data: sessionData } = await supabase
        .from("interview_simulation_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .single();

      setSession(sessionData as Session);

      // Load questions
      const { data: questionsData } = await supabase
        .from("interview_simulation_questions")
        .select("*")
        .eq("session_id", sessionId)
        .order("question_index");

      setQuestions((questionsData as Question[]) || []);

      // Load answers
      const { data: answersData } = await supabase
        .from("interview_simulation_answers")
        .select("*")
        .eq("session_id", sessionId);

      setAnswers((answersData as Answer[]) || []);

    } catch (error) {
      console.error("Error loading session:", error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-muted-foreground";
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-yellow-600";
    return "text-red-600";
  };

  const getOverallScoreColor = (score: number | null) => {
    if (score === null) return "text-muted-foreground";
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const parseFeedbackSummary = (summary: string | null) => {
    if (!summary) return { text: "", strengths: [], improvements: [], actions: [] };
    
    const sections = summary.split("**");
    let strengths: string[] = [];
    let improvements: string[] = [];
    let actions: string[] = [];
    let currentSection = "";
    
    sections.forEach(section => {
      if (section.includes("Strengths:")) {
        currentSection = "strengths";
      } else if (section.includes("Areas for Improvement:") || section.includes("Improvement")) {
        currentSection = "improvements";
      } else if (section.includes("Action Items:")) {
        currentSection = "actions";
      } else if (currentSection) {
        const items = section.split("•").filter(s => s.trim());
        if (currentSection === "strengths") strengths = items.map(s => s.trim());
        else if (currentSection === "improvements") improvements = items.map(s => s.trim());
        else if (currentSection === "actions") actions = items.map(s => s.trim());
      }
    });

    const firstParagraph = summary.split("\n\n")[0] || summary.substring(0, 200);
    return { text: firstParagraph, strengths, improvements, actions };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-xl font-semibold mb-4">Session Not Found</h2>
          <Button onClick={() => navigate("/interview-practice")}>Back to Practice</Button>
        </div>
      </div>
    );
  }

  const feedback = parseFeedbackSummary(session.feedback_summary);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/interview-practice")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Practice
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{session.role_title}</h1>
              <div className="flex items-center gap-2 text-muted-foreground mt-1">
                <Badge variant="outline" className="capitalize">{session.mode}</Badge>
                <Badge variant="secondary" className="capitalize">{session.difficulty}</Badge>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(session.created_at), "MMMM d, yyyy")}
                </span>
              </div>
            </div>
            <Button onClick={() => navigate("/interview-practice")}>
              <Play className="h-4 w-4 mr-2" />
              New Session
            </Button>
          </div>
        </div>

        {/* Score Overview */}
        <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <Trophy className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <div className={`text-5xl font-bold ${getOverallScoreColor(session.overall_score)}`}>
                    {session.overall_score ?? "—"}
                  </div>
                  <div className="text-muted-foreground">Overall Score</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold">
                  {session.completed_questions || 0}/{session.total_questions || 0}
                </div>
                <div className="text-muted-foreground">Questions Answered</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feedback Summary */}
        {session.feedback_summary && (
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {feedback.strengths.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {feedback.strengths.map((s, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-green-600 mt-1">•</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {feedback.improvements.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-yellow-600">
                    <Target className="h-5 w-5" />
                    Areas for Improvement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {feedback.improvements.map((s, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-yellow-600 mt-1">•</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {feedback.actions.length > 0 && (
              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-blue-600">
                    <TrendingUp className="h-5 w-5" />
                    Action Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="grid md:grid-cols-2 gap-2">
                    {feedback.actions.map((s, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-blue-600 mt-1">•</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Questions & Answers */}
        <Card>
          <CardHeader>
            <CardTitle>Question Review</CardTitle>
            <CardDescription>
              Review each question, your answer, and the feedback
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="space-y-2">
              {questions.map((question) => {
                const answer = answers.find(a => a.question_id === question.id);
                return (
                  <AccordionItem key={question.id} value={question.id} className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-4 text-left">
                        <div className={`text-lg font-bold ${getScoreColor(answer?.score ?? null)}`}>
                          {answer?.score ?? "—"}/10
                        </div>
                        <div>
                          <div className="font-medium">Question {question.question_index}</div>
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {question.question_text}
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                      <div>
                        <h4 className="font-medium mb-2">Question</h4>
                        <p className="text-sm bg-muted p-3 rounded-lg">{question.question_text}</p>
                      </div>

                      {answer ? (
                        <>
                          <div>
                            <h4 className="font-medium mb-2">Your Answer</h4>
                            <p className="text-sm bg-muted p-3 rounded-lg">
                              {answer.transcript || "No transcript available"}
                            </p>
                          </div>

                          {answer.feedback && (
                            <div>
                              <h4 className="font-medium mb-2">Feedback</h4>
                              <p className="text-sm bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg whitespace-pre-wrap">
                                {answer.feedback}
                              </p>
                            </div>
                          )}

                          {question.ideal_answer_points && (
                            <div>
                              <h4 className="font-medium mb-2 text-muted-foreground">Ideal Answer Points</h4>
                              <p className="text-sm bg-green-50 dark:bg-green-950/30 p-3 rounded-lg whitespace-pre-wrap">
                                {question.ideal_answer_points}
                              </p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-sm text-muted-foreground italic">
                          This question was not answered
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
