import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import { Shield, AlertTriangle, Users, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BiasReportProps {
  jobId: string;
}

export const BiasReport = ({ jobId }: BiasReportProps) => {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateReport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('bias-analyzer', {
        body: { jobId }
      });

      if (error) throw error;

      // Load the saved report
      const { data: reportData } = await supabase
        .from('bias_reports')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setReport(reportData);

      toast({
        title: "Diversity Report Generated",
        description: "AI has analyzed your shortlist for bias and diversity.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || 'Failed to generate report',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <CardTitle>Diversity Report</CardTitle>
          </div>
          <Button onClick={generateReport} disabled={loading} size="sm" variant="outline">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                {report ? 'Refresh' : 'Analyze'}
              </>
            )}
          </Button>
        </div>
        <CardDescription>AI-powered bias and diversity analysis</CardDescription>
      </CardHeader>

      {report && (
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Diversity Score</span>
            <ScoreBadge score={report.diversity_score} size="md" />
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Gender Balance</span>
              </div>
              <p className="text-sm text-muted-foreground pl-6">{report.gender_balance}</p>
            </div>

            {report.education_balance && (
              <div>
                <span className="text-sm font-medium">Education Variety</span>
                <p className="text-sm text-muted-foreground">{report.education_balance}</p>
              </div>
            )}

            <div>
              <span className="text-sm font-medium">Skill Diversity</span>
              <p className="text-sm text-muted-foreground">{report.skill_balance}</p>
            </div>
          </div>

          {report.issues && report.issues.length > 0 && (
            <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <span className="text-sm font-semibold text-warning">Areas for Improvement</span>
              </div>
              <ul className="space-y-1">
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
