import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RetentionRiskCardsProps {
  hireId: string;
}

export const RetentionRiskCards = ({ hireId }: RetentionRiskCardsProps) => {
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScores();
  }, [hireId]);

  const loadScores = async () => {
    try {
      const { data, error } = await supabase
        .from('retention_scores')
        .select('*')
        .eq('hire_id', hireId)
        .order('horizon');

      if (error) throw error;
      setScores(data || []);
    } catch (error: any) {
      console.error('Error loading retention scores:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading retention scores...</div>;
  }

  if (scores.length === 0) {
    return null;
  }

  const getRiskColor = (risk: number) => {
    if (risk < 30) return 'text-green-600';
    if (risk < 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRiskIcon = (risk: number) => {
    if (risk < 30) return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    if (risk < 60) return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    return <AlertTriangle className="h-5 w-5 text-red-600" />;
  };

  const getRiskLabel = (risk: number) => {
    if (risk < 30) return 'Low Risk';
    if (risk < 60) return 'Medium Risk';
    return 'High Risk';
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {scores.map((score) => (
        <Card key={score.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">
                  {score.horizon === '30d' && '30-Day'}
                  {score.horizon === '60d' && '60-Day'}
                  {score.horizon === '90d' && '90-Day'}
                </CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">Predicted risk of this hire leaving within this time period, based on culture fit, performance signals, and pulse check data.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {getRiskIcon(score.risk)}
            </div>
            <CardDescription>Retention Risk</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${getRiskColor(score.risk)}`}>
                {score.risk}%
              </span>
              <Badge variant={score.risk < 30 ? 'default' : score.risk < 60 ? 'secondary' : 'destructive'}>
                {getRiskLabel(score.risk)}
              </Badge>
            </div>

            {score.rationale && (
              <p className="text-sm text-muted-foreground">{score.rationale}</p>
            )}

            {score.tips && score.tips.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Manager Tips:</h4>
                <ul className="space-y-1 text-sm">
                  {score.tips.map((tip: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};