export function getLisbonDate(date: Date, dayOffset = 0): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );
  const calendar = new Date(
    Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day) + dayOffset),
  );
  return calendar.toISOString().slice(0, 10);
}

export function getLisbonOffset(date: string, time: string): string {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match || !timeMatch) return "+00:00";

  const utcCandidate = new Date(
    Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(timeMatch[1]),
      Number(timeMatch[2]),
    ),
  );

  const zoneName = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Lisbon",
    timeZoneName: "longOffset",
  })
    .formatToParts(utcCandidate)
    .find((part) => part.type === "timeZoneName")?.value;

  if (!zoneName || zoneName === "GMT") return "+00:00";
  const offset = zoneName.match(/^GMT([+-])(\d{2}):(\d{2})$/);
  if (!offset) return "+00:00";
  return offset[1] + offset[2] + ":" + offset[3];
}
