-- Create a SECURITY DEFINER function to safely check if current user is admin
-- This bypasses RLS on the profiles table to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
  is_admin_flag boolean;
BEGIN
  SELECT (role = 'admin') INTO is_admin_flag
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN COALESCE(is_admin_flag, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop all existing problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all questions" ON public.questions;
DROP POLICY IF EXISTS "Admins can update all questions" ON public.questions;
DROP POLICY IF EXISTS "Admins can view all logs" ON public.pomodoro_logs;
DROP POLICY IF EXISTS "Admins can view all results" ON public.diagnostic_results;

-- Re-create policies using the safe function
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can view all questions" ON public.questions FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can update all questions" ON public.questions FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can view all logs" ON public.pomodoro_logs FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can view all results" ON public.diagnostic_results FOR SELECT USING (public.is_admin());
