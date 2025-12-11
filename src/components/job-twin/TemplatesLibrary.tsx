import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  FileText, Plus, Edit, Trash2, Copy, Loader2, Mail, Linkedin, Star, Sparkles, RefreshCw, UserCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Template {
  id: string;
  name: string;
  template_type: string;
  channel: string;
  subject?: string;
  body: string;
  is_default: boolean;
  created_at: string;
}

interface GeneratedTemplate {
  name: string;
  template_type: string;
  channel: string;
  subject?: string;
  body: string;
}

const TEMPLATE_TYPES = [
  { value: "initial_outreach", label: "Initial Outreach" },
  { value: "follow_up", label: "Follow-up" },
  { value: "thank_you", label: "Thank You" },
  { value: "negotiation", label: "Negotiation" },
];

const CHANNELS = [
  { value: "email", label: "Email", icon: Mail },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin },
];

export function TemplatesLibrary({ onSelectTemplate }: { onSelectTemplate?: (template: Template) => void }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [hasProfile, setHasProfile] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [templateType, setTemplateType] = useState("initial_outreach");
  const [channel, setChannel] = useState("email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    loadTemplates();
    checkProfile();
  }, []);

  const checkProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("job_twin_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      setHasProfile(!!data);
    } catch (error) {
      setHasProfile(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("job_twin_message_templates" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data as unknown as Template[]);
    } catch (error) {
      console.error("Error loading templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateAITemplates = async () => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Please sign in", variant: "destructive" });
        return;
      }

      const response = await supabase.functions.invoke("job-twin-generate-templates", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to generate templates");
      }

      const { templates: generatedTemplates } = response.data as { templates: GeneratedTemplate[] };
      
      if (!generatedTemplates || generatedTemplates.length === 0) {
        toast({ title: "No templates generated", variant: "destructive" });
        return;
      }

      // Save all generated templates
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const templatesWithUser = generatedTemplates.map((t: GeneratedTemplate) => ({
        user_id: user.id,
        name: t.name,
        template_type: t.template_type,
        channel: t.channel,
        subject: t.subject || null,
        body: t.body,
        is_default: false,
      }));

      const { error: insertError } = await supabase
        .from("job_twin_message_templates" as any)
        .insert(templatesWithUser);

      if (insertError) throw insertError;

      toast({ 
        title: "Templates Generated!", 
        description: `${generatedTemplates.length} AI-personalized templates created based on your profile.` 
      });
      loadTemplates();
    } catch (error: any) {
      console.error("Error generating templates:", error);
      toast({ 
        title: "Generation failed", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setGenerating(false);
    }
  };

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setName("");
    setTemplateType("initial_outreach");
    setChannel("email");
    setSubject("");
    setBody("");
    setIsDefault(false);
    setDialogOpen(true);
  };

  const openEditDialog = (template: Template) => {
    setEditingTemplate(template);
    setName(template.name);
    setTemplateType(template.template_type);
    setChannel(template.channel);
    setSubject(template.subject || "");
    setBody(template.body);
    setIsDefault(template.is_default);
    setDialogOpen(true);
  };

  const saveTemplate = async () => {
    if (!name || !body) {
      toast({ title: "Name and body are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const templateData = {
        user_id: user.id,
        name,
        template_type: templateType,
        channel,
        subject: subject || null,
        body,
        is_default: isDefault,
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from("job_twin_message_templates" as any)
          .update(templateData)
          .eq("id", editingTemplate.id);
        if (error) throw error;
        toast({ title: "Template updated" });
      } else {
        const { error } = await supabase
          .from("job_twin_message_templates" as any)
          .insert(templateData);
        if (error) throw error;
        toast({ title: "Template created" });
      }

      setDialogOpen(false);
      loadTemplates();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from("job_twin_message_templates" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Template deleted" });
      loadTemplates();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const deleteAllTemplates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("job_twin_message_templates" as any)
        .delete()
        .eq("user_id", user.id);
      if (error) throw error;
      toast({ title: "All templates deleted" });
      loadTemplates();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const copyToClipboard = (template: Template) => {
    const text = template.subject ? `${template.subject}\n\n${template.body}` : template.body;
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const filteredTemplates = filterType === "all" 
    ? templates 
    : templates.filter(t => t.template_type === filterType);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Generation Card */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="py-6">
          {!hasProfile ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <UserCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold">Set Up Your Profile First</h3>
                  <p className="text-sm text-muted-foreground">
                    Complete your Job Twin profile to generate AI-personalized templates based on your skills and goals
                  </p>
                </div>
              </div>
              <Button onClick={() => navigate("/job-twin/setup")}>
                <UserCircle className="h-4 w-4 mr-2" />
                Set Up Profile
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">AI-Powered Templates</h3>
                  <p className="text-sm text-muted-foreground">
                    Generate personalized templates based on your profile, skills, and career goals
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {templates.length > 0 && (
                  <Button 
                    variant="outline" 
                    onClick={deleteAllTemplates}
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                )}
                <Button onClick={generateAITemplates} disabled={generating}>
                  {generating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : templates.length > 0 ? (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  {generating ? "Generating..." : templates.length > 0 ? "Regenerate" : "Generate Templates"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {TEMPLATE_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary">{filteredTemplates.length} templates</Badge>
        </div>
        <Button variant="outline" onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Custom Template
        </Button>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No templates yet</p>
            <p className="text-sm mt-1">
              Click "Generate Templates" above to create AI-personalized templates based on your profile
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredTemplates.map(template => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {template.name}
                      {template.is_default && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                    </CardTitle>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs capitalize">
                        {template.template_type.replace("_", " ")}
                      </Badge>
                      <Badge variant="secondary" className="text-xs flex items-center gap-1">
                        {template.channel === "email" ? <Mail className="h-3 w-3" /> : <Linkedin className="h-3 w-3" />}
                        {template.channel}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {template.subject && (
                  <p className="text-sm font-medium mb-1 text-muted-foreground">
                    Subject: {template.subject}
                  </p>
                )}
                <p className="text-sm text-muted-foreground line-clamp-3">{template.body}</p>
                <div className="flex gap-2 mt-4">
                  {onSelectTemplate && (
                    <Button size="sm" onClick={() => onSelectTemplate(template)}>
                      Use Template
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(template)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(template)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => deleteTemplate(template.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Create Custom Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Follow-up Template"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={templateType} onValueChange={setTemplateType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Channel</Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map(ch => (
                      <SelectItem key={ch.value} value={ch.value}>{ch.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subject (optional)</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Re: Application for {{job_title}}"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Use {{job_title}}, {{company_name}}, {{recruiter_name}} as placeholders..."
                rows={8}
              />
              <p className="text-xs text-muted-foreground">
                Available placeholders: {"{{job_title}}"}, {"{{company_name}}"}, {"{{recruiter_name}}"}, {"{{your_name}}"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveTemplate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingTemplate ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
