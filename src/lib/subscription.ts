// Subscription rules shared by the server (enforcement) and the dashboards (display).

export const DEFAULT_BILLING_DAYS = 28;
export const GRACE_DAYS = 3; // days after the due date before an admin's messaging is paused
export const EXPIRING_SOON_DAYS = 7;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type PaymentStatus = 'active' | 'expiring_soon' | 'overdue' | 'not_set';

interface SubLike {
  monthlyAmount?: number;
  nextDueAt?: number;
  paymentActive?: boolean;
  billingCycleDays?: number;
}

export function formatFee(amount: number | undefined): string {
  return `₹${(amount ?? 0).toLocaleString('en-IN')}`;
}

// A fee only applies when payment is switched on, a fee is set and a due date exists
function isBillable(sub: SubLike | null | undefined): sub is SubLike & { nextDueAt: number } {
  return !!sub && sub.paymentActive !== false && (sub.monthlyAmount ?? 0) > 0 && !!sub.nextDueAt;
}

export function getPaymentStatus(sub: SubLike | null | undefined, now = Date.now()): PaymentStatus {
  if (!isBillable(sub)) return 'not_set';
  const daysRemaining = Math.ceil((sub.nextDueAt - now) / MS_PER_DAY);
  if (daysRemaining < 0) return 'overdue';
  if (daysRemaining <= EXPIRING_SOON_DAYS) return 'expiring_soon';
  return 'active';
}

// Paused once the grace period after the due date has passed
export function isMessagingPaused(sub: SubLike | null | undefined, now = Date.now()): boolean {
  return isBillable(sub) && now > sub.nextDueAt + GRACE_DAYS * MS_PER_DAY;
}

// Paying early keeps the unused days; paying late doesn't forgive the missed ones
// beyond today: the new cycle starts from the later of the old due date and now.
export function nextDueAfterPayment(sub: SubLike | null | undefined, now = Date.now()): number {
  const cycle = sub?.billingCycleDays ?? DEFAULT_BILLING_DAYS;
  const start = sub?.nextDueAt && sub.nextDueAt > now ? sub.nextDueAt : now;
  return start + cycle * MS_PER_DAY;
}
