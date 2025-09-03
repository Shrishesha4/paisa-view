"use client";

import { useOfflineSync } from "@/hooks/use-offline-sync";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  CloudUpload
} from "lucide-react";
import { cn } from "@/lib/utils";

export function OfflineSyncIndicator() {
  const {
    syncState,
    isOnline,
    isSyncing,
    hasPendingChanges,
    pendingChangesCount,
    lastSync,
    triggerManualSync,
    getSyncStatus,
    getSyncStatusText,
    getSyncStatusIcon,
  } = useOfflineSync();

  const status = getSyncStatus();

  if (status === 'not-authenticated') {
    return null; // Don't show for unauthenticated users
  }

  const getStatusColor = () => {
    switch (status) {
      case 'offline':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'syncing':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'pending':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'synced':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'offline':
        return <WifiOff className="h-4 w-4" />;
      case 'syncing':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'synced':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <CloudUpload className="h-4 w-4" />;
    }
  };

  return (
    <Card className={cn("border-2", getStatusColor())}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {getSyncStatusText()}
              </span>
              {lastSync && (
                <span className="text-xs text-muted-foreground">
                  Last sync: {lastSync.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Network status indicator */}
            <Badge variant="outline" className="text-xs">
              {isOnline ? (
                <Wifi className="h-3 w-3 mr-1" />
              ) : (
                <WifiOff className="h-3 w-3 mr-1" />
              )}
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
            
            {/* Pending changes count */}
            {hasPendingChanges && (
              <Badge variant="secondary" className="text-xs">
                {pendingChangesCount} pending
              </Badge>
            )}
            
            {/* Manual sync button */}
            {isOnline && hasPendingChanges && !isSyncing && (
              <Button
                size="sm"
                variant="outline"
                onClick={triggerManualSync}
                disabled={isSyncing}
                className="h-7 px-2 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Sync Now
              </Button>
            )}
          </div>
        </div>
        
        {/* Detailed sync queue info */}
        {hasPendingChanges && syncState.syncQueue.length > 0 && (
          <div className="mt-2 pt-2 border-t border-current/20">
            <div className="text-xs text-muted-foreground">
              Pending changes:
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {syncState.syncQueue.slice(0, 5).map((item) => (
                <Badge key={item.id} variant="outline" className="text-xs">
                  {item.type}: {item.action}
                </Badge>
              ))}
              {syncState.syncQueue.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{syncState.syncQueue.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
