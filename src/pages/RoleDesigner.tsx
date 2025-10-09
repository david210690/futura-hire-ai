import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, Briefcase, CheckCircle2 } from "lucide-react";

export default function RoleDesigner() {
  const navigate = useNavigate();
  const { currentOrg } = useCurrentOrg();
  const { toast } = useToast();
  
  const [problemStatement, setProblemStatement] = useState("");
  const [loading, setLoading] = useState(false);
  const [design, setDesign] = useState<any>(null);

  const handleDesign = async () => {
    if (!problemStatement.trim() || !currentOrg) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('design-role', {
        body: { 
          problem_statement: problemStatement,
          org_id: currentOrg.id
        }
      });

      if (error) throw error;

      setDesign(data);
      toast({
        title: "Role designed successfully",
        description: "Your AI-powered role design is ready.",
      });
    } catch (error: any) {
      console.error('Error designing role:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to design role",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  const createJobFromDesign = () => {
    if (!design) return;
    
    const params = new URLSearchParams({
      title: design.suggested_titles[0] || '',
      jd_text: design.jd_draft || '',
      tags: design.skills_matrix?.must_have?.join(',') || '',
    });
    
    navigate(`/create-job?${params.toString()}`);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Role Designer</h1>
        <p className="text-muted-foreground">
          Describe your business problem and let AI design the perfect role for you.
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Describe Your Business Problem</CardTitle>
          <CardDescription>
            What challenge are you trying to solve? What outcomes do you need?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="e.g., We need someone to scale our customer success from 50 to 500 accounts while maintaining 95%+ CSAT..."
            value={problemStatement}
            onChange={(e) => setProblemStatement(e.target.value)}
            rows={6}
            className="resize-none"
          />
          <Button 
            onClick={handleDesign} 
            disabled={loading || !problemStatement.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Designing Role...
              </>
            ) : (
              <>
                <Briefcase className="mr-2 h-4 w-4" />
                Generate Role Design
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {design && (
        <div className="space-y-6">
          {/* Title Options */}
          <Card>
            <CardHeader>
              <CardTitle>Suggested Role Titles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {design.suggested_titles?.map((title: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-base py-2 px-4">
                    {title}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Skills Matrix */}
          <Card>
            <CardHeader>
              <CardTitle>Skills Matrix</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <h3 className="font-semibold text-sm mb-3 text-destructive">Must Have</h3>
                  <ul className="space-y-2">
                    {design.skills_matrix?.must_have?.map((skill: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                        <span>{skill}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-3 text-primary">Plus</h3>
                  <ul className="space-y-2">
                    {design.skills_matrix?.plus?.map((skill: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{skill}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-3 text-muted-foreground">Nice to Have</h3>
                  <ul className="space-y-2">
                    {design.skills_matrix?.nice_to_have?.map((skill: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span>{skill}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* JD Draft */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Job Description Draft</CardTitle>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => copyToClipboard(design.jd_draft, 'Job Description')}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-sm">{design.jd_draft}</div>
            </CardContent>
          </Card>

          {/* Interview Kit */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Interview Kit</CardTitle>
                <CardDescription>
                  {design.interview_kit?.length || 0} questions
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => copyToClipboard(design.interview_kit?.join('\n\n'), 'Interview Questions')}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {design.interview_kit?.map((question: string, i: number) => (
                  <div key={i}>
                    <p className="text-sm">
                      <span className="font-semibold">{i + 1}.</span> {question}
                    </p>
                    {i < design.interview_kit.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Create Job Button */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold mb-1">Ready to create this job?</h3>
                  <p className="text-sm text-muted-foreground">
                    We'll prefill the job form with this design
                  </p>
                </div>
                <Button onClick={createJobFromDesign}>
                  <Briefcase className="mr-2 h-4 w-4" />
                  Create Job from This
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}