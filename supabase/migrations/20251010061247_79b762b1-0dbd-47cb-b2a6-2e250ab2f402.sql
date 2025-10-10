-- Fix INSERT policy on orgs table to allow org creation
DROP POLICY IF EXISTS "Users can create orgs" ON orgs;

CREATE POLICY "Users can create orgs" ON orgs
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = owner_id
);

-- Ensure the org_members INSERT policy allows the owner to be added
DROP POLICY IF EXISTS "Org admins can add members" ON org_members;

CREATE POLICY "Org admins can add members" ON org_members
FOR INSERT
WITH CHECK (
  -- Allow if user is creating themselves as a member
  user_id = auth.uid()
  OR
  -- Or if they're already an admin of the org
  is_org_admin(auth.uid(), org_id)
);