import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { Sparkles, Target, Briefcase, MessageSquare, Loader2, RefreshCw, Copy, CheckCircle2, Bookmark, Send, Calendar, Trophy, XCircle, Ghost, FileText, Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_OPTIONS = [
  { value: 'new', label: 'New', icon: Sparkles, color: 'bg-blue-500' },
  { value: 'saved', label: 'Saved', icon: Bookmark, color: 'bg-yellow-500' },
  { value: 'applied', label: 'Applied', icon: Send, color: 'bg-green-500' },
  { value: 'interview', label: 'Interview', icon: Calendar, color: 'bg-purple-500' },
  { value: 'offer', label: 'Offer', icon: Trophy, color: 'bg-emerald-500' },
  { value: 'rejected', label: 'Rejected', icon: XCircle, color: 'bg-red-500' },
  { value: 'ghosted', label: 'Ghosted', icon: Ghost, color: 'bg-gray-500' },
] as const;

const PRIORITY_OPTIONS = [
  { value: 'must_have', label: 'Must Have', weight: 3 },
  { value: 'important', label: 'Important', weight: 2 },
  { value: 'nice_to_have', label: 'Nice to Have', weight: 1 },
] as const;

interface WeightedPreference {
  value: string;
  priority: 'must_have' | 'important' | 'nice_to_have';
}

interface JobTwinProfile {
  id: string;
  ideal_role: string;
  skills: string[];
  preferences: Record<string, any>;
  career_goals: string;
}

interface MatchedJob {
  id: string;
  job_id: string;
  match_score: number;
  match_reasons: string[];
  status: string;
  applied_at?: string;
  notes?: string;
  job?: {
    title: string;
    company_name?: string;
    location?: string;
  };
}

interface InterviewPrep {
  id: string;
  job_id: string;
  questions: string[];
  tips: string[];
}

export default function JobTwin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [matching, setMatching] = useState(false);
  const [importingResume, setImportingResume] = useState(false);
  const [hasResume, setHasResume] = useState(false);
  const [profile, setProfile] = useState<JobTwinProfile | null>(null);
  const [matchedJobs, setMatchedJobs] = useState<MatchedJob[]>([]);
  const [interviewPreps, setInterviewPreps] = useState<InterviewPrep[]>([]);

  // Form state
  const [idealRole, setIdealRole] = useState("");
  const [skills, setSkills] = useState("");
  const [careerGoals, setCareerGoals] = useState("");
  const [salaryRange, setSalaryRange] = useState("");
  const [salaryPriority, setSalaryPriority] = useState<'must_have' | 'important' | 'nice_to_have'>('important');
  const [remotePreference, setRemotePreference] = useState("");
  const [remotePriority, setRemotePriority] = useState<'must_have' | 'important' | 'nice_to_have'>('important');
  const [locationPreference, setLocationPreference] = useState("");
  const [locationPriority, setLocationPriority] = useState<'must_have' | 'important' | 'nice_to_have'>('nice_to_have');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if user has a candidate profile with resume
      const { data: candidate } = await supabase
        .from("candidates")
        .select("id, skills")
        .eq("user_id", user.id)
        .maybeSingle();

      if (candidate) {
        const { data: resume } = await supabase
          .from("resumes")
          .select("id, parsed_text")
          .eq("candidate_id", candidate.id)
          .maybeSingle();
        
        setHasResume(!!resume);
      }

      // Load Job Twin profile using user_id
      const { data: profileData, error: profileError } = await supabase
        .from("job_twin_profiles" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileData && !profileError) {
        const typedProfile = profileData as unknown as JobTwinProfile;
        setProfile(typedProfile);
        setIdealRole(typedProfile.ideal_role || "");
        setSkills(typedProfile.skills?.join(", ") || "");
        setCareerGoals(typedProfile.career_goals || "");
        const prefs = typedProfile.preferences || {};
        setSalaryRange(prefs.salary?.value || "");
        setSalaryPriority(prefs.salary?.priority || "important");
        setRemotePreference(prefs.remote?.value || "");
        setRemotePriority(prefs.remote?.priority || "important");
        setLocationPreference(prefs.location?.value || "");
        setLocationPriority(prefs.location?.priority || "nice_to_have");

        // Load matched jobs
        const { data: jobs } = await supabase
          .from("job_twin_jobs" as any)
          .select("*, jobs(title, location)")
          .eq("profile_id", typedProfile.id)
          .order("match_score", { ascending: false });

        if (jobs) {
          setMatchedJobs((jobs as any[]).map(j => ({
            id: j.id,
            job_id: j.job_id,
            match_score: j.match_score,
            match_reasons: j.match_reasons,
            status: j.status || 'new',
            applied_at: j.applied_at,
            notes: j.notes,
            job: j.jobs
          })));
        }

        // Load interview preps
        const { data: preps } = await supabase
          .from("job_twin_interview_prep" as any)
          .select("*")
          .eq("profile_id", typedProfile.id);

        if (preps) {
          setInterviewPreps((preps as any[]).map(p => ({
            id: p.id,
            job_id: p.job_id,
            questions: p.questions || [],
            tips: p.tips || []
          })));
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const importFromResume = async () => {
    setImportingResume(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get candidate and their resume
      const { data: candidate } = await supabase
        .from("candidates")
        .select("id, skills, headline, summary")
        .eq("user_id", user.id)
        .single();

      if (!candidate) {
        toast({ title: "No candidate profile", description: "Please create your candidate profile first", variant: "destructive" });
        return;
      }

      // Parse skills from candidate profile
      const candidateSkills = candidate.skills?.split(",").map((s: string) => s.trim()).filter(Boolean) || [];
      
      // Merge with existing skills (avoid duplicates)
      const existingSkills = skills.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
      const newSkills = candidateSkills.filter((s: string) => !existingSkills.includes(s.toLowerCase()));
      
      if (newSkills.length > 0 || candidateSkills.length > 0) {
        const mergedSkills = [...new Set([...skills.split(",").map(s => s.trim()).filter(Boolean), ...newSkills])];
        setSkills(mergedSkills.join(", "));
      }

      // Use headline as ideal role if not set
      if (!idealRole && candidate.headline) {
        setIdealRole(candidate.headline);
      }

      // Use summary as career goals if not set
      if (!careerGoals && candidate.summary) {
        setCareerGoals(candidate.summary);
      }

      toast({ 
        title: "Resume data imported", 
        description: `Imported ${newSkills.length} new skills from your profile` 
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setImportingResume(false);
    }
  };

  const saveProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Error", description: "Please sign in first", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const profileData = {
        user_id: user.id,
        ideal_role: idealRole,
        skills: skills.split(",").map(s => s.trim()).filter(Boolean),
        career_goals: careerGoals,
        preferences: {
          salary: { value: salaryRange, priority: salaryPriority },
          remote: { value: remotePreference, priority: remotePriority },
          location: { value: locationPreference, priority: locationPriority }
        }
      };

      if (profile?.id) {
        const { error } = await supabase
          .from("job_twin_profiles" as any)
          .update(profileData)
          .eq("id", profile.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("job_twin_profiles" as any)
          .insert(profileData)
          .select()
          .single();

        if (error) throw error;
        setProfile(data as unknown as JobTwinProfile);
      }

      toast({ title: "Profile saved", description: "Your Job Twin profile has been updated" });
      loadProfile();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateJobStatus = async (jobTwinJobId: string, newStatus: string) => {
    try {
      const updateData: Record<string, any> = { status: newStatus };
      if (newStatus === 'applied') {
        updateData.applied_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("job_twin_jobs" as any)
        .update(updateData)
        .eq("id", jobTwinJobId);

      if (error) throw error;

      setMatchedJobs(prev => prev.map(j => 
        j.id === jobTwinJobId ? { ...j, status: newStatus, ...(newStatus === 'applied' ? { applied_at: new Date().toISOString() } : {}) } : j
      ));

      toast({ title: "Status updated" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const runMatching = async () => {
    if (!profile?.id) {
      toast({ title: "Save your profile first", variant: "destructive" });
      return;
    }

    setMatching(true);
    try {
      const { data, error } = await supabase.functions.invoke("job-twin-match", {
        body: { profile_id: profile.id }
      });

      if (error) throw error;

      toast({ title: "Matching complete", description: `Found ${data.matches?.length || 0} potential matches` });
      loadProfile();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setMatching(false);
    }
  };

  const generateInterviewPrep = async (jobId: string) => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase.functions.invoke("job-twin-interview-prep", {
        body: { profile_id: profile.id, job_id: jobId }
      });

      if (error) throw error;

      toast({ title: "Interview prep generated" });
      loadProfile();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Job Twin</h1>
          </div>
          <p className="text-muted-foreground">
            Your AI-powered career companion. Define your ideal role and let AI find the perfect matches.
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="matches" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Matches
              {matchedJobs.length > 0 && (
                <Badge variant="secondary" className="ml-1">{matchedJobs.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="prep" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Interview Prep
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Your Ideal Role</CardTitle>
                    <CardDescription>
                      Tell us about your dream job and we'll find the best matches
                    </CardDescription>
                  </div>
                  {hasResume && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={importFromResume}
                      disabled={importingResume}
                    >
                      {importingResume ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <FileText className="h-4 w-4 mr-2" />
                      )}
                      Import from Resume
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="idealRole">What role are you looking for?</Label>
                  <Input
                    id="idealRole"
                    placeholder="e.g., Senior Product Manager, Full Stack Developer"
                    value={idealRole}
                    onChange={(e) => setIdealRole(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="skills">Your key skills (comma-separated)</Label>
                    {!hasResume && (
                      <span className="text-xs text-muted-foreground">
                        Upload a resume to auto-import skills
                      </span>
                    )}
                  </div>
                  <Input
                    id="skills"
                    placeholder="e.g., Python, React, Product Strategy, Data Analysis"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="careerGoals">Career goals & aspirations</Label>
                  <Textarea
                    id="careerGoals"
                    placeholder="What do you want to achieve in the next 2-5 years?"
                    value={careerGoals}
                    onChange={(e) => setCareerGoals(e.target.value)}
                    rows={3}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Preferences & Priorities</h4>
                  <p className="text-sm text-muted-foreground">Set your preferences and how important each is to you</p>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {/* Salary Preference */}
                    <div className="flex items-end gap-3">
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="salary">Salary expectation</Label>
                        <Input
                          id="salary"
                          placeholder="e.g., $120k-150k, ₹15-20 LPA"
                          value={salaryRange}
                          onChange={(e) => setSalaryRange(e.target.value)}
                        />
                      </div>
                      <div className="w-36 space-y-2">
                        <Label>Priority</Label>
                        <Select value={salaryPriority} onValueChange={(v: any) => setSalaryPriority(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRIORITY_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Remote Preference */}
                    <div className="flex items-end gap-3">
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="remote">Work arrangement</Label>
                        <Select value={remotePreference} onValueChange={setRemotePreference}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select preference" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="remote">Remote Only</SelectItem>
                            <SelectItem value="hybrid">Hybrid</SelectItem>
                            <SelectItem value="onsite">On-site</SelectItem>
                            <SelectItem value="flexible">Flexible</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-36 space-y-2">
                        <Label>Priority</Label>
                        <Select value={remotePriority} onValueChange={(v: any) => setRemotePriority(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRIORITY_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Location Preference */}
                    <div className="flex items-end gap-3">
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="location">Preferred location(s)</Label>
                        <Input
                          id="location"
                          placeholder="e.g., New York, London, Bangalore"
                          value={locationPreference}
                          onChange={(e) => setLocationPreference(e.target.value)}
                        />
                      </div>
                      <div className="w-36 space-y-2">
                        <Label>Priority</Label>
                        <Select value={locationPriority} onValueChange={(v: any) => setLocationPriority(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRIORITY_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={saveProfile} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Save Profile
                  </Button>
                  {profile && (
                    <Button variant="outline" onClick={runMatching} disabled={matching}>
                      {matching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                      Find Matches
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matches">
            <Card>
              <CardHeader>
                <CardTitle>Your Job Matches</CardTitle>
                <CardDescription>
                  AI-matched positions based on your profile
                </CardDescription>
              </CardHeader>
              <CardContent>
                {matchedJobs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No matches yet. Save your profile and click "Find Matches" to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {matchedJobs.map((match) => {
                      const statusOption = STATUS_OPTIONS.find(s => s.value === match.status) || STATUS_OPTIONS[0];
                      const StatusIcon = statusOption.icon;
                      return (
                        <Card key={match.id} className="border-l-4 border-l-primary">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold text-lg truncate">{match.job?.title || "Job Position"}</h3>
                                </div>
                                {match.job?.location && (
                                  <p className="text-sm text-muted-foreground">{match.job.location}</p>
                                )}
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {match.match_reasons?.slice(0, 3).map((reason, i) => (
                                    <Badge key={i} variant="secondary">{reason}</Badge>
                                  ))}
                                </div>
                                {match.applied_at && (
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Applied: {new Date(match.applied_at).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl font-bold text-primary">{match.match_score}%</span>
                                </div>
                                <Progress value={match.match_score} className="w-24 h-2" />
                                <Select
                                  value={match.status}
                                  onValueChange={(value) => updateJobStatus(match.id, value)}
                                >
                                  <SelectTrigger className="w-32 h-8">
                                    <div className="flex items-center gap-2">
                                      <StatusIcon className="h-3 w-3" />
                                      <SelectValue />
                                    </div>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {STATUS_OPTIONS.map((opt) => {
                                      const Icon = opt.icon;
                                      return (
                                        <SelectItem key={opt.value} value={opt.value}>
                                          <div className="flex items-center gap-2">
                                            <Icon className="h-3 w-3" />
                                            {opt.label}
                                          </div>
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => generateInterviewPrep(match.job_id)}
                                >
                                  <MessageSquare className="h-4 w-4 mr-1" />
                                  Prep
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prep">
            <Card>
              <CardHeader>
                <CardTitle>Interview Preparation</CardTitle>
                <CardDescription>
                  AI-generated questions and tips tailored to your profile
                </CardDescription>
              </CardHeader>
              <CardContent>
                {interviewPreps.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No interview prep yet. Click "Prep" on a matched job to generate questions.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {interviewPreps.map((prep) => (
                      <div key={prep.id} className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            Practice Questions
                          </h4>
                          <div className="space-y-2">
                            {prep.questions?.map((q, i) => (
                              <div key={i} className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                                <span className="text-muted-foreground">{i + 1}.</span>
                                <p className="flex-1">{q}</p>
                                <Button size="icon" variant="ghost" onClick={() => copyToClipboard(q)}>
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                        {prep.tips && prep.tips.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Tips</h4>
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                              {prep.tips.map((tip, i) => (
                                <li key={i}>{tip}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <Separator />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
