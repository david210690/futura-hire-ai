import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles,
  Lightbulb,
  MessageSquare,
  CheckCircle2,
  Loader2,
  Brain,
  Shield
} from "lucide-react";

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

interface ExtractedSignals {
  signals: string[];
  role_dna_dimensions_touched: string[];
  gentle_interviewer_prompt: string[];
}

interface ScenarioWarmupPanelProps {
  scenario: ScenarioWarmup | null;
  jobTwinJobId?: string;
  onComplete: (signals: ExtractedSignals) => void;
  loading?: boolean;
}

export function ScenarioWarmupPanel({
  scenario,
  jobTwinJobId,
  onComplete,
  loading = false
}: ScenarioWarmupPanelProps) {
  const { toast } = useToast();
  const [selectedChoice, setSelectedChoice] = useState<string>("");
  const [freeTextReason, setFreeTextReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [extractedSignals, setExtractedSignals] = useState<ExtractedSignals | null>(null);

  const handleSubmit = async () => {
    if (!scenario || !selectedChoice) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in");

      // Create scenario run
      const { data: run, error: runError } = await supabase
        .from('scenario_runs')
        .insert({
          scenario_id: scenario.id,
          user_id: user.id,
          selected_choice_id: selectedChoice,
          free_text_reason: freeTextReason || null,
          job_twin_job_id: jobTwinJobId || null,
          extracted_signals: {}
        })
        .select()
        .single();

      if (runError) throw runError;

      // Call edge function to extract signals
      const { data: signalsData, error: signalsError } = await supabase.functions.invoke(
        'extract-scenario-signals',
        { body: { runId: run.id } }
      );

      const signals = signalsError ? {
        signals: [],
        role_dna_dimensions_touched: scenario.mapped_role_dna_dimensions,
        gentle_interviewer_prompt: []
      } : signalsData.signals;

      setExtractedSignals(signals);
      setCompleted(true);
      onComplete(signals);

      toast({
        title: "Warmup complete",
        description: "Your work-style notes have been saved."
      });
    } catch (error: any) {
      console.error("Error submitting warmup:", error);
      toast({
        title: "Something went wrong",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!scenario) {
    return (
      <Card className="border-muted">
        <CardContent className="py-8 text-center text-muted-foreground">
          <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No warmup scenarios available for this role.</p>
        </CardContent>
      </Card>
    );
  }

  if (completed && extractedSignals) {
    return (
      <Card className="border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <CheckCircle2 className="h-5 w-5" />
            Warmup Complete
          </CardTitle>
          <CardDescription>
            Here are your work-style notes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {extractedSignals.signals.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                Your Work-Style Notes
              </h4>
              <div className="flex flex-wrap gap-2">
                {extractedSignals.signals.map((signal, i) => (
                  <Badge key={i} variant="secondary" className="text-sm">
                    {signal}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
            <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              These notes are optional and help us understand your preferences. 
              They are not used for automatic decisions.
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>{scenario.title}</CardTitle>
        </div>
        <CardDescription>
          This helps us understand how you approach work. There's no right or wrong answer.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scenario Context */}
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm">{scenario.scenario_context}</p>
        </div>

        {/* Choices */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">What would you do?</Label>
          <RadioGroup value={selectedChoice} onValueChange={setSelectedChoice}>
            {scenario.choices_json.map((choice) => (
              <div
                key={choice.id}
                className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors cursor-pointer ${
                  selectedChoice === choice.id
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-muted-foreground/30"
                }`}
                onClick={() => setSelectedChoice(choice.id)}
              >
                <RadioGroupItem value={choice.id} id={choice.id} className="mt-1" />
                <Label htmlFor={choice.id} className="cursor-pointer flex-1">
                  <span className="font-medium">{choice.label}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Optional explanation */}
        <div className="space-y-2">
          <Label htmlFor="reason" className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Why did you pick this? (optional)
          </Label>
          <Textarea
            id="reason"
            value={freeTextReason}
            onChange={(e) => setFreeTextReason(e.target.value)}
            placeholder="Share your thinking if you'd like..."
            rows={3}
          />
        </div>

        {/* ND-safe note */}
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            Take your time. There's no timer and no "correct" answer. 
            We're interested in understanding your preferences.
          </span>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!selectedChoice || submitting}
          className="w-full"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Submit Response"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
