/**
 * Billing Configuration
 * 
 * To enable live billing mode:
 * 1. Add these variables to your .env file:
 *    - VITE_BILLING_ENABLED=true
 *    - VITE_RAZORPAY_MODE=live
 *    - VITE_RAZORPAY_KEY_ID=your_key_here
 * 
 * 2. Or temporarily set FORCE_LIVE_MODE = true below for testing
 */

// TEMPORARY: Set this to true to test billing flow without env vars
const FORCE_LIVE_MODE = true;

export const BILLING_CONFIG = {
  enabled: FORCE_LIVE_MODE || import.meta.env.VITE_BILLING_ENABLED === 'true',
  razorpayMode: import.meta.env.VITE_RAZORPAY_MODE || 'test',
  razorpayKeyId: import.meta.env.VITE_RAZORPAY_KEY_ID || '',
};

// Helper to check if we're in demo mode
export const isDemoMode = () => !BILLING_CONFIG.enabled;

// Helper to check if billing is configured
export const isBillingConfigured = () => {
  return BILLING_CONFIG.enabled && BILLING_CONFIG.razorpayKeyId.length > 0;
};
