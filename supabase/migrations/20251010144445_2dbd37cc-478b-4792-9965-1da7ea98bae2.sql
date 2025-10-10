-- Add missing columns for candidate-facing workflow
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS slug text UNIQUE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS slug text UNIQUE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS default_assessment_id uuid REFERENCES assessments(id);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS video_required boolean DEFAULT false;

ALTER TABLE applications ADD COLUMN IF NOT EXISTS apply_token text UNIQUE;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS video_required boolean DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orgs_slug ON orgs(slug);
CREATE INDEX IF NOT EXISTS idx_jobs_slug ON jobs(slug);
CREATE INDEX IF NOT EXISTS idx_applications_token ON applications(apply_token);

-- Function to generate slug from name
CREATE OR REPLACE FUNCTION generate_slug(name text) 
RETURNS text 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
END;
$$;

-- Trigger to auto-generate org slug
CREATE OR REPLACE FUNCTION set_org_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := generate_slug(NEW.name);
    -- Handle duplicates by appending random suffix
    WHILE EXISTS (SELECT 1 FROM orgs WHERE slug = NEW.slug AND id != NEW.id) LOOP
      NEW.slug := generate_slug(NEW.name) || '-' || substr(md5(random()::text), 1, 6);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_org_slug_trigger
BEFORE INSERT OR UPDATE ON orgs
FOR EACH ROW EXECUTE FUNCTION set_org_slug();

-- Trigger to auto-generate job slug
CREATE OR REPLACE FUNCTION set_job_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := generate_slug(NEW.title);
    -- Handle duplicates by appending random suffix
    WHILE EXISTS (SELECT 1 FROM jobs WHERE slug = NEW.slug AND id != NEW.id) LOOP
      NEW.slug := generate_slug(NEW.title) || '-' || substr(md5(random()::text), 1, 6);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_job_slug_trigger
BEFORE INSERT OR UPDATE ON jobs
FOR EACH ROW EXECUTE FUNCTION set_job_slug();

-- Function to generate apply token
CREATE OR REPLACE FUNCTION generate_apply_token()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  token text;
BEGIN
  token := encode(gen_random_bytes(24), 'base64');
  token := replace(replace(replace(token, '/', ''), '+', ''), '=', '');
  RETURN token;
END;
$$;

-- Trigger to auto-generate apply token
CREATE OR REPLACE FUNCTION set_apply_token()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.apply_token IS NULL THEN
    NEW.apply_token := generate_apply_token();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_apply_token_trigger
BEFORE INSERT ON applications
FOR EACH ROW EXECUTE FUNCTION set_apply_token();

-- RLS policies for public access to jobs
CREATE POLICY "Public can view public jobs"
ON jobs
FOR SELECT
USING (is_public = true);

-- RLS policy for applications via token
CREATE POLICY "Candidates can view own application via token"
ON applications
FOR SELECT
USING (apply_token IS NOT NULL);

CREATE POLICY "Public can create applications"
ON applications
FOR INSERT
WITH CHECK (true);

-- Update existing orgs and jobs with slugs
UPDATE orgs SET slug = generate_slug(name) WHERE slug IS NULL;
UPDATE jobs SET slug = generate_slug(title) WHERE slug IS NULL;