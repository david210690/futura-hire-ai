-- Drop existing admin-only invite policies
DROP POLICY IF EXISTS "Org admins can create invites" ON public.invites;
DROP POLICY IF EXISTS "Org admins can delete invites" ON public.invites;

-- Create new policies allowing any org member to create invites
CREATE POLICY "Org members can create invites" 
ON public.invites 
FOR INSERT 
WITH CHECK (is_org_member(auth.uid(), org_id));

-- Allow org members to delete invites they created, or admins to delete any
CREATE POLICY "Org members can delete own invites or admins delete any" 
ON public.invites 
FOR DELETE 
USING (
  created_by = auth.uid() 
  OR is_org_admin(auth.uid(), org_id)
);