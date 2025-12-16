import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, CheckCircle2, Heart } from "lucide-react";

export default function CandidateDone() {
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
          <CardContent className="pt-8 pb-8 px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>

            <h1 className="text-3xl font-bold mb-3">You're all set</h1>
            <p className="text-muted-foreground text-lg mb-6">
              You can return anytime to practice, reflect, or prepare for interviews.
            </p>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 mb-8 text-left">
              <Heart className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Preparation here does not affect hiring decisions.
              </p>
            </div>

            <Button 
              size="lg" 
              className="w-full"
              onClick={() => navigate('/candidate/dashboard')}
            >
              Go to dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
