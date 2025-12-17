import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// Generate a unique session ID per browser session
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

interface TrackActionParams {
  actionName: string;
  actionTarget?: string;
  metadata?: Record<string, any>;
}

export const useAnalytics = () => {
  const location = useLocation();
  const pageEntryTime = useRef<number>(Date.now());
  const previousPath = useRef<string | null>(null);
  const sessionId = useRef<string>(getSessionId());
  const isFirstPage = useRef<boolean>(true);

  // Track page view
  const trackPageView = useCallback(async (path: string, title?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Record time on previous page
      const timeOnPreviousPage = previousPath.current 
        ? Date.now() - pageEntryTime.current 
        : null;

      // If there was a previous page, record page exit with time spent
      if (previousPath.current && timeOnPreviousPage) {
        await supabase.from('analytics_events').insert({
          user_id: user?.id || null,
          session_id: sessionId.current,
          event_type: 'page_exit',
          page_path: previousPath.current,
          time_on_page_ms: timeOnPreviousPage,
          user_agent: navigator.userAgent,
        });
      }

      // Record new page view
      await supabase.from('analytics_events').insert({
        user_id: user?.id || null,
        session_id: sessionId.current,
        event_type: 'page_view',
        page_path: path,
        page_title: title || document.title,
        referrer_path: previousPath.current,
        user_agent: navigator.userAgent,
      });

      // Update session
      if (isFirstPage.current) {
        await supabase.from('analytics_sessions').upsert({
          id: sessionId.current,
          user_id: user?.id || null,
          entry_page: path,
          total_pages_viewed: 1,
          user_agent: navigator.userAgent,
        }, { onConflict: 'id' });
        isFirstPage.current = false;
      } else {
        await supabase.from('analytics_sessions').update({
          last_activity_at: new Date().toISOString(),
          exit_page: path,
          total_pages_viewed: await getPageCount(),
        }).eq('id', sessionId.current);
      }

      // Reset for next page
      pageEntryTime.current = Date.now();
      previousPath.current = path;
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }, []);

  // Get page count for session
  const getPageCount = async () => {
    const { count } = await supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId.current)
      .eq('event_type', 'page_view');
    return count || 0;
  };

  // Track custom action
  const trackAction = useCallback(async ({ actionName, actionTarget, metadata }: TrackActionParams) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('analytics_events').insert({
        user_id: user?.id || null,
        session_id: sessionId.current,
        event_type: 'action',
        page_path: location.pathname,
        action_name: actionName,
        action_target: actionTarget,
        metadata: metadata || {},
        user_agent: navigator.userAgent,
      });

      // Update session action count
      await supabase.from('analytics_sessions').update({
        last_activity_at: new Date().toISOString(),
        total_actions: await getActionCount(),
      }).eq('id', sessionId.current);
    } catch (error) {
      console.error('Analytics action tracking error:', error);
    }
  }, [location.pathname]);

  // Get action count for session
  const getActionCount = async () => {
    const { count } = await supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId.current)
      .eq('event_type', 'action');
    return count || 0;
  };

  // Auto-track page views on route change
  useEffect(() => {
    trackPageView(location.pathname, document.title);
  }, [location.pathname, trackPageView]);

  // Track page exit on tab close/navigate away
  useEffect(() => {
    const handleBeforeUnload = async () => {
      const timeOnPage = Date.now() - pageEntryTime.current;
      
      // Use sendBeacon for reliable tracking on page unload
      const payload = JSON.stringify({
        user_id: null, // Will be set on server
        session_id: sessionId.current,
        event_type: 'page_exit',
        page_path: location.pathname,
        time_on_page_ms: timeOnPage,
        user_agent: navigator.userAgent,
      });

      navigator.sendBeacon(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/analytics_events`,
        payload
      );
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [location.pathname]);

  return { trackAction };
};

// Export a simple function for components that just need to track actions
export const trackAnalyticsAction = async (
  actionName: string, 
  actionTarget?: string, 
  metadata?: Record<string, any>
) => {
  try {
    const sessionId = getSessionId();
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('analytics_events').insert({
      user_id: user?.id || null,
      session_id: sessionId,
      event_type: 'action',
      page_path: window.location.pathname,
      action_name: actionName,
      action_target: actionTarget,
      metadata: metadata || {},
      user_agent: navigator.userAgent,
    });
  } catch (error) {
    console.error('Analytics action tracking error:', error);
  }
};
