import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import { BiasReport } from "@/components/recruiter/BiasReport";
import { MarketingAssets } from "@/components/recruiter/MarketingAssets";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { UsageBadge } from "@/components/usage/UsageBadge";
import { UpgradeModal } from "@/components/usage/UpgradeModal";

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [job, setJob] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<{ feature?: string; quotaExceeded?: boolean }>({});

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    const { data: jobData } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();

    setJob(jobData);

    const { data: appsData } = await supabase
      .from('applications')
      .select(`
        *,
        candidates (
          id,
          full_name,
          headline,
          skills
        )
      `)
      .eq('job_id', id)
      .order('overall_score', { ascending: false });

    setApplications(appsData || []);

    const { data: questionsData } = await supabase
      .from('interview_questions')
      .select('*')
      .eq('job_id', id);

    setQuestions(questionsData || []);
  };

  const generateShortlist = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-shortlist', {
        body: { jobId: id }
      });

      if (error) {
        // Check if it's an entitlement or quota error
        const errorMsg = error.message || '';
        if (errorMsg.includes('Upgrade required') || errorMsg.includes('needed_feature')) {
          setUpgradeReason({ feature: 'AI Shortlist' });
          setUpgradeModalOpen(true);
          return;
        } else if (errorMsg.includes('Quota exceeded') || errorMsg.includes('limit reached')) {
          setUpgradeReason({ quotaExceeded: true });
          setUpgradeModalOpen(true);
          return;
        }
        throw error;
      }

      toast({
        title: "Shortlist generated!",
        description: "AI has analyzed and ranked candidates.",
      });

      loadData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setGenerating(false);
    }
  };

  if (!job) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar userRole="recruiter" />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>

          <div className="flex gap-2">
            <UsageBadge metric="ai_shortlist" label="Shortlists" />
            <UsageBadge metric="bias_runs" label="Bias Reports" />
            <UsageBadge metric="marketing_runs" label="Marketing" />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">{job.title}</CardTitle>
                    <CardDescription className="mt-2">
                      {job.location} • {job.employment_type} • {job.seniority}
                    </CardDescription>
                  </div>
                  <Badge variant={job.status === 'open' ? 'default' : 'secondary'}>
                    {job.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {job.jd_text}
                  </pre>
                </div>
                
                {applications.length === 0 && (
                  <Button
                    onClick={generateShortlist}
                    disabled={generating}
                    className="w-full mt-6 gap-2"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate AI Shortlist
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Marketing Assets */}
            <MarketingAssets jobId={id!} />

            {applications.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Shortlisted Candidates</CardTitle>
                  <CardDescription>AI-ranked matches for this role</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Candidate</TableHead>
                        <TableHead>Skills</TableHead>
                        <TableHead>Skill Fit</TableHead>
                        <TableHead>Culture Fit</TableHead>
                        <TableHead>Overall</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications.map((app) => (
                        <TableRow key={app.id} className="cursor-pointer hover:bg-accent/50">
                          <TableCell>
                            <div>
                              <div className="font-medium">{app.candidates.full_name}</div>
                              <div className="text-sm text-muted-foreground">{app.candidates.headline}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {app.candidates.skills?.split(',').slice(0, 3).map((skill: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {skill.trim()}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <ScoreBadge score={app.skill_fit_score} size="sm" />
                          </TableCell>
                          <TableCell>
                            <ScoreBadge score={app.culture_fit_score} size="sm" />
                          </TableCell>
                          <TableCell>
                            <ScoreBadge score={app.overall_score} size="sm" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {/* Bias Report */}
            {applications.length > 0 && <BiasReport jobId={id!} />}

            {/* Interview Questions */}
            <Card>
              <CardHeader>
                <CardTitle>Interview Questions</CardTitle>
                <CardDescription>AI-generated questions for this role</CardDescription>
              </CardHeader>
              <CardContent>
                {questions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Generate a shortlist to get AI interview questions
                  </p>
                ) : (
                  <ol className="space-y-3 list-decimal list-inside">
                    {questions.map((q) => (
                      <li key={q.id} className="text-sm">{q.question}</li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        feature={upgradeReason.feature}
        quotaExceeded={upgradeReason.quotaExceeded}
      />
    </div>
  );
}
