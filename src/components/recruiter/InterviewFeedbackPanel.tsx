import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";

interface InterviewFeedbackPanelProps {
  candidateId: string;
  jobId: string;
}

interface FeedbackData {
  strengths: string[];
  concerns: string[];
  recommendation: string;
  decision: string;
}

export function InterviewFeedbackPanel({ candidateId, jobId }: InterviewFeedbackPanelProps) {
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);

  useEffect(() => {
    const fetchFeedback = async () => {
      const { data: interview } = await supabase
        .from('interviews')
        .select('id, interview_ratings(*)')
        .eq('candidate_id', candidateId)
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (interview?.interview_ratings?.[0]?.notes) {
        try {
          // Try to parse if it's JSON
          const parsed = JSON.parse(interview.interview_ratings[0].notes);
          if (parsed.strengths && parsed.concerns) {
            setFeedback(parsed);
          }
        } catch {
          // If not JSON, it's formatted text - parse it
          const notes = interview.interview_ratings[0].notes;
          const strengthsMatch = notes.match(/Strengths:\n([\s\S]*?)\n\nConcerns:/);
          const concernsMatch = notes.match(/Concerns:\n([\s\S]*?)\n\nRecommendation:/);
          const recommendationMatch = notes.match(/Recommendation:\n([\s\S]*?)\n\nDecision:/);
          const decisionMatch = notes.match(/Decision: (\w+)/);

          if (strengthsMatch && concernsMatch && recommendationMatch && decisionMatch) {
            setFeedback({
              strengths: strengthsMatch[1].split('\n').filter(s => s.startsWith('•')).map(s => s.slice(2)),
              concerns: concernsMatch[1].split('\n').filter(s => s.startsWith('•')).map(s => s.slice(2)),
              recommendation: recommendationMatch[1].trim(),
              decision: decisionMatch[1]
            });
          }
        }
      }
    };

    fetchFeedback();
  }, [candidateId, jobId]);

  if (!feedback) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Panel Brief
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold text-sm mb-2">Strengths</h4>
          <ul className="space-y-1 text-sm">
            {feedback.strengths.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-green-500">•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-2">Concerns</h4>
          <ul className="space-y-1 text-sm">
            {feedback.concerns.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-amber-500">•</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-2">Recommendation</h4>
          <p className="text-sm text-muted-foreground">{feedback.recommendation}</p>
        </div>

        <div className="pt-2 border-t">
          <span className="text-sm font-medium">Decision: </span>
          <span className={`text-sm font-semibold ${
            feedback.decision === 'yes' ? 'text-green-500' :
            feedback.decision === 'no' ? 'text-red-500' :
            'text-amber-500'
          }`}>
            {feedback.decision.toUpperCase()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
