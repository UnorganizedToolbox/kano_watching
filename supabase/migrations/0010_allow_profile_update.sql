-- Allow users to update their own profiles (needed for exp, study_minutes, etc.)
CREATE POLICY "Users can update own profile" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);
