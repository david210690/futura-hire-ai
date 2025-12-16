import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, Target, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_PRIORITIES = [
  { id: "execution", label: "Execution", description: "Gets things done reliably" },
  { id: "communication", label: "Communication", description: "Clear and effective communicator" },
  { id: "problem_solving", label: "Problem-solving", description: "Tackles complex challenges" },
  { id: "ownership", label: "Ownership", description: "Takes initiative and accountability" },
  { id: "collaboration", label: "Collaboration", description: "Works well with others" },
];

export default function CreateRole() {
  const [roleTitle, setRoleTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const togglePriority = (id: string) => {
    if (selectedPriorities.includes(id)) {
      setSelectedPriorities(selectedPriorities.filter(p => p !== id));
    } else if (selectedPriorities.length < 3) {
      setSelectedPriorities([...selectedPriorities, id]);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleTitle || !department || selectedPriorities.length === 0) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/signup');
        return;
      }

      // Get org from context
      const contextStr = localStorage.getItem('onboarding_context');
      const context = contextStr ? JSON.parse(contextStr) : null;
      
      if (!context?.orgId) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please complete company setup first.",
        });
        navigate('/onboarding/company');
        return;
      }

      // Get company
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('org_id', context.orgId)
        .maybeSingle();

      if (!company) {
        throw new Error("Company not found");
      }

      // Create the job
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert({
          title: roleTitle,
          jd_text: `${roleTitle} - ${department}\n\nKey priorities: ${selectedPriorities.join(', ')}`,
          location: 'Remote',
          company_id: company.id,
          created_by: user.id,
          org_id: context.orgId,
          status: 'open',
          tags: selectedPriorities,
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Store for next step
      localStorage.setItem('onboarding_role', JSON.stringify({
        jobId: job.id,
        roleTitle,
        department,
        priorities: selectedPriorities,
      }));

      navigate('/onboarding/interview-kit-preview');
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
      <div className="w-full max-w-xl">
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
              <Target className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Create your first role</CardTitle>
            <CardDescription>
              We'll use this to generate a structured interview kit.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="roleTitle">Role Title</Label>
                <Input
                  id="roleTitle"
                  placeholder="e.g., Senior Software Engineer"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department / Team</Label>
                <Select value={department} onValueChange={setDepartment} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engineering">Engineering</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="hr">HR / People</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>What matters most in this role? (max 3)</Label>
                <div className="grid gap-2">
                  {ROLE_PRIORITIES.map((priority) => (
                    <button
                      key={priority.id}
                      type="button"
                      onClick={() => togglePriority(priority.id)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border text-left transition-all",
                        selectedPriorities.includes(priority.id)
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div>
                        <p className="font-medium">{priority.label}</p>
                        <p className="text-sm text-muted-foreground">{priority.description}</p>
                      </div>
                      {selectedPriorities.includes(priority.id) && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedPriorities.length}/3 selected
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={loading || !roleTitle || !department || selectedPriorities.length === 0}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Interview Kit...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Interview Kit
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
