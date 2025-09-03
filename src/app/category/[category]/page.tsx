
import { CategoryClient } from "@/components/category-client";

export default function CategoryPage({ params }: { params: { category: string } }) {
  return (
    <div className="flex min-h-screen">
      <CategoryClient categoryName={params.category} />
    </div>
  );
}
