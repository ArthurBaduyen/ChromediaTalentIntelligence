import { Button } from "./Button";

export function QueryErrorBanner({
  error,
  onRetry
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-sm border border-border-danger bg-danger-100 px-3 py-2">
      <p className="text-sm text-text-danger">{error}</p>
      <Button variant="secondary" size="sm" className="whitespace-nowrap" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-sm border border-border-subtle bg-surface-default">
      <div className="h-12 border-b border-border-subtle bg-surface-muted" />
      <div className="space-y-2 p-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="h-10 animate-pulse rounded-sm bg-surface-app" />
        ))}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  message
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-sm border border-border-subtle bg-surface-muted px-4 py-6 text-center">
      <p className="text-sm font-semibold text-text-secondary">{title}</p>
      <p className="mt-1 text-sm text-text-muted">{message}</p>
    </div>
  );
}
