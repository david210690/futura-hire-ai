import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Briefcase, Calendar, Linkedin, Award } from "lucide-react";

interface CandidateProfilePreviewProps {
  candidate: {
    full_name: string;
    headline?: string;
    summary?: string;
    skills?: string;
    years_experience?: number;
    linkedin_url?: string;
  };
}

export function CandidateProfilePreview({ candidate }: CandidateProfilePreviewProps) {
  const initials = candidate.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const skillsList = candidate.skills
    ? candidate.skills.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
          <CardTitle className="text-2xl">{candidate.full_name}</CardTitle>
          {candidate.headline && (
            <p className="text-lg text-muted-foreground">{candidate.headline}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 justify-center">
            {candidate.years_experience !== undefined && candidate.years_experience > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span>{candidate.years_experience} years experience</span>
              </div>
            )}
            {candidate.linkedin_url && (
              <a
                href={candidate.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Linkedin className="h-4 w-4" />
                LinkedIn Profile
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {candidate.summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Professional Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">{candidate.summary}</p>
          </CardContent>
        </Card>
      )}

      {skillsList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Skills & Expertise</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {skillsList.map((skill, idx) => (
                <Badge key={idx} variant="secondary" className="text-sm">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <p className="text-sm text-center text-muted-foreground">
            This is how recruiters and hiring managers will see your profile
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
