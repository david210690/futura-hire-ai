import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Check, Loader2, Unlink } from 'lucide-react';
import { useCalendarConnection } from '@/hooks/useCalendarConnection';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'react-router-dom';

export function CalendarSettings() {
  const {
    connection,
    isLoading,
    isConnecting,
    isConnected,
    connectCalendar,
    disconnectCalendar,
  } = useCalendarConnection();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle callback params
  useEffect(() => {
    const calendarConnected = searchParams.get('calendar_connected');
    const calendarError = searchParams.get('calendar_error');

    if (calendarConnected === 'true') {
      toast({
        title: 'Calendar Connected',
        description: 'Your Google Calendar has been successfully connected',
      });
      // Clean up URL params
      searchParams.delete('calendar_connected');
      setSearchParams(searchParams, { replace: true });
    }

    if (calendarError) {
      toast({
        title: 'Connection Failed',
        description: `Could not connect calendar: ${calendarError}`,
        variant: 'destructive',
      });
      searchParams.delete('calendar_error');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, toast]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendar Integration
        </CardTitle>
        <CardDescription>
          Sync interviews and events with your Google Calendar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected && connection ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-medium">Google Calendar</p>
                  <p className="text-sm text-muted-foreground">{connection.calendar_email}</p>
                </div>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Check className="h-3 w-3" />
                Connected
              </Badge>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>Your calendar is synced. Interview events will automatically appear in your Google Calendar.</p>
            </div>

            <Button
              variant="outline"
              onClick={disconnectCalendar}
              className="gap-2"
            >
              <Unlink className="h-4 w-4" />
              Disconnect Calendar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 border rounded-lg border-dashed">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <svg className="h-5 w-5 text-muted-foreground" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-medium">Google Calendar</p>
                  <p className="text-sm text-muted-foreground">Not connected</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Connect your Google Calendar to automatically sync interview schedules, send calendar invites to candidates, and keep your schedule up to date.
              </p>
              <Button
                onClick={connectCalendar}
                disabled={isConnecting}
                className="gap-2"
              >
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Calendar className="h-4 w-4" />
                )}
                Connect Google Calendar
              </Button>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>By connecting, you allow FuturaHire to:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>View and create calendar events</li>
                <li>Send calendar invites to interview participants</li>
                <li>Read your calendar email address</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
