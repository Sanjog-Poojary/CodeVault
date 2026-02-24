/**
 * Format a number as Indian Rupees (₹)
 */
export function formatINR(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

/**
 * Format a number as plain INR with symbol (shorter form)
 */
export function formatINRShort(amount: number): string {
    if (Math.abs(amount) >= 100000) {
        return `₹${(amount / 100000).toFixed(2)}L`;
    }
    if (Math.abs(amount) >= 1000) {
        return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount.toFixed(2)}`;
}

/**
 * Calculate days since a given date
 */
export function daysSince(date: string | Date): number {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Return aging class for invoice (by days overdue)
 */
export function agingColor(days: number): string {
    if (days > 30) return 'text-critical';
    if (days > 15) return 'text-warning';
    return 'text-muted';
}

/**
 * Format date as DD MMM YYYY
 */
export function formatDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

/**
 * Generate human-readable invoice reference
 */
export function generateInvoiceRef(index: number): string {
    const year = new Date().getFullYear();
    return `VF-${year}-${String(index).padStart(3, '0')}`;
}

/**
 * CN utility (className combiner)
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
    return classes.filter(Boolean).join(' ');
}
