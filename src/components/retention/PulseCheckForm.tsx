import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface PulseCheckFormProps {
  hireId: string;
  day: number;
  isManager?: boolean;
  onSubmit?: () => void;
}

export const PulseCheckForm = ({ hireId, day, isManager = false, onSubmit }: PulseCheckFormProps) => {
  const { toast } = useToast();
  const [workload, setWorkload] = useState([3]);
  const [clarity, setClarity] = useState([3]);
  const [teamSupport, setTeamSupport] = useState([3]);
  const [sleep, setSleep] = useState([3]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const report = {
        workload: workload[0],
        clarity: clarity[0],
        team_support: teamSupport[0],
        sleep: sleep[0],
      };

      // Check if pulse check for this day exists
      const { data: existing } = await supabase
        .from('pulse_checks')
        .select('*')
        .eq('hire_id', hireId)
        .eq('day', day)
        .maybeSingle();

      if (existing) {
        // Update existing
        const updateData = isManager 
          ? { manager_report: report }
          : { self_report: report };

        const { error } = await supabase
          .from('pulse_checks')
          .update(updateData)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new
        const insertData = isManager
          ? { hire_id: hireId, day, manager_report: report, self_report: null }
          : { hire_id: hireId, day, self_report: report, manager_report: null };

        const { error } = await supabase
          .from('pulse_checks')
          .insert(insertData);

        if (error) throw error;
      }

      toast({
        title: "Pulse check submitted",
        description: "Thank you for your feedback.",
      });

      onSubmit?.();
    } catch (error: any) {
      console.error('Error submitting pulse check:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pulse Check - Day {day}</CardTitle>
        <CardDescription>
          {isManager ? 'Manager' : 'Employee'} Weekly Check-in
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Workload (1-5)</Label>
            <span className="text-sm font-medium">{workload[0]}</span>
          </div>
          <Slider
            value={workload}
            onValueChange={setWorkload}
            min={1}
            max={5}
            step={1}
          />
          <p className="text-xs text-muted-foreground">
            1 = Very light, 5 = Overwhelming
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Role Clarity (1-5)</Label>
            <span className="text-sm font-medium">{clarity[0]}</span>
          </div>
          <Slider
            value={clarity}
            onValueChange={setClarity}
            min={1}
            max={5}
            step={1}
          />
          <p className="text-xs text-muted-foreground">
            1 = Very unclear, 5 = Crystal clear
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Team Support (1-5)</Label>
            <span className="text-sm font-medium">{teamSupport[0]}</span>
          </div>
          <Slider
            value={teamSupport}
            onValueChange={setTeamSupport}
            min={1}
            max={5}
            step={1}
          />
          <p className="text-xs text-muted-foreground">
            1 = No support, 5 = Excellent support
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Sleep Quality (1-5)</Label>
            <span className="text-sm font-medium">{sleep[0]}</span>
          </div>
          <Slider
            value={sleep}
            onValueChange={setSleep}
            min={1}
            max={5}
            step={1}
          />
          <p className="text-xs text-muted-foreground">
            1 = Very poor, 5 = Excellent
          </p>
        </div>

        <Button onClick={handleSubmit} disabled={submitting} className="w-full">
          {submitting ? 'Submitting...' : 'Submit Pulse Check'}
        </Button>
      </CardContent>
    </Card>
  );
};