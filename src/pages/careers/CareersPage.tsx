import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Briefcase, MapPin, Search, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SEOHead } from "@/components/shared/SEOHead";

export default function CareersPage() {
  const { orgSlug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchJobs();
  }, [orgSlug]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-public-jobs", {
        body: { orgSlug },
      });

      if (error) throw error;
      setOrg(data.org);
      setJobs(data.jobs || []);
    } catch (error: any) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter((job) =>
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.companies?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16 max-w-6xl">
          <Skeleton className="h-12 w-64 mb-4" />
          <Skeleton className="h-6 w-96 mb-12" />
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Organization Not Found</CardTitle>
            <CardDescription>
              The organization you're looking for doesn't exist.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${org.name} Careers`}
        description={`Join our team at ${org.name}. Explore open positions and apply today.`}
      />
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-16 max-w-6xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {org.name} Careers
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Join our team and help shape the future
          </p>

          {/* Search */}
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search jobs by title, location, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Job Listings */}
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {filteredJobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {searchTerm
                  ? "No jobs found matching your search."
                  : "No open positions at the moment."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {filteredJobs.map((job) => (
              <Card
                key={job.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/c/${orgSlug}/jobs/${job.slug}`)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-xl">{job.title}</CardTitle>
                    <Badge variant="secondary">
                      {job.employment_type?.replace("-", " ")}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-4 text-sm">
                    {job.companies?.name && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        {job.companies.name}
                      </span>
                    )}
                    {job.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {job.location}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {job.jd_text?.substring(0, 200)}...
                  </p>
                  {job.tags && job.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {job.tags.slice(0, 3).map((tag: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Button variant="outline" className="w-full">
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Footer Note */}
      <div className="border-t bg-muted/20 py-8">
        <div className="container mx-auto px-4 max-w-6xl text-center text-sm text-muted-foreground">
          <p>Powered by FuturaHire - AI-Powered Recruitment Platform</p>
          <p className="mt-2">
            HD webcam (≥720p) and professional attire required for video interview rounds
          </p>
        </div>
      </div>
    </div>
  );
}