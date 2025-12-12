import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { 
  Dna, 
  Mic, 
  ArrowRight, 
  MoreHorizontal,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { executeAutopilotAction } from '@/lib/autopilotActions';

interface AutopilotQuickActionsProps {
  jobId: string;
  candidateId: string;
  candidateName?: string;
  onActionComplete?: () => void;
}

export function AutopilotQuickActions({ 
  jobId, 
  candidateId, 
  candidateName,
  onActionComplete 
}: AutopilotQuickActionsProps) {
  const [executing, setExecuting] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const handleAction = async (actionType: 'fit_request_sent' | 'voice_interview_requested' | 'stage_updated', payload?: Record<string, unknown>) => {
    setExecuting(actionType);
    
    try {
      const result = await executeAutopilotAction(actionType, jobId, candidateId, payload);
      
      if (result.success) {
        setCompleted(prev => new Set([...prev, actionType]));
        toast.success(result.message || `Action completed`);
        onActionComplete?.();
      } else {
        toast.error(result.error || 'Action failed');
      }
    } catch (error) {
      toast.error('Failed to execute action');
    } finally {
      setExecuting(null);
    }
  };

  const isCompleted = (action: string) => completed.has(action);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Quick actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => handleAction('fit_request_sent')}
          disabled={executing !== null || isCompleted('fit_request_sent')}
          className="gap-2"
        >
          {executing === 'fit_request_sent' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isCompleted('fit_request_sent') ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <Dna className="h-4 w-4" />
          )}
          {isCompleted('fit_request_sent') ? 'Fit Request Sent' : 'Send Fit Request'}
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => handleAction('voice_interview_requested')}
          disabled={executing !== null || isCompleted('voice_interview_requested')}
          className="gap-2"
        >
          {executing === 'voice_interview_requested' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isCompleted('voice_interview_requested') ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
          {isCompleted('voice_interview_requested') ? 'Interview Requested' : 'Request Voice Interview'}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={() => handleAction('stage_updated', { newStage: 'interview_pending' })}
          disabled={executing !== null}
          className="gap-2"
        >
          {executing === 'stage_updated' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
          Move to Interview
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
