"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";

export function DashboardHeader() {
  return (
    <div className="flex items-center justify-between p-4 md:p-6">
      <div className="flex items-center gap-2">
         <SidebarTrigger className="md:hidden" />
         <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
      </div>
    </div>
  );
}
