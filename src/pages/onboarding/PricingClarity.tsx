import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export default function PricingClarity() {
  const [acknowledged, setAcknowledged] = useState(false);
  const navigate = useNavigate();

  const handleContinue = () => {
    localStorage.setItem('pricing_acknowledged', 'true');
    navigate('/onboarding/create-role');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            FuturaHire
          </span>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">How FuturaHire pricing works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-primary/5 rounded-xl p-6 text-center">
              <p className="text-lg font-medium">
                FuturaHire is priced by successful hires — not interviews, resumes, or candidates.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-lg">What counts as a hire</h3>
                </div>
                <p className="text-muted-foreground ml-7">
                  A hire is counted only when an offer is accepted and confirmed by your team.
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <h3 className="font-semibold text-lg">What does NOT count</h3>
                </div>
                <ul className="ml-7 space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                    Interviews
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                    Rejected candidates
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                    Withdrawn offers
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                    Practice or preparation
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  <h3 className="font-semibold text-lg">Overages</h3>
                </div>
                <p className="text-muted-foreground ml-7">
                  If you exceed your plan's included hires, additional hires are billed at ₹1,500 per hire.
                </p>
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="acknowledge"
                  checked={acknowledged}
                  onCheckedChange={(checked) => setAcknowledged(checked === true)}
                  className="mt-0.5"
                />
                <label 
                  htmlFor="acknowledge" 
                  className="text-sm font-medium leading-relaxed cursor-pointer"
                >
                  I understand what counts as a hire
                </label>
              </div>
            </div>

            <Button 
              className="w-full" 
              size="lg"
              disabled={!acknowledged}
              onClick={handleContinue}
            >
              Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
