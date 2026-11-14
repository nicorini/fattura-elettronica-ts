// The day the checks compare the invoice with: the option `today` of validate and build, or
// today in Italy (`Europe/Rome`), whatever the time zone of the machine.

/** `value` if it is a day of the calendar written `AAAA-MM-GG`, else `undefined`. */
export function calendarDay(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? value : undefined;
}

/** Today in Italy, `AAAA-MM-GG`. */
export function todayInRome(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((candidate) => candidate.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
