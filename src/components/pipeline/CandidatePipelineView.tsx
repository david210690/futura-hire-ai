import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import { BulkActionsToolbar } from "./BulkActionsToolbar";
import { MarkAsHiredModal } from "./MarkAsHiredModal";
import { UndoHireModal } from "./UndoHireModal";
import { 
  User, 
  ArrowRight, 
  CheckCircle, 
  XCircle, 
  Clock,
  Briefcase,
  MessageSquare,
  Video,
  Undo2,
  PartyPopper
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

interface HireRecord {
  id: string;
  application_id: string;
  created_at: string;
}

interface CandidatePipelineViewProps {
  applications: Application[];
  jobId: string;
  jobTitle?: string;
  orgId: string;
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

export function CandidatePipelineView({ applications, jobId, jobTitle, orgId, onRefresh }: CandidatePipelineViewProps) {
  const { toast } = useToast();
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<SelectedCandidate[]>([]);
  const [hireRecords, setHireRecords] = useState<Record<string, HireRecord>>({});
  
  // Modal states
  const [hireModalOpen, setHireModalOpen] = useState(false);
  const [undoModalOpen, setUndoModalOpen] = useState(false);
  const [pendingHireApp, setPendingHireApp] = useState<Application | null>(null);
  const [pendingUndoApp, setPendingUndoApp] = useState<Application | null>(null);

  // Fetch hire records for this job's applications
  useEffect(() => {
    const fetchHireRecords = async () => {
      const applicationIds = applications.map(app => app.id);
      if (applicationIds.length === 0) return;

      const { data } = await supabase
        .from('hires')
        .select('id, application_id, created_at')
        .in('application_id', applicationIds);

      if (data) {
        const records: Record<string, HireRecord> = {};
        data.forEach(hire => {
          records[hire.application_id] = hire;
        });
        setHireRecords(records);
      }
    };

    fetchHireRecords();
  }, [applications]);

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

  const openHireModal = (app: Application) => {
    setPendingHireApp(app);
    setHireModalOpen(true);
  };

  const confirmHire = async () => {
    if (!pendingHireApp) return;
    
    setUpdating(pendingHireApp.id);
    try {
      // Get current user for manager_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create hire record
      const { error: hireError } = await supabase
        .from('hires')
        .insert({
          application_id: pendingHireApp.id,
          org_id: orgId,
          manager_id: user.id,
          start_date: new Date().toISOString().split('T')[0],
          status: 'active',
        });

      if (hireError) throw hireError;

      // Move to hired stage
      const { error: stageError } = await supabase
        .from('applications')
        .update({ stage: 'hired' })
        .eq('id', pendingHireApp.id);

      if (stageError) throw stageError;

      toast({
        title: "Hire recorded",
        description: "This candidate has been marked as hired and added to your annual hire count.",
      });

      setHireModalOpen(false);
      setPendingHireApp(null);
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

  const canUndoHire = (applicationId: string) => {
    const hireRecord = hireRecords[applicationId];
    if (!hireRecord) return false;
    
    const hireDate = new Date(hireRecord.created_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - hireDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  };

  const openUndoModal = (app: Application) => {
    setPendingUndoApp(app);
    setUndoModalOpen(true);
  };

  const confirmUndoHire = async () => {
    if (!pendingUndoApp) return;
    
    const hireRecord = hireRecords[pendingUndoApp.id];
    if (!hireRecord) return;

    setUpdating(pendingUndoApp.id);
    try {
      // Delete hire record
      const { error: deleteError } = await supabase
        .from('hires')
        .delete()
        .eq('id', hireRecord.id);

      if (deleteError) throw deleteError;

      // Move back to offer stage
      const { error: stageError } = await supabase
        .from('applications')
        .update({ stage: 'offer' })
        .eq('id', pendingUndoApp.id);

      if (stageError) throw stageError;

      toast({
        title: "Hire undone",
        description: "Candidate moved back to Offer stage.",
      });

      setUndoModalOpen(false);
      setPendingUndoApp(null);
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
    // Exclude 'hired' from regular stage transitions - only available via Mark as Hired
    return STAGES.slice(currentIndex + 1).filter(s => s.key !== 'rejected' && s.key !== 'hired');
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
                {/* Hired stage helper text */}
                {stage.key === 'hired' && (
                  <div className="mb-4 p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                    <p className="text-sm text-muted-foreground">
                      Candidates appear here only after an offer has been accepted and confirmed.
                      This stage reflects completed hires.
                    </p>
                  </div>
                )}

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

                        {/* Offer stage: Mark as Hired button */}
                        {stage.key === 'offer' && (
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col items-end gap-1">
                              <Button
                                size="sm"
                                disabled={updating === app.id}
                                onClick={() => openHireModal(app)}
                                className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                              >
                                <PartyPopper className="w-4 h-4" />
                                Mark as Hired
                              </Button>
                              <span className="text-xs text-muted-foreground">
                                Use this after the candidate has accepted the offer.
                              </span>
                            </div>
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

                        {/* Hired stage: Undo button (within 24h) */}
                        {stage.key === 'hired' && canUndoHire(app.id) && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={updating === app.id}
                              onClick={() => openUndoModal(app)}
                              className="gap-1.5"
                            >
                              <Undo2 className="w-4 h-4" />
                              Undo hire
                            </Button>
                          </div>
                        )}

                        {/* Regular stage transition buttons (excluding offer and terminal stages) */}
                        {stage.key !== 'hired' && stage.key !== 'rejected' && stage.key !== 'offer' && (
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

      {/* Mark as Hired Modal */}
      <MarkAsHiredModal
        open={hireModalOpen}
        onOpenChange={setHireModalOpen}
        candidateName={pendingHireApp?.candidates.full_name || ""}
        onConfirm={confirmHire}
        isLoading={updating === pendingHireApp?.id}
      />

      {/* Undo Hire Modal */}
      <UndoHireModal
        open={undoModalOpen}
        onOpenChange={setUndoModalOpen}
        candidateName={pendingUndoApp?.candidates.full_name || ""}
        onConfirm={confirmUndoHire}
        isLoading={updating === pendingUndoApp?.id}
      />
    </Card>
  );
}
