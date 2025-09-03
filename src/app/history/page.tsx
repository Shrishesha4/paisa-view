import { HistoryClient } from "@/components/history-client";
import { Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/sidebar-nav";
import { Suspense } from "react";

function HistoryPageContent() {
  return (
    <div className="flex min-h-screen">
      <Sidebar>
        <SidebarNav />
      </Sidebar>
      <SidebarInset>
        <HistoryClient />
      </SidebarInset>
    </div>
  )
}


export default function HistoryPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HistoryPageContent />
    </Suspense>
  );
}
