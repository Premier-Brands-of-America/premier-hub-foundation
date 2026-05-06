-- Add azure_oid column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS azure_oid text;

CREATE INDEX IF NOT EXISTS idx_profiles_azure_oid ON public.profiles(azure_oid);

-- Update handle_new_user to capture azure oid + default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_oid text := COALESCE(
    NEW.raw_user_meta_data->>'oid',
    NEW.raw_user_meta_data->>'provider_id',
    NEW.raw_user_meta_data->>'sub'
  );
  v_name text := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
  v_avatar text := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture',
    ''
  );
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, avatar_url, azure_oid, role, is_active)
  VALUES (NEW.id, NEW.email, v_name, v_avatar, v_oid, 'requester', true)
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), public.profiles.avatar_url),
    azure_oid = COALESCE(EXCLUDED.azure_oid, public.profiles.azure_oid),
    updated_at = now();
  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();