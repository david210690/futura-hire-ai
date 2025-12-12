import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";
import { 
  Activity, AlertTriangle, CheckCircle2, Users, TrendingUp,
  Loader2, RefreshCw, ChevronDown, ChevronUp, Target, Clock, ListChecks, Zap, FileDown
} from "lucide-react";

interface PipelineHealthPanelProps {
  jobTwinJobId: string;
}

interface PipelineHealthSnapshot {
  health_score: number;
  summary: string;
  stage_distribution: Array<{ stage: string; count: number }>;
  bottlenecks: Array<{
    stage: string;
    issue: string;
    evidence: string;
    fix: string;
  }>;
  top_candidates_to_focus: Array<{
    candidateId: string;
    why: string;
    next_action: string;
  }>;
  risk_flags: string[];
  next_7_days_plan: string[];
  fairness_note: string;
}

export function PipelineHealthPanel({ jobTwinJobId }: PipelineHealthPanelProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [bulkAssessing, setBulkAssessing] = useState(false);
  const [snapshot, setSnapshot] = useState<PipelineHealthSnapshot | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    bottlenecks: true,
    topCandidates: true,
    risks: false,
    plan: true
  });

  useEffect(() => {
    fetchPipelineHealth();
  }, [jobTwinJobId]);

  const fetchPipelineHealth = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-pipeline-health?jobId=${jobTwinJobId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json"
          }
        }
      );

      const result = await response.json();
      
      if (result.success && result.exists) {
        setSnapshot(result.snapshot);
        setCreatedAt(result.createdAt);
      }
    } catch (error) {
      console.error("Error fetching pipeline health:", error);
    } finally {
      setLoading(false);
    }
  };

  const generatePipelineHealth = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-pipeline-health", {
        body: { jobId: jobTwinJobId }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.message);
      }

      setSnapshot(data.snapshot);
      setCreatedAt(data.createdAt);
      toast({
        title: "Pipeline health generated",
        description: "Your pipeline analysis is ready!"
      });
    } catch (error: any) {
      console.error("Error generating pipeline health:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate pipeline health",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const bulkAssessOfferLikelihood = async () => {
    setBulkAssessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("bulk-generate-offer-likelihood", {
        body: { jobId: jobTwinJobId }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.message);
      }

      toast({
        title: "Bulk assessment complete",
        description: `Assessed ${data.processed} candidates${data.skipped > 0 ? `, skipped ${data.skipped} already assessed` : ''}${data.errors > 0 ? `, ${data.errors} errors` : ''}`
      });

      // Regenerate pipeline health after bulk assessment
      if (data.processed > 0) {
        await generatePipelineHealth();
      }
    } catch (error: any) {
      console.error("Error in bulk assessment:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to bulk assess candidates",
        variant: "destructive"
      });
    } finally {
      setBulkAssessing(false);
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-amber-600";
    return "text-red-500";
  };

  const getHealthBg = (score: number) => {
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-amber-500";
    return "bg-red-500";
  };

  const exportToPDF = () => {
    if (!snapshot) return;

    const doc = new jsPDF();
    let yPos = 20;

    // Title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Pipeline Health Report", 20, yPos);
    yPos += 15;

    // Date
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, yPos);
    yPos += 15;

    // Health Score
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`Overall Health: ${snapshot.health_score}/100`, 20, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const summaryLines = doc.splitTextToSize(snapshot.summary, 170);
    doc.text(summaryLines, 20, yPos);
    yPos += summaryLines.length * 5 + 10;

    // Stage Distribution
    if (snapshot.stage_distribution?.length > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Stage Distribution", 20, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      snapshot.stage_distribution.forEach(stage => {
        doc.text(`• ${stage.stage}: ${stage.count} candidates`, 25, yPos);
        yPos += 6;
      });
      yPos += 5;
    }

    // Bottlenecks
    if (snapshot.bottlenecks?.length > 0) {
      if (yPos > 250) { doc.addPage(); yPos = 20; }
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Bottlenecks", 20, yPos);
      yPos += 8;

      snapshot.bottlenecks.forEach(b => {
        if (yPos > 270) { doc.addPage(); yPos = 20; }
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`[${b.stage}] ${b.issue}`, 25, yPos);
        yPos += 6;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const evidenceLines = doc.splitTextToSize(`Evidence: ${b.evidence}`, 160);
        doc.text(evidenceLines, 25, yPos);
        yPos += evidenceLines.length * 5;

        const fixLines = doc.splitTextToSize(`Fix: ${b.fix}`, 160);
        doc.text(fixLines, 25, yPos);
        yPos += fixLines.length * 5 + 5;
      });
    }

    // Risk Flags
    if (snapshot.risk_flags?.length > 0) {
      if (yPos > 250) { doc.addPage(); yPos = 20; }
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Risk Flags", 20, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      snapshot.risk_flags.forEach(flag => {
        if (yPos > 280) { doc.addPage(); yPos = 20; }
        const flagLines = doc.splitTextToSize(`• ${flag}`, 165);
        doc.text(flagLines, 25, yPos);
        yPos += flagLines.length * 5;
      });
      yPos += 5;
    }

    // 7-Day Plan
    if (snapshot.next_7_days_plan?.length > 0) {
      if (yPos > 250) { doc.addPage(); yPos = 20; }
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Next 7 Days Plan", 20, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      snapshot.next_7_days_plan.forEach((item, i) => {
        if (yPos > 280) { doc.addPage(); yPos = 20; }
        const itemLines = doc.splitTextToSize(`${i + 1}. ${item}`, 165);
        doc.text(itemLines, 25, yPos);
        yPos += itemLines.length * 5;
      });
    }

    // Footer
    doc.setFontSize(8);
    doc.text("AI-generated report. Use structured interviews and human judgment.", 20, 285);

    doc.save("pipeline-health-report.pdf");
    toast({
      title: "PDF exported",
      description: "Pipeline health report saved"
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!snapshot) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Pipeline Health
          </CardTitle>
          <CardDescription>
            Analyze your hiring pipeline to identify bottlenecks and priorities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Get insights into your pipeline's health, identify where candidates are getting stuck, 
              and receive actionable recommendations for the next 7 days.
            </p>
          </div>
          <Button 
            onClick={generatePipelineHealth} 
            disabled={generating}
            className="w-full gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing Pipeline...
              </>
            ) : (
              <>
                <Activity className="h-4 w-4" />
                Generate Pipeline Health Report
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Pipeline Health
            </CardTitle>
            <CardDescription>
              Pipeline analysis and recommendations
              {createdAt && (
                <span className="ml-2 text-xs">
                  • Updated {new Date(createdAt).toLocaleDateString()}
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportToPDF}
            >
              <FileDown className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">PDF</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={bulkAssessOfferLikelihood}
              disabled={bulkAssessing || generating}
            >
              {bulkAssessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              <span className="ml-2 hidden sm:inline">Assess All</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={generatePipelineHealth}
              disabled={generating || bulkAssessing}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2 hidden sm:inline">Regenerate</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Health Score */}
        <div className="p-4 rounded-lg bg-muted/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Health</span>
            <span className={`text-2xl font-bold ${getHealthColor(snapshot.health_score)}`}>
              {snapshot.health_score}/100
            </span>
          </div>
          <Progress value={snapshot.health_score} className="h-2" />
          <p className="text-sm text-muted-foreground mt-3">{snapshot.summary}</p>
        </div>

        {/* Stage Distribution */}
        {snapshot.stage_distribution && snapshot.stage_distribution.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {snapshot.stage_distribution.map((stage, i) => (
              <Badge key={i} variant="outline" className="gap-1">
                <Users className="h-3 w-3" />
                {stage.stage}: {stage.count}
              </Badge>
            ))}
          </div>
        )}

        <Separator />

        {/* Bottlenecks */}
        {snapshot.bottlenecks && snapshot.bottlenecks.length > 0 && (
          <Collapsible open={expandedSections.bottlenecks} onOpenChange={() => toggleSection("bottlenecks")}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-amber-500/10 rounded-lg hover:bg-amber-500/15 transition-colors">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <span className="font-medium">Bottlenecks</span>
                <Badge variant="secondary">{snapshot.bottlenecks.length}</Badge>
              </div>
              {expandedSections.bottlenecks ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3 px-1">
              {snapshot.bottlenecks.map((bottleneck, i) => (
                <div key={i} className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">{bottleneck.stage}</Badge>
                  </div>
                  <p className="text-sm font-medium">{bottleneck.issue}</p>
                  <p className="text-xs text-muted-foreground mt-1">{bottleneck.evidence}</p>
                  <div className="mt-2 p-2 bg-green-500/10 rounded">
                    <p className="text-xs text-green-700 dark:text-green-300">
                      <strong>Fix:</strong> {bottleneck.fix}
                    </p>
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Top Candidates to Focus */}
        {snapshot.top_candidates_to_focus && snapshot.top_candidates_to_focus.length > 0 && (
          <Collapsible open={expandedSections.topCandidates} onOpenChange={() => toggleSection("topCandidates")}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-green-500/10 rounded-lg hover:bg-green-500/15 transition-colors">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                <span className="font-medium">Top Candidates to Focus</span>
                <Badge variant="secondary">{snapshot.top_candidates_to_focus.length}</Badge>
              </div>
              {expandedSections.topCandidates ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-2 px-1">
              {snapshot.top_candidates_to_focus.map((candidate, i) => (
                <div key={i} className="p-3 border rounded-lg">
                  <p className="text-sm">{candidate.why}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Next:</strong> {candidate.next_action}
                  </p>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Risk Flags */}
        {snapshot.risk_flags && snapshot.risk_flags.length > 0 && (
          <Collapsible open={expandedSections.risks} onOpenChange={() => toggleSection("risks")}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-red-500/10 rounded-lg hover:bg-red-500/15 transition-colors">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span className="font-medium">Risk Flags</span>
                <Badge variant="secondary">{snapshot.risk_flags.length}</Badge>
              </div>
              {expandedSections.risks ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 px-1">
              <ul className="space-y-1">
                {snapshot.risk_flags.map((flag, i) => (
                  <li key={i} className="text-sm text-muted-foreground">• {flag}</li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Next 7 Days Plan */}
        {snapshot.next_7_days_plan && snapshot.next_7_days_plan.length > 0 && (
          <Collapsible open={expandedSections.plan} onOpenChange={() => toggleSection("plan")}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-blue-500/10 rounded-lg hover:bg-blue-500/15 transition-colors">
              <div className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-blue-600" />
                <span className="font-medium">Next 7 Days Plan</span>
              </div>
              {expandedSections.plan ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 px-1">
              <ul className="space-y-2">
                {snapshot.next_7_days_plan.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        )}

        <Separator />

        {/* Fairness Note */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground text-center">
            {snapshot.fairness_note || "AI scores are support signals. Use structured interviews and human judgment."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
