"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { FirestoreService, UserData } from "@/lib/firestore";
import { Loader2, Users, UserPlus, Home } from "lucide-react";
import { useRouter } from "next/navigation";

interface HouseholdDialogProps {
  trigger: React.ReactNode;
}

export function HouseholdDialog({ trigger }: HouseholdDialogProps) {
  const [mode, setMode] = useState<"choice" | "create" | "join">("choice");
  const [householdName, setHouseholdName] = useState("");
  const [joinHouseholdName, setJoinHouseholdName] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (user && open) {
      loadUserData();
    }
  }, [user, open]);

  const loadUserData = async () => {
    if (!user) return;
    
    try {
      // Force refresh to get latest state
      const data = await FirestoreService.forceRefreshUserData(user.uid);
      setUserData(data);
      console.log('Loaded fresh user data:', data);
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const handleCreateHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Check if user is already in a household
    const isInHousehold = await FirestoreService.isUserInHousehold(user.uid);
    if (isInHousehold) {
      toast({
        title: "Already in Household",
        description: "You are already part of a household. Please leave your current household first.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      await FirestoreService.createHousehold(householdName, user.uid, user.email || undefined, user.displayName || undefined);
      toast({
        title: "Household created successfully!",
        description: "You are now the admin of this household.",
      });
      setOpen(false);
      resetForm();
      await loadUserData();
      // Redirect to household page
      router.push('/household');
    } catch (error: any) {
      toast({
        title: "Failed to create household",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

    const handleJoinHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be signed in to join a household.",
        variant: "destructive",
      });
      return;
    }
    
    console.log('User authentication state:', { 
      uid: user.uid, 
      email: user.email, 
      isAuthenticated: !!user 
    });
    
    // Force refresh user data to ensure latest state
    const refreshedUserData = await FirestoreService.forceRefreshUserData(user.uid);
    
    // Check if user is already in a household
    const isInHousehold = !!(refreshedUserData?.householdId);
    if (isInHousehold) {
      toast({
        title: "Already in Household",
        description: "You are already part of a household. Please leave your current household first.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      // First find the household by name
      const householdId = await FirestoreService.findHouseholdByName(joinHouseholdName);
      
      if (!householdId) {
        toast({
          title: "Household not found",
          description: "No household found with that name. Please check the name and try again.",
          variant: "destructive",
        });
        return;
      }
      
      console.log('Found household ID:', householdId);
      
      // Check if user is already in this household
      if (userData?.householdId === householdId) {
        toast({
          title: "Already a member",
          description: "You are already a member of this household.",
          variant: "destructive",
        });
        return;
      }
      
      // Send join request instead of joining directly
      await FirestoreService.sendJoinRequest(householdId, user.uid, user.email || '', user.displayName || undefined);
      toast({
        title: "Join request sent!",
        description: "Your request has been sent to the household admin. You'll be notified when it's approved or rejected.",
      });
      setOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Send join request error:', error);
      toast({
        title: "Failed to send join request",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveHousehold = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      await FirestoreService.leaveHousehold(user.uid);
      toast({
        title: "Left household successfully",
        description: "You are no longer part of this household.",
      });
      await loadUserData();
    } catch (error: any) {
      toast({
        title: "Failed to leave household",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setHouseholdName("");
    setJoinHouseholdName("");
    setMode("choice");
  };

  const renderContent = () => {
    if (mode === "choice") {
      return (
        <div className="space-y-4">
          <div className="text-center space-y-4">
            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              Choose how you'd like to get started with household collaboration
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => setMode("create")}
                className="flex-1"
              >
                <Home className="mr-2 h-4 w-4" />
                Create New
              </Button>
              <Button
                onClick={() => setMode("join")}
                variant="outline"
                className="flex-1"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Join Existing
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (mode === "create") {
      return (
        <div className="space-y-4">
          <form onSubmit={handleCreateHousehold} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="householdName">Household Name</Label>
              <Input
                id="householdName"
                type="text"
                placeholder="Enter household name"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Home className="mr-2 h-4 w-4" />
              Create Household
            </Button>
          </form>
          <Button
            onClick={() => setMode("choice")}
            variant="ghost"
            className="w-full"
          >
            ← Back to Options
          </Button>
        </div>
      );
    }

    if (mode === "join") {
      return (
        <div className="space-y-4">
          <form onSubmit={handleJoinHousehold} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="joinHouseholdName">Household Name</Label>
              <Input
                id="joinHouseholdName"
                type="text"
                placeholder="Enter household name"
                value={joinHouseholdName}
                onChange={(e) => setJoinHouseholdName(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <UserPlus className="mr-2 h-4 w-4" />
              Join Household
            </Button>
          </form>
          <Button
            onClick={() => setMode("choice")}
            variant="ghost"
            className="w-full"
          >
            ← Back to Options
          </Button>
        </div>
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "choice" && "Household Collaboration"}
            {mode === "create" && "Create Household"}
            {mode === "join" && "Join Household"}
          </DialogTitle>
          <DialogDescription>
            {mode === "choice" && "Get started with household collaboration for family budgeting."}
            {mode === "create" && "Create a new household to collaborate with family members."}
            {mode === "join" && "Join an existing household using the household name."}
          </DialogDescription>
        </DialogHeader>
        
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
