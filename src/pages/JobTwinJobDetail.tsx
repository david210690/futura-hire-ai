import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  ArrowLeft, Briefcase, MessageSquare, Package, Mail, Send, Clock, 
  CheckCircle2, Copy, Loader2, RefreshCw, User, Linkedin, Phone, Globe,
  Calendar, DollarSign, FileText, Sparkles, Edit, Check, Mic, ExternalLink, TrendingUp, Target
} from "lucide-react";
import { StartVoiceInterviewDialog } from "@/components/voice-interview/StartVoiceInterviewDialog";
import { RoleDnaPanel } from "@/components/role-dna/RoleDnaPanel";
import { RoleFitInsightPanel } from "@/components/role-dna/RoleFitInsightPanel";
import { InterviewPrepPanel } from "@/components/interview-prep/InterviewPrepPanel";
import { HiringPlanAutopilotPanel } from "@/components/hiring-autopilot/HiringPlanAutopilotPanel";
import { PipelineHealthPanel } from "@/components/pipeline/PipelineHealthPanel";
import { RoleLaunchAgentPanel } from "@/components/role-launch/RoleLaunchAgentPanel";
import { useUserRole } from "@/hooks/useUserRole";
import { format, formatDistanceToNow } from "date-fns";

interface JobTwinJob {
  id: string;
  job_id: string;
  profile_id: string;
  match_score: number;
  match_reasons: string[];
  status: string;
  applied_at?: string;
  recruiter_name?: string;
  recruiter_email?: string;
  recruiter_linkedin_url?: string;
  contact_channel?: string;
  last_contacted_at?: string;
  next_action_at?: string;
  next_action_type?: string;
  timezone?: string;
  job?: {
    title: string;
    location?: string;
    jd_text?: string;
    salary_range?: string;
    seniority?: string;
    remote_mode?: string;
    companies?: { name: string };
  };
}

interface Interaction {
  id: string;
  interaction_type: string;
  channel: string;
  direction: string;
  subject?: string;
  body?: string;
  is_sent: boolean;
  scheduled_for?: string;
  sent_at?: string;
  ai_generated: boolean;
  created_at: string;
}

interface NegotiationNotes {
  id: string;
  current_offer_salary?: string;
  candidate_desired_salary?: string;
  non_salary_items?: string;
  negotiation_strategy_summary?: string;
  negotiation_email_template?: string;
  talking_points?: string;
}

const CHANNEL_OPTIONS = [
  { value: "email", label: "Email", icon: Mail },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin },
  { value: "phone", label: "Phone", icon: Phone },
  { value: "portal", label: "Portal", icon: Globe },
];

const TONE_OPTIONS = [
  { value: "friendly", label: "Friendly" },
  { value: "formal", label: "Formal" },
  { value: "confident", label: "Confident" },
];

const INTERACTION_TYPES = {
  initial_outreach: { label: "Initial Outreach", color: "bg-blue-500" },
  follow_up: { label: "Follow-up", color: "bg-yellow-500" },
  thank_you: { label: "Thank You", color: "bg-green-500" },
  negotiation: { label: "Negotiation", color: "bg-purple-500" },
  interview_schedule: { label: "Interview Schedule", color: "bg-pink-500" },
  other: { label: "Other", color: "bg-gray-500" },
};

export default function JobTwinJobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role } = useUserRole();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [jobData, setJobData] = useState<JobTwinJob | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [negotiationNotes, setNegotiationNotes] = useState<NegotiationNotes | null>(null);

  // Recruiter form
  const [recruiterName, setRecruiterName] = useState("");
  const [recruiterEmail, setRecruiterEmail] = useState("");
  const [recruiterLinkedIn, setRecruiterLinkedIn] = useState("");
  const [contactChannel, setContactChannel] = useState("email");
  const [timezone, setTimezone] = useState("UTC");

  // Negotiation form
  const [currentOffer, setCurrentOffer] = useState("");
  const [desiredSalary, setDesiredSalary] = useState("");
  const [nonSalaryItems, setNonSalaryItems] = useState("");

  // Message generation modal
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [messageType, setMessageType] = useState<string>("initial_outreach");
  const [messageTone, setMessageTone] = useState("friendly");
  const [messageNotes, setMessageNotes] = useState("");
  const [generatedMessage, setGeneratedMessage] = useState<{ subject: string; body: string } | null>(null);

  useEffect(() => {
    if (id) loadJobData();
  }, [id]);

  const loadJobData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Get profile
      const { data: profile } = await supabase
        .from("job_twin_profiles" as any)
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (profile) setProfileId((profile as any).id);

      // Get job data
      const { data: job, error } = await supabase
        .from("job_twin_jobs" as any)
        .select("*, jobs(title, location, jd_text, salary_range, seniority, remote_mode, companies(name))")
        .eq("id", id)
        .single();

      if (error || !job) {
        toast({ title: "Job not found", variant: "destructive" });
        navigate("/job-twin");
        return;
      }

      const jobTyped = job as unknown as JobTwinJob;
      setJobData(jobTyped);
      setRecruiterName(jobTyped.recruiter_name || "");
      setRecruiterEmail(jobTyped.recruiter_email || "");
      setRecruiterLinkedIn(jobTyped.recruiter_linkedin_url || "");
      setContactChannel(jobTyped.contact_channel || "email");
      setTimezone(jobTyped.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);

      // Get interactions
      const { data: interactionsData } = await supabase
        .from("job_twin_interactions" as any)
        .select("*")
        .eq("job_twin_job_id", id)
        .order("created_at", { ascending: false });

      if (interactionsData) setInteractions(interactionsData as unknown as Interaction[]);

      // Get negotiation notes
      const { data: notesData } = await supabase
        .from("job_twin_negotiation_notes" as any)
        .select("*")
        .eq("job_twin_job_id", id)
        .single();

      if (notesData) {
        const notesTyped = notesData as unknown as NegotiationNotes;
        setNegotiationNotes(notesTyped);
        setCurrentOffer(notesTyped.current_offer_salary || "");
        setDesiredSalary(notesTyped.candidate_desired_salary || "");
        setNonSalaryItems(notesTyped.non_salary_items || "");
      }
    } catch (error) {
      console.error("Error loading job:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveRecruiterDetails = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("job_twin_jobs" as any)
        .update({
          recruiter_name: recruiterName,
          recruiter_email: recruiterEmail,
          recruiter_linkedin_url: recruiterLinkedIn,
          contact_channel: contactChannel,
          timezone,
        })
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Recruiter details saved" });
      loadJobData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const generateContactPlan = async () => {
    if (!profileId || !id) return;
    setGenerating("contact_plan");
    try {
      const { data, error } = await supabase.functions.invoke("job-twin-generate-contact-plan", {
        body: { job_twin_job_id: id, profile_id: profileId }
      });

      if (error) throw error;
      toast({ title: "Contact plan generated", description: data.plan_summary });
      loadJobData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  };

  const openMessageModal = (type: string) => {
    setMessageType(type);
    setMessageNotes("");
    setGeneratedMessage(null);
    setMessageModalOpen(true);
  };

  const generateMessage = async () => {
    if (!profileId || !id) return;
    setGenerating("message");
    try {
      const { data, error } = await supabase.functions.invoke("job-twin-generate-message", {
        body: {
          message_type: messageType,
          job_twin_job_id: id,
          profile_id: profileId,
          tone: messageTone,
          notes: messageNotes,
        }
      });

      if (error) throw error;
      setGeneratedMessage(data);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  };

  const saveGeneratedMessage = async () => {
    if (!generatedMessage || !id) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase
        .from("job_twin_interactions" as any)
        .insert({
          user_id: user.id,
          job_twin_job_id: id,
          interaction_type: messageType,
          channel: contactChannel,
          direction: "outbound",
          subject: generatedMessage.subject,
          body: generatedMessage.body,
          is_sent: false,
          ai_generated: true,
        });

      if (error) throw error;
      toast({ title: "Message saved to timeline" });
      setMessageModalOpen(false);
      loadJobData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const markAsSent = async (interactionId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !id) return;

    try {
      const { error } = await supabase
        .from("job_twin_interactions" as any)
        .update({
          is_sent: true,
          sent_at: new Date().toISOString(),
        })
        .eq("id", interactionId);

      if (error) throw error;

      // Update last_contacted_at
      await supabase
        .from("job_twin_jobs" as any)
        .update({ last_contacted_at: new Date().toISOString() })
        .eq("id", id);

      toast({ title: "Marked as sent" });
      loadJobData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const generateNegotiationPlan = async () => {
    if (!profileId || !id) return;
    setGenerating("negotiation");
    try {
      const { data, error } = await supabase.functions.invoke("job-twin-generate-negotiation", {
        body: {
          job_twin_job_id: id,
          profile_id: profileId,
          current_offer_salary: currentOffer,
          candidate_desired_salary: desiredSalary,
          non_salary_items: nonSalaryItems,
        }
      });

      if (error) throw error;
      toast({ title: "Negotiation plan generated" });
      loadJobData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!jobData) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/job-twin")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Job Twin
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{jobData.job?.title || "Job Position"}</h1>
              <p className="text-muted-foreground">
                {jobData.job?.companies?.name} • {jobData.job?.location}
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-primary">{jobData.match_score}%</span>
                <span className="text-muted-foreground">match</span>
              </div>
              <Progress value={jobData.match_score} className="w-32 h-2 mt-1" />
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="communication">Communication</TabsTrigger>
            <TabsTrigger value="negotiation">Negotiation</TabsTrigger>
            <TabsTrigger value="package">Package</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Job Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-muted-foreground">Seniority</Label>
                    <p className="font-medium">{jobData.job?.seniority || "Not specified"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Salary Range</Label>
                    <p className="font-medium">{jobData.job?.salary_range || "Not disclosed"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Work Mode</Label>
                    <p className="font-medium">{jobData.job?.remote_mode || "Not specified"}</p>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-muted-foreground">Match Reasons</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {jobData.match_reasons?.map((reason, i) => (
                        <Badge key={i} variant="secondary">{reason}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Application Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-muted-foreground">Current Status</Label>
                    <p className="font-medium capitalize">{jobData.status}</p>
                  </div>
                  {jobData.applied_at && (
                    <div>
                      <Label className="text-muted-foreground">Applied On</Label>
                      <p className="font-medium">{format(new Date(jobData.applied_at), "PPP")}</p>
                    </div>
                  )}
                  {jobData.next_action_at && (
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Label className="text-muted-foreground">Next Action</Label>
                      <p className="font-medium capitalize">{jobData.next_action_type?.replace("_", " ")}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(jobData.next_action_at), { addSuffix: true })}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Interview Practice Section */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5" />
                  Interview Practice
                </CardTitle>
                <CardDescription>
                  Practice with an AI voice interviewer tailored to this role
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3 items-center">
                  <StartVoiceInterviewDialog 
                    jobId={jobData?.id}
                    roleTitle={jobData?.job?.title}
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => navigate(`/voice-interview?jobId=${jobData?.id}`)}
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Past Sessions
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  Get real-time feedback on your interview skills with our AI-powered voice interview simulator.
                </p>
              </CardContent>
            </Card>

            {/* Cross-feature CTAs - Career Insights */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Career Insights
                </CardTitle>
                <CardDescription>
                  See how this role fits into your broader career picture
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate(`/career-trajectory?jobId=${jobData?.id}`)}
                    className="gap-2"
                  >
                    <TrendingUp className="h-4 w-4" />
                    See how this role fits into my trajectory
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate(`/opportunity-radar?jobId=${jobData?.id}`)}
                    className="gap-2"
                  >
                    <Target className="h-4 w-4" />
                    See similar roles on my Opportunity Radar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Role DNA Blueprint (Recruiter info about the role) */}
            <div className="mt-6">
              <RoleDnaPanel jobTwinJobId={jobData.id} />
            </div>

            {/* Role Fit Insight (Candidate's fit against the Role DNA) */}
            <div className="mt-6">
              <RoleFitInsightPanel jobTwinJobId={jobData.id} />
            </div>

            {/* AI Interview Prep Panel */}
            <div className="mt-6">
              <InterviewPrepPanel jobTwinJobId={jobData.id} roleTitle={jobData.job?.title} />
            </div>

            {/* Recruiter-only: Role Launch Agent, Pipeline Health & Hiring Plan Autopilot */}
            {role === 'recruiter' && (
              <>
                <div className="mt-6">
                  <RoleLaunchAgentPanel 
                    jobTwinJobId={jobData.id} 
                    jobTitle={jobData.job?.title || "This Role"}
                    hasRoleDna={true}
                  />
                </div>
                <div className="mt-6">
                  <PipelineHealthPanel jobTwinJobId={jobData.id} />
                </div>
                <div className="mt-6">
                  <HiringPlanAutopilotPanel jobTwinJobId={jobData.id} />
                </div>
              </>
            )}
          </TabsContent>

          {/* Communication Tab */}
          <TabsContent value="communication" className="space-y-6">
            {/* Recruiter Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Recruiter Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={recruiterName}
                      onChange={(e) => setRecruiterName(e.target.value)}
                      placeholder="Recruiter name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={recruiterEmail}
                      onChange={(e) => setRecruiterEmail(e.target.value)}
                      placeholder="recruiter@company.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>LinkedIn URL</Label>
                    <Input
                      value={recruiterLinkedIn}
                      onChange={(e) => setRecruiterLinkedIn(e.target.value)}
                      placeholder="linkedin.com/in/..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preferred Channel</Label>
                    <Select value={contactChannel} onValueChange={setContactChannel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CHANNEL_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              <opt.icon className="h-4 w-4" />
                              {opt.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={saveRecruiterDetails} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Save Details
                </Button>
              </CardContent>
            </Card>

            {/* Contact Plan */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Contact Plan
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateContactPlan}
                    disabled={generating === "contact_plan"}
                  >
                    {generating === "contact_plan" ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Generate Plan
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {jobData.next_action_at ? (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="font-medium">Next: {jobData.next_action_type?.replace("_", " ")}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(jobData.next_action_at), "EEEE, MMMM d 'at' h:mm a")}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No plan yet. Click "Generate Plan" to create one.</p>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Generate messages for different scenarios</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => openMessageModal("initial_outreach")}>
                    <Mail className="h-4 w-4 mr-2" />
                    Initial Outreach
                  </Button>
                  <Button variant="outline" onClick={() => openMessageModal("follow_up")}>
                    <Send className="h-4 w-4 mr-2" />
                    Follow-up
                  </Button>
                  <Button variant="outline" onClick={() => openMessageModal("thank_you")}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Thank You
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Interaction Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Interaction Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                {interactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No interactions yet. Generate a message to get started.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {interactions.map((interaction) => {
                      const typeInfo = INTERACTION_TYPES[interaction.interaction_type as keyof typeof INTERACTION_TYPES] || INTERACTION_TYPES.other;
                      return (
                        <div key={interaction.id} className="flex gap-4 p-4 border rounded-lg">
                          <div className={`w-2 h-2 mt-2 rounded-full ${typeInfo.color}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{typeInfo.label}</Badge>
                              <Badge variant={interaction.is_sent ? "default" : "secondary"}>
                                {interaction.is_sent ? "Sent" : "Planned"}
                              </Badge>
                              {interaction.ai_generated && (
                                <Sparkles className="h-3 w-3 text-primary" />
                              )}
                            </div>
                            {interaction.subject && (
                              <p className="font-medium truncate">{interaction.subject}</p>
                            )}
                            {interaction.body && (
                              <p className="text-sm text-muted-foreground line-clamp-2">{interaction.body}</p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              {interaction.scheduled_for && !interaction.is_sent && (
                                <span>Scheduled: {format(new Date(interaction.scheduled_for), "MMM d, h:mm a")}</span>
                              )}
                              {interaction.sent_at && (
                                <span>Sent: {format(new Date(interaction.sent_at), "MMM d, h:mm a")}</span>
                              )}
                            </div>
                            <div className="flex gap-2 mt-2">
                              {interaction.body && (
                                <Button size="sm" variant="ghost" onClick={() => copyToClipboard(interaction.body!)}>
                                  <Copy className="h-3 w-3 mr-1" />
                                  Copy
                                </Button>
                              )}
                              {!interaction.is_sent && (
                                <Button size="sm" variant="ghost" onClick={() => markAsSent(interaction.id)}>
                                  <Check className="h-3 w-3 mr-1" />
                                  Mark Sent
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Negotiation Tab */}
          <TabsContent value="negotiation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Offer & Expectations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Current Offer</Label>
                    <Input
                      value={currentOffer}
                      onChange={(e) => setCurrentOffer(e.target.value)}
                      placeholder="e.g., $120,000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Your Desired Salary</Label>
                    <Input
                      value={desiredSalary}
                      onChange={(e) => setDesiredSalary(e.target.value)}
                      placeholder="e.g., $140,000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Non-Salary Items to Negotiate</Label>
                  <Textarea
                    value={nonSalaryItems}
                    onChange={(e) => setNonSalaryItems(e.target.value)}
                    placeholder="e.g., Remote work days, signing bonus, stock options, PTO..."
                    rows={3}
                  />
                </div>
                <Button
                  onClick={generateNegotiationPlan}
                  disabled={generating === "negotiation"}
                >
                  {generating === "negotiation" ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Generate Negotiation Plan
                </Button>
              </CardContent>
            </Card>

            {negotiationNotes?.negotiation_strategy_summary && (
              <Card>
                <CardHeader>
                  <CardTitle>AI Negotiation Plan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="text-muted-foreground">Strategy Summary</Label>
                    <p className="mt-1">{negotiationNotes.negotiation_strategy_summary}</p>
                  </div>

                  {negotiationNotes.talking_points && (
                    <div>
                      <Label className="text-muted-foreground">Talking Points</Label>
                      <div className="mt-1 p-3 bg-muted rounded-lg whitespace-pre-wrap text-sm">
                        {negotiationNotes.talking_points}
                      </div>
                    </div>
                  )}

                  {negotiationNotes.negotiation_email_template && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-muted-foreground">Email Template</Label>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(negotiationNotes.negotiation_email_template!)}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </Button>
                      </div>
                      <div className="p-3 bg-muted rounded-lg whitespace-pre-wrap text-sm max-h-64 overflow-y-auto">
                        {negotiationNotes.negotiation_email_template}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Package Tab - Placeholder for existing package functionality */}
          <TabsContent value="package">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Application Package
                </CardTitle>
                <CardDescription>
                  Cover letter, resume highlights, and interview prep
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Visit the main Job Twin page to generate application packages for this job.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => navigate("/job-twin")}>
                    Go to Job Twin
                  </Button>
                  <StartVoiceInterviewDialog 
                    jobId={jobData?.id}
                    roleTitle={jobData?.job?.title}
                    trigger={
                      <Button className="gap-2">
                        <Mic className="h-4 w-4" />
                        Start Live AI Interview (Voice)
                      </Button>
                    }
                  />
                  <Button variant="ghost" onClick={() => navigate(`/voice-interview?jobId=${jobData?.id}`)} className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    View Past Voice Interviews
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Message Generation Modal */}
        <Dialog open={messageModalOpen} onOpenChange={setMessageModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Generate {INTERACTION_TYPES[messageType as keyof typeof INTERACTION_TYPES]?.label || "Message"}
              </DialogTitle>
              <DialogDescription>
                AI will generate a personalized message based on your profile and this job.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tone</Label>
                <Select value={messageTone} onValueChange={setMessageTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Additional Notes (optional)</Label>
                <Textarea
                  value={messageNotes}
                  onChange={(e) => setMessageNotes(e.target.value)}
                  placeholder="Any specific points to include..."
                  rows={2}
                />
              </div>
              <Button onClick={generateMessage} disabled={generating === "message"}>
                {generating === "message" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Generate
              </Button>

              {generatedMessage && (
                <div className="space-y-3 pt-4 border-t">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Subject</Label>
                    <p className="font-medium">{generatedMessage.subject}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-muted-foreground">Message</Label>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(generatedMessage.body)}>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <div className="p-3 bg-muted rounded-lg whitespace-pre-wrap text-sm">
                      {generatedMessage.body}
                    </div>
                  </div>
                  <Button onClick={saveGeneratedMessage} className="w-full">
                    Save to Timeline
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
