-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  student_id text UNIQUE NOT NULL,
  name text NOT NULL,
  email text UNIQUE,
  role text NOT NULL CHECK (role IN ('student', 'admin')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'disabled')),
  created_at timestamp with time zone DEFAULT now()
);

-- Questions table (Q&A box)
CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_uuid uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  image_url text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered')),
  answer_body text,
  answered_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Pomodoro logs table
CREATE TABLE public.pomodoro_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_uuid uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('start', 'stop', 'complete')),
  duration_seconds integer,
  idle_seconds integer,
  memo text,
  created_at timestamp with time zone DEFAULT now()
);

-- Diagnostic results table
CREATE TABLE public.diagnostic_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_uuid uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_score integer NOT NULL,
  answers_json jsonb NOT NULL,
  weaknesses text,
  recommendation text,
  created_at timestamp with time zone DEFAULT now()
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pomodoro_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_results ENABLE ROW LEVEL SECURITY;

-- Profiles RLS: Students can read their own profile, admins can read/write all
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Questions RLS: Students can read/write their own questions, admins can read/write all
CREATE POLICY "Students can view own questions" ON public.questions FOR SELECT USING (auth.uid() = student_uuid);
CREATE POLICY "Students can insert own questions" ON public.questions FOR INSERT WITH CHECK (auth.uid() = student_uuid);
CREATE POLICY "Admins can view all questions" ON public.questions FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update all questions" ON public.questions FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Pomodoro RLS: Students can read/write their own logs, admins can read all
CREATE POLICY "Students can view own logs" ON public.pomodoro_logs FOR SELECT USING (auth.uid() = student_uuid);
CREATE POLICY "Students can insert own logs" ON public.pomodoro_logs FOR INSERT WITH CHECK (auth.uid() = student_uuid);
CREATE POLICY "Admins can view all logs" ON public.pomodoro_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Diagnostic Results RLS: Students can read own results, admins can read all
CREATE POLICY "Students can view own results" ON public.diagnostic_results FOR SELECT USING (auth.uid() = student_uuid);
CREATE POLICY "Students can insert own results" ON public.diagnostic_results FOR INSERT WITH CHECK (auth.uid() = student_uuid);
CREATE POLICY "Admins can view all results" ON public.diagnostic_results FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

