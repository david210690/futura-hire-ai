import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ScenarioWarmupPanel } from "./ScenarioWarmupPanel";
import { WarmupSignalsCard } from "./WarmupSignalsCard";
import { Sparkles, Brain } from "lucide-react";

interface ScenarioChoice {
  id: string;
  label: string;
  why_it_matters: string;
  signals: string[];
}

interface ScenarioWarmup {
  id: string;
  title: string;
  scenario_context: string;
  choices_json: ScenarioChoice[];
  mapped_role_dna_dimensions: string[];
  nd_safe_notes: string | null;
}

interface JobWarmupSectionProps {
  jobTwinJobId: string;
  department?: string;
  seniority?: string;
}

export function JobWarmupSection({ jobTwinJobId, department, seniority }: JobWarmupSectionProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [scenario, setScenario] = useState<ScenarioWarmup | null>(null);
  const [existingRun, setExistingRun] = useState<any>(null);
  const [showWarmup, setShowWarmup] = useState(false);

  useEffect(() => {
    loadWarmupData();
  }, [jobTwinJobId, department, seniority]);

  const loadWarmupData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check for existing run for this job
      const { data: runs } = await supabase
        .from('scenario_runs')
        .select('*, scenario_warmups(*)')
        .eq('user_id', user.id)
        .eq('job_twin_job_id', jobTwinJobId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (runs && runs.length > 0) {
        setExistingRun(runs[0]);
        setLoading(false);
        return;
      }

      // Fetch a scenario for this department/seniority
      const deptFilter = department || 'Engineering';
      const seniorityFilter = seniority || 'mid';

      const { data: scenarios, error } = await supabase
        .from('scenario_warmups')
        .select('*')
        .eq('department', deptFilter)
        .eq('seniority', seniorityFilter)
        .limit(1);

      if (error) throw error;
      
      if (scenarios && scenarios.length > 0) {
        const s = scenarios[0];
        setScenario({
          id: s.id,
          title: s.title,
          scenario_context: s.scenario_context,
          choices_json: s.choices_json as unknown as ScenarioChoice[],
          mapped_role_dna_dimensions: s.mapped_role_dna_dimensions as unknown as string[],
          nd_safe_notes: s.nd_safe_notes
        });
      }
    } catch (error: any) {
      console.error("Error loading warmup:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    loadWarmupData();
    setShowWarmup(false);
  };

  if (loading) {
    return (
      <Card className="mt-6 border-primary/20">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // If already completed
  if (existingRun) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Warmup Completed
          </CardTitle>
          <CardDescription>
            Your work-style notes from the scenario warmup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WarmupSignalsCard 
            signals={{
              signals: existingRun.extracted_signals?.signals || [],
              role_dna_dimensions_touched: existingRun.extracted_signals?.role_dna_dimensions_touched || [],
              gentle_interviewer_prompt: existingRun.extracted_signals?.gentle_interviewer_prompt || []
            }}
          />
        </CardContent>
      </Card>
    );
  }

  // If showing the warmup
  if (showWarmup && scenario) {
    return (
      <div className="mt-6">
        <ScenarioWarmupPanel
          scenario={scenario}
          jobTwinJobId={jobTwinJobId}
          onComplete={handleComplete}
        />
      </div>
    );
  }

  // Prompt to start warmup
  return (
    <Card className="mt-6 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Warm-up Scenario (Optional)
        </CardTitle>
        <CardDescription>
          This helps us understand how you approach work. No right or wrong answers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Take a 2-minute warm-up to help personalize your interview preparation.
          Your responses help us suggest better interview questions and prep materials.
        </p>
        <Button onClick={() => setShowWarmup(true)} disabled={!scenario}>
          <Sparkles className="mr-2 h-4 w-4" />
          Try a 2-minute Warm-up
        </Button>
        {!scenario && (
          <p className="text-xs text-muted-foreground mt-2">
            No warmup scenarios available for this role type.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
