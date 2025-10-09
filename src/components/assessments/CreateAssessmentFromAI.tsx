import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Sparkles, Loader2 } from "lucide-react";

interface CreateAssessmentFromAIProps {
  onSuccess: () => void;
}

export const CreateAssessmentFromAI = ({ onSuccess }: CreateAssessmentFromAIProps) => {
  const [roleOrJd, setRoleOrJd] = useState("");
  const [duration, setDuration] = useState(60);
  const [numQuestions, setNumQuestions] = useState(15);
  const [includeCulture, setIncludeCulture] = useState(false);
  const [includeCoding, setIncludeCoding] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { currentOrg } = useCurrentOrg();
  const currentOrgId = currentOrg?.id;

  const handleGenerate = async () => {
    if (!roleOrJd.trim()) {
      toast({
        title: "Role/JD Required",
        description: "Please describe the role or paste a job description",
        variant: "destructive"
      });
      return;
    }

    if (!currentOrgId) {
      toast({
        title: "Organization Required",
        description: "Please select an organization first",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-assessment', {
        body: {
          org_id: currentOrgId,
          role_or_jd: roleOrJd,
          options: {
            duration_minutes: duration,
            num_questions: numQuestions,
            include_culture: includeCulture,
            include_coding: includeCoding
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Assessment Generated!",
        description: `Created assessment with ${data.questions_generated} questions`
      });

      setRoleOrJd("");
      onSuccess();
    } catch (error: any) {
      console.error('Generation error:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate assessment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          AI-Powered Assessment Generation
        </CardTitle>
        <CardDescription>
          Paste a job description or describe the role, and AI will generate a comprehensive assessment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="role">Job Description or Role Description</Label>
          <Textarea
            id="role"
            placeholder="Paste job description or describe the role (e.g., 'Senior React Developer with 5+ years experience in TypeScript, Redux...')"
            value={roleOrJd}
            onChange={(e) => setRoleOrJd(e.target.value)}
            rows={8}
            className="font-mono text-sm"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min="15"
              max="180"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="num">Number of Questions</Label>
            <Input
              id="num"
              type="number"
              min="5"
              max="30"
              value={numQuestions}
              onChange={(e) => setNumQuestions(parseInt(e.target.value))}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="culture"
              checked={includeCulture}
              onCheckedChange={(checked) => setIncludeCulture(checked as boolean)}
            />
            <Label htmlFor="culture" className="font-normal cursor-pointer">
              Include culture fit questions
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="coding"
              checked={includeCoding}
              onCheckedChange={(checked) => setIncludeCoding(checked as boolean)}
            />
            <Label htmlFor="coding" className="font-normal cursor-pointer">
              Include coding challenges
            </Label>
          </div>
        </div>

        <Button 
          onClick={handleGenerate} 
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Assessment...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Assessment with AI
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
