-- Allow org members to view other users in their org
CREATE POLICY "Org members can view users in their org"
ON public.users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.org_members om1
    JOIN public.org_members om2 ON om1.org_id = om2.org_id
    WHERE om1.user_id = auth.uid()
    AND om2.user_id = users.id
  )
);