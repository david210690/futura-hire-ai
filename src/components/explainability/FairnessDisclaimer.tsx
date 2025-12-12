import { Shield } from "lucide-react";
import { DISCLAIMERS } from "@/lib/explainability";

interface FairnessDisclaimerProps {
  variant?: "recruiter" | "candidate";
  className?: string;
}

export function FairnessDisclaimer({
  variant = "recruiter",
  className = ""
}: FairnessDisclaimerProps) {
  const text = variant === "recruiter" 
    ? DISCLAIMERS.RECRUITER_STANDARD 
    : DISCLAIMERS.CANDIDATE_FRIENDLY;

  return (
    <div className={`flex items-start gap-2 bg-muted/50 rounded-lg p-3 ${className}`}>
      <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <p className="text-xs text-muted-foreground">
        {text}
      </p>
    </div>
  );
}
