import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

interface CultureDNAChartProps {
  orgId: string;
}

export const CultureDNAChart = ({ orgId }: CultureDNAChartProps) => {
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('culture_profiles')
        .select('*')
        .eq('org_id', orgId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      console.error('Error loading culture profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-culture-profile', {
        body: { org_id: orgId }
      });

      if (error) throw error;

      setProfile(data);
      toast({
        title: "Culture DNA updated",
        description: "Your culture profile has been refreshed.",
      });
    } catch (error: any) {
      console.error('Error refreshing culture profile:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to refresh culture profile",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [orgId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Culture DNA</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Culture DNA</CardTitle>
          <CardDescription>No culture profile yet</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={refreshProfile} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Initialize Profile
          </Button>
        </CardContent>
      </Card>
    );
  }

  const vector = profile.vector as Record<string, number>;
  const chartData = [
    { dimension: 'Communication', value: vector.communication || 0 },
    { dimension: 'Ownership', value: vector.ownership || 0 },
    { dimension: 'Collaboration', value: vector.collaboration || 0 },
    { dimension: 'Stability', value: vector.stability || 0 },
    { dimension: 'Risk Taking', value: vector.risk_taking || 0 },
  ];

  const updatedAt = new Date(profile.updated_at).toLocaleDateString();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <CardTitle>Culture DNA</CardTitle>
            <CardDescription>Last updated: {updatedAt}</CardDescription>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">Your organization's culture profile based on team values and behaviors. Updated from company data and team member signals.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={refreshProfile} 
          disabled={refreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={chartData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="dimension" />
            <PolarRadiusAxis domain={[0, 100]} />
            <Radar
              name="Culture Profile"
              dataKey="value"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.3}
            />
          </RadarChart>
        </ResponsiveContainer>
        {profile.notes && (
          <p className="text-sm text-muted-foreground mt-4">{profile.notes}</p>
        )}
      </CardContent>
    </Card>
  );
};