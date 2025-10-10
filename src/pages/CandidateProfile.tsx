import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Loader2, Upload, Eye, Edit, ArrowLeft } from "lucide-react";
import { CandidateProfilePreview } from "@/components/candidate/CandidateProfilePreview";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CandidateProfile() {
  const [user, setUser] = useState<any>(null);
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: '',
    headline: '',
    summary: '',
    skills: '',
    years_experience: 0,
    linkedin_url: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setUser(user);

      const { data: candidateData } = await supabase
        .from('candidates')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (candidateData) {
        setCandidate(candidateData);
        setFormData({
          full_name: candidateData.full_name || '',
          headline: candidateData.headline || '',
          summary: candidateData.summary || '',
          skills: candidateData.skills || '',
          years_experience: candidateData.years_experience || 0,
          linkedin_url: candidateData.linkedin_url || '',
        });
      }

      setLoading(false);
    };

    fetchData();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (candidate) {
        // Update existing candidate
        const { error } = await supabase
          .from('candidates')
          .update(formData)
          .eq('id', candidate.id);

        if (error) throw error;

        toast({
          title: "Profile updated",
          description: "Your profile has been successfully updated.",
        });
        setActiveTab("preview");
      } else {
        // Create new candidate
        const { data, error } = await supabase
          .from('candidates')
          .insert({
            user_id: user.id,
            ...formData,
          })
          .select()
          .single();

        if (error) throw error;

        setCandidate(data);
        toast({
          title: "Profile created",
          description: "Your profile has been successfully created.",
        });
        setActiveTab("preview");
      }
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !candidate) return;

    setUploadingResume(true);

    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${candidate.id}-${Date.now()}.${fileExt}`;
      const filePath = `${candidate.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);

      // Parse resume using edge function
      const { data: parseData, error: parseError } = await supabase.functions.invoke('parse-resume', {
        body: { file_url: publicUrl, candidate_id: candidate.id }
      });

      if (parseError) throw parseError;

      setParsedData(parseData);

      // Fetch available jobs
      const { data: jobs } = await supabase
        .from('jobs')
        .select('*, companies(name)')
        .eq('status', 'open')
        .limit(10);

      if (jobs) {
        setAvailableJobs(jobs);
      }

      toast({
        title: "Resume uploaded",
        description: "Your resume has been uploaded and parsed successfully.",
      });
    } catch (error: any) {
      console.error('Error uploading resume:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload resume",
        variant: "destructive",
      });
    } finally {
      setUploadingResume(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar userName={user?.user_metadata?.name} userRole="candidate" />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar userName={user?.user_metadata?.name} userRole="candidate" />
      
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/candidate/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold mb-2">
            {candidate ? 'My Profile' : 'Create Profile'}
          </h1>
          <p className="text-muted-foreground">
            Complete your profile to get better job matches
          </p>
        </div>

        {candidate && (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "edit" | "preview")} className="mb-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="edit">
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
              </TabsTrigger>
              <TabsTrigger value="preview">
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {activeTab === "preview" && candidate ? (
          <CandidateProfilePreview candidate={formData} />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Your personal and contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="years_experience">Years of Experience</Label>
                  <Input
                    id="years_experience"
                    type="number"
                    min="0"
                    value={formData.years_experience}
                    onChange={(e) => setFormData({ ...formData, years_experience: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedin_url">LinkedIn Profile</Label>
                  <Input
                    id="linkedin_url"
                    type="url"
                    value={formData.linkedin_url}
                    onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Professional Profile</CardTitle>
              <CardDescription>Tell employers about your expertise</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="headline">Professional Headline</Label>
                <Input
                  id="headline"
                  value={formData.headline}
                  onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                  placeholder="e.g., Senior Software Engineer | Full Stack Developer"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="summary">Summary</Label>
                <Textarea
                  id="summary"
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Brief overview of your experience and expertise"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="skills">Skills (comma-separated)</Label>
                <Textarea
                  id="skills"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  placeholder="React, Node.js, Python, AWS, etc."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {candidate && (
            <Card>
              <CardHeader>
                <CardTitle>Resume</CardTitle>
                <CardDescription>Upload your resume for AI parsing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="resume">Upload Resume (PDF or DOCX)</Label>
                    <Input
                      id="resume"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleResumeUpload}
                      disabled={uploadingResume}
                    />
                    {uploadingResume && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading and parsing resume...
                      </p>
                    )}
                  </div>

                  {parsedData && (
                    <div className="space-y-4 p-4 bg-muted rounded-lg">
                      <h3 className="font-semibold text-sm">Parsed Resume Data</h3>
                      <div className="space-y-2 text-sm">
                        {parsedData.name && (
                          <div>
                            <span className="font-medium">Name:</span> {parsedData.name}
                          </div>
                        )}
                        {parsedData.email && (
                          <div>
                            <span className="font-medium">Email:</span> {parsedData.email}
                          </div>
                        )}
                        {parsedData.skills && parsedData.skills.length > 0 && (
                          <div>
                            <span className="font-medium">Skills:</span> {parsedData.skills.join(', ')}
                          </div>
                        )}
                        {parsedData.experience && (
                          <div>
                            <span className="font-medium">Experience:</span> {parsedData.experience} years
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {availableJobs.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm">Available Job Openings</h3>
                      <div className="space-y-2">
                        {availableJobs.map((job) => (
                          <div 
                            key={job.id}
                            className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => navigate(`/jobs/${job.id}`)}
                          >
                            <div className="font-medium">{job.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {job.companies?.name} • {job.location}
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => navigate('/candidate/dashboard')}
                      >
                        View All Jobs
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-4">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Profile'
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/candidate/dashboard')}>
              Cancel
            </Button>
          </div>
          </form>
        )}
      </main>
    </div>
  );
}
