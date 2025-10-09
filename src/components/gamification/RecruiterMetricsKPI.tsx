import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Zap, Target, Award } from "lucide-react";

interface RecruiterMetricsKPIProps {
  metrics: {
    jobs_created: number;
    shortlists_run: number;
    avg_time_to_shortlist: number | null;
    diversity_champion_count: number;
  };
}

export const RecruiterMetricsKPI = ({ metrics }: RecruiterMetricsKPIProps) => {
  const kpis = [
    {
      icon: Briefcase,
      label: 'Jobs Created',
      value: metrics.jobs_created,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      icon: Zap,
      label: 'Shortlists Run',
      value: metrics.shortlists_run,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      icon: Target,
      label: 'Avg. Time to Shortlist',
      value: metrics.avg_time_to_shortlist 
        ? `${(metrics.avg_time_to_shortlist / 3600000).toFixed(1)}h`
        : 'N/A',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      icon: Award,
      label: 'Diversity Champion',
      value: metrics.diversity_champion_count,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.label}
              </CardTitle>
              <div className={`p-2 rounded-full ${kpi.bgColor}`}>
                <Icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{kpi.value}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
