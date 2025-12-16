import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, User, Sparkles } from "lucide-react";

interface RoleSelectionModalProps {
  userId: string;
  onRoleSelected: (role: 'recruiter' | 'candidate') => void;
}

export const RoleSelectionModal = ({ userId, onRoleSelected }: RoleSelectionModalProps) => {
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'recruiter' | 'candidate' | null>(null);
  const { toast } = useToast();

  const handleSelectRole = async () => {
    if (!selectedRole) return;
    
    setLoading(true);
    try {
      // Update the user_roles table
      const { error } = await supabase
        .from('user_roles')
        .update({ role: selectedRole })
        .eq('user_id', userId);

      if (error) throw error;

      // If recruiter, also create a candidate profile for Job Twin features
      if (selectedRole === 'candidate') {
        // Check if candidate profile exists
        const { data: existingCandidate } = await supabase
          .from('candidates')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (!existingCandidate) {
          const { data: userData } = await supabase.auth.getUser();
          const userName = userData.user?.user_metadata?.name || 
                          userData.user?.user_metadata?.full_name || 
                          'User';
          
          await supabase.from('candidates').insert({
            user_id: userId,
            full_name: userName,
          });
        }
      }

      toast({
        title: "Role selected!",
        description: `You're now set up as a ${selectedRole}.`,
      });

      onRoleSelected(selectedRole);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4 border-0 shadow-2xl">
        <CardHeader className="space-y-2 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </div>
          <CardTitle>Welcome to FuturaHire!</CardTitle>
          <CardDescription>How will you be using FuturaHire?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setSelectedRole('candidate')}
              className={`p-6 rounded-xl border-2 transition-all hover:border-primary/50 ${
                selectedRole === 'candidate' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border'
              }`}
            >
              <User className={`w-8 h-8 mx-auto mb-3 ${
                selectedRole === 'candidate' ? 'text-primary' : 'text-muted-foreground'
              }`} />
              <p className="font-medium">Candidate</p>
              <p className="text-xs text-muted-foreground mt-1">Looking for jobs</p>
            </button>
            
            <button
              onClick={() => setSelectedRole('recruiter')}
              className={`p-6 rounded-xl border-2 transition-all hover:border-primary/50 ${
                selectedRole === 'recruiter' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border'
              }`}
            >
              <Briefcase className={`w-8 h-8 mx-auto mb-3 ${
                selectedRole === 'recruiter' ? 'text-primary' : 'text-muted-foreground'
              }`} />
              <p className="font-medium">Recruiter</p>
              <p className="text-xs text-muted-foreground mt-1">Hiring talent</p>
            </button>
          </div>
          
          <Button 
            onClick={handleSelectRole} 
            className="w-full" 
            disabled={!selectedRole || loading}
          >
            {loading ? "Setting up..." : "Continue"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
