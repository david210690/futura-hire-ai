import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Shield, Eye, Lock } from "lucide-react";

export default function CandidateWelcome() {
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
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-3">Welcome to FuturaHire</h1>
              <p className="text-muted-foreground text-lg">
                FuturaHire helps you prepare for interviews in a calm, supportive way.
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">This is not an evaluation</p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Eye className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">No scores or pass/fail</p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Lock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">Your preparation is private by default</p>
              </div>
            </div>

            <Button 
              size="lg" 
              className="w-full"
              onClick={() => navigate('/candidate/context')}
            >
              Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
