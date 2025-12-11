import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Calendar } from "lucide-react";

interface MonthPlan {
  month_index: number;
  theme: string;
  focus_items: string[];
}

interface WeeklyPlanViewProps {
  months: MonthPlan[];
}

export function WeeklyPlanView({ months }: WeeklyPlanViewProps) {
  // Convert monthly plan to weekly breakdown
  const generateWeeklyPlan = (months: MonthPlan[]) => {
    const weeks: Array<{
      week: number;
      month: number;
      theme: string;
      tasks: string[];
    }> = [];

    months.forEach((month) => {
      const itemsPerWeek = Math.ceil((month.focus_items?.length || 0) / 4);
      
      for (let w = 0; w < 4; w++) {
        const weekNum = (month.month_index - 1) * 4 + w + 1;
        const startIdx = w * itemsPerWeek;
        const weekTasks = month.focus_items?.slice(startIdx, startIdx + itemsPerWeek) || [];
        
        weeks.push({
          week: weekNum,
          month: month.month_index,
          theme: month.theme,
          tasks: weekTasks.length > 0 ? weekTasks : [`Continue: ${month.theme}`]
        });
      }
    });

    return weeks;
  };

  const weeks = generateWeeklyPlan(months);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {weeks.map((week) => (
          <Card key={week.week} className="hover:border-primary/30 transition-colors">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  Week {week.week}
                </span>
                <Badge variant="outline" className="text-xs">
                  M{week.month}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-4">
              <p className="text-xs text-muted-foreground mb-2 font-medium">{week.theme}</p>
              <ul className="space-y-1">
                {week.tasks.map((task, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                    <ChevronRight className="h-3 w-3 shrink-0 mt-0.5 text-primary" />
                    <span className="line-clamp-2">{task}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
