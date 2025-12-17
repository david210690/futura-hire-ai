import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { OrgSettings } from "@/components/org/OrgSettings";

const OrgSettingsPage = () => {
  return (
    <SidebarLayout userRole="recruiter">
      <div className="p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Team Management</h1>
          <p className="text-muted-foreground">Manage members and invitations for your organization</p>
        </div>
        <OrgSettings />
      </div>
    </SidebarLayout>
  );
};

export default OrgSettingsPage;
