-- Storage bucket for tax filing data packages
INSERT INTO storage.buckets (id, name, public)
VALUES ('tax-filing-packages', 'tax-filing-packages', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Only service role can insert (edge function uses service role)
CREATE POLICY "Service role can manage tax filing packages"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'tax-filing-packages')
WITH CHECK (bucket_id = 'tax-filing-packages');

-- RLS: Users can read their own files
CREATE POLICY "Users can read own tax filing packages"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'tax-filing-packages'
  AND (storage.foldername(name))[1] = auth.uid()::text
);