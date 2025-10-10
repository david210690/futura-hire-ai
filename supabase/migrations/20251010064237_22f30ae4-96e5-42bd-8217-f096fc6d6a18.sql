-- Fix the infinite recursion in org_members SELECT policy
-- The issue is that the policy was querying org_members within itself
DROP POLICY IF EXISTS "Users can view members of their orgs" ON org_members;

-- Create a simple policy that allows users to see their own membership
-- and relies on the is_org_member security definer function for other checks
CREATE POLICY "Users can view members of their orgs"
ON org_members FOR SELECT  
TO authenticated
USING (user_id = auth.uid());