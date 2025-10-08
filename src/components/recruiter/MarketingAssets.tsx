import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Megaphone, Loader2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MarketingAssetsProps {
  jobId: string;
}

export const MarketingAssets = ({ jobId }: MarketingAssetsProps) => {
  const [assets, setAssets] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadAssets();
  }, [jobId]);

  const loadAssets = async () => {
    const { data } = await supabase
      .from('marketing_assets')
      .select('*')
      .eq('job_id', jobId)
      .maybeSingle();

    setAssets(data);
  };

  const generateAssets = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('marketing-generator', {
        body: { jobId }
      });

      if (error) {
        if (error.message?.includes('Rate limit')) {
          toast({
            title: "Rate limit reached",
            description: "You can generate marketing assets 3 times per day. Please try again tomorrow.",
            variant: "destructive"
          });
        }
        throw error;
      }

      await loadAssets();

      toast({
        title: "Marketing Assets Generated",
        description: "AI has created LinkedIn posts, emails, and outreach messages.",
      });
    } catch (error: any) {
      console.error('Failed to generate marketing assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
    
    toast({
      title: "Copied!",
      description: "Content copied to clipboard",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            <CardTitle>Marketing Assets</CardTitle>
          </div>
          <Button onClick={generateAssets} disabled={loading} size="sm">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Megaphone className="w-4 h-4 mr-2" />
                {assets ? 'Regenerate' : 'Generate'}
              </>
            )}
          </Button>
        </div>
        <CardDescription>
          AI-generated content for talent marketing
          <span className="block text-xs mt-1 text-muted-foreground">
            Tweak and personalize before posting
          </span>
        </CardDescription>
      </CardHeader>

      {assets && (
        <CardContent>
          <Tabs defaultValue="linkedin" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="message">Message</TabsTrigger>
            </TabsList>

            <TabsContent value="linkedin" className="space-y-3">
              <div className="relative">
                <Textarea
                  value={assets.linkedin_post}
                  readOnly
                  rows={6}
                  className="resize-none"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(assets.linkedin_post, 'linkedin')}
                >
                  {copied === 'linkedin' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Share on your company LinkedIn page or personal profile
              </p>
            </TabsContent>

            <TabsContent value="email" className="space-y-3">
              <div className="relative">
                <Textarea
                  value={assets.outreach_email}
                  readOnly
                  rows={8}
                  className="resize-none"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(assets.outreach_email, 'email')}
                >
                  {copied === 'email' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Use [Name] as a placeholder - personalize for each candidate
              </p>
            </TabsContent>

            <TabsContent value="message" className="space-y-3">
              <div className="relative">
                <Textarea
                  value={assets.candidate_message}
                  readOnly
                  rows={4}
                  className="resize-none"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(assets.candidate_message, 'message')}
                >
                  {copied === 'message' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Quick DM for LinkedIn InMail or direct messages
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
};
