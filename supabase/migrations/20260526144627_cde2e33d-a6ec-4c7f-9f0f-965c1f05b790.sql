-- Allow anyone (including anonymous visitors) to submit prayer requests
DROP POLICY IF EXISTS "Authed create requests" ON public.prayer_requests;

CREATE POLICY "Anyone can create pending requests"
ON public.prayer_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'pendente'
  AND (
    (auth.uid() IS NULL AND author_id IS NULL)
    OR (auth.uid() IS NOT NULL AND author_id = auth.uid())
  )
);

GRANT INSERT ON public.prayer_requests TO anon;