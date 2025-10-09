import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { OrgSettings } from "@/components/org/OrgSettings";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const OrgSettingsPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      setUser(userData);
    };

    checkAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar userName={user?.name} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>

        <OrgSettings />
      </main>
    </div>
  );
};

export default OrgSettingsPage;
