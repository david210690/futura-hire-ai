import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, TrendingUp, Clock, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminMonitor() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, success: 0, error: 0, avgLatency: 0 });
  const [runs, setRuns] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    checkAdmin();
    loadData();
  }, [filter]);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (userRole?.role !== 'admin') {
      navigate('/dashboard');
    }
  };

  const loadData = async () => {
    let query = supabase
      .from('ai_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (filter !== 'all') {
      query = query.eq('kind', filter);
    }

    const { data: runsData } = await query;
    setRuns(runsData || []);

    // Calculate stats
    const total = runsData?.length || 0;
    const success = runsData?.filter(r => r.status === 'ok').length || 0;
    const error = runsData?.filter(r => r.status === 'error').length || 0;
    const avgLatency = runsData && runsData.length > 0
      ? Math.round(runsData.reduce((sum, r) => sum + (r.latency_ms || 0), 0) / runsData.length)
      : 0;

    setStats({ total, success, error, avgLatency });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar userRole="admin" />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">AI Operations Monitor</h1>
          <p className="text-muted-foreground">Track AI performance and observability</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Last 100 operations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">
                {stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">{stats.success} successful</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.avgLatency}ms</div>
              <p className="text-xs text-muted-foreground">Response time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Errors</CardTitle>
              <AlertCircle className="w-4 h-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{stats.error}</div>
              <p className="text-xs text-muted-foreground">Failed operations</p>
            </CardContent>
          </Card>
        </div>

        {/* AI Runs Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>AI Run History</CardTitle>
                <CardDescription>Recent AI operations and their outcomes</CardDescription>
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Operations</SelectItem>
                  <SelectItem value="parse">Resume Parse</SelectItem>
                  <SelectItem value="shortlist">Shortlist</SelectItem>
                  <SelectItem value="video">Video Analysis</SelectItem>
                  <SelectItem value="culture">Culture Fit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Operation</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Latency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No AI runs yet
                    </TableCell>
                  </TableRow>
                ) : (
                  runs.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell className="text-xs">
                        {new Date(run.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {run.kind}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{run.model_name || '-'}</TableCell>
                      <TableCell>
                        <span className={run.latency_ms > 5000 ? 'text-warning' : ''}>
                          {run.latency_ms}ms
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={run.status === 'ok' ? 'default' : 'destructive'}>
                          {run.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-destructive max-w-xs truncate">
                        {run.error_message || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
