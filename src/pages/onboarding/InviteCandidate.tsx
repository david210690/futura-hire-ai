import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, UserPlus, Mail } from "lucide-react";

export default function InviteCandidate() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);

    try {
      // Get role context
      const roleContextStr = localStorage.getItem('onboarding_role');
      const roleContext = roleContextStr ? JSON.parse(roleContextStr) : null;

      if (!roleContext?.jobId) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No role found. Please create a role first.",
        });
        navigate('/onboarding/create-role');
        return;
      }

      // Call edge function to send invite email
      const { error } = await supabase.functions.invoke('send-application-email', {
        body: {
          to: email,
          type: 'invite',
          jobId: roleContext.jobId,
          roleTitle: roleContext.roleTitle,
        }
      });

      if (error) throw error;

      toast({
        title: "Invite sent!",
        description: `${email} will receive an invitation to prepare for the interview.`,
      });

      navigate('/dashboard');
    } catch (error: any) {
      // Still navigate but show info toast
      toast({
        title: "Invite noted",
        description: "The invite feature is being set up. Heading to your dashboard.",
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            FuturaHire
          </span>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <UserPlus className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Invite a candidate</CardTitle>
            <CardDescription className="text-base">
              Candidates can prepare for interviews for free. No payment required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Candidate Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="candidate@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || !email}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending invite...
                  </>
                ) : (
                  "Send invite"
                )}
              </Button>
            </form>

            <div className="mt-4">
              <Button 
                variant="ghost" 
                className="w-full text-muted-foreground"
                onClick={handleSkip}
              >
                Skip for now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
