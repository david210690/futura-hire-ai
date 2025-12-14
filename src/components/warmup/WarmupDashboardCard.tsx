import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Clock, ChevronRight, Lightbulb } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";

interface WarmupHistoryItem {
  runId: string;
  createdAt: string;
  scenarioTitle: string;
  signals: string[];
  reflection: string[];
}

export function WarmupDashboardCard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [eligible, setEligible] = useState(true);
  const [nextEligibleAt, setNextEligibleAt] = useState<string | null>(null);
  const [recentRuns, setRecentRuns] = useState<WarmupHistoryItem[]>([]);

  useEffect(() => {
    fetchWarmupStatus();
  }, []);

  const fetchWarmupStatus = async () => {
    try {
      // Fetch status
      const { data: statusData, error: statusError } = await supabase.functions.invoke(
        'get-scenario-warmup',
        { body: {}, headers: {} }
      );

      // Use URL params approach since invoke doesn't support query params well
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const statusRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-scenario-warmup?action=status`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const status = await statusRes.json();
      
      if (status.success) {
        setEligible(status.eligible);
        setNextEligibleAt(status.nextEligibleAt);
      }

      // Fetch recent history
      const historyRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-scenario-warmup?action=history&limit=3`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const history = await historyRes.json();

      if (history.success) {
        setRecentRuns(history.items || []);
      }
    } catch (error) {
      console.error('Error fetching warmup status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          Warm-ups (Optional)
        </CardTitle>
        <CardDescription>
          Small scenarios that help you reflect on work style. No right or wrong answers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status and CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {eligible ? (
            <>
              <p className="text-sm text-muted-foreground flex-1">
                You can try a warm-up if you feel like it.
              </p>
              <Button 
                onClick={() => navigate('/candidate/warmups')}
                size="sm"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Try a Warm-up
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground flex-1 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                You've already done one recently. 
                {nextEligibleAt && (
                  <span className="text-xs">
                    Next available: {formatDistanceToNow(new Date(nextEligibleAt), { addSuffix: true })}
                  </span>
                )}
              </p>
              <Button 
                size="sm"
                disabled
                variant="outline"
              >
                Try a Warm-up
              </Button>
            </>
          )}
        </div>

        {/* Recent history preview */}
        {recentRuns.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Recent Warm-ups
            </h4>
            <div className="space-y-2">
              {recentRuns.slice(0, 3).map((run) => (
                <div 
                  key={run.runId}
                  className="flex items-start gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{run.scenarioTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(run.createdAt), 'MMM d, yyyy')}
                    </p>
                    {run.signals.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {run.signals.slice(0, 2).map((signal, i) => (
                          <Badge key={i} variant="secondary" className="text-xs py-0">
                            {signal}
                          </Badge>
                        ))}
                        {run.signals.length > 2 && (
                          <span className="text-xs text-muted-foreground">+{run.signals.length - 2}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-xs"
              onClick={() => navigate('/candidate/warmups')}
            >
              View all
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}

        {/* Gentle copy */}
        <p className="text-xs text-muted-foreground text-center pt-2 italic">
          Pauses are okay. This is optional.
        </p>
      </CardContent>
    </Card>
  );
}
