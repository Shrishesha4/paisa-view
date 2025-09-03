import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }

// Dashboard specific skeletons
export function DashboardCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[150px]" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-8 w-[120px]" />
        <Skeleton className="h-4 w-[100px]" />
      </div>
    </div>
  )
}

export function SummaryCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-8 w-[80px]" />
        </div>
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
      <div className="mt-4">
        <Skeleton className="h-4 w-[120px]" />
      </div>
    </div>
  )
}

export function TransactionCardSkeleton() {
  return (
    <div className="flex items-center space-x-4 p-4 border rounded-lg">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-[150px]" />
        <Skeleton className="h-3 w-[100px]" />
      </div>
      <div className="text-right space-y-2">
        <Skeleton className="h-4 w-[80px]" />
        <Skeleton className="h-3 w-[60px]" />
      </div>
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="space-y-4">
        <Skeleton className="h-6 w-[200px]" />
        <Skeleton className="h-4 w-[150px]" />
        <div className="space-y-2">
          <Skeleton className="h-32 w-full" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-[60px]" />
            <Skeleton className="h-3 w-[60px]" />
            <Skeleton className="h-3 w-[60px]" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function HouseholdMemberSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center space-x-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[120px]" />
          <Skeleton className="h-3 w-[100px]" />
        </div>
      </div>
      <div className="flex space-x-2">
        <Skeleton className="h-6 w-[80px]" />
        <Skeleton className="h-6 w-[80px]" />
      </div>
    </div>
  )
}
