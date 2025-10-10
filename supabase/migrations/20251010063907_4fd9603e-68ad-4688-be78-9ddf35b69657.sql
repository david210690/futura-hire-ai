-- Fix the orgs SELECT policy to use the security definer function
DROP POLICY IF EXISTS "Users can view orgs they are members of" ON orgs;

CREATE POLICY "Users can view orgs they are members of"
ON orgs FOR SELECT
TO authenticated
USING (is_org_member(auth.uid(), id));

-- Ensure org_members policies are correct
DROP POLICY IF EXISTS "Org admins can add members" ON org_members;

CREATE POLICY "Org admins can add members"
ON org_members FOR INSERT
TO authenticated
WITH CHECK ((user_id = auth.uid()) OR is_org_admin(auth.uid(), org_id));

-- Fix org_members SELECT to avoid any potential recursion
DROP POLICY IF EXISTS "Users can view members of their orgs" ON org_members;

CREATE POLICY "Users can view members of their orgs"
ON org_members FOR SELECT  
TO authenticated
USING ((user_id = auth.uid()) OR EXISTS (
  SELECT 1 FROM org_members om 
  WHERE om.org_id = org_members.org_id 
  AND om.user_id = auth.uid()
));