import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { FirestoreService, JoinRequest } from '@/lib/firestore';

export function useJoinRequests() {
  const { user } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setPendingRequests([]);
      return;
    }

    const checkPendingRequests = async () => {
      setLoading(true);
      try {
        // Get all pending requests for the current user
        const userData = await FirestoreService.getUserData(user.uid);
        if (userData?.householdId) {
          // User is already in a household, no pending requests
          setPendingRequests([]);
        } else {
          // Check for pending requests across all households
          // This is a simplified approach - in a real app you might want to store user's pending requests
          setPendingRequests([]);
        }
      } catch (error) {
        console.error('Error checking pending requests:', error);
        setPendingRequests([]);
      } finally {
        setLoading(false);
      }
    };

    checkPendingRequests();
  }, [user]);

  return { pendingRequests, loading };
}
