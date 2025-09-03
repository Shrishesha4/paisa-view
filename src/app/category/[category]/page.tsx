import { CategoryClient } from "@/components/category-client";

export default function CategoryPage({ params }: { params: { category: string } }) {
  const categoryName = decodeURIComponent(params.category);

  return (
    <div className="flex min-h-screen">
      <CategoryClient categoryName={categoryName} />
    </div>
  );
}
