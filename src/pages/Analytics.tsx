import { useState, useEffect } from "react";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  Funnel,
  FunnelChart,
  LabelList
} from "recharts";
import { 
  Briefcase, 
  Users, 
  Clock, 
  TrendingUp, 
  Target,
  CheckCircle,
  XCircle,
  Calendar,
  BarChart3
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
}

function MetricCard({ title, value, description, icon, trend }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp className={`w-3 h-3 ${trend.value < 0 ? 'rotate-180' : ''}`} />
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const STAGE_COLORS: Record<string, string> = {
  new: "hsl(var(--muted-foreground))",
  shortlisted: "hsl(217, 91%, 60%)",
  interview: "hsl(45, 93%, 47%)",
  offer: "hsl(271, 91%, 65%)",
  hired: "hsl(142, 71%, 45%)",
  rejected: "hsl(0, 84%, 60%)",
};

const PIE_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"];

export default function Analytics() {
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
  const [stageDistribution, setStageDistribution] = useState<{ stage: string; count: number; fill: string }[]>([]);
  const [applicationsTrend, setApplicationsTrend] = useState<{ date: string; applications: number }[]>([]);
  const [funnelData, setFunnelData] = useState<{ stage: string; value: number; fill: string }[]>([]);
  const [jobPerformance, setJobPerformance] = useState<{ title: string; applications: number; hired: number }[]>([]);

  useEffect(() => {
    if (currentOrg?.id) {
      loadAnalytics();
    }
  }, [currentOrg?.id]);

  const loadAnalytics = async () => {
    if (!currentOrg?.id) return;
    setLoading(true);

    try {
      // Fetch jobs
      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, title, status, created_at")
        .eq("org_id", currentOrg.id);

      // Fetch applications
      const { data: applications } = await supabase
        .from("applications")
        .select("id, stage, status, created_at, job_id")
        .eq("org_id", currentOrg.id);

      // Fetch hires
      const { data: hires } = await supabase
        .from("hires")
        .select("id, created_at, start_date, application_id")
        .eq("org_id", currentOrg.id);

      const totalJobs = jobs?.length || 0;
      const activeJobs = jobs?.filter(j => j.status === "open").length || 0;
      const totalApplications = applications?.length || 0;
      const totalHired = hires?.length || 0;

      // Calculate conversion rate
      const conversionRate = totalApplications > 0 
        ? Math.round((totalHired / totalApplications) * 100) 
        : 0;

      // Calculate avg time to hire (mock - would need actual hire dates)
      const avgTimeToHire = totalHired > 0 ? 18 : 0; // Placeholder

      setMetrics({
        totalJobs,
        activeJobs,
        totalApplications,
        totalHired,
        avgTimeToHire,
        conversionRate,
      });

      // Stage distribution
      const stageCounts: Record<string, number> = {
        new: 0,
        shortlisted: 0,
        interview: 0,
        offer: 0,
        hired: 0,
        rejected: 0,
      };
      applications?.forEach(app => {
        const stage = app.stage || "new";
        if (stageCounts[stage] !== undefined) {
          stageCounts[stage]++;
        }
      });
      setStageDistribution(
        Object.entries(stageCounts).map(([stage, count]) => ({
          stage: stage.charAt(0).toUpperCase() + stage.slice(1),
          count,
          fill: STAGE_COLORS[stage] || "#64748b",
        }))
      );

      // Funnel data
      const funnelStages = ["new", "shortlisted", "interview", "offer", "hired"];
      let cumulativeCount = totalApplications;
      setFunnelData(
        funnelStages.map(stage => {
          const stageCount = stageCounts[stage] || 0;
          // For funnel, show cumulative progression
          const value = stage === "new" ? totalApplications : stageCounts[stage];
          return {
            stage: stage.charAt(0).toUpperCase() + stage.slice(1),
            value,
            fill: STAGE_COLORS[stage],
          };
        })
      );

      // Applications trend (last 30 days)
      const thirtyDaysAgo = subDays(new Date(), 30);
      const days = eachDayOfInterval({ start: thirtyDaysAgo, end: new Date() });
      const trendData = days.map(day => {
        const dayStr = format(day, "yyyy-MM-dd");
        const count = applications?.filter(app => 
          app.created_at && format(new Date(app.created_at), "yyyy-MM-dd") === dayStr
        ).length || 0;
        return {
          date: format(day, "MMM d"),
          applications: count,
        };
      });
      setApplicationsTrend(trendData);

      // Job performance
      const jobPerf = jobs?.slice(0, 5).map(job => {
        const jobApps = applications?.filter(app => app.job_id === job.id) || [];
        const jobHired = jobApps.filter(app => app.stage === "hired").length;
        return {
          title: job.title.length > 20 ? job.title.substring(0, 20) + "..." : job.title,
          applications: jobApps.length,
          hired: jobHired,
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

  return (
    <SidebarLayout userRole="recruiter">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Hiring metrics and insights for your organization</p>
          </div>
          <Badge variant="outline" className="gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Last 30 days
          </Badge>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Jobs"
            value={metrics.totalJobs}
            description={`${metrics.activeJobs} active`}
            icon={<Briefcase className="w-4 h-4" />}
          />
          <MetricCard
            title="Applications"
            value={metrics.totalApplications}
            description="Total received"
            icon={<Users className="w-4 h-4" />}
          />
          <MetricCard
            title="Hires"
            value={metrics.totalHired}
            description={`${metrics.conversionRate}% conversion`}
            icon={<CheckCircle className="w-4 h-4" />}
          />
          <MetricCard
            title="Avg. Time to Hire"
            value={metrics.avgTimeToHire > 0 ? `${metrics.avgTimeToHire} days` : "N/A"}
            description="From application to offer"
            icon={<Clock className="w-4 h-4" />}
          />
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="funnel" className="gap-2">
              <Target className="w-4 h-4" />
              Hiring Funnel
            </TabsTrigger>
            <TabsTrigger value="trends" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Trends
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Stage Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pipeline Distribution</CardTitle>
                  <CardDescription>Candidates by stage</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stageDistribution} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" />
                        <YAxis dataKey="stage" type="category" width={80} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--popover))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }} 
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                          {stageDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Job Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Jobs</CardTitle>
                  <CardDescription>Applications vs hires</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    {jobPerformance.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={jobPerformance}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="title" tick={{ fontSize: 12 }} />
                          <YAxis />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--popover))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }} 
                          />
                          <Legend />
                          <Bar dataKey="applications" fill="#6366f1" name="Applications" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="hired" fill="#22c55e" name="Hired" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        No job data yet
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="funnel" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Hiring Funnel</CardTitle>
                <CardDescription>Candidate progression through stages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnelData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="stage" />
                      <YAxis />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--popover))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Bar dataKey="value" name="Candidates" radius={[4, 4, 0, 0]}>
                        {funnelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Funnel Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 pt-6 border-t">
                  {funnelData.map((stage, idx) => {
                    const prevValue = idx > 0 ? funnelData[idx - 1].value : stage.value;
                    const dropoff = prevValue > 0 ? Math.round(((prevValue - stage.value) / prevValue) * 100) : 0;
                    return (
                      <div key={stage.stage} className="text-center">
                        <div className="text-2xl font-bold">{stage.value}</div>
                        <div className="text-sm text-muted-foreground">{stage.stage}</div>
                        {idx > 0 && dropoff > 0 && (
                          <div className="text-xs text-red-500 mt-1">-{dropoff}% dropoff</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Applications Over Time</CardTitle>
                <CardDescription>Last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={applicationsTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 11 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--popover))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="applications" 
                        stroke="#6366f1" 
                        strokeWidth={2}
                        dot={false}
                        name="Applications"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SidebarLayout>
  );
}
