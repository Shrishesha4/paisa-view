"use client";

import { useAuth } from "@/lib/auth-context";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  ArrowLeft,
  Users, 
  Settings,
  Trash2,
  Crown,
  UserMinus,
  UserPlus,
  Save,
  Loader2,
  AlertTriangle
} from "lucide-react";
import { FirestoreService, UserData, Household, JoinRequest } from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";

export default function HouseholdSettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [householdMembers, setHouseholdMembers] = useState<UserData[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [householdName, setHouseholdName] = useState("");
  const [newAdminId, setNewAdminId] = useState("");

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    loadHouseholdData();
  }, [user, router]);

  const loadHouseholdData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await FirestoreService.getUserData(user.uid);
      setUserData(data);
      
      if (data?.householdId) {
        // Load household data
        const householdData = await FirestoreService.getHouseholdData(data.householdId);
        setHouseholdMembers(householdData);
        
        // Load household details
        const householdDoc = await FirestoreService.getHousehold(data.householdId);
        setHousehold(householdDoc);
        if (householdDoc) {
          setHouseholdName(householdDoc.name);
        }
        
        // Load join requests if user is admin
        if (data.isAdmin) {
          const requests = await FirestoreService.getHouseholdJoinRequests(data.householdId);
          setJoinRequests(requests);
        }
      }
    } catch (error) {
      console.error("Error loading household data:", error);
      toast({
        title: "Error",
        description: "Failed to load household data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateHouseholdName = async () => {
    if (!household || !userData?.isAdmin) return;
    
    setSaving(true);
    try {
      await FirestoreService.updateHouseholdName(household.id, householdName);
      toast({
        title: "Success",
        description: "Household name updated successfully",
      });
      await loadHouseholdData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update household name",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTransferAdmin = async () => {
    if (!household || !userData?.isAdmin || !newAdminId) return;
    
    setSaving(true);
    try {
      await FirestoreService.transferAdmin(household.id, newAdminId);
      toast({
        title: "Success",
        description: "Admin role transferred successfully",
      });
      setNewAdminId("");
      await loadHouseholdData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to transfer admin role",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!household || !userData?.isAdmin) return;
    
    try {
      console.log('Removing member from settings page:', memberId);
      await FirestoreService.removeMember(household.id, memberId);
      
      toast({
        title: "Success",
        description: "Member removed successfully",
      });
      
      await loadHouseholdData();
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove member",
        variant: "destructive",
      });
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    if (!household || !userData?.isAdmin) return;
    
    try {
      setSaving(true);
      await FirestoreService.approveJoinRequest(requestId);
      
      toast({
        title: "Success",
        description: "Join request approved and user added to household",
      });
      
      await loadHouseholdData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve request",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRejectRequest = async (requestId: string, adminNotes?: string) => {
    if (!household || !userData?.isAdmin) return;
    
    try {
      setSaving(true);
      await FirestoreService.rejectJoinRequest(requestId, adminNotes);
      
      toast({
        title: "Success",
        description: "Join request rejected",
      });
      
      await loadHouseholdData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject request",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHousehold = async () => {
    if (!household || !userData?.isAdmin) return;
    
    if (!confirm("Are you sure you want to delete this household? This action cannot be undone and all members will be removed.")) {
      return;
    }
    
    setSaving(true);
    try {
      await FirestoreService.deleteHousehold(household.id);
      toast({
        title: "Household Deleted",
        description: "The household has been permanently deleted",
      });
      router.push('/');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete household",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col bg-background px-4 md:px-8 py-6 md:py-8 container mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Loading household settings...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!userData?.householdId || !household) {
    return (
      <div className="flex-1 flex flex-col bg-background px-4 md:px-8 py-6 md:py-8 container mx-auto">
        <div className="text-center space-y-4">
          <Settings className="mx-auto h-16 w-16 text-muted-foreground" />
          <h1 className="text-2xl font-bold">No Household Found</h1>
          <p className="text-muted-foreground">
            You're not part of any household.
          </p>
          <Button onClick={() => router.push('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!userData?.isAdmin) {
    return (
      <div className="flex-1 flex flex-col bg-background px-4 md:px-8 py-6 md:py-8 container mx-auto">
        <div className="text-center space-y-4">
          <Crown className="mx-auto h-16 w-16 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Admin Access Required</h1>
          <p className="text-muted-foreground">
            Only household admins can access settings.
          </p>
          <Button onClick={() => router.push('/household')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Household
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background px-4 md:px-8 py-6 md:py-8 container mx-auto">
      <header className="mb-6 md:mb-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.push('/household')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Household Settings</h1>
            <p className="text-muted-foreground">
              Manage your household configuration and members
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Household Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Household Information
            </CardTitle>
            <CardDescription>
              Update basic household details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="householdName">Household Name</Label>
              <div className="flex gap-2">
                <Input
                  id="householdName"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  placeholder="Enter household name"
                />
                <Button 
                  onClick={handleUpdateHouseholdName} 
                  disabled={saving || householdName === household.name}
                  size="sm"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                <strong>Created:</strong> {household.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Members:</strong> {householdMembers.length}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Admin Transfer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Transfer Admin Role
            </CardTitle>
            <CardDescription>
              Transfer admin privileges to another member
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newAdmin">Select New Admin</Label>
              <select
                id="newAdmin"
                value={newAdminId}
                onChange={(e) => setNewAdminId(e.target.value)}
                className="w-full p-2 border rounded-md bg-background"
              >
                <option value="">Choose a member...</option>
                {householdMembers
                  .filter(member => member.id !== user?.uid)
                  .map((member, index) => (
                    <option key={`${member.id || index}`} value={member.id || ''}>
                      {member.displayName || member.email || "Unknown User"}
                    </option>
                  ))}
              </select>
            </div>
            
            <Button 
              onClick={handleTransferAdmin} 
              disabled={!newAdminId || saving}
              variant="outline"
              className="w-full"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Crown className="mr-2 h-4 w-4" />}
              Transfer Admin Role
            </Button>
          </CardContent>
        </Card>

        {/* Member Management */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Member Management
            </CardTitle>
            <CardDescription>
              Manage household members and join requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="members" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="members">Members ({householdMembers.length})</TabsTrigger>
                <TabsTrigger value="requests">Join Requests ({joinRequests.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="members" className="space-y-4 mt-4">
                {householdMembers.map((member, index) => {
                  console.log('Member data:', { 
                    id: member.id, 
                    householdId: member.householdId, 
                    email: member.email,
                    displayName: member.displayName 
                  });
                  
                  return (
                    <div key={`${member.id || index}`} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {member.displayName?.[0]?.toUpperCase() || member.email?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {member.displayName || member.email || "Unknown User"}
                          </p>
                          <div className="flex gap-2">
                            {member.isAdmin && (
                              <Badge variant="secondary">Admin</Badge>
                            )}
                            <Badge variant="outline">
                              ₹{(member.expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0).toLocaleString()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      {member.id !== user?.uid && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            console.log('Removing member with ID:', member.id);
                            handleRemoveMember(member.id!);
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <UserMinus className="mr-2 h-4 w-4" />
                          Remove
                        </Button>
                      )}
                    </div>
                  );
                })}
              </TabsContent>
              
              <TabsContent value="requests" className="space-y-4 mt-4">
                {joinRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No pending join requests</p>
                    <p className="text-sm">When users request to join, they'll appear here</p>
                  </div>
                ) : (
                  joinRequests.map((request) => (
                    <div key={request.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {request.userDisplayName?.[0]?.toUpperCase() || request.userEmail?.[0]?.toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {request.userDisplayName || request.userEmail}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Requested {request.createdAt?.toDate?.()?.toLocaleDateString() || 'recently'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleApproveRequest(request.id)}
                            disabled={saving}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
                          </Button>
                          <Button
                            onClick={() => handleRejectRequest(request.id)}
                            disabled={saving}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>



        {/* Danger Zone */}
        <Card className="md:col-span-2 border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription className="text-red-600">
              Irreversible actions that will affect all household members
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border border-red-200 rounded-lg bg-red-100/50">
              <h4 className="font-medium text-red-800 mb-2">Delete Household</h4>
              <p className="text-sm text-red-700 mb-4">
                This will permanently delete the household and remove all members. 
                All financial data will be lost.
              </p>
              <Button
                variant="destructive"
                onClick={handleDeleteHousehold}
                disabled={saving}
                className="w-full"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Delete Household
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
