"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { FirestoreService, UserData } from "@/lib/firestore";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Transaction, Expense, Income, Budget, Category } from "@/lib/types";
import { 
  CloudUpload, 
  CloudDownload, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Smartphone,
  Monitor
} from "lucide-react";

export function DataSync() {
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
        // Note: In a real app, you'd want to merge this more intelligently
        localStorage.setItem("expenses", JSON.stringify(cloudData.expenses));
        localStorage.setItem("incomes", JSON.stringify(cloudData.incomes));
        localStorage.setItem("budgets", JSON.stringify(cloudData.budgets));
        localStorage.setItem("categories", JSON.stringify(cloudData.categories));
        
        setLastSync(cloudData.lastSync);
        setSyncStatus("synced");
        
        toast({
          title: "Data downloaded successfully!",
          description: "Your local data has been updated from the cloud.",
        });
        
        // Reload the page to reflect changes
        window.location.reload();
      } else {
        toast({
          title: "No cloud data found",
          description: "You don't have any data stored in the cloud yet.",
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
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case "synced":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <CloudUpload className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (syncStatus) {
      case "syncing":
        return "Syncing...";
      case "synced":
        return "Synced";
      case "error":
        return "Sync Error";
      default:
        return "Not Synced";
    }
  };

  if (!user) {
    return null;
  }

  const totalTransactions = expenses.length + incomes.length;
  const hasData = totalTransactions > 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Data Sync
        </CardTitle>
        <CardDescription>
          Keep your data synchronized across all your devices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Local Data</span>
          </div>
          <span className="text-sm font-medium">
            {totalTransactions} transactions
          </span>
        </div>

        {lastSync && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Last Synced</span>
            </div>
            <span className="text-sm font-medium">
              {lastSync.toLocaleDateString()}
            </span>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleUploadToCloud}
            disabled={syncing || !hasData}
            className="flex-1"
            variant="outline"
          >
            {syncing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CloudUpload className="mr-2 h-4 w-4" />
            )}
            Upload to Cloud
          </Button>
          
          <Button
            onClick={handleDownloadFromCloud}
            disabled={syncing}
            className="flex-1"
            variant="outline"
          >
            {syncing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CloudDownload className="mr-2 h-4 w-4" />
            )}
            Download from Cloud
          </Button>
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            {hasData 
              ? "Your data will be securely stored and synced across all devices"
              : "Add some transactions to start syncing your data"
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
