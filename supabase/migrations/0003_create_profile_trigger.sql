-- Function to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, student_id, name, email, role, status)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'student_id', 'std_' || substr(new.id::text, 1, 6)),
    COALESCE(new.raw_user_meta_data->>'name', 'Unknown'),
    new.email,
    'student',
    'active'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function after a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
