import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mic, Loader2, ExternalLink } from "lucide-react";

interface StartVoiceInterviewDialogProps {
  jobId?: string;
  roleTitle?: string;
  trigger?: React.ReactNode;
}

export function StartVoiceInterviewDialog({ jobId, roleTitle, trigger }: StartVoiceInterviewDialogProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("mixed");
  const [difficulty, setDifficulty] = useState("mid");

  const handleStart = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('voice-interview-start', {
        body: {
          jobId,
          roleTitle,
          mode,
          difficulty,
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to start interview');
      }

      toast({
        title: "Interview Started",
        description: "Redirecting to your voice interview session...",
      });

      // If we have a joinUrl, open it in a new tab
      if (data.joinUrl) {
        window.open(data.joinUrl, '_blank');
        setOpen(false);
        // Also navigate to the session detail page
        navigate(`/voice-interview/${data.sessionId}`);
      } else {
        // Fallback: just navigate to the session
        setOpen(false);
        navigate(`/voice-interview/${data.sessionId}`);
      }

    } catch (error: any) {
      console.error('Error starting interview:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to start voice interview",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="default" className="gap-2">
            <Mic className="h-4 w-4" />
            Start Live AI Interview (Voice)
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Start Voice Interview
          </DialogTitle>
          <DialogDescription>
            Practice with our AI interviewer using your voice. Configure your session below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {roleTitle && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Practicing for:</p>
              <p className="font-medium">{roleTitle}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Interview Mode</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="technical">Technical</SelectItem>
                <SelectItem value="behavioral">Behavioral</SelectItem>
                <SelectItem value="mixed">Mixed (Recommended)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Technical focuses on skills, behavioral on soft skills and scenarios
            </p>
          </div>

          <div className="space-y-2">
            <Label>Difficulty Level</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="junior">Junior</SelectItem>
                <SelectItem value="mid">Mid-Level (Recommended)</SelectItem>
                <SelectItem value="senior">Senior</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Higher difficulty means more complex questions and higher expectations
            </p>
          </div>

          <div className="p-3 border rounded-lg bg-primary/5">
            <p className="text-sm font-medium mb-1">What to expect:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• You'll be connected to an AI voice interviewer</li>
              <li>• Speak naturally - the AI will listen and respond</li>
              <li>• Session will be recorded and transcribed</li>
              <li>• You'll receive detailed feedback after completion</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleStart} disabled={loading} className="gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4" />
                Start Interview
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
