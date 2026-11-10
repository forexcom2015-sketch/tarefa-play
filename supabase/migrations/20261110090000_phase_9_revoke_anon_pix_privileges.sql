-- contas_pix is private user financial data and has no anon RLS policy.
-- Remove unnecessary table privileges from the unauthenticated API role.
revoke all privileges on table public.contas_pix from anon;
