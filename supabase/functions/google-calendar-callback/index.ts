import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  console.log('Received callback with code:', code ? 'present' : 'missing', 'error:', error);

  // Parse state to get user ID and redirect URI
  let userId: string | null = null;
  let redirectUri = 'https://futurahire.app/settings';

  if (state) {
    try {
      const stateData = JSON.parse(atob(state));
      userId = stateData.userId;
      redirectUri = stateData.redirectUri || redirectUri;
    } catch (e) {
      console.error('Failed to parse state:', e);
    }
  }

  if (error) {
    console.error('OAuth error:', error);
    return Response.redirect(`${redirectUri}?calendar_error=${encodeURIComponent(error)}`);
  }

  if (!code || !userId) {
    return Response.redirect(`${redirectUri}?calendar_error=missing_code_or_user`);
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${SUPABASE_URL}/functions/v1/google-calendar-callback`,
      }),
    });

    const tokens = await tokenResponse.json();
    console.log('Token exchange response status:', tokenResponse.status);

    if (!tokenResponse.ok || !tokens.access_token) {
      console.error('Token exchange failed:', tokens);
      return Response.redirect(`${redirectUri}?calendar_error=token_exchange_failed`);
    }

    // Get user info to get email
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userInfoResponse.json();
    console.log('Got user info for:', userInfo.email);

    // Get primary calendar ID
    const calendarResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const calendarData = await calendarResponse.json();

    // Store in database using service role
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { error: upsertError } = await supabase
      .from('calendar_connections')
      .upsert({
        user_id: userId,
        provider: 'google',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        calendar_id: calendarData.id || 'primary',
        calendar_email: userInfo.email,
        is_active: true,
      }, {
        onConflict: 'user_id,provider',
      });

    if (upsertError) {
      console.error('Failed to store calendar connection:', upsertError);
      return Response.redirect(`${redirectUri}?calendar_error=storage_failed`);
    }

    console.log('Successfully stored calendar connection for user:', userId);
    return Response.redirect(`${redirectUri}?calendar_connected=true`);
  } catch (error: unknown) {
    console.error('Callback error:', error);
    const message = error instanceof Error ? error.message : 'unknown_error';
    return Response.redirect(`${redirectUri}?calendar_error=${encodeURIComponent(message)}`);
  }
});
