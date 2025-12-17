import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, formatDistanceToNow, subDays } from 'date-fns';
import { Activity, Clock, Eye, MousePointerClick, Users, ArrowRight, Search, RefreshCw } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface AnalyticsEvent {
  id: string;
  user_id: string | null;
  session_id: string;
  event_type: string;
  page_path: string;
  page_title: string | null;
  action_name: string | null;
  action_target: string | null;
  referrer_path: string | null;
  time_on_page_ms: number | null;
  metadata: any;
  created_at: string;
}

interface AnalyticsSession {
  id: string;
  user_id: string | null;
  started_at: string;
  last_activity_at: string;
  total_pages_viewed: number;
  total_actions: number;
  entry_page: string | null;
  exit_page: string | null;
}

interface PageStats {
  page_path: string;
  views: number;
  avg_time_ms: number;
  unique_users: number;
}

interface ActionStats {
  action_name: string;
  count: number;
  unique_users: number;
}

export default function UserAnalytics() {
  const { role, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const isAdmin = role === 'admin';
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [sessions, setSessions] = useState<AnalyticsSession[]>([]);
  const [pageStats, setPageStats] = useState<PageStats[]>([]);
  const [actionStats, setActionStats] = useState<ActionStats[]>([]);
  const [dateRange, setDateRange] = useState('7');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Summary stats
  const [totalPageViews, setTotalPageViews] = useState(0);
  const [totalActions, setTotalActions] = useState(0);
  const [uniqueUsers, setUniqueUsers] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [avgTimeOnPage, setAvgTimeOnPage] = useState(0);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, roleLoading, navigate]);

  const fetchAnalytics = async () => {
    setRefreshing(true);
    const startDate = subDays(new Date(), parseInt(dateRange)).toISOString();

    try {
      // Fetch events
      const { data: eventsData } = await supabase
        .from('analytics_events')
        .select('*')
        .gte('created_at', startDate)
        .order('created_at', { ascending: false })
        .limit(500);

      // Fetch sessions
      const { data: sessionsData } = await supabase
        .from('analytics_sessions')
        .select('*')
        .gte('started_at', startDate)
        .order('started_at', { ascending: false })
        .limit(200);

      if (eventsData) {
        setEvents(eventsData);
        
        // Calculate summary stats
        const pageViews = eventsData.filter(e => e.event_type === 'page_view');
        const actions = eventsData.filter(e => e.event_type === 'action');
        const pageExits = eventsData.filter(e => e.event_type === 'page_exit' && e.time_on_page_ms);
        
        setTotalPageViews(pageViews.length);
        setTotalActions(actions.length);
        
        const uniqueUserIds = new Set(eventsData.filter(e => e.user_id).map(e => e.user_id));
        setUniqueUsers(uniqueUserIds.size);
        
        // Calculate avg time on page
        if (pageExits.length > 0) {
          const totalTime = pageExits.reduce((sum, e) => sum + (e.time_on_page_ms || 0), 0);
          setAvgTimeOnPage(Math.round(totalTime / pageExits.length / 1000)); // in seconds
        }

        // Calculate page stats
        const pageMap = new Map<string, { views: number; totalTime: number; users: Set<string> }>();
        pageViews.forEach(e => {
          const existing = pageMap.get(e.page_path) || { views: 0, totalTime: 0, users: new Set() };
          existing.views++;
          if (e.user_id) existing.users.add(e.user_id);
          pageMap.set(e.page_path, existing);
        });
        pageExits.forEach(e => {
          const existing = pageMap.get(e.page_path);
          if (existing && e.time_on_page_ms) {
            existing.totalTime += e.time_on_page_ms;
          }
        });
        
        const pageStatsArr: PageStats[] = Array.from(pageMap.entries())
          .map(([path, data]) => ({
            page_path: path,
            views: data.views,
            avg_time_ms: data.views > 0 ? Math.round(data.totalTime / data.views) : 0,
            unique_users: data.users.size,
          }))
          .sort((a, b) => b.views - a.views);
        setPageStats(pageStatsArr);

        // Calculate action stats
        const actionMap = new Map<string, { count: number; users: Set<string> }>();
        actions.forEach(e => {
          const name = e.action_name || 'unknown';
          const existing = actionMap.get(name) || { count: 0, users: new Set() };
          existing.count++;
          if (e.user_id) existing.users.add(e.user_id);
          actionMap.set(name, existing);
        });
        
        const actionStatsArr: ActionStats[] = Array.from(actionMap.entries())
          .map(([name, data]) => ({
            action_name: name,
            count: data.count,
            unique_users: data.users.size,
          }))
          .sort((a, b) => b.count - a.count);
        setActionStats(actionStatsArr);
      }

      if (sessionsData) {
        setSessions(sessionsData);
        setTotalSessions(sessionsData.length);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAnalytics();
    }
  }, [isAdmin, dateRange]);

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const filteredEvents = events.filter(e => 
    e.page_path.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.action_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.action_target?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (roleLoading || loading) {
    return <LoadingSpinner message="Loading analytics..." />;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <SidebarLayout userRole="recruiter">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">User Analytics</h1>
            <p className="text-muted-foreground">Track page visits, actions, and user journeys</p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24 hours</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchAnalytics} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Eye className="w-4 h-4" /> Page Views
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPageViews.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MousePointerClick className="w-4 h-4" /> Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalActions.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" /> Unique Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueUsers.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="w-4 h-4" /> Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSessions.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" /> Avg. Time/Page
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgTimeOnPage}s</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pages" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pages">Page Analytics</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="journeys">User Journeys</TabsTrigger>
            <TabsTrigger value="events">Event Log</TabsTrigger>
          </TabsList>

          {/* Page Analytics */}
          <TabsContent value="pages" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Most Visited Pages</CardTitle>
                <CardDescription>Pages ranked by view count with time on page</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Page</TableHead>
                      <TableHead className="text-right">Views</TableHead>
                      <TableHead className="text-right">Unique Users</TableHead>
                      <TableHead className="text-right">Avg. Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageStats.slice(0, 20).map((page) => (
                      <TableRow key={page.page_path}>
                        <TableCell className="font-mono text-sm">{page.page_path}</TableCell>
                        <TableCell className="text-right">{page.views}</TableCell>
                        <TableCell className="text-right">{page.unique_users}</TableCell>
                        <TableCell className="text-right">{formatDuration(page.avg_time_ms)}</TableCell>
                      </TableRow>
                    ))}
                    {pageStats.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No page data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Actions */}
          <TabsContent value="actions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Feature Adoption</CardTitle>
                <CardDescription>Most frequent user actions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Unique Users</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {actionStats.map((action) => (
                      <TableRow key={action.action_name}>
                        <TableCell>
                          <Badge variant="secondary">{action.action_name}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{action.count}</TableCell>
                        <TableCell className="text-right">{action.unique_users}</TableCell>
                      </TableRow>
                    ))}
                    {actionStats.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          No action data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Journeys */}
          <TabsContent value="journeys" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent User Journeys</CardTitle>
                <CardDescription>Path users take through the app</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sessions.slice(0, 15).map((session) => {
                    const sessionEvents = events
                      .filter(e => e.session_id === session.id && e.event_type === 'page_view')
                      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                    
                    return (
                      <div key={session.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {formatDistanceToNow(new Date(session.started_at), { addSuffix: true })}
                          </span>
                          <div className="flex items-center gap-4 text-muted-foreground">
                            <span>{session.total_pages_viewed} pages</span>
                            <span>{session.total_actions} actions</span>
                          </div>
                        </div>
                        <div className="flex items-center flex-wrap gap-2">
                          {sessionEvents.slice(0, 8).map((event, idx) => (
                            <div key={event.id} className="flex items-center gap-1">
                              <Badge variant="outline" className="font-mono text-xs">
                                {event.page_path}
                              </Badge>
                              {idx < sessionEvents.length - 1 && idx < 7 && (
                                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                              )}
                            </div>
                          ))}
                          {sessionEvents.length > 8 && (
                            <span className="text-xs text-muted-foreground">
                              +{sessionEvents.length - 8} more
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {sessions.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      No session data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Event Log */}
          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Event Log</CardTitle>
                    <CardDescription>All tracked events in chronological order</CardDescription>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search events..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-[250px]"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Page</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead className="text-right">Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.slice(0, 100).map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(event.created_at), 'MMM d, HH:mm:ss')}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              event.event_type === 'page_view' ? 'default' :
                              event.event_type === 'action' ? 'secondary' : 'outline'
                            }
                          >
                            {event.event_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{event.page_path}</TableCell>
                        <TableCell>
                          {event.action_name && (
                            <span className="text-sm">
                              {event.action_name}
                              {event.action_target && (
                                <span className="text-muted-foreground"> → {event.action_target}</span>
                              )}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatDuration(event.time_on_page_ms)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SidebarLayout>
  );
}
