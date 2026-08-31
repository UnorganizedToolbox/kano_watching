-- Drop the existing constraint
ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;

-- Add the new constraint including 'tester'
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('student', 'admin', 'tester'));
