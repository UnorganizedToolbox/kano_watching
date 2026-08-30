-- 1. Add basic gamification stats to profiles
ALTER TABLE public.profiles
  ADD COLUMN exp integer DEFAULT 0,
  ADD COLUMN level integer DEFAULT 1,
  ADD COLUMN free_stones integer DEFAULT 0,
  ADD COLUMN premium_currency integer DEFAULT 0,
  ADD COLUMN current_streak_days integer DEFAULT 0,
  ADD COLUMN max_streak_days integer DEFAULT 0,
  ADD COLUMN total_study_minutes integer DEFAULT 0,
  ADD COLUMN base_efficiency numeric DEFAULT 1.0; -- Ed (基礎効率)

-- 2. Create table for unlocked achievements
CREATE TABLE public.student_achievements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id text NOT NULL,
  unlocked_at timestamp with time zone DEFAULT now(),
  UNIQUE(student_id, achievement_id)
);

-- Enable RLS for student_achievements
ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own achievements" ON public.student_achievements
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Admin can view all achievements" ON public.student_achievements
  FOR SELECT USING (is_admin());

CREATE POLICY "Users can insert their own achievements" ON public.student_achievements
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- 3. Create table for daily/weekly task tracking (optional, but good for tracking things like "today's pomodoros")
CREATE TABLE public.student_activity_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type text NOT NULL, -- e.g., 'POMODORO_COMPLETED', 'TEST_PASSED'
  activity_date date DEFAULT CURRENT_DATE,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS for student_activity_logs
ALTER TABLE public.student_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity" ON public.student_activity_logs
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Admin can view all activity" ON public.student_activity_logs
  FOR SELECT USING (is_admin());

CREATE POLICY "Users can log their own activity" ON public.student_activity_logs
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Grant permissions to anon and authenticated
GRANT SELECT, INSERT, UPDATE ON public.student_achievements TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.student_activity_logs TO anon, authenticated;

