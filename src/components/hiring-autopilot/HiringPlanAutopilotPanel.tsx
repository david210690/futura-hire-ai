import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Calendar, 
  RefreshCw, 
  Target, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  Copy,
  ChevronDown,
  Mail,
  Linkedin,
  Clock,
  BarChart3,
  Download
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HiringPlanAutopilotPanelProps {
  jobTwinJobId: string;
}

interface HiringPlanSnapshot {
  overview: {
    summary: string;
    north_star: string;
    assumptions: string[];
    disclaimer: string;
  };
  priority_candidates: Array<{
    candidateId: string;
    priority_reason: string;
    next_action: string;
    suggested_stage_move: string;
  }>;
  bottlenecks_and_fixes: Array<{
    stage: string;
    issue: string;
    evidence: string;
    fix: string[];
  }>;
  plan_7_days: Array<{
    day: number;
    focus: string;
    tasks: string[];
  }>;
  plan_30_days: Array<{
    week: number;
    goal: string;
    tasks: string[];
    success_criteria: string[];
  }>;
  interview_kit: {
    rounds: Array<{
      round_name: string;
      what_to_test: string[];
      question_bank: string[];
      evaluation_rubric: Array<{
        dimension: string;
        what_good_looks_like: string[];
        red_flags_to_avoid: string[];
      }>;
    }>;
  };
  templates: {
    email_followup: {
      subject: string;
      body: string;
    };
    linkedin_message: string;
    scheduling_message: string;
  };
  recruiting_rhythm: {
    weekly_cadence: string[];
    metrics_to_track: string[];
  };
}

export function HiringPlanAutopilotPanel({ jobTwinJobId }: HiringPlanAutopilotPanelProps) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [snapshot, setSnapshot] = useState<HiringPlanSnapshot | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(['overview']);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchHiringPlan();
    fetchCompletedTasks();
  }, [jobTwinJobId]);

  const fetchCompletedTasks = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('hiring_plan_task_completions')
        .select('task_key')
        .eq('job_twin_job_id', jobTwinJobId)
        .eq('user_id', session.user.id);

      if (error) throw error;
      setCompletedTasks(new Set(data?.map(t => t.task_key) || []));
    } catch (error) {
      console.error('Error fetching completed tasks:', error);
    }
  };

  const toggleTaskCompletion = async (taskKey: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const isCompleted = completedTasks.has(taskKey);

      if (isCompleted) {
        // Remove completion
        await supabase
          .from('hiring_plan_task_completions')
          .delete()
          .eq('job_twin_job_id', jobTwinJobId)
          .eq('user_id', session.user.id)
          .eq('task_key', taskKey);

        setCompletedTasks(prev => {
          const next = new Set(prev);
          next.delete(taskKey);
          return next;
        });
      } else {
        // Add completion
        await supabase
          .from('hiring_plan_task_completions')
          .insert({
            job_twin_job_id: jobTwinJobId,
            user_id: session.user.id,
            task_key: taskKey
          });

        setCompletedTasks(prev => new Set([...prev, taskKey]));
        toast.success('Task marked complete');
      }
    } catch (error) {
      console.error('Error toggling task:', error);
      toast.error('Failed to update task');
    }
  };

  const getTaskKey = (section: string, index: number, taskIndex?: number) => {
    if (taskIndex !== undefined) {
      return `${section}-${index}-${taskIndex}`;
    }
    return `${section}-${index}`;
  };

  const fetchHiringPlan = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-hiring-autopilot?jobId=${jobTwinJobId}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      if (data.success && data.exists) {
        setSnapshot(data.snapshot);
        setCreatedAt(data.createdAt);
      }
    } catch (error) {
      console.error('Error fetching hiring plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateHiringPlan = async () => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-hiring-autopilot`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ jobId: jobTwinJobId })
        }
      );

      const data = await response.json();
      
      if (data.code === 'NO_ROLE_DNA') {
        toast.error('Please generate Role DNA for this job first');
        return;
      }

      if (data.success) {
        setSnapshot(data.snapshot);
        setCreatedAt(data.createdAt);
        toast.success('Hiring plan generated successfully');
      } else {
        toast.error(data.error || 'Failed to generate hiring plan');
      }
    } catch (error) {
      console.error('Error generating hiring plan:', error);
      toast.error('Failed to generate hiring plan');
    } finally {
      setGenerating(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section) 
        : [...prev, section]
    );
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const exportToCalendar = () => {
    if (!snapshot) return;

    const today = new Date();
    let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//FuturHire//Hiring Plan//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
`;

    // Add 7-day plan events
    snapshot.plan_7_days?.forEach((day) => {
      const eventDate = new Date(today);
      eventDate.setDate(today.getDate() + day.day - 1);
      const dateStr = eventDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const endDate = new Date(eventDate);
      endDate.setHours(endDate.getHours() + 1);
      const endDateStr = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      const description = day.tasks.join('\\n• ');

      icsContent += `BEGIN:VEVENT
DTSTART:${dateStr}
DTEND:${endDateStr}
SUMMARY:Day ${day.day}: ${day.focus}
DESCRIPTION:Tasks:\\n• ${description}
END:VEVENT
`;
    });

    // Add weekly milestones
    snapshot.plan_30_days?.forEach((week) => {
      const eventDate = new Date(today);
      eventDate.setDate(today.getDate() + (week.week * 7) - 6);
      const dateStr = eventDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const endDate = new Date(eventDate);
      endDate.setHours(endDate.getHours() + 1);
      const endDateStr = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      const description = week.tasks.join('\\n• ');

      icsContent += `BEGIN:VEVENT
DTSTART:${dateStr}
DTEND:${endDateStr}
SUMMARY:Week ${week.week}: ${week.goal}
DESCRIPTION:Tasks:\\n• ${description}
END:VEVENT
`;
    });

    icsContent += 'END:VCALENDAR';

    // Download the file
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hiring-plan.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Calendar exported! Import the .ics file into your calendar app.');
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!snapshot) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Hiring Plan Autopilot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <p className="text-muted-foreground">
              Generate a 7-day and 30-day hiring plan based on Role DNA + pipeline signals. 
              This is a guide to help you move faster, not a guarantee.
            </p>
            <Button onClick={generateHiringPlan} disabled={generating}>
              {generating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Generate Hiring Plan
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Hiring Plan Autopilot
          </CardTitle>
          {createdAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Last updated: {new Date(createdAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportToCalendar}>
            <Download className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">Export</span>
          </Button>
          <Button variant="outline" size="sm" onClick={generateHiringPlan} disabled={generating}>
            {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">Regenerate</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview */}
        <Collapsible open={expandedSections.includes('overview')} onOpenChange={() => toggleSection('overview')}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="font-medium">Overview</span>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.includes('overview') ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-3">
            <p className="text-sm text-foreground">{snapshot.overview.summary}</p>
            <div className="flex items-start gap-2 p-3 bg-primary/10 rounded-lg">
              <Target className="h-4 w-4 text-primary mt-0.5" />
              <div>
                <p className="text-xs font-medium text-primary">North Star</p>
                <p className="text-sm">{snapshot.overview.north_star}</p>
              </div>
            </div>
            {snapshot.overview.assumptions?.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Assumptions:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {snapshot.overview.assumptions.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}
            <p className="text-xs text-muted-foreground italic">{snapshot.overview.disclaimer}</p>
          </CollapsibleContent>
        </Collapsible>

        {/* Priority Candidates */}
        {snapshot.priority_candidates?.length > 0 && (
          <Collapsible open={expandedSections.includes('priority')} onOpenChange={() => toggleSection('priority')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-medium">Priority Candidates</span>
                <Badge variant="secondary" className="text-xs">{snapshot.priority_candidates.length}</Badge>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.includes('priority') ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-2">
              {snapshot.priority_candidates.map((c, i) => (
                <div key={i} className="p-3 border border-border/50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-muted-foreground">{c.candidateId.substring(0, 8)}...</span>
                    <Badge variant="outline" className="text-xs">{c.suggested_stage_move}</Badge>
                  </div>
                  <p className="text-sm">{c.priority_reason}</p>
                  <div className="flex items-center gap-1 text-xs text-primary">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>{c.next_action}</span>
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Bottlenecks & Fixes */}
        {snapshot.bottlenecks_and_fixes?.length > 0 && (
          <Collapsible open={expandedSections.includes('bottlenecks')} onOpenChange={() => toggleSection('bottlenecks')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="font-medium">Bottlenecks & Fixes</span>
                <Badge variant="secondary" className="text-xs">{snapshot.bottlenecks_and_fixes.length}</Badge>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.includes('bottlenecks') ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-2">
              {snapshot.bottlenecks_and_fixes.map((b, i) => (
                <div key={i} className="p-3 border border-amber-500/20 bg-amber-500/5 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{b.stage}</Badge>
                    <span className="text-sm font-medium">{b.issue}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{b.evidence}</p>
                  <ul className="text-xs space-y-1">
                    {b.fix.map((f, j) => (
                      <li key={j} className="flex items-start gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* 7-Day Plan */}
        <Collapsible open={expandedSections.includes('7day')} onOpenChange={() => toggleSection('7day')}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-medium">7-Day Plan</span>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.includes('7day') ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="grid gap-2">
              {snapshot.plan_7_days?.map((day, i) => (
                <div key={i} className="p-3 border border-border/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs">Day {day.day}</Badge>
                    <span className="text-sm font-medium">{day.focus}</span>
                  </div>
                  <ul className="text-xs space-y-2">
                    {day.tasks.map((t, j) => {
                      const taskKey = getTaskKey('7day', i, j);
                      const isCompleted = completedTasks.has(taskKey);
                      return (
                        <li key={j} className="flex items-start gap-2">
                          <Checkbox 
                            id={taskKey}
                            checked={isCompleted}
                            onCheckedChange={() => toggleTaskCompletion(taskKey)}
                            className="mt-0.5"
                          />
                          <label 
                            htmlFor={taskKey}
                            className={`cursor-pointer ${isCompleted ? 'line-through text-muted-foreground' : ''}`}
                          >
                            {t}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* 30-Day Plan */}
        <Collapsible open={expandedSections.includes('30day')} onOpenChange={() => toggleSection('30day')}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="font-medium">30-Day Plan</span>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.includes('30day') ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="grid gap-3">
              {snapshot.plan_30_days?.map((week, i) => (
                <div key={i} className="p-3 border border-border/50 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="text-xs">Week {week.week}</Badge>
                    <span className="text-sm font-medium">{week.goal}</span>
                  </div>
                  <ul className="text-xs space-y-2">
                    {week.tasks.map((t, j) => {
                      const taskKey = getTaskKey('30day', i, j);
                      const isCompleted = completedTasks.has(taskKey);
                      return (
                        <li key={j} className="flex items-start gap-2">
                          <Checkbox 
                            id={taskKey}
                            checked={isCompleted}
                            onCheckedChange={() => toggleTaskCompletion(taskKey)}
                            className="mt-0.5"
                          />
                          <label 
                            htmlFor={taskKey}
                            className={`cursor-pointer ${isCompleted ? 'line-through text-muted-foreground' : ''}`}
                          >
                            {t}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                  {week.success_criteria?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Success criteria:</p>
                      <ul className="text-xs space-y-0.5">
                        {week.success_criteria.map((c, j) => (
                          <li key={j} className="flex items-start gap-1 text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-3 w-3 mt-0.5" />
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Interview Kit */}
        <Collapsible open={expandedSections.includes('interview')} onOpenChange={() => toggleSection('interview')}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="font-medium">Interview Kit</span>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.includes('interview') ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <Accordion type="multiple" className="w-full">
              {snapshot.interview_kit?.rounds?.map((round, i) => (
                <AccordionItem key={i} value={`round-${i}`}>
                  <AccordionTrigger className="text-sm">{round.round_name}</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">What to Test:</p>
                      <div className="flex flex-wrap gap-1">
                        {round.what_to_test.map((w, j) => (
                          <Badge key={j} variant="outline" className="text-xs">{w}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Question Bank:</p>
                      <ul className="text-xs space-y-1">
                        {round.question_bank.map((q, j) => (
                          <li key={j} className="flex items-start gap-1">
                            <span className="text-primary">•</span>
                            <span>{q}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {round.evaluation_rubric?.map((rubric, k) => (
                      <div key={k} className="p-2 bg-muted/50 rounded-lg space-y-1">
                        <p className="text-xs font-medium">{rubric.dimension}</p>
                        <div className="text-xs">
                          <p className="text-muted-foreground">Good signals:</p>
                          <ul className="pl-3 space-y-0.5">
                            {rubric.what_good_looks_like.map((g, l) => (
                              <li key={l} className="text-green-600 dark:text-green-400">✓ {g}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="text-xs">
                          <p className="text-muted-foreground">Bias traps to avoid:</p>
                          <ul className="pl-3 space-y-0.5">
                            {rubric.red_flags_to_avoid.map((r, l) => (
                              <li key={l} className="text-amber-600 dark:text-amber-400">⚠ {r}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CollapsibleContent>
        </Collapsible>

        {/* Templates */}
        <Collapsible open={expandedSections.includes('templates')} onOpenChange={() => toggleSection('templates')}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <span className="font-medium">Outreach Templates</span>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.includes('templates') ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-3">
            {/* Email Template */}
            <div className="p-3 border border-border/50 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Email Follow-up</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(
                    `Subject: ${snapshot.templates.email_followup.subject}\n\n${snapshot.templates.email_followup.body}`,
                    'Email template'
                  )}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <div className="bg-muted/50 p-2 rounded text-xs">
                <p className="font-medium">Subject: {snapshot.templates.email_followup.subject}</p>
                <p className="mt-2 whitespace-pre-wrap">{snapshot.templates.email_followup.body}</p>
              </div>
            </div>

            {/* LinkedIn Template */}
            <div className="p-3 border border-border/50 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Linkedin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">LinkedIn Message</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(snapshot.templates.linkedin_message, 'LinkedIn message')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <div className="bg-muted/50 p-2 rounded text-xs whitespace-pre-wrap">
                {snapshot.templates.linkedin_message}
              </div>
            </div>

            {/* Scheduling Template */}
            <div className="p-3 border border-border/50 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Scheduling Message</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(snapshot.templates.scheduling_message, 'Scheduling message')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <div className="bg-muted/50 p-2 rounded text-xs whitespace-pre-wrap">
                {snapshot.templates.scheduling_message}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Recruiting Rhythm */}
        <Collapsible open={expandedSections.includes('rhythm')} onOpenChange={() => toggleSection('rhythm')}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="font-medium">Recruiting Rhythm</span>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.includes('rhythm') ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Weekly Cadence:</p>
              <ul className="text-xs space-y-1">
                {snapshot.recruiting_rhythm?.weekly_cadence?.map((c, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <Clock className="h-3 w-3 text-primary mt-0.5" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Metrics to Track:</p>
              <div className="flex flex-wrap gap-1">
                {snapshot.recruiting_rhythm?.metrics_to_track?.map((m, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{m}</Badge>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Footer Note */}
        <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border/50">
          AI-generated plan. Use structured interviews and human judgment alongside this guidance.
        </p>
      </CardContent>
    </Card>
  );
}
