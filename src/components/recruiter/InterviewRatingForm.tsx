import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Scale } from "lucide-react";
import { CalibrationCheckpointModal } from "./CalibrationCheckpointModal";

interface InterviewRatingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  candidateId: string;
  applicationId: string;
  candidateName?: string;
  roleTitle?: string;
}

interface CalibrationResult {
  has_discrepancies: boolean;
  discrepancies: any[];
  bias_flags: any[];
  evidence_gaps: any[];
  positive_confirmation?: string;
  overall_coaching_summary: string;
}

export function InterviewRatingForm({ 
  open, 
  onOpenChange, 
  jobId, 
  candidateId,
  applicationId,
  candidateName = "Candidate",
  roleTitle = "Role"
}: InterviewRatingFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generatingFeedback, setGeneratingFeedback] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const [techDepth, setTechDepth] = useState([50]);
  const [problemSolving, setProblemSolving] = useState([50]);
  const [communication, setCommunication] = useState([50]);
  const [cultureAdd, setCultureAdd] = useState([50]);
  const [hireRecommend, setHireRecommend] = useState<"yes" | "no" | "maybe">("maybe");
  const [notes, setNotes] = useState("");
  const [generatedFeedback, setGeneratedFeedback] = useState<any>(null);
  
  // Calibration state
  const [showCalibration, setShowCalibration] = useState(false);
  const [calibrationResult, setCalibrationResult] = useState<CalibrationResult | null>(null);
  const [calibrationCheckId, setCalibrationCheckId] = useState<string | null>(null);
  const [pendingInterviewId, setPendingInterviewId] = useState<string | null>(null);

  const resetForm = () => {
    setTechDepth([50]);
    setProblemSolving([50]);
    setCommunication([50]);
    setCultureAdd([50]);
    setHireRecommend("maybe");
    setNotes("");
    setGeneratedFeedback(null);
    setCalibrationResult(null);
    setCalibrationCheckId(null);
    setPendingInterviewId(null);
  };

  const handleSaveWithCalibration = async () => {
    setCalibrating(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create interview record
      const { data: interview, error: interviewError } = await supabase
        .from('interviews')
        .insert({
          job_id: jobId,
          candidate_id: candidateId,
          interviewer_id: user.id,
          ended_at: new Date().toISOString()
        })
        .select()
        .single();

      if (interviewError) throw interviewError;
      setPendingInterviewId(interview.id);

      // Create interview rating
      const { error: ratingError } = await supabase
        .from('interview_ratings')
        .insert({
          interview_id: interview.id,
          tech_depth: techDepth[0],
          problem_solving: problemSolving[0],
          communication: communication[0],
          culture_add: cultureAdd[0],
          hire_recommend: hireRecommend,
          notes: notes || generatedFeedback ? JSON.stringify(generatedFeedback) : null
        });

      if (ratingError) throw ratingError;

      // Run calibration check
      const { data: calibrationData, error: calibrationError } = await supabase.functions.invoke('calibrate-judgment', {
        body: {
          interviewId: interview.id,
          jobId,
          candidateId,
          ratings: {
            tech_depth: techDepth[0],
            problem_solving: problemSolving[0],
            communication: communication[0],
            culture_add: cultureAdd[0]
          },
          notes: notes || '',
          candidateName,
          roleTitle
        }
      });

      if (calibrationError) {
        console.error('Calibration error:', calibrationError);
        // If calibration fails, still allow proceeding
        toast({
          title: "Interview rating saved",
          description: "The predictive score will be updated automatically.",
        });
        resetForm();
        onOpenChange(false);
        return;
      }

      // Show calibration modal
      setCalibrationResult(calibrationData.calibration);
      setCalibrationCheckId(calibrationData.calibration_check_id);
      setShowCalibration(true);

    } catch (error) {
      console.error('Error saving interview rating:', error);
      toast({
        title: "Error",
        description: "Failed to save interview rating",
        variant: "destructive",
      });
    } finally {
      setCalibrating(false);
    }
  };

  const handleReviseFeedback = () => {
    // Close calibration modal, keep form open for revision
    setShowCalibration(false);
    // Delete the interview we just created so they can resubmit
    if (pendingInterviewId) {
      supabase.from('interviews').delete().eq('id', pendingInterviewId).then(() => {
        setPendingInterviewId(null);
      });
    }
  };

  const handleConfirmAndProceed = () => {
    setShowCalibration(false);
    toast({
      title: "Interview rating saved",
      description: "Your feedback has been recorded and calibration noted.",
    });
    resetForm();
    onOpenChange(false);
  };

  const handleGenerateFeedback = async () => {
    setGeneratingFeedback(true);
    try {
      // First save the interview to get an ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: interview, error: interviewError } = await supabase
        .from('interviews')
        .insert({
          job_id: jobId,
          candidate_id: candidateId,
          interviewer_id: user.id,
          ended_at: new Date().toISOString()
        })
        .select()
        .single();

      if (interviewError) throw interviewError;

      // Create temporary rating
      const { data: rating, error: ratingError } = await supabase
        .from('interview_ratings')
        .insert({
          interview_id: interview.id,
          tech_depth: techDepth[0],
          problem_solving: problemSolving[0],
          communication: communication[0],
          culture_add: cultureAdd[0],
          hire_recommend: hireRecommend,
          notes: notes
        })
        .select()
        .single();

      if (ratingError) throw ratingError;

      // Generate feedback
      const { data, error } = await supabase.functions.invoke('generate-interview-feedback', {
        body: { interview_id: interview.id }
      });

      if (error) throw error;

      setGeneratedFeedback(data.feedback);
      toast({
        title: "Feedback generated",
        description: "AI panel brief has been created.",
      });
    } catch (error) {
      console.error('Error generating feedback:', error);
      toast({
        title: "Error",
        description: "Failed to generate feedback",
        variant: "destructive",
      });
    } finally {
      setGeneratingFeedback(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Interview Rating</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Technical Depth: {techDepth[0]}</Label>
            <Slider value={techDepth} onValueChange={setTechDepth} max={100} step={1} />
          </div>

          <div className="space-y-2">
            <Label>Problem Solving: {problemSolving[0]}</Label>
            <Slider value={problemSolving} onValueChange={setProblemSolving} max={100} step={1} />
          </div>

          <div className="space-y-2">
            <Label>Communication: {communication[0]}</Label>
            <Slider value={communication} onValueChange={setCommunication} max={100} step={1} />
          </div>

          <div className="space-y-2">
            <Label>Culture Add: {cultureAdd[0]}</Label>
            <Slider value={cultureAdd} onValueChange={setCultureAdd} max={100} step={1} />
          </div>

          <div className="space-y-2">
            <Label>Hire Recommendation</Label>
            <RadioGroup value={hireRecommend} onValueChange={(v) => setHireRecommend(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="yes" />
                <Label htmlFor="yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="maybe" id="maybe" />
                <Label htmlFor="maybe">Maybe</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="no" />
                <Label htmlFor="no">No</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional observations..."
              rows={4}
            />
          </div>

          {generatedFeedback && (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
              <h4 className="font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI Panel Brief
              </h4>
              
              <div>
                <p className="text-sm font-medium">Strengths:</p>
                <ul className="text-sm space-y-1 ml-4 list-disc">
                  {generatedFeedback.strengths?.map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-sm font-medium">Concerns:</p>
                <ul className="text-sm space-y-1 ml-4 list-disc">
                  {generatedFeedback.concerns?.map((c: string, i: number) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-sm font-medium">Recommendation:</p>
                <p className="text-sm">{generatedFeedback.recommendation}</p>
              </div>

              <div>
                <p className="text-sm font-medium">Decision: {generatedFeedback.decision}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleGenerateFeedback}
            disabled={generatingFeedback || calibrating}
          >
            {generatingFeedback && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Sparkles className="mr-2 h-4 w-4" />
            Generate AI Brief
          </Button>
          <Button onClick={handleSaveWithCalibration} disabled={calibrating}>
            {calibrating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Scale className="mr-2 h-4 w-4" />
            Save & Calibrate
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Calibration Checkpoint Modal */}
      <CalibrationCheckpointModal
        open={showCalibration}
        onOpenChange={setShowCalibration}
        calibration={calibrationResult}
        calibrationCheckId={calibrationCheckId}
        candidateName={candidateName}
        roleTitle={roleTitle}
        onReviseFeedback={handleReviseFeedback}
        onConfirmAndProceed={handleConfirmAndProceed}
      />
    </Dialog>
  );
}
