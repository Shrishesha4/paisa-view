import { HistoryClient } from "@/components/history-client";
import { Suspense } from "react";

function HistoryPageContent() {
  return (
    <div className="flex min-h-screen">
      <HistoryClient />
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
