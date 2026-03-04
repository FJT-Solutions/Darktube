import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

export function ChannelCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card animate-pulse">
      <div className="h-20 bg-secondary" />
      <div className="relative -mt-8 px-4">
        <div className="h-16 w-16 rounded-full border-4 border-card bg-secondary" />
      </div>
      <div className="flex flex-col gap-3 p-4 pt-2">
        <div className="h-4 w-3/4 rounded bg-secondary" />
        <div className="flex gap-4">
          <div className="h-3 w-12 rounded bg-secondary" />
          <div className="h-3 w-12 rounded bg-secondary" />
          <div className="h-3 w-8 rounded bg-secondary" />
        </div>
        <div className="h-8 w-full rounded-lg bg-secondary" />
      </div>
    </div>
  )
}

export function VideoCardSkeleton({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex gap-3 animate-pulse">
        <div className="aspect-video w-40 flex-shrink-0 rounded-lg bg-secondary" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="h-4 w-full rounded bg-secondary" />
          <div className="h-3 w-1/2 rounded bg-secondary" />
          <div className="mt-auto h-3 w-1/3 rounded bg-secondary" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card animate-pulse">
      <div className="aspect-video bg-secondary" />
      <div className="flex flex-col gap-2 p-4">
        <div className="h-4 w-full rounded bg-secondary" />
        <div className="h-3 w-1/3 rounded bg-secondary" />
        <div className="flex gap-3">
          <div className="h-3 w-12 rounded bg-secondary" />
          <div className="h-3 w-12 rounded bg-secondary" />
        </div>
      </div>
    </div>
  )
}

export function MetricCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-20 rounded bg-secondary" />
        <div className="h-9 w-9 rounded-lg bg-secondary" />
      </div>
      <div className="h-8 w-24 rounded bg-secondary" />
    </div>
  )
}

export function PageLoader({ message }: { message?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="text-center">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  )
}
