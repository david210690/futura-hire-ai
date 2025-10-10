import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Clock, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function TakeAssessmentPage() {
  const { orgSlug, token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [application, setApplication] = useState<any>(null);
  const [assignment, setAssignment] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);

  useEffect(() => {
    fetchAssessment();
  }, [token]);

  useEffect(() => {
    if (timeRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeRemaining]);

  const fetchAssessment = async () => {
    try {
      const { data: appData, error: appError } = await supabase
        .from("applications")
        .select(`
          *,
          jobs!inner(*),
          orgs!inner(*),
          candidates(*)
        `)
        .eq("apply_token", token)
        .single();

      if (appError) throw appError;
      setApplication(appData);

      const { data: assignmentData, error: assignmentError } = await supabase
        .from("assignments")
        .select(`
          *,
          assessments(*)
        `)
        .eq("application_id", appData.id)
        .single();

      if (assignmentError) throw assignmentError;
      setAssignment(assignmentData);

      const { data: questionsData, error: questionsError } = await supabase
        .from("assessment_questions")
        .select(`
          *,
          question_bank(*)
        `)
        .eq("assessment_id", assignmentData.assessment_id)
        .order("order_index");

      if (questionsError) throw questionsError;
      setQuestions(questionsData);

      // Create attempt
      const { data: attemptData, error: attemptError } = await supabase
        .from("attempts")
        .insert({
          assignment_id: assignmentData.id,
        })
        .select()
        .single();

      if (attemptError) throw attemptError;
      setAttemptId(attemptData.id);

      setTimeRemaining(assignmentData.assessments.duration_minutes * 60);
    } catch (error: any) {
      console.error("Error fetching assessment:", error);
      toast({
        title: "Error",
        description: "Failed to load assessment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (!attemptId) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("submit-attempt", {
        body: {
          attempt_id: attemptId,
          answers: Object.entries(answers).map(([questionId, response]) => ({
            question_id: questionId,
            response,
          })),
          time_spent_seconds: (assignment.assessments.duration_minutes * 60) - timeRemaining,
        },
      });

      if (error) throw error;

      toast({
        title: "Assessment submitted",
        description: "Your responses have been recorded. Check your status page for results.",
      });

      navigate(`/c/${orgSlug}/apply/status/${token}`);
    } catch (error: any) {
      console.error("Error submitting assessment:", error);
      toast({
        title: "Error",
        description: "Failed to submit assessment",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!application || !assignment || !questions.length) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Assessment Not Found</CardTitle>
            <CardDescription>
              The assessment you're looking for is not available.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">{assignment.assessments.name}</h1>
              <p className="text-sm text-muted-foreground">
                {application.jobs.title} at {application.orgs.name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className={`font-mono text-lg ${timeRemaining < 300 ? 'text-destructive' : ''}`}>
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="border-b bg-muted/20">
        <div className="container mx-auto px-4 py-3 max-w-4xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Question */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <CardTitle className="text-xl">
                {currentQuestion.question_bank.question}
              </CardTitle>
              <Badge variant="secondary">
                {currentQuestion.question_bank.points} pts
              </Badge>
            </div>
            <CardDescription>
              Type: {currentQuestion.question_bank.type.toUpperCase()} • 
              Difficulty: {currentQuestion.question_bank.difficulty}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* MCQ */}
            {currentQuestion.question_bank.type === "mcq" && (
              <RadioGroup
                value={answers[currentQuestion.question_id] || ""}
                onValueChange={(value) =>
                  handleAnswer(currentQuestion.question_id, value)
                }
              >
                {JSON.parse(currentQuestion.question_bank.options).map(
                  (option: string, idx: number) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <RadioGroupItem
                        value={String.fromCharCode(65 + idx)}
                        id={`option-${idx}`}
                      />
                      <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">
                        {String.fromCharCode(65 + idx)}. {option}
                      </Label>
                    </div>
                  )
                )}
              </RadioGroup>
            )}

            {/* Short Answer */}
            {currentQuestion.question_bank.type === "short" && (
              <Textarea
                placeholder="Type your answer here..."
                value={answers[currentQuestion.question_id] || ""}
                onChange={(e) =>
                  handleAnswer(currentQuestion.question_id, e.target.value)
                }
                rows={4}
              />
            )}

            {/* Essay */}
            {currentQuestion.question_bank.type === "essay" && (
              <Textarea
                placeholder="Type your detailed answer here..."
                value={answers[currentQuestion.question_id] || ""}
                onChange={(e) =>
                  handleAnswer(currentQuestion.question_id, e.target.value)
                }
                rows={8}
              />
            )}

            {/* Coding */}
            {currentQuestion.question_bank.type === "code" && (
              <div className="space-y-2">
                <Label>Your Solution</Label>
                <Textarea
                  placeholder="// Write your code here..."
                  value={answers[currentQuestion.question_id] || ""}
                  onChange={(e) =>
                    handleAnswer(currentQuestion.question_id, e.target.value)
                  }
                  rows={12}
                  className="font-mono"
                />
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
              >
                Previous
              </Button>

              <div className="flex items-center gap-2">
                {answers[currentQuestion.question_id] ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                )}
                <span className="text-sm text-muted-foreground">
                  {answers[currentQuestion.question_id] ? "Answered" : "Not answered"}
                </span>
              </div>

              {currentIndex < questions.length - 1 ? (
                <Button onClick={handleNext}>Next</Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Assessment"
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Question Map */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-sm">Question Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-10 gap-2">
              {questions.map((q, idx) => (
                <Button
                  key={q.id}
                  variant={idx === currentIndex ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentIndex(idx)}
                  className={`relative ${
                    answers[q.question_id] ? "border-green-500" : ""
                  }`}
                >
                  {idx + 1}
                  {answers[q.question_id] && (
                    <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-500" />
                  )}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
