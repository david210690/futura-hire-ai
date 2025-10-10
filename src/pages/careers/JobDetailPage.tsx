import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Briefcase, MapPin, Clock, Video, FileText, Users, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SEOHead } from "@/components/shared/SEOHead";

export default function JobDetailPage() {
  const { orgSlug, jobSlug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<any>(null);

  useEffect(() => {
    fetchJobDetails();
  }, [orgSlug, jobSlug]);

  const fetchJobDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-job-public", {
        body: { orgSlug, jobSlug },
      });

      if (error) throw error;
      setJob(data.job);
    } catch (error: any) {
      console.error("Error fetching job:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-10 w-32 mb-8" />
          <Skeleton className="h-12 w-96 mb-4" />
          <Skeleton className="h-6 w-64 mb-8" />
          <Skeleton className="h-64 mb-8" />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Job Not Found</CardTitle>
            <CardDescription>
              The job posting you're looking for doesn't exist or is no longer available.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate(`/c/${orgSlug}`)}>
              View All Jobs
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${job.title} at ${job.companies?.name || job.orgs?.name}`}
        description={`Apply for ${job.title} position. ${job.location} • ${job.employment_type}`}
      />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(`/c/${orgSlug}`)}
          className="mb-8"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Careers
        </Button>

        {/* Job Header */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="default">{job.employment_type?.replace("-", " ")}</Badge>
            {job.seniority && <Badge variant="secondary">{job.seniority}</Badge>}
            {job.remote_mode && <Badge variant="outline">{job.remote_mode}</Badge>}
          </div>
          
          <h1 className="text-4xl font-bold mb-4">{job.title}</h1>
          
          <div className="flex flex-wrap gap-4 text-muted-foreground mb-6">
            {job.companies?.name && (
              <span className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                {job.companies.name}
              </span>
            )}
            {job.location && (
              <span className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {job.location}
              </span>
            )}
            {job.salary_range && (
              <span className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                {job.salary_range}
              </span>
            )}
          </div>

          <Button size="lg" onClick={() => navigate(`/c/${orgSlug}/jobs/${jobSlug}/apply`)}>
            Apply Now
          </Button>
        </div>

        {/* Hiring Process */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Hiring Process</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">1. Application</h4>
                  <p className="text-sm text-muted-foreground">
                    Submit your application and resume
                  </p>
                </div>
              </div>
              
              {job.assessments && (
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">2. AI Assessment</h4>
                    <p className="text-sm text-muted-foreground">
                      Complete {job.assessments.name} ({job.assessments.duration_minutes} minutes)
                    </p>
                  </div>
                </div>
              )}
              
              {job.video_required && (
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Video className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">3. Video Introduction</h4>
                    <p className="text-sm text-muted-foreground">
                      Record a 2-minute video introduction
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">4. Interview</h4>
                  <p className="text-sm text-muted-foreground">
                    Final interview with the team
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Job Description */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Job Description</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap">
              {job.jd_text}
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        {job.tags && job.tags.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Skills & Technologies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {job.tags.map((tag: string, idx: number) => (
                  <Badge key={idx} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer CTA */}
        <Card>
          <CardContent className="py-8 text-center">
            <h3 className="text-xl font-semibold mb-4">Ready to apply?</h3>
            <Button size="lg" onClick={() => navigate(`/c/${orgSlug}/jobs/${jobSlug}/apply`)}>
              Apply Now
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              HD webcam (≥720p) and professional attire required for video rounds
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}