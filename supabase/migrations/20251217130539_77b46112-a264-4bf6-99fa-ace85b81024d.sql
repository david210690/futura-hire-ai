-- Add pilot and plan tracking fields to orgs table
ALTER TABLE public.orgs 
ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'growth',
ADD COLUMN IF NOT EXISTS plan_status TEXT NOT NULL DEFAULT 'pilot',
ADD COLUMN IF NOT EXISTS pilot_start_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pilot_end_at TIMESTAMPTZ DEFAULT '2026-03-31 23:59:59+05:30',
ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS razorpay_customer_id TEXT,
ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT;

-- Add constraint for plan_status values
ALTER TABLE public.orgs 
ADD CONSTRAINT valid_plan_status CHECK (plan_status IN ('pilot', 'active', 'locked'));

-- Add constraint for plan_tier values  
ALTER TABLE public.orgs 
ADD CONSTRAINT valid_plan_tier CHECK (plan_tier IN ('growth', 'starter', 'scale'));

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_orgs_plan_status ON public.orgs(plan_status);
CREATE INDEX IF NOT EXISTS idx_orgs_pilot_end_at ON public.orgs(pilot_end_at);