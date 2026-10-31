export const TIME_ZONE = 'Asia/Kolkata';

/** A calendar date at the business timezone, independent of the device timezone. */
export function dateKey(now: Date = new Date()): string {
  if (!Number.isFinite(now.getTime())) throw new Error('Invalid date.');
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)!.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' && isDateKey(value)
    ? new Date(`${value}T12:00:00+05:30`) : new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Invalid date';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: TIME_ZONE, day: '2-digit', month: 'short', year: 'numeric',
  }).format(date);
}

export function formatINR(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2,
  }).format(value);
}
