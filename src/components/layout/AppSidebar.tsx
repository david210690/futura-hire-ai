import { useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Briefcase, 
  ClipboardList, 
  DollarSign,
  BarChart3,
  Users,
  Settings,
  Bot,
  Radar,
  TrendingUp,
  Mic,
  Video,
  User,
  Sparkles,
  PlusCircle,
  FileText,
  Target,
  Zap,
  ChevronDown,
  Compass
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

interface AppSidebarProps {
  userRole: "recruiter" | "candidate";
  userName?: string;
  orgName?: string;
}

const recruiterNavGroups = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { label: "Analytics", path: "/analytics", icon: BarChart3, description: "Hiring metrics" },
    ],
  },
  {
    label: "Hiring",
    items: [
      { label: "Create Job", path: "/create-job", icon: PlusCircle },
      { label: "Role Designer", path: "/role-designer", icon: Briefcase },
      { label: "Assessments", path: "/assessments", icon: ClipboardList },
    ],
  },
  {
    label: "AI Tools",
    items: [
      { label: "Decision Room", path: "/jobs", icon: Target, description: "Via Job Detail" },
      { label: "Pipeline Health", path: "/dashboard", icon: Zap, description: "Via Job Detail" },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Organization", path: "/org/settings", icon: Settings },
      { label: "Billing", path: "/billing", icon: DollarSign },
      { label: "Pricing Plans", path: "/pricing", icon: FileText },
    ],
  },
];

const candidateNavGroups = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", path: "/candidate/dashboard", icon: LayoutDashboard },
      { label: "My Profile", path: "/candidate/profile", icon: User },
    ],
  },
  {
    label: "Job Search",
    items: [
      { label: "AI Job Twin", path: "/job-twin", icon: Bot, description: "Smart job matching" },
      { label: "Opportunity Radar", path: "/opportunity-radar", icon: Radar, description: "Role family insights" },
    ],
  },
  {
    label: "Career Growth",
    items: [
      { label: "Career Trajectory", path: "/career-trajectory", icon: TrendingUp, description: "Your career path" },
      { label: "Growth Blueprint", path: "/career-blueprint", icon: Compass, description: "Personal development plan" },
    ],
  },
  {
    label: "Interview Prep",
    items: [
      { label: "Practice Sessions", path: "/interview-practice", icon: Mic, description: "Text-based practice" },
      { label: "Voice Interviews", path: "/voice-interview", icon: Video, description: "AI voice practice" },
    ],
  },
];

export function AppSidebar({ userRole, userName, orgName }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  
  const navGroups = userRole === "recruiter" ? recruiterNavGroups : candidateNavGroups;
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    // Default all groups to open
    const initial: Record<string, boolean> = {};
    navGroups.forEach(group => {
      initial[group.label] = true;
    });
    return initial;
  });

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div 
          className="flex items-center gap-2 px-2 py-2 cursor-pointer" 
          onClick={() => navigate(userRole === 'recruiter' ? '/dashboard' : '/candidate/dashboard')}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                FuturaHire
              </span>
              {orgName && (
                <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                  {orgName}
                </span>
              )}
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group, groupIndex) => (
          <Collapsible
            key={group.label}
            open={openGroups[group.label]}
            onOpenChange={() => toggleGroup(group.label)}
          >
            <SidebarGroup>
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent rounded-md transition-colors">
                  {!isCollapsed && (
                    <>
                      <span className="flex-1">{group.label}</span>
                      <ChevronDown className={cn(
                        "h-4 w-4 transition-transform",
                        openGroups[group.label] ? "" : "-rotate-90"
                      )} />
                    </>
                  )}
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.path + item.label}>
                        <SidebarMenuButton
                          onClick={() => navigate(item.path)}
                          isActive={isActive(item.path)}
                          tooltip={isCollapsed ? item.label : undefined}
                          className={cn(
                            "w-full",
                            isActive(item.path) && "bg-primary/10 text-primary font-medium"
                          )}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!isCollapsed && (
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="truncate">{item.label}</span>
                              {item.description && (
                                <span className="text-xs text-muted-foreground truncate">
                                  {item.description}
                                </span>
                              )}
                            </div>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
            {groupIndex < navGroups.length - 1 && <SidebarSeparator />}
          </Collapsible>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!isCollapsed && userName && (
          <div className="px-2 py-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate">{userName}</span>
                <span className="text-xs text-muted-foreground capitalize">{userRole}</span>
              </div>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
