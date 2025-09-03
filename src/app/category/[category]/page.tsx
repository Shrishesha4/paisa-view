
import { CategoryClient } from "@/components/category-client";
import { Suspense } from "react";

function CategoryPageContent({ params }: { params: { category: string } }) {
  const categoryName = decodeURIComponent(params.category);
  return (
    <div className="flex min-h-screen">
      <CategoryClient categoryName={categoryName} />
    </div>
  );
}

export default function CategoryPage({ params }: { params: { category: string } }) {
    return (
    <Suspense fallback={<div>Loading...</div>}>
      <CategoryPageContent params={params} />
    </Suspense>
  );
}
