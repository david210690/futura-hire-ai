import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

async function refreshAccessToken(connection: any, supabase: any): Promise<string | null> {
  if (!connection.refresh_token) {
    console.error('No refresh token available');
    return null;
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        refresh_token: connection.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    const tokens = await response.json();

    if (!response.ok || !tokens.access_token) {
      console.error('Token refresh failed:', tokens);
      return null;
    }

    // Update stored tokens
    await supabase
      .from('calendar_connections')
      .update({
        access_token: tokens.access_token,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      })
      .eq('id', connection.id);

    return tokens.access_token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

async function getValidAccessToken(connection: any, supabase: any): Promise<string | null> {
  const expiresAt = new Date(connection.token_expires_at);
  const now = new Date();

  // If token expires in less than 5 minutes, refresh it
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    return await refreshAccessToken(connection, supabase);
  }

  return connection.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      SUPABASE_URL!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, eventData } = await req.json();
    console.log('Calendar sync action:', action, 'for user:', user.id);

    // Use service role for database operations
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get user's calendar connection
    const { data: connection, error: connError } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .eq('is_active', true)
      .single();

    if (connError || !connection) {
      return new Response(JSON.stringify({ error: 'No calendar connected', needsAuth: true }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = await getValidAccessToken(connection, supabase);
    if (!accessToken) {
      // Mark connection as inactive if token refresh fails
      await supabase
        .from('calendar_connections')
        .update({ is_active: false })
        .eq('id', connection.id);

      return new Response(JSON.stringify({ error: 'Calendar authorization expired', needsReauth: true }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const calendarId = connection.calendar_id || 'primary';

    switch (action) {
      case 'create': {
        const event = {
          summary: eventData.title,
          description: eventData.description,
          start: {
            dateTime: eventData.startTime,
            timeZone: eventData.timeZone || 'UTC',
          },
          end: {
            dateTime: eventData.endTime,
            timeZone: eventData.timeZone || 'UTC',
          },
          location: eventData.location,
          attendees: eventData.attendees?.map((email: string) => ({ email })),
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 },
              { method: 'popup', minutes: 30 },
            ],
          },
        };

        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
          }
        );

        const createdEvent = await response.json();

        if (!response.ok) {
          console.error('Failed to create calendar event:', createdEvent);
          return new Response(JSON.stringify({ error: 'Failed to create event', details: createdEvent }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Store in our database
        await supabase.from('calendar_events').insert({
          calendar_connection_id: connection.id,
          external_event_id: createdEvent.id,
          event_type: eventData.eventType || 'interview',
          title: eventData.title,
          description: eventData.description,
          start_time: eventData.startTime,
          end_time: eventData.endTime,
          location: eventData.location,
          attendees: eventData.attendees || [],
          reference_type: eventData.referenceType,
          reference_id: eventData.referenceId,
          sync_status: 'synced',
          last_synced_at: new Date().toISOString(),
        });

        console.log('Created calendar event:', createdEvent.id);
        return new Response(JSON.stringify({ success: true, event: createdEvent }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update': {
        if (!eventData.externalEventId) {
          return new Response(JSON.stringify({ error: 'No external event ID provided' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const event = {
          summary: eventData.title,
          description: eventData.description,
          start: {
            dateTime: eventData.startTime,
            timeZone: eventData.timeZone || 'UTC',
          },
          end: {
            dateTime: eventData.endTime,
            timeZone: eventData.timeZone || 'UTC',
          },
          location: eventData.location,
          attendees: eventData.attendees?.map((email: string) => ({ email })),
        };

        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventData.externalEventId}?sendUpdates=all`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
          }
        );

        const updatedEvent = await response.json();

        if (!response.ok) {
          console.error('Failed to update calendar event:', updatedEvent);
          return new Response(JSON.stringify({ error: 'Failed to update event' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Update in our database
        await supabase
          .from('calendar_events')
          .update({
            title: eventData.title,
            description: eventData.description,
            start_time: eventData.startTime,
            end_time: eventData.endTime,
            location: eventData.location,
            attendees: eventData.attendees || [],
            last_synced_at: new Date().toISOString(),
          })
          .eq('external_event_id', eventData.externalEventId);

        console.log('Updated calendar event:', eventData.externalEventId);
        return new Response(JSON.stringify({ success: true, event: updatedEvent }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete': {
        if (!eventData.externalEventId) {
          return new Response(JSON.stringify({ error: 'No external event ID provided' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventData.externalEventId}?sendUpdates=all`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (!response.ok && response.status !== 404) {
          console.error('Failed to delete calendar event');
          return new Response(JSON.stringify({ error: 'Failed to delete event' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Delete from our database
        await supabase
          .from('calendar_events')
          .delete()
          .eq('external_event_id', eventData.externalEventId);

        console.log('Deleted calendar event:', eventData.externalEventId);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'list': {
        const timeMin = eventData.timeMin || new Date().toISOString();
        const timeMax = eventData.timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
            new URLSearchParams({
              timeMin,
              timeMax,
              singleEvents: 'true',
              orderBy: 'startTime',
              maxResults: '50',
            }),
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        const eventsData = await response.json();

        if (!response.ok) {
          console.error('Failed to list calendar events:', eventsData);
          return new Response(JSON.stringify({ error: 'Failed to list events' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ success: true, events: eventsData.items || [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error: unknown) {
    console.error('Calendar sync error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
