import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function PricingClarity() {
  const navigate = useNavigate();
  const [understood, setUnderstood] = useState(false);

  const whatCounts = [
    { label: "An offer is accepted by a candidate", counts: true },
    { label: "You confirm the hire in FuturaHire", counts: true },
  ];

  const whatDoesNotCount = [
    "Interviews conducted",
    "Candidates evaluated",
    "Assessments taken",
    "Rejections sent",
    "Withdrawn offers",
    "Practice sessions by candidates",
  ];

  const handleContinue = () => {
    // Store that user has seen pricing clarity
    localStorage.setItem("pricing_clarity_seen", "true");
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Before you start hiring</h1>
          <p className="text-muted-foreground">
            Let's make sure you understand how FuturaHire pricing works
          </p>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">What counts as a hire?</CardTitle>
            <CardDescription>
              FuturaHire uses outcome-based pricing. You only pay when hiring actually happens.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* What Counts */}
            <div className="space-y-3">
              <h3 className="font-semibold text-green-600 flex items-center gap-2">
                <Check className="h-5 w-5" />
                A hire is counted when:
              </h3>
              <ul className="space-y-2 ml-7">
                {whatCounts.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>

            {/* What Doesn't Count */}
            <div className="space-y-3">
              <h3 className="font-semibold text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                These do NOT count as hires:
              </h3>
              <ul className="grid grid-cols-2 gap-2 ml-7">
                {whatDoesNotCount.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Key Message */}
            <Alert className="bg-primary/5 border-primary/20">
              <AlertDescription className="text-center font-medium">
                No offer accepted = no hire counted.<br />
                Interview freely. Prepare candidates. Decide calmly.
              </AlertDescription>
            </Alert>

            {/* Confirmation */}
            <div className="pt-4 border-t space-y-4">
              <div className="flex items-start gap-3">
                <Checkbox 
                  id="understood" 
                  checked={understood}
                  onCheckedChange={(checked) => setUnderstood(checked === true)}
                />
                <label 
                  htmlFor="understood" 
                  className="text-sm cursor-pointer leading-relaxed"
                >
                  I understand that a hire is counted only when an offer is accepted and confirmed by my team in FuturaHire.
                </label>
              </div>

              <Button 
                onClick={handleContinue}
                disabled={!understood}
                className="w-full"
                size="lg"
              >
                Continue to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer Note */}
        <p className="text-center text-sm text-muted-foreground">
          Questions about pricing?{" "}
          <a href="mailto:support@futurahire.app" className="text-primary hover:underline">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
