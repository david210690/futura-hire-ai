import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface FitRequest {
  id: string;
  status: string;
  createdAt: string;
  jobTwinJobId: string;
  jobTitle: string;
  companyName: string;
}

export function FitRequestsPanel() {
  const [requests, setRequests] = useState<FitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke("get-pending-fit-requests");
      
      if (response.error) {
        console.error("Error fetching fit requests:", response.error);
        return;
      }

      if (response.data?.success && response.data.requests) {
        setRequests(response.data.requests);
      }
    } catch (error) {
      console.error("Error fetching fit requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleCompleteFitCheck = async (request: FitRequest) => {
    setCompletingId(request.id);
    try {
      const response = await supabase.functions.invoke("evaluate-role-dna-fit", {
        body: { jobId: request.jobTwinJobId }
      });

      if (response.error) {
        // Check for specific error codes
        const errorData = response.error;
        if (typeof errorData === 'object' && 'code' in errorData && errorData.code === "NO_ROLE_DNA") {
          toast.error("Role DNA not yet available for this role. The recruiter needs to generate it first.");
        } else {
          toast.error("Could not complete fit check. Please try again later.");
        }
        return;
      }

      if (response.data?.success) {
        toast.success("Your alignment has been evaluated. Check the job page for details.");
        // Remove from list
        setRequests(prev => prev.filter(r => r.id !== request.id));
      } else if (response.data?.code === "NO_ROLE_DNA") {
        toast.error("Role DNA not yet available for this role. The recruiter needs to generate it first.");
      } else {
        toast.error(response.data?.message || "Could not complete fit check.");
      }
    } catch (error) {
      console.error("Error completing fit check:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setCompletingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return null; // Don't show anything if no pending requests
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Your Role Fit Requests
        </CardTitle>
        <CardDescription>
          Recruiters have invited you to explore your alignment with these roles. This is guidance, not judgment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {requests.map((request) => (
          <div
            key={request.id}
            className="p-4 rounded-lg border bg-card flex flex-col sm:flex-row sm:items-center gap-4"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-amber-500" />
                <Badge variant="secondary" className="text-xs">
                  Pending
                </Badge>
              </div>
              <h4 className="font-medium">{request.jobTitle}</h4>
              <p className="text-sm text-muted-foreground">{request.companyName}</p>
              <p className="text-xs text-muted-foreground mt-1">
                The recruiter invited you to complete a Role Fit Check to help understand your alignment with this role's expectations.
              </p>
            </div>
            <Button
              onClick={() => handleCompleteFitCheck(request)}
              disabled={completingId === request.id}
              className="shrink-0"
            >
              {completingId === request.id ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                  Checking...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Fit Check
                </>
              )}
            </Button>
          </div>
        ))}
        
        <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            Fit Checks are directional guidance, not judgment. They help you and recruiters explore alignment—non-linear paths and unique styles are valued.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
