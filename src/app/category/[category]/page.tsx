
import { CategoryClient } from "@/components/category-client";
import { Suspense } from "react";

async function CategoryPageContent({ params }: { params: Promise<{ category: string }> }) {
  const resolvedParams = await params;
  const categoryName = decodeURIComponent(resolvedParams.category);
  return (
    <div className="flex min-h-screen">
      <CategoryClient categoryName={categoryName} />
    </div>
  );
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
    return (
    <Suspense fallback={<div>Loading...</div>}>
      <CategoryPageContent params={params} />
    </Suspense>
  );
}
