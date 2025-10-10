import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Share2, Copy, ExternalLink, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareJobButtonProps {
  orgSlug: string;
  jobSlug: string;
  jobTitle: string;
}

export function ShareJobButton({ orgSlug, jobSlug, jobTitle }: ShareJobButtonProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  
  const jobUrl = `${window.location.origin}/c/${orgSlug}/jobs/${jobSlug}`;
  const careerPageUrl = `${window.location.origin}/c/${orgSlug}`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Share2 className="h-4 w-4" />
          Share Job
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Share "{jobTitle}"</DialogTitle>
          <DialogDescription>
            Share this job posting with candidates
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Direct Job Link */}
          <div className="space-y-2">
            <Label>Direct Job Link</Label>
            <div className="flex gap-2">
              <Input 
                value={jobUrl} 
                readOnly 
                className="font-mono text-sm"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => copyToClipboard(jobUrl, "Job link")}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => window.open(jobUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Career Page Link */}
          <div className="space-y-2">
            <Label>Career Page (All Jobs)</Label>
            <div className="flex gap-2">
              <Input 
                value={careerPageUrl} 
                readOnly 
                className="font-mono text-sm"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => copyToClipboard(careerPageUrl, "Career page link")}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => window.open(careerPageUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Share Instructions */}
          <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
            <p className="font-semibold">How to share:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Copy the direct job link to share a specific position</li>
              <li>Copy the career page link to show all open positions</li>
              <li>Share on LinkedIn, job boards, or directly with candidates</li>
              <li>No login required - candidates can apply immediately</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
