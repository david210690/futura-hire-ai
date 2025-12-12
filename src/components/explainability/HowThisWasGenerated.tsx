import { useState } from "react";
import { ChevronDown, ChevronUp, Shield, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FACTORS_NOT_CONSIDERED, DISCLAIMERS } from "@/lib/explainability";

interface HowThisWasGeneratedProps {
  signalsUsed: string[];
  signalsNotUsed?: string[];
  disclaimer?: string;
  className?: string;
}

export function HowThisWasGenerated({
  signalsUsed,
  signalsNotUsed = FACTORS_NOT_CONSIDERED,
  disclaimer = DISCLAIMERS.RECRUITER_STANDARD,
  className = ""
}: HowThisWasGeneratedProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`border border-border rounded-lg ${className}`}>
      <Button
        variant="ghost"
        className="w-full justify-between p-4 h-auto"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="text-sm font-medium flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          How this was generated
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </Button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Signals used */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              Signals used
            </h4>
            <ul className="space-y-1 ml-6">
              {signalsUsed.map((signal, i) => (
                <li key={i} className="text-sm text-muted-foreground list-disc">
                  {signal}
                </li>
              ))}
            </ul>
          </div>

          {/* Signals NOT used */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              <XCircle className="h-4 w-4 text-rose-500" />
              Signals explicitly NOT used
            </h4>
            <ul className="space-y-1 ml-6">
              {signalsNotUsed.map((signal, i) => (
                <li key={i} className="text-sm text-muted-foreground list-disc">
                  {signal}
                </li>
              ))}
            </ul>
          </div>

          {/* Disclaimer */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">
              {disclaimer}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
