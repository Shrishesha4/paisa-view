"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WifiOff, RefreshCw, Home, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function OfflinePage() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    window.location.reload();
  };

  const handleGoHome = () => {
    router.push('/');
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <WifiOff className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">You're Offline</CardTitle>
          <CardDescription>
            This page isn't available offline. Check your internet connection and try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
              {isOnline ? 'Internet connection restored' : 'No internet connection'}
            </div>
            {retryCount > 0 && (
              <div className="text-xs text-muted-foreground">
                Retry attempt: {retryCount}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={handleRetry} disabled={!isOnline} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleGoBack} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
              <Button variant="outline" onClick={handleGoHome} className="flex-1">
                <Home className="mr-2 h-4 w-4" />
                Home
              </Button>
            </div>
          </div>

          <div className="rounded-lg bg-muted p-3">
            <h4 className="text-sm font-medium mb-2">What you can do offline:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• View cached pages</li>
              <li>• Add expenses and income</li>
              <li>• Set budgets</li>
              <li>• View your financial data</li>
              <li>• All changes will sync when online</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
