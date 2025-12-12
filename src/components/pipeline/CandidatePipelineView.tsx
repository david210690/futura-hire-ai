import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import { BulkActionsToolbar } from "./BulkActionsToolbar";
import { 
  User, 
  ArrowRight, 
  CheckCircle, 
  XCircle, 
  Clock,
  Briefcase,
  MessageSquare,
  Video
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Application {
  id: string;
  stage: string;
  overall_score: number;
  skill_fit_score: number;
  culture_fit_score: number;
  candidates: {
    id: string;
    full_name: string;
    headline: string;
    skills: string;
  };
}

interface CandidatePipelineViewProps {
  applications: Application[];
  jobId: string;
  jobTitle?: string;
  onRefresh: () => void;
}

interface SelectedCandidate {
  applicationId: string;
  candidateId: string;
  candidateName: string;
  stage: string;
}

const STAGES = [
  { key: 'new', label: 'New', icon: Clock, color: 'bg-muted' },
  { key: 'shortlisted', label: 'Shortlisted', icon: User, color: 'bg-blue-500/10 text-blue-600' },
  { key: 'interview', label: 'Interview', icon: MessageSquare, color: 'bg-amber-500/10 text-amber-600' },
  { key: 'offer', label: 'Offer', icon: Briefcase, color: 'bg-purple-500/10 text-purple-600' },
  { key: 'hired', label: 'Hired', icon: CheckCircle, color: 'bg-green-500/10 text-green-600' },
  { key: 'rejected', label: 'Rejected', icon: XCircle, color: 'bg-red-500/10 text-red-600' },
];

export function CandidatePipelineView({ applications, jobId, jobTitle, onRefresh }: CandidatePipelineViewProps) {
  const { toast } = useToast();
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<SelectedCandidate[]>([]);

  const getStageCount = (stage: string) => {
    return applications.filter(app => (app.stage || 'new') === stage).length;
  };

  const getApplicationsByStage = (stage: string) => {
    return applications.filter(app => (app.stage || 'new') === stage);
  };

  const isSelected = (applicationId: string) => {
    return selectedCandidates.some(c => c.applicationId === applicationId);
  };

  const toggleSelection = (app: Application) => {
    if (isSelected(app.id)) {
      setSelectedCandidates(prev => prev.filter(c => c.applicationId !== app.id));
    } else {
      setSelectedCandidates(prev => [
        ...prev,
        {
          applicationId: app.id,
          candidateId: app.candidates.id,
          candidateName: app.candidates.full_name,
          stage: app.stage || 'new',
        },
      ]);
    }
  };

  const toggleSelectAll = (stage: string) => {
    const stageApps = getApplicationsByStage(stage);
    const allSelected = stageApps.every(app => isSelected(app.id));
    
    if (allSelected) {
      setSelectedCandidates(prev => prev.filter(c => !stageApps.some(app => app.id === c.applicationId)));
    } else {
      const newSelections = stageApps
        .filter(app => !isSelected(app.id))
        .map(app => ({
          applicationId: app.id,
          candidateId: app.candidates.id,
          candidateName: app.candidates.full_name,
          stage: app.stage || 'new',
        }));
      setSelectedCandidates(prev => [...prev, ...newSelections]);
    }
  };

  const handleBulkStageChange = async (newStage: string) => {
    const applicationIds = selectedCandidates.map(c => c.applicationId);
    
    const { error } = await supabase
      .from('applications')
      .update({ stage: newStage })
      .in('id', applicationIds);

    if (error) throw error;
    
    setSelectedCandidates([]);
    onRefresh();
  };

  const moveToStage = async (applicationId: string, candidateId: string, newStage: string) => {
    setUpdating(applicationId);
    try {
      const { error } = await supabase
        .from('applications')
        .update({ stage: newStage })
        .eq('id', applicationId);

      if (error) throw error;

      toast({
        title: "Stage updated",
        description: `Candidate moved to ${newStage}`,
      });
      onRefresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setUpdating(null);
    }
  };

  const getNextStages = (currentStage: string) => {
    const currentIndex = STAGES.findIndex(s => s.key === currentStage);
    return STAGES.slice(currentIndex + 1).filter(s => s.key !== 'rejected');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="w-5 h-5" />
          Candidate Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <BulkActionsToolbar
          selectedCandidates={selectedCandidates}
          onClearSelection={() => setSelectedCandidates([])}
          onStageChange={handleBulkStageChange}
          jobTitle={jobTitle}
        />

        <Tabs defaultValue="new" className="w-full">
          <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1">
            {STAGES.map(stage => {
              const count = getStageCount(stage.key);
              const Icon = stage.icon;
              return (
                <TabsTrigger 
                  key={stage.key} 
                  value={stage.key}
                  className="flex-1 min-w-[100px] gap-2 data-[state=active]:bg-background"
                >
                  <Icon className="w-4 h-4" />
                  {stage.label}
                  {count > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {count}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {STAGES.map(stage => {
            const stageApps = getApplicationsByStage(stage.key);
            const allSelected = stageApps.length > 0 && stageApps.every(app => isSelected(app.id));
            const someSelected = stageApps.some(app => isSelected(app.id));

            return (
              <TabsContent key={stage.key} value={stage.key} className="mt-4">
                {stageApps.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No candidates in {stage.label} stage
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Select All for this stage */}
                    <div className="flex items-center gap-2 px-4 py-2 border-b">
                      <Checkbox
                        id={`select-all-${stage.key}`}
                        checked={allSelected}
                        onCheckedChange={() => toggleSelectAll(stage.key)}
                        className="data-[state=checked]:bg-primary"
                      />
                      <label
                        htmlFor={`select-all-${stage.key}`}
                        className="text-sm text-muted-foreground cursor-pointer"
                      >
                        {allSelected ? "Deselect all" : someSelected ? "Select all" : "Select all"} ({stageApps.length})
                      </label>
                    </div>

                    {stageApps.map(app => (
                      <div 
                        key={app.id} 
                        className={`flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors ${
                          isSelected(app.id) ? "ring-2 ring-primary/50 bg-primary/5" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isSelected(app.id)}
                            onCheckedChange={() => toggleSelection(app)}
                            className="data-[state=checked]:bg-primary"
                          />
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium">{app.candidates.full_name}</h4>
                            <p className="text-sm text-muted-foreground">{app.candidates.headline}</p>
                            <div className="flex gap-4 mt-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-muted-foreground">Overall:</span>
                                <ScoreBadge score={app.overall_score} size="sm" />
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-muted-foreground">Skills:</span>
                                <ScoreBadge score={app.skill_fit_score} size="sm" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Stage transition buttons */}
                        {stage.key !== 'hired' && stage.key !== 'rejected' && (
                          <div className="flex items-center gap-2">
                            {getNextStages(stage.key).slice(0, 2).map(nextStage => (
                              <Button
                                key={nextStage.key}
                                size="sm"
                                variant="outline"
                                disabled={updating === app.id}
                                onClick={() => moveToStage(app.id, app.candidates.id, nextStage.key)}
                                className="gap-1"
                              >
                                <ArrowRight className="w-3 h-3" />
                                {nextStage.label}
                              </Button>
                            ))}
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={updating === app.id}
                              onClick={() => moveToStage(app.id, app.candidates.id, 'rejected')}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}
