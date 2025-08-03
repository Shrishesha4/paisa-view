import { DashboardClient } from "@/components/dashboard-client";
import { Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/sidebar-nav";

export default function Home() {
  return (
    <div className="flex min-h-screen">
      <Sidebar>
        <SidebarNav />
      </Sidebar>
      <SidebarInset>
        <DashboardClient />
      </SidebarInset>
    </div>
  );
}
