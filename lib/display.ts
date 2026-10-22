export function eventDates(start: string | null, end: string | null) {
  const format = (day: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${day.slice(0, 10)}T12:00:00Z`));
  if (!start) return 'Dates to be announced';
  return !end || start === end ? format(start) : `${format(start)} – ${format(end)}`;
}
