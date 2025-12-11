import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  Brain, RefreshCw, Loader2, Lightbulb, MessageSquare, 
  Target, Puzzle, Heart, Award, Sparkles
} from "lucide-react";
import { format } from "date-fns";

interface RoleDna {
  cognitive_patterns?: string[];
  communication_style?: {
    style?: string;
    expectations?: string[];
  };
  execution_style?: {
    delivery_mode?: string;
    decision_making?: string;
    ownership_expectations?: string[];
  };
  problem_solving_vectors?: string[];
  culture_alignment?: {
    environment?: string;
    values_expected?: string[];
  };
  success_signals?: {
    resume_signals?: string[];
    interview_signals?: string[];
  };
}

interface RoleDnaPanelProps {
  jobTwinJobId: string;
}

export function RoleDnaPanel({ jobTwinJobId }: RoleDnaPanelProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [roleDna, setRoleDna] = useState<RoleDna | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  useEffect(() => {
    loadRoleDna();
  }, [jobTwinJobId]);

  const loadRoleDna = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-role-dna?jobId=${jobTwinJobId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();
      
      if (data.success && data.exists) {
        setRoleDna(data.snapshot);
        setCreatedAt(data.createdAt);
      } else {
        setRoleDna(null);
        setCreatedAt(null);
      }
    } catch (error) {
      console.error("Error loading Role DNA:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateRoleDna = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-role-dna", {
        body: { jobId: jobTwinJobId },
      });

      if (error) throw error;

      toast({
        title: "Role DNA generated",
        description: "The deeper blueprint for this role is now available.",
      });

      await loadRoleDna();
    } catch (error: any) {
      console.error("Error generating Role DNA:", error);
      toast({
        variant: "destructive",
        title: "Unable to generate Role DNA",
        description: "Please try again shortly.",
      });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Role DNA Blueprint
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!roleDna) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Role DNA Blueprint
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">No Role DNA Generated Yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              This role does not have a Role DNA profile yet. Role DNA analyzes the deeper 
              cognitive expectations, communication style, execution temperament, and success 
              signals that help candidates thrive in this role.
            </p>
            <Button onClick={generateRoleDna} disabled={generating} className="gap-2">
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  Generate Role DNA
                </>
              )}
            </Button>
          </div>
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
              <Brain className="h-5 w-5" />
              Role DNA Blueprint
            </CardTitle>
            {createdAt && (
              <CardDescription className="mt-1">
                Last updated: {format(new Date(createdAt), "MMM d, yyyy 'at' h:mm a")}
              </CardDescription>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={generateRoleDna}
            disabled={generating}
            className="gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Regenerate
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cognitive Patterns */}
        <DnaSection
          icon={<Lightbulb className="h-4 w-4" />}
          title="Cognitive Patterns"
          description="This role tends to reward these thinking styles"
        >
          {roleDna.cognitive_patterns?.length ? (
            <ul className="space-y-1.5">
              {roleDna.cognitive_patterns.map((pattern, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{pattern}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyField />
          )}
        </DnaSection>

        {/* Communication Style */}
        <DnaSection
          icon={<MessageSquare className="h-4 w-4" />}
          title="Communication Style"
          description="Candidates may thrive here if they communicate this way"
        >
          {roleDna.communication_style?.style || roleDna.communication_style?.expectations?.length ? (
            <div className="space-y-3">
              {roleDna.communication_style.style && (
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Style</span>
                  <p className="text-sm font-medium">{roleDna.communication_style.style}</p>
                </div>
              )}
              {roleDna.communication_style.expectations?.length ? (
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Expectations</span>
                  <ul className="mt-1 space-y-1">
                    {roleDna.communication_style.expectations.map((exp, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{exp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyField />
          )}
        </DnaSection>

        {/* Execution Style */}
        <DnaSection
          icon={<Target className="h-4 w-4" />}
          title="Execution Style"
          description="How work typically gets done in this role"
        >
          {roleDna.execution_style?.delivery_mode || 
           roleDna.execution_style?.decision_making || 
           roleDna.execution_style?.ownership_expectations?.length ? (
            <div className="space-y-3">
              {roleDna.execution_style.delivery_mode && (
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Delivery Mode</span>
                  <p className="text-sm font-medium">{roleDna.execution_style.delivery_mode}</p>
                </div>
              )}
              {roleDna.execution_style.decision_making && (
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Decision Making</span>
                  <p className="text-sm font-medium">{roleDna.execution_style.decision_making}</p>
                </div>
              )}
              {roleDna.execution_style.ownership_expectations?.length ? (
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Ownership Expectations</span>
                  <ul className="mt-1 space-y-1">
                    {roleDna.execution_style.ownership_expectations.map((exp, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{exp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyField />
          )}
        </DnaSection>

        {/* Problem-Solving Orientation */}
        <DnaSection
          icon={<Puzzle className="h-4 w-4" />}
          title="Problem-Solving Orientation"
          description="Types of thinking that often support success here"
        >
          {roleDna.problem_solving_vectors?.length ? (
            <div className="flex flex-wrap gap-2">
              {roleDna.problem_solving_vectors.map((vector, i) => (
                <Badge key={i} variant="secondary" className="font-normal">
                  {vector}
                </Badge>
              ))}
            </div>
          ) : (
            <EmptyField />
          )}
        </DnaSection>

        {/* Culture Alignment */}
        <DnaSection
          icon={<Heart className="h-4 w-4" />}
          title="Culture Alignment"
          description="The environment and values that tend to support success"
        >
          {roleDna.culture_alignment?.environment || roleDna.culture_alignment?.values_expected?.length ? (
            <div className="space-y-3">
              {roleDna.culture_alignment.environment && (
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Environment</span>
                  <p className="text-sm font-medium">{roleDna.culture_alignment.environment}</p>
                </div>
              )}
              {roleDna.culture_alignment.values_expected?.length ? (
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Values</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {roleDna.culture_alignment.values_expected.map((value, i) => (
                      <Badge key={i} variant="outline" className="font-normal">
                        {value}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyField />
          )}
        </DnaSection>

        {/* Success Signals */}
        <DnaSection
          icon={<Award className="h-4 w-4" />}
          title="Success Signals"
          description="Signals that often support success in evaluation"
        >
          {roleDna.success_signals?.resume_signals?.length || 
           roleDna.success_signals?.interview_signals?.length ? (
            <div className="space-y-4">
              {roleDna.success_signals.resume_signals?.length ? (
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Resume Signals</span>
                  <ul className="mt-1 space-y-1">
                    {roleDna.success_signals.resume_signals.map((signal, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-green-500 mt-1">✓</span>
                        <span>{signal}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {roleDna.success_signals.interview_signals?.length ? (
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Interview Signals</span>
                  <ul className="mt-1 space-y-1">
                    {roleDna.success_signals.interview_signals.map((signal, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-green-500 mt-1">✓</span>
                        <span>{signal}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyField />
          )}
        </DnaSection>
      </CardContent>
    </Card>
  );
}

function DnaSection({ 
  icon, 
  title, 
  description, 
  children 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-primary">{icon}</span>
        <h4 className="font-semibold text-sm">{title}</h4>
      </div>
      <p className="text-xs text-muted-foreground mb-3">{description}</p>
      {children}
    </div>
  );
}

function EmptyField() {
  return (
    <p className="text-sm text-muted-foreground italic">
      Not enough data was available to infer this dimension.
    </p>
  );
}
