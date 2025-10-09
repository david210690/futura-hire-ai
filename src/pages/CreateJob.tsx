import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";

export default function CreateJob() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { currentOrg } = useCurrentOrg();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    employment_type: 'full-time' as 'full-time' | 'part-time' | 'contract' | 'internship',
    seniority: 'mid' as 'entry' | 'mid' | 'senior' | 'lead' | 'executive',
    jd_text: ''
  });

  // Prefill from URL params (from Role Designer)
  useEffect(() => {
    const title = searchParams.get('title');
    const jd_text = searchParams.get('jd_text');
    const tags = searchParams.get('tags');
    
    if (title || jd_text) {
      setFormData(prev => ({
        ...prev,
        ...(title && { title }),
        ...(jd_text && { jd_text }),
      }));
      
      if (tags) {
        toast({
          title: "Skills from Role Design",
          description: `Key skills: ${tags}`,
        });
      }
    }
  }, [searchParams, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      if (!currentOrg) throw new Error('No organization selected');

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) {
        throw new Error('No company associated with user');
      }

      const { data: job, error } = await supabase
        .from('jobs')
        .insert([{
          ...formData,
          company_id: userData.company_id,
          org_id: currentOrg.id,
          created_by: user.id,
          status: 'open' as const
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Job created!",
        description: "You can now generate a shortlist.",
      });

      navigate(`/jobs/${job.id}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar userRole="recruiter" />
      
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Create New Job</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Job Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Senior React Developer"
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Remote, SF Bay Area"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employment_type">Employment Type</Label>
                  <Select
                    value={formData.employment_type}
                    onValueChange={(value) => setFormData({ ...formData, employment_type: value as typeof formData.employment_type })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="seniority">Seniority Level</Label>
                <Select
                  value={formData.seniority}
                  onValueChange={(value) => setFormData({ ...formData, seniority: value as typeof formData.seniority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">Entry Level</SelectItem>
                    <SelectItem value="mid">Mid Level</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jd_text">Job Description</Label>
                <Textarea
                  id="jd_text"
                  value={formData.jd_text}
                  onChange={(e) => setFormData({ ...formData, jd_text: e.target.value })}
                  placeholder="Paste the full job description here..."
                  rows={12}
                  required
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Creating..." : "Create Job"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
