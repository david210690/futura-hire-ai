import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { CalendarSettings } from "@/components/calendar/CalendarSettings";

const CandidateSettingsPage = () => {
  return (
    <SidebarLayout userRole="candidate">
      <div className="p-6 max-w-4xl space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your integrations and preferences</p>
        </div>
        
        <CalendarSettings />
      </div>
    </SidebarLayout>
  );
};

export default CandidateSettingsPage;
