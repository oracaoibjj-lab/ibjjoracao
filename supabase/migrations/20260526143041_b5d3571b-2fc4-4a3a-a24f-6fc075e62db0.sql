
INSERT INTO storage.buckets (id, name, public)
VALUES ('member-photos', 'member-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public view member photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'member-photos');

CREATE POLICY "Admins upload member photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'member-photos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update member photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'member-photos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete member photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'member-photos' AND has_role(auth.uid(), 'admin'::app_role));
