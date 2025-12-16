import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Heart, Clock, SkipForward, Share2 } from "lucide-react";

export default function CandidateContext() {
  const navigate = useNavigate();

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
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-2">Before we begin</h1>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-5 mb-6">
              <p className="text-foreground leading-relaxed">
                <strong>FuturaHire is a preparation space — not a test.</strong>
              </p>
              <p className="text-muted-foreground mt-3 leading-relaxed">
                What you do here is meant to help you think, practice, and feel more confident.
                Your responses are not used to auto-reject you.
                Recruiters do not see raw practice responses by default.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                You are always in control
              </h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">Practice at your own pace</p>
                </div>
                <div className="flex items-start gap-3">
                  <SkipForward className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">Skip anything you're not comfortable with</p>
                </div>
                <div className="flex items-start gap-3">
                  <Share2 className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">You decide what to share</p>
                </div>
              </div>
            </div>

            <Button 
              size="lg" 
              className="w-full"
              onClick={() => navigate('/candidate/prep-options')}
            >
              I understand
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
