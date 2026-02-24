type Status = 'DRAFT' | 'SENT' | 'OVERDUE' | 'PAID' | 'CRITICAL';

interface StatusBadgeProps {
  status: Status;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const classMap: Record<Status, string> = {
    DRAFT: 'badge badge-draft',
    SENT: 'badge badge-sent',
    OVERDUE: 'badge badge-overdue',
    PAID: 'badge badge-paid',
    CRITICAL: 'badge badge-critical',
  };

  return <span className={classMap[status]}>{status}</span>;
}
