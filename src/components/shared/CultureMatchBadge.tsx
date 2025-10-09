import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Heart } from "lucide-react";

interface CultureMatchBadgeProps {
  orgId: string;
  candidateId: string;
  autoCompute?: boolean;
}

export const CultureMatchBadge = ({ orgId, candidateId, autoCompute = true }: CultureMatchBadgeProps) => {
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadMatch = async () => {
    try {
      const { data, error } = await supabase
        .from('culture_matches')
        .select('*')
        .eq('org_id', orgId)
        .eq('candidate_id', candidateId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data && autoCompute) {
        // Compute match if not exists
        const { data: computed, error: computeError } = await supabase.functions.invoke('compute-culture-match', {
          body: { org_id: orgId, candidate_id: candidateId }
        });

        if (!computeError && computed) {
          setMatch(computed);
        }
      } else {
        setMatch(data);
      }
    } catch (error: any) {
      console.error('Error loading culture match:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatch();
  }, [orgId, candidateId]);

  if (loading) {
    return (
      <Badge variant="outline" className="gap-1">
        <Heart className="w-3 h-3" />
        Loading...
      </Badge>
    );
  }

  if (!match) {
    return null;
  }

  const score = match.match_score;
  const factors = match.factors || {};
  const rationale = factors.rationale || 'Culture match computed';
  const topFactors = factors.top_factors || [];

  const getVariant = () => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "outline";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={getVariant()} className="gap-1 cursor-help">
            <Heart className="w-3 h-3" />
            Culture: {score}%
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="text-sm">{rationale}</p>
            {topFactors.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-1">Key Factors:</p>
                <ul className="text-xs space-y-0.5">
                  {topFactors.map((factor: string, i: number) => (
                    <li key={i}>• {factor}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};