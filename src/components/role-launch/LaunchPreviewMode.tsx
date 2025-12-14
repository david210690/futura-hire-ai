import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Eye, 
  Linkedin, 
  Building, 
  Mail, 
  ExternalLink,
  Smartphone,
  Monitor,
  Tablet
} from "lucide-react";

interface JobDescription {
  platform: string;
  title: string;
  content: string;
  key_highlights: string[];
}

interface LaunchPreviewModeProps {
  jobDescription: JobDescription;
}

type DeviceType = "desktop" | "tablet" | "mobile";

export function LaunchPreviewMode({ jobDescription }: LaunchPreviewModeProps) {
  const [device, setDevice] = useState<DeviceType>("desktop");
  const [isOpen, setIsOpen] = useState(false);

  const getDeviceWidth = () => {
    switch (device) {
      case "mobile": return "max-w-[375px]";
      case "tablet": return "max-w-[768px]";
      default: return "max-w-full";
    }
  };

  const getPlatformStyles = () => {
    switch (jobDescription.platform) {
      case "linkedin":
        return "bg-[#f3f6f8] dark:bg-slate-900 font-sans";
      case "career_site":
        return "bg-white dark:bg-slate-950";
      default:
        return "bg-gray-50 dark:bg-slate-900";
    }
  };

  const getPlatformIcon = () => {
    switch (jobDescription.platform) {
      case "linkedin":
        return <Linkedin className="h-4 w-4 text-[#0077B5]" />;
      case "career_site":
        return <Building className="h-4 w-4" />;
      default:
        return <ExternalLink className="h-4 w-4" />;
    }
  };

  if (!isOpen) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setIsOpen(true)}>
        <Eye className="h-3 w-3 mr-1" />
        Preview
      </Button>
    );
  }

  return (
    <Card className="mt-4 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            {getPlatformIcon()}
            Preview: {jobDescription.platform.replace('_', ' ')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant={device === "desktop" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-none h-7 px-2"
                onClick={() => setDevice("desktop")}
              >
                <Monitor className="h-3 w-3" />
              </Button>
              <Button
                variant={device === "tablet" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-none h-7 px-2"
                onClick={() => setDevice("tablet")}
              >
                <Tablet className="h-3 w-3" />
              </Button>
              <Button
                variant={device === "mobile" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-none h-7 px-2"
                onClick={() => setDevice("mobile")}
              >
                <Smartphone className="h-3 w-3" />
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className={`mx-auto transition-all ${getDeviceWidth()}`}>
          <div className={`rounded-lg border p-4 ${getPlatformStyles()}`}>
            {jobDescription.platform === "linkedin" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-3 border-b">
                  <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center">
                    <Building className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{jobDescription.title}</h3>
                    <p className="text-xs text-muted-foreground">Company Name • Location</p>
                  </div>
                </div>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="whitespace-pre-wrap text-sm">{jobDescription.content}</div>
                </div>
                <div className="flex gap-2 pt-3 border-t">
                  <Button size="sm" className="bg-[#0077B5] hover:bg-[#006097]">
                    Easy Apply
                  </Button>
                  <Button size="sm" variant="outline">Save</Button>
                </div>
              </div>
            )}
            
            {jobDescription.platform === "career_site" && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold">{jobDescription.title}</h2>
                <div className="flex flex-wrap gap-2">
                  {jobDescription.key_highlights?.map((h, i) => (
                    <Badge key={i} variant="secondary">{h}</Badge>
                  ))}
                </div>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="whitespace-pre-wrap text-sm">{jobDescription.content}</div>
                </div>
                <Button className="w-full">Apply Now</Button>
              </div>
            )}
            
            {jobDescription.platform === "social" && (
              <div className="space-y-3">
                <p className="text-sm whitespace-pre-wrap">{jobDescription.content}</p>
                <div className="flex flex-wrap gap-1">
                  {jobDescription.key_highlights?.slice(0, 3).map((h, i) => (
                    <span key={i} className="text-primary text-sm">#{h.replace(/\s+/g, '')}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
