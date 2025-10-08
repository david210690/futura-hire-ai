import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Lightbulb, Target, MessageSquare, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CareerCoachCardProps {
  candidateId: string;
  resumeText?: string;
}

export const CareerCoachCard = ({ candidateId, resumeText }: CareerCoachCardProps) => {
  const [feedback, setFeedback] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    loadLatestFeedback();
    loadOpenJobs();
  }, [candidateId]);

  const loadOpenJobs = async () => {
    const { data } = await supabase
      .from('jobs')
      .select('id, title, company_id')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (data) setJobs(data);
  };

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
      const { data, error } = await supabase.functions.invoke('career-coach', {
        body: { 
          candidateId, 
          resumeText,
          jobId: selectedJobId || null
        }
      });

      if (error) {
        if (error.message?.includes('Rate limit')) {
          toast({
            title: "Rate limit reached",
            description: "You can request feedback twice per hour. Please try again later.",
            variant: "destructive"
          });
        }
        throw error;
      }

      await loadLatestFeedback();
      toast({
        title: "Feedback generated",
        description: "Your AI career coach feedback is ready!"
      });
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
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <CardTitle>AI Career Coach</CardTitle>
        </div>
        <CardDescription>Personalized insights to improve your profile</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!feedback && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Target Job (Optional)</label>
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a target job..." />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={generateFeedback} disabled={loading || !resumeText} className="w-full">
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
          </div>
        )}

        {feedback && (
          <Tabs defaultValue="skills" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="skills">
                <Target className="w-4 h-4 mr-2" />
                Missing Skills
              </TabsTrigger>
              <TabsTrigger value="suggestions">
                <Lightbulb className="w-4 h-4 mr-2" />
                Suggestions
              </TabsTrigger>
              <TabsTrigger value="questions">
                <MessageSquare className="w-4 h-4 mr-2" />
                Practice Qs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="skills" className="space-y-3 mt-4">
              {feedback.missing_skills && feedback.missing_skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {feedback.missing_skills.map((skill: string, i: number) => (
                    <Badge key={i} variant="outline" className="bg-warning/10 text-warning border-warning/20">
                      {skill}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No missing skills identified.</p>
              )}
            </TabsContent>

            <TabsContent value="suggestions" className="space-y-3 mt-4">
              {feedback.resume_suggestions && feedback.resume_suggestions.length > 0 ? (
                <ul className="space-y-2">
                  {feedback.resume_suggestions.map((suggestion: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No suggestions available.</p>
              )}
            </TabsContent>

            <TabsContent value="questions" className="space-y-3 mt-4">
              {feedback.interview_questions && feedback.interview_questions.length > 0 ? (
                <ul className="space-y-2">
                  {feedback.interview_questions.map((question: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-success mt-1">{i + 1}.</span>
                      <span>{question}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No practice questions available.</p>
              )}
            </TabsContent>

            <Button 
              onClick={generateFeedback} 
              disabled={loading}
              variant="outline" 
              size="sm" 
              className="w-full mt-4"
            >
              {loading ? 'Refreshing...' : 'Refresh Feedback'}
            </Button>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};
