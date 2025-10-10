import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Copy, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  actions?: any[];
  open_links?: any[];
}

interface CopilotPanelProps {
  jobId?: string;
  candidateId?: string;
}

export const CopilotPanel = ({ jobId, candidateId }: CopilotPanelProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { currentOrg } = useCurrentOrg();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !currentOrg) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      console.log('Calling copilot with:', { orgId: currentOrg.id, hasThreadId: !!threadId });
      
      // Get the current session to pass the auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to use the copilot",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('copilot-chat', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: {
          threadId,
          message: userMessage,
          orgId: currentOrg.id,
          jobId,
          candidateId
        }
      });

      console.log('Copilot response:', { data, error });

      if (error) {
        console.error('Copilot error:', error);
        
        if (error.message?.includes('quota_exceeded')) {
          toast({
            title: "Daily limit reached",
            description: "You've used all copilot calls for today. Upgrade for more.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Error",
            description: error.message || "Failed to get response from copilot",
            variant: "destructive"
          });
        }
        throw error;
      }

      setThreadId(data.threadId);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response.answer,
        actions: data.response.actions,
        open_links: data.response.open_links
      }]);

    } catch (err: any) {
      console.error('Copilot error:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to get response from copilot",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <Card className="flex flex-col h-[600px] max-w-2xl mx-auto">
      <div className="p-4 border-b bg-muted/50">
        <h3 className="font-semibold">Hiring Copilot</h3>
        <p className="text-sm text-muted-foreground">Ask me anything about jobs, candidates, or hiring</p>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <p className="mb-2">Hi! I'm your hiring assistant.</p>
              <p className="text-sm">Try asking:</p>
              <ul className="text-sm mt-2 space-y-1">
                <li>"Show me top candidates from this week"</li>
                <li>"Summarize this job"</li>
                <li>"Draft a rejection email"</li>
              </ul>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {msg.actions.map((action, actIdx) => (
                      <div key={actIdx} className="bg-background/50 rounded p-2 text-xs">
                        <div className="font-medium mb-1">{action.action}</div>
                        {action.result?.candidates && (
                          <div className="space-y-1">
                            {action.result.candidates.slice(0, 5).map((c: any) => (
                              <div key={c.id} className="flex justify-between">
                                <span>{c.candidates?.full_name}</span>
                                <span className="text-muted-foreground">Score: {c.overall_score}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {action.result?.summary && (
                          <p className="text-muted-foreground">{action.result.summary}</p>
                        )}
                        {action.result?.body && (
                          <div className="relative">
                            <pre className="text-xs whitespace-pre-wrap mt-1">{action.result.body}</pre>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="absolute top-0 right-0"
                              onClick={() => copyToClipboard(action.result.body, actIdx)}
                            >
                              {copiedIndex === actIdx ? (
                                <CheckCircle className="w-3 h-3" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about jobs, candidates, or hiring..."
            disabled={loading}
          />
          <Button onClick={handleSend} disabled={loading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
