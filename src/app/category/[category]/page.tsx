import { CategoryClient } from "@/components/category-client";
import { Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/sidebar-nav";

export default function CategoryPage({ params }: { params: { category: string } }) {
  const categoryName = decodeURIComponent(params.category);

  return (
    <div className="flex min-h-screen">
      <Sidebar>
        <SidebarNav />
      </Sidebar>
      <SidebarInset>
        <CategoryClient categoryName={categoryName} />
      </SidebarInset>
    </div>
  );
}
