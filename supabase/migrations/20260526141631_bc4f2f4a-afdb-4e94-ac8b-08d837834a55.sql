
-- Grant anon (public) read access to all viewable tables
GRANT SELECT ON public.members TO anon;
GRANT SELECT ON public.families TO anon;
GRANT SELECT ON public.announcements TO anon;
GRANT SELECT ON public.services_schedule TO anon;
GRANT SELECT ON public.daily_verses TO anon;
GRANT SELECT ON public.prayer_requests TO anon;
GRANT SELECT ON public.reactions TO anon;

-- Update RLS policies to allow anonymous (public) viewing
DROP POLICY IF EXISTS "Authed view members" ON public.members;
CREATE POLICY "Public view members" ON public.members FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone authed views families" ON public.families;
CREATE POLICY "Public view families" ON public.families FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authed view announcements" ON public.announcements;
CREATE POLICY "Public view announcements" ON public.announcements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authed view schedule" ON public.services_schedule;
CREATE POLICY "Public view schedule" ON public.services_schedule FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authed view verses" ON public.daily_verses;
CREATE POLICY "Public view verses" ON public.daily_verses FOR SELECT USING (true);

DROP POLICY IF EXISTS "View approved or own or admin" ON public.prayer_requests;
CREATE POLICY "Public view approved, own, or admin" ON public.prayer_requests FOR SELECT
USING (
  status = 'aprovado'::prayer_status
  OR author_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Authed view reactions" ON public.reactions;
CREATE POLICY "Public view reactions" ON public.reactions FOR SELECT USING (true);
