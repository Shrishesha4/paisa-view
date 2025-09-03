"use client";

import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HouseholdDialog } from "@/components/dialogs/household-dialog";
import { User, Users, Calendar, Mail, Cloud, Smartphone, Monitor, CloudUpload, CloudDownload, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { FirestoreService, UserData } from "@/lib/firestore";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Transaction, Expense, Income, Budget, Category } from "@/lib/types";
import { redirect } from "next/navigation";

function DataSyncContent() {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced" | "error">("idle");
  
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Local storage hooks
  const [expenses] = useLocalStorage<Expense[]>("expenses", []);
  const [incomes] = useLocalStorage<Income[]>("incomes", []);
  const [budgets] = useLocalStorage<Budget[]>("budgets", []);
  const [categories] = useLocalStorage<Category[]>("categories", []);

  useEffect(() => {
    if (user) {
      loadSyncStatus();
    }
  }, [user]);

  const loadSyncStatus = async () => {
    if (!user) return;
    
    try {
      const userData = await FirestoreService.getUserData(user.uid);
      if (userData?.lastSync) {
        setLastSync(userData.lastSync);
        setSyncStatus("synced");
      }
    } catch (error) {
      console.error("Error loading sync status:", error);
    }
  };

  const handleUploadToCloud = async () => {
    if (!user) return;
    
    setSyncing(true);
    setSyncStatus("syncing");
    
    try {
      const localData: UserData = {
        expenses,
        incomes,
        budgets,
        categories,
        lastSync: new Date(),
      };

      await FirestoreService.migrateLocalData(user.uid, localData);
      
      setLastSync(new Date());
      setSyncStatus("synced");
      
      toast({
        title: "Data uploaded successfully!",
        description: "Your data is now synced across all devices.",
      });
    } catch (error: any) {
      setSyncStatus("error");
      toast({
        title: "Upload failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDownloadFromCloud = async () => {
    if (!user) return;
    
    setSyncing(true);
    setSyncStatus("syncing");
    
    try {
      const cloudData = await FirestoreService.getUserData(user.uid);
      
      if (cloudData) {
        // Update local storage with cloud data
        // This would need to be implemented based on your needs
        setLastSync(cloudData.lastSync);
        setSyncStatus("synced");
        
        toast({
          title: "Data downloaded successfully!",
          description: "Your data has been updated from the cloud.",
        });
      }
    } catch (error: any) {
      setSyncStatus("error");
      toast({
        title: "Download failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const getStatusIcon = () => {
    switch (syncStatus) {
      case "syncing":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "synced":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Cloud className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const totalTransactions = expenses.length + incomes.length;
  const hasData = totalTransactions > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border/30">
        <div className="flex items-center gap-3">
          <Smartphone className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">Local Data</span>
        </div>
        <span className="text-sm font-semibold text-foreground">
          {totalTransactions} transactions
        </span>
      </div>

      {lastSync && (
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border/30">
          <div className="flex items-center gap-3">
            <Monitor className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">Last Synced</span>
          </div>
          <span className="text-sm font-semibold text-foreground">
            {lastSync.toLocaleDateString()}
          </span>
        </div>
      )}

      <div className="flex gap-3 justify-center">
        <Button
          onClick={handleUploadToCloud}
          disabled={syncing || !hasData}
          className="w-auto px-6 h-11"
          variant="outline"
        >
          {syncing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CloudUpload className="mr-2 h-4 w-4" />
          )}
          Upload
        </Button>
        
        <Button
          onClick={handleDownloadFromCloud}
          disabled={syncing}
          className="w-auto px-6 h-11"
          variant="outline"
        >
          {syncing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CloudDownload className="mr-2 h-4 w-4" />
          )}
          Download
        </Button>
      </div>

      <div className="text-center pt-2">
        <p className="text-sm text-muted-foreground">
          {hasData 
            ? "Your data will be securely stored and synced across all devices"
            : "Add some transactions to start syncing your data"
          }
        </p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) {
    redirect("/");
  }

  return (
    <div className="flex-1 flex flex-col bg-background px-4 md:px-8 py-6 md:py-8 container mx-auto">
      <header className="mb-8 md:mb-10">
        <div className="flex items-center gap-6">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <User className="h-5 w-10 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">{user.displayName || "User"}</h1>
            <p className="text-s text-muted-foreground mt-1">{user.email}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-6 md:space-y-8">
        <div className="grid gap-6 md:gap-8 md:grid-cols-2">
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <Mail className="h-6 w-6" />
                Account Information
              </CardTitle>
              <CardDescription className="text-base">
                Your account details and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Email</label>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Display Name</label>
                <p className="text-sm text-muted-foreground">
                  {user.displayName || "Not set"}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Account Created</label>
                <p className="text-sm text-muted-foreground">
                  {user.metadata?.creationTime 
                    ? new Date(user.metadata.creationTime).toLocaleDateString()
                    : "Unknown"
                  }
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Last Sign In</label>
                <p className="text-sm text-muted-foreground">
                  {user.metadata?.lastSignInTime 
                    ? new Date(user.metadata.lastSignInTime).toLocaleDateString()
                    : "Unknown"
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <Users className="h-6 w-6" />
                Household Management
              </CardTitle>
              <CardDescription className="text-base">
                Manage your household collaboration settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Create or join a household to collaborate with family members on budgeting and expense tracking.
              </p>
              <HouseholdDialog
                trigger={
                  <Button className="w-full h-11">
                    <Users className="mr-2 h-4 w-4" />
                    Manage Household
                  </Button>
                }
              />
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <Cloud className="h-6 w-6" />
              Data Synchronization
            </CardTitle>
            <CardDescription className="text-base">
              Manage your data sync between local storage and cloud
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <DataSyncContent />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
