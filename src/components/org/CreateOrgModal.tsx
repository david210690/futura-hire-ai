import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { startOrgTrial, applyTrialEntitlements } from "@/lib/trial";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Loader2 } from "lucide-react";

interface CreateOrgModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const CreateOrgModal = ({ open, onOpenChange, onSuccess }: CreateOrgModalProps) => {
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!orgName.trim()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create organization
      const { data: newOrg, error: orgError } = await supabase
        .from('orgs')
        .insert({
          name: orgName,
          owner_id: user.id,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Add user as owner member
      const { error: memberError } = await supabase
        .from('org_members')
        .insert({
          org_id: newOrg.id,
          user_id: user.id,
          role: 'owner',
        });

      if (memberError) throw memberError;

      // Create default company for the org
      const { error: companyError } = await supabase
        .from('companies')
        .insert({
          name: orgName, // Use org name as default company name
          created_by: user.id,
          org_id: newOrg.id,
        });

      if (companyError) throw companyError;

      // Start 14-day trial for new org
      try {
        await startOrgTrial(newOrg.id);
        await applyTrialEntitlements(newOrg.id);
      } catch (trialError) {
        console.error('Error setting up trial:', trialError);
        // Don't block org creation if trial setup fails
      }

      toast({
        title: "Organization created!",
        description: "You're all set with a 14-day trial. Start hiring now!",
      });

      // Store as current org
      localStorage.setItem('currentOrgId', newOrg.id);
      
      setOrgName("");
      onOpenChange(false);
      
      // Navigate based on role
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (userRole?.role === 'recruiter') {
        navigate('/dashboard');
      } else {
        navigate('/candidate/dashboard');
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <DialogTitle>Create Organization</DialogTitle>
          </div>
          <DialogDescription>
            Create a new organization to start hiring and managing your team.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              placeholder="Acme Corp"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading || !orgName.trim()}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Organization'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
