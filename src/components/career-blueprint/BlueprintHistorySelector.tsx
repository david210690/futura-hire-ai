import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { History, Calendar, ChevronDown } from "lucide-react";
import { format } from "date-fns";

interface BlueprintSnapshot {
  id: string;
  created_at: string;
  target_role_1: string;
  target_role_2?: string | null;
}

interface BlueprintHistorySelectorProps {
  snapshots: BlueprintSnapshot[];
  currentSnapshotId?: string;
  onSelectSnapshot: (snapshot: BlueprintSnapshot) => void;
}

export function BlueprintHistorySelector({
  snapshots,
  currentSnapshotId,
  onSelectSnapshot
}: BlueprintHistorySelectorProps) {
  if (!snapshots || snapshots.length <= 1) {
    return null;
  }

  const currentSnapshot = snapshots.find(s => s.id === currentSnapshotId) || snapshots[0];

  return (
    <div className="flex items-center gap-2">
      <History className="h-4 w-4 text-muted-foreground" />
      <Select
        value={currentSnapshotId || snapshots[0]?.id}
        onValueChange={(id) => {
          const snapshot = snapshots.find(s => s.id === id);
          if (snapshot) onSelectSnapshot(snapshot);
        }}
      >
        <SelectTrigger className="w-[280px]">
          <SelectValue>
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              <span className="truncate">
                {format(new Date(currentSnapshot.created_at), "MMM d, yyyy 'at' h:mm a")}
              </span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {snapshots.map((snapshot, index) => (
            <SelectItem key={snapshot.id} value={snapshot.id}>
              <div className="flex items-center gap-2">
                <span>{format(new Date(snapshot.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                {index === 0 && (
                  <Badge variant="secondary" className="text-xs">Latest</Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {snapshot.target_role_1}
                {snapshot.target_role_2 && ` + ${snapshot.target_role_2}`}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
