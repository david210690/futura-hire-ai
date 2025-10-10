import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Crown, Calendar, CreditCard, FileText } from "lucide-react";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { getTrialStatus, type TrialStatus } from "@/lib/trial";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export default function BillingSettings() {
  const navigate = useNavigate();
  const { currentOrg } = useCurrentOrg();
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBillingData = async () => {
      if (!currentOrg) return;

      try {
        const status = await getTrialStatus(currentOrg.id);
        setTrialStatus(status);

        // Fetch subscription details
        const { data } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('org_id', currentOrg.id)
          .single();

        setSubscription(data);
      } catch (error) {
        console.error('Error loading billing data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBillingData();
  }, [currentOrg]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getPlanBadge = () => {
    if (trialStatus?.state === 'trial') {
      return <Badge variant="outline" className="border-primary text-primary">Trial</Badge>;
    }
    if (trialStatus?.state === 'paid') {
      return <Badge className="bg-primary">{trialStatus.plan?.toUpperCase()}</Badge>;
    }
    return <Badge variant="secondary">Free</Badge>;
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your plan and billing information</p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                Current Plan
              </CardTitle>
              <CardDescription>Your active subscription details</CardDescription>
            </div>
            {getPlanBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {trialStatus?.state === 'trial' && (
            <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Trial ends in {trialStatus.daysLeft} days</p>
                  <p className="text-sm text-muted-foreground">
                    {trialStatus.endsAt && format(new Date(trialStatus.endsAt), 'PPP')}
                  </p>
                </div>
              </div>
              <Button onClick={() => navigate('/pricing')}>
                Upgrade Now
              </Button>
            </div>
          )}

          {trialStatus?.state === 'paid' && subscription && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">{subscription.plan}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                  {subscription.status}
                </Badge>
              </div>
              {subscription.current_period_end && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Renewal Date</span>
                  <span className="font-medium">
                    {format(new Date(subscription.current_period_end), 'PPP')}
                  </span>
                </div>
              )}
            </div>
          )}

          {trialStatus?.state === 'free' && (
            <div className="text-center py-6 space-y-3">
              <p className="text-muted-foreground">You're currently on the Free plan</p>
              <Button onClick={() => navigate('/pricing')}>
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Pro or Team
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage & Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Usage & Limits
          </CardTitle>
          <CardDescription>Track your daily usage across features</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Usage counters are displayed throughout the app near AI-powered features.
          </p>
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoices
          </CardTitle>
          <CardDescription>Download your billing history</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No invoices yet. Invoices will appear here after your first payment.
          </p>
        </CardContent>
      </Card>

      {/* Need GST Invoice */}
      <Card className="border-dashed">
        <CardContent className="pt-6 text-center space-y-2">
          <p className="text-sm font-medium">Need an invoice with GST?</p>
          <Button variant="outline" asChild>
            <a href="mailto:billing@futurahire.com">Contact Support</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
