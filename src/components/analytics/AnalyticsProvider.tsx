import { useAnalytics } from '@/hooks/useAnalytics';

// This component just needs to be mounted to enable analytics tracking
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useAnalytics(); // This hooks into route changes automatically
  return <>{children}</>;
}
