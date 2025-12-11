import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";
import { format } from "date-fns";

interface Snapshot {
  id: string;
  created_at: string;
  snapshot_json: any;
}

interface SnapshotHistoryProps {
  currentSnapshotId: string | null;
  onSelectSnapshot: (snapshot: any, createdAt: string, id: string) => void;
}

export function SnapshotHistory({ currentSnapshotId, onSelectSnapshot }: SnapshotHistoryProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSnapshots();
  }, []);

  const loadSnapshots = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('career_trajectory_snapshots')
        .select('id, created_at, snapshot_json')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setSnapshots(data || []);
    } catch (error) {
      console.error('Error loading snapshots:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || snapshots.length <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <History className="h-4 w-4 text-muted-foreground" />
      <Select
        value={currentSnapshotId || undefined}
        onValueChange={(id) => {
          const snapshot = snapshots.find(s => s.id === id);
          if (snapshot) {
            onSelectSnapshot(snapshot.snapshot_json, snapshot.created_at, snapshot.id);
          }
        }}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select snapshot" />
        </SelectTrigger>
        <SelectContent>
          {snapshots.map((snapshot, idx) => (
            <SelectItem key={snapshot.id} value={snapshot.id}>
              <div className="flex items-center gap-2">
                {format(new Date(snapshot.created_at), 'MMM d, yyyy')}
                {idx === 0 && <Badge variant="secondary" className="text-xs">Latest</Badge>}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
