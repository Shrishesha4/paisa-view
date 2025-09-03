"use client";

import { useHouseholdNotifications } from "@/hooks/use-household-notifications";

export function HouseholdNotificationProvider({ children }: { children: React.ReactNode }) {
  // This hook will automatically check for household notifications when users log in
  useHouseholdNotifications();
  
  return <>{children}</>;
}
