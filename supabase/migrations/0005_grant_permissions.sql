-- Grant usage on schema public
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant permissions for profiles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO anon, authenticated;

-- Grant permissions for questions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO anon, authenticated;

-- Grant permissions for pomodoro_logs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pomodoro_logs TO anon, authenticated;

-- Grant permissions for diagnostic_results
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diagnostic_results TO anon, authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
