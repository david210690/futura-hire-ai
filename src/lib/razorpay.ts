import { supabase } from "@/integrations/supabase/client";
import { BILLING_CONFIG, isBillingConfigured } from "./billing-config";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface CheckoutOptions {
  orgId: string;
  plan: 'pro' | 'team';  // Enterprise handled via contact sales
  onSuccess?: () => void;
  onFailure?: (error: any) => void;
}

export interface CandidateOrderOptions {
  candidateId: string;
  product: string;
  amount: number;
  onSuccess?: () => void;
  onFailure?: (error: any) => void;
}

/**
 * Create a Razorpay subscription checkout session for an organization
 */
export async function createCheckoutSession(options: CheckoutOptions) {
  const { orgId, plan, onSuccess, onFailure } = options;

  try {
    // Check if billing is properly configured
    if (!isBillingConfigured()) {
      throw new Error('Razorpay is not configured. Please add VITE_RAZORPAY_KEY_ID to your environment variables.');
    }

    // Call edge function to create Razorpay subscription
    const { data, error } = await supabase.functions.invoke('create-subscription', {
      body: { org_id: orgId, plan }
    });

    if (error) throw error;

    const { subscription_id, amount, currency } = data;

    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      const rzp = new window.Razorpay({
        key: BILLING_CONFIG.razorpayKeyId,
        subscription_id,
        amount,
        currency,
        name: 'FuturaHire',
        description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan Subscription`,
        handler: function (response: any) {
          console.log('Payment successful:', response);
          onSuccess?.();
        },
        modal: {
          ondismiss: function() {
            onFailure?.(new Error('Payment cancelled by user'));
          }
        },
        theme: {
          color: '#3b82f6'
        }
      });

      rzp.open();
    };

    script.onerror = () => {
      throw new Error('Failed to load Razorpay');
    };

  } catch (error) {
    console.error('Checkout error:', error);
    onFailure?.(error);
    throw error;
  }
}

/**
 * Create a one-time Razorpay order for candidate purchases
 */
export async function createCandidateOrder(options: CandidateOrderOptions) {
  const { candidateId, product, amount, onSuccess, onFailure } = options;

  try {
    // Call edge function to create Razorpay order
    const { data, error } = await supabase.functions.invoke('create-order', {
      body: { candidate_id: candidateId, product, amount }
    });

    if (error) throw error;

    const { order_id, currency } = data;

    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      const rzp = new window.Razorpay({
        key: BILLING_CONFIG.razorpayKeyId,
        amount: amount * 100, // Razorpay expects paise
        currency,
        order_id,
        name: 'FuturaHire',
        description: product,
        handler: function (response: any) {
          console.log('Payment successful:', response);
          onSuccess?.();
        },
        modal: {
          ondismiss: function() {
            onFailure?.(new Error('Payment cancelled by user'));
          }
        },
        theme: {
          color: '#3b82f6'
        }
      });

      rzp.open();
    };

    script.onerror = () => {
      throw new Error('Failed to load Razorpay');
    };

  } catch (error) {
    console.error('Order creation error:', error);
    onFailure?.(error);
    throw error;
  }
}
