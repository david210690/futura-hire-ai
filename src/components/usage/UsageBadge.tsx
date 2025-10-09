import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";

interface UsageBadgeProps {
  metric: string;
  label: string;
}

export const UsageBadge = ({ metric, label }: UsageBadgeProps) => {
  const { currentOrg } = useCurrentOrg();
  const [usage, setUsage] = useState<{ count: number; limit: number } | null>(null);

  useEffect(() => {
    loadUsage();
  }, [currentOrg, metric]);

  const loadUsage = async () => {
    if (!currentOrg) return;

    // Get current usage
    const { data: usageData } = await supabase
      .from('usage_counters')
      .select('count')
      .eq('org_id', currentOrg.id)
      .eq('metric', metric)
      .eq('day', new Date().toISOString().split('T')[0])
      .maybeSingle();

    // Get limit
    const { data: limitData } = await supabase
      .from('entitlements')
      .select('value')
      .eq('org_id', currentOrg.id)
      .eq('feature', `limits_${metric}_per_day`)
      .maybeSingle();

    const count = usageData?.count || 0;
    const limit = limitData?.value ? parseInt(limitData.value) : getDefaultLimit(metric);

    setUsage({ count, limit });
  };

  const getDefaultLimit = (metric: string): number => {
    const defaults: Record<string, number> = {
      ai_shortlist: 3,
      video_analysis: 2,
      coach_runs: 2,
      bias_runs: 2,
      marketing_runs: 3,
    };
    return defaults[metric] || 5;
  };

  if (!usage) return null;

  const percentage = (usage.count / usage.limit) * 100;
  const variant = percentage >= 100 ? "destructive" : percentage >= 80 ? "secondary" : "outline";

  return (
    <Badge variant={variant} className="gap-1">
      {label}: {usage.count}/{usage.limit}
    </Badge>
  );
};
