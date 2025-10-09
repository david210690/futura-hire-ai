import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { useToast } from "@/hooks/use-toast";
import { FileText, Clock, Target, Users, ExternalLink } from "lucide-react";

export const AssessmentsList = () => {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentOrg } = useCurrentOrg();
  const currentOrgId = currentOrg?.id;
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentOrgId) {
      loadAssessments();
    }
  }, [currentOrgId]);

  const loadAssessments = async () => {
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select('*, assessment_questions(count)')
        .eq('org_id', currentOrgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssessments(data || []);
    } catch (error: any) {
      console.error('Load error:', error);
      toast({
        title: "Failed to Load",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getPurposeBadge = (purpose: string) => {
    const colors: Record<string, string> = {
      screening: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      skills: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      culture: 'bg-green-500/10 text-green-500 border-green-500/20',
      coding: 'bg-orange-500/10 text-orange-500 border-orange-500/20'
    };
    return <Badge variant="outline" className={colors[purpose] || ''}>
      {purpose}
    </Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading assessments...</div>
      </div>
    );
  }

  if (assessments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Assessments Yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first assessment using AI or import existing questions
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {assessments.map((assessment) => (
        <Card key={assessment.id} className="hover:border-primary/40 transition-colors">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle>{assessment.name}</CardTitle>
                  {getPurposeBadge(assessment.purpose)}
                </div>
                {assessment.description && (
                  <CardDescription>{assessment.description}</CardDescription>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate(`/assessments/${assessment.id}`)}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {assessment.assessment_questions?.[0]?.count || 0} Questions
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {assessment.duration_minutes} mins
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Pass: {assessment.passing_score}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {assessment.total_points} points
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
