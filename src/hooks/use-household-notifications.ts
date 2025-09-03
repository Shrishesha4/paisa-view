import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { FirestoreService } from '@/lib/firestore';

export function useHouseholdNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const checkHouseholdNotifications = async () => {
      try {
        const userData = await FirestoreService.getUserData(user.uid);
        
        if (userData?.householdRemoved) {
          // Show notification about household removal
          toast({
            title: "Household Removed",
            description: "Your household has been removed. You can create or join a new one.",
            variant: "destructive",
          });

          // Clear the notification flags
          await FirestoreService.clearHouseholdNotification(user.uid);
        }
      } catch (error) {
        console.error('Error checking household notifications:', error);
      }
    };

    // Check for notifications when user logs in
    checkHouseholdNotifications();
  }, [user, toast]);
}
