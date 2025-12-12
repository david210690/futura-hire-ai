import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Play, 
  SkipForward, 
  Loader2, 
  CheckCircle2,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { executeAutopilotAction, skipAutopilotAction, AutopilotActionType } from '@/lib/autopilotActions';

interface ExecuteActionButtonProps {
  jobId: string;
  actionType: AutopilotActionType;
  candidateId?: string;
  template?: {
    subject?: string;
    body?: string;
  };
  label?: string;
  compact?: boolean;
  onComplete?: () => void;
}

export function ExecuteActionButton({ 
  jobId, 
  actionType, 
  candidateId,
  template,
  label,
  compact = false,
  onComplete 
}: ExecuteActionButtonProps) {
  const [status, setStatus] = useState<'idle' | 'executing' | 'completed' | 'skipped'>('idle');
  const [showDialog, setShowDialog] = useState(false);
  const [editedSubject, setEditedSubject] = useState(template?.subject || '');
  const [editedBody, setEditedBody] = useState(template?.body || '');

  const handleExecute = async () => {
    // For email/linkedin, show dialog to edit
    if ((actionType === 'email_sent' || actionType === 'linkedin_message_sent') && template) {
      setShowDialog(true);
      return;
    }

    await performAction();
  };

  const performAction = async () => {
    setStatus('executing');
    setShowDialog(false);

    try {
      const payload = {
        subject: editedSubject,
        body: editedBody,
        template: template?.body
      };

      const result = await executeAutopilotAction(actionType, jobId, candidateId, payload);
      
      if (result.success) {
        setStatus('completed');
        toast.success('Action completed');
        onComplete?.();
      } else {
        setStatus('idle');
        toast.error(result.error || 'Action failed');
      }
    } catch (error) {
      setStatus('idle');
      toast.error('Failed to execute action');
    }
  };

  const handleSkip = async () => {
    setStatus('executing');

    try {
      const result = await skipAutopilotAction(actionType, jobId, candidateId, 'User skipped');
      
      if (result.success) {
        setStatus('skipped');
        toast.success('Action skipped');
        onComplete?.();
      } else {
        setStatus('idle');
        toast.error(result.error || 'Failed to skip');
      }
    } catch (error) {
      setStatus('idle');
      toast.error('Failed to skip action');
    }
  };

  const copyToClipboard = () => {
    const text = actionType === 'email_sent' 
      ? `Subject: ${editedSubject}\n\n${editedBody}`
      : editedBody;
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (status === 'completed') {
    return (
      <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-4 w-4" />
        {!compact && <span className="text-xs">Done</span>}
      </div>
    );
  }

  if (status === 'skipped') {
    return (
      <div className="flex items-center gap-1 text-slate-500">
        <SkipForward className="h-4 w-4" />
        {!compact && <span className="text-xs">Skipped</span>}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2"
          onClick={handleExecute}
          disabled={status === 'executing'}
        >
          {status === 'executing' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Play className="h-3 w-3" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2"
          onClick={handleSkip}
          disabled={status === 'executing'}
        >
          <SkipForward className="h-3 w-3" />
        </Button>
        
        {/* Edit Dialog for Email/LinkedIn */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {actionType === 'email_sent' ? 'Edit Email' : 'Edit LinkedIn Message'}
              </DialogTitle>
              <DialogDescription>
                Review and edit before sending. You can copy and send manually.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {actionType === 'email_sent' && (
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={editedSubject}
                    onChange={(e) => setEditedSubject(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="body">Message</Label>
                <Textarea
                  id="body"
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  rows={8}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={copyToClipboard}>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              <Button onClick={performAction}>
                <Play className="h-4 w-4 mr-2" />
                Mark as Sent
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExecute}
          disabled={status === 'executing'}
        >
          {status === 'executing' ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          {label || 'Execute'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkip}
          disabled={status === 'executing'}
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Edit Dialog for Email/LinkedIn */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'email_sent' ? 'Edit Email' : 'Edit LinkedIn Message'}
            </DialogTitle>
            <DialogDescription>
              Review and edit before sending. You can copy and send manually.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {actionType === 'email_sent' && (
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                rows={8}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={copyToClipboard}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button onClick={performAction}>
              <Play className="h-4 w-4 mr-2" />
              Mark as Sent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
