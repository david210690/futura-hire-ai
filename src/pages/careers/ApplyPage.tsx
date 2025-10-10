import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, Loader2, CheckCircle2 } from "lucide-react";

export default function ApplyPage() {
  const { orgSlug, jobSlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [applyToken, setApplyToken] = useState("");
  
  const [job, setJob] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    linkedinUrl: "",
    whyRole: "",
  });

  useEffect(() => {
    fetchJobAndUser();
  }, [orgSlug, jobSlug]);

  const fetchJobAndUser = async () => {
    setLoading(true);
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        navigate("/auth");
        return;
      }
      
      setUser(currentUser);
      
      // Get user profile for pre-filling
      const { data: candidate } = await supabase
        .from("candidates")
        .select("*")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (candidate) {
        setFormData({
          name: candidate.full_name || "",
          email: currentUser.email || "",
          phone: "",
          linkedinUrl: candidate.linkedin_url || "",
          whyRole: "",
        });
      } else {
        setFormData({
          ...formData,
          email: currentUser.email || "",
        });
      }

      // Get job details
      const { data } = await supabase.functions.invoke("get-job-public", {
        body: { orgSlug, jobSlug },
      });

      setJob(data.job);
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to load job details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("submit-application", {
        body: {
          orgSlug,
          jobSlug,
          candidateData: {
            userId: user.id,
            name: formData.name,
            email: formData.email,
            linkedinUrl: formData.linkedinUrl,
            whyRole: formData.whyRole,
          },
        },
      });

      if (error) throw error;

      setApplyToken(data.applyToken);
      setSubmitted(true);

      toast({
        title: "Application Submitted!",
        description: "Check your email for next steps.",
      });
    } catch (error: any) {
      console.error("Error submitting:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit application",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardContent className="pt-12 pb-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">Application Received!</h2>
            <p className="text-muted-foreground mb-8">
              Thank you for applying to {job.title}. We've sent you an email with the next steps.
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => navigate(`/c/${orgSlug}/apply/status/${applyToken}`)}
              >
                View Application Status
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/c/${orgSlug}`)}
              >
                Back to Careers
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate(`/c/${orgSlug}/jobs/${jobSlug}`)}
          className="mb-8"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Job
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Apply for {job?.title}</CardTitle>
            <CardDescription>
              Fill out the form below to submit your application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn / Portfolio URL</Label>
                <Input
                  id="linkedin"
                  type="url"
                  placeholder="https://linkedin.com/in/yourprofile"
                  value={formData.linkedinUrl}
                  onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whyRole">Why do you want this role? *</Label>
                <Textarea
                  id="whyRole"
                  required
                  rows={5}
                  placeholder="Tell us why you're interested in this position..."
                  value={formData.whyRole}
                  onChange={(e) => setFormData({ ...formData, whyRole: e.target.value })}
                />
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Application"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/c/${orgSlug}/jobs/${jobSlug}`)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}