import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScoreBadge } from "@/components/shared/ScoreBadge";

interface Candidate {
  id: string;
  full_name: string;
  initials?: string;
  headline: string;
  skills: string;
  years_experience: number;
  skill_fit_score: number;
  culture_fit_score: number;
  overall_score: number;
  shortlist_reason: string;
}

interface ShareLinkData {
  id: string;
  job_title: string;
  org_name: string;
  candidates: Candidate[];
  expires_at: string;
  revoked: boolean;
  mask_names: boolean;
}

export default function ShareableShortlist() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ShareLinkData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadShareData();
    }
  }, [token]);

  const loadShareData = async () => {
    try {
      // For now, set mock data until share_links table is properly created
      // TODO: Implement actual share link fetching once migration is complete
      setData({
        id: token || "",
        job_title: "Senior React Developer",
        org_name: "FuturaHire Demo",
        candidates: [
          {
            id: "1",
            full_name: "John Doe",
            headline: "Full Stack Developer with 5+ years experience",
            skills: "React, TypeScript, Node.js, PostgreSQL",
            years_experience: 5,
            skill_fit_score: 92,
            culture_fit_score: 88,
            overall_score: 90,
            shortlist_reason: "Strong technical skills, excellent cultural alignment, proven track record",
          },
          {
            id: "2",
            full_name: "Jane Smith",
            headline: "Frontend Specialist focusing on React ecosystem",
            skills: "React, Redux, TailwindCSS, Vite",
            years_experience: 4,
            skill_fit_score: 88,
            culture_fit_score: 90,
            overall_score: 89,
            shortlist_reason: "Great frontend expertise, strong communication skills",
          },
        ],
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        revoked: false,
        mask_names: false,
      });
      setLoading(false);
    } catch (error) {
      console.error("Error loading share data:", error);
      setError("Failed to load shortlist");
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    toast({
      title: "Generating PDF",
      description: "Your PDF export will download shortly...",
    });
    // TODO: Implement PDF export via edge function
    console.log("PDF export requested for token:", token);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading shortlist...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Card className="p-8 max-w-md text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">Shortlist Unavailable</h1>
          <p className="text-muted-foreground">{error}</p>
          <p className="text-sm">
            This link may have expired or been revoked. Please request a new link
            from the recruiter.
          </p>
        </Card>
      </div>
    );
  }

  const expiresIn = Math.ceil(
    (new Date(data.expires_at).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold">{data.job_title}</h1>
              <p className="text-muted-foreground mt-2">
                Shared by {data.org_name} • Top {data.candidates.length}{" "}
                Candidates
              </p>
            </div>
            <Button onClick={handleDownloadPDF} size="lg">
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </div>

          {/* Expiry Notice */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              This link expires in {expiresIn} day{expiresIn !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Candidates Grid */}
        <div className="grid gap-6">
          {data.candidates.map((candidate, index) => (
            <Card key={candidate.id} className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-lg font-bold">
                      #{index + 1}
                    </Badge>
                    <h3 className="text-2xl font-bold">{candidate.full_name}</h3>
                  </div>
                  <p className="text-muted-foreground">{candidate.headline}</p>
                  <p className="text-sm">
                    {candidate.years_experience} years experience
                  </p>
                </div>

                <div className="flex gap-2">
                  <ScoreBadge
                    score={candidate.skill_fit_score}
                    label="Skill Fit"
                  />
                  <ScoreBadge
                    score={candidate.culture_fit_score}
                    label="Culture"
                  />
                  <ScoreBadge
                    score={candidate.overall_score}
                    label="Overall"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Why shortlisted:</p>
                <p className="text-sm text-muted-foreground">
                  {candidate.shortlist_reason}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {candidate.skills?.split(",").map((skill, i) => (
                  <Badge key={i} variant="secondary">
                    {skill.trim()}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* Watermark Footer */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>
            Shared via <span className="font-semibold text-primary">FuturaHire</span>{" "}
            • {data.org_name}
          </p>
        </div>
      </div>
    </div>
  );
}
