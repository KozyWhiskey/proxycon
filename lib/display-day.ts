/** Date-only values are formatted at UTC noon so browser zones cannot change the day. */
export function displayDay(day:string):string {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)) return day;
  const date=new Date(day+'T12:00:00Z');
  return Number.isNaN(date.valueOf())?day:new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(date);
}
