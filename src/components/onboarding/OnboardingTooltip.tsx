import { useState, useEffect } from "react";
import { X, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingTooltipProps {
  storageKey: string;
  message: string;
  className?: string;
}

export function OnboardingTooltip({ storageKey, message, className }: OnboardingTooltipProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(storageKey);
    if (!dismissed) {
      setVisible(true);
    }
  }, [storageKey]);

  const handleDismiss = () => {
    localStorage.setItem(storageKey, 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className={cn(
      "bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2",
      className
    )}>
      <Lightbulb className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
      <p className="text-sm flex-1">{message}</p>
      <button 
        onClick={handleDismiss}
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
