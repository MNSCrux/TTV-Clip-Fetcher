import { LoadingIndicator } from '@/components/loading-indicator';

export default function Loading() {
  return (
    <div className="min-h-72 flex items-center justify-center">
      <LoadingIndicator label="Loading page" />
    </div>
  );
}
