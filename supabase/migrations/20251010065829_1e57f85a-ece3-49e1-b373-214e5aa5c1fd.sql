-- Fix org_members SELECT policy to allow org admins and members to view all members
DROP POLICY IF EXISTS "Users can view members of their orgs" ON org_members;

CREATE POLICY "Org members can view all org members"
ON org_members FOR SELECT
TO authenticated
USING (is_org_member(auth.uid(), org_id));