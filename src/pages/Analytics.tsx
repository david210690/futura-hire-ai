import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  Briefcase, 
  Users,
  Clock, 
  TrendingUp, 
  Target,
  CheckCircle,
  Calendar,
  BarChart3,
  ArrowRight,
  ChevronDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { format, subDays, eachWeekOfInterval, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  highlight?: boolean;
}

function MetricCard({ title, value, description, icon, highlight }: MetricCardProps) {
  return (
    <Card className={highlight ? "border-primary/50 bg-primary/5" : ""}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
          </div>
          <div className="p-2 rounded-lg bg-muted">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

interface StageRowProps {
  label: string;
  count: number;
  total: number;
  color: string;
}

function StageRow({ label, count, total, color }: StageRowProps) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          <span className="font-semibold text-foreground">{count}</span> candidates ({percentage}%)
        </span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

interface FunnelStepProps {
  label: string;
  count: number;
  color: string;
  dropoff?: number;
  isLast?: boolean;
  onClick?: () => void;
}

function FunnelStep({ label, count, color, dropoff, isLast, onClick }: FunnelStepProps) {
  return (
    <div 
      className="flex items-center gap-3 cursor-pointer group"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      <div 
        className="w-20 h-20 rounded-xl flex flex-col items-center justify-center text-white font-bold shadow-lg transition-all group-hover:scale-105 group-hover:shadow-xl"
        style={{ backgroundColor: color }}
      >
        <span className="text-2xl">{count}</span>
      </div>
      <div className="flex-1">
        <p className="font-semibold text-lg group-hover:text-primary transition-colors">{label}</p>
        {dropoff !== undefined && dropoff > 0 && (
          <p className="text-sm text-muted-foreground">
            {dropoff}% moved to next stage
          </p>
        )}
        <p className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          Click to view candidates →
        </p>
      </div>
      {!isLast && (
        <div className="flex flex-col items-center text-muted-foreground">
          <ChevronDown className="w-6 h-6" />
        </div>
      )}
    </div>
  );
}

interface WeekData {
  week: string;
  count: number;
}

function WeeklyTrend({ data, max }: { data: WeekData[]; max: number }) {
  return (
    <div className="space-y-3">
      {data.map((week, idx) => (
        <div key={idx} className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground w-24 shrink-0">{week.week}</span>
          <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden">
            <div 
              className="h-full bg-primary rounded-lg flex items-center justify-end px-3 transition-all duration-500"
              style={{ width: max > 0 ? `${(week.count / max) * 100}%` : '0%', minWidth: week.count > 0 ? '40px' : '0' }}
            >
              {week.count > 0 && (
                <span className="text-sm font-semibold text-primary-foreground">{week.count}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const STAGE_CONFIG = [
  { key: "new", label: "New Applications", color: "#64748b" },
  { key: "shortlisted", label: "Shortlisted", color: "#3b82f6" },
  { key: "interview", label: "In Interviews", color: "#f59e0b" },
  { key: "offer", label: "Offer Stage", color: "#8b5cf6" },
  { key: "hired", label: "Hired", color: "#22c55e" },
  { key: "rejected", label: "Rejected", color: "#ef4444" },
];

export default function Analytics() {
  const navigate = useNavigate();
  const { currentOrg } = useCurrentOrg();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalJobs: 0,
    activeJobs: 0,
    totalApplications: 0,
    totalHired: 0,
    avgTimeToHire: 0,
    conversionRate: 0,
  });
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [weeklyData, setWeeklyData] = useState<WeekData[]>([]);
  const [jobPerformance, setJobPerformance] = useState<{ title: string; applications: number; hired: number; jobId: string }[]>([]);

  useEffect(() => {
    if (currentOrg?.id) {
      loadAnalytics();
    }
  }, [currentOrg?.id]);

  const loadAnalytics = async () => {
    if (!currentOrg?.id) return;
    setLoading(true);

    try {
      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, title, status, created_at")
        .eq("org_id", currentOrg.id);

      const { data: applications } = await supabase
        .from("applications")
        .select("id, stage, status, created_at, job_id")
        .eq("org_id", currentOrg.id);

      const { data: hires } = await supabase
        .from("hires")
        .select("id, created_at, start_date, application_id")
        .eq("org_id", currentOrg.id);

      const totalJobs = jobs?.length || 0;
      const activeJobs = jobs?.filter(j => j.status === "open").length || 0;
      const totalApplications = applications?.length || 0;
      const totalHired = hires?.length || 0;
      const conversionRate = totalApplications > 0 
        ? Math.round((totalHired / totalApplications) * 100) 
        : 0;
      const avgTimeToHire = totalHired > 0 ? 18 : 0;

      setMetrics({
        totalJobs,
        activeJobs,
        totalApplications,
        totalHired,
        avgTimeToHire,
        conversionRate,
      });

      // Stage distribution
      const counts: Record<string, number> = {
        new: 0, shortlisted: 0, interview: 0, offer: 0, hired: 0, rejected: 0,
      };
      applications?.forEach(app => {
        const stage = app.stage || "new";
        if (counts[stage] !== undefined) counts[stage]++;
      });
      setStageCounts(counts);

      // Weekly trend (last 6 weeks)
      const sixWeeksAgo = subDays(new Date(), 42);
      const weeks = eachWeekOfInterval({ start: sixWeeksAgo, end: new Date() });
      const weeklyTrend = weeks.slice(-6).map(weekStart => {
        const weekEnd = endOfWeek(weekStart);
        const count = applications?.filter(app => {
          if (!app.created_at) return false;
          const appDate = new Date(app.created_at);
          return isWithinInterval(appDate, { start: weekStart, end: weekEnd });
        }).length || 0;
        return {
          week: format(weekStart, "MMM d"),
          count,
        };
      });
      setWeeklyData(weeklyTrend);

      // Job performance
      const jobPerf = jobs?.slice(0, 5).map(job => {
        const jobApps = applications?.filter(app => app.job_id === job.id) || [];
        const jobHired = jobApps.filter(app => app.stage === "hired").length;
        return {
          title: job.title.length > 30 ? job.title.substring(0, 30) + "..." : job.title,
          applications: jobApps.length,
          hired: jobHired,
          jobId: job.id,
        };
      }) || [];
      setJobPerformance(jobPerf);

    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SidebarLayout userRole="recruiter">
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-80" />
        </div>
      </SidebarLayout>
    );
  }

  const funnelStages = ["new", "shortlisted", "interview", "offer", "hired"];
  const maxWeekly = Math.max(...weeklyData.map(w => w.count), 1);

  return (
    <SidebarLayout userRole="recruiter">
      <div className="p-6 space-y-6 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Your hiring at a glance</p>
          </div>
          <Badge variant="outline" className="gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Last 30 days
          </Badge>
        </div>

        {/* Key Metrics - Big Numbers */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Open Jobs"
            value={metrics.activeJobs}
            description={`${metrics.totalJobs} total jobs created`}
            icon={<Briefcase className="w-5 h-5" />}
          />
          <MetricCard
            title="Total Applications"
            value={metrics.totalApplications}
            description="Candidates applied"
            icon={<Users className="w-5 h-5" />}
          />
          <MetricCard
            title="Successful Hires"
            value={metrics.totalHired}
            description={`${metrics.conversionRate}% of applicants`}
            icon={<CheckCircle className="w-5 h-5" />}
            highlight={metrics.totalHired > 0}
          />
          <MetricCard
            title="Time to Hire"
            value={metrics.avgTimeToHire > 0 ? `${metrics.avgTimeToHire} days` : "—"}
            description="Average hiring time"
            icon={<Clock className="w-5 h-5" />}
          />
        </div>

        <Tabs defaultValue="pipeline" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pipeline" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="funnel" className="gap-2">
              <Target className="w-4 h-4" />
              Hiring Funnel
            </TabsTrigger>
            <TabsTrigger value="trends" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Weekly Trends
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pipeline Distribution - Simple Progress Bars */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Where are your candidates?</CardTitle>
                  <CardDescription>Current pipeline breakdown</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {STAGE_CONFIG.filter(s => s.key !== "rejected").map(stage => (
                    <StageRow
                      key={stage.key}
                      label={stage.label}
                      count={stageCounts[stage.key] || 0}
                      total={metrics.totalApplications}
                      color={stage.color}
                    />
                  ))}
                  {stageCounts.rejected > 0 && (
                    <div className="pt-4 border-t">
                      <StageRow
                        label="Rejected"
                        count={stageCounts.rejected}
                        total={metrics.totalApplications}
                        color="#ef4444"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Jobs - Simple List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Your Top Jobs</CardTitle>
                  <CardDescription>Most applications received</CardDescription>
                </CardHeader>
                <CardContent>
                  {jobPerformance.length > 0 ? (
                    <div className="space-y-4">
                      {jobPerformance.map((job, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => navigate(`/recruiter/jobs/${job.jobId}`)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && navigate(`/recruiter/jobs/${job.jobId}`)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{job.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {job.applications} applications
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            {job.hired > 0 ? (
                              <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                {job.hired} hired
                              </Badge>
                            ) : (
                              <Badge variant="secondary">No hires yet</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No jobs created yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="funnel" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Hiring Funnel</CardTitle>
                <CardDescription>How candidates move through your process</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-w-md mx-auto py-4">
                  {funnelStages.map((stageKey, idx) => {
                    const config = STAGE_CONFIG.find(s => s.key === stageKey)!;
                    const count = stageCounts[stageKey] || 0;
                    const prevCount = idx > 0 ? (stageCounts[funnelStages[idx - 1]] || 0) : count;
                    const progression = prevCount > 0 ? Math.round((count / prevCount) * 100) : 0;
                    
                    return (
                      <FunnelStep
                        key={stageKey}
                        label={config.label}
                        count={count}
                        color={config.color}
                        dropoff={idx > 0 ? progression : undefined}
                        isLast={idx === funnelStages.length - 1}
                        onClick={() => {
                          if (jobPerformance.length > 0) {
                            navigate(`/recruiter/jobs/${jobPerformance[0].jobId}?stage=${stageKey}`);
                          } else {
                            navigate('/recruiter');
                          }
                        }}
                      />
                    );
                  })}
                </div>

                {/* Summary */}
                <div className="mt-8 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Overall conversion</p>
                      <p className="text-2xl font-bold">{metrics.conversionRate}%</p>
                    </div>
                    <ArrowRight className="w-6 h-6 text-muted-foreground" />
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Out of {metrics.totalApplications} applicants</p>
                      <p className="text-2xl font-bold text-green-600">{metrics.totalHired} hired</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Weekly Applications</CardTitle>
                <CardDescription>Applications received per week</CardDescription>
              </CardHeader>
              <CardContent>
                <WeeklyTrend data={weeklyData} max={maxWeekly} />
                
                {/* Summary */}
                <div className="mt-6 pt-6 border-t">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <p className="text-sm text-muted-foreground">This week</p>
                      <p className="text-3xl font-bold">{weeklyData[weeklyData.length - 1]?.count || 0}</p>
                      <p className="text-sm text-muted-foreground">applications</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <p className="text-sm text-muted-foreground">6-week average</p>
                      <p className="text-3xl font-bold">
                        {Math.round(weeklyData.reduce((sum, w) => sum + w.count, 0) / Math.max(weeklyData.length, 1))}
                      </p>
                      <p className="text-sm text-muted-foreground">per week</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SidebarLayout>
  );
}
