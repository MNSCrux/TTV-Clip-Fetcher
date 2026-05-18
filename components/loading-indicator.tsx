interface LoadingIndicatorProps {
  label: string;
  compact?: boolean;
}

export function LoadingIndicator({ label, compact = false }: LoadingIndicatorProps) {
  return (
    <div className={`loading-state ${compact ? 'loading-state-compact' : ''}`} role="status">
      <span className="loading-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
