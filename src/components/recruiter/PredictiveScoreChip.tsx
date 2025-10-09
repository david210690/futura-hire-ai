import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp } from "lucide-react";

interface PredictiveScoreChipProps {
  applicationId: string;
}

export function PredictiveScoreChip({ applicationId }: PredictiveScoreChipProps) {
  const [score, setScore] = useState<{ probability: number; rationale: string } | null>(null);

  useEffect(() => {
    const fetchScore = async () => {
      const { data } = await supabase
        .from('predictive_scores')
        .select('success_probability, rationale')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setScore({ probability: data.success_probability, rationale: data.rationale || '' });
      }
    };

    fetchScore();

    // Subscribe to changes
    const channel = supabase
      .channel(`predictive_score_${applicationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'predictive_scores',
          filter: `application_id=eq.${applicationId}`
        },
        (payload: any) => {
          if (payload.new) {
            setScore({ 
              probability: payload.new.success_probability, 
              rationale: payload.new.rationale || '' 
            });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [applicationId]);

  if (!score) return null;

  const getVariant = (prob: number) => {
    if (prob >= 80) return "default";
    if (prob >= 60) return "secondary";
    return "outline";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={getVariant(score.probability)} className="gap-1">
            <TrendingUp className="h-3 w-3" />
            Predictive: {score.probability}%
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="font-medium mb-1">Estimated success probability</p>
          <p className="text-xs text-muted-foreground">
            Heuristic v1 using skill, culture, communication, and interview signals.
          </p>
          {score.rationale && (
            <p className="text-xs mt-2">{score.rationale}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
