import { HistoryClient } from "@/components/history-client";
import { Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/sidebar-nav";

export default function HistoryPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar>
        <SidebarNav />
      </Sidebar>
      <SidebarInset>
        <HistoryClient />
      </SidebarInset>
    </div>
  );
}
