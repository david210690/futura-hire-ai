import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Trash2, Mail } from "lucide-react";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { CultureDNAChart } from "./CultureDNAChart";

interface Member {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  users: {
    name: string;
    email: string;
  };
}

interface Invite {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
}

export const OrgSettings = () => {
  const { currentOrg, isAdmin } = useCurrentOrg();
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("recruiter");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentOrg && isAdmin) {
      loadMembers();
      loadInvites();
    }
  }, [currentOrg, isAdmin]);

  const loadMembers = async () => {
    if (!currentOrg) return;

    try {
      const { data, error } = await supabase
        .from('org_members')
        .select(`
          id,
          user_id,
          role,
          created_at
        `)
        .eq('org_id', currentOrg.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading members:', error);
        toast({ variant: "destructive", description: error.message });
        return;
      }

      // Fetch user details separately
      if (data && data.length > 0) {
        const userIds = data.map(m => m.user_id);
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, name, email')
          .in('id', userIds);

        if (usersError) {
          console.error('Error loading users:', usersError);
          toast({ variant: "destructive", description: usersError.message });
          return;
        }

        // Combine the data
        const membersWithUsers = data.map(member => ({
          ...member,
          users: usersData?.find(u => u.id === member.user_id) || { name: 'Unknown', email: 'unknown@example.com' }
        }));

        setMembers(membersWithUsers as any);
      } else {
        setMembers([]);
      }
    } catch (error: any) {
      console.error('Unexpected error:', error);
      toast({ variant: "destructive", description: error.message });
    }
  };

  const loadInvites = async () => {
    if (!currentOrg) return;

    const { data, error } = await supabase
      .from('invites')
      .select('*')
      .eq('org_id', currentOrg.id)
      .is('accepted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ variant: "destructive", description: error.message });
    } else {
      setInvites(data || []);
    }
  };

  const sendInvite = async () => {
    if (!currentOrg || !inviteEmail) return;

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-invite', {
        body: {
          orgId: currentOrg.id,
          email: inviteEmail,
          role: inviteRole,
        },
      });

      if (error) throw error;

      toast({ description: "Invitation sent successfully" });
      setInviteEmail("");
      loadInvites();
    } catch (error: any) {
      toast({ variant: "destructive", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const updateMemberRole = async (memberId: string, newRole: 'owner' | 'admin' | 'recruiter' | 'viewer') => {
    const { error } = await supabase
      .from('org_members')
      .update({ role: newRole })
      .eq('id', memberId);

    if (error) {
      toast({ variant: "destructive", description: error.message });
    } else {
      toast({ description: "Member role updated" });
      loadMembers();
    }
  };

  const removeMember = async (memberId: string) => {
    const { error } = await supabase
      .from('org_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      toast({ variant: "destructive", description: error.message });
    } else {
      toast({ description: "Member removed" });
      loadMembers();
    }
  };

  const revokeInvite = async (inviteId: string) => {
    const { error } = await supabase
      .from('invites')
      .delete()
      .eq('id', inviteId);

    if (error) {
      toast({ variant: "destructive", description: error.message });
    } else {
      toast({ description: "Invite revoked" });
      loadInvites();
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization Settings</CardTitle>
          <CardDescription>
            You need admin permissions to manage organization settings.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Settings</CardTitle>
        <CardDescription>
          Manage members and invitations for {currentOrg?.name}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="members">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="invites">Invitations</TabsTrigger>
            <TabsTrigger value="culture">Culture DNA</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>{member.users.name}</TableCell>
                    <TableCell>{member.users.email}</TableCell>
                    <TableCell>
                      <Select
                        value={member.role}
                        onValueChange={(value) => updateMemberRole(member.id, value as 'owner' | 'admin' | 'recruiter' | 'viewer')}
                        disabled={member.role === 'owner'}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="recruiter">Recruiter</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      {member.role !== 'owner' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMember(member.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="invites" className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="w-40">
                <Label htmlFor="invite-role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="recruiter">Recruiter</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={sendInvite} disabled={loading || !inviteEmail}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {invite.email}
                    </TableCell>
                    <TableCell className="capitalize">{invite.role}</TableCell>
                    <TableCell>
                      {new Date(invite.expires_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeInvite(invite.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {invites.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No pending invitations
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="culture" className="space-y-4">
            {currentOrg && <CultureDNAChart orgId={currentOrg.id} />}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
