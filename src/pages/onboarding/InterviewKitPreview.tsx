import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, MessageSquare, ArrowRight, Pencil, UserPlus, LayoutDashboard, Info, Loader2 } from "lucide-react";

interface RoleContext {
  jobId: string;
  roleTitle: string;
  department: string;
  priorities: string[];
}

const SAMPLE_QUESTIONS: Record<string, { question: string; probe: string }[]> = {
  execution: [
    { question: "Tell me about a time you had to deliver a project under a tight deadline.", probe: "What trade-offs did you make?" },
    { question: "Describe your approach to breaking down a large task into manageable pieces.", probe: "How do you track progress?" },
  ],
  communication: [
    { question: "How do you ensure alignment with stakeholders who have different priorities?", probe: "Can you give a specific example?" },
    { question: "Describe a time you had to explain a complex concept to a non-technical audience.", probe: "How did you verify understanding?" },
  ],
  problem_solving: [
    { question: "Walk me through how you approach a problem you've never seen before.", probe: "What resources do you use?" },
    { question: "Tell me about a challenging bug or issue you solved recently.", probe: "What was your debugging process?" },
  ],
  ownership: [
    { question: "Describe a time you took initiative on something outside your defined role.", probe: "What motivated you?" },
    { question: "How do you handle accountability when a project doesn't go as planned?", probe: "What did you learn?" },
  ],
  collaboration: [
    { question: "Tell me about a successful cross-functional project you were part of.", probe: "What was your specific contribution?" },
    { question: "How do you handle disagreements with teammates?", probe: "Can you share a specific example?" },
  ],
};

export default function InterviewKitPreview() {
  const [roleContext, setRoleContext] = useState<RoleContext | null>(null);
  const [questions, setQuestions] = useState<{ question: string; probe: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const contextStr = localStorage.getItem('onboarding_role');
    if (!contextStr) {
      navigate('/onboarding/create-role');
      return;
    }

    const context: RoleContext = JSON.parse(contextStr);
    setRoleContext(context);

    // Generate questions based on priorities
    const generatedQuestions: { question: string; probe: string }[] = [];
    context.priorities.forEach(priority => {
      const priorityQuestions = SAMPLE_QUESTIONS[priority] || [];
      generatedQuestions.push(...priorityQuestions);
    });

    // Add 2 general questions
    generatedQuestions.push(
      { question: "What draws you to this role and our company?", probe: "What specifically resonates with you?" },
      { question: "Where do you see yourself growing in the next 2-3 years?", probe: "How does this role fit into that path?" }
    );

    setQuestions(generatedQuestions.slice(0, 8));
    setLoading(false);
  }, [navigate]);

  if (loading || !roleContext) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            FuturaHire
          </span>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Your interview kit is ready</h1>
          <p className="text-muted-foreground">
            For: <span className="font-medium text-foreground">{roleContext.roleTitle}</span> • {roleContext.department}
          </p>
        </div>

        <Alert className="mb-6 border-primary/20 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            This is a guide, not an evaluation. Use it to explore alignment — not to score candidates.
          </AlertDescription>
        </Alert>

        <Card className="border-0 shadow-xl mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Interview Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {questions.map((q, index) => (
              <div key={index} className="p-4 rounded-lg bg-muted/50 space-y-2">
                <p className="font-medium">
                  {index + 1}. {q.question}
                </p>
                <p className="text-sm text-muted-foreground pl-4 border-l-2 border-primary/30">
                  <span className="font-medium">Probe:</span> {q.probe}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="bg-muted/30 rounded-lg p-4 mb-8">
          <p className="text-sm text-muted-foreground text-center">
            <strong>Bias-aware note:</strong> Focus on observable behaviors and specific examples. 
            Avoid making assumptions based on communication style, background, or career path.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            onClick={() => navigate('/onboarding/invite-candidate')}
            className="gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Invite candidate
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="gap-2"
          >
            <LayoutDashboard className="w-4 h-4" />
            View dashboard
          </Button>
          <Button 
            variant="ghost"
            onClick={() => navigate(`/jobs/${roleContext.jobId}`)}
            className="gap-2"
          >
            <Pencil className="w-4 h-4" />
            Edit role
          </Button>
        </div>
      </div>
    </div>
  );
}
