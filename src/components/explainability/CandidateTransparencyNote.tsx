import { useState } from "react";
import { ChevronDown, ChevronUp, Info, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FACTORS_NOT_CONSIDERED, DISCLAIMERS } from "@/lib/explainability";

interface CandidateTransparencyNoteProps {
  title?: string;
  keyFactors: string[];
  limitations?: string[];
  variant?: "fit" | "interview-prep" | "general";
  className?: string;
}

export function CandidateTransparencyNote({
  title = "How this is estimated",
  keyFactors,
  limitations = [],
  variant = "general",
  className = ""
}: CandidateTransparencyNoteProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getDisclaimer = () => {
    switch (variant) {
      case "interview-prep":
        return DISCLAIMERS.INTERVIEW_PREP;
      case "fit":
      case "general":
      default:
        return DISCLAIMERS.CANDIDATE_FRIENDLY;
    }
  };

  return (
    <div className={`bg-muted/30 rounded-lg ${className}`}>
      <Button
        variant="ghost"
        className="w-full justify-between p-3 h-auto hover:bg-muted/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="text-xs font-medium flex items-center gap-2 text-muted-foreground">
          <Info className="h-3.5 w-3.5" />
          {title}
        </span>
        {isExpanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </Button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Key factors considered */}
          <div>
            <p className="text-xs font-medium text-foreground mb-1.5">What we looked at:</p>
            <ul className="space-y-0.5 ml-4">
              {keyFactors.map((factor, i) => (
                <li key={i} className="text-xs text-muted-foreground list-disc">
                  {factor}
                </li>
              ))}
            </ul>
          </div>

          {/* What we don't consider */}
          <div>
            <p className="text-xs font-medium text-foreground mb-1.5">What we don't consider:</p>
            <ul className="space-y-0.5 ml-4">
              {FACTORS_NOT_CONSIDERED.slice(0, 5).map((factor, i) => (
                <li key={i} className="text-xs text-muted-foreground list-disc">
                  {factor}
                </li>
              ))}
            </ul>
          </div>

          {/* Limitations */}
          {limitations.length > 0 && (
            <div>
              <p className="text-xs font-medium text-foreground mb-1.5">Keep in mind:</p>
              <ul className="space-y-0.5 ml-4">
                {limitations.map((limitation, i) => (
                  <li key={i} className="text-xs text-muted-foreground list-disc">
                    {limitation}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Friendly disclaimer */}
          <div className="flex items-start gap-2 pt-2 border-t border-border">
            <Heart className="h-3.5 w-3.5 text-rose-400 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground italic">
              {getDisclaimer()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
