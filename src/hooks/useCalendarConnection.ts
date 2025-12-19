import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CalendarConnection {
  id: string;
  provider: string;
  calendar_email: string | null;
  is_active: boolean;
  created_at: string;
}

interface CreateCalendarEvent {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees?: string[];
  eventType?: string;
  referenceType?: string;
  referenceId?: string;
  timeZone?: string;
}

export function useCalendarConnection() {
  const [connection, setConnection] = useState<CalendarConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const fetchConnection = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setConnection(null);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('calendar_connections')
        .select('id, provider, calendar_email, is_active, created_at')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching calendar connection:', error);
      }
      
      setConnection(data);
    } catch (error) {
      console.error('Error fetching calendar connection:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  const connectCalendar = async () => {
    setIsConnecting(true);
    try {
      const redirectUri = `${window.location.origin}/settings`;
      
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { redirectUri },
      });

      if (error) throw error;

      if (data?.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error('No auth URL returned');
      }
    } catch (error) {
      console.error('Error initiating calendar connection:', error);
      toast({
        title: 'Connection Failed',
        description: 'Could not initiate Google Calendar connection',
        variant: 'destructive',
      });
      setIsConnecting(false);
    }
  };

  const disconnectCalendar = async () => {
    if (!connection) return;

    try {
      const { error } = await supabase
        .from('calendar_connections')
        .update({ is_active: false })
        .eq('id', connection.id);

      if (error) throw error;

      setConnection(null);
      toast({
        title: 'Calendar Disconnected',
        description: 'Your Google Calendar has been disconnected',
      });
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      toast({
        title: 'Error',
        description: 'Could not disconnect calendar',
        variant: 'destructive',
      });
    }
  };

  const createEvent = async (eventData: CreateCalendarEvent) => {
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: {
          action: 'create',
          eventData,
        },
      });

      if (error) throw error;

      if (data?.needsAuth || data?.needsReauth) {
        toast({
          title: 'Calendar Not Connected',
          description: 'Please connect your Google Calendar first',
          variant: 'destructive',
        });
        return null;
      }

      return data?.event;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      toast({
        title: 'Error',
        description: 'Could not create calendar event',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateEvent = async (externalEventId: string, eventData: Partial<CreateCalendarEvent>) => {
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: {
          action: 'update',
          eventData: { ...eventData, externalEventId },
        },
      });

      if (error) throw error;
      return data?.event;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      toast({
        title: 'Error',
        description: 'Could not update calendar event',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteEvent = async (externalEventId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: {
          action: 'delete',
          eventData: { externalEventId },
        },
      });

      if (error) throw error;
      return data?.success;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      toast({
        title: 'Error',
        description: 'Could not delete calendar event',
        variant: 'destructive',
      });
      return false;
    }
  };

  const listEvents = async (timeMin?: string, timeMax?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: {
          action: 'list',
          eventData: { timeMin, timeMax },
        },
      });

      if (error) throw error;
      return data?.events || [];
    } catch (error) {
      console.error('Error listing calendar events:', error);
      return [];
    }
  };

  return {
    connection,
    isLoading,
    isConnecting,
    isConnected: !!connection,
    connectCalendar,
    disconnectCalendar,
    createEvent,
    updateEvent,
    deleteEvent,
    listEvents,
    refetch: fetchConnection,
  };
}
