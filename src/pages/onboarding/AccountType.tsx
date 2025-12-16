import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Users, Briefcase, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type AccountType = "recruiter" | "candidate" | null;

export default function AccountType() {
  const [selected, setSelected] = useState<AccountType>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleContinue = async () => {
    if (!selected) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/signup');
        return;
      }

      // Update user role
      const { error } = await supabase
        .from('user_roles')
        .upsert({
          user_id: user.id,
          role: selected,
        }, { onConflict: 'user_id' });

      if (error) throw error;

      if (selected === "candidate") {
        navigate('/candidate/welcome');
      } else {
        navigate('/onboarding/company');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
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
          <h1 className="text-3xl font-bold mb-2">How will you use FuturaHire?</h1>
          <p className="text-muted-foreground">Choose your path to get started</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:shadow-lg",
              selected === "recruiter" 
                ? "border-primary ring-2 ring-primary/20" 
                : "hover:border-primary/50"
            )}
            onClick={() => setSelected("recruiter")}
          >
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Briefcase className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Hiring Team</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <CardDescription className="text-base">
                I hire candidates and make decisions
              </CardDescription>
            </CardContent>
          </Card>

          <Card 
            className={cn(
              "cursor-pointer transition-all hover:shadow-lg",
              selected === "candidate" 
                ? "border-primary ring-2 ring-primary/20" 
                : "hover:border-primary/50"
            )}
            onClick={() => setSelected("candidate")}
          >
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-secondary" />
              </div>
              <CardTitle className="text-xl">Candidate</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <CardDescription className="text-base">
                I want to prepare for interviews
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center">
          <Button 
            size="lg" 
            onClick={handleContinue} 
            disabled={!selected || loading}
            className="min-w-[200px]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
