import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Flame } from "lucide-react";

interface Action {
  action: string;
  type: string;
  timeline: string;
}

interface GrowthFocusArea {
  area: string;
  objective: string;
  current_level: string;
  target_level: string;
  actions: Action[];
  quick_win: boolean;
}

interface ProgressTrackerProps {
  growthAreas: GrowthFocusArea[];
  completedActions: string[];
  onToggleAction: (actionId: string) => void;
}

export function ProgressTracker({
  growthAreas,
  completedActions,
  onToggleAction
}: ProgressTrackerProps) {
  const allActions = growthAreas.flatMap((area, areaIndex) =>
    area.actions.map((action, actionIndex) => ({
      id: `${areaIndex}-${actionIndex}`,
      ...action,
      areaName: area.area,
      isQuickWin: area.quick_win
    }))
  );

  const totalActions = allActions.length;
  const completedCount = completedActions.length;
  const progressPercent = totalActions > 0 ? (completedCount / totalActions) * 100 : 0;

  // Sort: quick wins first, then incomplete, then completed
  const sortedActions = [...allActions].sort((a, b) => {
    const aCompleted = completedActions.includes(a.id);
    const bCompleted = completedActions.includes(b.id);
    
    if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;
    if (a.isQuickWin !== b.isQuickWin) return a.isQuickWin ? -1 : 1;
    return 0;
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Action Progress
          </CardTitle>
          <Badge variant="secondary">
            {completedCount}/{totalActions} completed
          </Badge>
        </div>
        <Progress value={progressPercent} className="h-2 mt-2" />
      </CardHeader>
      <CardContent className="space-y-2">
        {sortedActions.slice(0, 5).map((action) => {
          const isCompleted = completedActions.includes(action.id);
          return (
            <div
              key={action.id}
              className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
                isCompleted ? "bg-muted/30 opacity-60" : "hover:bg-muted/50"
              }`}
            >
              <Checkbox
                id={action.id}
                checked={isCompleted}
                onCheckedChange={() => onToggleAction(action.id)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <label
                  htmlFor={action.id}
                  className={`text-sm cursor-pointer ${isCompleted ? "line-through text-muted-foreground" : ""}`}
                >
                  {action.action}
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {action.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {action.timeline}
                  </span>
                  {action.isQuickWin && (
                    <Badge variant="secondary" className="text-xs text-amber-600">
                      <Flame className="h-3 w-3 mr-1" />
                      Quick Win
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {totalActions > 5 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            +{totalActions - 5} more actions in your full blueprint
          </p>
        )}
      </CardContent>
    </Card>
  );
}
