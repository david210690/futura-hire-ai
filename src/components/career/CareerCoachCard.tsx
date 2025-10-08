import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Lightbulb, Target, MessageSquare, Loader2 } from "lucide-react";

interface CareerCoachCardProps {
  candidateId: string;
  resumeText?: string;
}

export const CareerCoachCard = ({ candidateId, resumeText }: CareerCoachCardProps) => {
  const [feedback, setFeedback] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLatestFeedback();
  }, [candidateId]);

  const loadLatestFeedback = async () => {
    const { data } = await supabase
      .from('career_coach_feedback')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setFeedback(data);
  };

  const generateFeedback = async () => {
    if (!resumeText) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('career-coach', {
        body: { candidateId, resumeText }
      });

      if (error) throw error;

      await loadLatestFeedback();
    } catch (error: any) {
      console.error('Failed to generate feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!feedback && !resumeText) {
    return null;
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle>AI Career Coach</CardTitle>
          </div>
          {!feedback && (
            <Button onClick={generateFeedback} disabled={loading} size="sm">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Get Feedback
                </>
              )}
            </Button>
          )}
        </div>
        <CardDescription>Personalized insights to improve your profile</CardDescription>
      </CardHeader>
      
      {feedback && (
        <CardContent className="space-y-4">
          {/* Missing Skills */}
          {feedback.missing_skills && feedback.missing_skills.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-warning" />
                <h4 className="font-semibold text-sm">Skills to Learn</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {feedback.missing_skills.map((skill: string, i: number) => (
                  <Badge key={i} variant="outline" className="bg-warning/10 text-warning border-warning/20">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Resume Suggestions */}
          {feedback.resume_suggestions && feedback.resume_suggestions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-sm">Resume Improvements</h4>
              </div>
              <ul className="space-y-2">
                {feedback.resume_suggestions.map((suggestion: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Practice Questions */}
          {feedback.interview_questions && feedback.interview_questions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-success" />
                <h4 className="font-semibold text-sm">Practice Interview Questions</h4>
              </div>
              <ul className="space-y-2">
                {feedback.interview_questions.slice(0, 3).map((question: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-success mt-1">{i + 1}.</span>
                    <span>{question}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button 
            onClick={generateFeedback} 
            disabled={loading}
            variant="outline" 
            size="sm" 
            className="w-full mt-4"
          >
            {loading ? 'Refreshing...' : 'Refresh Feedback'}
          </Button>
        </CardContent>
      )}
    </Card>
  );
};
