"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

type DashboardHeaderProps = {
  onSetBudget: () => void;
};

export function DashboardHeader({ onSetBudget }: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 md:p-6">
      <div className="flex items-center gap-2">
         <SidebarTrigger className="md:hidden" />
         <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
      </div>
      <Button variant="outline" size="icon" onClick={onSetBudget}>
        <Settings className="h-4 w-4" />
        <span className="sr-only">Set Budget</span>
      </Button>
    </div>
  );
}
