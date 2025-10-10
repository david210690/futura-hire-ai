import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Circle, Clock, Video, FileText, Users, Loader2 } from "lucide-react";

export default function ApplicationStatusPage() {
  const { orgSlug, token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<any>(null);
  const [nextAction, setNextAction] = useState<string | null>(null);
  const [nextActionLabel, setNextActionLabel] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, [token]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-candidate-status", {
        body: { token },
      });

      if (error) throw error;

      setApplication(data.application);
      setNextAction(data.nextAction);
      setNextActionLabel(data.nextActionLabel);
    } catch (error: any) {
      console.error("Error fetching status:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Application Not Found</CardTitle>
            <CardDescription>
              The application link you're using is invalid or expired.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const steps = [
    {
      id: "applied",
      label: "Application Submitted",
      icon: FileText,
      completed: true,
    },
    {
      id: "assessment",
      label: "Assessment",
      icon: Clock,
      completed: application.status !== "assessment_pending",
      active: application.status === "assessment_pending",
    },
    {
      id: "video",
      label: "Video Introduction",
      icon: Video,
      completed: application.status === "completed" || application.status === "interview_pending",
      active: application.status === "video_pending",
    },
    {
      id: "interview",
      label: "Interview",
      icon: Users,
      completed: application.status === "completed",
      active: application.status === "interview_pending",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl mb-2">
                  {application.jobs?.title}
                </CardTitle>
                <CardDescription>
                  {application.orgs?.name} • Application Status
                </CardDescription>
              </div>
              <Badge
                variant={
                  application.status === "completed"
                    ? "default"
                    : application.status?.includes("pending")
                    ? "secondary"
                    : "outline"
                }
              >
                {application.status?.replace("_", " ")}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Progress Tracker */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Application Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <div key={step.id}>
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-3 rounded-full ${
                          step.completed
                            ? "bg-green-500/10 text-green-600"
                            : step.active
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {step.completed ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4
                          className={`font-semibold ${
                            step.active ? "text-primary" : ""
                          }`}
                        >
                          {step.label}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {step.completed
                            ? "Completed"
                            : step.active
                            ? "In Progress"
                            : "Pending"}
                        </p>
                      </div>
                    </div>
                    {idx < steps.length - 1 && (
                      <div className="ml-9 h-8 w-0.5 bg-border my-2" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Next Action */}
        {nextAction && (
          <Card>
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                {nextAction === "assessment"
                  ? "Complete your AI-powered assessment to move forward."
                  : "Record your video introduction to complete your application."}
              </p>
              <Button
                size="lg"
                onClick={() =>
                  navigate(`/c/${orgSlug}/apply/${nextAction}/${token}`)
                }
              >
                {nextActionLabel}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Candidate Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Your Application</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="font-medium">Name:</span>{" "}
              {application.candidates?.full_name}
            </div>
            <div>
              <span className="font-medium">Job:</span> {application.jobs?.title}
            </div>
            <div>
              <span className="font-medium">Location:</span>{" "}
              {application.jobs?.location}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}