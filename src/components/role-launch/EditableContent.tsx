import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Edit2, Check, X, Copy, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EditableContentProps {
  content: string;
  subject?: string | null;
  label: string;
  onSave: (content: string, subject?: string) => void;
}

export function EditableContent({ content, subject, label, onSave }: EditableContentProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [editedSubject, setEditedSubject] = useState(subject || "");

  const handleSave = () => {
    onSave(editedContent, editedSubject || undefined);
    setIsEditing(false);
    toast({
      title: "Content updated",
      description: `${label} has been saved with your changes.`
    });
  };

  const handleCancel = () => {
    setEditedContent(content);
    setEditedSubject(subject || "");
    setIsEditing(false);
  };

  const copyToClipboard = () => {
    const textToCopy = subject ? `Subject: ${subject}\n\n${content}` : content;
    navigator.clipboard.writeText(textToCopy);
    toast({ title: `${label} copied to clipboard` });
  };

  if (isEditing) {
    return (
      <div className="space-y-3">
        {subject !== undefined && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Subject</label>
            <Input
              value={editedSubject}
              onChange={(e) => setEditedSubject(e.target.value)}
              placeholder="Email subject..."
            />
          </div>
        )}
        <Textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          rows={10}
          className="font-mono text-sm"
        />
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleSave}>
            <Check className="h-3 w-3 mr-1" />
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCancel}>
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {subject && (
        <p className="text-sm font-medium text-muted-foreground">
          Subject: {subject}
        </p>
      )}
      <div className="p-3 bg-muted/50 rounded-lg max-h-48 overflow-y-auto">
        <pre className="text-sm whitespace-pre-wrap font-sans">{content}</pre>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
          <Edit2 className="h-3 w-3 mr-1" />
          Edit
        </Button>
        <Button variant="outline" size="sm" onClick={copyToClipboard}>
          <Copy className="h-3 w-3 mr-1" />
          Copy
        </Button>
      </div>
    </div>
  );
}
