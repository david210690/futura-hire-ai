import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, BarChart3, Loader2, Users, GraduationCap, Code } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BiasReportProps {
  jobId: string;
}

export const BiasReport = ({ jobId }: BiasReportProps) => {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadLatestReport();
  }, [jobId]);

  const loadLatestReport = async () => {
    const { data } = await supabase
      .from('bias_reports')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setReport(data);
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('bias-analyzer', {
        body: { jobId }
      });

      if (error) {
        if (error.message?.includes('Rate limit')) {
          toast({
            title: "Rate limit reached",
            description: "You can run this analysis twice per hour. Please try again later.",
            variant: "destructive"
          });
        } else if (error.message?.includes('No shortlisted')) {
          toast({
            title: "No shortlist yet",
            description: "Generate a shortlist first to run the diversity analysis.",
            variant: "destructive"
          });
        }
        throw error;
      }

      await loadLatestReport();
      toast({
        title: "Analysis complete",
        description: "Diversity report has been generated."
      });
    } catch (error: any) {
      console.error('Failed to generate bias report:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 75) return "default";
    if (score >= 50) return "secondary";
    return "destructive";
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <CardTitle>Diversity Report</CardTitle>
          </div>
          <Button onClick={generateReport} disabled={loading} size="sm" variant="outline">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              report ? 'Re-run Analysis' : 'Run Analysis'
            )}
          </Button>
        </div>
        <CardDescription>
          Fairness snapshot to help reduce hidden bias
          {report && (
            <span className="block text-xs mt-1 text-muted-foreground">
              Analysis is indicative; some fields may be "unknown"
            </span>
          )}
        </CardDescription>
      </CardHeader>
      
      {report && (
        <CardContent className="space-y-4">
          {/* Diversity Score */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
              <span className="font-semibold">Diversity Score</span>
            </div>
            <Badge variant={getScoreBadgeVariant(report.diversity_score)} className="text-base px-3 py-1">
              {report.diversity_score}/100
            </Badge>
          </div>

          {/* Balance Metrics */}
          <div className="space-y-3">
            {report.gender_balance && (
              <div className="flex items-start gap-3">
                <Users className="w-4 h-4 text-primary mt-1" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Gender Balance</p>
                  <p className="text-sm text-muted-foreground">{report.gender_balance}</p>
                </div>
              </div>
            )}

            {report.education_balance && (
              <div className="flex items-start gap-3">
                <GraduationCap className="w-4 h-4 text-primary mt-1" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Education Balance</p>
                  <p className="text-sm text-muted-foreground">{report.education_balance}</p>
                </div>
              </div>
            )}

            {report.skill_balance && (
              <div className="flex items-start gap-3">
                <Code className="w-4 h-4 text-primary mt-1" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Skill Balance</p>
                  <p className="text-sm text-muted-foreground">{report.skill_balance}</p>
                </div>
              </div>
            )}
          </div>

          {/* Issues */}
          {report.issues && report.issues.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <h4 className="font-semibold text-sm">Potential Issues</h4>
              </div>
              <ul className="space-y-1.5">
                {report.issues.map((issue: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-warning mt-0.5">•</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};
