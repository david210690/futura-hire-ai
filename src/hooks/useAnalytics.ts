import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

let cachedUserId: string | null | undefined;
let userIdPromise: Promise<string | null> | null = null;

const resolveUserId = async () => {
  if (cachedUserId !== undefined) return cachedUserId;
  if (!userIdPromise) {
    userIdPromise = supabase.auth.getSession().then(({ data }) => {
      cachedUserId = data.session?.user.id ?? null;
      return cachedUserId;
    });
  }
  return userIdPromise;
};

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
  const pageCount = useRef(0);
  const actionCount = useRef(0);

  // Track page view
  const trackPageView = useCallback(async (path: string, title?: string) => {
    try {
      // Record time on previous page
      const timeOnPreviousPage = previousPath.current 
        ? Date.now() - pageEntryTime.current 
        : null;

      const userId = await resolveUserId();
      const events = [];
      if (previousPath.current && timeOnPreviousPage) {
        events.push({
          user_id: userId,
          session_id: sessionId.current,
          event_type: 'page_exit',
          page_path: previousPath.current,
          time_on_page_ms: timeOnPreviousPage,
          user_agent: navigator.userAgent,
        });
      }

      events.push({
        user_id: userId,
        session_id: sessionId.current,
        event_type: 'page_view',
        page_path: path,
        page_title: title || document.title,
        referrer_path: previousPath.current,
        user_agent: navigator.userAgent,
      });

      pageCount.current += 1;
      const sessionWrite = isFirstPage.current
        ? supabase.from('analytics_sessions').upsert({
            id: sessionId.current,
            user_id: userId,
            entry_page: path,
            total_pages_viewed: pageCount.current,
            total_actions: actionCount.current,
            user_agent: navigator.userAgent,
          }, { onConflict: 'id' })
        : supabase.from('analytics_sessions').update({
            last_activity_at: new Date().toISOString(),
            exit_page: path,
            total_pages_viewed: pageCount.current,
            total_actions: actionCount.current,
          }).eq('id', sessionId.current);

      isFirstPage.current = false;
      void Promise.all([
        supabase.from('analytics_events').insert(events),
        sessionWrite,
      ]);

      // Reset for next page
      pageEntryTime.current = Date.now();
      previousPath.current = path;
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }, []);

  // Track custom action
  const trackAction = useCallback(async ({ actionName, actionTarget, metadata }: TrackActionParams) => {
    try {
      actionCount.current += 1;
      const userId = await resolveUserId();
      void supabase.from('analytics_events').insert({
        user_id: userId,
        session_id: sessionId.current,
        event_type: 'action',
        page_path: location.pathname,
        action_name: actionName,
        action_target: actionTarget,
        metadata: metadata || {},
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      console.error('Analytics action tracking error:', error);
    }
  }, [location.pathname]);

  // Auto-track page views on route change
  useEffect(() => {
    trackPageView(location.pathname, document.title);
  }, [location.pathname, trackPageView]);

  // Keep auth changes in sync without looking up the user for every event.
  useEffect(() => {
    void resolveUserId();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      cachedUserId = session?.user.id ?? null;
      userIdPromise = null;
    });
    return () => subscription.unsubscribe();
  }, []);

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
    const userId = await resolveUserId();
    
    void supabase.from('analytics_events').insert({
      user_id: userId,
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
