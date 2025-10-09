import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "lucide-react";

interface CreateAssessmentFromBankProps {
  onSuccess: () => void;
}

export const CreateAssessmentFromBank = ({ onSuccess }: CreateAssessmentFromBankProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          Create from Question Bank
        </CardTitle>
        <CardDescription>
          Select questions from your organization's question bank to create a custom assessment
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          Question bank builder coming soon
        </div>
      </CardContent>
    </Card>
  );
};
