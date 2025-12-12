import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { 
  BookOpen, Target, MessageSquare, Code, Users, Calendar, 
  Loader2, RefreshCw, ChevronDown, ChevronUp, Sparkles, 
  Mic, Brain, Heart, Lightbulb, AlertCircle
} from "lucide-react";
import { StartVoiceInterviewDialog } from "@/components/voice-interview/StartVoiceInterviewDialog";

interface InterviewPrepPanelProps {
  jobTwinJobId: string;
  roleTitle?: string;
}

interface PrepPlan {
  overall_strategy: {
    summary: string;
    mindset_notes: string[];
  };
  focus_areas: Array<{
    label: string;
    reason: string;
    what_good_looks_like: string[];
  }>;
  behavioral_preparation: {
    story_themes: string[];
    story_prompts: string[];
    tips: string[];
  };
  technical_or_role_specific_preparation: {
    topics: string[];
    question_examples: string[];
    practice_ideas: string[];
  };
  communication_and_style_alignment: {
    suggestions: string[];
    sample_phrases: string[];
  };
  mock_interview_plan: {
    sessions: Array<{
      label: string;
      focus: string;
      recommended_mode: string;
    }>;
    notes: string[];
  };
}

export function InterviewPrepPanel({ jobTwinJobId, roleTitle }: InterviewPrepPanelProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [prepPlan, setPrepPlan] = useState<PrepPlan | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    strategy: true,
    focus: true,
    behavioral: false,
    technical: false,
    communication: false,
    mockPlan: false
  });

  useEffect(() => {
    fetchPrepPlan();
  }, [jobTwinJobId]);

  const fetchPrepPlan = async () => {
    setLoading(true);
    setErrorCode(null);
    try {
      const { data, error } = await supabase.functions.invoke("get-interview-prep", {
        body: null,
        method: "GET"
      });

      // Use fetch directly for GET with query params
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-interview-prep?jobId=${jobTwinJobId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json"
          }
        }
      );

      const result = await response.json();
      
      if (result.success && result.exists) {
        setPrepPlan(result.plan);
        setCreatedAt(result.createdAt);
      }
    } catch (error) {
      console.error("Error fetching interview prep:", error);
    } finally {
      setLoading(false);
    }
  };

  const generatePrepPlan = async () => {
    setGenerating(true);
    setErrorCode(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-interview-prep", {
        body: { jobId: jobTwinJobId }
      });

      if (error) throw error;

      if (!data.success) {
        if (data.code === "NO_ROLE_DNA") {
          setErrorCode("NO_ROLE_DNA");
          toast({
            title: "Role DNA not available",
            description: "Role DNA hasn't been generated for this role yet. Check back later.",
            variant: "destructive"
          });
        } else if (data.code === "NO_ROLE_DNA_FIT") {
          setErrorCode("NO_ROLE_DNA_FIT");
          toast({
            title: "Role Fit needed first",
            description: "Please run 'Check My Fit' for this role, then come back here.",
            variant: "destructive"
          });
        } else {
          throw new Error(data.message);
        }
        return;
      }

      setPrepPlan(data.plan);
      setCreatedAt(data.createdAt);
      toast({
        title: "Prep plan generated",
        description: "Your personalized interview prep is ready!"
      });
    } catch (error: any) {
      console.error("Error generating prep plan:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate prep plan",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!prepPlan) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            AI Interview Prep for This Role
          </CardTitle>
          <CardDescription>
            Get a personalized prep plan based on the role's DNA and your fit
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              This uses the role's DNA, your fit, and your current signals to generate a calm, 
              focused interview prep plan. It's here to support you, not to judge you.
            </p>
          </div>

          {errorCode === "NO_ROLE_DNA_FIT" && (
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                First, run "Check My Fit" for this role above, then come back here to generate your prep plan.
              </p>
            </div>
          )}

          {errorCode === "NO_ROLE_DNA" && (
            <div className="flex items-start gap-2 p-3 bg-muted border rounded-lg">
              <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Role DNA hasn't been generated for this role yet. This typically happens 
                when a recruiter hasn't set it up. Check back later!
              </p>
            </div>
          )}

          <Button 
            onClick={generatePrepPlan} 
            disabled={generating || errorCode === "NO_ROLE_DNA"}
            className="w-full gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Your Prep Plan...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate My Prep Plan
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              AI Interview Prep for This Role
            </CardTitle>
            <CardDescription>
              Personalized guidance based on Role DNA & your fit
              {createdAt && (
                <span className="ml-2 text-xs">
                  • Updated {new Date(createdAt).toLocaleDateString()}
                </span>
              )}
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={generatePrepPlan}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">Regenerate</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Strategy */}
        <Collapsible open={expandedSections.strategy} onOpenChange={() => toggleSection("strategy")}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <span className="font-medium">Overall Strategy</span>
            </div>
            {expandedSections.strategy ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 px-1">
            <p className="text-sm mb-3">{prepPlan.overall_strategy?.summary}</p>
            {prepPlan.overall_strategy?.mindset_notes?.length > 0 && (
              <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">Mindset Reminders</span>
                </div>
                <ul className="space-y-1">
                  {prepPlan.overall_strategy.mindset_notes.map((note, i) => (
                    <li key={i} className="text-sm text-green-700 dark:text-green-300">• {note}</li>
                  ))}
                </ul>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Focus Areas */}
        <Collapsible open={expandedSections.focus} onOpenChange={() => toggleSection("focus")}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-amber-500/5 rounded-lg hover:bg-amber-500/10 transition-colors">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-600" />
              <span className="font-medium">Areas to Pay Attention To</span>
              <Badge variant="outline" className="ml-2">{prepPlan.focus_areas?.length || 0}</Badge>
            </div>
            {expandedSections.focus ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-3 px-1">
            {prepPlan.focus_areas?.map((area, i) => (
              <div key={i} className="p-3 border rounded-lg">
                <p className="font-medium text-sm">{area.label}</p>
                <p className="text-sm text-muted-foreground mt-1">{area.reason}</p>
                {area.what_good_looks_like?.length > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-1">What good looks like:</p>
                    <ul className="space-y-0.5">
                      {area.what_good_looks_like.map((point, j) => (
                        <li key={j} className="text-xs text-muted-foreground">• {point}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Behavioral Preparation */}
        <Collapsible open={expandedSections.behavioral} onOpenChange={() => toggleSection("behavioral")}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-blue-500/5 rounded-lg hover:bg-blue-500/10 transition-colors">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <span className="font-medium">Behavioral Stories</span>
            </div>
            {expandedSections.behavioral ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-3 px-1">
            {prepPlan.behavioral_preparation?.story_themes?.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Story Themes to Prepare</p>
                <div className="flex flex-wrap gap-2">
                  {prepPlan.behavioral_preparation.story_themes.map((theme, i) => (
                    <Badge key={i} variant="secondary">{theme}</Badge>
                  ))}
                </div>
              </div>
            )}
            {prepPlan.behavioral_preparation?.story_prompts?.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Example Prompts</p>
                <ul className="space-y-2">
                  {prepPlan.behavioral_preparation.story_prompts.map((prompt, i) => (
                    <li key={i} className="text-sm p-2 bg-muted rounded-lg italic">"{prompt}"</li>
                  ))}
                </ul>
              </div>
            )}
            {prepPlan.behavioral_preparation?.tips?.length > 0 && (
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <p className="text-sm font-medium mb-1 text-blue-700 dark:text-blue-300">Tips</p>
                <ul className="space-y-1">
                  {prepPlan.behavioral_preparation.tips.map((tip, i) => (
                    <li key={i} className="text-sm text-blue-700 dark:text-blue-300">• {tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Technical Preparation */}
        <Collapsible open={expandedSections.technical} onOpenChange={() => toggleSection("technical")}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-purple-500/5 rounded-lg hover:bg-purple-500/10 transition-colors">
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5 text-purple-600" />
              <span className="font-medium">Role-Specific Topics</span>
            </div>
            {expandedSections.technical ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-3 px-1">
            {prepPlan.technical_or_role_specific_preparation?.topics?.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Topics to Review</p>
                <div className="flex flex-wrap gap-2">
                  {prepPlan.technical_or_role_specific_preparation.topics.map((topic, i) => (
                    <Badge key={i} variant="outline">{topic}</Badge>
                  ))}
                </div>
              </div>
            )}
            {prepPlan.technical_or_role_specific_preparation?.question_examples?.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Example Questions</p>
                <ul className="space-y-2">
                  {prepPlan.technical_or_role_specific_preparation.question_examples.map((q, i) => (
                    <li key={i} className="text-sm p-2 bg-muted rounded-lg italic">"{q}"</li>
                  ))}
                </ul>
              </div>
            )}
            {prepPlan.technical_or_role_specific_preparation?.practice_ideas?.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Practice Ideas</p>
                <ul className="space-y-1">
                  {prepPlan.technical_or_role_specific_preparation.practice_ideas.map((idea, i) => (
                    <li key={i} className="text-sm text-muted-foreground">• {idea}</li>
                  ))}
                </ul>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Communication & Style */}
        <Collapsible open={expandedSections.communication} onOpenChange={() => toggleSection("communication")}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-teal-500/5 rounded-lg hover:bg-teal-500/10 transition-colors">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-600" />
              <span className="font-medium">Communication & Work Style</span>
            </div>
            {expandedSections.communication ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-3 px-1">
            {prepPlan.communication_and_style_alignment?.suggestions?.length > 0 && (
              <ul className="space-y-1">
                {prepPlan.communication_and_style_alignment.suggestions.map((sug, i) => (
                  <li key={i} className="text-sm text-muted-foreground">• {sug}</li>
                ))}
              </ul>
            )}
            {prepPlan.communication_and_style_alignment?.sample_phrases?.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Sample Phrases</p>
                <div className="space-y-2">
                  {prepPlan.communication_and_style_alignment.sample_phrases.map((phrase, i) => (
                    <p key={i} className="text-sm p-2 bg-muted rounded-lg italic">"{phrase}"</p>
                  ))}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Mock Interview Plan */}
        <Collapsible open={expandedSections.mockPlan} onOpenChange={() => toggleSection("mockPlan")}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-pink-500/5 rounded-lg hover:bg-pink-500/10 transition-colors">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-pink-600" />
              <span className="font-medium">Suggested Mock Interview Plan</span>
            </div>
            {expandedSections.mockPlan ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-3 px-1">
            {prepPlan.mock_interview_plan?.sessions?.map((session, i) => (
              <div key={i} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm">{session.label}</p>
                  {session.recommended_mode === "voice" && (
                    <Badge variant="outline" className="gap-1">
                      <Mic className="h-3 w-3" />
                      Voice
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{session.focus}</p>
                {session.recommended_mode === "voice" && (
                  <div className="mt-3">
                    <StartVoiceInterviewDialog 
                      jobId={jobTwinJobId}
                      roleTitle={roleTitle}
                      trigger={
                        <Button size="sm" variant="secondary" className="gap-2">
                          <Mic className="h-3 w-3" />
                          Start Voice Mock
                        </Button>
                      }
                    />
                  </div>
                )}
              </div>
            ))}
            {prepPlan.mock_interview_plan?.notes?.length > 0 && (
              <div className="p-3 bg-pink-500/10 rounded-lg">
                <ul className="space-y-1">
                  {prepPlan.mock_interview_plan.notes.map((note, i) => (
                    <li key={i} className="text-sm text-pink-700 dark:text-pink-300">• {note}</li>
                  ))}
                </ul>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Disclaimer */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground text-center">
            This plan is AI-generated guidance based on the information available right now. 
            It doesn't know your full story. Use it as a helper, not as a final verdict on your ability.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
