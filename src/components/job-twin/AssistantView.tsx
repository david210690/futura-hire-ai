import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Bell, Calendar, CheckCircle2, Clock, ArrowRight, 
  AlertTriangle, Loader2, ExternalLink
} from "lucide-react";
import { format, formatDistanceToNow, isToday, isPast, isTomorrow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface UpcomingAction {
  id: string;
  job_id: string;
  job_title: string;
  company_name: string;
  next_action_at: string;
  next_action_type: string;
  status: string;
  match_score: number;
}

export function AssistantView() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState<UpcomingAction[]>([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);

  useEffect(() => {
    loadUpcomingActions();
  }, []);

  const loadUpcomingActions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("job_twin_profiles" as any)
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from("job_twin_jobs" as any)
        .select("id, job_id, next_action_at, next_action_type, status, match_score, jobs(title, companies(name))")
        .eq("profile_id", (profile as any).id)
        .not("next_action_at", "is", null)
        .order("next_action_at", { ascending: true });

      if (error) throw error;

      const mapped = (data || []).map((item: any) => ({
        id: item.id,
        job_id: item.job_id,
        job_title: item.jobs?.title || "Unknown Job",
        company_name: item.jobs?.companies?.name || "Unknown Company",
        next_action_at: item.next_action_at,
        next_action_type: item.next_action_type,
        status: item.status,
        match_score: item.match_score || 0,
      }));

      setActions(mapped);

      // Count overdue and today
      const now = new Date();
      const overdue = mapped.filter(a => isPast(new Date(a.next_action_at)) && !isToday(new Date(a.next_action_at))).length;
      const today = mapped.filter(a => isToday(new Date(a.next_action_at))).length;
      
      setOverdueCount(overdue);
      setTodayCount(today);

      // Show notification toast for urgent actions
      if (overdue > 0 || today > 0) {
        toast({
          title: "Action Items Pending",
          description: `${overdue} overdue, ${today} due today`,
          variant: overdue > 0 ? "destructive" : "default",
        });
      }
    } catch (error) {
      console.error("Error loading actions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: UpcomingAction) => {
    const date = new Date(action.next_action_at);
    if (isPast(date) && !isToday(date)) {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Overdue</Badge>;
    }
    if (isToday(date)) {
      return <Badge variant="default" className="gap-1 bg-orange-500"><Clock className="h-3 w-3" />Today</Badge>;
    }
    if (isTomorrow(date)) {
      return <Badge variant="secondary" className="gap-1"><Calendar className="h-3 w-3" />Tomorrow</Badge>;
    }
    return <Badge variant="outline" className="gap-1"><Calendar className="h-3 w-3" />{formatDistanceToNow(date, { addSuffix: true })}</Badge>;
  };

  const exportToCalendar = (action: UpcomingAction) => {
    const date = new Date(action.next_action_at);
    const endDate = new Date(date.getTime() + 30 * 60000); // 30 min duration
    
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//FuturaHire//Job Twin//EN
BEGIN:VEVENT
UID:${action.id}@futurahire.com
DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}
DTSTART:${format(date, "yyyyMMdd'T'HHmmss")}
DTEND:${format(endDate, "yyyyMMdd'T'HHmmss")}
SUMMARY:${action.next_action_type?.replace("_", " ")} - ${action.job_title}
DESCRIPTION:Job application action for ${action.job_title} at ${action.company_name}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${action.next_action_type}-${action.job_title.replace(/\s+/g, "-")}.ics`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({ title: "Calendar event exported", description: "Import the .ics file to your calendar app" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className={overdueCount > 0 ? "border-destructive" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${overdueCount > 0 ? "bg-destructive/10 text-destructive" : "bg-muted"}`}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overdueCount}</p>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={todayCount > 0 ? "border-orange-500" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${todayCount > 0 ? "bg-orange-100 text-orange-600" : "bg-muted"}`}>
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{todayCount}</p>
                <p className="text-sm text-muted-foreground">Due Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-muted">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{actions.length}</p>
                <p className="text-sm text-muted-foreground">Total Actions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Upcoming Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {actions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No scheduled actions yet.</p>
              <p className="text-sm">Generate contact plans for your matched jobs to see actions here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {actions.map((action, index) => (
                <div key={action.id}>
                  {index > 0 && <Separator className="my-3" />}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getActionBadge(action)}
                        <Badge variant="outline" className="capitalize">
                          {action.next_action_type?.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="font-medium truncate">{action.job_title}</p>
                      <p className="text-sm text-muted-foreground truncate">{action.company_name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(action.next_action_at), "PPp")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportToCalendar(action)}
                      >
                        <Calendar className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => navigate(`/job-twin/jobs/${action.id}`)}
                      >
                        Open <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
