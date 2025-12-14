import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Rocket, Loader2, Sparkles, FileText, Mail, Users, 
  Globe, Clock, CheckCircle2, Copy, Linkedin, Building,
  MessageSquare, Zap, Target
} from "lucide-react";

interface JobDescription {
  platform: string;
  title: string;
  content: string;
  key_highlights: string[];
}

interface OutreachTemplate {
  type: string;
  subject: string | null;
  body: string;
  tone: string;
}

interface LaunchPackage {
  job_descriptions: JobDescription[];
  outreach_templates: OutreachTemplate[];
  scenario_warmup?: {
    enabled: boolean;
    description: string;
    estimated_time_minutes: number;
  };
  execution_plan?: {
    posting_order: string[];
    outreach_cadence: string;
    expected_outcomes: {
      profiles_to_identify: number;
      expected_response_rate: string;
      pipeline_goal: string;
    };
  };
}

interface RoleLaunchAgentPanelProps {
  jobTwinJobId: string;
  jobTitle: string;
  roleDnaSnapshotId?: string;
  hasRoleDna: boolean;
}

export function RoleLaunchAgentPanel({ 
  jobTwinJobId, 
  jobTitle, 
  roleDnaSnapshotId,
  hasRoleDna 
}: RoleLaunchAgentPanelProps) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [launchPackage, setLaunchPackage] = useState<LaunchPackage | null>(null);
  const [activeTab, setActiveTab] = useState("descriptions");
  
  // Launch settings
  const [postingBudget, setPostingBudget] = useState("medium");
  const [outreachTone, setOutreachTone] = useState("professional");
  const [timezonePriority, setTimezonePriority] = useState("global");

  const generateLaunch = async () => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Please sign in to continue");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-role-launch`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jobId: jobTwinJobId,
            roleDnaSnapshotId,
            postingBudget,
            outreachTone,
            timezonePriority,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate launch package');
      }

      setLaunchPackage(data.launchPackage);
      toast({
        title: "Launch package ready!",
        description: "Your 48-hour autopilot content has been generated.",
      });
    } catch (error: any) {
      console.error("Error generating launch:", error);
      toast({
        variant: "destructive",
        title: "Unable to generate launch package",
        description: error.message || "Please try again shortly.",
      });
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied to clipboard` });
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'linkedin': return <Linkedin className="h-4 w-4" />;
      case 'career_site': return <Building className="h-4 w-4" />;
      case 'social': return <MessageSquare className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTemplateIcon = (type: string) => {
    switch (type) {
      case 'inmail': return <Linkedin className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'connection_request': return <Users className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  // Initial view - Launch trigger
  if (!launchPackage) {
    return (
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10">
              <Rocket className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Ready to Launch?
                <Badge variant="secondary" className="ml-2">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Agent Standing By
                </Badge>
              </CardTitle>
              <CardDescription>
                You've finalized the Role DNA for <strong>{jobTitle}</strong>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!hasRoleDna && (
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                <strong>Tip:</strong> Generate Role DNA first for better-targeted content. 
                The agent will still work without it, but results will be more generic.
              </p>
            </div>
          )}

          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground mb-4">
              Let the Agent handle the next <strong>48 hours</strong> of execution. 
              It will use the Role DNA to find the right people, not just the most people.
            </p>
            
            <div className="grid gap-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                <span className="text-sm">Draft and optimize job descriptions for top platforms</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                <span className="text-sm">Create personalized outreach templates ready for your approval</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                <span className="text-sm">Configure Scenario Warm-ups for all applicants</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                <span className="text-sm">Build an execution plan with expected outcomes</span>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Launch Settings
            </h4>
            
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="posting-budget">Posting Budget</Label>
                <Select value={postingBudget} onValueChange={setPostingBudget}>
                  <SelectTrigger id="posting-budget">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low (1 board)</SelectItem>
                    <SelectItem value="medium">Medium (3 boards)</SelectItem>
                    <SelectItem value="high">High (5+ boards)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="outreach-tone">Outreach Tone</Label>
                <Select value={outreachTone} onValueChange={setOutreachTone}>
                  <SelectTrigger id="outreach-tone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="energetic">Energetic</SelectItem>
                    <SelectItem value="insightful">Insightful</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone-priority">Timezone Priority</Label>
                <Select value={timezonePriority} onValueChange={setTimezonePriority}>
                  <SelectTrigger id="timezone-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global</SelectItem>
                    <SelectItem value="EST">EST (Americas)</SelectItem>
                    <SelectItem value="PST">PST (West Coast)</SelectItem>
                    <SelectItem value="CET">CET (Europe)</SelectItem>
                    <SelectItem value="IST">IST (India)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Button 
            size="lg" 
            className="w-full gap-2 text-base"
            onClick={generateLaunch}
            disabled={generating}
          >
            {generating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Generating Launch Package...
              </>
            ) : (
              <>
                <Zap className="h-5 w-5" />
                Launch Role Now (48-Hour Autopilot Engaged)
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Results view - Generated content
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              Launch Package Ready
            </CardTitle>
            <CardDescription>
              Review and approve your 48-hour autopilot content
            </CardDescription>
          </div>
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Generated
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Execution Plan Summary */}
        {launchPackage.execution_plan && (
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
            <h4 className="font-semibold flex items-center gap-2 mb-3">
              <Target className="h-4 w-4" />
              Execution Plan
            </h4>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Profiles to identify:</span>
                <span className="font-medium">{launchPackage.execution_plan.expected_outcomes.profiles_to_identify}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expected response rate:</span>
                <span className="font-medium">{launchPackage.execution_plan.expected_outcomes.expected_response_rate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pipeline goal:</span>
                <span className="font-medium">{launchPackage.execution_plan.expected_outcomes.pipeline_goal}</span>
              </div>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="descriptions" className="gap-1">
              <FileText className="h-4 w-4" />
              JDs ({launchPackage.job_descriptions?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="outreach" className="gap-1">
              <Mail className="h-4 w-4" />
              Outreach ({launchPackage.outreach_templates?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="warmup" className="gap-1">
              <Sparkles className="h-4 w-4" />
              Warm-up
            </TabsTrigger>
          </TabsList>

          {/* Job Descriptions Tab */}
          <TabsContent value="descriptions" className="space-y-4 mt-4">
            {launchPackage.job_descriptions?.map((jd, i) => (
              <Card key={i} className="border-muted">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getPlatformIcon(jd.platform)}
                      <CardTitle className="text-base capitalize">
                        {jd.platform.replace('_', ' ')}
                      </CardTitle>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyToClipboard(jd.content, `${jd.platform} JD`)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <CardDescription>{jd.title}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {jd.key_highlights?.map((h, j) => (
                      <Badge key={j} variant="secondary" className="text-xs">
                        {h}
                      </Badge>
                    ))}
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg max-h-48 overflow-y-auto">
                    <pre className="text-xs whitespace-pre-wrap font-sans">{jd.content}</pre>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Outreach Templates Tab */}
          <TabsContent value="outreach" className="space-y-4 mt-4">
            {launchPackage.outreach_templates?.map((template, i) => (
              <Card key={i} className="border-muted">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getTemplateIcon(template.type)}
                      <CardTitle className="text-base capitalize">
                        {template.type.replace('_', ' ')}
                      </CardTitle>
                      <Badge variant="outline" className="text-xs capitalize">
                        {template.tone}
                      </Badge>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyToClipboard(
                        template.subject ? `Subject: ${template.subject}\n\n${template.body}` : template.body,
                        `${template.type} template`
                      )}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                  {template.subject && (
                    <CardDescription className="font-medium">
                      Subject: {template.subject}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <pre className="text-sm whitespace-pre-wrap font-sans">{template.body}</pre>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Scenario Warm-up Tab */}
          <TabsContent value="warmup" className="mt-4">
            {launchPackage.scenario_warmup ? (
              <Card className="border-muted">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Scenario Warm-up Configuration</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant={launchPackage.scenario_warmup.enabled ? "default" : "secondary"}>
                      {launchPackage.scenario_warmup.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      ~{launchPackage.scenario_warmup.estimated_time_minutes} minutes
                    </span>
                  </div>
                  <p className="text-sm">{launchPackage.scenario_warmup.description}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No scenario warm-up configured</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Regenerate button */}
        <Separator />
        <Button 
          variant="outline" 
          className="w-full gap-2"
          onClick={generateLaunch}
          disabled={generating}
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Regenerating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Regenerate Launch Package
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
