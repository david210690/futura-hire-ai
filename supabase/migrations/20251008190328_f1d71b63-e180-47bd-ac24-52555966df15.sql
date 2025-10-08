-- Critical Security Fix: Move roles to separate table

-- 1. Drop policies that depend on role column
DROP POLICY IF EXISTS "Recruiters can create companies" ON public.companies;
DROP POLICY IF EXISTS "Recruiters can create jobs" ON public.jobs;

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. Migrate existing data
INSERT INTO public.user_roles (user_id, role)
SELECT id, role FROM public.users WHERE role IS NOT NULL;

-- 5. Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', 'User'));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'candidate'));
  
  RETURN NEW;
END;
$$;

-- 6. Drop role column
ALTER TABLE public.users DROP COLUMN role;

-- 7. RLS for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert roles" ON public.user_roles FOR INSERT WITH CHECK (true);

-- 8. Recreate policies using has_role
CREATE POLICY "Recruiters can create companies" ON public.companies
FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'recruiter'));

CREATE POLICY "Recruiters can create jobs" ON public.jobs
FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'recruiter') AND 
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND company_id = jobs.company_id)
);