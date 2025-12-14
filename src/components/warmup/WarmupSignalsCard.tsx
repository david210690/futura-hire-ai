import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, AlertCircle } from "lucide-react";

interface ExtractedSignals {
  signals: string[];
  role_dna_dimensions_touched: string[];
  gentle_interviewer_prompt: string[];
}

interface WarmupSignalsCardProps {
  signals: ExtractedSignals | null;
  compact?: boolean;
}

export function WarmupSignalsCard({ signals, compact = false }: WarmupSignalsCardProps) {
  if (!signals || signals.signals.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className={compact ? "py-3" : "py-4"}>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm">No warmup completed</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Work-Style Signals</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {signals.signals.slice(0, 3).map((signal, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {signal}
              </Badge>
            ))}
            {signals.signals.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{signals.signals.length - 3} more
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-4 space-y-4">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <span className="font-medium">Work-Style Signals</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {signals.signals.map((signal, i) => (
            <Badge key={i} variant="secondary">
              {signal}
            </Badge>
          ))}
        </div>

        {signals.role_dna_dimensions_touched.length > 0 && (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Dimensions touched:</span>{" "}
            {signals.role_dna_dimensions_touched.map(d => d.replace(/_/g, ' ')).join(', ')}
          </div>
        )}

        {signals.gentle_interviewer_prompt.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Interview Guidance
            </h4>
            <ul className="text-xs space-y-1">
              {signals.gentle_interviewer_prompt.map((prompt, i) => (
                <li key={i}>• {prompt}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-muted-foreground italic">
          These signals are optional and directional. Do not use for automatic rejection.
        </p>
      </CardContent>
    </Card>
  );
}
