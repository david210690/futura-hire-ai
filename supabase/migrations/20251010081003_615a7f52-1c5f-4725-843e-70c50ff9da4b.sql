-- Create subscriptions table for trial and plan tracking
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'razorpay',
  subscription_id TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  trial_start_at TIMESTAMPTZ,
  trial_end_at TIMESTAMPTZ,
  trial_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id)
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Org members can view their org subscription"
ON public.subscriptions
FOR SELECT
USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "Org admins can manage subscriptions"
ON public.subscriptions
FOR ALL
USING (is_org_admin(auth.uid(), org_id));

CREATE POLICY "System can manage subscriptions"
ON public.subscriptions
FOR ALL
USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS subscriptions_org_id_idx ON public.subscriptions(org_id);
CREATE INDEX IF NOT EXISTS subscriptions_trial_status_idx ON public.subscriptions(trial_status) WHERE trial_status = 'active';