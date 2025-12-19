import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, Loader2, MapPin, Users } from 'lucide-react';
import { useCalendarConnection } from '@/hooks/useCalendarConnection';
import { useToast } from '@/hooks/use-toast';

interface ScheduleInterviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateName: string;
  candidateEmail?: string;
  jobTitle: string;
  referenceId?: string;
  onScheduled?: (eventData: any) => void;
}

export function ScheduleInterviewDialog({
  open,
  onOpenChange,
  candidateName,
  candidateEmail,
  jobTitle,
  referenceId,
  onScheduled,
}: ScheduleInterviewDialogProps) {
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [duration, setDuration] = useState('60');
  const [location, setLocation] = useState('');
  const [additionalAttendees, setAdditionalAttendees] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isConnected, createEvent, connectCalendar } = useCalendarConnection();
  const { toast } = useToast();

  const handleSchedule = async () => {
    if (!date || !startTime) {
      toast({
        title: 'Missing Information',
        description: 'Please select a date and time',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const startDateTime = new Date(`${date}T${startTime}`);
      const endDateTime = new Date(startDateTime.getTime() + parseInt(duration) * 60 * 1000);

      const attendees = [candidateEmail].filter(Boolean) as string[];
      if (additionalAttendees) {
        const extras = additionalAttendees.split(',').map(e => e.trim()).filter(Boolean);
        attendees.push(...extras);
      }

      const eventData = {
        title: `Interview: ${candidateName} - ${jobTitle}`,
        description: `Interview with ${candidateName} for ${jobTitle} position.\n\n${notes ? `Notes: ${notes}` : ''}`,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        location: location || 'Video Call',
        attendees,
        eventType: 'interview',
        referenceType: 'application',
        referenceId,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      const result = await createEvent(eventData);

      if (result) {
        toast({
          title: 'Interview Scheduled',
          description: `Calendar invite sent to ${attendees.length} participant(s)`,
        });
        onScheduled?.(result);
        onOpenChange(false);
        // Reset form
        setDate('');
        setStartTime('10:00');
        setDuration('60');
        setLocation('');
        setAdditionalAttendees('');
        setNotes('');
      }
    } catch (error) {
      console.error('Error scheduling interview:', error);
      toast({
        title: 'Error',
        description: 'Could not schedule interview',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get tomorrow's date as minimum
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Interview
          </DialogTitle>
          <DialogDescription>
            Schedule an interview with {candidateName} for {jobTitle}
          </DialogDescription>
        </DialogHeader>

        {!isConnected ? (
          <div className="py-6 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-muted mx-auto flex items-center justify-center">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Connect Your Calendar</p>
              <p className="text-sm text-muted-foreground mt-1">
                Connect your Google Calendar to schedule interviews and send calendar invites automatically.
              </p>
            </div>
            <Button onClick={connectCalendar} className="gap-2">
              <Calendar className="h-4 w-4" />
              Connect Google Calendar
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Date
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={minDate}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time" className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Time
                  </Label>
                  <Input
                    id="time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <select
                  id="duration"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                  <option value="120">2 hours</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  Location
                </Label>
                <Input
                  id="location"
                  placeholder="e.g., Zoom link, Google Meet, or office address"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="attendees" className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Additional Attendees
                </Label>
                <Input
                  id="attendees"
                  placeholder="email1@example.com, email2@example.com"
                  value={additionalAttendees}
                  onChange={(e) => setAdditionalAttendees(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {candidateEmail && `${candidateEmail} will be added automatically.`}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional notes for the interview..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSchedule} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Scheduling...
                  </>
                ) : (
                  'Schedule Interview'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
