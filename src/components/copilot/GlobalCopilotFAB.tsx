import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, X } from "lucide-react";
import { CopilotPanel } from "@/components/recruiter/CopilotPanel";
import { cn } from "@/lib/utils";

interface GlobalCopilotFABProps {
  jobId?: string;
}

export const GlobalCopilotFAB = ({ jobId }: GlobalCopilotFABProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Action Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-20 right-6 z-40 h-14 w-14 rounded-full shadow-lg",
          "transition-all hover:scale-110",
          isOpen && "bg-destructive hover:bg-destructive/90"
        )}
        size="icon"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageSquare className="h-6 w-6" />
        )}
      </Button>

      {/* Copilot Panel Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm">
          <div className="fixed bottom-0 right-0 top-0 w-full md:w-[500px] bg-background border-l shadow-xl overflow-hidden">
            <CopilotPanel jobId={jobId} />
          </div>
        </div>
      )}
    </>
  );
};
