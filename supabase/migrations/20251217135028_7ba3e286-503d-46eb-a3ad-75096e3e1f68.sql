-- Drop the problematic SELECT policy that references auth.users directly
DROP POLICY IF EXISTS "Users can view invites for their orgs" ON public.invites;

-- Create new policy that allows org members to view invites for their org
CREATE POLICY "Org members can view org invites" 
ON public.invites 
FOR SELECT 
USING (is_org_member(auth.uid(), org_id));