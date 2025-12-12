import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  CheckSquare,
  ChevronDown,
  ArrowRight,
  Download,
  Mail,
  X,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SelectedCandidate {
  applicationId: string;
  candidateId: string;
  candidateName: string;
  email?: string;
  stage: string;
}

interface BulkActionsToolbarProps {
  selectedCandidates: SelectedCandidate[];
  onClearSelection: () => void;
  onStageChange: (newStage: string) => Promise<void>;
  jobTitle?: string;
}

const STAGES = [
  { key: "new", label: "New" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "interview", label: "Interview" },
  { key: "offer", label: "Offer" },
  { key: "hired", label: "Hired" },
  { key: "rejected", label: "Rejected" },
];

export function BulkActionsToolbar({
  selectedCandidates,
  onClearSelection,
  onStageChange,
  jobTitle,
}: BulkActionsToolbarProps) {
  const { toast } = useToast();
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isChangingStage, setIsChangingStage] = useState(false);

  if (selectedCandidates.length === 0) return null;

  const handleExportCSV = () => {
    const headers = ["Name", "Stage", "Application ID"];
    const rows = selectedCandidates.map((c) => [
      c.candidateName,
      c.stage,
      c.applicationId,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `candidates_export_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();

    toast({
      title: "Export complete",
      description: `Exported ${selectedCandidates.length} candidates to CSV`,
    });
  };

  const handleBulkStageChange = async (newStage: string) => {
    setIsChangingStage(true);
    try {
      await onStageChange(newStage);
      toast({
        title: "Stage updated",
        description: `Moved ${selectedCandidates.length} candidates to ${newStage}`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsChangingStage(false);
    }
  };

  const handleSendBulkEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please fill in subject and body",
      });
      return;
    }

    setIsSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-bulk-email", {
        body: {
          candidates: selectedCandidates.map((c) => ({
            applicationId: c.applicationId,
            candidateName: c.candidateName,
          })),
          subject: emailSubject,
          body: emailBody,
          jobTitle: jobTitle || "Open Position",
        },
      });

      if (error) throw error;

      toast({
        title: "Emails sent",
        description: `Sent ${data.sent || selectedCandidates.length} emails successfully`,
      });
      setIsEmailDialogOpen(false);
      setEmailSubject("");
      setEmailBody("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error sending emails",
        description: error.message,
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg mb-4">
        <Badge variant="secondary" className="gap-1.5">
          <CheckSquare className="w-3.5 h-3.5" />
          {selectedCandidates.length} selected
        </Badge>

        <div className="flex-1 flex items-center gap-2">
          {/* Move to Stage */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={isChangingStage}
              >
                {isChangingStage ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                Move to Stage
                <ChevronDown className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-popover border">
              {STAGES.map((stage) => (
                <DropdownMenuItem
                  key={stage.key}
                  onClick={() => handleBulkStageChange(stage.key)}
                >
                  {stage.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export CSV */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleExportCSV}
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>

          {/* Send Email */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setIsEmailDialogOpen(true)}
          >
            <Mail className="w-4 h-4" />
            Send Email
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="text-muted-foreground"
        >
          <X className="w-4 h-4" />
          Clear
        </Button>
      </div>

      {/* Email Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Bulk Email</DialogTitle>
            <DialogDescription>
              Send an email to {selectedCandidates.length} selected candidate
              {selectedCandidates.length > 1 ? "s" : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="e.g., Update on your application"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                placeholder="Write your message here. Use {{name}} to personalize with candidate name."
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Available variables: {"{{name}}"}, {"{{job_title}}"}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEmailDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendBulkEmail}
              disabled={isSendingEmail}
              className="gap-2"
            >
              {isSendingEmail && <Loader2 className="w-4 h-4 animate-spin" />}
              Send to {selectedCandidates.length} candidate
              {selectedCandidates.length > 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
