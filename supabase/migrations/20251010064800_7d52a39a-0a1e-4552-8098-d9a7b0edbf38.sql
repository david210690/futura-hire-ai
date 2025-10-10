-- Fix the SELECT policy to allow owners to see their orgs
-- Users should be able to see orgs they own OR are members of
DROP POLICY IF EXISTS "Users can view orgs they are members of" ON orgs;

CREATE POLICY "Users can view orgs they own or are members of"
ON orgs FOR SELECT
TO authenticated
USING (owner_id = auth.uid() OR is_org_member(auth.uid(), id));