import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Shield, Heart, Sparkles, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function CandidateWelcome() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Welcome to FuturaHire",
      subtitle: "Your preparation partner, not your judge",
      icon: Sparkles,
      content: (
        <div className="space-y-4 text-center">
          <p className="text-muted-foreground">
            FuturaHire helps you prepare for opportunities — it's not here to evaluate or score you.
          </p>
          <div className="grid gap-3 text-left mt-6">
            {[
              "Practice interviews at your own pace",
              "Get insights to help you grow",
              "Explore opportunities that fit you",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: "This is not an evaluation",
      subtitle: "Everything here is for your benefit",
      icon: Shield,
      content: (
        <div className="space-y-4">
          <div className="grid gap-3">
            <Card className="border-green-500/20 bg-green-500/5">
              <CardContent className="pt-4">
                <h4 className="font-medium text-green-700 mb-2">What FuturaHire does:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Helps you practice and reflect</li>
                  <li>• Shows you growth opportunities</li>
                  <li>• Prepares you for real interviews</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="pt-4">
                <h4 className="font-medium text-destructive mb-2">What FuturaHire never does:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Auto-reject based on AI scores</li>
                  <li>• Filter resumes automatically</li>
                  <li>• Judge your accent or speaking style</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      ),
    },
    {
      title: "You're in control",
      subtitle: "Use what helps, skip what doesn't",
      icon: Heart,
      content: (
        <div className="space-y-4 text-center">
          <p className="text-muted-foreground">
            All features are optional. You decide what to use and what to skip.
          </p>
          <div className="grid gap-3 text-left mt-6">
            {[
              { label: "Voice Practice", desc: "Optional AI conversation practice" },
              { label: "Warm-ups", desc: "Optional work-style reflection scenarios" },
              { label: "Career Tools", desc: "Optional trajectory and opportunity insights" },
            ].map((item, i) => (
              <div key={i} className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Pause, skip, or come back whenever you want.
          </p>
        </div>
      ),
    },
  ];

  const currentStep = steps[step];
  const Icon = currentStep.icon;
  const isLast = step === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem("candidate_welcome_seen", "true");
      navigate("/candidate/dashboard");
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          <Progress value={((step + 1) / steps.length) * 100} className="h-1" />
          <p className="text-xs text-muted-foreground text-center">
            {step + 1} of {steps.length}
          </p>
        </div>

        {/* Content Card */}
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-8 pb-6 space-y-6">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon className="w-8 h-8 text-primary" />
              </div>
            </div>

            {/* Title */}
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold">{currentStep.title}</h1>
              <p className="text-muted-foreground">{currentStep.subtitle}</p>
            </div>

            {/* Content */}
            {currentStep.content}

            {/* Actions */}
            <div className="pt-4 space-y-3">
              <Button onClick={handleNext} className="w-full" size="lg">
                {isLast ? "Get Started" : "Continue"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              {!isLast && (
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    localStorage.setItem("candidate_welcome_seen", "true");
                    navigate("/candidate/dashboard");
                  }}
                  className="w-full text-muted-foreground"
                >
                  Skip for now
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
