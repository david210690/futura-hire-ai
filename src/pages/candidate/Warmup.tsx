import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function CandidateWarmup() {
  const [reflection, setReflection] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && reflection.trim()) {
        // Store in localStorage for now as a simple reflection
        const reflections = JSON.parse(localStorage.getItem('candidate_reflections') || '[]');
        reflections.push({
          id: Date.now(),
          user_id: user.id,
          reflection: reflection.trim(),
          created_at: new Date().toISOString()
        });
        localStorage.setItem('candidate_reflections', JSON.stringify(reflections));
      }
      navigate('/candidate/done');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save reflection. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            FuturaHire
          </span>
        </div>

        <Card className="border-0 shadow-xl">
          <CardContent className="pt-8 pb-8 px-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">Quick warm-up</h1>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <p className="text-foreground leading-relaxed">
                Think about a time you had to explain your work to someone unfamiliar with it.
                What helped you communicate clearly?
              </p>
            </div>

            <div className="mb-4">
              <Textarea
                placeholder="Write a few thoughts if you like…"
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                className="min-h-[150px] resize-none"
              />
            </div>

            <p className="text-sm text-muted-foreground mb-6">
              This is for your reflection only. There are no right or wrong answers.
            </p>

            <div className="flex gap-3">
              <Button 
                variant="outline"
                size="lg" 
                className="flex-1"
                onClick={() => navigate('/candidate/done')}
              >
                Skip
              </Button>
              <Button 
                size="lg" 
                className="flex-1"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save & continue"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
