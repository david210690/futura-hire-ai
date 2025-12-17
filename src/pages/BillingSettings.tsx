import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Crown, Calendar, CreditCard, FileText, Check, AlertTriangle, Sparkles, ArrowLeft } from "lucide-react";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { getOrgPilotStatus, convertToPaidSubscription, type OrgPilotStatus } from "@/lib/pilot";
import { BILLING_CONFIG, isBillingConfigured } from "@/lib/billing-config";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    Razorpay: any;
  }
}

// Growth plan Razorpay plan ID
const RAZORPAY_GROWTH_PLAN_ID = "plan_RseqcRypIbyLm9";

export default function BillingSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentOrg, loading: orgLoading } = useCurrentOrg();
  const [pilotStatus, setPilotStatus] = useState<OrgPilotStatus | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      if (orgLoading || !currentOrg) {
        setLoading(false);
        return;
      }

      await loadBillingData();
    };

    checkAuthAndLoadData();
  }, [currentOrg, orgLoading, navigate]);

  const loadBillingData = async () => {
    if (!currentOrg) return;

    try {
      // Get pilot status
      const status = await getOrgPilotStatus(currentOrg.id);
      setPilotStatus(status);

      // Fetch subscription details
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('org_id', currentOrg.id)
        .maybeSingle();

      setSubscription(data);
    } catch (error) {
      console.error('Error loading billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpayScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay'));
      document.body.appendChild(script);
    });
  };

  const handleSubscribe = async () => {
    if (!currentOrg) return;
    
    setProcessingPayment(true);

    try {
      // Check if billing is configured
      if (!isBillingConfigured()) {
        throw new Error('Razorpay is not configured');
      }

      // Create subscription via edge function
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: { 
          org_id: currentOrg.id, 
          plan: 'growth',
          plan_id: RAZORPAY_GROWTH_PLAN_ID
        }
      });

      if (error) throw error;

      const { subscription_id, amount, currency, customer_id } = data;

      // Load Razorpay script
      await loadRazorpayScript();

      // Open Razorpay checkout
      const rzp = new window.Razorpay({
        key: BILLING_CONFIG.razorpayKeyId,
        subscription_id,
        amount,
        currency,
        name: 'FuturaHire',
        description: 'Growth Plan Annual Subscription',
        handler: async function (response: any) {
          // Payment successful
          try {
            await convertToPaidSubscription(
              currentOrg.id,
              response.razorpay_subscription_id || subscription_id,
              customer_id
            );
            
            toast({
              title: "Subscription Active!",
              description: "Thank you — your access is uninterrupted.",
            });
            
            // Reload data
            await loadBillingData();
            navigate('/recruiter/dashboard');
          } catch (err) {
            console.error('Error completing subscription:', err);
            toast({
              title: "Subscription Activated",
              description: "Your payment was successful. Please refresh the page.",
            });
          }
        },
        modal: {
          ondismiss: function() {
            setProcessingPayment(false);
          }
        },
        prefill: {
          email: currentOrg.name ? `${currentOrg.name.toLowerCase().replace(/\s+/g, '')}@company.com` : '',
        },
        theme: {
          color: '#3b82f6'
        }
      });

      rzp.open();
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getPlanBadge = () => {
    if (pilotStatus?.planStatus === 'pilot') {
      return <Badge variant="outline" className="border-primary text-primary">Pilot</Badge>;
    }
    if (pilotStatus?.planStatus === 'active') {
      return <Badge className="bg-green-500">Active</Badge>;
    }
    if (pilotStatus?.planStatus === 'locked') {
      return <Badge variant="destructive">Locked</Badge>;
    }
    return <Badge variant="secondary">Free</Badge>;
  };

  // Show lock screen when pilot expired
  if (pilotStatus?.planStatus === 'locked') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full border-destructive/50">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl text-destructive">Pilot Ended</CardTitle>
            <CardDescription className="text-base">
              Your pilot access ended on 31 March 2026.
              <br />
              To continue using FuturaHire, please convert to a paid plan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Growth Plan Summary */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Growth Plan</span>
                <span className="text-xl font-bold">₹30,000<span className="text-sm font-normal text-muted-foreground">/year</span></span>
              </div>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-green-500" />
                  Up to 25 successful hires/year
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-green-500" />
                  Role DNA, Interview Kits, Decision Room
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-green-500" />
                  Hiring Plan Autopilot + Priority Support
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleSubscribe} 
                disabled={processingPayment}
                className="w-full"
                size="lg"
              >
                {processingPayment ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Crown className="mr-2 h-4 w-4" />
                    Subscribe to Growth (₹30,000/year)
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline"
                className="w-full"
                onClick={() => window.location.href = 'mailto:hello@futurahire.app?subject=Pilot Reactivation Request'}
              >
                Contact Sales to Reactivate
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Additional hires beyond 25 are billed at ₹1,500 per hire.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-6">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/recruiter/dashboard')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Billing & Subscription</h1>
          <p className="text-muted-foreground">Manage your plan and billing information</p>
        </div>
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
          {pilotStatus?.planStatus === 'pilot' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Growth Pilot Active</p>
                    <p className="text-sm text-muted-foreground">
                      {pilotStatus.daysRemaining} days remaining
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Ends on</div>
                  <div className="font-medium">31 Mar 2026</div>
                </div>
              </div>
              
              {/* Growth Plan Features */}
              <div className="grid md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <h4 className="font-medium mb-2">Included in Growth Plan</h4>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      Up to 25 successful hires/year
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      Role DNA generation
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      Interview Kits
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      Question Bank Admin
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">&nbsp;</h4>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      Decision Room
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      Hiring Plan Autopilot
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      Priority support
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Convert now to ensure uninterrupted access after pilot ends
                  </p>
                </div>
                <Button onClick={handleSubscribe} disabled={processingPayment}>
                  {processingPayment ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Crown className="mr-2 h-4 w-4" />
                      Pay & Activate (₹30,000/year)
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {pilotStatus?.planStatus === 'active' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">Growth Plan — Active</p>
                    <p className="text-sm text-muted-foreground">
                      {pilotStatus.convertedAt && `Subscribed on ${format(new Date(pilotStatus.convertedAt), 'PPP')}`}
                    </p>
                  </div>
                </div>
              </div>
              
              {subscription?.current_period_end && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Renewal Date</span>
                  <span className="font-medium">
                    {format(new Date(subscription.current_period_end), 'PPP')}
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pricing
          </CardTitle>
          <CardDescription>How billing works</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Growth Plan:</strong> ₹30,000/year for up to 25 successful hires
          </p>
          <p>
            Additional hires beyond your plan limit are billed at ₹1,500 per successful hire.
          </p>
          <p>
            Interviews, rejected candidates, and candidate preparation are never billed.
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

      {/* GST Invoice */}
      <Card className="border-dashed">
        <CardContent className="pt-6 text-center space-y-2">
          <p className="text-sm font-medium">Need an invoice with GST?</p>
          <Button variant="outline" asChild>
            <a href="mailto:support@futurahire.app">Contact Support</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
