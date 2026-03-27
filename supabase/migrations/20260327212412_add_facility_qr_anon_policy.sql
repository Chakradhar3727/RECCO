-- Allow anonymous users to select from facility_qr_codes for delivery scans
CREATE POLICY "Allow anon read facility_qr_codes"
ON public.facility_qr_codes
FOR SELECT 
TO anon 
USING (true);
