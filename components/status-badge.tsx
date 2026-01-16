import { Badge } from '@/components/ui/badge';
import { ValuationStatus } from '@/lib/types';
import { getStatusEmoji, getStatusLabel } from '@/lib/valuation';

interface StatusBadgeProps {
  status: ValuationStatus;
  showLabel?: boolean;
}

export function StatusBadge({ status, showLabel = true }: StatusBadgeProps) {
  const emoji = getStatusEmoji(status);
  const label = getStatusLabel(status);

  const variantMap: Record<ValuationStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
    UNDER: 'success',
    FAIR: 'warning',
    OVER: 'danger',
    NA: 'neutral',
  };

  return (
    <Badge variant={variantMap[status]}>
      {emoji} {showLabel && label}
    </Badge>
  );
}

