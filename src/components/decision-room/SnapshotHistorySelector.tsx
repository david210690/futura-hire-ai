import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { History, ChevronDown, Check } from "lucide-react";
import { format } from "date-fns";

interface SnapshotHistoryItem {
  id: string;
  created_at: string;
}

interface SnapshotHistorySelectorProps {
  snapshots: SnapshotHistoryItem[];
  currentSnapshotId: string | null;
  onSelectSnapshot: (snapshotId: string) => void;
  loading?: boolean;
}

export function SnapshotHistorySelector({
  snapshots,
  currentSnapshotId,
  onSelectSnapshot,
  loading,
}: SnapshotHistorySelectorProps) {
  if (snapshots.length <= 1) {
    return null;
  }

  const currentSnapshot = snapshots.find((s) => s.id === currentSnapshotId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={loading}>
          <History className="h-4 w-4" />
          History ({snapshots.length})
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Snapshot History</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {snapshots.map((snapshot, idx) => (
          <DropdownMenuItem
            key={snapshot.id}
            onClick={() => onSelectSnapshot(snapshot.id)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex flex-col">
              <span className="text-sm">
                {idx === 0 ? "Latest" : `Version ${snapshots.length - idx}`}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(snapshot.created_at), "MMM d, yyyy 'at' h:mm a")}
              </span>
            </div>
            {snapshot.id === currentSnapshotId && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
