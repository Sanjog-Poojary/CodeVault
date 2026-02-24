/**
 * Deterministic tax slice calculation — 100% unit testable
 */
export function calculateTaxSlice(amount: number, taxRate: number): number {
    return Math.round(amount * (taxRate / 100) * 100) / 100;
}

export function calculateNetAmount(amount: number, taxRate: number): number {
    const taxSlice = calculateTaxSlice(amount, taxRate);
    return Math.round((amount - taxSlice) * 100) / 100;
}

export function calculateRealBalance(
    grossBalance: number,
    committedBills: number
): number {
    return Math.round((grossBalance - committedBills) * 100) / 100;
}
