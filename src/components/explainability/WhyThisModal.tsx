import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, CheckCircle, XCircle, Info, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DISCLAIMERS } from "@/lib/explainability";

interface WhyThisModalProps {
  title: string;
  whatWasEvaluated: string;
  keyFactors: string[];
  factorsNotConsidered: string[];
  confidenceLevel: "low" | "medium" | "high";
  limitations: string[];
  timestamp?: string;
  triggerClassName?: string;
}

export function WhyThisModal({
  title,
  whatWasEvaluated,
  keyFactors,
  factorsNotConsidered,
  confidenceLevel,
  limitations,
  timestamp,
  triggerClassName
}: WhyThisModalProps) {
  const confidenceColors = {
    low: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
    medium: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
    high: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`text-xs text-muted-foreground hover:text-foreground gap-1 ${triggerClassName}`}
        >
          <HelpCircle className="h-3 w-3" />
          Why this?
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* What was evaluated */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">What was evaluated</h4>
            <p className="text-sm text-muted-foreground">{whatWasEvaluated}</p>
          </div>

          {/* Key factors considered */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              Key factors considered
            </h4>
            <ul className="space-y-1">
              {keyFactors.map((factor, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-emerald-500 mt-1">•</span>
                  {factor}
                </li>
              ))}
            </ul>
          </div>

          {/* Factors NOT considered */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              <XCircle className="h-4 w-4 text-rose-500" />
              Factors explicitly NOT considered
            </h4>
            <ul className="space-y-1">
              {factorsNotConsidered.map((factor, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-rose-500 mt-1">•</span>
                  {factor}
                </li>
              ))}
            </ul>
          </div>

          {/* Confidence level */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">Confidence level</h4>
            <Badge className={confidenceColors[confidenceLevel]}>
              {confidenceLevel.charAt(0).toUpperCase() + confidenceLevel.slice(1)}
            </Badge>
          </div>

          {/* Limitations */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">Limitations</h4>
            <ul className="space-y-1">
              {limitations.map((limitation, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-muted-foreground mt-1">•</span>
                  {limitation}
                </li>
              ))}
            </ul>
          </div>

          {/* Timestamp */}
          {timestamp && (
            <div className="text-xs text-muted-foreground">
              Evaluated: {new Date(timestamp).toLocaleString()}
            </div>
          )}

          {/* Fairness disclaimer */}
          <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-2">
            <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              {DISCLAIMERS.RECRUITER_STANDARD}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
