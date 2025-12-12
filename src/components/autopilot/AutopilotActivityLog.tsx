import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Mail, 
  Linkedin, 
  Dna, 
  Mic, 
  ArrowRight, 
  Zap,
  CheckCircle2,
  XCircle,
  SkipForward,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface AutopilotActivityLogProps {
  jobTwinJobId: string;
}

interface ActionLog {
  id: string;
  action_type: string;
  action_payload: Record<string, unknown>;
  status: string;
  created_at: string;
  candidate_name?: string;
  candidate_user_id?: string;
}

const getActionIcon = (actionType: string) => {
  switch (actionType) {
    case 'email_sent':
      return <Mail className="h-4 w-4" />;
    case 'linkedin_message_sent':
      return <Linkedin className="h-4 w-4" />;
    case 'fit_request_sent':
      return <Dna className="h-4 w-4" />;
    case 'voice_interview_requested':
      return <Mic className="h-4 w-4" />;
    case 'stage_updated':
      return <ArrowRight className="h-4 w-4" />;
    default:
      return <Zap className="h-4 w-4" />;
  }
};

const getActionLabel = (actionType: string): string => {
  const labels: Record<string, string> = {
    'email_sent': 'Email Sent',
    'linkedin_message_sent': 'LinkedIn Message',
    'fit_request_sent': 'Fit Request',
    'voice_interview_requested': 'Voice Interview',
    'stage_updated': 'Stage Updated'
  };
  return labels[actionType] || actionType;
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return (
        <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Done
        </Badge>
      );
    case 'skipped':
      return (
        <Badge variant="outline" className="text-slate-600 border-slate-300 bg-slate-50 dark:bg-slate-900/20">
          <SkipForward className="h-3 w-3 mr-1" />
          Skipped
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50 dark:bg-red-900/20">
          <XCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export function AutopilotActivityLog({ jobTwinJobId }: AutopilotActivityLogProps) {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ActionLog[]>([]);

  useEffect(() => {
    fetchActivityLogs();
  }, [jobTwinJobId]);

  const fetchActivityLogs = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-autopilot-activity?jobId=${jobTwinJobId}&limit=20`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-primary" />
          Autopilot Activity
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={fetchActivityLogs}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No actions taken yet. Execute tasks from the Hiring Plan to see activity here.
          </p>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {logs.map((log) => (
              <div 
                key={log.id} 
                className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-muted/30"
              >
                <div className="mt-0.5 text-muted-foreground">
                  {getActionIcon(log.action_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                      {getActionLabel(log.action_type)}
                    </span>
                    {getStatusBadge(log.status)}
                  </div>
                  {log.candidate_name && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Candidate: {log.candidate_name}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(log.created_at), 'PPp')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <p className="text-xs text-muted-foreground text-center mt-4 pt-3 border-t border-border/50">
          Autopilot assists execution; final decisions remain human.
        </p>
      </CardContent>
    </Card>
  );
}
