import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Discrepancy {
  dimension: string;
  interviewer_score: number;
  team_average: number | null;
  role_dna_benchmark: number | null;
  deviation_from_team: number | null;
  deviation_from_benchmark: number | null;
  is_high_priority: boolean;
}

interface CalibrationScoreChartProps {
  discrepancies: Discrepancy[];
}

export function CalibrationScoreChart({ discrepancies }: CalibrationScoreChartProps) {
  if (!discrepancies || discrepancies.length === 0) return null;

  const maxScore = 10;

  return (
    <Card className="border-muted">
      <CardContent className="pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          Score Comparison
        </h4>
        <div className="space-y-4">
          {discrepancies.map((disc, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize">
                  {disc.dimension.replace(/_/g, ' ')}
                </span>
                {disc.is_high_priority && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                    Review
                  </Badge>
                )}
              </div>
              
              {/* Visual bar comparison */}
              <div className="space-y-1.5">
                {/* Your score */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-16 shrink-0">You</span>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${(disc.interviewer_score / maxScore) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium w-6 text-right">{disc.interviewer_score}</span>
                </div>
                
                {/* Team average */}
                {disc.team_average !== null && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16 shrink-0">Team</span>
                    <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-400 rounded-full transition-all"
                        style={{ width: `${(disc.team_average / maxScore) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-6 text-right">{disc.team_average}</span>
                  </div>
                )}
                
                {/* Role DNA benchmark */}
                {disc.role_dna_benchmark !== null && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16 shrink-0">Benchmark</span>
                    <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-400 rounded-full transition-all"
                        style={{ width: `${(disc.role_dna_benchmark / maxScore) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-6 text-right">{disc.role_dna_benchmark}</span>
                  </div>
                )}
              </div>
              
              {/* Deviation indicators */}
              <div className="flex gap-3 text-xs">
                {disc.deviation_from_team !== null && (
                  <span className={disc.deviation_from_team > 1 ? "text-amber-600" : disc.deviation_from_team < -1 ? "text-blue-600" : "text-muted-foreground"}>
                    {disc.deviation_from_team > 0 ? "+" : ""}{disc.deviation_from_team} vs team
                  </span>
                )}
                {disc.deviation_from_benchmark !== null && (
                  <span className={disc.deviation_from_benchmark > 1 ? "text-amber-600" : disc.deviation_from_benchmark < -1 ? "text-blue-600" : "text-muted-foreground"}>
                    {disc.deviation_from_benchmark > 0 ? "+" : ""}{disc.deviation_from_benchmark} vs role
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-primary rounded" />
            <span className="text-xs text-muted-foreground">Your score</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-blue-400 rounded" />
            <span className="text-xs text-muted-foreground">Team average</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-green-400 rounded" />
            <span className="text-xs text-muted-foreground">Role benchmark</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
