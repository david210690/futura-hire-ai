import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, Clock, Crown, Lock, Sparkles } from "lucide-react";
import { getOrgPilotStatus, checkAndLockExpiredPilot, type OrgPilotStatus } from "@/lib/pilot";

interface PilotBannerProps {
  orgId: string;
  onLocked?: () => void;
}

export function PilotBanner({ orgId, onLocked }: PilotBannerProps) {
  const [status, setStatus] = useState<OrgPilotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadStatus = async () => {
      setLoading(true);
      
      // Check and lock if expired
      const isLocked = await checkAndLockExpiredPilot(orgId);
      if (isLocked && onLocked) {
        onLocked();
      }
      
      const pilotStatus = await getOrgPilotStatus(orgId);
      setStatus(pilotStatus);
      setLoading(false);
    };

    loadStatus();
  }, [orgId, onLocked]);

  if (loading || !status) return null;

  // Don't show banner for active paid subscribers
  if (status.planStatus === 'active') return null;

  // Locked state - full blocking banner
  if (status.planStatus === 'locked') {
    return (
      <div className="bg-destructive/10 border-b border-destructive/30">
        <div className="container mx-auto px-4 py-6">
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-destructive/20">
                    <Lock className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-destructive">
                      Pilot Ended
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Your pilot access ended on 31 Mar 2026. To continue using FuturaHire, please convert to a paid plan.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    onClick={() => navigate('/billing')}
                    className="whitespace-nowrap"
                    size="lg"
                  >
                    <Crown className="mr-2 h-4 w-4" />
                    Subscribe to Growth (₹30,000/year)
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => window.location.href = 'mailto:hello@futurahire.app?subject=Pilot Reactivation'}
                    className="whitespace-nowrap"
                  >
                    Contact Sales to Reactivate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Pilot state - countdown banner
  if (status.planStatus === 'pilot') {
    const isUrgent = status.daysRemaining <= 7;
    
    return (
      <div className={`border-b ${isUrgent ? 'bg-amber-500/10 border-amber-500/30' : 'bg-primary/5 border-primary/20'}`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-full ${isUrgent ? 'bg-amber-500/20' : 'bg-primary/10'}`}>
                {isUrgent ? (
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                ) : (
                  <Sparkles className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground">
                    🟣 Pilot Mode Active
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    Growth Plan
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  You are on the Growth Plan (Pilot Access). Pilot ends on 31 Mar 2026.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Countdown */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background border">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">⏳ {status.daysRemaining} days remaining</span>
              </div>
              
              <Button 
                onClick={() => navigate('/billing')}
                variant={isUrgent ? "default" : "outline"}
                className="whitespace-nowrap"
                disabled
              >
                <Crown className="mr-2 h-4 w-4" />
                Convert to Full Plan
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
