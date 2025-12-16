import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, Building2 } from "lucide-react";

export default function Company() {
  const [companyName, setCompanyName] = useState("");
  const [yourRole, setYourRole] = useState("");
  const [hiresPerYear, setHiresPerYear] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !yourRole || !hiresPerYear) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/signup');
        return;
      }

      // Check if user already has an org, or create one
      let orgId: string;
      const { data: existingMembership } = await supabase
        .from('org_members')
        .select('org_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingMembership?.org_id) {
        orgId = existingMembership.org_id;
      } else {
        // Create new org
        const { data: newOrg, error: orgError } = await supabase
          .from('orgs')
          .insert({ name: companyName, owner_id: user.id })
          .select()
          .single();

        if (orgError) throw orgError;
        orgId = newOrg.id;

        // Add user as owner
        const { error: memberError } = await supabase
          .from('org_members')
          .insert({
            org_id: orgId,
            user_id: user.id,
            role: 'owner'
          });

        if (memberError) throw memberError;
      }

      // Create or update company
      const { error: companyError } = await supabase
        .from('companies')
        .upsert({
          name: companyName,
          created_by: user.id,
          org_id: orgId,
          size_band: hiresPerYear,
        });

      if (companyError) throw companyError;

      // Store onboarding context in localStorage for later use
      localStorage.setItem('onboarding_context', JSON.stringify({
        companyName,
        yourRole,
        hiresPerYear,
        orgId,
      }));

      navigate('/onboarding/pricing-clarity');
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
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Tell us about your hiring team</CardTitle>
            <CardDescription>
              This helps us tailor interview kits. You can change this later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleContinue} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  placeholder="Acme Inc."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="yourRole">Your Role</Label>
                <Select value={yourRole} onValueChange={setYourRole} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="founder">Founder</SelectItem>
                    <SelectItem value="recruiter">Recruiter</SelectItem>
                    <SelectItem value="hiring_manager">Hiring Manager</SelectItem>
                    <SelectItem value="hr_lead">HR Lead</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hiresPerYear">Approx hires per year</Label>
                <Select value={hiresPerYear} onValueChange={setHiresPerYear} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-5">1–5</SelectItem>
                    <SelectItem value="6-15">6–15</SelectItem>
                    <SelectItem value="16-30">16–30</SelectItem>
                    <SelectItem value="30+">30+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || !companyName || !yourRole || !hiresPerYear}
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
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
