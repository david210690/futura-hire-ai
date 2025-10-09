import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  score: number;
  name?: string;
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  scoreLabel?: string;
}

export const LeaderboardTable = ({ 
  entries, 
  currentUserId,
  scoreLabel = "Score" 
}: LeaderboardTableProps) => {
  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return <Trophy className="w-5 h-5 text-yellow-500" />;
    }
    if (rank === 2) {
      return <Medal className="w-5 h-5 text-gray-400" />;
    }
    if (rank === 3) {
      return <Medal className="w-5 h-5 text-amber-600" />;
    }
    return <span className="text-sm font-medium text-muted-foreground">#{rank}</span>;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">Rank</TableHead>
          <TableHead>User</TableHead>
          <TableHead className="text-right">{scoreLabel}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => {
          const isCurrentUser = entry.user_id === currentUserId;
          const initials = entry.name
            ?.split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase() || '??';

          return (
            <TableRow 
              key={entry.user_id}
              className={isCurrentUser ? 'bg-accent/50' : ''}
            >
              <TableCell>{getRankBadge(entry.rank)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <span className={isCurrentUser ? 'font-medium' : ''}>
                    {entry.name || 'Anonymous'}
                    {isCurrentUser && (
                      <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                    )}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right font-medium">
                {typeof entry.score === 'number' ? entry.score.toFixed(1) : entry.score}
              </TableCell>
            </TableRow>
          );
        })}
        {entries.length === 0 && (
          <TableRow>
            <TableCell colSpan={3} className="text-center text-muted-foreground">
              No data yet. Be the first to appear on the leaderboard!
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
