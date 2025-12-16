import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, MessageSquare, Mic, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type PrepOption = "warmup" | "voice" | "skip";

export default function CandidatePrepOptions() {
  const [selected, setSelected] = useState<PrepOption[]>([]);
  const navigate = useNavigate();

  const toggleOption = (option: PrepOption) => {
    if (option === "skip") {
      setSelected(["skip"]);
    } else {
      setSelected(prev => {
        const filtered = prev.filter(o => o !== "skip");
        if (filtered.includes(option)) {
          return filtered.filter(o => o !== option);
        }
        return [...filtered, option];
      });
    }
  };

  const handleContinue = () => {
    if (selected.includes("skip") || selected.length === 0) {
      navigate('/candidate/done');
    } else if (selected.includes("warmup")) {
      navigate('/candidate/warmup');
    } else if (selected.includes("voice")) {
      navigate('/candidate/done');
    }
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

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">How would you like to prepare?</h1>
        </div>

        <div className="grid gap-4 mb-6">
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:shadow-lg",
              selected.includes("warmup") 
                ? "border-primary ring-2 ring-primary/20" 
                : "hover:border-primary/50"
            )}
            onClick={() => toggleOption("warmup")}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Quick Warm-up</CardTitle>
                  <CardDescription>Reflect on common interview situations</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card 
            className={cn(
              "cursor-pointer transition-all hover:shadow-lg",
              selected.includes("voice") 
                ? "border-primary ring-2 ring-primary/20" 
                : "hover:border-primary/50"
            )}
            onClick={() => toggleOption("voice")}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <Mic className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Voice Practice (Optional)</CardTitle>
                  <CardDescription>Practice speaking answers out loud in a supportive setting</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card 
            className={cn(
              "cursor-pointer transition-all hover:shadow-lg",
              selected.includes("skip") 
                ? "border-muted-foreground ring-2 ring-muted-foreground/20" 
                : "hover:border-muted-foreground/50"
            )}
            onClick={() => toggleOption("skip")}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg">Skip for now</CardTitle>
                  <CardDescription>Go straight to your dashboard</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        <p className="text-sm text-muted-foreground text-center mb-6">
          All options are optional. Choose what feels right.
        </p>

        <div className="flex justify-center">
          <Button 
            size="lg" 
            className="min-w-[200px]"
            onClick={handleContinue}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
