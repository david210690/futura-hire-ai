import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { getCurrentUsage } from "@/lib/entitlements";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";

interface UsageBadgeProps {
  metric: string;
  limit: number;
  label?: string;
}

export const UsageBadge = ({ metric, limit, label }: UsageBadgeProps) => {
  const { currentOrg } = useCurrentOrg();
  const [usage, setUsage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      if (!currentOrg) return;
      
      try {
        const count = await getCurrentUsage(currentOrg.id, metric);
        setUsage(count);
      } catch (error) {
        console.error('Error fetching usage:', error);
        setUsage(0);
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, [currentOrg, metric]);

  if (loading) {
    return (
      <Badge variant="outline" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading...
      </Badge>
    );
  }

  const remaining = Math.max(0, limit - (usage || 0));
  const isLow = remaining <= 3;
  const isEmpty = remaining === 0;

  return (
    <Badge 
      variant={isEmpty ? "destructive" : isLow ? "outline" : "secondary"}
      className={isLow && !isEmpty ? "border-warning text-warning" : ""}
    >
      {label || metric}: {usage || 0} / {limit}
      {isEmpty && " (Upgrade to continue)"}
    </Badge>
  );
};
