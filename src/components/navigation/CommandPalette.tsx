import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Briefcase,
  ClipboardList,
  BarChart3,
  Settings,
  Bot,
  Radar,
  TrendingUp,
  Mic,
  Video,
  User,
  PlusCircle,
  BookOpen,
  Target,
  DollarSign,
  Compass,
  Search,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CommandPaletteProps {
  userRole: "recruiter" | "candidate";
}

const recruiterCommands = [
  { group: "Quick Actions", items: [
    { label: "Create New Job", path: "/create-job", icon: PlusCircle, badge: "action" },
    { label: "View Dashboard", path: "/dashboard", icon: LayoutDashboard },
  ]},
  { group: "Hiring Tools", items: [
    { label: "Role Designer", path: "/role-designer", icon: Briefcase, description: "Design job requirements" },
    { label: "Assessments", path: "/assessments", icon: ClipboardList, description: "Create & manage tests" },
    { label: "Question Bank", path: "/question-bank", icon: BookOpen, description: "Interview questions library" },
    { label: "Decision Room", path: "/jobs", icon: Target, description: "AI-powered candidate evaluation" },
  ]},
  { group: "Analytics & Settings", items: [
    { label: "Analytics", path: "/analytics", icon: BarChart3, description: "Hiring metrics & trends" },
    { label: "Team Management", path: "/org/settings", icon: Users, description: "Manage team members" },
    { label: "Billing", path: "/billing", icon: DollarSign },
    { label: "Pricing Plans", path: "/pricing", icon: Settings },
  ]},
];

const candidateCommands = [
  { group: "Quick Actions", items: [
    { label: "My Dashboard", path: "/candidate/dashboard", icon: LayoutDashboard },
    { label: "My Profile", path: "/candidate/profile", icon: User },
  ]},
  { group: "Job Search", items: [
    { label: "AI Job Twin", path: "/job-twin", icon: Bot, description: "Smart job matching", badge: "AI" },
    { label: "Opportunity Radar", path: "/opportunity-radar", icon: Radar, description: "Discover role families", badge: "AI" },
  ]},
  { group: "Career Growth", items: [
    { label: "Career Trajectory", path: "/career-trajectory", icon: TrendingUp, description: "Your career path", badge: "AI" },
    { label: "Growth Blueprint", path: "/career-blueprint", icon: Compass, description: "Personal development" },
  ]},
  { group: "Interview Prep", items: [
    { label: "Practice Sessions", path: "/interview-practice", icon: Mic, description: "Text-based practice" },
    { label: "Voice Interviews", path: "/voice-interview", icon: Video, description: "AI voice practice", badge: "AI" },
  ]},
];

export function CommandPalette({ userRole }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const commands = userRole === "recruiter" ? recruiterCommands : candidateCommands;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search features..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {commands.map((group, idx) => (
          <div key={group.group}>
            <CommandGroup heading={group.group}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.path}
                  onSelect={() => runCommand(() => navigate(item.path))}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span>{item.label}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            {idx < commands.length - 1 && <CommandSeparator />}
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

export function CommandTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted/50 hover:bg-muted rounded-md border transition-colors"
    >
      <Search className="h-4 w-4" />
      <span className="hidden sm:inline">Search...</span>
      <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-xs">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
}
